const W = 300
const H = 176
const CX = 150
const CY = 72

/**
 * The shared amino acid backbone, drawn as the zwitterion that exists at
 * physiological pH, with the side chain marked as the one thing that
 * varies.
 *
 * Drawing it the same way for every residue is the point: nineteen of the
 * twenty differ ONLY in the group hanging below the alpha carbon. Proline
 * is the exception — its side chain loops back to the backbone nitrogen —
 * so it is labelled rather than drawn with a free R group.
 */
export default function AminoAcidDiagram({ sideChain, name, cyclic = false }) {
  const bond = (x1, y1, x2, y2) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e6edf7" strokeWidth="2" />
  )

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 330, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={`${name}: amino acid backbone with ${cyclic ? 'a side chain bonded back to the nitrogen' : `the side chain ${sideChain}`}`}
    >
      {/* backbone bonds */}
      {bond(CX - 52, CY, CX - 12, CY)}
      {bond(CX + 12, CY, CX + 52, CY)}
      {bond(CX, CY - 12, CX, CY - 34)}
      {bond(CX, CY + 12, CX, CY + 34)}

      {/* amino group, protonated at pH 7 */}
      <text x={CX - 62} y={CY + 5} fill="#93a3bb" fontSize="15" textAnchor="end">
        H₃N
      </text>
      <text x={CX - 60} y={CY - 8} fill="#38bdf8" fontSize="11" textAnchor="start">
        +
      </text>

      {/* carboxylate, deprotonated at pH 7 */}
      <text x={CX + 62} y={CY + 5} fill="#93a3bb" fontSize="15" textAnchor="start">
        COO
      </text>
      <text x={CX + 106} y={CY - 8} fill="#38bdf8" fontSize="11" textAnchor="start">
        −
      </text>

      {/* alpha carbon and its hydrogen */}
      <text x={CX} y={CY + 6} fill="#e6edf7" fontSize="15" textAnchor="middle">
        C
      </text>
      <text x={CX} y={CY - 38} fill="#93a3bb" fontSize="14" textAnchor="middle">
        H
      </text>

      {/* the side chain — the only part that differs */}
      <rect x={CX - 72} y={CY + 38} width="144" height="30" rx="7" fill="rgba(56,189,248,0.14)" stroke="#38bdf8" />
      <text x={CX} y={CY + 58} fill="#38bdf8" fontSize="14" textAnchor="middle" fontWeight="650">
        {cyclic ? 'ring to backbone N' : sideChain}
      </text>

      <text x={CX} y={H - 6} fill="#93a3bb" fontSize="10" textAnchor="middle">
        {cyclic ? `${name} — side chain bonds back to the nitrogen` : `${name} — backbone is identical for all 20`}
      </text>
    </svg>
  )
}
