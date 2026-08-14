import SHAPES from '../../data/genchem/sideChainShapes.json'

/**
 * The side chain drawn as an actual structure rather than a formula.
 *
 * "–CH₂CH₂COO⁻" tells you nothing you can recognise on an exam page or
 * reproduce on paper. Skeletal notation is what a biochemistry course
 * actually puts in front of you, so the cards have to use it: every
 * vertex and line end is a carbon, hydrogens on carbon are implied, and
 * only heteroatoms are written out.
 *
 * Everything is drawn from the attachment point downward, so a chain
 * zigzags at 30° from vertical the way it would be hand-drawn.
 */
const BOND = 21
const STROKE = '#38bdf8'
const TEXT = '#38bdf8'

// Zigzag: alternate right-down and left-down, 30° off vertical.
function chainPoints(n, startX, startY) {
  const pts = [{ x: startX, y: startY }]
  for (let i = 0; i < n; i++) {
    const dir = i % 2 === 0 ? 1 : -1
    const prev = pts[pts.length - 1]
    pts.push({ x: prev.x + dir * BOND * 0.5, y: prev.y + BOND * 0.87 })
  }
  return pts
}

const line = (a, b, key) => <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={STROKE} strokeWidth="2" />

const label = (x, y, t, key, anchor = 'middle', size = 13) => (
  <text key={key} x={x} y={y} fill={TEXT} fontSize={size} textAnchor={anchor} dominantBaseline="middle" fontWeight="600">
    {t}
  </text>
)

/** A ring drawn as a regular polygon hanging off the last chain vertex. */
function ring(centerX, centerY, sides, radius, aromatic, keyBase) {
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides
    return { x: centerX + radius * Math.cos(a), y: centerY + radius * Math.sin(a) }
  })
  const bonds = pts.map((p, i) => line(p, pts[(i + 1) % sides], `${keyBase}-${i}`))
  if (aromatic) {
    bonds.push(
      <circle key={`${keyBase}-arom`} cx={centerX} cy={centerY} r={radius * 0.55} fill="none" stroke={STROKE} strokeWidth="1.4" />,
    )
  }
  return { bonds, pts }
}

