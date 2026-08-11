/** Deterministic seeded PRNG (mulberry32). Same seed always yields the same sequence. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

export function pickTwoDistinct(rng, arr) {
  const i = Math.floor(rng() * arr.length)
  let j = Math.floor(rng() * (arr.length - 1))
  if (j >= i) j += 1
  return [arr[i], arr[j]]
}
