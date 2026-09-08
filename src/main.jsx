import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './app.css'

registerSW({ immediate: true })

// A screenshot showed a much larger gap above the header on the native app
// than the PWA has ever shown, and the obvious suspect is capacitor.config
// .json's ios.contentInset "always" interacting with app.css's own
// env(safe-area-inset-top) padding. But env(safe-area-inset-top) inside a
// WKWebView is documented to be DERIVED FROM contentInsetAdjustmentBehavior
// rather than independent of it, so the two are not obviously additive, and
// changing the CSS on a guess risks the opposite failure — the header
// sliding under the status bar, which is worse than too much space. Tagging
// native here so a diagnostic can show the real computed value instead of
// guessing from a screenshot's pixel proportions.
if (globalThis.Capacitor?.isNativePlatform?.()) {
  document.documentElement.classList.add('native-shell')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
