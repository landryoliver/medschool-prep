import aminoAcids from '../data/genchem/aminoAcids.json'
import AminoAcidDiagram from './visuals/AminoAcidDiagram.jsx'

/**
 * The twenty laid out by class, to be read rather than answered.
 *
 * Seeing them sorted is what makes "only five carry charge" land as a fact
 * about the table rather than a sentence in a lesson. Drilling them lives
 * in the Cards deck, which flips and tests; this view never asks anything,
 * so it stays useful as something to look things up in.
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

function Card({ aa }) {
  return (
    <div className="aa-card" style={{ borderLeft: `3px solid ${CLASS_COLOR[aa.class]}` }}>
      <AminoAcidDiagram sideChain={aa.sideChain} name={aa.name} cyclic={aa.name === 'Proline'} />
      <div className="aa-head">
        <strong>{aa.name}</strong>
        <span className="muted">
          {aa.three} · {aa.one}
        </span>
      </div>
      <div className="aa-facts">
        <span style={{ color: CLASS_COLOR[aa.class] }}>{aa.class}</span>
        <span className="muted">{aa.pKaR != null ? `side-chain pKa ${aa.pKaR}` : 'no ionizable side chain'}</span>
        <span className="muted">charge at 7.4: {aa.charge7 > 0 ? '+1' : aa.charge7 < 0 ? '−1' : '0'}</span>
      </div>
      <p className="muted aa-note">{aa.note}</p>
    </div>
  )
}

export default function AminoAcidReference() {
  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">All twenty, grouped by side chain</h3>
        <p className="muted backup-note">
          Nineteen of the twenty differ only in the highlighted group below the central carbon. Learn the five that
          carry charge and the rest follow by elimination. To drill these, use <strong>Cards</strong> on the topic —
          flip them, then name them from the structure.
        </p>
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
                <Card key={aa.name} aa={aa} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
