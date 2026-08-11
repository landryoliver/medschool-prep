import periodicTable from '../../data/genchem/periodicTable.json'
import { mulberry32, pickTwoDistinct } from '../../lib/prng.js'

const PROPERTIES = [
  { key: 'electronegativity', label: 'electronegativity', higherWord: 'higher' },
  { key: 'atomicRadiusPm', label: 'atomic radius', higherWord: 'larger' },
  { key: 'ionizationEnergyKJ', label: 'first ionization energy', higherWord: 'higher' },
]

/** Deterministic: same seed always reproduces the same comparison question. */
export function generateTrendQuestion(seed) {
  const rng = mulberry32(seed)
  const property = PROPERTIES[Math.floor(rng() * PROPERTIES.length)]
  const pool = periodicTable.filter((el) => el[property.key] != null)
  const [a, b] = pickTwoDistinct(rng, pool)

  const correctIndex = a[property.key] >= b[property.key] ? 0 : 1
  const choicesShuffled = rng() < 0.5 ? [a, b] : [b, a]
  const finalCorrectIndex = choicesShuffled[0].symbol === (correctIndex === 0 ? a.symbol : b.symbol) ? 0 : 1

  return {
    id: `trend-${seed}`,
    topic: 'periodic-trends',
    kind: 'mcq',
    prompt: `Which element has ${property.higherWord} ${property.label}: ${choicesShuffled[0].name} (${choicesShuffled[0].symbol}) or ${choicesShuffled[1].name} (${choicesShuffled[1].symbol})?`,
    choices: choicesShuffled.map((el) => `${el.name} (${el.symbol})`),
    correctIndex: finalCorrectIndex,
    explanation: `${choicesShuffled[finalCorrectIndex].name}: ${property.label} = ${choicesShuffled[finalCorrectIndex][property.key]}, vs ${choicesShuffled[1 - finalCorrectIndex].name}: ${choicesShuffled[1 - finalCorrectIndex][property.key]}.`,
  }
}

export function generateTrendQuestionBank(count, startSeed = 1) {
  const bank = []
  for (let i = 0; i < count; i++) bank.push(generateTrendQuestion(startSeed + i))
  return bank
}
