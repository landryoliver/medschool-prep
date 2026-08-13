import { GEOMETRIES } from '../lib/chem/vsepr.js'
import VseprDiagram from './visuals/VseprDiagram.jsx'

/**
 * All thirteen geometries in one place.
 *
 * They were only ever met one at a time inside a question, which tests
 * recall but never shows the pattern the table is built on: shapes are
 * grouped by TOTAL electron groups, and within a group the shape changes
 * as bonds are swapped for lone pairs. Laid out that way, "electron
 * geometry versus molecular shape" stops being two definitions to memorize
 * and becomes visible in the rows.
 */
export default function VseprChart() {
  const byTotal = new Map()
  for (const g of GEOMETRIES) {
    const total = g.bonding + g.lone
    if (!byTotal.has(total)) byTotal.set(total, [])
    byTotal.get(total).push(g)
  }
  const totals = [...byTotal.keys()].sort((a, b) => a - b)

  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">Every shape, grouped by electron count</h3>
        <p className="muted backup-note">
          Count GROUPS, not bonds — a double or triple bond is one group, and every lone pair counts. The total sets
          the electron geometry and the hybridization. Swapping bonds for lone pairs inside a row changes only the
          molecular shape, because you cannot see a lone pair.
        </p>
      </div>

      {totals.map((total) => {
        const rows = byTotal.get(total)
        return (
          <section key={total} className="stage-block">
            <div className="stage-head">
              <h2 className="stage-title">
                {total} groups · {rows[0].electronGeometry} · {rows[0].hybridization}
              </h2>
              <span className="muted stage-count">{rows.length}</span>
            </div>

            <div className="vsepr-grid">
              {rows.map((g) => (
                <div className="card vsepr-cell" key={`${g.bonding},${g.lone}`}>
                  <VseprDiagram geometry={g} centerLabel="A" ligandLabel="X" />
                  <div className="vsepr-shape">{g.shape}</div>
                  <div className="muted vsepr-meta">
                    {g.bonding} bond{g.bonding === 1 ? '' : 's'} · {g.lone} lone pair{g.lone === 1 ? '' : 's'}
                  </div>
                  <div className="muted vsepr-meta">{g.angle}</div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <div className="card">
        <h3 className="ref-heading">Reading the chart</h3>
        <ul className="ref-list">
          <li>
            The first entry in each row has no lone pairs, so its molecular shape and electron geometry are the same
            name. Every entry below it is the same arrangement with atoms removed.
          </li>
          <li>
            Lone pairs take up more angular room than bonds, so each one squeezes the remaining angles a little below
            ideal — 109.5° for methane, ~107° for ammonia, ~104.5° for water.
          </li>
          <li>
            Hybridization comes straight from the total, with no lone-pair bookkeeping: 2 groups sp, 3 sp², 4 sp³.
          </li>
          <li>Only the first three rows appear in organic chemistry. The 5- and 6-group shapes are gen-chem territory.</li>
        </ul>
      </div>
    </div>
  )
}
