import periodicTable from '../data/genchem/periodicTable.json'
import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'

const ORGO = periodicTable.filter((e) => e.orgoCore)
const NAMED = periodicTable.filter((e) => e.electronegativity != null)
const ALL_NAMES = periodicTable.map((e) => e.name)
const ALL_SYMBOLS = periodicTable.map((e) => e.symbol)

/** Symbol -> name and name -> symbol, the fast mechanical recall drill. */
export function generateSymbolName(seed) {
  const rng = rngFor(seed)
  const el = pick(rng, periodicTable)
  const symbolToName = rng() < 0.5

  const { choices, correctIndex } = symbolToName
    ? makeChoices(rng, el.name, ALL_NAMES)
    : makeChoices(rng, el.symbol, ALL_SYMBOLS)

  return {
    id: `sym-${seed}`,
    topic: 'element-recall',
    kind: 'mcq',
    prompt: symbolToName ? `Which element is "${el.symbol}"?` : `What is the chemical symbol for ${el.name}?`,
    choices,
    correctIndex,
    explanation: `${el.symbol} = ${el.name} (atomic number ${el.atomicNumber}).`,
  }
}

/** Valence electron count — the number that drives everything else. */
export function generateValence(seed) {
  const rng = rngFor(seed)
  const el = pick(rng, periodicTable.filter((e) => e.group <= 2 || e.group >= 13))

  return {
    id: `val-${seed}`,
    topic: 'element-recall',
    kind: 'mcq',
    prompt: `How many valence electrons does a neutral ${el.name} (${el.symbol}) atom have?`,
    choices: ['1', '2', '3', '4', '5', '6', '7', '8'].slice(0, 8),
    correctIndex: el.valenceElectrons - 1,
    explanation: `${el.symbol} is in group ${el.group}, giving ${el.valenceElectrons} valence electrons.`,
    teach: 'For main-group elements, group 1-2 gives 1-2 valence electrons; groups 13-18 give (group number − 10).',
  }
}

/** Bonds typically formed — the "carbon makes 4" intuition. */
export function generateBondCount(seed) {
  const rng = rngFor(seed)
  const pool = ORGO.filter((e) => e.typicalBonds > 0)
  const el = pick(rng, pool)

  return {
    id: `bonds-${seed}`,
    topic: 'element-recall',
    kind: 'mcq',
    prompt: `How many covalent bonds does neutral ${el.name} (${el.symbol}) typically form?`,
    choices: ['1', '2', '3', '4'],
    correctIndex: el.typicalBonds - 1,
    explanation: `${el.symbol} normally forms ${el.typicalBonds} bond${el.typicalBonds === 1 ? '' : 's'} (it needs ${8 - el.valenceElectrons === 4 ? 4 : 8 - el.valenceElectrons} more electron${8 - el.valenceElectrons === 1 ? '' : 's'} to complete its octet).`,
    teach: 'Neutral-atom bonding pattern for orgo: C = 4, N = 3, O = 2, halogens and H = 1.',
  }
}

/** Forced-choice bond comparison, e.g. "which forms more bonds, N or O?" */
export function generateBondCompare(seed) {
  const rng = rngFor(seed)
  const pool = ORGO.filter((e) => e.typicalBonds > 0)
  let [a, b] = pickN(rng, pool, 2)
  if (a.typicalBonds === b.typicalBonds) return null
  if (rng() < 0.5) [a, b] = [b, a]

  const winner = a.typicalBonds > b.typicalBonds ? a : b
  const choices = [`${a.name} (${a.symbol})`, `${b.name} (${b.symbol})`]

  return {
    id: `bondcmp-${seed}`,
    topic: 'element-recall',
    kind: 'mcq',
    prompt: `Which forms MORE covalent bonds: ${a.name} (${a.symbol}) or ${b.name} (${b.symbol})?`,
    choices,
    correctIndex: winner === a ? 0 : 1,
    explanation: `${a.symbol} forms ${a.typicalBonds}, ${b.symbol} forms ${b.typicalBonds}.`,
  }
}

