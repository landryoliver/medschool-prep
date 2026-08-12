import periodicTable from '../data/genchem/periodicTable.json'
import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'

const ORGO = periodicTable.filter((e) => e.orgoCore)
const NAMED = periodicTable.filter((e) => e.electronegativity != null)

/**
 * Bonds that actually turn up in organic chemistry and on the MCAT,
 * with the classification a textbook would accept.
 *
 * Drawing two arbitrary elements from the table produces P–K and Ca–Br:
 * real compounds, but ones neither exam has any reason to ask about, and
 * answering them would mean memorizing numeric electronegativities that
 * no exam supplies.
 *
 * Classifications are stated rather than computed from the ΔEN cutoffs,
 * because those cutoffs are approximate and get two important cases
 * wrong. H–F comes out at 1.78 and would be labelled ionic, when it is a
 * covalent gas; C–H at 0.35 sits close enough to the 0.4 line that a
 * numeric guard would drop it, when it is the single most important bond
 * to know as nonpolar.
 */
const BONDS = [
  // Nonpolar covalent — carbon with atoms of similar electronegativity
  { a: 'C', b: 'H', cls: 'Nonpolar covalent' },
  { a: 'C', b: 'S', cls: 'Nonpolar covalent' },
  { a: 'C', b: 'I', cls: 'Nonpolar covalent' },
  { a: 'C', b: 'P', cls: 'Nonpolar covalent' },

  // Polar covalent — the bonds organic reactions actually happen at
  { a: 'C', b: 'O', cls: 'Polar covalent' },
  { a: 'C', b: 'N', cls: 'Polar covalent' },
  { a: 'C', b: 'F', cls: 'Polar covalent' },
  { a: 'C', b: 'Cl', cls: 'Polar covalent' },
  { a: 'C', b: 'Br', cls: 'Polar covalent' },
  { a: 'O', b: 'H', cls: 'Polar covalent' },
  { a: 'N', b: 'H', cls: 'Polar covalent' },
  { a: 'H', b: 'Cl', cls: 'Polar covalent' },
  { a: 'H', b: 'Br', cls: 'Polar covalent' },
  // Organometallics: polarized toward CARBON, unlike everything above
  { a: 'C', b: 'Mg', cls: 'Polar covalent' },
  { a: 'C', b: 'Li', cls: 'Polar covalent' },

  // Ionic — the canonical salts, for contrast
  { a: 'Na', b: 'Cl', cls: 'Ionic' },
  { a: 'K', b: 'Cl', cls: 'Ionic' },
  { a: 'K', b: 'Br', cls: 'Ionic' },
  { a: 'Na', b: 'Br', cls: 'Ionic' },
  { a: 'Li', b: 'F', cls: 'Ionic' },
  { a: 'Na', b: 'F', cls: 'Ionic' },
  { a: 'Mg', b: 'O', cls: 'Ionic' },
  { a: 'Ca', b: 'Cl', cls: 'Ionic' },
]

const bySymbol = new Map(periodicTable.map((e) => [e.symbol, e]))
const bondAtoms = (bond) => [bySymbol.get(bond.a), bySymbol.get(bond.b)]

/** Covalent bonds only — "which atom is δ−" is the wrong frame for a salt. */
const COVALENT_BONDS = BONDS.filter((x) => x.cls !== 'Ionic')

function pickBondPair(rng) {
  return bondAtoms(pick(rng, COVALENT_BONDS))
}
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

