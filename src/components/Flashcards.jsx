import { useMemo, useState } from 'react'
import aminoAcids from '../data/genchem/aminoAcids.json'
import AminoAcidFull from './visuals/AminoAcidFull.jsx'
import LadderDrill from './LadderDrill.jsx'

/**
 * A real flashcard deck: flip to study, then drill at two difficulties.
 *
 * The reference view can be browsed but never asks anything, and the
 * question banks ask constantly but cannot be flipped through. This is the
 * middle: see the structure, try to name it, turn it over. Then the same
 * deck as recall — recognition first, production second, which is the
 * order the two actually get easier in.
 *
 * Deliberately separate from the spaced-repetition engine. This is for
 * cramming a set in one sitting; the SRS is for keeping it.
 */
const MODES = [
  { id: 'ladder', label: 'Build', hint: 'Learn one, name it, then add the next — up to all twenty.' },
  { id: 'flip', label: 'Study', hint: 'Look at each structure, guess, then tap the card to check.' },
  { id: 'choice', label: 'Quiz', hint: 'Name the structure by picking from four options.' },
  { id: 'type', label: 'Recall', hint: 'Hardest: type the name, or its three- or one-letter code.' },
]

const CLASS_COLOR = { acidic: '#f87171', basic: '#38bdf8', polar: '#4ade80', nonpolar: '#facc15' }

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Accepts the full name, the three-letter code, or the one-letter code. */
function matches(input, aa) {
  const v = input.trim().toLowerCase()
  if (!v) return false
  return v === aa.name.toLowerCase() || v === aa.three.toLowerCase() || v === aa.one.toLowerCase()
}

