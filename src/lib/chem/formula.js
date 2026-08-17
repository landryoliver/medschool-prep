/**
 * Counting atoms in a condensed formula.
 *
 * Used in two places that must agree: the caption under an amino acid card
 * ("R = –(CH₂)₄NH₃⁺") and the labels written on the structure itself
 * ("CH₂", "COO⁻", "C(NH₂)₂⁺"). Both are hand-authored, so both get counted
 * and compared against the residue's known composition rather than trusted.
 */

const SUBSCRIPT = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 }

export const EMPTY = () => ({ C: 0, H: 0, N: 0, O: 0, S: 0 })

/** Counts C/H/N/O/S, handling parenthesised groups and their multipliers. */
export function parseFormula(src) {
  const s = [...src].filter((c) => !'–-⁺⁻ '.includes(c)).join('')
  let i = 0
  const readCount = () => {
    let n = ''
    while (i < s.length && SUBSCRIPT[s[i]] !== undefined) n += String(SUBSCRIPT[s[i++]])
    return n === '' ? 1 : Number(n)
  }
  const parse = (depth) => {
    const acc = EMPTY()
    while (i < s.length) {
      const c = s[i]
      if (c === '(') {
        i++
        const inner = parse(depth + 1)
        const mult = readCount()
        for (const k of Object.keys(acc)) acc[k] += inner[k] * mult
      } else if (c === ')') {
        if (depth === 0) throw new Error(`unbalanced ) in "${src}"`)
        i++
        return acc
      } else if ('CHNOS'.includes(c)) {
        i++
        acc[c] += readCount()
      } else {
        throw new Error(`unexpected "${c}" in "${src}"`)
      }
    }
    if (depth !== 0) throw new Error(`unbalanced ( in "${src}"`)
    return acc
  }
  return parse(0)
}

export function addCounts(into, from) {
  for (const k of Object.keys(into)) into[k] += from[k]
  return into
}
