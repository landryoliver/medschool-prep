import { dayStamp, isSameDay, endOfDay } from './day.js'

/**
 * The daily study floor.
 *
 * This exists because of what DeviceActivity can and cannot see. Its only
 * primitive is "wake me when cumulative usage of these apps reaches N
 * minutes", so a study floor measured through it means *the app was in the
 * foreground for 30 minutes* — which is cleared by leaving it open on the desk
 * and cleared by scrolling the notes tab. It would be a loophole shipped
 * deliberately.
 *
 * But the study app does not have to be measured from outside. It is our
 * process, and it knows exactly what happened: how many questions were
 * answered, how many were right, how many due cards were cleared. So the floor
 * is defined here, in terms of work done, and DeviceActivity is left to do the
 * one thing it is actually good at — watching the apps we do NOT own.
 *
 * Progress is derived from the session log rather than counted into a stored
 * total, for the same reason a streak should be: four processes will eventually
 * read this (app, monitor extension, shield extensions) and a stored counter is
 * a reconciliation problem across all of them. The log is the only writer.
 */

const KEY = 'medladder.goal'

export const DEFAULT_GOAL = {
  /** Questions answered today. Deliberately not minutes — see above. */
  questions: 20,
  /** Requiring accuracy too would let a bad day lock the phone, which turns
   *  the shield from a nudge into a punishment. Off by default. */
  minAccuracy: 0,
}

export function loadGoal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (!raw) return DEFAULT_GOAL
    return {
      questions: Number.isInteger(raw.questions) && raw.questions > 0 ? raw.questions : DEFAULT_GOAL.questions,
      minAccuracy:
        typeof raw.minAccuracy === 'number' && raw.minAccuracy >= 0 && raw.minAccuracy <= 1
          ? raw.minAccuracy
          : DEFAULT_GOAL.minAccuracy,
    }
  } catch {
    return DEFAULT_GOAL
  }
}

export function saveGoal(goal) {
  try {
    localStorage.setItem(KEY, JSON.stringify(goal))
  } catch {
    /* storage unavailable — the goal falls back to the default, not to a crash */
  }
}

/**
 * What today looks like so far.
 *
 * @param sessionLog  rows from getAllSessionLog()
 * @param goal        from loadGoal()
 * @param now         clock, injectable so this is testable
 */
export function todayProgress(sessionLog = [], goal = DEFAULT_GOAL, now = new Date()) {
  const rows = sessionLog.filter((r) => isSameDay(r.timestamp, now))
  const answered = rows.length
  const correct = rows.filter((r) => r.correct).length
  const accuracy = answered ? correct / answered : 0

  const enough = answered >= goal.questions
  const accurate = goal.minAccuracy <= 0 || accuracy >= goal.minAccuracy
  return {
    day: dayStamp(now),
    answered,
    correct,
    accuracy,
    goal: goal.questions,
    remaining: Math.max(0, goal.questions - answered),
    met: enough && accurate,
    // Distinct from `met`: any work at all is what a streak asks about, while
    // the shield asks about the floor. Collapsing them would mean one answered
    // question unlocks Instagram for the day.
    touched: answered > 0,
    expiresAt: endOfDay(now).getTime(),
  }
}

/**
 * The payload handed to the native side, and the only thing it is told.
 *
 * Deliberately small and already decided: the monitor extension runs in about
 * 6 MB and is killed between callbacks, so it must not compute anything or
 * hold anything. It reads one record and compares two fields.
 */
export function shieldState(sessionLog, goal, now = new Date()) {
  const p = todayProgress(sessionLog, goal, now)
  return {
    day: p.day,
    floorMet: p.met,
    answered: p.answered,
    goal: p.goal,
    // Written so a stale record is detectable rather than trusted. A monitor
    // callback that fires at 00:05 must not read yesterday's floorMet and
    // conclude the day is already satisfied.
    expiresAt: p.expiresAt,
  }
}

/** True when a stored record is for a day that has already ended. */
export function isStale(record, now = new Date()) {
  if (!record || typeof record.expiresAt !== 'number') return true
  if (record.day !== dayStamp(now)) return true
  return now.getTime() >= record.expiresAt
}
