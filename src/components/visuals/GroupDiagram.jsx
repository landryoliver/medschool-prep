/**
 * The actual structure of a functional group, drawn.
 *
 * The lessons kept using words like "carboxyl" and "amino" as if the
 * reader could picture them. For someone years out of chemistry those are
 * just labels, and every later idea — why an alcohol donates a hydrogen
 * bond, why an amide nitrogen is not basic — depends on being able to see
 * the arrangement.
 *
 * `R` marks the rest of the molecule; the group itself is drawn in the
 * accent colour so the eye lands on what is being named.
 */
const A = '#38bdf8' // the group itself
const N = '#e6edf7' // neutral skeleton
const M = '#93a3bb' // muted

export default function GroupDiagram({ kind, width = 150, height = 92 }) {
  const draw = SHAPES[kind]
  if (!draw) return null
  return (
    <svg
      viewBox="0 0 150 92"
      width="100%"
      style={{ maxWidth: width, maxHeight: height, display: 'block' }}
      role="img"
      aria-label={LABELS[kind]}
    >
      {draw()}
    </svg>
  )
}

const bond = (x1, y1, x2, y2, c = N) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2" />
const dbl = (x1, y1, x2, y2, c = N) => (
  <>
    <line x1={x1 - 3} y1={y1} x2={x2 - 3} y2={y2} stroke={c} strokeWidth="2" />
    <line x1={x1 + 3} y1={y1} x2={x2 + 3} y2={y2} stroke={c} strokeWidth="2" />
  </>
)
const atom = (x, y, t, c = N, size = 15) => (
  <text x={x} y={y} fill={c} fontSize={size} textAnchor="middle" dominantBaseline="middle" fontWeight="600">
    {t}
  </text>
)

const LABELS = {
  hydroxyl: 'Hydroxyl group: an oxygen bonded to a hydrogen and to the rest of the molecule',
  carbonyl: 'Carbonyl group: a carbon double bonded to an oxygen',
  carboxyl: 'Carboxyl group: a carbon double bonded to one oxygen and single bonded to a hydroxyl',
  amino: 'Amino group: a nitrogen bonded to two hydrogens',
  thiol: 'Thiol group: a sulfur bonded to a hydrogen',
  amide: 'Amide group: a carbonyl carbon bonded to a nitrogen',
  ester: 'Ester group: a carbonyl carbon bonded to an oxygen that connects to another carbon',
  ether: 'Ether group: an oxygen bridging two carbons',
  phosphate: 'Phosphate group: phosphorus double bonded to one oxygen and single bonded to three more',
  aromatic: 'Benzene ring: six carbons in a ring with alternating double bonds',
}

const SHAPES = {
  // R—O—H
  hydroxyl: () => (
    <>
      {atom(22, 46, 'R', M)}
      {bond(34, 46, 62, 46)}
      {atom(74, 46, 'O', A)}
      {bond(86, 46, 110, 46, A)}
      {atom(122, 46, 'H', A)}
    </>
  ),
  // R—C(=O)—R
  carbonyl: () => (
    <>
      {atom(18, 58, 'R', M)}
      {bond(30, 58, 58, 58)}
      {atom(70, 58, 'C', A)}
      {dbl(70, 46, 70, 22, A)}
      {atom(70, 14, 'O', A)}
      {bond(82, 58, 110, 58)}
      {atom(122, 58, 'R', M)}
    </>
  ),
  // R—C(=O)—O—H
  carboxyl: () => (
    <>
      {atom(14, 58, 'R', M)}
      {bond(26, 58, 50, 58)}
      {atom(62, 58, 'C', A)}
      {dbl(62, 46, 62, 22, A)}
      {atom(62, 14, 'O', A)}
      {bond(74, 58, 96, 58, A)}
      {atom(108, 58, 'O', A)}
      {bond(120, 58, 136, 58, A)}
      {atom(144, 58, 'H', A)}
    </>
  ),
  // R—N(H)(H)
  amino: () => (
    <>
      {atom(30, 46, 'R', M)}
      {bond(42, 46, 66, 46)}
      {atom(78, 46, 'N', A)}
      {bond(86, 38, 106, 22, A)}
      {atom(114, 16, 'H', A)}
      {bond(86, 54, 106, 70, A)}
      {atom(114, 76, 'H', A)}
    </>
  ),
  // R—S—H
  thiol: () => (
    <>
      {atom(22, 46, 'R', M)}
      {bond(34, 46, 62, 46)}
      {atom(74, 46, 'S', A)}
      {bond(86, 46, 110, 46, A)}
      {atom(122, 46, 'H', A)}
    </>
  ),
  // R—C(=O)—N(H)(H)
  amide: () => (
    <>
      {atom(12, 58, 'R', M)}
      {bond(24, 58, 46, 58)}
      {atom(58, 58, 'C', A)}
      {dbl(58, 46, 58, 22, A)}
      {atom(58, 14, 'O', A)}
      {bond(70, 58, 92, 58, A)}
      {atom(104, 58, 'N', A)}
      {bond(112, 50, 128, 36, A)}
      {atom(136, 30, 'H', A)}
      {bond(112, 66, 128, 78, A)}
      {atom(136, 84, 'H', A)}
    </>
  ),
  // R—C(=O)—O—R
  ester: () => (
    <>
      {atom(12, 58, 'R', M)}
      {bond(24, 58, 46, 58)}
      {atom(58, 58, 'C', A)}
      {dbl(58, 46, 58, 22, A)}
      {atom(58, 14, 'O', A)}
      {bond(70, 58, 92, 58, A)}
      {atom(104, 58, 'O', A)}
      {bond(116, 58, 132, 58)}
      {atom(142, 58, 'R', M)}
    </>
  ),
  // R—O—R
  ether: () => (
    <>
      {atom(26, 46, 'R', M)}
      {bond(38, 46, 62, 46)}
      {atom(74, 46, 'O', A)}
      {bond(86, 46, 110, 46)}
      {atom(122, 46, 'R', M)}
    </>
  ),
  // R—O—P(=O)(O)(O)
  phosphate: () => (
    <>
      {atom(14, 58, 'R', M)}
      {bond(26, 58, 46, 58)}
      {atom(58, 58, 'O', A)}
      {bond(70, 58, 88, 58, A)}
      {atom(100, 58, 'P', A)}
      {dbl(100, 46, 100, 22, A)}
      {atom(100, 14, 'O', A)}
      {bond(112, 58, 130, 58, A)}
      {atom(140, 58, 'O', A)}
      {bond(100, 70, 100, 82, A)}
      {atom(100, 88, 'O', A, 12)}
    </>
  ),
  // benzene
  aromatic: () => {
    const cx = 75
    const cy = 46
    const r = 28
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 6) + (i * Math.PI) / 3
      return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
    })
    return (
      <>
        {pts.map((p, i) => {
          const q = pts[(i + 1) % 6]
          return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={A} strokeWidth="2" />
        })}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={A} strokeWidth="1.6" strokeDasharray="3 3" />
      </>
    )
  },
}
