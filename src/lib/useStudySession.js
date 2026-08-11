import { useEffect, useMemo, useState } from 'react'
import { getProgressByMode, putProgress, logSession } from './db.js'
import { nextProgressState, selectSessionQuestions } from './srs.js'

/**
 * Generic quiz-session runner shared by every curated/generated MCQ or
 * numeric-answer mode (Mode 0, 3, 4, 5). Handles SRS-weighted question
 * selection, progress persistence, and session scoring identically for
 * all of them so each mode only needs to supply its question bank.
 *
 * Question shape: { id, topic, kind: 'mcq'|'numeric', prompt, choices?,
 * correctIndex?, answer?, tolerance?, explanation? }
 */
export function useStudySession(mode, bank, sessionSize = 15) {
  const [progressById, setProgressById] = useState(null)
  const [sessionIds, setSessionIds] = useState(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [lastCorrect, setLastCorrect] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  const bankById = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])

  useEffect(() => {
    let cancelled = false
    getProgressByMode(mode).then((rows) => {
      if (cancelled) return
      const map = new Map(rows.map((r) => [r.id, r]))
      setProgressById(map)
      setSessionIds(
        selectSessionQuestions(
          bank.map((q) => q.id),
          map,
          Math.min(sessionSize, bank.length),
        ),
      )
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, bank])

  const current = sessionIds ? bankById.get(sessionIds[index]) : null
  const total = sessionIds?.length ?? 0
  const isDone = sessionIds != null && index >= total

  function checkAnswer(question, response) {
    if (question.kind === 'numeric') {
      const tolerance = question.tolerance ?? 0
      return Math.abs(Number(response) - question.answer) <= tolerance
    }
    return response === question.correctIndex
  }

  async function submitAnswer(response) {
    if (!current || answered) return
    const correct = checkAnswer(current, response)
    setAnswered(true)
    setLastCorrect(correct)
    if (correct) setCorrectCount((c) => c + 1)

    const prev = progressById.get(current.id)
    const updated = nextProgressState(prev, current.id, mode, current.topic, correct)
    progressById.set(current.id, updated)
    await putProgress(updated)
    await logSession({ timestamp: Date.now(), mode, topic: current.topic, correct })
  }

  function next() {
    setAnswered(false)
    setLastCorrect(null)
    setIndex((i) => i + 1)
  }

  function restart() {
    setIndex(0)
    setAnswered(false)
    setLastCorrect(null)
    setCorrectCount(0)
    setSessionIds(
      selectSessionQuestions(
        bank.map((q) => q.id),
        progressById ?? new Map(),
        Math.min(sessionSize, bank.length),
      ),
    )
  }

  return {
    loading: sessionIds == null,
    current,
    index,
    total,
    isDone,
    answered,
    lastCorrect,
    correctCount,
    submitAnswer,
    next,
    restart,
  }
}
