import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // MedLadderViewController, not the plain CAPBridgeViewController — see
        // MedLadderViewController.swift for why ScreenTimePlugin needs that.
        window?.rootViewController = MedLadderViewController()

        // capacitor.config.json's ios.contentInset was "always" when this
        // fix first landed, which insets the WebView below the status bar
        // rather than letting it draw under it — so whatever this window's
        // own background is, is what shows through that strip. That is what
        // actually produced the "ugly black header": no background was set
        // here at all. contentInset later moved to "never" (see
        // capacitor.config.json — "always" was independently found to zero
        // out env(safe-area-inset-top) inside the WebView while still
        // reserving real space for it, confirmed by a header-height
        // diagnostic rather than assumed), but this stays regardless of
        // which mode is active: whatever region the WebView does not cover,
        // native or CSS, this window's own background is what shows, and it
        // should always match --bg (src/app.css) — iOS's own
        // systemBackground dark-mode value, true black.
        window?.backgroundColor = UIColor(red: 0, green: 0, blue: 0, alpha: 1)
        window?.rootViewController?.view.backgroundColor = window?.backgroundColor

        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
