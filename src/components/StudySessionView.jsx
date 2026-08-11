import { useStudySession } from '../lib/useStudySession.js'
import QuestionCard from './QuestionCard.jsx'
import AnswerInput from './AnswerInput.jsx'

export default function StudySessionView({ mode, title, bank, sessionSize = 15 }) {
  const session = useStudySession(mode, bank, sessionSize)

  if (session.loading) return <p>Loading…</p>

  if (session.total === 0) {
    return <p>No questions available for this topic yet.</p>
  }

  if (session.isDone) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{title} — session complete</h2>
        <p>
          Score: {session.correctCount} / {session.total}
        </p>
        <button className="primary" onClick={session.restart}>
          New session
        </button>
      </div>
    )
  }

  const { current } = session

  return (
    <div>
      <p style={{ color: 'var(--muted)', margin: '0 0 0.5rem' }}>
        {title} — {session.index + 1} / {session.total}
      </p>
      <QuestionCard question={current} answered={session.answered} lastCorrect={session.lastCorrect} />
      <AnswerInput key={current.id} question={current} answered={session.answered} onSubmit={session.submitAnswer} />
      {session.answered && (
        <button className="primary" style={{ marginTop: '0.75rem' }} onClick={session.next}>
          Next
        </button>
      )}
    </div>
  )
}
