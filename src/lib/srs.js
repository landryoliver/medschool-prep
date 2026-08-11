const DAY_MS = 24 * 60 * 60 * 1000

// box index -> ms until next due after a correct answer at that box
export const BOX_INTERVALS_MS = [0, DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 21 * DAY_MS]

export function nextProgressState(prev, id, mode, topic, correct, now = Date.now()) {
  const box = correct ? Math.min((prev?.box ?? -1) + 1, 4) : 0
  return {
    id,
    mode,
    topic,
    timesSeen: (prev?.timesSeen ?? 0) + 1,
    timesCorrect: (prev?.timesCorrect ?? 0) + (correct ? 1 : 0),
    lastSeenAt: now,
    box,
    nextDueAt: now + BOX_INTERVALS_MS[box],
    lastResult: correct,
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Picks a session's worth of question ids, weighting toward due/overdue
 * items (~70%) with the remainder filled by never-seen items, falling
 * back to not-yet-due items if there isn't enough of either.
 */
export function selectSessionQuestions(bankIds, progressById, count, now = Date.now()) {
  const due = []
  const fresh = []
  const notDue = []

  for (const id of bankIds) {
    const p = progressById.get(id)
    if (!p) fresh.push(id)
    else if (p.nextDueAt <= now) due.push(id)
    else notDue.push(id)
  }

  shuffle(due)
  shuffle(fresh)
  shuffle(notDue)

  const result = []
  const dueTarget = Math.min(due.length, Math.ceil(count * 0.7))
  result.push(...due.slice(0, dueTarget))

  let remaining = count - result.length
  const freshTake = Math.min(fresh.length, remaining)
  result.push(...fresh.slice(0, freshTake))

  remaining = count - result.length
  if (remaining > 0) {
    const extraDue = due.slice(dueTarget, dueTarget + remaining)
    result.push(...extraDue)
  }

  remaining = count - result.length
  if (remaining > 0) {
    result.push(...notDue.slice(0, remaining))
  }

  return shuffle(result)
}
