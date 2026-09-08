import { useState } from 'react'

/**
 * The actual computed env(safe-area-inset-top), in pixels, measured directly
 * rather than assumed. A screenshot showed a much bigger gap above the header
 * on the native app than the PWA has ever shown, and the obvious suspect —
 * capacitor.config.json's contentInset "always" double-counting against
 * app.css's own safe-area padding — is not something to fix on a guess:
 * env(safe-area-inset-top) inside a WKWebView is documented to be DERIVED
 * FROM that same native setting rather than independent of it, so whether
 * they are actually additive here is genuinely unknown without a real number
 * off a real device. A detached element with the padding actually applied is
 * the standard, reliable way to read an env() value from JS — reading a CSS
 * custom property holding env() back through getComputedStyle is not
 * consistently supported across engines.
 */
function measureSafeAreaTop() {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:0;left:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;'
  document.body.appendChild(el)
  const px = getComputedStyle(el).paddingTop
  document.body.removeChild(el)
  return px
}

/**
 * Manual update check for the installed PWA. iOS home-screen apps can sit
 * on a stale cached version for days; this asks the service worker to
 * fetch the newest build and reloads the moment it takes control. The
 * build date makes it verifiable — if the date changes, the update landed.
 */
export default function UpdateCheck() {
  const [status, setStatus] = useState('idle')

  async function check() {
    if (!('serviceWorker' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus('checking')
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        setStatus('current')
        return
      }
      // The new worker calls skipWaiting + clientsClaim, so taking control
      // is the signal that the update is live — reload into it.
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
      await reg.update()
      if (reg.installing || reg.waiting) {
        setStatus('updating')
      } else {
        setStatus('current')
      }
    } catch {
      setStatus('error')
    }
  }

  const label =
    status === 'checking'
      ? 'Checking…'
      : status === 'updating'
        ? 'Updating…'
        : status === 'current'
          ? 'Up to date ✓ — check again'
          : status === 'error'
            ? 'Check failed — retry'
            : 'Check for updates'

  const isNative = typeof document !== 'undefined' && document.documentElement.classList.contains('native-shell')

  return (
    <footer className="app-footer">
      Build {typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev'} ·{' '}
      <button onClick={check} disabled={status === 'checking' || status === 'updating'}>
        {label}
      </button>
      {/* Temporary, deliberately visible: names the real safe-area-inset-top
          pixel value on whatever device this is, so the header-gap question
          gets settled by a number instead of another guess. */}
      {isNative && <span className="muted"> · safe-top: {measureSafeAreaTop()}</span>}
    </footer>
  )
}
