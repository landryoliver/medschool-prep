/**
 * Interactive Lewis-structure builder for two-atom species.
 *
 * The user sets the bond order and the lone pairs on each atom; formal
 * charges and the electron budget are computed live from what they build,
 * so the +/− labels appear as consequences of their choices rather than
 * facts to memorize. Grading compares against the accepted structure.
 */
const SPECIES = [
  { formula: 'H₂ (hydrogen gas)', atoms: [{ symbol: 'H', valence: 1 }, { symbol: 'H', valence: 1 }], bond: 1, lonePairs: [0, 0], charge: 0,
    explanation: 'Two valence electrons total, and both go into the single H–H bond. Hydrogen only ever wants a duet (2 electrons).' },
  { formula: 'HF (hydrogen fluoride)', atoms: [{ symbol: 'H', valence: 1 }, { symbol: 'F', valence: 7 }], bond: 1, lonePairs: [0, 3], charge: 0,
    explanation: '1 + 7 = 8 electrons: one bonding pair plus three lone pairs on fluorine. F reaches a full octet, H reaches its duet.' },
  { formula: 'HCl (hydrogen chloride)', atoms: [{ symbol: 'H', valence: 1 }, { symbol: 'Cl', valence: 7 }], bond: 1, lonePairs: [0, 3], charge: 0,
    explanation: '8 electrons: one bond, three lone pairs on chlorine — the same pattern as every hydrogen halide.' },
  { formula: 'F₂ (fluorine gas)', atoms: [{ symbol: 'F', valence: 7 }, { symbol: 'F', valence: 7 }], bond: 1, lonePairs: [3, 3], charge: 0,
    explanation: '14 electrons: a single bond and three lone pairs on each fluorine completes both octets.' },
  { formula: 'Cl₂ (chlorine gas)', atoms: [{ symbol: 'Cl', valence: 7 }, { symbol: 'Cl', valence: 7 }], bond: 1, lonePairs: [3, 3], charge: 0,
    explanation: '14 electrons: single bond, three lone pairs each — halogens always pair up this way.' },
  { formula: 'Br₂ (bromine)', atoms: [{ symbol: 'Br', valence: 7 }, { symbol: 'Br', valence: 7 }], bond: 1, lonePairs: [3, 3], charge: 0,
    explanation: 'Same as every halogen dimer: one shared pair, three lone pairs apiece.' },
  { formula: 'O₂ (oxygen gas)', atoms: [{ symbol: 'O', valence: 6 }, { symbol: 'O', valence: 6 }], bond: 2, lonePairs: [2, 2], charge: 0,
    explanation: '12 electrons: a DOUBLE bond plus two lone pairs on each oxygen gives both a full octet. A single bond would leave each oxygen one pair short.' },
  { formula: 'N₂ (nitrogen gas)', atoms: [{ symbol: 'N', valence: 5 }, { symbol: 'N', valence: 5 }], bond: 3, lonePairs: [1, 1], charge: 0,
    explanation: '10 electrons: a TRIPLE bond and one lone pair on each nitrogen. This triple bond is why N₂ is so famously unreactive.' },
  { formula: 'CO (carbon monoxide)', atoms: [{ symbol: 'C', valence: 4 }, { symbol: 'O', valence: 6 }], bond: 3, lonePairs: [1, 1], charge: 0,
    explanation: '10 electrons: a triple bond with one lone pair on each atom satisfies both octets — but look at the formal charges it creates: C is −1 and O is +1. Completing octets can force charges onto atoms.' },
  { formula: 'OH⁻ (hydroxide, net charge −1)', atoms: [{ symbol: 'O', valence: 6 }, { symbol: 'H', valence: 1 }], bond: 1, lonePairs: [3, 0], charge: -1,
    explanation: '6 + 1 + 1 (for the negative charge) = 8 electrons: one bond and three lone pairs on oxygen. The formal charge lands on O: 6 − 6 − 1 = −1.' },
  { formula: 'HS⁻ (hydrosulfide, net charge −1)', atoms: [{ symbol: 'S', valence: 6 }, { symbol: 'H', valence: 1 }], bond: 1, lonePairs: [3, 0], charge: -1,
    explanation: 'Sulfur plays the same role oxygen does in hydroxide: one bond, three lone pairs, and the −1 formal charge.' },
  { formula: 'CN⁻ (cyanide, net charge −1)', atoms: [{ symbol: 'C', valence: 4 }, { symbol: 'N', valence: 5 }], bond: 3, lonePairs: [1, 1], charge: -1,
    explanation: '4 + 5 + 1 = 10 electrons: a triple bond with a lone pair on each atom, like N₂. The extra electron puts the −1 formal charge on CARBON (4 − 2 − 3 = −1), which is exactly where cyanide attacks from.' },
]

const fc = (valence, lp, bond) => valence - 2 * lp - bond

export function generateBuilder(seed) {
  const s = SPECIES[seed % SPECIES.length]
  const [a, b] = s.atoms
  const totalElectrons = a.valence + b.valence - s.charge
  const [lpA, lpB] = s.lonePairs
  const bondWord = s.bond === 3 ? 'triple' : s.bond === 2 ? 'double' : 'single'

  return {
    id: `build-${seed % SPECIES.length}`,
    topic: 'lewis-structures',
    kind: 'lewisBuilder',
    prompt: `Build the Lewis structure for ${s.formula}.`,
    build: { a, b, totalElectrons, charge: s.charge },
    answer: { bond: s.bond, lonePairs: [lpA, lpB] },
    answerText: `${bondWord} bond, ${lpA} lone pair${lpA === 1 ? '' : 's'} on ${a.symbol} and ${lpB} on ${b.symbol}`,
    explanation: s.explanation,
    teach: 'Count the total valence electrons first (add one per negative charge). Every electron must land somewhere: in the bond or in a lone pair. Then check each atom for its octet (duet for H) and read off the formal charges.',
    visual: {
      type: 'lewis',
      structure: {
        center: a.symbol,
        centerCharge: fc(a.valence, lpA, s.bond),
        centerLonePairs: lpA,
        ligands: [{ symbol: b.symbol, bond: s.bond, lonePairs: lpB, charge: fc(b.valence, lpB, s.bond) }],
      },
    },
    visualAfter: true,
  }
}