/** Atomic number recall, limited to the elements that actually appear in orgo. */
export function generateAtomicNumber(seed) {
  const rng = rngFor(seed * 89 + 5)
  const el = pick(rng, ORGO)
  const numberToSymbol = rng() < 0.5

  const { choices, correctIndex } = numberToSymbol
    ? makeChoices(rng, el.symbol, ORGO.map((e) => e.symbol))
    : makeChoices(rng, el.atomicNumber, periodicTable.map((e) => e.atomicNumber))

  return {
    id: `atno-${seed}`,
    topic: 'element-recall',
    kind: 'mcq',
    prompt: numberToSymbol
      ? `Which element has atomic number ${el.atomicNumber}?`
      : `What is the atomic number of ${el.name} (${el.symbol})?`,
    choices,
    correctIndex,
    explanation: `${el.name} (${el.symbol}) has ${el.atomicNumber} proton${el.atomicNumber === 1 ? '' : 's'}, so its atomic number is ${el.atomicNumber}.`,
    teach: 'Atomic number = number of protons = number of electrons in a neutral atom. The organic set: H 1, C 6, N 7, O 8, F 9, P 15, S 16, Cl 17, Br 35, I 53.',
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
    explanation: `${el.symbol} normally forms ${el.typicalBonds} bond${el.typicalBonds === 1 ? '' : 's'}. ${
      el.symbol === 'H'
        ? 'Hydrogen needs just one more electron to reach a duet (2), not an octet.'
        : el.symbol === 'B'
          ? 'Boron is an octet exception — it is stable with only 6 electrons.'
          : `Sharing ${el.typicalBonds} electron pair${el.typicalBonds === 1 ? '' : 's'} brings it to a full octet of 8.`
    }`,
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

// Minimum separation for a comparison to be a real question rather than a
// coin flip on textbook rounding.
const MIN_GAP = { electronegativity: 0.25, atomicRadiusPm: 12, ionizationEnergyKJ: 90 }

/**
 * Pairs where the simple "up and to the right" rule gives the wrong
 * answer. Half-filled and filled subshells create genuine exceptions, so
 * these need their own explanation rather than the generic trend line.
 */
const IE_EXCEPTIONS = {
  'N-O': 'Nitrogen has a half-filled 2p subshell, which is unusually stable, so it holds its electrons more tightly than oxygen despite being further left.',
  'Be-B': 'Beryllium has a filled 2s subshell, making it harder to ionize than boron even though boron is further right.',
  'Mg-Al': 'Magnesium has a filled 3s subshell, so it resists ionization more than aluminum.',
  'P-S': 'Phosphorus has a half-filled 3p subshell, making it harder to ionize than sulfur.',
}

/** Two-element property comparison. */
export function generateTrendCompare(seed) {
  const rng = rngFor(seed)
  const property = pick(rng, PROPERTIES)
  const pool = periodicTable.filter((e) => e[property.key] != null)
  const [a, b] = pickN(rng, pool, 2)
  const gap = Math.abs(a[property.key] - b[property.key])
  if (gap < MIN_GAP[property.key]) return null

  const winner = a[property.key] > b[property.key] ? a : b
  const loser = winner === a ? b : a
  const choices = [`${a.name} (${a.symbol})`, `${b.name} (${b.symbol})`]

  const key = [a.symbol, b.symbol].sort().join('-')
  const exception = property.key === 'ionizationEnergyKJ' ? IE_EXCEPTIONS[key] : null

  // "Up and to the right" only settles a comparison along ONE axis. For a
  // diagonal pair — one up-and-left, the other down-and-right — the two
  // halves of the trend point opposite ways and the rule answers nothing.
  // Li vs I is the standard example. There, metal-versus-nonmetal decides
  // it outright, which is why that resolver is given instead of the trend.
  const sameGroup = a.group === b.group
  const samePeriod = a.period === b.period
  const diagonal = !sameGroup && !samePeriod
  const crossesMetalLine = a.kind !== b.kind && a.kind !== 'metalloid' && b.kind !== 'metalloid'

  let reasoning
  if (exception) {
    reasoning = exception
  } else if (diagonal && crossesMetalLine) {
    const metal = a.kind === 'metal' ? a : b
    const nonmetal = metal === a ? b : a
    reasoning =
      `These sit diagonally, so "up and to the right" pulls both ways and cannot settle it. What does: ${metal.symbol} is a METAL and ${nonmetal.symbol} is a NONMETAL. ` +
      (property.key === 'atomicRadiusPm'
        ? 'Metals hold their outer electrons loosely and are larger; nonmetals pull them in tightly and are smaller.'
        : `Nonmetals hold electrons far more tightly, so a nonmetal always has ${property.higher} ${property.label} than a metal.`)
  } else if (sameGroup) {
    reasoning = `Same group, so compare down the column. ${property.why}`
  } else if (samePeriod) {
    reasoning = `Same period, so compare across the row. ${property.why}`
  } else {
    reasoning = property.why
  }

  return {
    id: `trend-${seed}`,
    topic: 'periodic-trends',
    kind: 'mcq',
    prompt: `Which has ${property.higher} ${property.label}: ${a.name} (${a.symbol}) or ${b.name} (${b.symbol})?`,
    choices,
    correctIndex: winner === a ? 0 : 1,
    explanation: `${winner.symbol} (${winner[property.key]}) vs ${loser.symbol} (${loser[property.key]}). ${reasoning}`,
    teach:
      exception
        ? 'Ionization energy generally rises up and to the right, but half-filled and filled subshells are stable enough to create exceptions.'
        : diagonal && crossesMetalLine
          ? 'For a diagonal comparison the up/right trend conflicts with itself. Fall back to metal versus nonmetal: nonmetals are more electronegative, harder to ionize, and smaller than metals — with essentially no exceptions.'
          : property.why,
  }
}

/** Rank four elements by electronegativity, highest to lowest. */
export function generateENRanking(seed) {
  const rng = rngFor(seed)
  const chosen = pickN(rng, NAMED, 4)
  const sorted = [...chosen].sort((x, y) => y.electronegativity - x.electronegativity)
  // Adjacent values must be far enough apart that the ordering is real.
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].electronegativity - sorted[i + 1].electronegativity < 0.25) return null
  }
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
  const [a, b] = pickBondPair(rng)
  if (a.symbol === b.symbol) return null
  const gap = Math.abs(a.electronegativity - b.electronegativity)
  // Above ~1.7 the bond is ionic, where "partial negative" is the wrong
  // framing — that range belongs to generatePolarityClass instead.
  if (gap > 1.7) return null

  const negative = a.electronegativity > b.electronegativity ? a : b
  const delta = gap.toFixed(2)
  const isNonpolar = gap < 0.4
  // Shuffled so the "neither" option isn't permanently the last button.
  const choices = shuffleWith(rng, [`${a.symbol}`, `${b.symbol}`, 'Neither — the bond is nonpolar'])

  return {
    id: `poldir-${seed}`,
    topic: 'bond-polarity',
    kind: 'mcq',
    prompt: `In a ${a.symbol}–${b.symbol} bond, which atom carries the partial negative charge (δ−)?`,
    choices,
    correctIndex: isNonpolar ? choices.indexOf('Neither — the bond is nonpolar') : choices.indexOf(negative.symbol),
    explanation: isNonpolar
      ? `ΔEN = ${delta}, below ~0.4, so this bond is essentially nonpolar.`
      : `${negative.symbol} is more electronegative (${negative.electronegativity} vs ${(negative === a ? b : a).electronegativity}), so it pulls electron density toward itself. ΔEN = ${delta}.`,
    teach: 'The more electronegative atom in a polar bond always gets δ−; its partner gets δ+.',
    visual: { type: 'bondPolarity', a: a.symbol, b: b.symbol, deltaOn: isNonpolar ? null : negative.symbol },
  }
}

