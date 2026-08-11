import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'

/**
 * IUPAC naming for a deliberately narrow subset: straight-chain parents
 * carrying only groups that CANNOT extend or become the parent chain
 * (halogens, one –OH, one C=C).
 *
 * Alkyl branches are excluded on purpose — choosing the parent chain when
 * branches are present needs a real longest-chain search, and a subtly
 * wrong generated name would teach the wrong thing. Branched naming is
 * covered by hand-checked questions instead.
 */
const STEMS = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec']
const MULTIPLIERS = { 1: '', 2: 'di', 3: 'tri', 4: 'tetra' }
const HALOGEN_PREFIX = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' }

export const alkaneName = (n) => `${STEMS[n - 1]}ane`

/**
 * Picks the numbering direction giving the lowest locant set, breaking a
 * tie in favour of the alphabetically first substituent.
 */
function numberChain(size, substituents) {
  const forward = substituents.map((s) => ({ ...s, locant: s.vertexIndex + 1 }))
  const reverse = substituents.map((s) => ({ ...s, locant: size - s.vertexIndex }))

  const setOf = (list) => list.map((s) => s.locant).sort((a, b) => a - b)
  const f = setOf(forward)
  const r = setOf(reverse)

  for (let i = 0; i < f.length; i++) {
    if (f[i] !== r[i]) return f[i] < r[i] ? forward : reverse
  }

  const firstAlpha = (list) => {
    const sorted = [...list].sort((a, b) => a.prefix.localeCompare(b.prefix) || a.locant - b.locant)
    return sorted[0].locant
  }
  return firstAlpha(forward) <= firstAlpha(reverse) ? forward : reverse
}

function buildPrefixes(numbered) {
  const byPrefix = new Map()
  for (const s of numbered) {
    const list = byPrefix.get(s.prefix) ?? []
    list.push(s.locant)
    byPrefix.set(s.prefix, list)
  }
  return [...byPrefix.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, locants]) => `${locants.sort((a, b) => a - b).join(',')}-${MULTIPLIERS[locants.length]}${prefix}`)
    .join('-')
}

/**
 * Each namer also reports whether numbering ran right-to-left, so the
 * diagram can label its carbons in the SAME direction the name used.
 * Numbering the drawing left-to-right regardless would contradict the
 * answer and teach the user to ignore the lowest-locant rule.
 */

/** Names a haloalkane: halogens on a straight-chain parent. */
export function nameHaloalkaneNumbered(size, substituents) {
  const withPrefix = substituents.map((s) => ({ ...s, prefix: HALOGEN_PREFIX[s.label] }))
  const numbered = numberChain(size, withPrefix)
  const reversed = numbered.some((s) => s.locant === size - s.vertexIndex && s.locant !== s.vertexIndex + 1)
  return { name: `${buildPrefixes(numbered)}${alkaneName(size)}`, reversed }
}

export const nameHaloalkane = (size, substituents) => nameHaloalkaneNumbered(size, substituents).name

/** Names a straight-chain alcohol, e.g. pentan-2-ol. */
export function nameAlkanolNumbered(size, vertexIndex) {
  const reversed = size - vertexIndex < vertexIndex + 1
  const locant = Math.min(vertexIndex + 1, size - vertexIndex)
  return { name: `${STEMS[size - 1]}an-${locant}-ol`, reversed }
}

export const nameAlkanol = (size, vertexIndex) => nameAlkanolNumbered(size, vertexIndex).name

/** Names a straight-chain alkene, e.g. hex-2-ene. */
export function nameAlkeneNumbered(size, bondIndex) {
  const reversed = size - 1 - bondIndex < bondIndex + 1
  const locant = Math.min(bondIndex + 1, size - 1 - bondIndex)
  return { name: `${STEMS[size - 1]}-${locant}-ene`, reversed }
}

export const nameAlkene = (size, bondIndex) => nameAlkeneNumbered(size, bondIndex).name

/** Names a straight-chain alkyne, e.g. hex-2-yne. */
export function nameAlkyneNumbered(size, bondIndex) {
  const reversed = size - 1 - bondIndex < bondIndex + 1
  const locant = Math.min(bondIndex + 1, size - 1 - bondIndex)
  return { name: `${STEMS[size - 1]}-${locant}-yne`, reversed }
}

export const nameAlkyne = (size, bondIndex) => nameAlkyneNumbered(size, bondIndex).name

