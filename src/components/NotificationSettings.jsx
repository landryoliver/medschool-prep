import { useEffect, useState } from 'react'
import { SLOTS, loadSettings, saveSettings, requestPermission } from '../lib/notifications.js'
import { refreshReminders } from '../lib/refreshReminders.js'
import { isAvailable as screenTimeAvailable, diagnostics, notificationDiagnostics } from '../lib/screenTime.js'

/**
 * The settings screen for study reminders.
 *
 * Reads and writes the same localStorage-backed settings notifications.js
 * already defines — this component's whole job is to be the UI on top of an
 * engine that has existed for a while but had nothing pointing at it. No
 * scheduling decision lives here; that stays in notifications.js so it keeps
 * being testable without a phone.
 *
 * On/off uses the same two-button segmented control as NotationToggle rather
 * than a new toggle-switch component. There is no toggle-switch CSS anywhere
 * in this app, and nothing here has been seen rendered — reusing a pattern
 * that is already known to work is worth more than a nicer-looking one that
 * might not.
 *
 * Permission is requested only when the user turns a slot on, never at
 * mount — a cold "Allow Notifications?" with no context is the fastest way
 * to burn the one ask iOS gives you.
 */

function OnOff({ on, onChange }) {
  return (
    <div className="seg">
      <button className={!on ? 'active' : ''} onClick={() => onChange(false)}>
        Off
      </button>
      <button className={on ? 'active' : ''} onClick={() => onChange(true)}>
        On
      </button>
    </div>
  )
}

