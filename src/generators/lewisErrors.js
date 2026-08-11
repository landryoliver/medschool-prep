import { rngFor, pick } from './util.js'

/**
 * "Spot the error" Lewis drills.
 *
 * Starts from a correct species, then deliberately corrupts exactly one
 * feature and asks the user to name the fault. A quarter of the time
 * nothing is corrupted — otherwise "something is always wrong" becomes
 * the shortcut answer instead of actually reading the structure.
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
  lonePairs: 'The central atom has the wrong number of lone pairs',
  charge: 'The formal charge shown is wrong',
  bonds: 'The central atom has the wrong number of bonds',
  none: 'Nothing — this structure is correct',
}

const CHOICES = [FAULTS.lonePairs, FAULTS.charge, FAULTS.bonds, FAULTS.none]

export function generateSpotError(seed) {
  const rng = rngFor(seed * 6151 + 17)
  const s = SPECIES[seed % SPECIES.length]
  const trueCharge = formalCharge(s.bonds, s.lonePairs, s.valence)

  const fault = rng() < 0.25 ? 'none' : pick(rng, ['lonePairs', 'charge', 'bonds'])

  let bonds = s.bonds
  let lonePairs = s.lonePairs
  let shownCharge = trueCharge
  let explanation

  if (fault === 'lonePairs') {
    // Shift the lone pairs but keep the charge label truthful for the real
    // species, so the drawn electron count is what gives the error away.
    lonePairs = s.lonePairs > 0 && rng() < 0.5 ? s.lonePairs - 1 : s.lonePairs + 1
    explanation = `${s.formula} should have ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'} on ${s.center}, but ${lonePairs} ${lonePairs === 1 ? 'is' : 'are'} drawn. With ${s.bonds} bond${s.bonds === 1 ? '' : 's'}, ${s.center} needs ${s.lonePairs} to account for all ${s.valence} of its valence electrons.`
  } else if (fault === 'charge') {
    shownCharge = trueCharge + (rng() < 0.5 ? 1 : -1)
    explanation = `As drawn (${s.bonds} bond${s.bonds === 1 ? '' : 's'}, ${lonePairs} lone pair${lonePairs === 1 ? '' : 's'}), the formal charge should be ${trueCharge}: ${s.valence} − ${2 * lonePairs} − ${s.bonds} = ${trueCharge}. The structure shows ${shownCharge}.`
  } else if (fault === 'bonds') {
    bonds = s.bonds + 1
    explanation = `${s.center} is drawn with ${bonds} bonds. In ${s.formula} it should have ${s.bonds}${s.center === 'C' || s.center === 'N' || s.center === 'O' ? `, since ${bonds} bonds plus ${lonePairs * 2} nonbonding electrons would exceed a full octet` : ''}.`
  } else {
    explanation = `This is a correct structure for ${s.formula}: ${s.bonds} bond${s.bonds === 1 ? '' : 's'}, ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'}, formal charge ${trueCharge}.`
  }

  return {
    id: `spoterr-${seed}`,
    topic: 'lewis-structures',
    kind: 'mcq',
    prompt: `This is meant to be ${s.formula}. What, if anything, is wrong with it?`,
    choices: CHOICES,
    correctIndex: CHOICES.indexOf(FAULTS[fault]),
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
