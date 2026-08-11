const BOND_LEN = 44
const PAD = 30

function chainVertices(size) {
  const pts = []
  for (let i = 0; i < size; i++) {
    pts.push({ x: PAD + i * BOND_LEN * 0.87, y: PAD + (i % 2 === 0 ? 0 : -BOND_LEN * 0.5) + BOND_LEN * 0.5 })
  }
  return pts
}

function ringVertices(size) {
  const r = BOND_LEN * 0.75
  const cx = PAD + r
  const cy = PAD + r
  const pts = []
  for (let i = 0; i < size; i++) {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI) / size
    pts.push({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) })
  }
  return pts
}

function doubleBondOffset(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { ox: (-dy / len) * 4, oy: (dx / len) * 4 }
}

export default function SkeletalDiagram({ shape, size, doubleBondAt = [], substituent }) {
  const vertices = shape === 'ring' ? ringVertices(size) : chainVertices(size)
  const bondCount = shape === 'ring' ? size : size - 1
  const bonds = []
  for (let i = 0; i < bondCount; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % size]
    bonds.push({ a, b, double: doubleBondAt.includes(i) })
  }

  const width = Math.max(...vertices.map((v) => v.x)) + PAD
  const height = Math.max(...vertices.map((v) => v.y)) + PAD

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
      {bonds.map((bond, i) => {
        if (!bond.double) {
          return <line key={i} x1={bond.a.x} y1={bond.a.y} x2={bond.b.x} y2={bond.b.y} stroke="#e2e8f0" strokeWidth="2" />
        }
        const { ox, oy } = doubleBondOffset(bond.a, bond.b)
        return (
          <g key={i}>
            <line x1={bond.a.x + ox} y1={bond.a.y + oy} x2={bond.b.x + ox} y2={bond.b.y + oy} stroke="#e2e8f0" strokeWidth="2" />
            <line x1={bond.a.x - ox} y1={bond.a.y - oy} x2={bond.b.x - ox} y2={bond.b.y - oy} stroke="#e2e8f0" strokeWidth="2" />
          </g>
        )
      })}
      {substituent && (
        <text
          x={vertices[substituent.vertexIndex].x}
          y={vertices[substituent.vertexIndex].y - 10}
          fill="#38bdf8"
          fontSize="14"
          textAnchor="middle"
        >
          {substituent.label}
        </text>
      )}
    </svg>
  )
}