function haloalkaneMolecule(rng, size) {
  const count = rng() < 0.55 ? 1 : 2
  const vertices = pickN(rng, Array.from({ length: size }, (_, i) => i), count)
  const sameHalogen = rng() < 0.4
  const halogen = pick(rng, ['Cl', 'Br', 'F', 'I'])
  return {
    shape: 'chain',
    size,
    doubleBondAt: [],
    substituents: vertices.map((vertexIndex) => ({
      vertexIndex,
      label: sameHalogen ? halogen : pick(rng, ['Cl', 'Br', 'F', 'I']),
    })),
  }
}

/** Structure → name, across the three safe families. */
export function generateStructureToName(seed) {
  const rng = rngFor(seed)
  const size = 4 + Math.floor(rng() * 5)
  const family = seed % 4

  let mol
  let named
  let teach

  if (family === 0) {
    mol = haloalkaneMolecule(rng, size)
    named = nameHaloalkaneNumbered(size, mol.substituents)
    teach = 'Number the chain from the end that gives the substituents the lowest locants, then list prefixes alphabetically (ignoring di/tri when alphabetizing).'
  } else if (family === 1) {
    const vertexIndex = Math.floor(rng() * size)
    mol = { shape: 'chain', size, doubleBondAt: [], substituents: [{ vertexIndex, label: 'OH' }] }
    named = nameAlkanolNumbered(size, vertexIndex)
    teach = 'An –OH is a suffix (-ol) and outranks halogens, so it always gets the lowest possible number.'
  } else if (family === 2) {
    const bondIndex = Math.floor(rng() * (size - 1))
    mol = { shape: 'chain', size, doubleBondAt: [bondIndex], substituents: [] }
    named = nameAlkeneNumbered(size, bondIndex)
    teach = 'A double bond is numbered by its FIRST carbon, counting from whichever end gives the lower number.'
  } else {
    const bondIndex = Math.floor(rng() * (size - 1))
    mol = { shape: 'chain', size, doubleBondAt: [], tripleBondAt: [bondIndex], substituents: [] }
    named = nameAlkyneNumbered(size, bondIndex)
    teach = 'Triple bonds take the -yne suffix and are numbered exactly like double bonds, by their first carbon.'
  }

  const correct = named.name

  // Distractors: same family, different locants or chain length.
  const distractors = new Set()
  let guard = 0
  while (distractors.size < 3 && guard++ < 60) {
    const altSeed = rngFor(seed * 31 + guard)
    const altSize = Math.max(3, Math.min(9, size + (altSeed() < 0.4 ? (altSeed() < 0.5 ? -1 : 1) : 0)))
    let candidate
    if (family === 0) candidate = nameHaloalkane(altSize, haloalkaneMolecule(altSeed, altSize).substituents)
    else if (family === 1) candidate = nameAlkanol(altSize, Math.floor(altSeed() * altSize))
    else if (family === 2) candidate = nameAlkene(altSize, Math.floor(altSeed() * (altSize - 1)))
    else candidate = nameAlkyne(altSize, Math.floor(altSeed() * (altSize - 1)))
    if (candidate !== correct) distractors.add(candidate)
  }
  if (distractors.size < 3) return null

  const choices = shuffleWith(rng, [correct, ...distractors])

  return {
    id: `nom-${seed}`,
    topic: 'nomenclature',
    kind: 'mcq',
    prompt: 'What is the IUPAC name of this structure?',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `${correct}. Parent chain: ${alkaneName(size)} (${size} carbons), numbered from the ${named.reversed ? 'right' : 'left'} to give the lowest locant.`,
    teach,
    visual: { type: 'skeletal', molecule: mol, showVertexNumbers: true, numberFromRight: named.reversed },
  }
}