const PROPERTIES = [
  {
    key: 'electronegativity',
    label: 'electronegativity',
    higher: 'higher',
    why: 'Electronegativity increases up and to the right (excluding noble gases).',
  },
  {
    key: 'atomicRadiusPm',
    label: 'atomic radius',
    higher: 'larger',
    why: 'Atomic radius increases down and to the left.',
  },
  {
    key: 'ionizationEnergyKJ',
    label: 'first ionization energy',
    higher: 'higher',
    why: 'Ionization energy increases up and to the right — the opposite of atomic radius.',
  },
]

/** Two-element property comparison. */
export function generateTrendCompare(seed) {
  const rng = rngFor(seed)
  const property = pick(rng, PROPERTIES)
  const pool = periodicTable.filter((e) => e[property.key] != null)
  const [a, b] = pickN(rng, pool, 2)
  if (a[property.key] === b[property.key]) return null

  const winner = a[property.key] > b[property.key] ? a : b
  const choices = [`${a.name} (${a.symbol})`, `${b.name} (${b.symbol})`]

  return {
    id: `trend-${seed}`,
    topic: 'periodic-trends',
    kind: 'mcq',
    prompt: `Which has ${property.higher} ${property.label}: ${a.name} (${a.symbol}) or ${b.name} (${b.symbol})?`,
    choices,
    correctIndex: winner === a ? 0 : 1,
    explanation: `${winner.symbol} (${winner[property.key]}) vs ${(winner === a ? b : a).symbol} (${(winner === a ? b : a)[property.key]}). ${property.why}`,
    teach: property.why,
  }
}

/** Rank four elements by electronegativity, highest to lowest. */
export function generateENRanking(seed) {
  const rng = rngFor(seed)
  const chosen = pickN(rng, NAMED, 4)
  if (new Set(chosen.map((e) => e.electronegativity)).size !== 4) return null

  const sorted = [...chosen].sort((x, y) => y.electronegativity - x.electronegativity)
  const correct = sorted.map((e) => e.symbol).join(' > ')

  const distractors = new Set()
  let guard = 0
  while (distractors.size < 3 && guard++ < 40) {
    const candidate = shuffleWith(rng, chosen).map((e) => e.symbol).join(' > ')
    if (candidate !== correct) distractors.add(candidate)
  }
  if (distractors.size < 3) return null

  const choices = shuffleWith(rng, [correct, ...distractors])

  return {
    id: `enrank-${seed}`,
    topic: 'periodic-trends',
    kind: 'mcq',
    prompt: 'Rank these by electronegativity, HIGHEST first:',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: sorted.map((e) => `${e.symbol} ${e.electronegativity}`).join(' > '),
    teach: 'Electronegativity increases up and to the right. Rough orgo ordering to memorize: F > O > N ≈ Cl > Br > I ≈ S ≈ C > H.',
  }
}

const TREND_FACTS = [
  {
    prompt: 'Moving LEFT to RIGHT across a period, electronegativity generally:',
    correct: 'Increases',
    explanation: 'More protons pull the same-shell electrons in tighter, so the atom attracts bonding electrons more strongly.',
  },
  {
    prompt: 'Moving DOWN a group, electronegativity generally:',
    correct: 'Decreases',
    explanation: 'Valence electrons sit in shells further from the nucleus and are shielded, so the pull on bonding electrons weakens.',
  },
  {
    prompt: 'Moving LEFT to RIGHT across a period, atomic radius generally:',
    correct: 'Decreases',
    explanation: 'Increasing nuclear charge pulls the same valence shell inward.',
  },
  {
    prompt: 'Moving DOWN a group, atomic radius generally:',
    correct: 'Increases',
    explanation: 'Each row adds a new electron shell.',
  },
  {
    prompt: 'Moving LEFT to RIGHT across a period, first ionization energy generally:',
    correct: 'Increases',
    explanation: 'Electrons are held more tightly, so more energy is needed to remove one.',
  },
  {
    prompt: 'Moving DOWN a group, first ionization energy generally:',
    correct: 'Decreases',
    explanation: 'Outer electrons are further away and better shielded, so they are easier to remove.',
  },
]

/** Conceptual trend-direction recall. */
export function generateTrendDirection(seed) {
  const rng = rngFor(seed)
  const fact = TREND_FACTS[seed % TREND_FACTS.length]
  const choices = shuffleWith(rng, ['Increases', 'Decreases', 'Stays roughly constant', 'Varies with no pattern'])

  return {
    id: `trenddir-${seed}`,
    topic: 'periodic-trends',
    kind: 'mcq',
    prompt: fact.prompt,
    choices,
    correctIndex: choices.indexOf(fact.correct),
    explanation: fact.explanation,
    teach: 'Two master trends: electronegativity and ionization energy both increase up-and-right; atomic radius increases down-and-left.',
  }
}

