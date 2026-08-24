import { shieldState, loadGoal } from './studyGoal.js'

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
  return cap.Plugins?.ScreenTime ?? null
}

/** True only in the native app. The whole feature is absent on the web, and the
 *  UI should not offer a control that cannot do anything. */
export async function isAvailable() {
  return (await plugin()) != null
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
