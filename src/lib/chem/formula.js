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
  // Subscript digits and plain ASCII digits both count, so a formula copied
  // from a reference ("C5H5N5") parses the same as one typed for display
  // ("C₅H₅N₅").
  const digit = (c) => (SUBSCRIPT[c] !== undefined ? SUBSCRIPT[c] : c >= '0' && c <= '9' ? Number(c) : undefined)
  const readCount = () => {
    let n = ''
    while (i < s.length && digit(s[i]) !== undefined) n += String(digit(s[i++]))
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
