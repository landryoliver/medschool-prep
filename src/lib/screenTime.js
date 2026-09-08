import { registerPlugin } from '@capacitor/core'
import { shieldState, loadGoal } from './studyGoal.js'

/**
 * Capacitor.Plugins is a plain object with real, finite keys — not an
 * all-permissive Proxy, which is what an earlier version of this file
 * assumed. A diagnostic panel on a real device proved it: isNativePlatform
 * was true and the bridge was alive, but Capacitor.Plugins listed only
 * Capacitor's own built-ins (WebView, Console, CapacitorHttp, ...) and never
 * ScreenTime, because ScreenTime is a hand-added Swift file rather than an
 * npm package and nothing had told the JS runtime it exists.
 *
 * registerPlugin(name) is that missing declaration — the officially
 * documented way to create the proxy object a custom native plugin needs on
 * the JS side. Called once, at module scope, and every caller in this file
 * and in notifications.js goes through the object it returns rather than
 * independently reaching into globalThis.Capacitor.
 */
export const ScreenTimeNative = registerPlugin('ScreenTime')

/**
 * The web side of the study gate.
 *
 * Mirrors notifications.js: everything decidable is decided here in JS where it
 * can be tested, and the native call is a thin write. The one thing this cannot
 * do is read which apps were chosen — tokens are opaque in every process, so
 * the UI gets a count and never a name.
 *
 * The important behaviour is that pushing a record calls reconcile() on the
 * native side. That is what makes answering the fifth question lift the shield
 * with no callback involved: the shield is derived from stored state plus the
 * clock, so writing new state recomputes it immediately.
 */

const KEY = 'medladder.gate'

export const DEFAULT_GATE = {
  /** Off until explicitly turned on. Nothing about this should be a surprise. */
  armed: false,
  /** Minutes of the chosen apps before the gate closes for the rest of the day. */
  ceilingMinutes: 45,
}

export function loadGate() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (!raw) return DEFAULT_GATE
    return {
      armed: raw.armed === true,
      ceilingMinutes:
        Number.isInteger(raw.ceilingMinutes) && raw.ceilingMinutes > 0
          ? raw.ceilingMinutes
          : DEFAULT_GATE.ceilingMinutes,
    }
  } catch {
    return DEFAULT_GATE
  }
}

export function saveGate(gate) {
  try {
    localStorage.setItem(KEY, JSON.stringify(gate))
  } catch {
    /* storage unavailable — the gate stays off rather than throwing */
  }
}

async function plugin() {
  const cap = globalThis.Capacitor
  if (!cap?.isNativePlatform?.()) return null
  return ScreenTimeNative
}

/**
 * True only when the native app genuinely has this plugin registered.
 * Capacitor.isPluginAvailable is the documented way to ask this — checking
 * for a truthy Capacitor.Plugins.ScreenTime is not equivalent, because
 * registerPlugin() always returns a usable proxy object regardless of
 * whether the native side actually implements it; the proxy just throws on
 * first real call if it does not. Asking isPluginAvailable up front is what
 * lets the UI show "unavailable" before the user taps anything, rather than
 * after a call fails.
 */
export async function isAvailable() {
  const cap = globalThis.Capacitor
  return Boolean(cap?.isNativePlatform?.() && cap?.isPluginAvailable?.('ScreenTime'))
}

/**
 * Raw facts about the bridge, with no interpretation. Written because
 * isAvailable() resolving false on an actual TestFlight build was not
 * diagnosable from a screenshot alone — it collapsed "no Capacitor object at
 * all", "Capacitor thinks this is the web", and "Capacitor is native but the
 * plugin itself never registered" into one boolean, and that third case is
 * exactly what a hand-added Swift plugin with no packageClassList entry
 * looks like. Shown in the settings screen's unavailable state so a future
 * report names which of those it actually is, rather than another guess.
 */
export function diagnostics() {
  const cap = globalThis.Capacitor
  return {
    hasCapacitor: typeof cap !== 'undefined',
    isNativePlatform: typeof cap?.isNativePlatform === 'function' ? cap.isNativePlatform() : 'no such method',
    platform: typeof cap?.getPlatform === 'function' ? cap.getPlatform() : 'no such method',
    pluginKeys: cap?.Plugins ? Object.keys(cap.Plugins).join(', ') || '(empty)' : 'no Plugins object',
    screenTimeAvailable:
      typeof cap?.isPluginAvailable === 'function' ? cap.isPluginAvailable('ScreenTime') : 'no such method',
  }
}

export async function authorize() {
  const p = await plugin()
  if (!p) return { granted: false, unsupported: true }
  return p.authorize()
}

/**
 * Read on every foreground, because Screen Time can be switched off in Settings
 * at any moment and every store is cleared instantly with no callback. A day
 * with no enforcement is a gap rather than a clean day, and the UI has to be
 * able to say which it was.
 */
export async function status() {
  const p = await plugin()
  if (!p) return { unsupported: true, authorized: false, armed: false, selectedCount: 0 }
  return p.status()
}

export async function pickApps() {
  const p = await plugin()
  if (!p) return { selectedCount: 0, unsupported: true }
  return p.pickApps()
}

export async function setArmed(on, ceilingMinutes) {
  const gate = { ...loadGate(), armed: on === true }
  if (Number.isInteger(ceilingMinutes) && ceilingMinutes > 0) gate.ceilingMinutes = ceilingMinutes
  saveGate(gate)
  const p = await plugin()
  if (!p) return { armed: gate.armed, unsupported: true }
  return p.arm({ on: gate.armed, ceilingMinutes: gate.ceilingMinutes })
}

/**
 * Hand today's state to the native side.
 *
 * Called on app open, on foreground, and after every answered question. The
 * cost is one small write, and calling it too often is strictly better than
 * calling it too rarely — the state it writes is idempotent, so a redundant
 * push is a no-op while a missed one leaves a shield up after the work is done.
 */
export async function pushRecord(sessionLog, now = new Date()) {
  const record = shieldState(sessionLog, loadGoal(), now)
  const p = await plugin()
  if (!p) return { record, unsupported: true }
  const res = await p.pushRecord(record)
  return { record, ...res }
}

/** The escape hatch, read back. An override that is not visible is one you stop
 *  noticing you use. */
export async function unlockLog() {
  const p = await plugin()
  if (!p) return { entries: [] }
  return p.unlockLog()
}

/**
 * Ground truth for reminders, read from iOS itself rather than inferred from
 * what the JS side thinks it asked for. A missed reminder has too many
 * candidate causes to guess between from a screenshot — permission never
 * actually granted, scheduling never reaching this far, alerts allowed but
 * banners specifically turned off in Settings, or a request iOS silently
 * declined to add — and this settles all of them with one call.
 */
export async function notificationDiagnostics() {
  const p = await plugin()
  if (!p) {
    return { unsupported: true, authorizationStatus: 'n/a', alertSetting: 'n/a', pendingCount: 0, pending: [] }
  }
  return p.notificationDiagnostics()
}
