import { useState } from 'react'
import elements from '../data/genchem/elementsFull.json'
import detail from '../data/genchem/periodicTable.json'

const [Z, SYM, NAME, GROUP, PERIOD, CAT, MASS] = [0, 1, 2, 3, 4, 5, 6]

// Detailed data exists only for the elements the drills use.
const detailBySymbol = new Map(detail.map((d) => [d.symbol, d]))

/**
 * A real periodic table, laid out the way an exam-issued one is: atomic
 * number, symbol, and atomic mass in an 18-column grid.
 *
 * Deliberately does NOT print electronegativity on the face of the table,
 * matching what you are actually handed on a test — the trends stay
 * something you reason about rather than read off. Tapping an element
 * opens the fuller detail for the ones the course cares about.
 */
export default function PeriodicTable() {
  const [selected, setSelected] = useState(null)

  const main = elements.filter((e) => e[GROUP] > 0)
  const fBlock = elements.filter((e) => e[GROUP] === 0)
  const lanth = fBlock.filter((e) => e[CAT] === 'lanthanide')
  const act = fBlock.filter((e) => e[CAT] === 'actinide')

  const cell = (e) => {
    const d = detailBySymbol.get(e[SYM])
    return (
      <button
        key={e[Z]}
        className={`pt-cell cat-${e[CAT]}${d?.orgoCore ? ' orgo' : ''}${selected?.[Z] === e[Z] ? ' selected' : ''}`}
        style={e[GROUP] > 0 ? { gridColumn: e[GROUP], gridRow: e[PERIOD] } : undefined}
        onClick={() => setSelected(e)}
      >
        <span className="pt-z">{e[Z]}</span>
        <span className="pt-sym">{e[SYM]}</span>
        <span className="pt-mass">{e[MASS]}</span>
      </button>
    )
  }

  const d = selected && detailBySymbol.get(selected[SYM])

  return (
    <div>
      <div className="pt-scroll">
        <div className="pt-grid">{main.map(cell)}</div>
        <div className="pt-fblock">
          <div className="pt-frow">{lanth.map(cell)}</div>
          <div className="pt-frow">{act.map(cell)}</div>
        </div>
      </div>

      <div className="pt-detail card">
        {selected ? (
          <>
            <div className="pt-detail-head">
              <span className="pt-detail-sym">{selected[SYM]}</span>
              <div>
                <strong>{selected[NAME]}</strong>
                <div className="muted">
                  Z = {selected[Z]} · mass {selected[MASS]} · group {selected[GROUP] || '—'} · period {selected[PERIOD]}
                </div>
              </div>
            </div>
            {d ? (
              <dl className="pt-facts">
                <div>
                  <dt>Valence e⁻</dt>
                  <dd>{d.valenceElectrons}</dd>
                </div>
                <div>
                  <dt>Typical bonds</dt>
                  <dd>{d.typicalBonds}</dd>
                </div>
                <div>
                  <dt>Electronegativity</dt>
                  <dd>{d.electronegativity ?? '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted pt-nodetail">
                Not one of the elements this course drills — organic chemistry lives almost entirely in the highlighted
                set.
              </p>
            )}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Tap any element for its details. Highlighted elements are the organic core.
          </p>
        )}
      </div>
    </div>
  )
}
