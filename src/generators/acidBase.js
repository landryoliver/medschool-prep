import pkaTable from '../data/genchem/pkaTable.json'
import { rngFor, pickN, shuffleWith, makeChoices } from './util.js'

const LOWER_PKA_RULE = 'Lower pKa = stronger acid. The weaker the acid, the stronger its conjugate base.'
const EQUILIBRIUM_RULE = 'Acid-base equilibria always favor the side with the WEAKER acid (the higher pKa).'

function fmt(entry) {
  return `${entry.acid} (pKa ${entry.pKa})`
}

/** Which of two acids is stronger. */
export function generateStrongerAcid(seed) {
  const rng = rngFor(seed)
  const [a, b] = pickN(rng, pkaTable, 2)
  if (a.pKa === b.pKa) return null

  const stronger = a.pKa < b.pKa ? a : b
  const choices = [fmt(a), fmt(b)]

  return {
    id: `acid-str-${seed}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: 'Which is the STRONGER acid?',
    choices,
    correctIndex: choices.indexOf(fmt(stronger)),
    explanation: `${stronger.acid} has the lower pKa (${stronger.pKa} vs ${(stronger === a ? b : a).pKa}), so it donates its proton more readily.`,
    teach: LOWER_PKA_RULE,
  }
}

/** Which of two conjugate bases is stronger — the inverse relationship. */
export function generateStrongerBase(seed) {
  const rng = rngFor(seed)
  const [a, b] = pickN(rng, pkaTable, 2)
  if (a.pKa === b.pKa) return null

  // The stronger base comes from the WEAKER acid (higher pKa).
  const stronger = a.pKa > b.pKa ? a : b
  const choices = [`${a.base} (from ${a.acid}, pKa ${a.pKa})`, `${b.base} (from ${b.acid}, pKa ${b.pKa})`]

  return {
    id: `base-str-${seed}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: 'Which is the STRONGER base?',
    choices,
    correctIndex: stronger === a ? 0 : 1,
    explanation: `${stronger.base} is the conjugate base of ${stronger.acid}, the weaker acid (pKa ${stronger.pKa}). A weak acid holds its proton tightly, so its conjugate base grabs protons strongly.`,
    teach: LOWER_PKA_RULE,
  }
}

/** Name the conjugate base of a given acid. */
export function generateConjugateBase(seed) {
  const rng = rngFor(seed)
  const entry = pkaTable[seed % pkaTable.length]
  const { choices, correctIndex } = makeChoices(rng, entry.base, pkaTable.map((e) => e.base))

  return {
    id: `conjbase-${seed % pkaTable.length}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: `What is the conjugate base of ${entry.acid}?`,
    choices,
    correctIndex,
    explanation: `Removing one H⁺ from ${entry.acid} gives ${entry.base} (${entry.baseName}).`,
    teach: 'Conjugate base = the acid minus one proton. The charge drops by exactly one.',
  }
}

/** Name the conjugate acid of a given base. */
export function generateConjugateAcid(seed) {
  const rng = rngFor(seed)
  const entry = pkaTable[seed % pkaTable.length]
  const { choices, correctIndex } = makeChoices(rng, entry.acid, pkaTable.map((e) => e.acid))

  return {
    id: `conjacid-${seed % pkaTable.length}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: `What is the conjugate acid of ${entry.base}?`,
    choices,
    correctIndex,
    explanation: `Adding one H⁺ to ${entry.base} gives ${entry.acid} (${entry.acidName}).`,
    teach: 'Conjugate acid = the base plus one proton. The charge rises by exactly one.',
  }
}

/**
 * Direction of proton transfer: HA + B⁻ ⇌ A⁻ + HB.
 * Favorable when the acid consumed is stronger than the acid produced.
 */
