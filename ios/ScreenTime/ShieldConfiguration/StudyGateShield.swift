import ManagedSettings
import ManagedSettingsUI
import UIKit

/// What the shield screen says.
///
/// This is the only place besides Apple's own picker where real app names and
/// icons appear, and even here we do not get to read them — the system draws
/// the icon and we supply text around it.
///
/// The text has to carry the whole instruction, because the shield's buttons
/// cannot open another app. ShieldActionResponse offers .close, .defer and
/// .none and nothing else, so "go answer five questions" is a sentence, not a
/// button. Writing it as though it were a button is the mistake to avoid.
class StudyGateShield: ShieldConfigurationDataSource {

    private func configuration() -> ShieldConfiguration {
        let r = StudyGate.record()
        let goal = r?.goal ?? 0
        let answered = (r != nil && !(r!.isStale())) ? r!.answered : 0
        let short = max(0, goal - answered)

        let subtitle: String
        if goal == 0 {
            subtitle = "Open MedLadder to set a daily goal."
        } else if short == 0 {
            // Reachable while a reconcile is pending. Say something true rather
            // than something confident.
            subtitle = "Today's goal is met. Reopen MedLadder to lift this."
        } else {
            subtitle = "\(answered) of \(goal) questions today. \(short) to go in MedLadder."
        }

        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: UIColor(red: 0.043, green: 0.071, blue: 0.125, alpha: 1), // --bg
            icon: nil,
            title: ShieldConfiguration.Label(
                text: "Study first",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: subtitle,
                color: UIColor(red: 0.576, green: 0.639, blue: 0.733, alpha: 1) // --muted
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "OK",
                color: UIColor(red: 0.043, green: 0.071, blue: 0.125, alpha: 1)
            ),
            primaryButtonBackgroundColor: UIColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1), // --accent
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Unlock for 15 minutes",
                color: UIColor(red: 0.576, green: 0.639, blue: 0.733, alpha: 1)
            )
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        configuration()
    }

    override func configuration(
        shielding application: Application,
        in category: ActivityCategory
    ) -> ShieldConfiguration {
        configuration()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        configuration()
    }

    override func configuration(
        shielding webDomain: WebDomain,
        in category: ActivityCategory
    ) -> ShieldConfiguration {
        configuration()
    }
}
