import aminoAcids from '../data/genchem/aminoAcids.json'
import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'

/**
 * Amino acid drills — the thing biochemistry assumes from day one and
 * then never stops using.
 *
 * Every answer is read off one table, so a side chain, its class, its pKa
 * and its charge at physiological pH can never disagree across questions.
 */
const CLASSES = ['nonpolar', 'polar', 'acidic', 'basic']
const CLASS_LABEL = {
  nonpolar: 'Nonpolar / hydrophobic',
  polar: 'Polar, uncharged',
  acidic: 'Acidic (negative at pH 7.4)',
  basic: 'Basic (positive at pH 7.4)',
}

export function generateThreeLetter(seed) {
  if (seed >= aminoAcids.length * 2) return null
  const rng = rngFor(seed * 3301 + 11)
  const aa = aminoAcids[seed % aminoAcids.length]
  const nameToCode = seed < aminoAcids.length

  const { choices, correctIndex } = nameToCode
    ? makeChoices(rng, aa.three, aminoAcids.map((a) => a.three))
    : makeChoices(rng, aa.name, aminoAcids.map((a) => a.name))

  return {
    id: `aa3-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: nameToCode ? `What is the three-letter code for ${aa.name}?` : `Which amino acid is "${aa.three}"?`,
    choices,
    correctIndex,
    explanation: `${aa.name} = ${aa.three} = ${aa.one}.`,
    teach: 'Most three-letter codes are just the first three letters. The ones that are not: Asn/Gln (amides), Trp (tryptophan), Ile (isoleucine).',
  }
}

export function generateOneLetter(seed) {
  if (seed >= aminoAcids.length * 2) return null
  const rng = rngFor(seed * 7919 + 3)
  const aa = aminoAcids[seed % aminoAcids.length]
  const nameToCode = seed < aminoAcids.length

  const { choices, correctIndex } = nameToCode
    ? makeChoices(rng, aa.one, aminoAcids.map((a) => a.one))
    : makeChoices(rng, aa.name, aminoAcids.map((a) => a.name))

  return {
    id: `aa1-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: nameToCode ? `What is the one-letter code for ${aa.name}?` : `Which amino acid is "${aa.one}"?`,
    choices,
    correctIndex,
    explanation: `${aa.name} = ${aa.one}. ${aa.one === aa.name[0] ? 'Here the letter is just the first letter of the name.' : 'This one does NOT match the first letter — worth memorizing separately.'}`,
    teach: 'The awkward one-letter codes: R = Arg, K = Lys, D = Asp, E = Glu, N = Asn, Q = Gln, F = Phe, W = Trp, Y = Tyr.',
  }
}

export function generateClassify(seed) {
  if (seed >= aminoAcids.length) return null
  const rng = rngFor(seed * 601 + 29)
  const aa = aminoAcids[seed]
  const choices = shuffleWith(rng, CLASSES.map((c) => CLASS_LABEL[c]))

  return {
    id: `aaclass-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: `How is ${aa.name} (${aa.three}) classified?`,
    choices,
    correctIndex: choices.indexOf(CLASS_LABEL[aa.class]),
    explanation: `${aa.name} is ${aa.class}. Side chain: ${aa.sideChain}. ${aa.note}`,
    teach: 'Sort by side chain: carboxylate → acidic; amine, guanidinium or imidazole → basic; –OH, –SH or amide → polar; hydrocarbon or aromatic-with-no-polar-group → nonpolar.',
  }
}

export function generateChargeAtPh(seed) {
  if (seed >= aminoAcids.length) return null
  const rng = rngFor(seed * 4409 + 17)
  const aa = aminoAcids[seed]
  const label = { '-1': 'Negative (−1)', '0': 'Neutral (0)', '1': 'Positive (+1)' }
  const correct = label[String(aa.charge7)]
  const choices = shuffleWith(rng, Object.values(label))

  return {
    id: `aacharge-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: `At physiological pH (~7.4), what is the charge on the SIDE CHAIN of ${aa.name} (${aa.three})?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation:
      aa.pKaR == null
        ? `${aa.name}'s side chain has no ionizable group, so it stays neutral at any physiological pH.`
        : aa.charge7 === 0
          ? `Its side chain pKa is ~${aa.pKaR}. ${aa.pKaR > 7.4 ? 'Above' : 'Near'} pH 7.4 it is mostly ${aa.pKaR > 7.4 ? 'protonated and neutral' : 'in mixed protonation states, but conventionally counted as neutral'}.`
          : `Its side chain pKa is ~${aa.pKaR}, so at pH 7.4 it is ${aa.charge7 < 0 ? 'deprotonated and negative' : 'protonated and positive'}.`,
    teach: 'Compare the side-chain pKa with the pH. Below its pKa a group holds its proton; above it, the proton is gone. Asp/Glu (pKa ~4) are negative; Lys/Arg (pKa >10) are positive; His (pKa ~6) is the borderline case.',
  }
}

