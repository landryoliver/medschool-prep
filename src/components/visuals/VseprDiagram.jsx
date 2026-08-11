const LEN = 52

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180
  return { x: Math.cos(a) * r, y: -Math.sin(a) * r }
}

function Wedge({ angle, filled }) {
  const tip = polar(angle, 13)
  const end = polar(angle, LEN - 12)
  const perp = polar(angle + 90, 6)
  const p1 = { x: end.x + perp.x, y: end.y + perp.y }
  const p2 = { x: end.x - perp.x, y: end.y - perp.y }

  if (filled) {
    return <polygon points={`${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill="#e2e8f0" />
  }
  // Hashed (going back): a ladder of rungs widening away from the center.
  const rungs = []
  for (let i = 1; i <= 5; i++) {
    const t = i / 5
    const mid = { x: tip.x + (end.x - tip.x) * t, y: tip.y + (end.y - tip.y) * t }
    const w = { x: perp.x * t, y: perp.y * t }
    rungs.push(
      <line key={i} x1={mid.x + w.x} y1={mid.y + w.y} x2={mid.x - w.x} y2={mid.y - w.y} stroke="#e2e8f0" strokeWidth="2" />,
    )
  }
  return <g>{rungs}</g>
}

/**
 * Draws a central atom with its bonding groups and lone pairs from a
 * GEOMETRIES entry's `draw` spec, so the picture always matches the
 * geometry the question is asking about.
 */
export default function VseprDiagram({ geometry, centerLabel = 'A', ligandLabel = 'X', height = 190 }) {
  const { bonds, lone } = geometry.draw

  return (
    <svg
      viewBox="-90 -90 180 180"
      style={{ width: '100%', maxHeight: height, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={`${geometry.shape} geometry`}
    >
      {bonds.map((b, i) => {
        if (b.style === 'wedge') return <Wedge key={i} angle={b.a} filled />
        if (b.style === 'dash') return <Wedge key={i} angle={b.a} filled={false} />
        const from = polar(b.a, 13)
        const to = polar(b.a, LEN - 12)
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#e2e8f0" strokeWidth="2" />
      })}

      {bonds.map((b, i) => {
        const p = polar(b.a, LEN)
        return (
          <text key={`l-${i}`} x={p.x} y={p.y} fill="#94a3b8" fontSize="15" textAnchor="middle" dominantBaseline="middle">
            {ligandLabel}
          </text>
        )
      })}

      {lone.map((angle, i) => {
        const base = polar(angle, 22)
        const off = polar(angle + 90, 5)
        return (
          <g key={`lp-${i}`}>
            <circle cx={base.x + off.x} cy={base.y + off.y} r="2.6" fill="#38bdf8" />
            <circle cx={base.x - off.x} cy={base.y - off.y} r="2.6" fill="#38bdf8" />
          </g>
        )
      })}

      <text x="0" y="0" fill="#e2e8f0" fontSize="18" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
        {centerLabel}
      </text>
    </svg>
  )
}
