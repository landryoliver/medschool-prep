import TABLE from '../../data/genchem/periodicTable.json'

/**
 * A cut of the periodic table, inline.
 *
 * Some questions need a fact nobody is expected to hold in their head —
 * that sulfur is group 16, that bromine is element 35 — and sending the
 * reader to open the full table breaks the question in half. Every exam
 * supplies a periodic table; this supplies the two or three cells of it
 * that the question in front of you actually needs.
 *
 * Deliberately not the whole table: showing everything is the same as
 * showing nothing, and the point is to answer one question without leaving.
 */
export default function ElementStrip({ symbols = [], showConfigHint = false }) {
  const cells = symbols.map((s) => TABLE.find((e) => e.symbol === s)).filter(Boolean)
  if (!cells.length) return null

  return (
    <div className="el-strip" role="group" aria-label="Periodic table reference">
      {cells.map((e) => (
        <div key={e.symbol} className="el-cell">
          <span className="el-z">{e.atomicNumber}</span>
          <span className="el-sym">{e.symbol}</span>
          <span className="el-name">{e.name}</span>
          <span className="muted el-meta">
            group {e.group} · {e.valenceElectrons} valence e⁻
          </span>
          {showConfigHint && (
            <span className="muted el-meta">
              {e.typicalBonds} bond{e.typicalBonds === 1 ? '' : 's'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
