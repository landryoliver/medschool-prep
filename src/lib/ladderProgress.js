/**
 * What you have learned in each ladder, and when you last looked.
 *
 * The first version stored a single integer stage, which made the ladder a
 * hard chain: the only thing you could do was advance, and the set you had
 * already built was invisible and unreachable. Storing the learned items
 * themselves turns it into a soft chain — the same order is still suggested,
 * but the completed set can be reviewed or browsed on its own, and a gap
 * since the last visit can prompt a warm-up before anything new is added.
 */
const PREFIX = 'orgoprep.ladder.'
const LEGACY_STAGE_KEY = 'orgoprep.ladder.stage'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* progress here is a convenience; private mode must not break the drill */
  }
}

/**
 * Reads a ladder's state. `order` is the ladder's item keys, used only to
 * migrate the old integer stage and to drop keys that no longer exist.
 */
export function loadLadder(id, order) {
  const stored = read(PREFIX + id)
  if (stored && Array.isArray(stored.learned)) {
    // Drop anything no longer in the ladder, so renaming an item cannot
    // leave a permanently "learned" ghost that is never shown again.
    const known = new Set(order)
    return { learned: stored.learned.filter((k) => known.has(k)), lastSeenAt: stored.lastSeenAt ?? 0 }
  }

  // Migration: the amino acid ladder used to store how many were unlocked.
  // A stage of N meant the first N of the order were learned.
  if (id === 'aminoacids') {
    // Read through the same guard as everything else: an unguarded access
    // here threw wherever storage is unavailable, which is private-mode
    // browsing as well as server rendering.
    let raw = null
    try {
      raw = localStorage.getItem(LEGACY_STAGE_KEY)
    } catch {
      raw = null
    }
    const n = parseInt(raw ?? '', 10)
    if (Number.isFinite(n) && n > 1) {
      // Stage N meant N was being learned, so N-1 were complete.
      return { learned: order.slice(0, Math.min(n - 1, order.length)), lastSeenAt: 0 }
    }
  }
  return { learned: [], lastSeenAt: 0 }
}

export function saveLadder(id, state) {
  write(PREFIX + id, { learned: state.learned, lastSeenAt: state.lastSeenAt })
}

/** All ladder states at once, for the picker's progress counts. */
export function loadAll(ladders) {
  const out = {}
  for (const l of ladders) out[l.id] = loadLadder(l.id, l.items.map((i) => i.key))
  return out
}

const HOUR = 3600e3
const DAY = 24 * HOUR

/**
 * How long since this ladder was touched, phrased for a prompt. Null when
 * the gap is short enough that a warm-up would just be friction.
 */
export function staleness(lastSeenAt, now = Date.now()) {
  if (!lastSeenAt) return null
  const gap = now - lastSeenAt
  if (gap < 6 * HOUR) return null
  if (gap < DAY) return { text: 'a few hours', gap }
  if (gap < 2 * DAY) return { text: 'a day', gap }
  if (gap < 7 * DAY) return { text: `${Math.floor(gap / DAY)} days`, gap }
  if (gap < 14 * DAY) return { text: 'a week', gap }
  if (gap < 60 * DAY) return { text: `${Math.floor(gap / (7 * DAY))} weeks`, gap }
  return { text: 'a long time', gap }
}
