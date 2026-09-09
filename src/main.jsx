import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './app.css'

registerSW({ immediate: true })

// Settled, not guessed: capacitor.config.json's ios.contentInset was
// "always", which turned out to zero out env(safe-area-inset-top) inside the
// WebView while still reserving real native space above it — proven by a
// header-height diagnostic (this app's own .app-header measured almost
// exactly what its CSS predicts with zero safe-area contribution), not
// assumed from a screenshot. contentInset is now "never", the documented
// default and the pattern CSS env(safe-area-inset-*) is meant to be used
// with. Tagging native here so the diagnostic stays available — worth
// keeping even resolved, since it is cheap and was the thing that actually
// closed this out instead of another guess.
if (globalThis.Capacitor?.isNativePlatform?.()) {
  document.documentElement.classList.add('native-shell')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