export default function SideChainStructure({ name, width = 128, height = 108 }) {
  const spec = SHAPES[name]
  if (!spec) return null

  const els = []
  const W = 128
  const H = 108
  const topX = W / 2
  const topY = 8

  if (spec.kind === 'atom') {
    els.push(label(topX, topY + 14, spec.label, 'atom'))
    return frame(els, W, H, width, height, name)
  }

  if (spec.kind === 'proline') {
    // The side chain closes back onto the backbone nitrogen, so it is drawn
    // as a ring rather than a hanging chain.
    const { bonds } = ring(topX, topY + 30, 5, 24, false, 'pro')
    els.push(...bonds)
    els.push(label(topX, topY + 62, 'joins backbone N', 'pro-note', 'middle', 8))
    return frame(els, W, H, width, height, name)
  }

  const pts = chainPoints(spec.carbons, topX, topY)
  for (let i = 0; i < pts.length - 1; i++) els.push(line(pts[i], pts[i + 1], `c${i}`))
  const last = pts[pts.length - 1]

  // Methyl branches: short bonds with nothing written, since a bare line
  // end IS a methyl in skeletal notation.
  for (const b of spec.branches ?? []) {
    const v = pts[b.at + 1] ?? last
    const dirs = b.count === 2 ? [-1, 1] : [1]
    dirs.forEach((d, k) => {
      els.push(line(v, { x: v.x + d * BOND * 0.8, y: v.y + BOND * 0.5 }, `b${b.at}-${k}`))
    })
  }

  // Labelled branches, e.g. threonine's hydroxyl.
  for (const b of spec.branchLabels ?? []) {
    const v = pts[b.at + 1] ?? last
    els.push(line(v, { x: v.x + BOND * 0.8, y: v.y + BOND * 0.4 }, `bl${b.at}`))
    els.push(label(v.x + BOND * 0.8 + 12, v.y + BOND * 0.4 + 2, b.label, `bll${b.at}`, 'start'))
  }

  if (spec.terminal) {
    els.push(label(last.x, last.y + 12, spec.terminal, 'term'))
  }

  if (spec.hetero) {
    els.push(label(last.x, last.y + 11, spec.hetero.label, 'het'))
    const after = { x: last.x + BOND * 0.5, y: last.y + BOND * 0.87 + 4 }
    els.push(line({ x: last.x, y: last.y + 20 }, after, 'het-b'))
  }

  if (spec.carboxylate || spec.amide) {
    // Carbonyl carbon one bond further, with a double bond to O and either
    // an O⁻ (carboxylate) or NH₂ (amide) beside it.
    const c = { x: last.x + BOND * 0.5, y: last.y + BOND * 0.87 }
    els.push(line(last, c, 'cx'))
    els.push(
      <line key="dbl1" x1={c.x - 2.5} y1={c.y} x2={c.x - 2.5 - 14} y2={c.y - 10} stroke={STROKE} strokeWidth="2" />,
      <line key="dbl2" x1={c.x + 1.5} y1={c.y - 2.5} x2={c.x - 12.5} y2={c.y - 12.5} stroke={STROKE} strokeWidth="2" />,
    )
    els.push(label(c.x - 22, c.y - 15, 'O', 'ox'))
    els.push(line(c, { x: c.x + BOND * 0.6, y: c.y + BOND * 0.5 }, 'cx2'))
    els.push(label(c.x + BOND * 0.6 + 12, c.y + BOND * 0.5 + 2, spec.carboxylate ? 'O⁻' : 'NH₂', 'tail', 'start'))
  }

  if (spec.guanidinium) {
    els.push(label(last.x, last.y + 11, 'N', 'g-n'))
    const c = { x: last.x + BOND * 0.55, y: last.y + BOND * 0.9 }
    els.push(line({ x: last.x, y: last.y + 20 }, c, 'g-b'))
    els.push(
      <line key="g-d1" x1={c.x - 2.5} y1={c.y} x2={c.x - 16} y2={c.y - 8} stroke={STROKE} strokeWidth="2" />,
      <line key="g-d2" x1={c.x + 1} y1={c.y - 3} x2={c.x - 13} y2={c.y - 11} stroke={STROKE} strokeWidth="2" />,
    )
    els.push(label(c.x - 26, c.y - 12, 'NH₂⁺', 'g-l', 'middle', 11))
    els.push(line(c, { x: c.x + BOND * 0.55, y: c.y + BOND * 0.45 }, 'g-b2'))
    els.push(label(c.x + BOND * 0.55 + 12, c.y + BOND * 0.45 + 2, 'NH₂', 'g-r', 'start', 11))
  }

  if (spec.ring) {
    const isFive = spec.ring === 'imidazole'
    const r = isFive ? 19 : 21
    const cx = last.x + BOND * 0.5
    const cy = last.y + BOND * 0.6 + r
    els.push(line(last, { x: cx, y: cy - r }, 'ring-b'))
    const { bonds, pts: rp } = ring(cx, cy, isFive ? 5 : 6, r, true, 'r')
    els.push(...bonds)
    if (spec.ring === 'imidazole') {
      // Two nitrogens, which is what makes the ring able to shuttle protons.
      els.push(label(rp[2].x - 7, rp[2].y + 3, 'N', 'n1', 'middle', 11))
      els.push(label(rp[4].x + 7, rp[4].y + 3, 'N', 'n2', 'middle', 11))
    }
    if (spec.ring === 'indole') {
      // The fused second ring, drawn sharing the right-hand edge.
      const { bonds: b2 } = ring(cx + r * 1.5, cy, 5, r * 0.8, false, 'r2')
      els.push(...b2)
      els.push(label(cx + r * 1.5, cy + r * 0.55, 'N', 'ind-n', 'middle', 10))
    }
    if (spec.ringSubstituent) {
      els.push(line(rp[3], { x: rp[3].x, y: rp[3].y + 12 }, 'sub-b'))
      els.push(label(rp[3].x, rp[3].y + 22, spec.ringSubstituent, 'sub'))
    }
  }

  return frame(els, W, H, width, height, name)
}

function frame(els, W, H, width, height, name) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Skeletal structure of the ${name} side chain`}
      style={{ overflow: 'visible' }}
    >
      {els}
    </svg>
  )
}
