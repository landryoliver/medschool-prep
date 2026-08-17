import { useEffect, useMemo, useState } from 'react'
import aminoAcids from '../data/genchem/aminoAcids.json'
import MNEMONICS from '../data/genchem/aminoAcidMnemonics.json'
import AminoAcidFull from './visuals/AminoAcidFull.jsx'
import { useNotation } from '../lib/useNotation.js'
import NotationToggle from './NotationToggle.jsx'

/**
 * Learn one, identify it, learn the next, identify both — and so on to
 * twenty.
 *
 * The other modes hand you all twenty at once and shuffle. That tests a set
 * you do not have yet: every card is equally unfamiliar, so a miss carries
 * no information and the deck never feels like it is shrinking. Building the
 * set one residue at a time means each round is mostly things you already
 * know, with exactly one new thing to place among them, and the thing being
 * tested is the DISCRIMINATION between them rather than raw recall.
 *
 * The order is not chosen here — it is read off the three sorting phrases,
 * so working up the ladder walks "Grandma Always Visits London In May For
 * Winston's Party", then Santa's, then Dragons, in order. Learning the set
 * and learning the mnemonic are then the same activity.
 */
const STORE_KEY = 'orgoprep.ladder.stage'

export function ladderOrder() {
  const byOne = new Map(aminoAcids.map((a) => [a.one, a]))
  return MNEMONICS.flatMap((m) => [...m.letters]).map((l) => byOne.get(l))
}

const CLASS_COLOR = { acidic: '#f87171', basic: '#38bdf8', polar: '#4ade80', nonpolar: '#facc15' }

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function loadStage() {
  try {
    const n = parseInt(localStorage.getItem(STORE_KEY) ?? '1', 10)
    return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 1
  } catch {
    return 1
  }
}

