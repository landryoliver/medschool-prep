const BOND_LEN = 52
const DOT_R = 2.2

function chargeLabel(charge) {
  if (!charge) return null
  const sign = charge > 0 ? '+' : '−'
  return Math.abs(charge) === 1 ? sign : `${Math.abs(charge)}${sign}`
}

/** Lone-pair dots drawn as a pair, broadside to the given direction. */
function lonePairDots(cx, cy, angleDeg, gap = 5, distance = 15) {
  const a = (angleDeg * Math.PI) / 180
  const px = Math.cos(a) * distance
  const py = -Math.sin(a) * distance
  const ox = -Math.sin(a) * gap
  const oy = -Math.cos(a) * gap
  return [
    { x: cx + px + ox, y: cy + py + oy },
    { x: cx + px - ox, y: cy + py - oy },
  ]
}

function Atom({ x, y, symbol, charge }) {
  return (
    <g>
      <text x={x} y={y} fill="#e2e8f0" fontSize="17" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
        {symbol}
      </text>
      {charge ? (
        <text x={x + 13} y={y - 11} fill="#facc15" fontSize="12" textAnchor="middle" dominantBaseline="middle">
          {chargeLabel(charge)}
        </text>
      ) : null}
    </g>
  )
}

/**
 * Renders an explicit Lewis structure: one central atom, radially placed
 * ligands with single/double/triple bonds, and lone pairs as dot pairs.
 *
 *  { center, centerCharge, centerLonePairs, ligands: [{ symbol, bond, lonePairs, charge }] }
 */
export default function LewisDiagram({ structure, height = 190 }) {
  const { center, centerCharge = 0, centerLonePairs = 0, ligands = [] } = structure
  const n = ligands.length
  // Two ligands sit low and splayed (like water) rather than straight
  // across, which leaves the top clear for the lone pairs. Placing them at
  // 0/180 would run the bond lines straight through the lone-pair dots.
  const angles =
    n === 2 ? [215, 325] : ligands.map((_, i) => 90 + (i * 360) / Math.max(n, 1))

  const positions = angles.map((deg) => {
    const a = (deg * Math.PI) / 180
    return { x: Math.cos(a) * BOND_LEN, y: -Math.sin(a) * BOND_LEN }
  })

  const dots = []
  for (let i = 0; i < centerLonePairs; i++) {
    // Fan the central lone pairs across the side left open by the bonds,
    // spread wide enough that up to four pairs stay individually countable.
    const spread = centerLonePairs > 1 ? 250 / centerLonePairs : 0
    const angle = n === 0 ? 90 + i * 90 : 90 + (i - (centerLonePairs - 1) / 2) * spread
    dots.push(...lonePairDots(0, 0, angle, 5, 18))
  }
  ligands.forEach((lig, i) => {
    const p = positions[i]
    for (let k = 0; k < (lig.lonePairs ?? 0); k++) {
      const base = angles[i]
      const spread = (k - ((lig.lonePairs ?? 1) - 1) / 2) * 55
      dots.push(...lonePairDots(p.x, p.y, base + spread, 5, 15))
    }
  })

  const pad = 46
  const xs = [0, ...positions.map((p) => p.x)]
  const ys = [0, ...positions.map((p) => p.y)]
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width = Math.max(...xs) - minX + pad
  const vbHeight = Math.max(...ys) - minY + pad

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${vbHeight}`}
      style={{ width: '100%', maxHeight: height, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="Lewis structure"
    >
      {ligands.map((lig, i) => {
        const p = positions[i]
        const a = (angles[i] * Math.PI) / 180
        // Stop the bond short of each atom label so lines don't run through text.
        const inset = 14
        const x1 = Math.cos(a) * inset
        const y1 = -Math.sin(a) * inset
        const x2 = p.x - Math.cos(a) * inset
        const y2 = p.y + Math.sin(a) * inset
        const ox = -Math.sin(a) * 3.5
        const oy = -Math.cos(a) * 3.5
        const count = lig.bond ?? 1
        const offsets = count === 1 ? [0] : count === 2 ? [-1, 1] : [-1, 0, 1]
        return (
          <g key={i}>
            {offsets.map((m, k) => (
              <line
                key={k}
                x1={x1 + ox * m}
                y1={y1 + oy * m}
                x2={x2 + ox * m}
                y2={y2 + oy * m}
                stroke="#e2e8f0"
                strokeWidth="2"
              />
            ))}
          </g>
        )
      })}

      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={DOT_R} fill="#38bdf8" />
      ))}

      <Atom x={0} y={0} symbol={center} charge={centerCharge} />
      {ligands.map((lig, i) => (
        <Atom key={i} x={positions[i].x} y={positions[i].y} symbol={lig.symbol} charge={lig.charge ?? 0} />
      ))}
    </svg>
  )
}
