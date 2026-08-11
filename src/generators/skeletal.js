import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'
import {
  molecularFormula,
  condensedFormula,
  hydrogensAt,
  degreesOfUnsaturation,
  hybridizationAt,
  bondPairs,
  SUBSTITUENTS,
} from '../lib/chem/molecule.js'

const SUB_POOL = ['OH', 'Cl', 'Br', 'F', 'I', 'NH2', 'CH3', 'CH2CH3', 'SH']

function isValid(mol) {
  for (let i = 0; i < mol.size; i++) {
    if (hydrogensAt(mol, i) < 0) return false
    const neighbors = mol.shape === 'ring' ? 2 : (i > 0 ? 1 : 0) + (i < mol.size - 1 ? 1 : 0)
    const pairs = bondPairs(mol)
    const touches = (b) => pairs[b]?.includes(i)
    const pi = (mol.doubleBondAt ?? []).filter(touches).length + 2 * (mol.tripleBondAt ?? []).filter(touches).length
    const subBonds = (mol.substituents ?? [])
      .filter((s) => s.vertexIndex === i)
      .reduce((n, s) => n + (s.bond ?? 1), 0)
    if (neighbors + pi + subBonds > 4) return false
  }
  return true
}

/** Non-adjacent bond indices, so no carbon ends up in two double bonds. */
function pickDoubleBonds(rng, mol, count) {
  const bondCount = mol.shape === 'ring' ? mol.size : mol.size - 1
  const candidates = shuffleWith(rng, Array.from({ length: bondCount }, (_, i) => i))
  const pairs = bondPairs(mol)
  const chosen = []
  for (const b of candidates) {
    if (chosen.length >= count) break
    const shares = chosen.some((c) => pairs[c].some((v) => pairs[b].includes(v)))
    if (!shares) chosen.push(b)
  }
  return chosen.sort((a, b) => a - b)
}

/** Deterministic random structure, guaranteed to satisfy carbon's valence. */
export function randomMolecule(seed) {
  const rng = rngFor(seed)
  for (let attempt = 0; attempt < 12; attempt++) {
    const isRing = rng() < 0.3
    const size = isRing ? pick(rng, [5, 6, 6, 6]) : 4 + Math.floor(rng() * 5)
    const mol = { shape: isRing ? 'ring' : 'chain', size, doubleBondAt: [], tripleBondAt: [], substituents: [] }

    // Benzene shows up constantly, so give the aromatic pattern its own path.
    const aromatic = isRing && size === 6 && rng() < 0.35
    if (aromatic) {
      mol.doubleBondAt = [0, 2, 4]
    } else if (!isRing && rng() < 0.15) {
      // Small rings cannot accommodate a linear sp carbon, so alkynes are chain-only.
      mol.tripleBondAt = pickDoubleBonds(rng, mol, 1)
    } else if (rng() < 0.45) {
      mol.doubleBondAt = pickDoubleBonds(rng, mol, 1)
    }

    const nSubs = aromatic ? (rng() < 0.5 ? 1 : 0) : Math.floor(rng() * 3)
    const vertices = pickN(rng, Array.from({ length: size }, (_, i) => i), nSubs)
    mol.substituents = vertices.map((vertexIndex) => ({ vertexIndex, label: pick(rng, SUB_POOL) }))

    if (isValid(mol)) return mol
  }
  return { shape: 'chain', size: 6, doubleBondAt: [], tripleBondAt: [], substituents: [] }
}