/** Name → structure: pick the drawing that matches the given name. */
export function generateNameToStructure(seed) {
  const rng = rngFor(seed * 7717 + 29)
  const size = 4 + Math.floor(rng() * 4)
  const family = seed % 3

  let mol
  let correct
  if (family === 0) {
    mol = haloalkaneMolecule(rng, size)
    correct = nameHaloalkane(size, mol.substituents)
  } else if (family === 1) {
    const vertexIndex = Math.floor(rng() * size)
    mol = { shape: 'chain', size, doubleBondAt: [], substituents: [{ vertexIndex, label: 'OH' }] }
    correct = nameAlkanol(size, vertexIndex)
  } else if (family === 2) {
    const bondIndex = Math.floor(rng() * (size - 1))
    mol = { shape: 'chain', size, doubleBondAt: [bondIndex], substituents: [] }
    correct = nameAlkene(size, bondIndex)
  } else {
    const bondIndex = Math.floor(rng() * (size - 1))
    mol = { shape: 'chain', size, doubleBondAt: [], tripleBondAt: [bondIndex], substituents: [] }
    correct = nameAlkyne(size, bondIndex)
  }

  // Wrong structures that would earn a different name.
  const alternatives = []
  let guard = 0
  while (alternatives.length < 3 && guard++ < 60) {
    const r = rngFor(seed * 131 + guard * 17)
    let candidate
    if (family === 0) {
      candidate = haloalkaneMolecule(r, size)
      if (nameHaloalkane(size, candidate.substituents) === correct) continue
    } else if (family === 1) {
      const v = Math.floor(r() * size)
      candidate = { shape: 'chain', size, doubleBondAt: [], substituents: [{ vertexIndex: v, label: 'OH' }] }
      if (nameAlkanol(size, v) === correct) continue
    } else if (family === 2) {
      const b = Math.floor(r() * (size - 1))
      candidate = { shape: 'chain', size, doubleBondAt: [b], substituents: [] }
      if (nameAlkene(size, b) === correct) continue
    } else {
      const b = Math.floor(r() * (size - 1))
      candidate = { shape: 'chain', size, doubleBondAt: [], tripleBondAt: [b], substituents: [] }
      if (nameAlkyne(size, b) === correct) continue
    }
    alternatives.push(candidate)
  }
  if (alternatives.length < 3) return null

  const molecules = shuffleWith(rng, [mol, ...alternatives])
  const correctIndex = molecules.indexOf(mol)

  return {
    id: `nom2s-${seed}`,
    topic: 'nomenclature',
    kind: 'mcq',
    prompt: `Which structure is ${correct}?`,
    choices: molecules.map((_, i) => `Structure ${'ABCD'[i]}`),
    choiceVisuals: molecules.map((m) => ({ type: 'skeletal', molecule: m })),
    correctIndex,
    explanation: `${correct} needs the substituent position(s) implied by its locants on a ${alkaneName(size)} backbone.`,
    teach: 'Work name → structure by drawing the parent chain first, numbering it, then attaching each group at its stated locant.',
  }
}

/**
 * Branched alkanes, hand-verified rather than generated.
 *
 * Naming a branched skeleton correctly needs a real longest-chain search
 * with tie-breaking, and a subtly wrong generated name would teach the
 * wrong rule. Every entry below was checked by hand — including the cases
 * where an alternative chain ties in length and the name still comes out
 * the same. Questions are still generated FROM the table, so both
 * directions and fresh distractors come for free.
 */
const BRANCHED = [
  { size: 4, subs: [[1, 'CH3']], name: '2-methylbutane' },
  { size: 3, subs: [[1, 'CH3'], [1, 'CH3']], name: '2,2-dimethylpropane' },
  { size: 5, subs: [[1, 'CH3']], name: '2-methylpentane' },
  { size: 5, subs: [[2, 'CH3']], name: '3-methylpentane' },
  { size: 4, subs: [[1, 'CH3'], [1, 'CH3']], name: '2,2-dimethylbutane' },
  { size: 4, subs: [[1, 'CH3'], [2, 'CH3']], name: '2,3-dimethylbutane' },
  { size: 6, subs: [[1, 'CH3']], name: '2-methylhexane' },
  { size: 6, subs: [[2, 'CH3']], name: '3-methylhexane' },
  { size: 5, subs: [[1, 'CH3'], [1, 'CH3']], name: '2,2-dimethylpentane' },
  { size: 5, subs: [[1, 'CH3'], [2, 'CH3']], name: '2,3-dimethylpentane' },
  { size: 5, subs: [[1, 'CH3'], [3, 'CH3']], name: '2,4-dimethylpentane' },
  { size: 5, subs: [[2, 'CH3'], [2, 'CH3']], name: '3,3-dimethylpentane' },
  { size: 5, subs: [[2, 'CH2CH3']], name: '3-ethylpentane' },
  { size: 4, subs: [[1, 'CH3'], [1, 'CH3'], [2, 'CH3']], name: '2,2,3-trimethylbutane' },
  { size: 7, subs: [[1, 'CH3']], name: '2-methylheptane' },
  { size: 7, subs: [[2, 'CH3']], name: '3-methylheptane' },
  { size: 7, subs: [[3, 'CH3']], name: '4-methylheptane' },
  { size: 6, subs: [[1, 'CH3'], [3, 'CH3']], name: '2,4-dimethylhexane' },
  { size: 6, subs: [[1, 'CH3'], [4, 'CH3']], name: '2,5-dimethylhexane' },
  { size: 6, subs: [[2, 'CH3'], [3, 'CH3']], name: '3,4-dimethylhexane' },
]

