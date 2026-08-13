import { useState } from 'react'
import compounds from '../data/genchem/compounds.json'

/**
 * Real boiling points, sorted.
 *
 * The intermolecular-force questions are generated from this table but it
 * was never shown, so the reasoning stayed abstract. Sorted by boiling
 * point with the dominant force marked, the pattern the questions test
 * becomes visible: at similar size, hydrogen bonders sit far above
 * everything else, and among hydrocarbons the boiling point simply tracks
 * carbon count.
 */
const FORCE_LABEL = {
  hbond: 'hydrogen bonding',
  'hydrogen bonding': 'hydrogen bonding',
  dipole: 'dipole-dipole',
  'dipole-dipole': 'dipole-dipole',
  dispersion: 'dispersion only',
}
const FORCE_COLOR = {
  'hydrogen bonding': '#4ade80',
  'dipole-dipole': '#38bdf8',
  'dispersion only': '#93a3bb',
}

const normalize = (f) => FORCE_LABEL[f] ?? f

export default function CompoundTable() {
  const [sortBy, setSortBy] = useState('bp')

  const rows = [...compounds].sort((a, b) =>
    sortBy === 'bp' ? b.bp - a.bp : a.carbons - b.carbons || b.bp - a.bp,
  )

  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">Boiling points, and what sets them</h3>
        <p className="muted backup-note">
          Compare size first, then the strongest force available. Sorted by carbon count you can see hydrogen bonders
          sitting far above hydrocarbons of the same size — that gap IS the force.
        </p>
        <div className="seg wide-seg" style={{ marginBottom: 0 }}>
          <button className={sortBy === 'bp' ? 'active' : ''} onClick={() => setSortBy('bp')}>
            By boiling point
          </button>
          <button className={sortBy === 'size' ? 'active' : ''} onClick={() => setSortBy('size')}>
            By size
          </button>
        </div>
      </div>

      <div className="card">
        <div className="cmp-head muted">
          <span>compound</span>
          <span>C</span>
          <span>bp °C</span>
        </div>
        {rows.map((c) => {
          const force = normalize(c.force)
          return (
            <div className="cmp-row" key={c.name}>
              <div className="cmp-name">
                <strong>{c.name}</strong>
                <span className="muted cmp-formula">{c.formula}</span>
                <span className="cmp-force" style={{ color: FORCE_COLOR[force] ?? '#93a3bb' }}>
                  {force}
                </span>
              </div>
              <span className="cmp-num muted">{c.carbons}</span>
              <span className="cmp-num">{c.bp}</span>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3 className="ref-heading">What the table shows</h3>
        <ul className="ref-list">
          <li>
            Among hydrocarbons, boiling point rises steadily with carbon count — that is dispersion scaling with size
            and surface contact, with nothing else in play.
          </li>
          <li>
            At the same carbon count, an alcohol boils far above the matching hydrocarbon. Butane 0 °C, butan-1-ol
            118 °C. Nothing differs but the ability to donate a hydrogen bond.
          </li>
          <li>
            An ether sits between the two: polar enough for dipole-dipole and able to ACCEPT a hydrogen bond, but with
            no O–H it cannot donate one.
          </li>
          <li>Branching lowers the boiling point at identical formula, because a compact shape touches less.</li>
        </ul>
      </div>
    </div>
  )
}