/** Read a skeletal structure and give its molecular formula. */
export function generateFormula(seed) {
  const rng = rngFor(seed * 7919 + 13)
  const mol = randomMolecule(seed)
  const correct = molecularFormula(mol)

  // Distractors are near-misses: right carbons, wrong hydrogen count.
  const distractors = [-2, -1, 1, 2].map((delta) => {
    const shifted = molecularFormula(mol).replace(/H(\d*)/, (m, n) => {
      const h = (n === '' ? 1 : Number(n)) + delta
      return h <= 0 ? '' : h === 1 ? 'H' : `H${h}`
    })
    return shifted
  })
  const { choices, correctIndex } = makeChoices(rng, correct, distractors)

  return {
    id: `skform-${seed}`,
    topic: 'skeletal-fluency',
    kind: 'mcq',
    prompt: 'What is the molecular formula of this structure?',
    choices,
    correctIndex,
    explanation: `Each vertex and line end is a carbon; every carbon silently carries enough hydrogens to reach 4 bonds. This one works out to ${correct}.`,
    teach: 'In skeletal notation, carbons and their hydrogens are implied. Count carbons from the vertices, then give each one (4 − bonds shown) hydrogens.',
    visual: { type: 'skeletal', molecule: mol },
  }
}

/** How many hydrogens sit on one specific carbon. */
export function generateImplicitH(seed) {
  const rng = rngFor(seed * 104729 + 7)
  const mol = randomMolecule(seed)
  const vertex = Math.floor(rng() * mol.size)
  const h = hydrogensAt(mol, vertex)

  return {
    id: `skh-${seed}`,
    topic: 'skeletal-fluency',
    kind: 'mcq',
    prompt: 'How many hydrogens are on the circled carbon?',
    choices: ['0', '1', '2', '3'],
    correctIndex: h,
    explanation: `That carbon already shows ${4 - h} bond${4 - h === 1 ? '' : 's'}, so it carries ${h} hydrogen${h === 1 ? '' : 's'} to complete its four bonds.`,
    teach: 'Every carbon forms exactly 4 bonds. Count the bonds you can see, and the rest are hydrogens.',
    visual: { type: 'skeletal', molecule: mol, highlightVertex: vertex },
  }
}

/** Carbon counting — the first thing to get automatic. */
export function generateCarbonCount(seed) {
  const mol = randomMolecule(seed)
  const rng = rngFor(seed * 31 + 5)
  const carbons = mol.size + (mol.substituents ?? []).reduce((n, s) => n + (SUBSTITUENTS[s.label]?.atoms.C ?? 0), 0)
  const { choices, correctIndex } = makeChoices(
    rng,
    carbons,
    [carbons - 2, carbons - 1, carbons + 1, carbons + 2].filter((n) => n > 0),
  )

  return {
    id: `skc-${seed}`,
    topic: 'skeletal-fluency',
    kind: 'mcq',
    prompt: 'How many CARBON atoms does this structure contain?',
    choices,
    correctIndex,
    explanation: `${mol.size} in the ${mol.shape}${carbons > mol.size ? `, plus ${carbons - mol.size} more in the alkyl substituent(s)` : ''} = ${carbons}.`,
    teach: 'Every line end and every corner is a carbon. Alkyl substituents like methyl and ethyl add their own.',
    visual: { type: 'skeletal', molecule: mol },
  }
}

/** Degrees of unsaturation: rings plus pi bonds. */
export function generateDegreesUnsaturation(seed) {
  const mol = randomMolecule(seed)
  const rng = rngFor(seed * 61 + 11)
  const dou = degreesOfUnsaturation(mol)
  const { choices, correctIndex } = makeChoices(rng, dou, [0, 1, 2, 3, 4])

  return {
    id: `skdou-${seed}`,
    topic: 'skeletal-fluency',
    kind: 'mcq',
    prompt: 'How many degrees of unsaturation does this structure have?',
    choices,
    correctIndex,
    explanation: `${mol.shape === 'ring' ? '1 ring' : 'no rings'} + ${(mol.doubleBondAt ?? []).length} pi bond${(mol.doubleBondAt ?? []).length === 1 ? '' : 's'} = ${dou}.`,
    teach: 'Degrees of unsaturation = rings + pi bonds. A benzene ring is 4 (one ring plus three double bonds).',
    visual: { type: 'skeletal', molecule: mol },
  }
}

