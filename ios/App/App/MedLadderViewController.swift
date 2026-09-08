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
        bridge?.registerPluginInstance(ScreenTimePlugin())
    }
}
