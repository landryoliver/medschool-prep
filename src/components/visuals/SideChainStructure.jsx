import SHAPES from '../../data/genchem/sideChainShapes.json'
import { parseFormula, EMPTY, addCounts } from '../../lib/chem/formula.js'

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
const DOWN = { x: 0, y: 1 }
const UP = { x: 0, y: -1 }
const LEFT = { x: -1, y: 0 }
const RIGHT = { x: 1, y: 0 }

// The written groups either side of the alpha carbon need a longer bond than
// a skeletal one, because the text itself eats most of the length.
const BACKBONE = BOND * 2.1
const LABEL_SIZE = 13

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
function ringAt(attach, inDir, sides, side = BOND) {
  const r = side / (2 * Math.sin(Math.PI / sides))
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

export const key = (p) => `${Math.round(p.x)},${Math.round(p.y)}`

/**
 * Collects the side chain as raw parts, alpha carbon at the origin, so the
 * backbone can be added to the SAME coordinate space before anything is
 * trimmed or measured. Drawing R separately from the molecule it belongs to
 * produced two pictures at two different scales sitting in one card, which
 * is exactly what these cards exist to avoid.
 */
function collectSideChain(name) {
  const spec = SHAPES[name]
  if (!spec) return null

  const bonds = []
  const labels = []
  const circles = []

  const bond = (a, b, opts = {}) => bonds.push({ a, b, double: !!opts.double, inner: !!opts.inner })

  // Bond lengths are trimmed at labelled atoms so the line stops at the
  // letter instead of running through it.
  const labelled = new Map()
  const label = (p, text, opts = {}) => {
    const size = opts.size ?? LABEL_SIZE
    labels.push({ x: p.x, y: p.y, text, size, muted: !!opts.muted })
    labelled.set(key(p), { box: labelBox(text, size), text })
  }

  // The alpha carbon is a bare vertex, as any carbon is in skeletal
  // notation. It used to carry a "Cα" label, which on a viewBox fitted to
  // alanine's tiny structure scaled up to something the size of the card.
  const alpha = { x: 0, y: 0 }
  const parts = { spec, bonds, labels, circles, labelled, bond, label, alpha }

  if (spec.kind === 'atom') {
    // Glycine: the whole side chain is one hydrogen.
    const h = step(alpha, DOWN)
    bond(alpha, h)
    label(h, spec.label)
    return parts
  }

  if (spec.kind === 'proline') {
    // The side chain closes back onto the backbone nitrogen, so the alpha
    // carbon is IN the ring rather than hanging off it. The ring nitrogen is
    // therefore the backbone amine — the composer labels it, and skips the
    // separate amine group it draws for every other residue.
    // Tilted off vertical, because proline is the one residue whose alpha
    // carbon carries TWO ring bonds. Hanging the ring straight down puts one
    // of them 36° from the carboxylate, where the two lines read as one. The
    // tilt swings the ring into the space the amino group occupies on every
    // other residue — which is where it belongs, since proline's ring
    // nitrogen IS that amino group.
    const { pts } = ringAt(alpha, rot(DOWN, 19), 5)
    for (let i = 0; i < 5; i++) bond(pts[i], pts[(i + 1) % 5])
    label(pts[4], 'N')
    parts.prolineN = pts[4]
    return parts
  }

  // --- the side chain proper -------------------------------------------
  // The first bond drops straight down from the alpha carbon, so the four
  // things attached to it sit at 0/90/180/270 degrees. Starting the zigzag
  // immediately put the side chain 30 degrees from the carboxylate and the
  // alpha carbon looked like a fan.
  const chain = [alpha]
  const dirs = []
  for (let i = 0; i < spec.carbons; i++) {
    const d = i === 0 ? DOWN : i % 2 === 1 ? DOWN_RIGHT : DOWN_LEFT
    dirs.push(d)
    chain.push(step(chain[chain.length - 1], d))
  }
  for (let i = 0; i < chain.length - 1; i++) bond(chain[i], chain[i + 1])

  let last = chain[chain.length - 1]
  let lastDir = dirs[dirs.length - 1] ?? DOWN
  const nextDir = () => (lastDir === DOWN ? DOWN_RIGHT : flip(lastDir))

  // A bare line end IS a methyl in skeletal notation — but only if you
  // already read skeletal notation. To someone coming back to chemistry it
  // looks like a line going nowhere, so every methyl is written out.
  const branchedAt = new Set([...(spec.branches ?? []), ...(spec.branchLabels ?? [])].map((b) => b.at + 1))
  for (const b of spec.branches ?? []) {
    const v = chain[b.at + 1]
    const nbrs = [chain[b.at], chain[b.at + 2]].filter(Boolean)
    for (const d of freeDirs(v, nbrs, b.count)) {
      const p = step(v, d)
      bond(v, p)
      label(p, 'CH₃')
    }
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

  // Whatever the chain ends on, if nothing was attached to it, is a methyl.
  // A vertex carrying branches is NOT one — valine's last chain carbon bears
  // two methyls and is itself a CH.
  let openEnd = null
  if (spec.hetero) {
    // Methionine: the chain resumes past the sulfur and ends on a methyl.
    // Guarded on there actually being carbon after it, or the sulfur itself
    // would get written CH₃.
    if ((spec.afterHetero ?? 0) > 0) openEnd = last
  } else if (!spec.terminal && !spec.carboxylate && !spec.amide && !spec.guanidinium && !spec.ring) {
    if (!branchedAt.has(chain.length - 1)) openEnd = last
  }
  if (openEnd) label(openEnd, 'CH₃')

  return parts
}

/**
 * The same side chain written out: a vertical stack with every carbon named.
 *
 * This is how the twenty appear in a biochemistry amino acid chart, and in
 * the amino acid chapter of an organic textbook — CH₂ spelled out rather
 * than implied at a vertex. Organic chemistry drills the skeletal form
 * everywhere else, so both are worth recognising and the card can switch.
 *
 * Rings stay drawn as rings in both notations; nobody writes a benzene ring
 * out as a chain.
 */
const VSTEP = 30
const HSTEP = 34

function collectWritten(name) {
  const spec = SHAPES[name]
  if (!spec) return null

  const bonds = []
  const labels = []
  const circles = []
  const labelled = new Map()
  const bond = (a, b, opts = {}) => bonds.push({ a, b, double: !!opts.double, inner: !!opts.inner })
  const label = (p, text, opts = {}) => {
    const size = opts.size ?? LABEL_SIZE
    labels.push({ x: p.x, y: p.y, text, size, muted: !!opts.muted })
    labelled.set(key(p), { box: labelBox(text, size), text })
  }

  const alpha = { x: 0, y: 0 }
  const parts = { spec, bonds, labels, circles, labelled, bond, label, alpha }

  if (spec.kind === 'atom') {
    const h = { x: 0, y: VSTEP }
    bond(alpha, h)
    label(h, spec.label)
    return parts
  }

  if (spec.kind === 'proline') {
    // The ring keeps its shape, but in this notation its carbons are named
    // like every other carbon. Leaving them bare made "every carbon spelled
    // out" false for exactly one residue — and proline's ring is saturated
    // CH₂, which a biochemistry chart does label.
    // A wider ring: a label at every vertex needs more edge than a bare
    // skeletal pentagon has, or the trim leaves no line between the letters.
    const { pts } = ringAt(alpha, rot(DOWN, 19), 5, BOND * 1.9)
    for (let i = 0; i < 5; i++) bond(pts[i], pts[(i + 1) % 5])
    for (const i of [1, 2, 3]) label(pts[i], 'CH₂')
    label(pts[4], 'N')
    parts.prolineN = pts[4]
    return parts
  }

  const branchAt = new Map((spec.branches ?? []).map((b) => [b.at + 1, b.count]))
  const branchLabelAt = new Map((spec.branchLabels ?? []).map((b) => [b.at + 1, b.label]))
  const tail = spec.terminal || spec.carboxylate || spec.amide || spec.guanidinium || spec.ring || spec.hetero

  let prev = alpha
  let y = 0
  const chain = []
  for (let i = 1; i <= spec.carbons; i++) {
    y += VSTEP
    const v = { x: 0, y }
    chain.push(v)
    bond(prev, v)

    const isLast = i === spec.carbons
    const branches = branchAt.get(i) ?? 0
    const hasLabelBranch = branchLabelAt.has(i)
    // CH if something hangs off it, CH₃ if the chain simply stops here,
    // CH₂ otherwise. This is the whole point of the written form: the
    // hydrogen count is stated rather than inferred from the valence.
    const text = branches || hasLabelBranch ? 'CH' : isLast && !tail ? 'CH₃' : 'CH₂'
    label(v, text)

    // A carbon the chain continues past puts its branches out sideways; one
    // the chain ends on splays them below, the way an isopropyl is drawn.
    const terminalVertex = isLast && !tail
    if (branches) {
      const dirs =
        branches === 2
          ? terminalVertex
            ? [{ x: -0.6, y: 0.8 }, { x: 0.6, y: 0.8 }]
            : [LEFT, RIGHT]
          : [RIGHT]
      for (const d of dirs) {
        const p = { x: d.x * HSTEP, y: v.y + d.y * VSTEP }
        bond(v, p)
        label(p, 'CH₃')
      }
    }
    if (hasLabelBranch) {
      const p = { x: HSTEP, y: v.y }
      bond(v, p)
      label(p, branchLabelAt.get(i))
    }
    prev = v
  }

  const down = (text, opts) => {
    y += VSTEP
    const p = { x: 0, y }
    bond(prev, p)
    label(p, text, opts)
    prev = p
    return p
  }

  if (spec.hetero) {
    down(spec.hetero.label)
    for (let i = 0; i < (spec.afterHetero ?? 0); i++) down('CH₃')
  } else if (spec.terminal) {
    down(spec.terminal)
  } else if (spec.carboxylate) {
    down('COO⁻')
  } else if (spec.amide) {
    down('CONH₂')
  } else if (spec.guanidinium) {
    down('NH')
    down('C(NH₂)₂⁺', { size: 12 })
  } else if (spec.ring) {
    // The ring hangs below the last CH₂, drawn exactly as in skeletal form.
    const attach = { x: 0, y: y + VSTEP }
    bond(prev, attach)
    const sides = spec.ring === 'benzene' ? 6 : 5
    const { pts, centre, r } = ringAt(attach, DOWN, sides)
    for (let i = 0; i < sides; i++) bond(pts[i], pts[(i + 1) % sides])

    if (spec.ring === 'benzene') {
      circles.push({ x: centre.x, y: centre.y, r: r * 0.55 })
      if (spec.ringSubstituent) {
        const p = step(pts[3], dirTo(centre, pts[3]))
        bond(pts[3], p)
        label(p, spec.ringSubstituent)
      }
    }
    if (spec.ring === 'imidazole') {
      bond(pts[1], pts[2], { inner: true, double: true })
      bond(pts[4], pts[0], { inner: true, double: true })
      label(pts[1], 'N')
      label(pts[3], 'N')
    }
    if (spec.ring === 'indole') {
      bond(pts[0], pts[1], { inner: true, double: true })
      label(pts[2], 'NH')
      const { pts: hex, centre: hc, r: hr } = fusedRing(pts[3], pts[4], centre, 6)
      for (let i = 0; i < 6; i++) {
        const a = hex[i]
        const b = hex[(i + 1) % 6]
        const shared = (near(a, pts[3]) && near(b, pts[4])) || (near(a, pts[4]) && near(b, pts[3]))
        if (!shared) bond(a, b)
      }
      circles.push({ x: hc.x, y: hc.y, r: hr * 0.55 })
    }
  }

  return parts
}

/** The side chain on its own, alpha carbon at the origin. */
export function buildSideChain(name, notation = 'skeletal') {
  const p = notation === 'written' ? collectWritten(name) : collectSideChain(name)
  if (!p) return null
  return finish(name, p.bonds, p.labels, p.circles, p.labelled)
}

/**
 * The whole residue as ONE structure: amino group, carboxylate, the alpha
 * hydrogen and the real side chain, all in a single coordinate space at a
 * single scale.
 *
 * This replaces a generic backbone diagram with a boxed "R" sitting above a
 * separately drawn, separately scaled side chain. Two pictures of one
 * molecule, in different sizes and styles, made the reader assemble them
 * mentally — and the fitted viewBox meant alanine's one-bond side chain was
 * magnified until its label dwarfed the card.
 */
export function buildAminoAcid(name, notation = 'skeletal') {
  const p = notation === 'written' ? collectWritten(name) : collectSideChain(name)
  if (!p) return null
  const { alpha, bond, label, labelled } = p

  // The alpha hydrogen, straight up, and the carboxylate to the right. Both
  // are written rather than drawn out: every residue shares them, so they
  // are context for the side chain, not the thing being learned.
  const h = step(alpha, UP, BOND * 0.95)
  bond(alpha, h)
  label(h, 'H')

  const coo = step(alpha, RIGHT, BACKBONE)
  bond(alpha, coo)
  label(coo, 'COO⁻')

  if (p.prolineN) {
    // Proline's ring nitrogen IS the backbone amine, so the existing "N" is
    // upgraded in place rather than a second amine being drawn beside it.
    // It is a secondary amine — two carbons, one hydrogen — which is why
    // proline cannot donate the backbone N–H that a helix needs.
    const k = key(p.prolineN)
    const existing = p.labels.find((l) => key(l) === k)
    existing.text = 'H₂N⁺'
    labelled.set(k, { box: labelBox(existing.text, existing.size), text: existing.text })
  } else {
    const n = step(alpha, LEFT, BACKBONE)
    bond(alpha, n)
    label(n, 'H₃N⁺')
  }

  return finish(name, p.bonds, p.labels, p.circles, labelled)
}

const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1

/** Trims bonds at labelled atoms and computes the fitted viewBox. */
function finish(name, bonds, labels, circles, labelled) {
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
  // The alpha carbon sits at the origin and belongs to the backbone, not the
  // side chain, so it is tagged rather than counted. It carries no label now
  // that the whole residue is drawn as one structure.
  const ALPHA = key({ x: 0, y: 0 })
  const atoms = []
  const seen = new Set()
  const composition = EMPTY()
  for (const { a, b } of bonds) {
    for (const p of [a, b]) {
      const k = key(p)
      if (seen.has(k)) continue
      seen.add(k)
      const text = labelled.get(k)?.text
      atoms.push({ x: p.x, y: p.y, element: k === ALPHA ? 'Cα' : elementOf(text) })
      if (k === ALPHA) continue
      // A vertex contributes whatever its label says, so "CH₂", "COO⁻" and
      // "C(NH₂)₂⁺" each count correctly. An unlabelled vertex is one carbon,
      // which is what skeletal notation means by a bare corner.
      addCounts(composition, text ? parseFormula(text) : { C: 1, H: 0, N: 0, O: 0, S: 0 })
    }
  }

  const pad = 5
  return {
    name,
    bonds: trimmed,
    labels,
    circles,
    atoms,
    composition,
    view: { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 },
  }
}

/** What element a vertex is, from its label — nothing written means carbon. */
function elementOf(text) {
  if (!text) return 'C'
  if (text.startsWith('Cα')) return 'Cα'
  return text[0]
}

/**
 * The horizontal extent shared by all twenty.
 *
 * A per-residue fitted box scales every card differently: alanine's single
 * bond gets magnified until its label is the size of the card, tryptophan's
 * ring system gets shrunk, and no two cards can be compared. Sharing the
 * WIDTH fixes the scale — the backbone is identical on all twenty, so it
 * dominates the width — which keeps text one size everywhere and lets
 * glycine genuinely look smaller than tryptophan.
 *
 * Height stays per-residue. Sharing that too left a small residue sitting in
 * a card that was 60% empty, since the frame had to fit arginine.
 */
let SPAN = null
export function aminoSpan() {
  if (SPAN) return SPAN
  let minX = Infinity
  let maxX = -Infinity
  for (const n of Object.keys(SHAPES)) {
    const v = buildAminoAcid(n).view
    minX = Math.min(minX, v.x)
    maxX = Math.max(maxX, v.x + v.w)
  }
  SPAN = { x: minX, w: maxX - minX }
  return SPAN
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

/** The bonds, rings and labels of a finished geometry, as SVG. */
function draw(g) {
  return (
    <>
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
    </>
  )
}

/**
 * The complete residue: amino group, carboxylate, alpha hydrogen and the
 * real side chain, in one drawing at the scale every other residue uses.
 */
export function AminoAcidStructure({ name, notation = 'skeletal', className = 'aa-structure' }) {
  const g = buildAminoAcid(name, notation)
  if (!g) return null
  // Shared width fixes the scale; own height keeps the card from being
  // mostly blank for the small residues.
  const s = aminoSpan()
  return (
    <svg
      viewBox={`${Math.min(s.x, g.view.x)} ${g.view.y} ${Math.max(s.w, g.view.w)} ${g.view.h}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Skeletal structure of ${name}`}
    >
      {draw(g)}
    </svg>
  )
}

/** The side chain alone, fitted to its own box — used where R is the subject. */
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
      {draw(g)}
    </svg>
  )
}
