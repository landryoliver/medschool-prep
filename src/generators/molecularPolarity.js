import molecules from '../data/genchem/molecularPolarity.json'
import { rngFor, pick, pickN, shuffleWith } from './util.js'

/**
 * Whole-molecule polarity: does the molecule have a NET dipole, or do its
 * bond dipoles cancel by symmetry?
 *
 * Distinct from the bond-polarity drills, which only ask which end of a
 * single bond is δ−. CCl₄ has four strongly polar bonds and no net
 * dipole; that gap is what decides which intermolecular force applies.
 */
export function generateMoleculePolar(seed) {
  if (seed >= molecules.length) return null
  const rng = rngFor(seed * 6551 + 19)
  const m = molecules[seed]
  const correct = m.polar ? 'Polar' : 'Nonpolar'
  const choices = shuffleWith(rng, ['Polar', 'Nonpolar'])

  return {
    id: `mpol-${seed}`,
    topic: 'molecular-polarity',
    kind: 'mcq',
    prompt: `Is ${m.name} (${m.formula}) polar or nonpolar overall?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `${correct}. ${m.why}`,
    teach: 'Two things decide it: are the bonds polar, and does the SHAPE let those dipoles cancel? Polar bonds in a symmetric arrangement give a nonpolar molecule.',
  }
}

/** The key case: polar bonds that cancel anyway. */
export function generateCancelsBySymmetry(seed) {
  const rng = rngFor(seed * 811 + 37)
  const cancelling = molecules.filter((m) => m.polarBonds && !m.polar)
  const polarOnes = molecules.filter((m) => m.polar)
  if (seed >= cancelling.length) return null

  const answer = cancelling[seed]
  const distractors = pickN(rng, polarOnes, 3)
  if (distractors.length < 3) return null

  const options = shuffleWith(rng, [answer, ...distractors])
  const choices = options.map((m) => `${m.name} (${m.formula})`)

  return {
    id: `mpolsym-${seed}`,
    topic: 'molecular-polarity',
    kind: 'mcq',
    prompt: 'All four of these contain polar bonds. Which molecule is NONPOLAR overall?',
    choices,
    correctIndex: options.indexOf(answer),
    explanation: `${answer.name} (${answer.formula}). ${answer.why}`,
    teach: 'Symmetric shapes — linear with identical ends, trigonal planar, tetrahedral, octahedral — cancel their bond dipoles. Anything with a lone pair on the central atom, or with mismatched substituents, does not.',
  }
}

/** Why is it polar / nonpolar — the reasoning, not just the verdict. */
export function generatePolarityReason(seed) {
  const rng = rngFor(seed * 2273 + 13)
  if (seed >= molecules.length) return null
  const m = molecules[seed]

  const REASONS = {
    symmetric: 'Its bonds are polar, but the shape is symmetric so the dipoles cancel',
    nopolar: 'Its bonds are essentially nonpolar to begin with',
    lonepair: 'A lone pair on the central atom makes the shape asymmetric, so the dipoles do not cancel',
    mismatched: 'Its outer atoms are not all the same, so the dipoles do not cancel',
  }

  let key
  if (!m.polarBonds) key = 'nopolar'
  else if (!m.polar) key = 'symmetric'
  else if (m.lone > 0 && m.identicalLigands) key = 'lonepair'
  else key = 'mismatched'

  const choices = shuffleWith(rng, Object.values(REASONS))

  return {
    id: `mpolwhy-${seed}`,
    topic: 'molecular-polarity',
    kind: 'mcq',
    prompt: `${m.name} (${m.formula}) is ${m.polar ? 'POLAR' : 'NONPOLAR'} overall. Why?`,
    choices,
    correctIndex: choices.indexOf(REASONS[key]),
    explanation: m.why,
    teach: 'Three ways to end up nonpolar: nonpolar bonds, or polar bonds in a symmetric shape. Two ways to end up polar: a lone pair bending the shape, or outer atoms that differ.',
  }
}

/** Which of a pair is the more polar molecule — feeds boiling point reasoning. */
export function generateComparePolarity(seed) {
  const rng = rngFor(seed * 4051 + 7)
  const polarOnes = molecules.filter((m) => m.polar)
  const nonpolarOnes = molecules.filter((m) => !m.polar)
  const a = pick(rng, polarOnes)
  const b = pick(rng, nonpolarOnes)
  if (!a || !b) return null

  const first = rng() < 0.5
  const choices = first
    ? [`${a.name} (${a.formula})`, `${b.name} (${b.formula})`]
    : [`${b.name} (${b.formula})`, `${a.name} (${a.formula})`]

  return {
    id: `mpolcmp-${seed}`,
    topic: 'molecular-polarity',
    kind: 'mcq',
    prompt: `Which of these has a NET DIPOLE: ${choices[0]} or ${choices[1]}?`,
    choices,
    correctIndex: first ? 0 : 1,
    explanation: `${a.name}. ${a.why} By contrast, ${b.name} has no net dipole — ${b.why.charAt(0).toLowerCase()}${b.why.slice(1)}`,
    teach: 'Only molecules with a net dipole can use dipole-dipole attraction. A nonpolar molecule, however polar its individual bonds, has dispersion forces only.',
  }
}
