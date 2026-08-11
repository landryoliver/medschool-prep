import { rngFor, pick, shuffleWith } from './util.js'

/**
 * Real, recognizable species enumerated by (bonds to H, lone pairs) on the
 * central atom. Every derived answer — formal charge, electron count,
 * octet status — is computed from these numbers, so the rendered Lewis
 * picture and the stated answer can't drift apart.
 */
const SPECIES = [
  { formula: 'CH₄', center: 'C', valence: 4, bonds: 4, lonePairs: 0 },
  { formula: 'CH₃⁺', center: 'C', valence: 4, bonds: 3, lonePairs: 0 },
  { formula: 'CH₃⁻', center: 'C', valence: 4, bonds: 3, lonePairs: 1 },
  { formula: 'NH₃', center: 'N', valence: 5, bonds: 3, lonePairs: 1 },
  { formula: 'NH₄⁺', center: 'N', valence: 5, bonds: 4, lonePairs: 0 },
  { formula: 'NH₂⁻', center: 'N', valence: 5, bonds: 2, lonePairs: 2 },
  { formula: 'H₂O', center: 'O', valence: 6, bonds: 2, lonePairs: 2 },
  { formula: 'H₃O⁺', center: 'O', valence: 6, bonds: 3, lonePairs: 1 },
  { formula: 'OH⁻', center: 'O', valence: 6, bonds: 1, lonePairs: 3 },
  { formula: 'H₂S', center: 'S', valence: 6, bonds: 2, lonePairs: 2 },
  { formula: 'HS⁻', center: 'S', valence: 6, bonds: 1, lonePairs: 3 },
  { formula: 'HF', center: 'F', valence: 7, bonds: 1, lonePairs: 3 },
  { formula: 'F⁻', center: 'F', valence: 7, bonds: 0, lonePairs: 4 },
  { formula: 'HCl', center: 'Cl', valence: 7, bonds: 1, lonePairs: 3 },
  { formula: 'Cl⁻', center: 'Cl', valence: 7, bonds: 0, lonePairs: 4 },
  { formula: 'Br⁻', center: 'Br', valence: 7, bonds: 0, lonePairs: 4 },
  { formula: 'BH₃', center: 'B', valence: 3, bonds: 3, lonePairs: 0 },
  { formula: 'BH₄⁻', center: 'B', valence: 3, bonds: 4, lonePairs: 0 },
  { formula: 'PH₃', center: 'P', valence: 5, bonds: 3, lonePairs: 1 },
  { formula: 'PH₄⁺', center: 'P', valence: 5, bonds: 4, lonePairs: 0 },
]

const formalCharge = (s) => s.valence - 2 * s.lonePairs - s.bonds
const electronsAround = (s) => 2 * s.bonds + 2 * s.lonePairs

function lewisVisual(s) {
  return {
    type: 'lewis',
    structure: {
      center: s.center,
      centerCharge: formalCharge(s),
      centerLonePairs: s.lonePairs,
      ligands: Array.from({ length: s.bonds }, () => ({ symbol: 'H', bond: 1, lonePairs: 0 })),
    },
  }
}

const FC_FORMULA = 'Formal charge = (valence electrons) − (nonbonding electrons) − ½(bonding electrons).'

/** Numeric formal-charge calculation on the central atom. */
export function generateFormalCharge(seed) {
  const s = SPECIES[seed % SPECIES.length]
  const fc = formalCharge(s)

  return {
    id: `fc-${seed % SPECIES.length}`,
    topic: 'formal-charge',
    kind: 'numeric',
    prompt: `What is the formal charge on the central ${s.center} atom in ${s.formula}?`,
    answer: fc,
    explanation: `${s.center}: ${s.valence} valence − ${2 * s.lonePairs} nonbonding − ${s.bonds} (half of ${2 * s.bonds} bonding) = ${fc}.`,
    teach: FC_FORMULA,
    visual: lewisVisual(s),
  }
}

/** Lone-pair counting straight off the drawn structure. */
export function generateLonePairCount(seed) {
  const s = SPECIES[seed % SPECIES.length]

  return {
    id: `lp-${seed % SPECIES.length}`,
    topic: 'lewis-structures',
    kind: 'mcq',
    prompt: `How many LONE PAIRS are on the central ${s.center} atom in ${s.formula}?`,
    choices: ['0', '1', '2', '3', '4'],
    correctIndex: s.lonePairs,
    explanation: `${s.formula} has ${s.bonds} bond${s.bonds === 1 ? '' : 's'} and ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'} on ${s.center}, giving ${electronsAround(s)} electrons around it.`,
    teach: 'Count bonds first, then fill the remaining valence electrons in as lone pairs.',
    visual: lewisVisual(s),
  }
}

/** Electron count around the central atom: octet, short, or expanded. */
export function generateOctetCheck(seed) {
  const s = SPECIES[seed % SPECIES.length]
  const count = electronsAround(s)
  const correct = `${count} — ${count === 8 ? 'a full octet' : count < 8 ? 'short of an octet' : 'an expanded octet'}`
  const candidates = [4, 6, 8, 10, 12]
    .filter((n) => n !== count)
    .map((n) => `${n} — ${n === 8 ? 'a full octet' : n < 8 ? 'short of an octet' : 'an expanded octet'}`)
  const choices = shuffleWith(rngFor(seed), [correct, ...candidates.slice(0, 3)])

  return {
    id: `octet-${seed % SPECIES.length}`,
    topic: 'lewis-structures',
    kind: 'mcq',
    prompt: `In ${s.formula}, how many electrons surround the central ${s.center} atom?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `${s.bonds} bond${s.bonds === 1 ? '' : 's'} × 2 + ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'} × 2 = ${count} electrons.`,
    teach: 'Boron is commonly stable with only 6 electrons; third-row elements like S and P can expand beyond 8.',
    visual: lewisVisual(s),
  }
}

/** Which species carries a given formal charge. */
export function generateChargeIdentify(seed) {
  const rng = rngFor(seed)
  const targetCharge = pick(rng, [1, -1])
  const matching = SPECIES.filter((s) => formalCharge(s) === targetCharge)
  const neutral = SPECIES.filter((s) => formalCharge(s) === 0)
  if (!matching.length || neutral.length < 3) return null

  const correct = pick(rng, matching)
  const distractors = shuffleWith(rng, neutral).slice(0, 3)
  const choices = shuffleWith(rng, [correct, ...distractors]).map((s) => s.formula)

  return {
    id: `fcid-${seed}`,
    topic: 'formal-charge',
    kind: 'mcq',
    prompt: `Which species has a formal charge of ${targetCharge > 0 ? '+1' : '−1'} on its central atom?`,
    choices,
    correctIndex: choices.indexOf(correct.formula),
    explanation: `${correct.formula}: ${correct.valence} valence − ${2 * correct.lonePairs} nonbonding − ${correct.bonds} bonding-half = ${targetCharge}.`,
    teach: FC_FORMULA,
  }
}
