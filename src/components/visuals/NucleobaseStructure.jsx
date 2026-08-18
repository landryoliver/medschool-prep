import BASES from '../../data/genchem/nucleobases.json'
import { parseFormula, EMPTY, addCounts } from '../../lib/chem/formula.js'
import {
  BOND,
  DOWN,
  LABEL_SIZE,
  dirTo,
  step,
  ringAt,
  fusedRing,
  near,
  key,
  finish,
  labelBox,
  draw,
} from './SideChainStructure.jsx'

/**
 * The five nucleobases, drawn from their ring skeletons.
 *
 * Built on the same geometry as the amino acid side chains, which means the
 * same guards apply: no crossing bonds, no two bonds under 45° at one atom,
 * no label sitting on a line, and a composition that has to match the
 * accepted molecular formula. That last one matters most here — a purine
 * with a nitrogen in the wrong place still looks like a purine.
 *
 * Ring numbering follows the standard:
 *
 *   pyrimidine   N1 C2 N3 C4 C5 C6        (index 0..5 below)
 *   purine       the same six-ring, fused across C4–C5 to an imidazole
 *                whose own atoms are N7 C8 N9
 *
 * Substituent positions in the data are indices into that six-ring, so
 * "at: 1" is C2 and "at: 5" is C6 — which is where adenine's amino group
 * belongs.
 */

// Which six-ring vertices are nitrogen: N1 and N3, i.e. indices 0 and 2.
const SIX_N = new Set([0, 2])

export function buildNucleobase(name) {
  const spec = BASES.find((b) => b.name === name)
  if (!spec) return null

  const bonds = []
  const labels = []
  const circles = []
  const labelled = new Map()
  const bond = (a, b, opts = {}) => bonds.push({ a, b, double: !!opts.double, inner: !!opts.inner })
  const label = (p, text, size = LABEL_SIZE) => {
    labels.push({ x: p.x, y: p.y, text, size, muted: false })
    labelled.set(key(p), { box: labelBox(text, size), text })
  }

  // The six-ring, hung downward from a notional attachment so the geometry
  // matches everything else in the app.
  const top = { x: 0, y: 0 }
  const { pts: six, centre: sixC, r: sixR } = ringAt(top, DOWN, 6, BOND * 1.5)
  for (let i = 0; i < 6; i++) bond(six[i], six[(i + 1) % 6])
  for (const i of SIX_N) label(six[i], 'N')

  if (spec.ring === 'purine') {
    // Imidazole fused across C4–C5, which are indices 3 and 4.
    const { pts: five, centre: fiveC } = fusedRing(six[3], six[4], sixC, 5)
    for (let i = 0; i < 5; i++) {
      const a = five[i]
      const b = five[(i + 1) % 5]
      const shared = (near(a, six[3]) && near(b, six[4])) || (near(a, six[4]) && near(b, six[3]))
      if (!shared) bond(a, b)
    }
    // Of the three non-shared atoms, the outer two are N7 and N9 and the
    // middle one is C8 — that alternation is what makes it an imidazole.
    const outer = five.filter((p) => !near(p, six[3]) && !near(p, six[4]))
    label(outer[0], 'N')
    label(outer[2], 'NH')
    circles.push({ x: fiveC.x, y: fiveC.y, r: BOND * 0.42 })
  }

  circles.push({ x: sixC.x, y: sixC.y, r: sixR * 0.5 })

  for (const s of spec.substituents ?? []) {
    const v = six[s.at]
    const out = step(v, dirTo(sixC, v), BOND * 1.1)
    bond(v, out, { double: !!s.double })
    label(out, s.label)
  }

  const g = finish(name, bonds, labels, circles, labelled, { skipOrigin: false })

  // Ring atoms contribute themselves; substituent labels contribute what
  // they spell. Recomputed here because the shared `finish` counts an
  // unlabelled vertex as carbon, which is exactly right for these rings.
  const composition = EMPTY()
  addCounts(composition, g.composition)
  return { ...g, composition, spec }
}

export default function NucleobaseStructure({ name, className = 'aa-structure' }) {
  const g = buildNucleobase(name)
  if (!g) return null
  return (
    <svg
      viewBox={`${g.view.x} ${g.view.y} ${g.view.w} ${g.view.h}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Structure of ${name}`}
    >
      {draw(g)}
    </svg>
  )
}
