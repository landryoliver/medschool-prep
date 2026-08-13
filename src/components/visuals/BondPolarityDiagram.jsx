/**
 * A single A–B bond. With `showDeltas` off it's a bare bond (ask the
 * question); on, it reveals partial charges and the dipole arrow
 * pointing toward the more electronegative atom.
 */
export default function BondPolarityDiagram({ a, b, deltaOn = null, showDeltas = false, height = 120 }) {
  return (
    <svg
      viewBox="-90 -50 180 100"
      style={{ width: '100%', maxHeight: height, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={
        showDeltas
          ? `${a} to ${b} bond${deltaOn ? `, partial negative charge on ${deltaOn}` : ', essentially nonpolar'}`
          : `A bond between ${a} and ${b}`
      }
    >
      <line x1="-46" y1="0" x2="46" y2="0" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="-84" y="-14" width="38" height="28" fill="var(--panel)" />
      <rect x="46" y="-14" width="38" height="28" fill="var(--panel)" />

      <text x="-62" y="0" fill="#e2e8f0" fontSize="19" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
        {a}
      </text>
      <text x="62" y="0" fill="#e2e8f0" fontSize="19" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
        {b}
      </text>

      {showDeltas && deltaOn && (
        <g>
          <text x="-62" y="-26" fill={deltaOn === a ? '#f87171' : '#38bdf8'} fontSize="14" textAnchor="middle">
            {deltaOn === a ? 'δ−' : 'δ+'}
          </text>
          <text x="62" y="-26" fill={deltaOn === b ? '#f87171' : '#38bdf8'} fontSize="14" textAnchor="middle">
            {deltaOn === b ? 'δ−' : 'δ+'}
          </text>
          <g stroke="#facc15" strokeWidth="2" fill="none">
            {deltaOn === b ? (
              <path d="M -30 26 L 30 26 M 22 21 L 30 26 L 22 31" />
            ) : (
              <path d="M 30 26 L -30 26 M -22 21 L -30 26 L -22 31" />
            )}
            <path d={deltaOn === b ? 'M -30 20 L -30 32' : 'M 30 20 L 30 32'} />
          </g>
        </g>
      )}
    </svg>
  )
}
