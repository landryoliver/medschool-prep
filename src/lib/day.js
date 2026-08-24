/**
 * When a day starts, in one place.
 *
 * This is the single most expensive thing to change late. A streak, a daily
 * goal, a shield that asks "have they studied today", and a reminder that
 * fires "before the day ends" must all agree on where the boundary is, and
 * they are written at different times by different code. Two definitions of
 * "today" is a bug that only shows up between midnight and whenever the other
 * definition rolls over, which is exactly when nobody is testing.
 *
 * Local midnight, deliberately: the user is one person in one timezone, and a
 * study day that ends at UTC midnight would end mid-afternoon for them.
 */

/** 'YYYY-MM-DD' in local time. */
export function dayStamp(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Whole days from one stamp to another. Negative if b is before a. */
export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

/** First millisecond of the day containing `date`. */
export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** First millisecond of the NEXT day — when the current day expires. */
export function endOfDay(date = new Date()) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

/** Was this timestamp recorded on the same local day as `now`? */
export function isSameDay(timestamp, now = new Date()) {
  return dayStamp(new Date(timestamp)) === dayStamp(now)
}