/** Chain-only variant, so condensed-formula drills have something to write. */
function randomChain(seed) {
  const mol = randomMolecule(seed)
  if (mol.shape === 'chain') return mol
  // Ring bond indices don't carry over to a chain, so drop the pi bonds.
  return { shape: 'chain', size: mol.size, doubleBondAt: [], tripleBondAt: [], substituents: mol.substituents ?? [] }
}

/** Skeletal drawing → condensed structural formula. */
export function generateCondensed(seed) {
  const rng = rngFor(seed * 8191 + 23)
  const mol = randomChain(seed)
  const correct = condensedFormula(mol)

  const distractors = new Set()
  let guard = 0
  while (distractors.size < 3 && guard++ < 40) {
    const alt = randomChain(seed + guard * 37)
    const candidate = condensedFormula(alt)
    if (candidate && candidate !== correct) distractors.add(candidate)
  }
  if (distractors.size < 3) return null

  const choices = shuffleWith(rng, [correct, ...distractors])

  return {
    id: `skcond-${seed}`,
    topic: 'skeletal-fluency',
    kind: 'mcq',
    prompt: 'Which condensed structural formula matches this skeletal drawing?',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `Reading left to right and filling in the hidden hydrogens on each carbon gives ${correct}.`,
    teach: 'To expand a skeletal drawing, walk the chain one carbon at a time and write each carbon with the hydrogens needed to reach four bonds.',
    visual: { type: 'skeletal', molecule: mol },
  }
}

/** Condensed structural formula → skeletal drawing. */
export function generateCondensedToSkeletal(seed) {
  const rng = rngFor(seed * 3571 + 19)
  const mol = randomChain(seed)
  const correct = condensedFormula(mol)

  const alternatives = []
  let guard = 0
  while (alternatives.length < 3 && guard++ < 40) {
    const alt = randomChain(seed + guard * 53)
    const candidate = condensedFormula(alt)
    if (candidate && candidate !== correct && !alternatives.some((m) => condensedFormula(m) === candidate)) {
      alternatives.push(alt)
    }
  }
  if (alternatives.length < 3) return null

  const molecules = shuffleWith(rng, [mol, ...alternatives])

  return {
    id: `skcond2s-${seed}`,
    topic: 'skeletal-fluency',
    kind: 'mcq',
    prompt: `Which skeletal structure is ${correct}?`,
    choices: molecules.map((_, i) => `Structure ${'ABCD'[i]}`),
    choiceVisuals: molecules.map((m) => ({ type: 'skeletal', molecule: m })),
    correctIndex: molecules.indexOf(mol),
    explanation: `${correct} has ${mol.size} carbons in its chain${(mol.substituents ?? []).length ? `, with ${(mol.substituents ?? []).map((s) => s.label).join(' and ')} attached` : ''}.`,
    teach: 'Going the other way, draw a zigzag with one vertex per carbon, then hang the non-hydrogen groups off the right positions.',
  }
}

/** Hybridization of a specific carbon, read off the drawn structure. */
export function generateSkeletalHybridization(seed) {
  const rng = rngFor(seed * 2749 + 3)
  const mol = randomMolecule(seed)
  const vertex = Math.floor(rng() * mol.size)
  const hyb = hybridizationAt(mol, vertex)
  const choices = ['sp', 'sp2', 'sp3']

  return {
    id: `skhyb-${seed}`,
    topic: 'hybridization',
    kind: 'mcq',
    prompt: 'What is the hybridization of the circled carbon?',
    choices,
    correctIndex: choices.indexOf(hyb),
    explanation:
      hyb === 'sp3'
        ? 'All single bonds — 4 electron groups — so sp³.'
        : hyb === 'sp2'
          ? 'It sits in one double bond — 3 electron groups — so sp².'
          : 'It sits in two pi bonds — 2 electron groups — so sp.',
    teach: 'Shortcut for carbon: in a double bond → sp², in a triple bond or two double bonds → sp, otherwise sp³.',
    visual: { type: 'skeletal', molecule: mol, highlightVertex: vertex },
  }
}
