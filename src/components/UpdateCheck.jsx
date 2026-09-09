import { useState } from 'react'

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

  return (
    <footer className="app-footer">
      Build {typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev'} ·{' '}
      <button onClick={check} disabled={status === 'checking' || status === 'updating'}>
        {label}
      </button>
    </footer>
  )
}
