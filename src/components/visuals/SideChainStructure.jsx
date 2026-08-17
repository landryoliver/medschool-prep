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
 * Geometry is built as DATA (`buildSideChain`) and rendered separately, so
 * `scripts/validate.js` can check the drawing without a DOM — specifically
 * that no two bonds cross. The first version placed the C=O of asparagine
 * at a hand-picked angle that folded back over the bond arriving at the
 * carbonyl carbon; the lines crossed and the card read as a scribble. Every
 * substituent direction here is derived from the bonds already at that atom
 * (120° apart on a trigonal centre, zigzag continued on a chain) rather than
 * chosen by eye, and the crossing check is what proves it.
 */

const BOND = 22
const STROKE = '#38bdf8'
const TEXT = '#38bdf8'
const MUTED = '#7dd3fc'
const GAP = 2.5 // clear space left between a bond end and the letter it meets

/**
 * Half-extents of the box a label occupies. Height is cap-height, not the
 * full em: an over-tall box makes `trimFor` eat more than half of a 22-unit
 * ring bond wherever it meets an N, and the ring stops looking closed.
 */
export function labelBox(text, size) {
  return { halfW: (text.length * size * 0.58) / 2, halfH: size * 0.4 }
}

/**
 * How far a bond must stop short of a labelled atom: where the bond's own
 * direction exits that label's box, not a fixed distance. A fixed trim
 * clears "O" and leaves "NH₂⁺" with a line through it.
 */
function trimFor(box, d) {
  const tx = Math.abs(d.x) < 1e-6 ? Infinity : box.halfW / Math.abs(d.x)
  const ty = Math.abs(d.y) < 1e-6 ? Infinity : box.halfH / Math.abs(d.y)
  return Math.min(tx, ty) + GAP
}

const DOWN_RIGHT = { x: 0.5, y: 0.866 }
const DOWN_LEFT = { x: -0.5, y: 0.866 }

const unit = (x, y) => {
  const m = Math.hypot(x, y) || 1
  return { x: x / m, y: y / m }
}
const rot = (d, deg) => {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: d.x * c - d.y * s, y: d.x * s + d.y * c }
}
const dirTo = (a, b) => unit(b.x - a.x, b.y - a.y)
const step = (p, d, len = BOND) => ({ x: p.x + d.x * len, y: p.y + d.y * len })
const flip = (d) => ({ x: -d.x, y: d.y })
const dot = (a, b) => a.x * b.x + a.y * b.y

/**
 * Where the remaining bonds on an atom go, given the ones already there.
 * One existing bond → the other two sit 120° away (trigonal or the visible
 * part of a tetrahedral centre). Two existing bonds → the free one bisects
 * them and points away.
 */
function freeDirs(v, neighbours, count) {
  const ds = neighbours.map((n) => dirTo(v, n))
  if (ds.length === 1) {
    return count === 2 ? [rot(ds[0], 120), rot(ds[0], -120)] : [rot(ds[0], 120)]
  }
  const away = unit(-(ds[0].x + ds[1].x), -(ds[0].y + ds[1].y))
  return count === 2 ? [rot(away, 50), rot(away, -50)] : [away]
}

function polygon(cx, cy, sides, r, startAngle) {
  return Array.from({ length: sides }, (_, i) => ({
    x: cx + r * Math.cos(startAngle + (i * 2 * Math.PI) / sides),
    y: cy + r * Math.sin(startAngle + (i * 2 * Math.PI) / sides),
  }))
}

/**
 * A ring hanging off `from`, with vertex 0 at `attach` and the ring centre
 * further along the same bond, so the ring points away from the chain
 * instead of doubling back over it.
 */
function ringAt(attach, inDir, sides) {
  const r = BOND / (2 * Math.sin(Math.PI / sides))
  const centre = step(attach, inDir, r)
  const start = Math.atan2(attach.y - centre.y, attach.x - centre.x)
  // Traverse so vertex 1 is on the side the chain leans away from; either
  // direction is a valid depiction, this just keeps them all consistent.
  const pts = polygon(centre.x, centre.y, sides, r, start)
  return { pts, centre, r }
}

