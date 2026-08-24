import { dayStamp as todayStamp, daysBetween } from './day.js'

// The day boundary used to live here as a private copy. It moved to day.js
// when the daily goal and the shield started needing the same answer — two
// definitions of "today" only disagree between one midnight and the other,
// which is precisely when nobody is looking.
const KEY = 'orgoprep.streak'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

export function getStreak() {
  const s = read()
  const today = todayStamp()
  if (!s.lastDay) return { current: 0, best: s.best ?? 0, answeredToday: 0 }
  const gap = daysBetween(s.lastDay, today)
  return {
    current: gap <= 1 ? (s.current ?? 0) : 0,
    best: s.best ?? 0,
    answeredToday: gap === 0 ? (s.answeredToday ?? 0) : 0,
  }
}

/** Call once per answered question. Rolls the streak forward on a new day. */
export function recordAnswer() {
  const s = read()
  const today = todayStamp()
  const gap = s.lastDay ? daysBetween(s.lastDay, today) : null

  let current = s.current ?? 0
  let answeredToday = s.answeredToday ?? 0

  if (gap === 0) {
    answeredToday += 1
  } else {
    // First question of a new day: extend the streak if yesterday counted, else restart.
    current = gap === 1 ? current + 1 : 1
    answeredToday = 1
  }

  const next = {
    lastDay: today,
    current,
    answeredToday,
    best: Math.max(s.best ?? 0, current),
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

/**
 * Roll back one answer from today's count, for a discarded mistap. The
 * streak day itself stands — you did study today, whatever happened to
 * that one question.
 */
export function unrecordAnswer() {
  const s = read()
  if (!s.lastDay || s.lastDay !== todayStamp()) return
  const next = { ...s, answeredToday: Math.max(0, (s.answeredToday ?? 1) - 1) }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

const BEST_TIME_KEY = 'orgoprep.bestTimes'

export function getBestTime(drillId) {
  try {
    return JSON.parse(localStorage.getItem(BEST_TIME_KEY))?.[drillId] ?? null
  } catch {
    return null
  }
}

/** Records a speed-round result, keeping the highest score (ties broken by faster time). */
export function recordBestTime(drillId, { score, elapsedMs }) {
  let all = {}
  try {
    all = JSON.parse(localStorage.getItem(BEST_TIME_KEY)) ?? {}
  } catch {
    all = {}
  }
  const prev = all[drillId]
  const isBetter = !prev || score > prev.score || (score === prev.score && elapsedMs < prev.elapsedMs)
  if (isBetter) {
    all[drillId] = { score, elapsedMs }
    localStorage.setItem(BEST_TIME_KEY, JSON.stringify(all))
  }
  return { best: all[drillId], isNewBest: isBetter }
}
