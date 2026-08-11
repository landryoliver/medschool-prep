import { useState } from 'react'

export default function AnswerInput({ question, answered, onSubmit }) {
  const [numericValue, setNumericValue] = useState('')
  const [selected, setSelected] = useState(null)

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
          inputMode="numeric"
          value={numericValue}
          disabled={answered}
          onChange={(e) => setNumericValue(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            background: 'var(--panel)',
            color: 'var(--text)',
            marginBottom: '0.5rem',
          }}
          placeholder="Enter formal charge (e.g. -1, 0, 1)"
        />
        {!answered && (
          <button className="primary" type="submit">
            Submit
          </button>
        )}
        {answered && (
          <p style={{ color: 'var(--muted)' }}>Correct answer: {question.answer}</p>
        )}
      </form>
    )
  }

  return (
    <div>
      {question.choices.map((choice, i) => {
        let cls = 'choice-btn'
        if (answered) {
          if (i === question.correctIndex) cls += ' correct'
          else if (i === selected) cls += ' incorrect'
        }
        return (
          <button
            key={i}
            className={cls}
            disabled={answered}
            onClick={() => {
              setSelected(i)
              onSubmit(i)
            }}
          >
            {choice}
          </button>
        )
      })}
    </div>
  )
}
