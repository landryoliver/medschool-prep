import ManagedSettings
import Foundation

/// The escape hatch.
///
/// App Review expects a way out that does not require completing the challenge,
/// and independently of review, a trap gets deleted in week two. So the exit
/// exists — but it costs something and it is recorded, which is far stronger
/// than making it impossible.
///
/// A hard constraint shaping this: a shield action cannot open another app.
/// ShieldActionResponse is .close, .defer or .none, and there is no
/// UIApplication.shared here. So the primary button cannot send you to
/// MedLadder to answer five questions — the shield's TEXT has to say that, and
/// the unlock happens when the app itself next reconciles.
///
/// Which leaves the secondary button to be the real escape hatch: a bounded
/// override, logged, that lifts the shield for 15 minutes.
class StudyGateShieldAction: ShieldActionDelegate {

    /// Short enough to be a decision rather than a habit, long enough to be
    /// genuinely useful when something actually needs doing.
    private static let overrideMinutes = 15

    private func handle(
        _ action: ShieldAction,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        switch action {
        case .primaryButtonPressed:
            // "OK". Dismiss and leave the shield up.
            completionHandler(.close)

        case .secondaryButtonPressed:
            // The override. Recorded first, so a crash between logging and
            // lifting leaves a record of an unlock that did not happen rather
            // than an unlock with no record.
            StudyGate.logUnlock(reason: "override-\(Self.overrideMinutes)m")
            StudyGate.overrideUntil = Date().addingTimeInterval(
                Double(Self.overrideMinutes) * 60
            )
            StudyGate.reconcile()
            completionHandler(.defer)

        @unknown default:
            completionHandler(.close)
        }
    }

    override func handle(
        action: ShieldAction,
        for application: ApplicationToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handle(action, completionHandler: completionHandler)
    }

    override func handle(
        action: ShieldAction,
        for category: ActivityCategoryToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handle(action, completionHandler: completionHandler)
    }

    override func handle(
        action: ShieldAction,
        for webDomain: WebDomainToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handle(action, completionHandler: completionHandler)
    }
}
