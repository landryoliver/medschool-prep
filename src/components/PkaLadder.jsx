import { useState } from 'react'
import pkaTable from '../data/genchem/pkaTable.json'

/**
 * The pKa ladder, drawn as a ladder.
 *
 * These values were only ever encountered one comparison at a time, which
 * can test whether you know acetic acid beats ethanol but cannot build the
 * mental scale that makes it obvious. Spacing is the whole point: each rung
 * is a factor of ten, so the eleven units between a carboxylic acid and an
 * alcohol is a hundred billion.
 *
 * Anchors are the handful worth knowing cold; everything else can be placed
 * relative to them.
 */
// Keys must match the `acid` field exactly. Spanning −7 to 50 gives enough
// spread that anything else can be placed between two of them.
export const ANCHORS = new Set([
  'HCl',
  'H₃O⁺',
  'RCOOH',
  'NH₄⁺',
  'PhOH',
  'H₂O',
  'CH₃CH₂OH',
  'terminal alkyne (RC≡CH)',
  'NH₃',
  'alkane (CH₃CH₃)',
])

const MIN = -12
const MAX = 52

function bandFor(pKa) {
  if (pKa < 0) return { label: 'strong acid', color: '#f87171' }
  if (pKa < 8) return { label: 'weak acid', color: '#fb923c' }
  if (pKa < 18) return { label: 'very weak acid', color: '#facc15' }
  return { label: 'barely acidic at all', color: '#4ade80' }
}

export default function PkaLadder() {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...pkaTable].sort((a, b) => a.pKa - b.pKa)
  const rows = showAll ? sorted : sorted.filter((e) => ANCHORS.has(e.acid))

  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">The pKa ladder</h3>
        <p className="muted backup-note">
          Lower is a stronger acid, and the scale is logarithmic — every rung is a factor of ten. Learn the anchors
          first and place everything else between them. The conjugate base of a strong acid is a weak base, which is
          the same ladder read backwards.
        </p>
        <div className="seg wide-seg" style={{ marginBottom: 0 }}>
          <button className={!showAll ? 'active' : ''} onClick={() => setShowAll(false)}>
            Anchors only
          </button>
          <button className={showAll ? 'active' : ''} onClick={() => setShowAll(true)}>
            All {sorted.length}
          </button>
        </div>
      </div>

      <div className="card">
        {rows.map((e) => {
          const band = bandFor(e.pKa)
          const pos = ((e.pKa - MIN) / (MAX - MIN)) * 100
          return (
            <div className="pka-row" key={e.acid}>
              <div className="pka-head">
                <span className="pka-acid">{e.acid}</span>
                <span className="pka-value" style={{ color: band.color }}>
                  {e.pKa}
                </span>
              </div>
              <div className="pka-track">
                <div className="pka-dot" style={{ left: `${Math.max(0, Math.min(100, pos))}%`, background: band.color }} />
              </div>
              <div className="pka-meta muted">
                {e.acidName} → {e.base} ({e.baseName})
              </div>
            </div>
          )
        })}
        <div className="pka-axis muted">
          <span>−10 stronger acid</span>
          <span>0</span>
          <span>20</span>
          <span>50 weaker</span>
        </div>
      </div>

      <div className="card">
        <h3 className="ref-heading">How to use it</h3>
        <ul className="ref-list">
          <li>A reaction favours the side with the WEAKER acid — the higher pKa. That one rule predicts direction.</li>
          <li>
            To deprotonate something, your base must be the conjugate of an acid with a HIGHER pKa. Hydroxide (water,
            15.7) takes a carboxylic acid proton (4.8) easily but cannot touch an alkane (50).
          </li>
          <li>Every unit is ten times. Acetic acid at 4.8 versus ethanol at 16 is eleven units — a factor of 10¹¹.</li>
          <li>The weaker the acid, the stronger its conjugate base. Amide (from ammonia, 38) is a ferocious base.</li>
        </ul>
      </div>
    </div>
  )
}
