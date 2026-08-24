/**
 * Study reminders.
 *
 * iOS will not run this code at 8pm. A local notification's text is fixed the
 * moment it is scheduled, so "only if you have not studied today" cannot be
 * decided at fire time — it has to be decided when the schedule is written.
 *
 * That works here because of a property this app happens to have: the only way
 * "studied today" becomes true is by opening the app and answering something,
 * and at that instant the app is running. So the rule is simply that any event
 * which could change the answer also rebuilds the schedule. Answer a question,
 * today's remaining reminders are cancelled. Come back tomorrow, they return.
 *
 * Everything below the adapter is pure and runs in a browser, so the whole
 * thing is testable without an iPhone anywhere near it.
 */

const KEY = 'orgoprep.notify'

/** iOS keeps at most 64 pending local notifications and drops the rest without
 *  saying which. Budget explicitly rather than finding out by losing the one
 *  that mattered. */
export const IOS_PENDING_CAP = 64

/** How many days ahead to write. Rebuilt on every app open, so this only has
 *  to outlast the longest plausible gap between opens. */
export const HORIZON_DAYS = 7

/**
 * Three opt-in slots. Each is suppressed once the day has been studied, so a
 * day you have already worked is silent.
 *
 * `priority` is the streak-saver: late enough that missing it means missing the
 * day. Its wording escalates when a streak is actually live, because "your
 * 12-day streak ends at midnight" and "still time today" are different messages
 * and only one of them should be able to cry wolf.
 */
export const SLOTS = [
  { id: 'early', label: 'Morning', defaultTime: '08:00', defaultOn: false },
  { id: 'late', label: 'Evening', defaultTime: '18:00', defaultOn: false },
  { id: 'priority', label: 'Last call', defaultTime: '22:00', defaultOn: false },
]

export const DEFAULT_SETTINGS = {
  enabled: false,
  slots: Object.fromEntries(SLOTS.map((s) => [s.id, { on: s.defaultOn, time: s.defaultTime }])),
}

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (!raw) return DEFAULT_SETTINGS
    // Field-by-field with defaults, never a spread of whatever was stored: a
    // settings blob written by an older build must not be able to produce a
    // slot with no time in it.
    return {
      enabled: raw.enabled === true,
      slots: Object.fromEntries(
        SLOTS.map((s) => {
          const got = raw.slots?.[s.id]
          return [
            s.id,
            {
              on: got?.on === true,
              time: isTime(got?.time) ? got.time : s.defaultTime,
            },
          ]
        }),
      ),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    /* private mode, or storage full — reminders are not worth throwing over */
  }
}

function isTime(t) {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

function at(day, time) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

function body({ slotId, streak, due, hasStreak }) {
  if (slotId === 'priority' && hasStreak) {
    return `Your ${streak}-day streak ends at midnight.`
  }
  if (due > 0) return `${due} card${due === 1 ? '' : 's'} due.`
  return 'A few minutes is enough to keep the day.'
}

/**
 * The whole scheduling decision, as one pure function.
 *
 * @param now           current time
 * @param settings      from loadSettings()
 * @param studiedToday  has anything been answered since local midnight
 * @param streak        current streak length
 * @param due           how many questions are due now
 * @returns             notifications to hand the platform, soonest first
 */
export function plan({ now = new Date(), settings, studiedToday, streak = 0, due = 0 } = {}) {
  if (!settings?.enabled) return []

  const on = SLOTS.filter((s) => settings.slots?.[s.id]?.on)
  if (!on.length) return []

  const out = []
  for (let d = 0; d < HORIZON_DAYS; d++) {
    const day = new Date(now)
    day.setDate(day.getDate() + d)
    // Today is skipped entirely once it has been studied. Tomorrow onward is
    // always written: whether those days get studied is not knowable yet, and
    // the next app open will retract them if they are.
    if (d === 0 && studiedToday) continue

    for (const slot of on) {
      const when = at(day, settings.slots[slot.id].time)
      // A time already past today is not scheduled — iOS would either fire it
      // immediately or drop it, and both are worse than silence.
      if (when <= now) continue
      out.push({
        // Deterministic so a rebuild replaces rather than duplicates.
        id: `${slot.id}-${when.getFullYear()}${String(when.getMonth() + 1).padStart(2, '0')}${String(when.getDate()).padStart(2, '0')}`,
        slotId: slot.id,
        at: when,
        title: slot.id === 'priority' && d === 0 && streak > 0 ? 'Streak at risk' : 'Study time',
        // Only today's numbers are real. A notification three days out cannot
        // know the due count then, so it does not claim one.
        body: body({ slotId: slot.id, streak, due: d === 0 ? due : 0, hasStreak: d === 0 && streak > 0 }),
      })
    }
  }

  out.sort((a, b) => a.at - b.at)
  // Nearest first, so if anything is dropped it is the far end of the horizon.
  return out.slice(0, IOS_PENDING_CAP)
}

/* ------------------------------------------------------------------ adapter */

/**
 * The native side rides on our own ScreenTimePlugin rather than
 * @capacitor/local-notifications. UNUserNotificationCenter is a bare iOS
 * framework — scheduling a local alert needs no third-party package, and
 * ScreenTimePlugin.swift already exists as a hand-written Capacitor bridge for
 * a harder case. Adding two @objc funcs there costs less than a second SPM
 * dependency costs in resolve-and-commit friction, and it is one fewer entry
 * in Package.resolved for a Mac-only step to ever need to redo.
 */
async function backend() {
  const cap = globalThis.Capacitor
  if (!cap?.isNativePlatform?.()) return null
  return cap.Plugins?.ScreenTime ?? null
}

/** Numeric ids are what the platform wants; the readable id is what we reason
 *  about. Hash rather than a counter so it stays stable across rebuilds. */
export function numericId(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 2147483647
}

export async function requestPermission() {
  const api = await backend()
  if (!api) return 'unsupported'
  const res = await api.requestNotificationPermission()
  return res?.granted ? 'granted' : 'denied'
}

/**
 * Cancel everything and write the current plan. Called on app open and after
 * anything that changes whether today counts as studied.
 */
export async function reschedule(input) {
  const items = plan(input)
  const api = await backend()
  if (!api) return items // browser: planning still runs, nothing is delivered

  await api.scheduleNotifications({
    notifications: items.map((n) => ({
      id: numericId(n.id),
      title: n.title,
      body: n.body,
      at: n.at.getTime(),
    })),
  })
  return items
}
