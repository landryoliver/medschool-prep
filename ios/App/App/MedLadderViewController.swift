import UIKit
import Capacitor

/// Why this file exists at all: Capacitor's own plugins (WebView, Console,
/// CapacitorHttp, ...) register themselves through packageClassList, an array
/// `cap sync` builds by scanning package.json for `@capacitor/*` dependencies.
/// ScreenTimePlugin.swift is not an npm package — it is a Swift file added
/// straight into this Xcode project — so cap sync has no way to know it
/// exists, packageClassList never lists it, and it never gets instantiated,
/// no matter how correctly it is compiled and how correctly it conforms to
/// CAPBridgedPlugin.
///
/// Confirmed on a real device via a diagnostic panel in the app itself:
/// isNativePlatform was true, the bridge was alive, and Capacitor.Plugins
/// listed exactly the five built-ins above and nothing else. Compiling the
/// class was never the problem.
///
/// This is Apple/Capacitor's own documented path for exactly this situation
/// (capacitorjs.com/docs/ios/custom-code): a CAPBridgeViewController subclass
/// that registers the instance itself, bypassing packageClassList entirely.
class MedLadderViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        // Every method on ScreenTimePlugin has been hanging on device —
        // including unlockLog(), which touches nothing but a plain AppGroup
        // dictionary — and a "lazy var center" fix for a suspected
        // DeviceActivityCenter() init hang did not change that. The next
        // question is whether registration itself ever actually completes:
        // is bridge nil right here, does registerPluginInstance() run, and
        // does the bridge's own live lookup find the instance afterward.
        //
        // Every call INTO ScreenTimePlugin goes through the same dispatch
        // this is trying to diagnose, so a new @objc method on it would tell
        // us nothing new if dispatch itself is what's broken. evaluateJavaScript
        // is a completely separate, one-way native -> JS channel that
        // bypasses Capacitor's plugin call routing entirely, so it can
        // report ground truth regardless of what's actually wrong.
        let bridgeWasNilAtLoad = bridge == nil
        bridge?.registerPluginInstance(ScreenTimePlugin())
        let foundAfterRegister = bridge?.getPlugin(pluginName: "ScreenTime") != nil
        // localStorage, not a bare window property: a window property set
        // before the real page has navigated to would be wiped the instant
        // navigation happens, and this project has no way to verify from
        // outside Xcode exactly where capacitorDidLoad() falls relative to
        // that navigation. localStorage is scoped to the origin and survives
        // it either way. Fired twice — once now, once after the page has had
        // a moment to finish loading — costs nothing and removes timing as a
        // reason this value might never land.
        let js = """
        try {
          localStorage.setItem('medladderNativeDebug', JSON.stringify({
            capacitorDidLoadRan: true,
            bridgeWasNilAtLoad: \(bridgeWasNilAtLoad),
            foundAfterRegister: \(foundAfterRegister),
            at: Date.now()
          }));
        } catch (e) {}
        """
        DispatchQueue.main.async { self.webView?.evaluateJavaScript(js) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.webView?.evaluateJavaScript(js) }
    }
}