/** A second ring sharing the edge a–b of an existing one. */
function fusedRing(a, b, awayFrom, sides) {
  const s = Math.hypot(b.x - a.x, b.y - a.y)
  const r = s / (2 * Math.sin(Math.PI / sides))
  const apothem = s / (2 * Math.tan(Math.PI / sides))
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const along = dirTo(a, b)
  let n = { x: -along.y, y: along.x }
  if (dot(n, dirTo(awayFrom, mid)) < 0) n = { x: -n.x, y: -n.y }
  const centre = step(mid, n, apothem)
  const startA = Math.atan2(a.y - centre.y, a.x - centre.x)
  const stepA = (2 * Math.PI) / sides
  // Pick the traversal direction that reaches b second.
  const probe = { x: centre.x + r * Math.cos(startA + stepA), y: centre.y + r * Math.sin(startA + stepA) }
  const sign = Math.hypot(probe.x - b.x, probe.y - b.y) < s / 2 ? 1 : -1
  const pts = Array.from({ length: sides }, (_, i) => ({
    x: centre.x + r * Math.cos(startA + sign * i * stepA),
    y: centre.y + r * Math.sin(startA + sign * i * stepA),
  }))
  return { pts, centre, r }
}

/**
 * Builds the drawing as plain data: bonds and labels in one coordinate
 * space, plus the viewBox that fits them.
 */