/** Classify a bond as nonpolar covalent / polar covalent / ionic. */
export function generatePolarityClass(seed) {
  if (seed >= BONDS.length) return null
  const rng = rngFor(seed * 337 + 19)
  const bond = BONDS[seed]
  const [a, b] = bondAtoms(bond)
  const delta = Math.abs(a.electronegativity - b.electronegativity)
  const choices = shuffleWith(rng, ['Nonpolar covalent', 'Polar covalent', 'Ionic'])

  return {
    id: `polclass-${seed}`,
    topic: 'bond-polarity',
    kind: 'mcq',
    prompt: `How would you classify the ${a.symbol}–${b.symbol} bond?`,
    choices,
    correctIndex: choices.indexOf(bond.cls),
    explanation: `ΔEN = |${a.electronegativity} − ${b.electronegativity}| = ${delta.toFixed(2)} → ${bond.cls.toLowerCase()}.`,
    teach: 'Rough cutoffs: ΔEN < 0.4 nonpolar covalent, 0.4–1.7 polar covalent, > 1.7 ionic. They are guidelines, not laws — HF has ΔEN 1.78 yet is plainly covalent. No exam supplies the numbers, so learn the relative ordering instead.',
  }
}

/** Which of two bonds is more polar. */
export function generateMorePolarBond(seed) {
  const rng = rngFor(seed)
  const [a1, b1] = pickBondPair(rng)
  const [a2, b2] = pickBondPair(rng)
  if (a1.symbol === b1.symbol || a2.symbol === b2.symbol) return null
  if (`${a1.symbol}${b1.symbol}` === `${a2.symbol}${b2.symbol}`) return null
  const d1 = Math.abs(a1.electronegativity - b1.electronegativity)
  const d2 = Math.abs(a2.electronegativity - b2.electronegativity)
  if (Math.abs(d1 - d2) < 0.3) return null

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
