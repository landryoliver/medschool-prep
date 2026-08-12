import { useState } from 'react'
import walkthroughs from '../data/walkthroughs.json'

/**
 * Worked examples, revealed one step at a time.
 *
 * The Notes state a rule and the questions test it; neither shows the
 * procedure actually running. Revealing step by step forces a guess
 * before each reveal, which is what makes this teaching rather than
 * reading — the pause is the point.
 */
function Walkthrough({ item }) {
  const [shown, setShown] = useState(0)
  const done = shown >= item.steps.length

  return (
    <div className="card walk-card">
      <h3 className="walk-title">{item.title}</h3>
      <p className="walk-problem">{item.problem}</p>

      {item.steps.slice(0, shown).map((s, i) => (
        <div className="walk-step" key={i}>
          <div className="walk-step-n">{i + 1}</div>
          <div>
            <div className="walk-step-label">{s.label}</div>
            <div className="walk-step-detail">{s.detail}</div>
          </div>
        </div>
      ))}

      {!done && (
        <button className="ghost wide walk-next" onClick={() => setShown((n) => n + 1)}>
          {shown === 0 ? 'Work it through →' : 'Next step →'}
        </button>
      )}

      {done && (
        <>
          <div className="walk-answer">
            <strong>Answer</strong>
            {item.answer}
          </div>
          <button className="ghost wide walk-next" onClick={() => setShown(0)}>
            Reset and try it yourself
          </button>
        </>
      )}
    </div>
  )
}

export default function Walkthroughs({ topicId, title, onStudy }) {
  const items = walkthroughs[topicId]

  if (!items?.length) {
    return <p className="muted">No worked examples for this topic yet.</p>
  }

  return (
    <div>
      <h2 className="section-title">{title} — worked examples</h2>
      <p className="muted walk-intro">
        Try each step yourself before revealing it. Guessing first and being wrong is what makes the next step stick.
      </p>
      {items.map((item, i) => (
        <Walkthrough item={item} key={i} />
      ))}
      <button className="primary wide" onClick={onStudy}>
        Now drill it →
      </button>
    </div>
  )
}