export function buildSideChain(name) {
  const spec = SHAPES[name]
  if (!spec) return null

  const bonds = []
  const labels = []
  const circles = []

  const bond = (a, b, opts = {}) => bonds.push({ a, b, double: !!opts.double, inner: !!opts.inner })

  // Bond lengths are trimmed at labelled atoms so the line stops at the
  // letter instead of running through it.
  const labelled = new Map()
  const key = (p) => `${Math.round(p.x)},${Math.round(p.y)}`
  const label = (p, text, opts = {}) => {
    const size = opts.size ?? 13
    labels.push({ x: p.x, y: p.y, text, size, muted: !!opts.muted })
    labelled.set(key(p), { box: labelBox(text, size), text })
  }

  const alpha = { x: 0, y: 0 }
  label(alpha, 'Cα', { size: 11, muted: true })

  if (spec.kind === 'atom') {
    // Glycine: the whole side chain is one hydrogen.
    const h = step(alpha, DOWN_RIGHT)
    bond(alpha, h)
    label(h, spec.label)
    return finish(name, bonds, labels, circles, labelled, key)
  }

  if (spec.kind === 'proline') {
    // The side chain closes back onto the backbone nitrogen, so the alpha
    // carbon is IN the ring rather than hanging off it.
    const { pts } = ringAt(alpha, DOWN_RIGHT, 5)
    for (let i = 0; i < 5; i++) bond(pts[i], pts[(i + 1) % 5])
    // Labelling both Cα and N inside the ring is the whole point: proline is
    // the only residue whose side chain loops back onto the backbone
    // nitrogen, which is why it kinks a helix.
    label(pts[4], 'N')
    return finish(name, bonds, labels, circles, labelled, key)
  }

  // --- the zigzag backbone of the side chain ---------------------------
  const chain = [alpha]
  const dirs = []
  for (let i = 0; i < spec.carbons; i++) {
    const d = i % 2 === 0 ? DOWN_RIGHT : DOWN_LEFT
    dirs.push(d)
    chain.push(step(chain[chain.length - 1], d))
  }
  for (let i = 0; i < chain.length - 1; i++) bond(chain[i], chain[i + 1])

  let last = chain[chain.length - 1]
  let lastDir = dirs[dirs.length - 1] ?? DOWN_RIGHT
  const nextDir = () => flip(lastDir)

  // Methyl branches: a bare line end IS a methyl in skeletal notation, so
  // these get a bond and nothing written.
  for (const b of spec.branches ?? []) {
    const v = chain[b.at + 1]
    const nbrs = [chain[b.at], chain[b.at + 2]].filter(Boolean)
    for (const d of freeDirs(v, nbrs, b.count)) bond(v, step(v, d))
  }

  // Labelled branches, e.g. threonine's hydroxyl.
  for (const b of spec.branchLabels ?? []) {
    const v = chain[b.at + 1]
    const nbrs = [chain[b.at], chain[b.at + 2]].filter(Boolean)
    const d = freeDirs(v, nbrs, 1)[0]
    const p = step(v, d)
    bond(v, p)
    label(p, b.label)
  }

  // Methionine's sulfur sits in the chain, with more carbon after it.
  if (spec.hetero) {
    const d = nextDir()
    const s = step(last, d)
    bond(last, s)
    label(s, spec.hetero.label)
    last = s
    lastDir = d
    for (let i = 0; i < (spec.afterHetero ?? 0); i++) {
      const d2 = nextDir()
      const p = step(last, d2)
      bond(last, p)
      last = p
      lastDir = d2
    }
  }

  // A terminal heteroatom is the last vertex, not a caption below it.
  if (spec.terminal) {
    const d = nextDir()
    const p = step(last, d)
    bond(last, p)
    label(p, spec.terminal)
  }

  if (spec.carboxylate || spec.amide) {
    // Trigonal carbonyl carbon: the tail continues the zigzag and the
    // double-bonded oxygen takes the remaining 120° direction, which always
    // points away from the bond that arrived here.
    const inDir = nextDir()
    const c = step(last, inDir)
    bond(last, c)

    const tailDir = flip(inDir)
    const [d1, d2] = freeDirs(c, [last], 2)
    const tail = dot(d1, tailDir) > dot(d2, tailDir) ? d1 : d2
    const oDir = tail === d1 ? d2 : d1

    const o = step(c, oDir)
    bond(c, o, { double: true })
    label(o, 'O')

    const t = step(c, tail)
    bond(c, t)
    label(t, spec.carboxylate ? 'O⁻' : 'NH₂')
  }

  if (spec.guanidinium) {
    // –NH–C(=NH₂⁺)–NH₂ : the charge is delocalised over all three nitrogens,
    // which is why arginine stays protonated at every biological pH.
    const dN = nextDir()
    const n1 = step(last, dN)
    bond(last, n1)
    label(n1, 'NH')

    const dC = flip(dN)
    const c = step(n1, dC)
    bond(n1, c)

    const tailDir = flip(dC)
    const [d1, d2] = freeDirs(c, [n1], 2)
    const tail = dot(d1, tailDir) > dot(d2, tailDir) ? d1 : d2
    const oDir = tail === d1 ? d2 : d1

    const nPlus = step(c, oDir)
    bond(c, nPlus, { double: true })
    label(nPlus, 'NH₂⁺', { size: 12 })

    const n3 = step(c, tail)
    bond(c, n3)
    label(n3, 'NH₂', { size: 12 })
  }

  if (spec.ring) {
    const inDir = nextDir()
    const attach = step(last, inDir)
    bond(last, attach)

    if (spec.ring === 'benzene') {
      const { pts, centre, r } = ringAt(attach, inDir, 6)
      for (let i = 0; i < 6; i++) bond(pts[i], pts[(i + 1) % 6])
      circles.push({ x: centre.x, y: centre.y, r: r * 0.55 })
      if (spec.ringSubstituent) {
        // Para position: straight across the ring from the attachment.
        const p = step(pts[3], dirTo(centre, pts[3]))
        bond(pts[3], p)
        label(p, spec.ringSubstituent)
      }
    }

    if (spec.ring === 'imidazole') {
      // Ring order from the attachment carbon: C4, N3, C2, N1, C5. C2 sits
      // between the two nitrogens — that pair is what lets histidine pick up
      // and drop a proton right around physiological pH.
      const { pts } = ringAt(attach, inDir, 5)
      for (let i = 0; i < 5; i++) bond(pts[i], pts[(i + 1) % 5])
      bond(pts[1], pts[2], { inner: true, double: true }) // C2=N3
      bond(pts[4], pts[0], { inner: true, double: true }) // C4=C5
      label(pts[1], 'N')
      label(pts[3], 'N')
    }

    if (spec.ring === 'indole') {
      // Pyrrole from the attachment: C3, C2, N1, C7a, C3a — benzene fused
      // across the C7a–C3a edge, sharing those two atoms exactly.
      const { pts, centre } = ringAt(attach, inDir, 5)
      for (let i = 0; i < 5; i++) bond(pts[i], pts[(i + 1) % 5])
      bond(pts[0], pts[1], { inner: true, double: true }) // C3=C2
      label(pts[2], 'NH')

      const { pts: hex, centre: hc, r: hr } = fusedRing(pts[3], pts[4], centre, 6)
      for (let i = 0; i < 6; i++) {
        const a = hex[i]
        const b = hex[(i + 1) % 6]
        const shared =
          (near(a, pts[3]) && near(b, pts[4])) || (near(a, pts[4]) && near(b, pts[3]))
        if (!shared) bond(a, b)
      }
      circles.push({ x: hc.x, y: hc.y, r: hr * 0.55 })
    }
  }

  return finish(name, bonds, labels, circles, labelled, key)
}

const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1