const branchedMolecule = (entry) => ({
  shape: 'chain',
  size: entry.size,
  doubleBondAt: [],
  tripleBondAt: [],
  substituents: entry.subs.map(([vertexIndex, label]) => ({ vertexIndex, label })),
})

const carbonCount = (entry) =>
  entry.size + entry.subs.reduce((n, [, label]) => n + (label === 'CH2CH3' ? 2 : 1), 0)

/** Branched structure → name, from the hand-checked table. */
export function generateBranchedName(seed) {
  const rng = rngFor(seed * 4093 + 11)
  const entry = BRANCHED[seed % BRANCHED.length]

  // Prefer distractors with the same carbon count so the question can't be
  // answered by counting carbons alone.
  const sameSize = BRANCHED.filter((e) => e !== entry && carbonCount(e) === carbonCount(entry))
  const pool = [...sameSize, ...BRANCHED.filter((e) => e !== entry && !sameSize.includes(e))]
  const distractors = pool.slice(0, 6).map((e) => e.name)
  const { choices, correctIndex } = makeChoices(rng, entry.name, distractors)

  return {
    id: `branch-name-${seed % BRANCHED.length}`,
    topic: 'nomenclature',
    kind: 'mcq',
    prompt: 'What is the IUPAC name of this structure?',
    choices,
    correctIndex,
    explanation: `${entry.name}. The longest chain is ${entry.size} carbons (${alkaneName(entry.size)}), numbered to give the branches the lowest locants.`,
    teach: 'Find the longest chain first — it may bend on the page — then number from the end that reaches a branch soonest.',
    visual: { type: 'skeletal', molecule: branchedMolecule(entry) },
  }
}

/** Name → branched structure. */
export function generateBranchedStructure(seed) {
  const rng = rngFor(seed * 7481 + 43)
  const entry = BRANCHED[seed % BRANCHED.length]
  const sameSize = BRANCHED.filter((e) => e !== entry && carbonCount(e) === carbonCount(entry))
  const pool = [...sameSize, ...BRANCHED.filter((e) => e !== entry && !sameSize.includes(e))]
  if (pool.length < 3) return null

  const molecules = shuffleWith(rng, [entry, ...pool.slice(0, 3)]).map(branchedMolecule)
  const correctIndex = molecules.findIndex((m) => JSON.stringify(m) === JSON.stringify(branchedMolecule(entry)))

  return {
    id: `branch-struct-${seed % BRANCHED.length}`,
    topic: 'nomenclature',
    kind: 'mcq',
    prompt: `Which structure is ${entry.name}?`,
    choices: molecules.map((_, i) => `Structure ${'ABCD'[i]}`),
    choiceVisuals: molecules.map((m) => ({ type: 'skeletal', molecule: m })),
    correctIndex,
    explanation: `${entry.name} needs a ${entry.size}-carbon chain carrying ${entry.subs.length} branch${entry.subs.length === 1 ? '' : 'es'} at the stated position(s).`,
    teach: 'Build it in order: draw the parent chain, number it, then attach each branch at its locant.',
  }
}

/** Parent-chain naming: how many carbons does a stem imply. */
export function generateStemRecall(seed) {
  const rng = rngFor(seed * 51 + 3)
  const n = 1 + (seed % 10)
  const nameToCount = rng() < 0.5

  const { choices, correctIndex } = nameToCount
    ? makeChoices(rng, n, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    : makeChoices(rng, alkaneName(n), STEMS.map((_, i) => alkaneName(i + 1)))

  return {
    id: `stem-${seed}`,
    topic: 'nomenclature',
    kind: 'mcq',
    prompt: nameToCount ? `How many carbons are in ${alkaneName(n)}?` : `What is the name of the straight-chain alkane with ${n} carbon${n === 1 ? '' : 's'}?`,
    choices,
    correctIndex,
    explanation: `${alkaneName(n)} has ${n} carbon${n === 1 ? '' : 's'}.`,
    teach: 'Stems 1-10: meth, eth, prop, but, pent, hex, hept, oct, non, dec.',
  }
}
