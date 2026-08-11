/**
 * Declarative scene for curved-arrow (electron-pushing) recognition drills.
 *
 *  { atoms: [{ x, y, label, charge, lonePairs }],
 *    bonds: [{ from, to, order }],
 *    arrows: [{ fromX, fromY, toX, toY, bow }] }
 *
 * Coordinates are authored per-scene rather than auto-laid-out: arrow
 * placement is the whole point of these questions and needs to be exact.
 */
function polarDots(x, y, angleDeg, count) {
  const dots = []
  for (let k = 0; k < count; k++) {
    const a = ((angleDeg + (k - (count - 1) / 2) * 45) * Math.PI) / 180
    const cx = x + Math.cos(a) * 17
    const cy = y - Math.sin(a) * 17
    const ox = -Math.sin(a) * 4.5
    const oy = -Math.cos(a) * 4.5
    dots.push({ x: cx + ox, y: cy + oy }, { x: cx - ox, y: cy - oy })
  }
  return dots
}

export default function CurvedArrowDiagram({ scene, height = 190 }) {
  const { atoms = [], bonds = [], arrows = [] } = scene

  return (
    <svg
      viewBox={scene.viewBox ?? '0 0 240 150'}
      style={{ width: '100%', maxHeight: height, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="curved arrow mechanism step"
    >
      <defs>
        <marker id="ca-head" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#facc15" />
        </marker>
      </defs>

      {bonds.map((b, i) => {
        const a1 = atoms[b.from]
        const a2 = atoms[b.to]
        const dx = a2.x - a1.x
        const dy = a2.y - a1.y
        const len = Math.hypot(dx, dy) || 1
        const ix = (dx / len) * 14
        const iy = (dy / len) * 14
        const px = (-dy / len) * 3.5
        const py = (dx / len) * 3.5
        const offsets = (b.order ?? 1) === 1 ? [0] : (b.order === 2 ? [-1, 1] : [-1, 0, 1])
        return (
          <g key={i}>
            {offsets.map((m, k) => (
              <line
                key={k}
                x1={a1.x + ix + px * m}
                y1={a1.y + iy + py * m}
                x2={a2.x - ix + px * m}
                y2={a2.y - iy + py * m}
                stroke="#e2e8f0"
                strokeWidth="2"
              />
            ))}
          </g>
        )
      })}

      {atoms.map((atom, i) =>
        atom.lonePairs
          ? polarDots(atom.x, atom.y, atom.lonePairAngle ?? 90, atom.lonePairs).map((d, k) => (
              <circle key={`${i}-${k}`} cx={d.x} cy={d.y} r="2.4" fill="#38bdf8" />
            ))
          : null,
      )}

      {atoms.map((atom, i) => (
        <g key={`a-${i}`}>
          <text x={atom.x} y={atom.y} fill="#e2e8f0" fontSize="17" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
            {atom.label}
          </text>
          {atom.charge ? (
            <text x={atom.x + 13} y={atom.y - 12} fill="#facc15" fontSize="12" textAnchor="middle">
              {atom.charge > 0 ? '+' : '−'}
            </text>
          ) : null}
        </g>
      ))}

      {arrows.map((ar, i) => {
        const mx = (ar.fromX + ar.toX) / 2
        const my = (ar.fromY + ar.toY) / 2
        const dx = ar.toX - ar.fromX
        const dy = ar.toY - ar.fromY
        const len = Math.hypot(dx, dy) || 1
        const bow = ar.bow ?? 30
        const cx = mx + (-dy / len) * bow
        const cy = my + (dx / len) * bow
        return (
          <path
            key={i}
            d={`M ${ar.fromX} ${ar.fromY} Q ${cx} ${cy} ${ar.toX} ${ar.toY}`}
            stroke="#facc15"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#ca-head)"
          />
        )
      })}
    </svg>
  )
}
