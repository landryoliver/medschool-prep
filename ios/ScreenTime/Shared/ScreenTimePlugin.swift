import Capacitor
import DeviceActivity
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit
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
        CAPPluginMethod(name: "notificationDiagnostics", returnType: CAPPluginReturnPromise),
    ]

    // lazy, not a plain `let`: every method on this plugin — even ones that
    // touch nothing but UNUserNotificationCenter or a plain AppGroup
    // dictionary — was hanging forever on device, timing out from JS with no
    // native error at all. A `let` here means DeviceActivityCenter() is
    // constructed the instant ScreenTimePlugin() is, i.e. inside
    // registerPluginInstance(ScreenTimePlugin()) in capacitorDidLoad(). If
    // that init blocks on an XPC handshake to the Screen Time daemon — a
    // real failure mode when the restricted family-controls entitlement
    // isn't actually honored for this signing at runtime, even though it is
    // present in the raw entitlements dump — the whole registration call
    // never returns, so the plugin is never actually added to the bridge's
    // live dispatch table and every method on it hangs, regardless of which
    // framework that particular method touches. lazy defers construction to
    // arm()'s first real call, which nothing in the shipped UI reaches yet.
    private lazy var center = DeviceActivityCenter()

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
        // Registration is now confirmed working (see
        // MedLadderViewController.swift's localStorage debug write) — bridge
        // finds this plugin instance immediately after registering it. Every
        // JS call into it has still hung regardless, so the remaining
        // question is whether a JS call ever actually reaches THIS method
        // body at all, versus reaching it and having call.resolve()'s
        // response fail to get back to JS. Writing straight to localStorage
        // the instant this runs settles which half of the pipeline is broken.
        let js = "try { localStorage.setItem('medladderUnlockLogReached', JSON.stringify({ reached: true, at: Date.now() })); } catch (e) {}"
        DispatchQueue.main.async { self.bridge?.webView?.evaluateJavaScript(js) }

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

    /// A visual attachment, not just title/body text — the plain-text
    /// reminder read correctly but looked nothing like the notifications
    /// that actually get a second glance (Duolingo's streak alert, with its
    /// own mascot image). UIImage(named:) resolving an appiconset entry by
    /// its set name (here "AppIcon") is a real, commonly used pattern, but
    /// this project has no Swift toolchain to actually run it against —
    /// unverified until a real notification is screenshotted. Written to
    /// fail soft either way: nil anywhere in this chain just means the
    /// notification ships as plain text, exactly as it already did.
    ///
    /// A fresh temp file per notification id, not one shared file reused
    /// across attachments — UNNotificationAttachment's initializer can move
    /// rather than copy a source file from the app's own container, which
    /// would leave a second attachment pointing at a file the first one
    /// already consumed.
    private func iconAttachment(forId id: Int) -> UNNotificationAttachment? {
        guard let image = UIImage(named: "AppIcon"), let data = image.pngData() else { return nil }
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent("medladder-notif-\(id).png")
        do {
            try data.write(to: fileURL)
            return try UNNotificationAttachment(identifier: "icon-\(id)", url: fileURL, options: nil)
        } catch {
            return nil
        }
    }

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
            if let attachment = iconAttachment(forId: id) {
                content.attachments = [attachment]
            }
            // Only the streak-risk slot, not every reminder — a Focus mode
            // that lets three "study time" pings through a day stops being a
            // Focus mode. .timeSensitive needs the
            // com.apple.developer.usernotifications.time-sensitive
            // entitlement to actually take effect; a build that added it to
            // App.entitlements failed to export for every distribution
            // method (App Store, Ad Hoc, Development) — most likely because
            // the App ID itself doesn't have the capability turned on yet in
            // Apple's developer portal (Certificates, Identifiers & Profiles
            // → Identifiers → com.medladder.app → Time Sensitive
            // Notifications), which automatic signing can't do on its own.
            // The entitlement was reverted so the pipeline exports again;
            // this line is left in place because it fails soft exactly like
            // the icon attachment does — without the entitlement, iOS just
            // treats it as .active instead of refusing anything, so there is
            // nothing to lose by leaving it and something to gain if the
            // portal capability gets enabled later.
            if (item["slotId"] as? String) == "priority" {
                content.interruptionLevel = .timeSensitive
            }

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

    /// Ground truth from iOS itself, not from what the JS side thinks it
    /// asked for. A missed 6pm reminder has too many possible causes to guess
    /// between — permission never actually granted, scheduling never reaching
    /// this far, or a request that iOS silently declined to add — and only
    /// one of those is visible from JS. This asks the real
    /// UNUserNotificationCenter for its actual authorization status and its
    /// actual pending request list, which settles all three at once.
    @objc func notificationDiagnostics(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            let statusName: String
            switch settings.authorizationStatus {
            case .authorized: statusName = "authorized"
            case .denied: statusName = "denied"
            case .notDetermined: statusName = "notDetermined"
            case .provisional: statusName = "provisional"
            case .ephemeral: statusName = "ephemeral"
            @unknown default: statusName = "unknown"
            }
            let alertStyleName: String
            switch settings.alertSetting {
            case .enabled: alertStyleName = "enabled"
            case .disabled: alertStyleName = "disabled"
            case .notSupported: alertStyleName = "notSupported"
            @unknown default: alertStyleName = "unknown"
            }

            center.getPendingNotificationRequests { requests in
                let pending: [[String: Any]] = requests.map { req in
                    let trigger = req.trigger as? UNCalendarNotificationTrigger
                    let next = trigger?.nextTriggerDate()
                    return [
                        "id": req.identifier,
                        "title": req.content.title,
                        "nextFire": next.map { $0.timeIntervalSince1970 * 1000 } ?? NSNull(),
                    ]
                }
                DispatchQueue.main.async {
                    call.resolve([
                        "authorizationStatus": statusName,
                        // Authorization can be granted while the alert banner
                        // itself is off (Settings -> Notifications -> allow
                        // Sounds/Badges but not banners) — a real, silent way
                        // for a reminder to be scheduled and delivered but
                        // never actually shown.
                        "alertSetting": alertStyleName,
                        "pendingCount": pending.count,
                        "pending": pending,
                    ])
                }
            }
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
