import SkeletalDiagram from './SkeletalDiagram.jsx'

export default function QuestionCard({ question, answered, lastCorrect }) {
  return (
    <div className="card">
      {question.molecule && <p style={{ color: 'var(--muted)', marginTop: 0 }}>{question.molecule}</p>}
      {question.shape && (
        <SkeletalDiagram
          shape={question.shape}
          size={question.size}
          doubleBondAt={question.doubleBondAt}
          substituent={question.substituent}
        />
      )}
      <p style={{ fontSize: '1.05rem' }}>{question.prompt}</p>
      {answered && (
        <p style={{ color: lastCorrect ? 'var(--good)' : 'var(--bad)', fontWeight: 600 }}>
          {lastCorrect ? 'Correct' : 'Incorrect'}
          {question.explanation ? ` — ${question.explanation}` : ''}
        </p>
      )}
    </div>
  )
}