export default function LadderDrill({ onDone }) {
  const ORDER = useMemo(ladderOrder, [])
  const [stage, setStage] = useState(loadStage) // how many are unlocked
  const [phase, setPhase] = useState('learn') // 'learn' | 'drill' | 'done'
  const [queue, setQueue] = useState([])
  const [qi, setQi] = useState(0)
  const [missed, setMissed] = useState([])
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(false)
  const [notation, setNotation] = useNotation()

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, String(stage))
    } catch {
      /* progress here is a convenience; a private-mode failure must not break the drill */
    }
  }, [stage])

  const unlocked = ORDER.slice(0, stage)
  const fresh = ORDER[stage - 1]
  const card = queue[qi]

  // Which phrase the new residue comes from, so the mnemonic is being built
  // alongside the structures rather than taught separately.
  const phraseFor = (aa) => MNEMONICS.find((m) => m.letters.includes(aa.one))

  // Four options, preferring names already unlocked — the question is
  // "which of the ones you know is this", so the distractors should be
  // things you know. Early on there are not four yet, so the rest come from
  // further up the ladder.
  const options = useMemo(() => {
    if (!card) return []
    const known = unlocked.filter((a) => a.name !== card.name)
    const upcoming = ORDER.slice(stage)
    const pool = [...shuffled(known), ...shuffled(upcoming)].slice(0, 3)
    return shuffled([card, ...pool])
  }, [card, stage])

  function startDrill() {
    setQueue(shuffled(unlocked))
    setQi(0)
    setMissed([])
    setResult(null)
    setRetry(false)
    setPhase('drill')
  }

  function grade(correct) {
    setResult(correct ? 'right' : 'wrong')
    if (!correct) setMissed((m) => (m.some((x) => x.name === card.name) ? m : [...m, card]))
  }

  function next() {
    setResult(null)
    if (qi + 1 < queue.length) {
      setQi(qi + 1)
      return
    }
    // Round over. Anything missed gets asked again before the ladder moves
    // on — advancing past a residue you just failed to name is how a "learn"
    // mode quietly becomes a click-through.
    if (missed.length) {
      setQueue(shuffled(missed))
      setMissed([])
      setQi(0)
      setRetry(true)
      return
    }
    if (stage >= ORDER.length) {
      setPhase('done')
      return
    }
    setStage(stage + 1)
    setPhase('learn')
  }

  function reset() {
    setStage(1)
    setPhase('learn')
    setResult(null)
  }

  const header = (
    <>
      <div className="session-bar">
        <span className="muted">
          {phase === 'drill' ? `Naming ${queue.length}` : `Residue ${Math.min(stage, ORDER.length)}`} of {ORDER.length}
        </span>
        <button className="ghost small" onClick={reset}>
          Start over
        </button>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((stage - 1) / ORDER.length) * 100}%` }} />
      </div>
    </>
  )

  if (phase === 'done') {
    return (
      <div className="card done-card">
        <h2 className="section-title">All twenty</h2>
        <p className="muted">
          You built the set one at a time and named every one against the whole group. Switch to Recall to type them
          from memory, or run the Amino Acids question bank to keep them.
        </p>
        <button className="primary wide" onClick={reset} style={{ marginTop: '0.75rem' }}>
          Start the ladder again
        </button>
        <button className="ghost wide" onClick={onDone}>
          Back to topics
        </button>
      </div>
    )
  }

  if (phase === 'learn') {
    const phrase = phraseFor(fresh)
    const position = phrase.letters.indexOf(fresh.one) + 1
    return (
      <div>
        {header}
        <p className="muted fc-hint">
          {stage === 1
            ? 'Start with one. Learn it, name it, then a second one joins it — and so on to twenty.'
            : `Number ${stage}. Learn this one, then name it against the ${stage - 1} you already have.`}
        </p>
        <NotationToggle notation={notation} onChange={setNotation} />
        <div className="card ladder-learn" style={{ borderTop: `3px solid ${CLASS_COLOR[fresh.class]}` }}>
          <div className="ladder-new">New</div>
          <div className="aa-head">
            <strong>{fresh.name}</strong>
            <span className="muted">
              {fresh.three} · {fresh.one}
            </span>
          </div>
          <AminoAcidFull aa={fresh} notation={notation} />
          <div className="aa-facts">
            <span style={{ color: CLASS_COLOR[fresh.class] }}>{fresh.class}</span>
            <span className="muted">{fresh.pKaR != null ? `pKa ${fresh.pKaR}` : 'no ionizable side chain'}</span>
            <span className="muted">charge {fresh.charge7 > 0 ? '+1' : fresh.charge7 < 0 ? '−1' : '0'}</span>
          </div>
          <div className="fc-group">
            <strong>Side chain: {fresh.groupName}</strong>
            {fresh.groupWhat}
          </div>
          <p className="muted aa-note">{fresh.note}</p>
          <p className="muted ladder-phrase">
            Letter {position} of “{phrase.phrase}” — the {phrase.cls} group.
          </p>
        </div>
        <button className="primary wide" onClick={startDrill}>
          {stage === 1 ? 'Got it — name it' : `Got it — name all ${stage}`}
        </button>
      </div>
    )
  }

  return (
    <div>
      {header}
      <p className="muted fc-hint">
        {retry
          ? 'Missed ones only. Get these right and the next one unlocks.'
          : `Which of your ${stage} is this?`}
      </p>
      <div className="card flashcard" style={{ borderTop: `3px solid ${CLASS_COLOR[card.class]}` }}>
        <AminoAcidFull aa={card} hideName={!result} notation={notation} />
      </div>

      {!result && (
        <div>
          {options.map((o) => (
            <button key={o.name} className="choice-btn" onClick={() => grade(o.name === card.name)}>
              {o.name} <span className="muted">({o.three})</span>
            </button>
          ))}
        </div>
      )}

      {result && (
        <>
          <p className={`feedback ${result === 'right' ? 'good' : 'bad'}`}>
            {result === 'right' ? 'Correct' : `That was ${card.name} (${card.three}, ${card.one}) — it comes back this round`}
          </p>
          <button className="primary wide" onClick={next}>
            {qi + 1 < queue.length ? 'Next →' : missed.length ? 'Retry the missed ones →' : stage >= ORDER.length ? 'Finish →' : 'Add the next one →'}
          </button>
        </>
      )}
    </div>
  )
}