/** Trims bonds at labelled atoms and computes the fitted viewBox. */
function finish(name, bonds, labels, circles, labelled, key) {
  const trimmed = bonds.map(({ a, b, double, inner }) => {
    const d = dirTo(a, b)
    const boxA = labelled.get(key(a))?.box
    const boxB = labelled.get(key(b))?.box
    const padA = boxA ? trimFor(boxA, d) : 0
    const padB = boxB ? trimFor(boxB, d) : 0
    return {
      a: { x: a.x + d.x * padA, y: a.y + d.y * padA },
      b: { x: b.x - d.x * padB, y: b.y - d.y * padB },
      double,
      inner,
    }
  })

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const grow = (x, y) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const s of trimmed) {
    grow(s.a.x, s.a.y)
    grow(s.b.x, s.b.y)
  }
  for (const c of circles) {
    grow(c.x - c.r, c.y - c.r)
    grow(c.x + c.r, c.y + c.r)
  }
  for (const l of labels) {
    const { halfW, halfH } = labelBox(l.text, l.size)
    grow(l.x - halfW, l.y - halfH)
    grow(l.x + halfW, l.y + halfH)
  }

  // Every distinct bond endpoint is an atom. Unlabelled ones are carbon —
  // that IS skeletal notation — so this recovers what the drawing actually
  // claims the side chain is made of, which validation then checks against
  // the residue's known composition.
  const atoms = []
  const seen = new Set()
  for (const { a, b } of bonds) {
    for (const p of [a, b]) {
      const k = key(p)
      if (seen.has(k)) continue
      seen.add(k)
      atoms.push({ x: p.x, y: p.y, element: elementOf(labelled.get(k)?.text) })
    }
  }

  const pad = 5
  return {
    name,
    bonds: trimmed,
    labels,
    circles,
    atoms,
    view: { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 },
  }
}

/** What element a vertex is, from its label — nothing written means carbon. */
function elementOf(text) {
  if (!text) return 'C'
  if (text.startsWith('Cα')) return 'Cα'
  return text[0]
}

/** Two parallel lines for a double bond; `inner` keeps one inside a ring. */
function doubleBondLines(s) {
  const d = dirTo(s.a, s.b)
  const n = { x: -d.y, y: d.x }
  if (!s.inner) {
    return [-2.8, 2.8].map((o) => ({
      x1: s.a.x + n.x * o,
      y1: s.a.y + n.y * o,
      x2: s.b.x + n.x * o,
      y2: s.b.y + n.y * o,
    }))
  }
  // Inside a ring the second line is drawn short, offset toward the centre.
  const shrink = 0.2
  const ax = s.a.x + (s.b.x - s.a.x) * shrink
  const ay = s.a.y + (s.b.y - s.a.y) * shrink
  const bx = s.b.x - (s.b.x - s.a.x) * shrink
  const by = s.b.y - (s.b.y - s.a.y) * shrink
  return [{ x1: ax, y1: ay, x2: bx, y2: by }]
}

/**
 * Sized by CSS unless a caller asks for something specific. A fixed 128px
 * box left the structure as a thumbnail floating in a card several times
 * wider than itself, which is exactly the thing these cards exist to show.
 */
export default function SideChainStructure({ name, width, height, className = 'side-chain' }) {
  const g = buildSideChain(name)
  if (!g) return null

  return (
    <svg
      viewBox={`${g.view.x} ${g.view.y} ${g.view.w} ${g.view.h}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Skeletal structure of the ${name} side chain`}
    >
      {g.bonds.map((s, i) =>
        s.double ? (
          doubleBondLines(s).map((l, k) => (
            <line key={`d${i}-${k}`} {...l} stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          ))
        ) : (
          <line
            key={`b${i}`}
            x1={s.a.x}
            y1={s.a.y}
            x2={s.b.x}
            y2={s.b.y}
            stroke={STROKE}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ),
      )}
      {g.circles.map((c, i) => (
        <circle key={`c${i}`} cx={c.x} cy={c.y} r={c.r} fill="none" stroke={STROKE} strokeWidth="1.4" />
      ))}
      {g.labels.map((l, i) => (
        <text
          key={`t${i}`}
          x={l.x}
          y={l.y}
          fill={l.muted ? MUTED : TEXT}
          fontSize={l.size}
          textAnchor="middle"
          dominantBaseline="middle"
          fontWeight="600"
        >
          {l.text}
        </text>
      ))}
    </svg>
  )
}
