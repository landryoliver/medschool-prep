import DeviceActivity
import Foundation

/// The monitor extension.
///
/// Runs in roughly 6 MB and is jetsammed mid-callback if it exceeds that — no
/// crash report, no log, no shield. You find out at 11pm when the app you
/// blocked opens fine.
///
/// So: no SwiftUI, no networking, no analytics, no app object graph, no logging
/// SDK. It reads one small record and calls one pure function. Anything heavier
/// is done later by the app, reading what this wrote.
class StudyGateMonitor: DeviceActivityMonitor {

    // Every callback ends in reconcile(). That is the whole design: the
    // callbacks are advisory — they skip, they land late, they arrive after the
    // window they describe has closed — and none of that is fixable. Deriving
    // the answer from stored state plus the clock makes a missed callback cost
    // nothing, because the next foreground recomputes it.

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // A new day's window. The previous record is now stale by its own day
        // stamp, so shouldShield() treats the day as unproven again without
        // anything being cleared here.
        StudyGate.reconcile()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        StudyGate.reconcile()
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        super.eventDidReachThreshold(event, activity: activity)

        // This fires ONCE per interval, not once per crossing. There is no
        // second callback at 60 minutes after one at 45 — a ladder of costs
        // would need separate events with increasing thresholds, and would burn
        // the undocumented per-activity event budget doing it.
        //
        // One event is enough here because the question is binary: the ceiling
        // has been reached, so from now until midnight the gate depends only on
        // whether the study floor was met. reconcile() answers exactly that,
        // and keeps answering it correctly on every later foreground.
        guard event == .ceilingReached else { return }
        StudyGate.reconcile()
    }

    override func eventWillReachThresholdWarning(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        super.eventWillReachThresholdWarning(event, activity: activity)
        // Deliberately empty. A warning is only useful if it can say something
        // true, and the honest message ("you are near the ceiling and have not
        // studied") needs the record — which the app can schedule as a local
        // notification with the same information and more room to do it.
    }
}
