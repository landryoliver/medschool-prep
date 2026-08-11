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
