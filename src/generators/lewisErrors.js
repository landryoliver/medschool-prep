import { rngFor, pick, shuffleWith } from './util.js'

/**
 * "Spot the error" Lewis drills.
 *
 * Starts from a correct species, then corrupts exactly one feature. A
 * quarter of the time nothing is corrupted — otherwise "something is
 * always wrong" replaces actually reading the structure.
 *
 * The lone-pair and bond faults recompute the drawn charge so the picture
 * stays internally consistent. Without that, changing the electron count
 * also invalidates the charge label and TWO of the four answers become
 * defensible. The charge fault is the only one that leaves a label
 * disagreeing with what is drawn, which is why that option is worded
 * about the drawing rather than about the species.
 */
const SPECIES = [
  { formula: 'NH₃', center: 'N', valence: 5, bonds: 3, lonePairs: 1, ligand: 'H' },
  { formula: 'H₂O', center: 'O', valence: 6, bonds: 2, lonePairs: 2, ligand: 'H' },
  { formula: 'CH₄', center: 'C', valence: 4, bonds: 4, lonePairs: 0, ligand: 'H' },
  { formula: 'NH₄⁺', center: 'N', valence: 5, bonds: 4, lonePairs: 0, ligand: 'H' },
  { formula: 'H₃O⁺', center: 'O', valence: 6, bonds: 3, lonePairs: 1, ligand: 'H' },
  { formula: 'OH⁻', center: 'O', valence: 6, bonds: 1, lonePairs: 3, ligand: 'H' },
  { formula: 'BH₃', center: 'B', valence: 3, bonds: 3, lonePairs: 0, ligand: 'H' },
  { formula: 'CH₃⁻', center: 'C', valence: 4, bonds: 3, lonePairs: 1, ligand: 'H' },
  { formula: 'CH₃⁺', center: 'C', valence: 4, bonds: 3, lonePairs: 0, ligand: 'H' },
  { formula: 'HF', center: 'F', valence: 7, bonds: 1, lonePairs: 3, ligand: 'H' },
  { formula: 'PH₃', center: 'P', valence: 5, bonds: 3, lonePairs: 1, ligand: 'H' },
  { formula: 'H₂S', center: 'S', valence: 6, bonds: 2, lonePairs: 2, ligand: 'H' },
]

const formalCharge = (bonds, lonePairs, valence) => valence - 2 * lonePairs - bonds

const FAULTS = {
  lonePairs: 'Wrong number of lone pairs for this species',
  charge: 'The formal charge label does not match the structure as drawn',
  bonds: 'Wrong number of bonds for this species',
  none: 'Nothing — this structure is correct',
}

const ALL_FAULTS = [FAULTS.lonePairs, FAULTS.charge, FAULTS.bonds, FAULTS.none]

export function generateSpotError(seed) {
  const rng = rngFor(seed * 6151 + 17)
  const s = SPECIES[seed % SPECIES.length]
  const trueCharge = formalCharge(s.bonds, s.lonePairs, s.valence)

  const fault = rng() < 0.25 ? 'none' : pick(rng, ['lonePairs', 'charge', 'bonds'])

  let bonds = s.bonds
  let lonePairs = s.lonePairs
  let explanation

  if (fault === 'lonePairs') {
    lonePairs = s.lonePairs > 0 && rng() < 0.5 ? s.lonePairs - 1 : s.lonePairs + 1
    explanation = `${s.formula} should have ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'} on ${s.center}, but ${lonePairs} ${lonePairs === 1 ? 'is' : 'are'} drawn. The charge label is consistent with what is drawn — it is the electron count that is wrong for ${s.formula}.`
  } else if (fault === 'bonds') {
    bonds = s.bonds + 1
    explanation = `${s.center} is drawn with ${bonds} bond${bonds === 1 ? '' : 's'}; ${s.formula} has ${s.bonds}. The charge label matches the drawing, so the fault is the bond count.`
  } else if (fault === 'charge') {
    explanation = `The structure as drawn (${bonds} bond${bonds === 1 ? '' : 's'}, ${lonePairs} lone pair${lonePairs === 1 ? '' : 's'}) has a formal charge of ${trueCharge}: ${s.valence} − ${2 * lonePairs} − ${bonds} = ${trueCharge}. A different charge is shown.`
  } else {
    explanation = `This is a correct structure for ${s.formula}: ${s.bonds} bond${s.bonds === 1 ? '' : 's'}, ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'}, formal charge ${trueCharge}.`
  }

  // Keep the drawing self-consistent unless the charge itself is the fault.
  const consistentCharge = formalCharge(bonds, lonePairs, s.valence)
  const shownCharge = fault === 'charge' ? trueCharge + (rng() < 0.5 ? 1 : -1) : consistentCharge

  const choices = shuffleWith(rng, ALL_FAULTS)

  return {
    id: `spoterr-${seed}`,
    topic: 'lewis-structures',
    kind: 'mcq',
    prompt: `This is meant to be ${s.formula}. What, if anything, is wrong with it?`,
    choices,
    correctIndex: choices.indexOf(FAULTS[fault]),
    explanation,
    teach: 'Check a Lewis structure in three passes: bond count, lone pairs, then formal charge (valence − nonbonding − ½ bonding).',
    visual: {
      type: 'lewis',
      structure: {
        center: s.center,
        centerCharge: shownCharge,
        centerLonePairs: lonePairs,
        ligands: Array.from({ length: bonds }, () => ({ symbol: s.ligand, bond: 1, lonePairs: 0 })),
      },
    },
  }
}
