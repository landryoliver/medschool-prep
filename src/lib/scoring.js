/** Aggregates sessionLog rows into accuracy-by-topic and accuracy-by-mode. */
export function aggregateByKey(sessionLog, keyFn) {
  const map = new Map()
  for (const row of sessionLog) {
    const key = keyFn(row)
    const cur = map.get(key) || { key, seen: 0, correct: 0 }
    cur.seen += 1
    cur.correct += row.correct ? 1 : 0
    map.set(key, cur)
  }
  return [...map.values()]
    .map((r) => ({ ...r, accuracy: r.seen ? r.correct / r.seen : 0 }))
    .sort((a, b) => b.seen - a.seen)
}

export function accuracyByTopic(sessionLog) {
  return aggregateByKey(sessionLog, (r) => r.topic)
}

export function accuracyByMode(sessionLog) {
  return aggregateByKey(sessionLog, (r) => r.mode)
}

export function overallAccuracy(sessionLog) {
  if (!sessionLog.length) return 0
  const correct = sessionLog.filter((r) => r.correct).length
  return correct / sessionLog.length
}

/**
 * Accuracy per MCAT subject. Rows logged before subjects existed carry only a
 * topic, so the topic map fills in — which is also what keeps a question that
 * later moves topics from silently losing its history here.
 */
export function accuracyBySubject(sessionLog, subjectOf) {
  return aggregateByKey(sessionLog, (r) => r.subject ?? subjectOf(r.topic) ?? 'unknown')
}

/** Accuracy per course, over only the rows that carry a course tag. */
export function accuracyByCourse(sessionLog) {
  return aggregateByKey(
    sessionLog.filter((r) => r.course),
    (r) => r.course,
  )
}
