import { useState } from 'react'
import QuestionVisual from './visuals/QuestionVisual.jsx'

function ChoiceBody({ label, visual }) {
  if (!visual) return <span>{label}</span>
  return (
    <span className="choice-visual">
      <QuestionVisual visual={visual} />
      <span className="choice-visual-label">{label}</span>
    </span>
  )
}

export default function AnswerInput({ question, phase, onSubmit }) {
  const [tried, setTried] = useState([])
  const [multiSelected, setMultiSelected] = useState([])
  const [numericValue, setNumericValue] = useState('')

  const revealed = phase === 'revealed'
  const locked = revealed

  if (question.kind === 'numeric') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (numericValue === '') return
          onSubmit(numericValue)
        }}
      >
        <input
          type="number"
          inputMode="text"
          value={numericValue}
          disabled={locked}
          onChange={(e) => setNumericValue(e.target.value)}
          className="text-input"
          placeholder="e.g. -1, 0, +1"
        />
        {!locked && (
          <button className="primary" type="submit">
            {phase === 'retry' ? 'Try again' : 'Submit'}
          </button>
        )}
        {revealed && <p className="muted">Correct answer: {question.answer}</p>}
      </form>
    )
  }

  if (question.kind === 'multi') {
    const toggle = (i) => setMultiSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
    return (
      <div>
        {question.choices.map((choice, i) => {
          const selected = multiSelected.includes(i)
          const isCorrect = question.correctIndices.includes(i)
          let cls = 'choice-btn'
          if (revealed && isCorrect) cls += ' correct'
          else if (revealed && selected && !isCorrect) cls += ' incorrect'
          else if (selected) cls += ' selected'
          return (
            <button key={i} className={cls} disabled={locked} onClick={() => toggle(i)}>
              <span className="checkbox">{selected ? '✓' : ''}</span> {choice}
            </button>
          )
        })}
        {!locked && (
          <button className="primary" onClick={() => onSubmit(multiSelected)} disabled={!multiSelected.length}>
            {phase === 'retry' ? 'Try again' : 'Submit'}
          </button>
        )}
      </div>
    )
  }

  // Skeletal structures stay full width: at half width a double bond's two
  // lines sit ~4px apart and a triple bond reads as a solid bar, which is
  // exactly the detail some of these questions turn on. Compact geometry
  // diagrams are fine two-up.
  const isSkeletalChoices = question.choiceVisuals?.[0]?.type === 'skeletal'
  const gridStyle =
    question.choiceVisuals && !isSkeletalChoices
      ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }
      : undefined

  return (
    <div style={gridStyle}>
      {question.choices.map((choice, i) => {
        let cls = 'choice-btn'
        if (revealed) {
          if (i === question.correctIndex) cls += ' correct'
          else if (tried.includes(i)) cls += ' incorrect'
        } else if (tried.includes(i)) {
          cls += ' incorrect'
        }
        return (
          <button
            key={i}
            className={cls}
            disabled={locked || tried.includes(i)}
            onClick={() => {
              setTried((t) => [...t, i])
              onSubmit(i)
            }}
          >
            <ChoiceBody label={choice} visual={question.choiceVisuals?.[i]} />
          </button>
        )
      })}
    </div>
  )
}
