import { bondPairs, substituentsAt, bondOrder } from '../../lib/chem/molecule.js'

const BOND = 46
const SUB_BOND = 26

/**
 * Chain layout is a zigzag, except around a triple bond: an sp carbon is
 * linear, so the triple bond and both bonds flanking it are drawn
 * collinear. Drawing an alkyne on the zigzag would show the wrong
 * geometry, which matters because the app quizzes on exactly that.
 */
function chainAngles(mol) {
  const bondCount = mol.size - 1
  const isTriple = (i) => i >= 0 && i < bondCount && bondOrder(mol, i) === 3
  const angles = []
  let up = true
  for (let i = 0; i < bondCount; i++) {
    if (isTriple(i) || isTriple(i - 1) || isTriple(i + 1)) {
      angles.push(0)
    } else {
      angles.push(up ? 30 : -30)
      up = !up
    }
  }
  return angles
}

function layout(mol) {
  const pts = []
  if (mol.shape === 'ring') {
    const r = BOND / 2 / Math.sin(Math.PI / mol.size)
    for (let i = 0; i < mol.size; i++) {
      const angle = Math.PI / 2 + (i * 2 * Math.PI) / mol.size
      pts.push({ x: r * Math.cos(angle), y: -r * Math.sin(angle) })
    }
    return pts
  }

  const angles = chainAngles(mol)
  let x = 0
  let y = 0
  pts.push({ x, y })
  for (let i = 0; i < mol.size - 1; i++) {
    const rad = (angles[i] * Math.PI) / 180
    x += BOND * Math.cos(rad)
    y -= BOND * Math.sin(rad)
    pts.push({ x, y })
  }
  return pts
}

/** Direction pointing away from a vertex's neighbors — where substituents go. */
function outwardDir(pts, mol, i) {
  const neighbors = bondPairs(mol)
    .filter(([a, b]) => a === i || b === i)
    .map(([a, b]) => (a === i ? b : a))
  let dx = 0
  let dy = 0
  for (const n of neighbors) {
    const len = Math.hypot(pts[n].x - pts[i].x, pts[n].y - pts[i].y) || 1
    dx += (pts[n].x - pts[i].x) / len
    dy += (pts[n].y - pts[i].y) / len
  }
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return { x: 0, y: -1 }
  return { x: -dx / len, y: -dy / len }
}

function perpendicular(a, b, amount) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: (-dy / len) * amount, y: (dx / len) * amount }
}

export default function SkeletalDiagram({
  molecule,
  highlightVertex = null,
  showVertexNumbers = false,
  numberFromRight = false,
  height = 150,
}) {
  const pts = layout(molecule)
  const pairs = bondPairs(molecule)

  const labels = []
  for (let i = 0; i < molecule.size; i++) {
    const subs = substituentsAt(molecule, i)
    if (!subs.length) continue
    const dir = outwardDir(pts, molecule, i)
    subs.forEach((sub, k) => {
      // Two labels on one carbon (gem-dimethyl and the like) need to clear
      // each other: a wide fan alone still overlaps at this font size, so
      // alternating bond lengths separates them radially too.
      const spread = (k - (subs.length - 1) / 2) * 1.25
      const cos = Math.cos(spread)
      const sin = Math.sin(spread)
      const rx = dir.x * cos - dir.y * sin
      const ry = dir.x * sin + dir.y * cos
      const reach = SUB_BOND * (subs.length > 1 && k % 2 === 1 ? 1.5 : 1)
      labels.push({
        from: pts[i],
        to: { x: pts[i].x + rx * reach, y: pts[i].y + ry * reach },
        text: sub.label,
        order: sub.bond ?? 1,
      })
    })
  }

  const xs = [...pts.map((p) => p.x), ...labels.map((l) => l.to.x)]
  const ys = [...pts.map((p) => p.y), ...labels.map((l) => l.to.y)]
  const pad = 26
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width = Math.max(...xs) - minX + pad
  const vbHeight = Math.max(...ys) - minY + pad

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${vbHeight}`}
      style={{ width: '100%', maxHeight: height, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="skeletal structure"
    >
      {pairs.map(([a, b], i) => {
        const p1 = pts[a]
        const p2 = pts[b]
        const order = bondOrder(molecule, i)
        const off = perpendicular(p1, p2, 3.5)
        const offsets = order === 1 ? [0] : order === 2 ? [-1, 1] : [-1, 0, 1]
        return (
          <g key={i}>
            {offsets.map((m, k) => (
              <line
                key={k}
                x1={p1.x + off.x * m}
                y1={p1.y + off.y * m}
                x2={p2.x + off.x * m}
                y2={p2.y + off.y * m}
                stroke="#e2e8f0"
                strokeWidth="2"
              />
            ))}
          </g>
        )
      })}

      {labels.map((l, i) => {
        const off = perpendicular(l.from, l.to, 3)
        const offsets = l.order === 1 ? [0] : l.order === 2 ? [-1, 1] : [-1, 0, 1]
        // Stop the bond short of the label text so the line doesn't run through it.
        const dx = l.to.x - l.from.x
        const dy = l.to.y - l.from.y
        const len = Math.hypot(dx, dy) || 1
        const end = { x: l.to.x - (dx / len) * 9, y: l.to.y - (dy / len) * 9 }
        return (
          <g key={`sub-${i}`}>
            {offsets.map((m, k) => (
              <line
                key={k}
                x1={l.from.x + off.x * m}
                y1={l.from.y + off.y * m}
                x2={end.x + off.x * m}
                y2={end.y + off.y * m}
                stroke="#e2e8f0"
                strokeWidth="2"
              />
            ))}
            <text x={l.to.x} y={l.to.y} fill="#38bdf8" fontSize="14" textAnchor="middle" dominantBaseline="middle">
              {l.text}
            </text>
          </g>
        )
      })}

      {highlightVertex != null && (
        <circle cx={pts[highlightVertex].x} cy={pts[highlightVertex].y} r="11" fill="none" stroke="#facc15" strokeWidth="2.5" />
      )}

      {showVertexNumbers &&
        pts.map((p, i) => {
          const dir = outwardDir(pts, molecule, i)
          // At a chain end, "inward" points straight down the only bond, so
          // the number would sit on the line. Push those outward instead.
          const terminal = molecule.shape === 'chain' && (i === 0 || i === molecule.size - 1)
          const hasSub = substituentsAt(molecule, i).length > 0
          const sign = terminal && !hasSub ? 1 : -1
          return (
            <text
              key={`n-${i}`}
              x={p.x + sign * dir.x * 15}
              y={p.y + sign * dir.y * 15}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {numberFromRight ? molecule.size - i : i + 1}
            </text>
          )
        })}
    </svg>
  )
}
