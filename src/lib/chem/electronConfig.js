/**
 * Ground-state electron configuration, derived rather than tabulated.
 *
 * The order comes from the (n + ℓ) rule — lower n+ℓ fills first, and ties
 * break by lower n — which is the same thing the diagonal aufbau chart in
 * the app draws. Computing it means the chart, the configurations and the
 * questions cannot disagree; a hand-typed table is exactly how they would.
 *
 * Only valid for the main-group elements this app covers. Chromium and
 * copper break the rule by promoting an electron to half-fill or fill the
 * d subshell, and neither is in the set — `configFor` refuses anything it
 * cannot derive honestly rather than returning a wrong answer.
 */

const SUB = { s: 0, p: 1, d: 2, f: 3 }
const CAP = { s: 2, p: 6, d: 10, f: 14 }

/** Every subshell up to 7f, in filling order. */
export function fillingOrder() {
  const all = []
  for (let n = 1; n <= 7; n++) {
    for (const l of ['s', 'p', 'd', 'f']) {
      if (SUB[l] >= n) continue // 1p, 2d and so on do not exist
      all.push({ n, l, sum: n + SUB[l] })
    }
  }
  return all.sort((a, b) => a.sum - b.sum || a.n - b.n)
}

/** Elements whose real configuration breaks the aufbau order. */
export const AUFBAU_EXCEPTIONS = new Set([24, 29, 41, 42, 44, 45, 46, 47, 57, 58, 64, 78, 79, 89, 90, 91, 92, 93, 96])

const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const sup = (n) => String(n).split('').map((d) => SUPER[d]).join('')

/** Subshells and their occupancies for an atomic number. */
export function shellsFor(z) {
  if (!Number.isInteger(z) || z < 1) throw new Error(`bad atomic number: ${z}`)
  if (AUFBAU_EXCEPTIONS.has(z)) {
    throw new Error(`element ${z} breaks the aufbau order and cannot be derived`)
  }
  let left = z
  const out = []
  for (const s of fillingOrder()) {
    if (left <= 0) break
    const put = Math.min(left, CAP[s.l])
    out.push({ ...s, count: put })
    left -= put
  }
  if (left > 0) throw new Error(`ran out of subshells for ${z}`)
  return out
}

/** "1s² 2s² 2p⁶ 3s²" */
export function configFor(z) {
  return shellsFor(z)
    .map((s) => `${s.n}${s.l}${sup(s.count)}`)
    .join(' ')
}

/**
 * Electrons in the highest occupied shell — the valence count, which is
 * what actually predicts bonding. Counts s and p of the outermost n only,
 * which is the main-group definition this app teaches.
 */
export function valenceFor(z) {
  const shells = shellsFor(z)
  const outer = Math.max(...shells.map((s) => s.n))
  return shells.filter((s) => s.n === outer && (s.l === 's' || s.l === 'p')).reduce((t, s) => t + s.count, 0)
}

/** The noble gas core plus what follows, e.g. "[Ne] 3s²". */
const NOBLE = [2, 10, 18, 36, 54, 86]
const NOBLE_SYMBOL = { 2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr', 54: 'Xe', 86: 'Rn' }

export function shorthandFor(z) {
  const core = [...NOBLE].reverse().find((n) => n < z)
  if (!core) return configFor(z)
  const full = shellsFor(z)
  const coreShells = shellsFor(core).length
  const rest = full
    .slice(coreShells)
    .map((s) => `${s.n}${s.l}${sup(s.count)}`)
    .join(' ')
  return rest ? `[${NOBLE_SYMBOL[core]}] ${rest}` : `[${NOBLE_SYMBOL[core]}]`
}
