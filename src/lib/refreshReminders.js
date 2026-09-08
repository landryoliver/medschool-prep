import { loadSettings, reschedule } from './notifications.js'
import { getAllProgress } from './db.js'
import { getStreak } from './streaks.js'

/**
 * Gathers today's real numbers and rebuilds the reminder schedule.
 *
 * notifications.js stays free of IndexedDB and streak concerns on purpose —
 * it is the part validate.js exercises directly as a pure function, with no
 * browser needed. This is the one place that bridges real app state to it,
 * and every caller (app open, every answered question, the settings screen)
 * goes through here so the "gather inputs" step exists exactly once.
 */
export async function refreshReminders(settingsOverride) {
  const settings = settingsOverride ?? loadSettings()
  const progress = await getAllProgress()
  const streak = getStreak()
  const due = progress.filter((p) => p.nextDueAt <= Date.now()).length
  return reschedule({ settings, studiedToday: streak.answeredToday > 0, streak: streak.current, due })
}
