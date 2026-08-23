const DAY_MS = 24 * 60 * 60 * 1000

// box index -> ms until next due after a correct answer at that box
export const BOX_INTERVALS_MS = [0, DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 21 * DAY_MS]

/**
 * `promote: false` records the attempt without advancing the Leitner box.
 * Used when the answer was reached with a hint, or under speed-round time
 * pressure — neither is evidence of recall, and counting them as mastery
 * would push the question out to a 3-week interval it hasn't earned.
 * A wrong answer always resets the box regardless.
 *
 * An unseen question starts at box 0, so the first correct answer moves it
 * to box 1 and a one-day interval. Treating "unseen" as box −1 instead put
 * a freshly-learned question back in box 0, whose interval is zero — so it
 * was immediately due again and kept competing for the next session
 * instead of spacing out. It also meant mastery (box 3) quietly needed
 * four correct recalls rather than the three the UI describes.
 */
export function nextProgressState(prev, id, mode, topic, correct, now = Date.now(), { promote = true } = {}) {
  const box = correct ? (promote ? Math.min((prev?.box ?? 0) + 1, 4) : (prev?.box ?? 0)) : 0
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
export function selectSessionQuestions(questions, progressById, count, now = Date.now()) {
  const accuracyByTopic = topicAccuracy([...progressById.values()])

  // How many UNSEEN questions share each concept. Only unseen material is
  // divided this way: a question you have actually answered and that is now
  // due is a specific memory worth reviewing, not a redundant seed, and
  // dividing its weight would suppress legitimate reviews. Unseen population
  // is where the distortion lives — a generator handed 90 seeds contributed 90
  // unseen questions and took 90 shares of new-material time for one idea.
  const unseenInFamily = new Map()
  for (const q of questions) {
    if (progressById.has(q.id)) continue
    const key = q.family ?? q.id
    unseenInFamily.set(key, (unseenInFamily.get(key) ?? 0) + 1)
  }

  const weighted = questions.map((question) => {
    const id = question.id
    const p = progressById.get(id)
    // Read the topic from the question itself, not from stored progress:
    // most of the bank is unseen, and an unseen question with no progress
    // row would otherwise get a flat default weight, which is exactly the
    // new material a weak topic most needs to surface.
    const topic = question.topic
    // 1.0 for a perfect topic, up to 2.5 for a topic being missed constantly
    const topicWeight = topic ? 1 + 1.5 * (1 - (accuracyByTopic.get(topic) ?? 0.5)) : 1.25

    let baseWeight
    if (!p) {
      baseWeight = 3 / (unseenInFamily.get(question.family ?? id) ?? 1)
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

  return shuffle(weightedSample(weighted, Math.min(count, questions.length)))
}
