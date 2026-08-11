import { useEffect, useState } from 'react'
import { useStudySession } from '../lib/useStudySession.js'
import { getStreak } from '../lib/streaks.js'
import QuestionCard from './QuestionCard.jsx'
import AnswerInput from './AnswerInput.jsx'
import QuestionVisual from './visuals/QuestionVisual.jsx'

const MODE_KEY = 'orgoprep.sessionMode'

function SessionModeToggle({ value, onChange }) {
  return (
    <div className="seg">
      {[
        { id: 'learn', label: 'Learn', hint: 'Instant feedback, a retry, and explanations' },
        { id: 'test', label: 'Test', hint: 'No feedback until the end' },
      ].map((opt) => (
        <button
          key={opt.id}
          className={value === opt.id ? 'active' : ''}
          title={opt.hint}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ReviewList({ items }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="card review-item">
          <div className={`review-badge ${item.correct ? 'good' : 'bad'}`}>{item.correct ? 'Correct' : 'Missed'}</div>
          {item.question.visual && <QuestionVisual visual={item.question.visual} revealed />}
          <p className="prompt">{item.question.prompt}</p>
          <p className="muted">
            Answer:{' '}
            {item.question.kind === 'numeric'
              ? item.question.answer
              : item.question.kind === 'multi'
                ? item.question.correctIndices.map((n) => item.question.choices[n]).join(', ')
                : item.question.choices[item.question.correctIndex]}
          </p>
          {item.question.explanation && <p className="explanation">{item.question.explanation}</p>}
        </div>
      ))}
    </div>
  )
}

export default function StudySessionView({ mode, title, bank, sessionSize = 15 }) {
  const [sessionMode, setSessionMode] = useState(() => localStorage.getItem(MODE_KEY) ?? 'learn')
  const [streak, setStreak] = useState(getStreak)
  const session = useStudySession(mode, bank, { sessionSize, sessionMode })

  useEffect(() => {
    localStorage.setItem(MODE_KEY, sessionMode)
  }, [sessionMode])

  // Streak/among-today counters update as questions are answered.
  useEffect(() => {
    setStreak(getStreak())
  }, [session.results.length])

  if (session.loading) return <p>Loading…</p>
  if (!session.total) return <p>No questions available yet for this topic.</p>

  if (session.isDone) {
    const missed = session.reviewItems.filter((r) => !r.correct)
    const pct = Math.round((session.correctCount / session.total) * 100)
    return (
      <div>
        <div className="card">
          <h2 className="section-title">{title} complete</h2>
          <p className="score">
            {session.correctCount} / {session.total} <span className="muted">({pct}%)</span>
          </p>
          <p className="muted">
            {streak.current}-day streak · {streak.answeredToday} answered today
          </p>
          <button className="primary" onClick={session.restart}>
            New session
          </button>
        </div>
        {sessionMode === 'test' ? (
          <>
            <h3 className="section-title">Full review</h3>
            <ReviewList items={session.reviewItems} />
          </>
        ) : missed.length ? (
          <>
            <h3 className="section-title">Worth another look</h3>
            <ReviewList items={missed} />
          </>
        ) : (
          <p className="muted">Clean sweep — nothing missed this session.</p>
        )}
      </div>
    )
  }

  const { current } = session

  return (
    <div>
      <div className="session-bar">
        <span className="muted">
          {session.index + 1} / {session.total}
        </span>
        <SessionModeToggle value={sessionMode} onChange={setSessionMode} />
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(session.index / session.total) * 100}%` }} />
      </div>

      <QuestionCard
        question={current}
        phase={session.phase}
        lastCorrect={session.lastCorrect}
        hintsAvailable={sessionMode === 'learn'}
        hintUsed={session.hintUsed}
        onUseHint={session.useHint}
      />
      <AnswerInput key={`${current.id}-${session.index}`} question={current} phase={session.phase} onSubmit={session.submitAnswer} />

      {session.phase === 'revealed' && (
        <button className="primary next-btn" onClick={session.next}>
          Next
        </button>
      )}
      {session.phase === 'retry' && (
        <button className="ghost next-btn" onClick={session.reveal}>
          Show me the answer
        </button>
      )}
    </div>
  )
}
