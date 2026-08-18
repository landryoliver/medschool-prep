import { useEffect, useState } from 'react'

/**
 * Which way the amino acid structures are drawn, remembered between visits.
 *
 * Organic chemistry drills skeletal notation; a biochemistry amino acid
 * chart writes every CH₂ out. Both courses are running at once, so the
 * choice belongs to the reader rather than to whichever one I picked.
 */
const STORE_KEY = 'orgoprep.notation'

export const NOTATIONS = [
  { id: 'skeletal', label: 'Skeletal', hint: 'Corners are carbons — orgo standard.' },
  { id: 'written', label: 'Written out', hint: 'Every carbon named — biochem chart style.' },
]

export function useNotation() {
  const [notation, setNotation] = useState(() => {
    try {
      const v = localStorage.getItem(STORE_KEY)
      return v === 'written' || v === 'skeletal' ? v : 'skeletal'
    } catch {
      return 'skeletal'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, notation)
    } catch {
      /* a preference failing to persist must not break the card */
    }
  }, [notation])

  return [notation, setNotation]
}
