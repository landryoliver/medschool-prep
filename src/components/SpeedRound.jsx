import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { checkAnswer } from '../lib/useStudySession.js'
import { getProgress, putProgress, logSession } from '../lib/db.js'
import { nextProgressState } from '../lib/srs.js'
import { getBestTime, recordBestTime, recordAnswer } from '../lib/streaks.js'
import QuestionVisual from './visuals/QuestionVisual.jsx'

const DURATION_MS = 60_000

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Timed drill: answer as many as possible before the clock runs out.
 * Deliberately minimal feedback — a flash of colour, then straight to the
 * next question — because the point is recall speed, not explanation.
 */
export default function SpeedRound({ drillId, mode, title, bank, onExit }) {
  const [state, setState] = useState('ready') // ready | running | done
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [remaining, setRemaining] = useState(DURATION_MS)
  const [flash, setFlash] = useState(null)
  const [result, setResult] = useState(null)
  const [misses, setMisses] = useState([])

  const startedAt = useRef(0)
  const best = useMemo(() => getBestTime(drillId), [drillId, state])

  const finish = useCallback(() => {
    setState('done')
    setResult((prev) => prev ?? recordBestTime(drillId, { score, elapsedMs: DURATION_MS }))
  }, [drillId, score])

  useEffect(() => {
    if (state !== 'running') return undefined
    const tick = setInterval(() => {
      const left = DURATION_MS - (Date.now() - startedAt.current)
      if (left <= 0) {
        setRemaining(0)
        finish()
      } else {
        setRemaining(left)
      }
    }, 100)
    return () => clearInterval(tick)
  }, [state, finish])

  // recordBestTime needs the final score, so recompute once the round ends.
  useEffect(() => {
    if (state === 'done' && result === null) {
      setResult(recordBestTime(drillId, { score, elapsedMs: DURATION_MS }))
    }
  }, [state, result, drillId, score])

  function start() {
    setQueue(shuffle(bank))
    setIndex(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setRemaining(DURATION_MS)
    setResult(null)
    setMisses([])
    startedAt.current = Date.now()
    setState('running')
  }

  async function answer(question, response) {
    const correct = checkAnswer(question, response)
    setFlash(correct ? 'good' : 'bad')
    setTimeout(() => setFlash(null), 180)

    if (correct) {
      setScore((s) => s + 1)
      setStreak((s) => {
        const next = s + 1
        setBestStreak((b) => Math.max(b, next))
        return next
      })
    } else {
      setStreak(0)
    }
    setIndex((i) => i + 1)

    if (!correct) setMisses((m) => (m.some((q) => q.id === question.id) ? m : [...m, question]))

    // Never promote on a timed answer: a fast correct guess is not the same
    // evidence of recall as a considered one. Misses still reset the box.
    const prev = await getProgress(question.id)
    await putProgress(nextProgressState(prev, question.id, mode, question.topic, correct, Date.now(), { promote: false }))
    await logSession({ timestamp: Date.now(), mode, topic: question.topic, correct })
    recordAnswer()
  }

  if (state === 'ready') {
    return (
      <div className="card">
        <h2 className="section-title">{title} — speed round</h2>
        <p className="muted">
          60 seconds. Answer as many as you can. Tap an answer and it moves straight to the next one.
        </p>
        {best && (
          <p className="muted">
            Personal best: <strong>{best.score}</strong> correct
          </p>
        )}
        <button className="primary" onClick={start}>
          Start
        </button>{' '}
        <button className="ghost" onClick={onExit}>
          Back
        </button>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div>
        <div className="card">
          <h2 className="section-title">Time!</h2>
          <p className="score">{score} correct</p>
          <p className="muted">Best streak this round: {bestStreak}</p>
          {result?.isNewBest ? (
            <p className="feedback good">New personal best</p>
          ) : (
            <p className="muted">Personal best: {result?.best?.score ?? score}</p>
          )}
          <button className="primary" onClick={start}>
            Go again
          </button>{' '}
          <button className="ghost" onClick={onExit}>
            Back
          </button>
        </div>

        {misses.length > 0 && (
          <>
            <h3 className="section-title">What you missed</h3>
            {misses.map((q) => (
              <div key={q.id} className="card review-item">
                {q.visual && <QuestionVisual visual={q.visual} revealed />}
                <p className="prompt">{q.prompt}</p>
                <p className="muted">Answer: {q.choices[q.correctIndex]}</p>
                {q.explanation && <p className="explanation">{q.explanation}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  const question = queue[index % queue.length]
  const seconds = Math.ceil(remaining / 1000)

  return (
    <div className={flash ? `speed-flash ${flash}` : ''}>
      <div className="session-bar">
        <span className="timer">{seconds}s</span>
        <span className="muted">
          {score} correct{streak >= 3 ? ` · ${streak} in a row` : ''}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(remaining / DURATION_MS) * 100}%` }} />
      </div>

      <div className="card">
        {question.visual && !question.visualAfter && <QuestionVisual visual={question.visual} />}
        <p className="prompt">{question.prompt}</p>
      </div>
      <div>
        {question.choices.map((choice, i) => (
          <button key={i} className="choice-btn" onClick={() => answer(question, i)}>
            {choice}
          </button>
        ))}
      </div>
    </div>
  )
}