export default function Flashcards({ onDone }) {
  // Build is the default: meeting twenty unfamiliar structures in random
  // order is where this deck used to start, and that is the hardest possible
  // entry point into a set you have not learned yet.
  const [mode, setMode] = useState('ladder')
  // 'toName' shows the structure and asks for the name; 'toStructure'
  // shows the name and asks you to picture the structure — the direction
  // that matters if your course expects you to draw them.
  const [dir, setDir] = useState('toName')
  const [deck, setDeck] = useState(() => shuffled(aminoAcids))
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null) // null | 'right' | 'wrong'
  const [score, setScore] = useState({ right: 0, wrong: 0 })

  // Reverse only applies to Study; the graded modes always ask for the
  // name, because that is the direction an exam tests.
  const reversed = mode === 'flip' && dir === 'toStructure'
  const card = deck[i]
  const done = i >= deck.length

  // Four options for the recognition mode, drawn from the same class where
  // possible so the choice is not settled by the class label alone.
  const options = useMemo(() => {
    if (!card || mode !== 'choice') return []
    const sameClass = aminoAcids.filter((a) => a.class === card.class && a.name !== card.name)
    const others = aminoAcids.filter((a) => a.class !== card.class)
    const pool = shuffled([...sameClass, ...shuffled(others)]).slice(0, 3)
    return shuffled([card, ...pool])
  }, [card, mode])

  function restart(nextMode = mode) {
    setMode(nextMode)
    setDeck(shuffled(aminoAcids))
    setI(0)
    setFlipped(false)
    setTyped('')
    setResult(null)
    setScore({ right: 0, wrong: 0 })
  }

  function advance() {
    setI((n) => n + 1)
    setFlipped(false)
    setTyped('')
    setResult(null)
  }

  function back() {
    if (i === 0) return
    setI((n) => n - 1)
    setFlipped(false)
    setTyped('')
    setResult(null)
  }

  function grade(correct) {
    setResult(correct ? 'right' : 'wrong')
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
  }

  // The mode row gets a line of its own: four labels crammed beside the card
  // counter left each one too narrow to read on a phone.
  const modeBar = (
    <div className="seg wide-seg fc-modes">
      {MODES.map((m) => (
        <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => restart(m.id)}>
          {m.label}
        </button>
      ))}
    </div>
  )

  if (mode === 'ladder') {
    return (
      <div>
        {modeBar}
        <LadderDrill onDone={onDone} />
      </div>
    )
  }

  if (done) {
    const total = score.right + score.wrong
    const pct = total ? Math.round((score.right / total) * 100) : 0
    return (
      <div className="card done-card">
        <h2 className="section-title">Deck finished</h2>
        {total > 0 ? (
          <>
            <p className="score">{pct}%</p>
            <p className="muted">
              {score.right} right · {score.wrong} missed out of {total}
            </p>
          </>
        ) : (
          <p className="muted">All twenty seen.</p>
        )}
        <button className="primary wide" onClick={() => restart()} style={{ marginTop: '0.75rem' }}>
          Shuffle and go again
        </button>
        <button className="ghost wide" onClick={onDone}>
          Back to topics
        </button>
      </div>
    )
  }

  return (
    <div>
      {modeBar}
      <div className="session-bar">
        <span className="muted">
          {i + 1} / {deck.length}
          {mode !== 'flip' && score.right + score.wrong > 0 && (
            <span className="muted"> · {score.right} right</span>
          )}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(i / deck.length) * 100}%` }} />
      </div>
      {/* Say what the current mode does. A three-way toggle labelled with
          single words is a guessing game otherwise. */}
      <p className="muted fc-hint">
        {reversed
          ? 'Read the name, picture the side chain, then tap to check what it looks like.'
          : MODES.find((m) => m.id === mode).hint}
      </p>

      {mode === 'flip' && (
        <div className="seg wide-seg">
          <button
            className={dir === 'toName' ? 'active' : ''}
            onClick={() => {
              setDir('toName')
              setFlipped(false)
            }}
          >
            Structure → name
          </button>
          <button
            className={dir === 'toStructure' ? 'active' : ''}
            onClick={() => {
              setDir('toStructure')
              setFlipped(false)
            }}
          >
            Name → structure
          </button>
        </div>
      )}

      <div
        className={`card flashcard${flipped ? ' flipped' : ''}`}
        style={{ borderTop: `3px solid ${CLASS_COLOR[card.class]}` }}
        onClick={mode === 'flip' ? () => setFlipped((f) => !f) : undefined}
      >
        {reversed && !flipped ? (
          // Name first: the prompt is the word, and the structure is what
          // you are trying to produce from memory.
          <div className="fc-prompt">
            <strong className="fc-prompt-name">{card.name}</strong>
            <span className="muted">
              {card.three} · {card.one}
            </span>
            <p className="muted fc-prompt-ask">Picture the side chain, then tap to check.</p>
          </div>
        ) : (
          <AminoAcidFull aa={card} hideName={!(flipped || result || reversed)} />
        )}

        {(flipped || result) && (
          <div className="fc-back">
            <div className="aa-head">
              <strong>{card.name}</strong>
              <span className="muted">
                {card.three} · {card.one}
              </span>
            </div>
            <div className="aa-facts">
              <span style={{ color: CLASS_COLOR[card.class] }}>{card.class}</span>
              <span className="muted">{card.pKaR != null ? `pKa ${card.pKaR}` : 'no ionizable side chain'}</span>
              <span className="muted">charge {card.charge7 > 0 ? '+1' : card.charge7 < 0 ? '−1' : '0'}</span>
            </div>
            <div className="fc-group">
              <strong>Side chain: {card.groupName}</strong>
              {card.groupWhat}
            </div>
            <p className="muted aa-note">{card.note}</p>
          </div>
        )}

        {mode === 'flip' && !flipped && <p className="muted fc-tap">Tap to reveal the answer</p>}
      </div>

      {mode === 'flip' && (
        <div className="fc-nav">
          <button className="ghost" onClick={back} disabled={i === 0}>
            ← Back
          </button>
          <button className="primary" onClick={advance}>
            Next card →
          </button>
        </div>
      )}

      {mode === 'choice' && !result && (
        <div>
          {options.map((o) => (
            <button key={o.name} className="choice-btn" onClick={() => grade(o.name === card.name)}>
              {o.name} <span className="muted">({o.three})</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'type' && !result && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim()) grade(matches(typed, card))
          }}
        >
          <input
            className="text-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Name, three-letter, or one-letter code"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button className="primary wide" type="submit">
            Check
          </button>
        </form>
      )}

      {result && (
        <>
          <p className={`feedback ${result === 'right' ? 'good' : 'bad'}`}>
            {result === 'right' ? 'Correct' : `Not quite — that was ${card.name} (${card.three}, ${card.one})`}
          </p>
          <div className="fc-nav">
            <button className="ghost" onClick={back} disabled={i === 0}>
              ← Back
            </button>
            <button className="primary" onClick={advance}>
              Next card →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