const POLARITY_BANDS = [
  { max: 0.4, label: 'Nonpolar covalent' },
  { max: 1.7, label: 'Polar covalent' },
  { max: Infinity, label: 'Ionic' },
]

function classifyBond(delta) {
  return POLARITY_BANDS.find((b) => delta < b.max).label
}

/** Which atom carries delta-minus in a given bond. */
export function generatePolarityDirection(seed) {
  const rng = rngFor(seed)
  const pool = periodicTable.filter((e) => e.electronegativity != null && e.typicalBonds > 0)
  const [a, b] = pickN(rng, pool, 2)
  if (a.electronegativity === b.electronegativity) return null

  const negative = a.electronegativity > b.electronegativity ? a : b
  const delta = Math.abs(a.electronegativity - b.electronegativity).toFixed(2)
  const choices = [`${a.symbol}`, `${b.symbol}`, 'Neither — the bond is nonpolar']
  const isNonpolar = Number(delta) < 0.4

  return {
    id: `poldir-${seed}`,
    topic: 'bond-polarity',
    kind: 'mcq',
    prompt: `In a ${a.symbol}–${b.symbol} bond, which atom carries the partial negative charge (δ−)?`,
    choices,
    correctIndex: isNonpolar ? 2 : choices.indexOf(negative.symbol),
    explanation: isNonpolar
      ? `ΔEN = ${delta}, below ~0.4, so this bond is essentially nonpolar.`
      : `${negative.symbol} is more electronegative (${negative.electronegativity} vs ${(negative === a ? b : a).electronegativity}), so it pulls electron density toward itself. ΔEN = ${delta}.`,
    teach: 'The more electronegative atom in a polar bond always gets δ−; its partner gets δ+.',
    visual: { type: 'bondPolarity', a: a.symbol, b: b.symbol, deltaOn: isNonpolar ? null : negative.symbol },
  }
}

/** Classify a bond as nonpolar covalent / polar covalent / ionic. */
export function generatePolarityClass(seed) {
  const rng = rngFor(seed)
  const pool = periodicTable.filter((e) => e.electronegativity != null && e.typicalBonds > 0)
  const [a, b] = pickN(rng, pool, 2)
  const delta = Math.abs(a.electronegativity - b.electronegativity)
  const correct = classifyBond(delta)
  const choices = ['Nonpolar covalent', 'Polar covalent', 'Ionic']

  return {
    id: `polclass-${seed}`,
    topic: 'bond-polarity',
    kind: 'mcq',
    prompt: `How would you classify the ${a.symbol}–${b.symbol} bond?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `ΔEN = |${a.electronegativity} − ${b.electronegativity}| = ${delta.toFixed(2)} → ${correct.toLowerCase()}.`,
    teach: 'Rough cutoffs: ΔEN < 0.4 nonpolar covalent, 0.4–1.7 polar covalent, > 1.7 ionic.',
  }
}

/** Which of two bonds is more polar. */
export function generateMorePolarBond(seed) {
  const rng = rngFor(seed)
  const pool = periodicTable.filter((e) => e.electronegativity != null && e.typicalBonds > 0)
  const [a1, b1, a2, b2] = pickN(rng, pool, 4)
  const d1 = Math.abs(a1.electronegativity - b1.electronegativity)
  const d2 = Math.abs(a2.electronegativity - b2.electronegativity)
  if (Math.abs(d1 - d2) < 0.05) return null

  const choices = [`${a1.symbol}–${b1.symbol}`, `${a2.symbol}–${b2.symbol}`]

  return {
    id: `polcmp-${seed}`,
    topic: 'bond-polarity',
    kind: 'mcq',
    prompt: 'Which bond is MORE polar?',
    choices,
    correctIndex: d1 > d2 ? 0 : 1,
    explanation: `${choices[0]}: ΔEN = ${d1.toFixed(2)}. ${choices[1]}: ΔEN = ${d2.toFixed(2)}. Bigger ΔEN means more polar.`,
  }
}
