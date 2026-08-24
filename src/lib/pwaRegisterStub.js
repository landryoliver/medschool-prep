/**
 * Stands in for the PWA plugin's virtual:pwa-register in a native build.
 *
 * Capacitor serves the bundle from inside the app, so there is nothing for a
 * service worker to cache and WKWebView's support for them is unreliable
 * anyway. The plugin is dropped from the native build, which leaves main.jsx
 * importing a module that no longer exists — this is what it imports instead.
 */
export function registerSW() {
  return () => {}
}