export function generateSideChainPka(seed) {
  const ionizable = aminoAcids.filter((a) => a.pKaR != null)
  if (seed >= ionizable.length) return null
  const rng = rngFor(seed * 2131 + 7)
  const aa = ionizable[seed]
  const others = ionizable.filter((a) => a.pKaR !== aa.pKaR).map((a) => a.pKaR)
  const { choices, correctIndex } = makeChoices(rng, aa.pKaR, others)

  return {
    id: `aapka-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: `Approximately what is the SIDE-CHAIN pKa of ${aa.name} (${aa.three})?`,
    choices,
    correctIndex,
    explanation: `${aa.name}: side-chain pKa ≈ ${aa.pKaR}. ${aa.note}`,
    teach: 'Seven side chains ionize: Asp 3.9, Glu 4.3, His 6.0, Cys 8.3, Tyr 10.1, Lys 10.5, Arg 12.5. Histidine at 6.0 is the one that matters most, since it is closest to physiological pH.',
  }
}

/** Pick the member of a class out of a mixed set — recognition, not recall. */
export function generatePickFromClass(seed) {
  const rng = rngFor(seed * 977 + 13)
  const targetClass = CLASSES[seed % CLASSES.length]
  const inClass = aminoAcids.filter((a) => a.class === targetClass)
  const outClass = aminoAcids.filter((a) => a.class !== targetClass)
  const answer = pick(rng, inClass)
  const distractors = pickN(rng, outClass, 3)
  if (!answer || distractors.length < 3) return null

  const options = shuffleWith(rng, [answer, ...distractors])
  const choices = options.map((a) => `${a.name} (${a.three})`)

  return {
    id: `aapick-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: `Which of these is ${targetClass === 'acidic' || targetClass === 'basic' ? `${targetClass}` : `a ${targetClass}`} amino acid?`,
    choices,
    correctIndex: options.indexOf(answer),
    explanation: `${answer.name} — side chain ${answer.sideChain}. ${answer.note}`,
    teach: 'There are only two acidic (Asp, Glu) and three basic (Lys, Arg, His). Everything else is polar or nonpolar, so learning those five gives you the rest by elimination.',
  }
}

/** The distinguishing facts biochem keeps coming back to. */
const SPECIALS = [
  { q: 'Which amino acid is the only ACHIRAL one?', a: 'Glycine', why: 'Its side chain is a hydrogen, so the alpha carbon carries two identical H atoms and is not a stereocenter.' },
  { q: 'Which amino acid forms DISULFIDE bridges?', a: 'Cysteine', why: 'Two cysteine thiols oxidize to a covalent S–S bond — the only covalent crosslink holding tertiary structure together.' },
  { q: 'Which amino acid disrupts alpha helices by kinking the backbone?', a: 'Proline', why: 'Its side chain rings back onto the backbone nitrogen, locking rotation and removing the amide hydrogen needed for helical hydrogen bonding.' },
  { q: 'Which amino acid always begins a newly translated protein?', a: 'Methionine', why: 'AUG is the start codon, so translation always begins with methionine (formylmethionine in bacteria).' },
  { q: 'Which amino acid has a side-chain pKa nearest physiological pH, making it the key active-site residue?', a: 'Histidine', why: 'Its imidazole pKa of ~6.0 means it can both accept and donate a proton near pH 7.4 — ideal for acid-base catalysis.' },
  { q: 'Which amino acid is the LARGEST?', a: 'Tryptophan', why: 'Its bicyclic indole ring is the bulkiest side chain, and drives protein absorbance at 280 nm.' },
  { q: 'Which amino acid is a secondary amine rather than a primary one?', a: 'Proline', why: 'Its nitrogen is part of the ring, bonded to two carbons — which is why it is sometimes called an imino acid.' },
  { q: 'Which amino acid has the most basic side chain?', a: 'Arginine', why: 'Its guanidinium group has a pKa of ~12.5 and is resonance-stabilized, so it stays protonated under all physiological conditions.' },
]

export function generateSpecial(seed) {
  if (seed >= SPECIALS.length) return null
  const rng = rngFor(seed * 8191 + 23)
  const s = SPECIALS[seed]
  const { choices, correctIndex } = makeChoices(rng, s.a, aminoAcids.map((a) => a.name))

  return {
    id: `aaspecial-${seed}`,
    topic: 'amino-acids',
    kind: 'mcq',
    prompt: s.q,
    choices,
    correctIndex,
    explanation: `${s.a}. ${s.why}`,
    teach: 'A handful of amino acids carry outsized weight: Gly (achiral, flexible), Pro (rigid, helix breaker), Cys (disulfides), His (catalysis), Met (start codon).',
  }
}
