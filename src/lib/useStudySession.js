import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getProgressByMode, putProgress, logSession, deleteProgress, deleteSessionLog } from './db.js'
import { nextProgressState, selectSessionQuestions } from './srs.js'
import { recordAnswer } from './streaks.js'

export function checkAnswer(question, response) {
  if (question.kind === 'numeric') {
    const tolerance = question.tolerance ?? 0
    return Math.abs(Number(response) - question.answer) <= tolerance
  }
  if (question.kind === 'multi') {
    const expected = new Set(question.correctIndices)
    const got = new Set(response)
    return expected.size === got.size && [...expected].every((i) => got.has(i))
  }
  return response === question.correctIndex
}

/**
 * Shared session runner for every question-bank mode.
 *
 * Two session modes, per the study-app brief:
 *   learn — immediate feedback, one retry on a miss, explanation revealed
 *   test  — no feedback until the end, then a full review list
 *
 * SRS/progress is always credited from the FIRST attempt so that using
 * learn mode's retry doesn't inflate recorded accuracy.
 */
export function useStudySession(mode, bank, { sessionSize = 15, sessionMode = 'learn' } = {}) {
  const [progressById, setProgressById] = useState(null)
  const [sessionIds, setSessionIds] = useState(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('answering') // 'answering' | 'retry' | 'revealed'
  const [lastCorrect, setLastCorrect] = useState(null)
  const [results, setResults] = useState([])
  const [hintUsed, setHintUsed] = useState(false)

  const bankById = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])

  useEffect(() => {
    let cancelled = false
    getProgressByMode(mode).then((rows) => {
      if (cancelled) return
      const map = new Map(rows.map((r) => [r.id, r]))
      setProgressById(map)
      setSessionIds(selectSessionQuestions(bank, map, sessionSize))
    })
    return () => {
      cancelled = true
    }
  }, [mode, bank, sessionSize])

  const current = sessionIds ? bankById.get(sessionIds[index]) : null
  const total = sessionIds?.length ?? 0
  const isDone = sessionIds != null && index >= total
  const correctCount = results.filter((r) => r.correct).length

  // Enough state to undo the most recent answer if it was a mistap.
  const lastWrite = useRef(null)

  const commitResult = useCallback(
    async (question, correct, hinted) => {
      const prev = progressById.get(question.id)
      const updated = nextProgressState(prev, question.id, mode, question.topic, correct, Date.now(), {
        promote: !hinted,
      })
      progressById.set(question.id, updated)
      await putProgress(updated)
      const logId = await logSession({ timestamp: Date.now(), mode, topic: question.topic, correct })
      recordAnswer()
      lastWrite.current = { questionId: question.id, prev, logId }
    },
    [mode, progressById],
  )

  /**
   * Undo the last recorded answer — for a mistap on a phone, which would
   * otherwise reset the question's Leitner box and count against the topic
   * permanently. Restores the previous progress row rather than writing a
   * corrected one, so the attempt leaves no trace either way.
   */
  const discardLast = useCallback(async () => {
    const write = lastWrite.current
    if (!write) return
    lastWrite.current = null

    if (write.prev) {
      progressById.set(write.questionId, write.prev)
      await putProgress(write.prev)
    } else {
      progressById.delete(write.questionId)
      await deleteProgress(write.questionId)
    }
    if (write.logId != null) await deleteSessionLog(write.logId)

    setResults((r) => r.slice(0, -1))
    setPhase('answering')
    setLastCorrect(null)
    setHintUsed(false)
    setIndex((i) => i + 1)
  }, [progressById])

  const submitAnswer = useCallback(
    async (response) => {
      if (!current || phase === 'revealed') return
      const correct = checkAnswer(current, response)
      const isFirstAttempt = phase === 'answering'

      if (isFirstAttempt) {
        setResults((r) => [...r, { id: current.id, correct, response, hinted: hintUsed }])
        await commitResult(current, correct, hintUsed)
      }

      if (sessionMode === 'test') {
        setIndex((i) => i + 1)
        setPhase('answering')
        return
      }

      setLastCorrect(correct)
      // One retry on a first miss, then reveal the answer.
      setPhase(correct || !isFirstAttempt ? 'revealed' : 'retry')
    },
    [current, phase, sessionMode, commitResult, hintUsed],
  )

  const next = useCallback(() => {
    setPhase('answering')
    setLastCorrect(null)
    setHintUsed(false)
    setIndex((i) => i + 1)
  }, [])

  const useHint = useCallback(() => setHintUsed(true), [])

  const reveal = useCallback(() => setPhase('revealed'), [])

  const restart = useCallback(() => {
    setIndex(0)
    setPhase('answering')
    setLastCorrect(null)
    setHintUsed(false)
    setResults([])
    setSessionIds(selectSessionQuestions(bank, progressById ?? new Map(), sessionSize))
  }, [bank, progressById, sessionSize])

  return {
    loading: sessionIds == null,
    current,
    index,
    total,
    isDone,
    phase,
    answered: phase !== 'answering',
    lastCorrect,
    correctCount,
    results,
    hintUsed,
    reviewItems: results.map((r) => ({ ...r, question: bankById.get(r.id) })),
    submitAnswer,
    next,
    reveal,
    useHint,
    discardLast,
    restart,
  }
}
