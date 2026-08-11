import QuestionVisual from './visuals/QuestionVisual.jsx'

export default function QuestionCard({ question, phase, lastCorrect, showTeach }) {
  const revealed = phase === 'revealed'
  const showVisual = question.visual && (!question.visualAfter || revealed)

  return (
    <div className="card">
      {showVisual && <QuestionVisual visual={question.visual} revealed={revealed} />}
      <p className="prompt">{question.prompt}</p>

      {showTeach && question.teach && phase === 'answering' && (
        <p className="teach">
          <strong>Hint</strong> {question.teach}
        </p>
      )}

      {phase === 'retry' && (
        <p className="feedback bad">Not quite — take one more look before the answer is revealed.</p>
      )}

      {revealed && (
        <>
          <p className={`feedback ${lastCorrect ? 'good' : 'bad'}`}>{lastCorrect ? 'Correct' : 'Incorrect'}</p>
          {question.explanation && <p className="explanation">{question.explanation}</p>}
          {question.teach && (
            <p className="teach">
              <strong>Remember</strong> {question.teach}
            </p>
          )}
        </>
      )}
    </div>
  )
}
