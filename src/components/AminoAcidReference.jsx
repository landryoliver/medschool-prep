import { useState } from 'react'
import aminoAcids from '../data/genchem/aminoAcids.json'
import AminoAcidDiagram from './visuals/AminoAcidDiagram.jsx'

/**
 * Browse the twenty, or drill them as flashcards.
 *
 * Until now the only way to meet an amino acid was one at a time through
 * randomized questions, which can test the set but cannot teach it. Seeing
 * them laid out by class is what makes "only five carry charge" land as a
 * fact about the table rather than a sentence in a lesson.
 */
const CLASS_ORDER = ['acidic', 'basic', 'polar', 'nonpolar']
const CLASS_LABEL = {
  acidic: 'Acidic — negative at pH 7.4',
  basic: 'Basic — positive at pH 7.4',
  polar: 'Polar, uncharged',
  nonpolar: 'Nonpolar / hydrophobic',
}
const CLASS_HINT = {
  acidic: 'Only two. Both end in a carboxyl, which loses its proton at physiological pH.',
  basic: 'Only three. Histidine is the borderline one, and the reason it does enzyme catalysis.',
  polar: 'An –OH, an –SH, or an amide. Neutral, but they hydrogen bond.',
  nonpolar: 'Hydrocarbon or a bare aromatic ring. These bury themselves in a protein core.',
}
const CLASS_COLOR = {
  acidic: '#f87171',
  basic: '#38bdf8',
  polar: '#4ade80',
  nonpolar: '#facc15',
}

function Card({ aa, revealed, onToggle, quizMode }) {
  const hidden = quizMode && !revealed
  return (
    <div className="aa-card" style={{ borderLeft: `3px solid ${CLASS_COLOR[aa.class]}` }}>
      <AminoAcidDiagram sideChain={aa.sideChain} name={hidden ? '?' : aa.name} cyclic={aa.name === 'Proline'} />

      {hidden ? (
        <button className="ghost wide aa-reveal" onClick={onToggle}>
          Which one is this?
        </button>
      ) : (
        <>
          <div className="aa-head">
            <strong>{aa.name}</strong>
            <span className="muted">
              {aa.three} · {aa.one}
            </span>
          </div>
          <div className="aa-facts">
            <span style={{ color: CLASS_COLOR[aa.class] }}>{aa.class}</span>
            <span className="muted">
              {aa.pKaR != null ? `side-chain pKa ${aa.pKaR}` : 'no ionizable side chain'}
            </span>
            <span className="muted">
              charge at 7.4: {aa.charge7 > 0 ? '+1' : aa.charge7 < 0 ? '−1' : '0'}
            </span>
          </div>
          <p className="muted aa-note">{aa.note}</p>
          {quizMode && (
            <button className="ghost wide aa-reveal" onClick={onToggle}>
              Hide again
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function AminoAcidReference() {
  const [quizMode, setQuizMode] = useState(false)
  const [revealed, setRevealed] = useState({})

  const toggle = (name) => setRevealed((r) => ({ ...r, [name]: !r[name] }))

  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">All twenty, grouped by side chain</h3>
        <p className="muted backup-note">
          Nineteen of the twenty differ only in the highlighted group below the central carbon. Learn the five that
          carry charge and the rest follow by elimination.
        </p>
        <div className="seg wide-seg" style={{ marginBottom: 0 }}>
          <button className={!quizMode ? 'active' : ''} onClick={() => setQuizMode(false)}>
            Browse
          </button>
          <button
            className={quizMode ? 'active' : ''}
            onClick={() => {
              setQuizMode(true)
              setRevealed({})
            }}
          >
            Flashcards
          </button>
        </div>
      </div>

      {CLASS_ORDER.map((cls) => {
        const members = aminoAcids.filter((a) => a.class === cls)
        return (
          <section key={cls} className="stage-block">
            <div className="stage-head">
              <h2 className="stage-title" style={{ color: CLASS_COLOR[cls] }}>
                {CLASS_LABEL[cls]}
              </h2>
              <span className="muted stage-count">{members.length}</span>
            </div>
            <p className="muted aa-class-hint">{CLASS_HINT[cls]}</p>
            <div className="aa-grid">
              {members.map((aa) => (
                <Card
                  key={aa.name}
                  aa={aa}
                  quizMode={quizMode}
                  revealed={revealed[aa.name]}
                  onToggle={() => toggle(aa.name)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
