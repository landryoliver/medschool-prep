/**
 * Minimal molecule model for generated drill structures.
 *
 * A molecule is a carbon backbone (chain or ring) plus labelled
 * substituents hanging off numbered vertices. Everything the app needs —
 * implicit hydrogen counts, molecular formula, degrees of unsaturation —
 * is derived from this, so a generated structure and its stated answer
 * can never disagree.
 *
 *   { shape: 'chain'|'ring', size, doubleBondAt: [bondIndex], substituents: [{ vertexIndex, label }] }
 */

export const SUBSTITUENTS = {
  OH: { atoms: { O: 1, H: 1 }, name: 'hydroxyl', prefix: 'hydroxy' },
  SH: { atoms: { S: 1, H: 1 }, name: 'thiol', prefix: 'mercapto' },
  NH2: { atoms: { N: 1, H: 2 }, name: 'amine', prefix: 'amino' },
  F: { atoms: { F: 1 }, name: 'fluoro', prefix: 'fluoro' },
  Cl: { atoms: { Cl: 1 }, name: 'chloro', prefix: 'chloro' },
  Br: { atoms: { Br: 1 }, name: 'bromo', prefix: 'bromo' },
  I: { atoms: { I: 1 }, name: 'iodo', prefix: 'iodo' },
  CH3: { atoms: { C: 1, H: 3 }, name: 'methyl', prefix: 'methyl' },
  CH2CH3: { atoms: { C: 2, H: 5 }, name: 'ethyl', prefix: 'ethyl' },
  // Multiply-bonded and multi-atom groups, for functional-group drills.
  O: { atoms: { O: 1 }, name: 'carbonyl oxygen' },
  OCH3: { atoms: { O: 1, C: 1, H: 3 }, name: 'methoxy', prefix: 'methoxy' },
  N: { atoms: { N: 1 }, name: 'nitrile nitrogen' },
  NHCH3: { atoms: { N: 1, C: 1, H: 4 }, name: 'methylamino' },
}

/** Bond order from a carbon to its substituent (1 unless stated). */
export function substituentBondOrder(sub) {
  return sub.bond ?? 1
}

export function bondPairs(mol) {
  const pairs = []
  const bondCount = mol.shape === 'ring' ? mol.size : mol.size - 1
  for (let i = 0; i < bondCount; i++) pairs.push([i, (i + 1) % mol.size])
  return pairs
}

export function neighborCount(mol, vertexIndex) {
  if (mol.shape === 'ring') return 2
  const hasLeft = vertexIndex > 0
  const hasRight = vertexIndex < mol.size - 1
  return (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)
}

/** Extra bonds contributed by pi bonds at this vertex (one per double bond). */
export function piBondsAt(mol, vertexIndex) {
  const pairs = bondPairs(mol)
  return (mol.doubleBondAt ?? []).filter((b) => pairs[b] && pairs[b].includes(vertexIndex)).length
}

export function substituentsAt(mol, vertexIndex) {
  return (mol.substituents ?? []).filter((s) => s.vertexIndex === vertexIndex)
}

/** Implicit hydrogens on a backbone carbon: carbon always completes 4 bonds. */
export function hydrogensAt(mol, vertexIndex) {
  const subBonds = substituentsAt(mol, vertexIndex).reduce((n, s) => n + substituentBondOrder(s), 0)
  const used = neighborCount(mol, vertexIndex) + piBondsAt(mol, vertexIndex) + subBonds
  return Math.max(0, 4 - used)
}

const FORMULA_ORDER = ['C', 'H', 'Br', 'Cl', 'F', 'I', 'N', 'O', 'S']

export function atomCounts(mol) {
  const counts = { C: mol.size, H: 0 }
  for (let i = 0; i < mol.size; i++) counts.H += hydrogensAt(mol, i)
  for (const sub of mol.substituents ?? []) {
    const spec = SUBSTITUENTS[sub.label]
    if (!spec) continue
    for (const [el, n] of Object.entries(spec.atoms)) counts[el] = (counts[el] ?? 0) + n
  }
  return counts
}

export function molecularFormula(mol) {
  const counts = atomCounts(mol)
  const keys = [...new Set([...FORMULA_ORDER, ...Object.keys(counts)])]
  return keys
    .filter((el) => counts[el] > 0)
    .map((el) => (counts[el] === 1 ? el : `${el}${counts[el]}`))
    .join('')
}

/**
 * Condensed structural formula for a chain, e.g. CH3CH(Cl)CH2CH3.
 * Chains only — condensed notation for rings is ambiguous without extra
 * conventions, so ring structures are excluded from this drill.
 */
export function condensedFormula(mol) {
  if (mol.shape !== 'chain') return null
  const parts = []
  for (let i = 0; i < mol.size; i++) {
    const h = hydrogensAt(mol, i)
    let seg = 'C'
    if (h === 1) seg += 'H'
    else if (h > 1) seg += `H${h}`
    for (const sub of substituentsAt(mol, i)) {
      seg += substituentBondOrder(sub) === 2 ? `(=${sub.label})` : `(${sub.label})`
    }
    parts.push(seg)
    const isLast = i === mol.size - 1
    if (!isLast) parts.push((mol.doubleBondAt ?? []).includes(i) ? '=' : '')
  }
  return parts.join('')
}

/** Rings + pi bonds (backbone and substituent) — degrees of unsaturation. */
export function degreesOfUnsaturation(mol) {
  const subPi = (mol.substituents ?? []).reduce((n, s) => n + (substituentBondOrder(s) - 1), 0)
  return (mol.shape === 'ring' ? 1 : 0) + (mol.doubleBondAt ?? []).length + subPi
}

/** Total pi bonds at a carbon, counting double/triple bonds to substituents. */
export function totalPiAt(mol, vertexIndex) {
  const subPi = substituentsAt(mol, vertexIndex).reduce((n, s) => n + (substituentBondOrder(s) - 1), 0)
  return piBondsAt(mol, vertexIndex) + subPi
}

/** sp3 / sp2 / sp at a backbone carbon, from its number of pi bonds. */
export function hybridizationAt(mol, vertexIndex) {
  const pi = totalPiAt(mol, vertexIndex)
  if (pi >= 2) return 'sp'
  if (pi === 1) return 'sp2'
  return 'sp3'
}
