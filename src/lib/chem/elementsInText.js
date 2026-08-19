import TABLE from '../../data/genchem/periodicTable.json'

/**
 * Which elements a question is actually about, so the periodic-table cut
 * beside it shows those and nothing else.
 *
 * Matching bare capitals against prose is hopeless — "I", "C" and "N" are a
 * pronoun, a grade and a compass point, and "In" and "As" are words far more
 * often than they are indium and arsenic. So only FORMULA-shaped tokens
 * count: an uppercase letter, an optional lowercase, an optional count, and
 * nothing but more of the same until the token ends. "SF₆" and "PCl₅" match;
 * "Sulfur can expand its octet" does not, and neither does a sentence that
 * happens to start with "As".
 *
 * Missing a strip is a small loss. Showing the wrong element next to a
 * question is a wrong answer in disguise, so the bias is deliberate.
 */
const BY_SYMBOL = new Map(TABLE.map((e) => [e.symbol, e]))
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

// A whole token made only of element-and-count pieces, e.g. H₂O, PCl₅, CO2.
// A trailing ionic charge is allowed and discarded — without it NO₃⁻ failed
// to match at all, because the superscript minus is not a word boundary.
const FORMULA_TOKEN = /(?:^|[\s(])((?:[A-Z][a-z]?(?:[0-9₀-₉]+)?){1,6})[⁰-⁹⁺⁻]*(?=[\s).,;:?]|$)/g

// Two-letter symbols that are also ordinary English words. Harmless mid
// sentence, where a capital means a symbol, but "Be careful" opens a
// sentence and is not beryllium.
const WORD_LIKE = new Set(['Be', 'In', 'As', 'At', 'No', 'He', 'Am', 'Sn'])

/**
 * Topics where the strip would BE the answer.
 *
 * The periodic-table bank asks for atomic numbers, valence counts and group
 * positions — exactly what the strip prints. "What is the atomic number of
 * chlorine?" beside a card reading "17 Cl" is not a reference, it is the
 * answer key. Found by sweeping the real bank rather than by testing
 * invented sentences, which all looked fine — and the first fix used the
 * wrong id, because question topics are finer-grained than the topic list.
 *
 * Trend questions are NOT excluded: the strip tells you a group number, and
 * this app already hands out the whole periodic table during any session on
 * the grounds that every real exam supplies one. Only a question whose
 * ANSWER is printed on the card is a leak.
 */
const SELF_ANSWERING = new Set(['element-recall'])

// Carbon and hydrogen are in nearly every organic prompt and nobody needs
// them looked up. Showing them is clutter that buries the element you
// actually wanted.
const ASSUMED_KNOWN = new Set(['C', 'H'])

/** The elements worth showing beside a question, or none at all. */
export function referenceElementsFor(question) {
  if (!question || SELF_ANSWERING.has(question.topic)) return []
  return elementsInText(question.prompt).filter((s) => !ASSUMED_KNOWN.has(s))
}

export function elementsInText(text) {
  if (!text) return []
  const src = String(text)
  const found = new Set()
  for (const m of src.matchAll(FORMULA_TOKEN)) {
    const token = m[1]
    // Sentence-initial and word-like: treat as a word, not an element. A real
    // formula in that position almost always carries a count ("H₂O boils…").
    if (WORD_LIKE.has(token)) {
      const before = src.slice(0, m.index).trimEnd()
      if (before === '' || /[.!?:]$/.test(before)) continue
    }
    // A single bare capital is a letter in a sentence far more often than an
    // element, so a lone "C" or "I" never qualifies on its own.
    if (/^[A-Z]$/.test(token)) continue
    // Split into element+count pieces and require EVERY piece to be a known
    // element, or the token is an ordinary word like "No" or "In".
    const pieces = token.match(/[A-Z][a-z]?(?:[0-9₀-₉]+)?/g) ?? []
    const symbols = pieces.map((p) => p.replace(new RegExp(`[0-9${SUBSCRIPTS}]+$`), ''))
    if (!symbols.length || !symbols.every((s) => BY_SYMBOL.has(s))) continue
    // A multi-piece token is a formula; a single piece needs a count after it
    // ("O₂") or a two-letter symbol ("Cl") to be convincing.
    if (pieces.length === 1 && symbols[0].length === 1 && pieces[0] === symbols[0]) continue
    for (const s of symbols) found.add(s)
  }
  return [...found]
}