export function generateProtonTransfer(seed) {
  const rng = rngFor(seed)
  const [acidEntry, baseEntry] = pickN(rng, pkaTable, 2)
  if (Math.abs(acidEntry.pKa - baseEntry.pKa) < 2) return null

  const productsFavored = acidEntry.pKa < baseEntry.pKa
  const choices = [
    'Products (the reaction proceeds to the right)',
    'Reactants (the reaction barely proceeds)',
    'Neither — the two sides are equally favored',
  ]

  return {
    id: `ptrans-${seed}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: `${acidEntry.acid} (pKa ${acidEntry.pKa}) is mixed with ${baseEntry.base}, the conjugate base of ${baseEntry.acid} (pKa ${baseEntry.pKa}). Which side does the equilibrium favor?`,
    choices,
    correctIndex: productsFavored ? 0 : 1,
    explanation: productsFavored
      ? `${acidEntry.acid} (pKa ${acidEntry.pKa}) is the stronger acid, so it hands its proton to ${baseEntry.base}. The products contain ${baseEntry.acid} (pKa ${baseEntry.pKa}), the weaker acid — so products win.`
      : `${baseEntry.acid} (pKa ${baseEntry.pKa}) is the stronger acid here, so the proton stays put. Reacting would create the STRONGER acid ${baseEntry.acid} from the weaker acid ${acidEntry.acid} (pKa ${acidEntry.pKa}), which is uphill.`,
    teach: EQUILIBRIUM_RULE,
  }
}

/** Rank four acids by strength. */
export function generateAcidRanking(seed) {
  const rng = rngFor(seed)
  const chosen = pickN(rng, pkaTable, 4)
  if (new Set(chosen.map((e) => e.pKa)).size !== 4) return null

  const sorted = [...chosen].sort((x, y) => x.pKa - y.pKa)
  const correct = sorted.map((e) => e.acid).join(' > ')

  const distractors = new Set()
  let guard = 0
  while (distractors.size < 3 && guard++ < 40) {
    const candidate = shuffleWith(rng, chosen).map((e) => e.acid).join(' > ')
    if (candidate !== correct) distractors.add(candidate)
  }
  if (distractors.size < 3) return null

  const choices = shuffleWith(rng, [correct, ...distractors])

  return {
    id: `acidrank-${seed}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: 'Rank these by acidity, STRONGEST acid first:',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: sorted.map((e) => `${e.acid} (${e.pKa})`).join(' > '),
    teach: LOWER_PKA_RULE,
  }
}

/** Recall the approximate pKa of a common orgo acid class. */
export function generatePkaRecall(seed) {
  const rng = rngFor(seed)
  const entry = pkaTable[seed % pkaTable.length]
  const { choices, correctIndex } = makeChoices(rng, entry.pKa, pkaTable.map((e) => e.pKa))

  return {
    id: `pkarecall-${seed % pkaTable.length}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: `Approximately what is the pKa of ${entry.acid} (${entry.acidName})?`,
    choices,
    correctIndex,
    explanation: `${entry.acidName} has a pKa around ${entry.pKa}.`,
    teach: 'Anchor values worth memorizing: HCl ≈ −7, H₃O⁺ ≈ −1.7, carboxylic acid ≈ 4.8, ammonium ≈ 9-10, water ≈ 15.7, alcohol ≈ 16, terminal alkyne ≈ 25, ammonia ≈ 38, alkane ≈ 50.',
  }
}

/** Bronsted-Lowry / Lewis role identification. */
const ROLE_FACTS = [
  { prompt: 'A Bronsted-Lowry acid is best defined as a species that:', correct: 'Donates a proton (H⁺)', wrong: ['Accepts a proton (H⁺)', 'Donates an electron pair', 'Accepts an electron pair'] },
  { prompt: 'A Bronsted-Lowry base is best defined as a species that:', correct: 'Accepts a proton (H⁺)', wrong: ['Donates a proton (H⁺)', 'Donates an electron pair', 'Accepts an electron pair'] },
  { prompt: 'A Lewis acid is best defined as a species that:', correct: 'Accepts an electron pair', wrong: ['Donates an electron pair', 'Donates a proton (H⁺)', 'Accepts a proton (H⁺)'] },
  { prompt: 'A Lewis base is best defined as a species that:', correct: 'Donates an electron pair', wrong: ['Accepts an electron pair', 'Donates a proton (H⁺)', 'Accepts a proton (H⁺)'] },
]

export function generateAcidBaseRole(seed) {
  const rng = rngFor(seed)
  const fact = ROLE_FACTS[seed % ROLE_FACTS.length]
  const choices = shuffleWith(rng, [fact.correct, ...fact.wrong])

  return {
    id: `abrole-${seed % ROLE_FACTS.length}`,
    topic: 'acid-base',
    kind: 'mcq',
    prompt: fact.prompt,
    choices,
    correctIndex: choices.indexOf(fact.correct),
    explanation: `${fact.prompt.replace(' is best defined as a species that:', '')} → ${fact.correct.toLowerCase()}.`,
    teach: 'Bronsted-Lowry tracks protons; Lewis tracks electron pairs. Every Bronsted base is also a Lewis base, since accepting a proton means donating an electron pair to it.',
  }
}
