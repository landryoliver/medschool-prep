import QuestionVisual from './visuals/QuestionVisual.jsx'
import ElementStrip from './visuals/ElementStrip.jsx'
import { referenceElementsFor } from '../lib/chem/elementsInText.js'

export default function QuestionCard({ question, phase, lastCorrect, hintsAvailable, hintUsed, onUseHint }) {
  const revealed = phase === 'revealed'
  const showVisual = question.visual && (!question.visualAfter || revealed)
  // The rule often contains the answer outright, so it stays behind an
  // explicit tap — and taking it stops the question counting as recall.
  const canOfferHint = hintsAvailable && question.teach && phase !== 'revealed'
  // The elements this question names, as a cut of the periodic table. Every
  // real exam supplies the table, and sending the reader off to open the
  // full one breaks the question in half — but a question ASKING for a fact
  // the strip prints gets none, which validation enforces against the whole
  // bank rather than a list of topic names.
  const refElements = referenceElementsFor(question)

  return (
    <div className="card">
      {showVisual && <QuestionVisual visual={question.visual} revealed={revealed} />}
      <p className="prompt">{question.prompt}</p>
      {refElements.length > 0 && <ElementStrip symbols={refElements} />}

      {canOfferHint &&
        (hintUsed ? (
          <p className="teach">
            <strong>Rule</strong> {question.teach}
          </p>
        ) : (
          <button className="hint-btn" onClick={onUseHint}>
            Stuck? Show the rule
          </button>
        ))}

      {phase === 'retry' && (
        <p className="feedback bad">Not quite — take one more look before the answer is revealed.</p>
      )}

      {revealed && (
        <>
          <p className={`feedback ${lastCorrect ? 'good' : 'bad'}`}>
            {lastCorrect ? 'Correct' : 'Incorrect'}
            {lastCorrect && hintUsed ? ' — with the rule shown, so it will come back soon' : ''}
          </p>
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
