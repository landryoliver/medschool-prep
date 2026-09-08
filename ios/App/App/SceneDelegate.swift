import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()

        // capacitor.config.json's ios.contentInset is "always", which insets
        // the WebView BELOW the status bar rather than drawing under it — so
        // the status-bar strip is never WebView content at all, and setting
        // the WebView's own background (also done in capacitor.config.json)
        // does not reach it. That strip is this window's plain UIKit
        // background, defaulting to black with nothing set here, which is
        // what actually showed as the "ugly black header." Match the app's
        // own --bg token (src/app.css) so the two are seamless.
        window?.backgroundColor = UIColor(red: 0.043, green: 0.071, blue: 0.125, alpha: 1)
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
