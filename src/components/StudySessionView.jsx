import { useEffect, useState } from 'react'
import { useStudySession } from '../lib/useStudySession.js'
import { getStreak } from '../lib/streaks.js'
import QuestionCard from './QuestionCard.jsx'
import AnswerInput from './AnswerInput.jsx'
import QuestionVisual from './visuals/QuestionVisual.jsx'
import PeriodicSheet from './PeriodicSheet.jsx'

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

/** A filled arc reads as an outcome; a bare fraction reads as data. */
function ScoreRing({ pct }) {
  const R = 42
  const C = 2 * Math.PI * R
  const color = pct >= 80 ? 'var(--good)' : pct >= 50 ? '#facc15' : 'var(--bad)'
  return (
    <svg viewBox="0 0 110 110" width="118" height="118" className="done-ring">
      <circle className="track" cx="55" cy="55" r={R} fill="none" strokeWidth="8" />
      <circle
        className="fill"
        cx="55"
        cy="55"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * C} ${C}`}
        transform="rotate(-90 55 55)"
      />
      <text className="done-pct" x="55" y="63" textAnchor="middle">
        {pct}%
      </text>
    </svg>
  )
}

/** Say something about the run rather than only scoring it. */
function verdictFor(pct, missedCount) {
  if (pct === 100) return 'Clean sweep — nothing missed.'
  if (pct >= 80) return missedCount === 1 ? 'Strong run, one to revisit.' : `Strong run, ${missedCount} to revisit.`
  if (pct >= 50) return 'Getting there — the misses below are where the work is.'
  return 'Rough one. Worth reading the notes again before the next session.'
}

function correctAnswerText(q) {
  if (q.kind === 'numeric') return q.answer
  if (q.kind === 'multi') return q.correctIndices.map((n) => q.choices[n]).join(', ')
  if (q.kind === 'lewisBuilder') return q.answerText
  return q.choices[q.correctIndex]
}

function ReviewList({ items }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="card review-item">
          <div className={`review-badge ${item.correct ? 'good' : 'bad'}`}>{item.correct ? 'Correct' : 'Missed'}</div>
          {item.question.visual && <QuestionVisual visual={item.question.visual} revealed />}
          <p className="prompt">{item.question.prompt}</p>
          <p className="muted">Answer: {correctAnswerText(item.question)}</p>
          {item.question.explanation && <p className="explanation">{item.question.explanation}</p>}
        </div>
      ))}
    </div>
  )
}

export default function StudySessionView({ mode, title, bank, sessionSize = 15 }) {
  const [sessionMode, setSessionMode] = useState(() => localStorage.getItem(MODE_KEY) ?? 'learn')
  const [sheetOpen, setSheetOpen] = useState(false)
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
    // Score against questions actually answered, not the session length —
    // discarded mistaps would otherwise count against a perfect run.
    const answered = session.results.length
    const pct = answered ? Math.round((session.correctCount / answered) * 100) : 0
    return (
      <div>
        <div className="card done-card">
          <ScoreRing pct={pct} />
          <p className="done-sub">
            <strong>
              {session.correctCount} / {answered}
            </strong>{' '}
            correct
          </p>
          <p className="muted done-note">{verdictFor(pct, missed.length)}</p>
          <p className="muted">
            {streak.current}-day streak · {streak.answeredToday} answered today
          </p>
          <button className="primary wide" onClick={session.restart} style={{ marginTop: '0.75rem' }}>
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

      <button className="table-btn" onClick={() => setSheetOpen(true)}>
        Periodic table
      </button>

      {sheetOpen && <PeriodicSheet onClose={() => setSheetOpen(false)} />}

      {session.phase === 'revealed' && (
        <>
          <button className="primary next-btn" onClick={session.next}>
            Next
          </button>
          <button className="discard-btn" onClick={session.discardLast}>
            Mistapped? Skip without recording
          </button>
        </>
      )}
      {session.phase === 'retry' && (
        <button className="ghost next-btn" onClick={session.reveal}>
          Show me the answer
        </button>
      )}
    </div>
  )
}
