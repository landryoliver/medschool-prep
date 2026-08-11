import periodicTable from '../data/genchem/periodicTable.json'

function ElementCard({ el }) {
  return (
    <div className="el-card">
      <div className="el-top">
        <span className="el-number">{el.atomicNumber}</span>
        <span className="el-symbol">{el.symbol}</span>
      </div>
      <div className="el-name">{el.name}</div>
      <dl className="el-facts">
        <div>
          <dt>Bonds</dt>
          <dd>{el.typicalBonds}</dd>
        </div>
        <div>
          <dt>Valence e⁻</dt>
          <dd>{el.valenceElectrons}</dd>
        </div>
        <div>
          <dt>EN</dt>
          <dd>{el.electronegativity ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * Learn-the-elements table. Splits the core organic set from the
 * supporting cast, since only the former needs to be known cold.
 */
export default function ElementReference() {
  const core = periodicTable.filter((e) => e.orgoCore)
  const others = periodicTable.filter((e) => !e.orgoCore)

  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">The core organic elements</h3>
        <p className="muted el-intro">
          These ten make up almost every molecule you will draw this term. The bond count is the number to know cold —
          it is what lets you fill in hidden hydrogens and spot a broken structure.
        </p>
        <div className="el-grid">
          {core.map((el) => (
            <ElementCard key={el.symbol} el={el} />
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="ref-heading">Supporting cast</h3>
        <p className="muted el-intro">
          Show up in reagents, counterions, and Lewis acids rather than in the carbon skeleton itself.
        </p>
        <div className="el-grid">
          {others.map((el) => (
            <ElementCard key={el.symbol} el={el} />
          ))}
        </div>
      </div>
    </div>
  )
}
