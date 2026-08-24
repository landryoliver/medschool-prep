import Capacitor
import DeviceActivity
import FamilyControls
import ManagedSettings
import SwiftUI
import UserNotifications

/// The bridge. Everything the web layer can ask for, and nothing it cannot.
///
/// Note what is absent: any way to read which apps were chosen. Tokens are
/// opaque by design — no bundle id, no display name, no icon, ever, in any
/// process. That is the privacy bargain that makes the API exist at all, so the
/// web UI is told "3 apps selected" and nothing more. Every design that assumes
/// otherwise has to be thrown away, so it is worth not writing one.
@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenTimePlugin"
    public let jsName = "ScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "arm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pushRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlockLog", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotificationPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleNotifications", returnType: CAPPluginReturnPromise),
    ]

    private let center = DeviceActivityCenter()

    /// .individual, not .child: the user restricting themselves, one device, one
    /// Apple ID. .child needs Family Sharing and a second Apple ID holding the
    /// Screen Time passcode, which is far stricter and needs a second device to
    /// test at all.
    ///
    /// The consequence to be honest about: the user can always turn Screen Time
    /// off in Settings, which clears every store instantly with no callback.
    @objc func authorize(_ call: CAPPluginCall) {
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["granted": true])
            } catch {
                call.resolve(["granted": false, "error": error.localizedDescription])
            }
        }
    }

    /// Checked on every foreground, because authorization can be revoked at any
    /// moment and you get no callback when it is. A day with no enforcement is
    /// a GAP, not a clean day, and the web layer needs to be able to say so.
    @objc func status(_ call: CAPPluginCall) {
        let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        let sel = StudyGate.selection()
        let count = sel.applicationTokens.count + sel.categoryTokens.count + sel.webDomainTokens.count
        call.resolve([
            "authorized": authorized,
            "armed": StudyGate.armed,
            // A count, never names. See the note above.
            "selectedCount": count,
            // armed with nothing selected means the tokens were invalidated by a
            // reinstall or a restore, and the user has to pick again. Silently
            // enforcing nothing is the worst outcome available.
            "needsRepick": StudyGate.armed && count == 0,
            "shielding": StudyGate.shouldShield(),
            "overrideUntil": StudyGate.overrideUntil?.timeIntervalSince1970 ?? 0,
        ])
    }

    @objc func pickApps(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                call.reject("no view controller")
                return
            }
            var selection = StudyGate.selection()
            let picker = UIHostingController(
                rootView: FamilyActivityPickerSheet(
                    selection: selection,
                    onDone: { chosen in
                        StudyGate.save(selection: chosen)
                        selection = chosen
                        vc.presentedViewController?.dismiss(animated: true)
                        self.restartMonitoring()
                        StudyGate.reconcile()
                        let count = chosen.applicationTokens.count
                            + chosen.categoryTokens.count
                            + chosen.webDomainTokens.count
                        call.resolve(["selectedCount": count])
                    }
                )
            )
            vc.present(picker, animated: true)
        }
    }

    @objc func arm(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        StudyGate.armed = on
        if let minutes = call.getInt("ceilingMinutes"), minutes > 0 {
            StudyGate.ceilingMinutes = minutes
        }
        restartMonitoring()
        StudyGate.reconcile()
        call.resolve(["armed": StudyGate.armed, "shielding": StudyGate.shouldShield()])
    }

    /// The web layer's study record, and the tail of it calls reconcile() —
    /// which is what makes answering the fifth question lift the shield without
    /// any callback being involved.
    @objc func pushRecord(_ call: CAPPluginCall) {
        let record = StudyRecord(
            day: call.getString("day") ?? StudyGate.dayStamp(),
            floorMet: call.getBool("floorMet") ?? false,
            answered: call.getInt("answered") ?? 0,
            goal: call.getInt("goal") ?? 0,
            expiresAt: call.getDouble("expiresAt") ?? 0
        )
        StudyGate.save(record: record)
        StudyGate.reconcile()
        call.resolve(["shielding": StudyGate.shouldShield()])
    }

    @objc func unlockLog(_ call: CAPPluginCall) {
        let log = AppGroup.defaults.array(forKey: "unlockLog") as? [[String: Any]] ?? []
        call.resolve(["entries": log])
    }

    // MARK: - study reminders
    //
    // UNUserNotificationCenter is a plain iOS framework, not a third-party
    // package. notifications.js already contains the entire scheduling
    // decision — what to say, when, and whether a day counts as studied — so
    // the native side has exactly two jobs: ask once, and write whatever it is
    // given after clearing what came before.

    @objc func requestNotificationPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            call.resolve(["granted": granted, "error": error?.localizedDescription ?? NSNull()])
        }
    }

    /// Cancel every pending reminder and schedule exactly the set handed in.
    /// notifications.js always sends the FULL rebuilt plan, never a delta, so
    /// clearing first is what makes a stale reminder impossible to leave behind
    /// — there is no diffing to get wrong.
    @objc func scheduleNotifications(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        guard let items = call.getArray("notifications", JSObject.self) else {
            call.resolve(["scheduled": 0])
            return
        }

        let group = DispatchGroup()
        var scheduled = 0
        for item in items {
            guard
                let id = item["id"] as? Int,
                let title = item["title"] as? String,
                let body = item["body"] as? String,
                let atMillis = item["at"] as? Double
            else { continue }

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default

            let fireDate = Date(timeIntervalSince1970: atMillis / 1000)
            let comps = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute, .second],
                from: fireDate
            )
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let request = UNNotificationRequest(identifier: String(id), content: content, trigger: trigger)

            group.enter()
            center.add(request) { _ in
                scheduled += 1
                group.leave()
            }
        }

        group.notify(queue: .main) {
            call.resolve(["scheduled": scheduled])
        }
    }

    /// Stop everything and start it again from stored config, every time.
    ///
    /// Editing a schedule in place silently no-ops — the first block works, the
    /// second never comes, and there is no error anywhere. Re-registering is
    /// cheap and is the only way to be sure what the system believes matches
    /// what the user configured.
    private func restartMonitoring() {
        center.stopMonitoring()
        guard StudyGate.armed, !StudyGate.selectionIsEmpty else { return }

        let sel = StudyGate.selection()
        // A ceiling only. There is deliberately no floor event on MedLadder
        // itself: DeviceActivity could only measure time-in-foreground, which is
        // satisfied by leaving the app open, while the app already knows how
        // many questions were actually answered.
        let event = DeviceActivityEvent(
            applications: sel.applicationTokens,
            categories: sel.categoryTokens,
            webDomains: sel.webDomainTokens,
            threshold: DateComponents(minute: StudyGate.ceilingMinutes)
        )

        // Local midnight to local midnight, matching src/lib/day.js. An interval
        // that crossed midnight would make "today" mean two different things in
        // two places, and every rollup would have to be rewritten to fix it.
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )

        do {
            try center.startMonitoring(.distractions, during: schedule, events: [.ceilingReached: event])
        } catch {
            // Undocumented caps exist on simultaneously-monitored activities and
            // on events per activity. A registration that silently did not take
            // looks identical to one that did, so this is surfaced rather than
            // swallowed.
            notifyListeners("monitoringFailed", data: ["error": error.localizedDescription])
        }
    }
}

/// Thin SwiftUI wrapper, because FamilyActivityPicker is SwiftUI-only. Kept in
/// one file with the plugin so there is exactly one place to fix when this API
/// changes signature, which it has done between releases.
private struct FamilyActivityPickerSheet: View {
    @State var selection: FamilyActivitySelection
    let onDone: (FamilyActivitySelection) -> Void

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Apps to gate")
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { onDone(selection) }
                    }
                }
        }
    }
}
