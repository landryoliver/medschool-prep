import { useEffect, useState } from 'react'

/**
 * The actual computed env(safe-area-inset-top), in pixels, measured directly
 * rather than assumed. This is what actually closed out the header-gap
 * question: with capacitor.config.json's ios.contentInset set to "always",
 * this read 0px while scrolled — not a bug in the measurement, but proof
 * that "always" mode was letting the WebView's own scroll-inset absorb the
 * safe area invisibly to CSS while still reserving real native space above
 * it, which is exactly what a header-height reading close to the CSS's own
 * zero-safe-area math confirmed at the same time. contentInset is now
 * "never" — kept measuring here anyway, since a real number is what solved
 * this and a guess is what nearly made it worse twice. A detached element
 * with the padding actually applied is the standard, reliable way to read an
 * env() value from JS — reading a CSS custom property holding env() back
 * through getComputedStyle is not consistently supported across engines.
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
  const [headerHeight, setHeaderHeight] = useState(null)

  // A second, independent measurement, because a screenshot showing a large
  // gap does not say WHOSE gap it is. safe-top confirms the CSS value going
  // in; this confirms what the header element actually renders as, in real
  // pixels. If the two roughly reconcile with the header's own designed
  // structure, the gap is something outside this app's DOM entirely — iOS's
  // own "back to TestFlight" affordance shown after launching a build from
  // inside TestFlight rather than from the home-screen icon is exactly that
  // kind of thing, and would inflate a screenshot without this measurement
  // moving at all.
  useEffect(() => {
    const el = document.querySelector('.app-header')
    if (el) setHeaderHeight(Math.round(el.getBoundingClientRect().height))
  }, [])

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
      {isNative && (
        <span className="muted">
          {' '}
          · safe-top: {measureSafeAreaTop()}
          {headerHeight != null && <> · header: {headerHeight}px</>}
        </span>
      )}
    </footer>
  )
}
