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
 * Per-topic accuracy from stored progress. Topics with few attempts are
 * pulled toward 0.5 so a single unlucky miss doesn't dominate weighting.
 */
export function topicAccuracy(progressValues) {
  const byTopic = new Map()
  for (const p of progressValues) {
    const cur = byTopic.get(p.topic) || { seen: 0, correct: 0 }
    cur.seen += p.timesSeen
    cur.correct += p.timesCorrect
    byTopic.set(p.topic, cur)
  }
  const out = new Map()
  const PRIOR = 4
  for (const [topic, { seen, correct }] of byTopic) {
    out.set(topic, (correct + 0.5 * PRIOR) / (seen + PRIOR))
  }
  return out
}

/**
 * Weighted sample without replacement. Weight is the relative chance of
 * being drawn; higher-weight items surface more often but nothing is
 * ever fully excluded, which keeps sessions varied.
 */
function weightedSample(items, count) {
  const pool = [...items]
  const picked = []
  while (picked.length < count && pool.length) {
    let total = 0
    for (const it of pool) total += it.weight
    let r = Math.random() * total
    let idx = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(pool[idx].id)
    pool.splice(idx, 1)
  }
  return picked
}

/**
 * Builds a session, blending three signals:
 *   1. SRS due-date (overdue items weigh most, per Leitner box)
 *   2. Never-seen items (steady supply of new material)
 *   3. Weak-topic bias (topics with low accuracy resurface more often)
 *
 * Deliberately probabilistic rather than a strict due-date queue so
 * repeated sessions in one sitting don't replay an identical list.
 */
export function selectSessionQuestions(bankIds, progressById, count, now = Date.now()) {
  const accuracyByTopic = topicAccuracy([...progressById.values()])

  const weighted = bankIds.map((id) => {
    const p = progressById.get(id)
    const topic = p?.topic
    // 1.0 for a perfect topic, up to 2.5 for a topic being missed constantly
    const topicWeight = topic ? 1 + 1.5 * (1 - (accuracyByTopic.get(topic) ?? 0.5)) : 1.25

    let baseWeight
    if (!p) {
      baseWeight = 3 // unseen material
    } else if (p.nextDueAt <= now) {
      const overdueDays = (now - p.nextDueAt) / DAY_MS
      baseWeight = 4 + Math.min(overdueDays, 5) // due, more so the longer it waits
    } else {
      baseWeight = 0.4 // not due yet, small chance of an early review
    }

    // A question missed on its last attempt gets an extra push regardless of box.
    const missBoost = p && p.lastResult === false ? 2 : 1

    return { id, weight: baseWeight * topicWeight * missBoost }
  })

  return shuffle(weightedSample(weighted, Math.min(count, bankIds.length)))
}
