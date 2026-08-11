const KEY = 'orgoprep.streak'

function todayStamp(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (24 * 60 * 60 * 1000))
}

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
