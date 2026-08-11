import { mulberry32 } from '../lib/prng.js'

export { mulberry32 }

export function rngFor(seed) {
  return mulberry32(seed)
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

/** n distinct items, deterministic for a given rng state. */
export function pickN(rng, arr, n) {
  const pool = [...arr]
  const out = []
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return out
}

export function shuffleWith(rng, arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Builds a multiple-choice answer set: the correct string plus distinct
 * distractors, shuffled. Returns the shuffled list and the correct index.
 */
export function makeChoices(rng, correct, distractorPool, count = 4) {
  const unique = [...new Set(distractorPool.map(String))].filter((d) => d !== String(correct))
  const chosen = pickN(rng, unique, Math.max(0, count - 1))
  const choices = shuffleWith(rng, [String(correct), ...chosen])
  return { choices, correctIndex: choices.indexOf(String(correct)) }
}

/** Deterministic bank: seed i always yields the same question, so SRS
 *  progress stays attached to a stable question identity. */
export function buildBank(genFn, count, seedOffset = 0) {
  const out = []
  for (let i = 0; i < count; i++) {
    const q = genFn(seedOffset + i)
    if (q) out.push(q)
  }
  return out
}