const SLOT_DESCRIPTIONS = {
  early: 'A morning reminder, skipped once you have studied today.',
  late: 'An evening reminder, skipped once you have studied today.',
  priority: 'A late nudge — if a streak is live, this is the one that says so.',
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState(() => loadSettings())
  const [available, setAvailable] = useState(null)
  const [diag, setDiag] = useState(null)
  const [saved, setSaved] = useState(0)

  // The permission warning used to live only in React state set by the last
  // requestPermission() call this session — so it read correctly for exactly
  // as long as the component stayed mounted, and vanished on every remount
  // even though the real OS setting had not changed. Reading real
  // authorization status from iOS on mount, not just after asking, is what
  // makes the warning honest across visits rather than a snapshot of one.
  //
  // A rejected native call used to leave diag permanently null with nothing
  // on screen at all — the exact failure this panel exists to catch,
  // swallowed silently instead of shown. errorDiag turns that rejection into
  // a visible authorizationStatus string instead of a blank screen.
  const errorDiag = (err) => ({
    authorizationStatus: `error: ${err?.message ?? String(err)}`,
    alertSetting: 'n/a',
    pendingCount: 0,
    pending: [],
  })
  const refreshDiag = () => notificationDiagnostics().then(setDiag).catch((err) => setDiag(errorDiag(err)))

  useEffect(() => {
    screenTimeAvailable().then(setAvailable)
    // A slot can already be saved "on" from a session before the user ever
    // reached this screen — or from before the OS ever actually asked. In
    // that case commit() never runs again on its own, so the request
    // permanently never happens: the toggle looks on forever, iOS never
    // gained a Notifications row for this app, and nothing fires. notDetermined
    // specifically means the OS has never shown the prompt at all, so asking
    // here — the user just navigated to Settings on purpose — is the one
    // real ask, not a repeat of one that already happened.
    notificationDiagnostics()
      .then(async (d) => {
        setDiag(d)
        const anyOn = settings.enabled && Object.values(settings.slots).some((s) => s.on)
        if (anyOn && d.authorizationStatus === 'notDetermined') {
          const result = await requestPermission()
          if (result === 'granted') await refreshReminders(settings)
          await refreshDiag()
        }
      })
      .catch((err) => setDiag(errorDiag(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const commit = async (next) => {
    setSettings(next)
    saveSettings(next)

    const anyOn = next.enabled && Object.values(next.slots).some((s) => s.on)
    if (anyOn && diag?.authorizationStatus !== 'authorized') {
      let result
      try {
        result = await requestPermission()
      } catch (err) {
        // A hung native call rejects here now (see withTimeout in
        // notifications.js) instead of leaving this await pending forever
        // with the toggle showing "on" and nothing to show for why.
        setDiag(errorDiag(err))
        return
      }
      if (result === 'denied' || result === 'unsupported') {
        // The setting stays on — denying the OS prompt (or the native bridge
        // being unavailable) does not mean the user wants the toggle to
        // silently flip back off behind them. It means nothing will fire
        // until the real cause is fixed, which the UI below says outright
        // rather than pretending "Schedule updated" when nothing was
        // actually scheduled natively.
        await refreshDiag()
        return
      }
    }

    await refreshReminders(next)
    await refreshDiag()
    setSaved((n) => n + 1)
  }

  const toggleEnabled = (on) => commit({ ...settings, enabled: on })
  const toggleSlot = (id, on) => commit({ ...settings, slots: { ...settings.slots, [id]: { ...settings.slots[id], on } } })
  const setTime = (id, time) => commit({ ...settings, slots: { ...settings.slots, [id]: { ...settings.slots[id], time } } })

  if (available === false) {
    // Temporary, deliberately visible: this message alone was already wrong
    // once (shown on an actual TestFlight build), and a screenshot of it says
    // nothing about WHY the bridge looked unavailable. These four facts turn
    // the next report into a diagnosis instead of another guess.
    const diag = diagnostics()
    return (
      <div className="card">
        <h2 className="section-title">Study reminders</h2>
        <p className="muted">
          Reminders are scheduled on the phone itself, so they only work in the installed app, not in a
          browser tab. Install MedLadder to your home screen to use this.
        </p>
        <p className="muted hint-line" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          hasCapacitor: {String(diag.hasCapacitor)}
          <br />
          isNativePlatform: {String(diag.isNativePlatform)}
          <br />
          platform: {String(diag.platform)}
          <br />
          pluginKeys: {diag.pluginKeys}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="aa-head">
          <strong>Study reminders</strong>
          <OnOff on={settings.enabled} onChange={toggleEnabled} />
        </div>
        <p className="muted hint-line">
          Each one stays silent on a day you have already studied. Rebuilt every time you open the app or
          answer a question, so turning this on takes effect immediately.
        </p>
        {diag && diag.authorizationStatus !== 'authorized' && diag.authorizationStatus !== 'n/a' && (
          <p className="muted" style={{ color: 'var(--bad)' }}>
            iOS notifications are turned off for MedLadder ({diag.authorizationStatus}). Re-enable them in
            Settings → MedLadder → Notifications, or nothing below will actually fire.
          </p>
        )}
        {diag && diag.authorizationStatus === 'authorized' && diag.alertSetting !== 'enabled' && (
          <p className="muted" style={{ color: 'var(--bad)' }}>
            Notifications are allowed, but banners are off (Settings → MedLadder → Notifications →
            Allow Notifications → Banner Style). Reminders will be scheduled and silently never shown.
          </p>
        )}
      </div>

      {/* Temporary, deliberately visible: a missed reminder has too many
          candidate causes to guess between from a screenshot alone, and this
          is ground truth read from iOS itself rather than inferred. */}
      {diag && (
        <div className="card">
          <strong>Diagnostics</strong>
          <p className="muted hint-line" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            authorizationStatus: {diag.authorizationStatus}
            <br />
            alertSetting: {diag.alertSetting}
            <br />
            pendingCount: {diag.pendingCount}
            {diag.pending?.map((p) => (
              <span key={p.id}>
                <br />
                {p.id}: "{p.title}" @ {p.nextFire ? new Date(p.nextFire).toLocaleString() : 'no next fire date'}
              </span>
            ))}
          </p>
          <button className="ghost" onClick={refreshDiag}>
            Refresh
          </button>
        </div>
      )}

      {settings.enabled &&
        SLOTS.map((slot) => {
          const s = settings.slots[slot.id]
          return (
            <div className="card" key={slot.id}>
              <div className="aa-head">
                <strong>{slot.label}</strong>
                <OnOff on={s.on} onChange={(on) => toggleSlot(slot.id, on)} />
              </div>
              {/* Shown regardless of on/off — the description is what tells you
                  whether to turn it on in the first place. Hiding it until
                  after had it backwards. */}
              <p className="muted hint-line">{SLOT_DESCRIPTIONS[slot.id]}</p>
              {s.on && (
                <input
                  type="time"
                  className="time-input"
                  value={s.time}
                  onChange={(e) => setTime(slot.id, e.target.value)}
                />
              )}
            </div>
          )
        })}
      {saved > 0 && <p className="muted hint-line">Schedule updated.</p>}
    </div>
  )
}
