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

/**
 * What makes two questions the same question. The visual is included
 * because many questions legitimately share a prompt and choice list and
 * differ only in the structure drawn.
 */
function contentSignature(q) {
  return JSON.stringify([
    q.prompt,
    q.choices ?? null,
    q.correctIndex ?? q.correctIndices ?? q.answer ?? null,
    q.visual ?? null,
    q.choiceVisuals ?? null,
  ])
}

/**
 * Deterministic bank: seed i always yields the same question, so SRS
 * progress stays attached to a stable question identity.
 *
 * Generators that sample from a small pool will repeat themselves once
 * the seed count exceeds the pool — asking for 24 questions about "how
 * many bonds does X form" when only 10 elements qualify. Duplicates are
 * dropped here rather than in each generator, so a bank is always as
 * large as its content actually supports and never larger. Asking for
 * more than a pool can supply is therefore harmless.
 */
export function buildBank(genFn, count, seedOffset = 0) {
  const out = []
  const seen = new Set()
  for (let i = 0; i < count; i++) {
    const q = genFn(seedOffset + i)
    if (!q) continue
    const sig = contentSignature(q)
    if (seen.has(sig)) continue
    seen.add(sig)
    // Every question a generator produces is the same idea with different
    // numbers in it. The family groups them so study time can be spent per
    // concept rather than per seed — asking for 90 seeds instead of 40 should
    // buy variety, not priority. Derived from the id rather than genFn.name
    // because identifiers get minified in a production build and ids do not.
    out.push({ family: q.id.replace(/-?\d+$/, '') || q.id, ...q })
  }
  return out
}
