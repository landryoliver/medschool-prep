const W = 320
const H = 118
const PAD = 22
const AXIS_Y = 62
const MIN_PH = 0
const MAX_PH = 14

/**
 * A pH number line with the pKa and the current pH marked.
 *
 * "Below the pKa it keeps its proton" is a sentence students memorize and
 * then misapply under pressure. Seeing the two values on one axis makes
 * the comparison spatial: whichever side of the pKa the pH lands on tells
 * you the protonation state directly, and the shaded region shows the
 * buffering range where both forms coexist.
 */
export default function PhScale({ pKa, pH, protonatedLabel = 'protonated', deprotonatedLabel = 'deprotonated' }) {
  const x = (v) => PAD + ((v - MIN_PH) / (MAX_PH - MIN_PH)) * (W - 2 * PAD)
  const protonated = pH < pKa

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 340, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={`pH scale: pKa ${pKa}, current pH ${pH}, so mostly ${protonated ? protonatedLabel : deprotonatedLabel}`}
    >
      {/* buffering range: pKa +/- 1, where both forms are present */}
      <rect x={x(pKa - 1)} y={AXIS_Y - 9} width={x(pKa + 1) - x(pKa - 1)} height="18" fill="rgba(56,189,248,0.16)" />

      <line x1={PAD} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y} stroke="#475569" strokeWidth="1.5" />
      {[0, 2, 4, 6, 8, 10, 12, 14].map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={AXIS_Y - 4} x2={x(t)} y2={AXIS_Y + 4} stroke="#475569" strokeWidth="1" />
          <text x={x(t)} y={AXIS_Y + 17} fill="#93a3bb" fontSize="8" textAnchor="middle">
            {t}
          </text>
        </g>
      ))}

      {/* side labels: which form dominates on each side of the pKa */}
      <text x={x(pKa) - 6} y={AXIS_Y - 16} fill="#93a3bb" fontSize="9" textAnchor="end">
        ← mostly {protonatedLabel}
      </text>
      <text x={x(pKa) + 6} y={AXIS_Y - 16} fill="#93a3bb" fontSize="9" textAnchor="start">
        mostly {deprotonatedLabel} →
      </text>

      {/* pKa marker */}
      <line x1={x(pKa)} y1={AXIS_Y - 12} x2={x(pKa)} y2={AXIS_Y + 12} stroke="#38bdf8" strokeWidth="2" />
      <text x={x(pKa)} y={AXIS_Y + 32} fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="700">
        pKa {pKa}
      </text>

      {/* current pH marker */}
      <polygon
        points={`${x(pH)},${AXIS_Y - 13} ${x(pH) - 5},${AXIS_Y - 24} ${x(pH) + 5},${AXIS_Y - 24}`}
        fill={protonated ? '#facc15' : '#4ade80'}
      />
      <text x={x(pH)} y={AXIS_Y - 28} fill={protonated ? '#facc15' : '#4ade80'} fontSize="10" textAnchor="middle" fontWeight="700">
        pH {pH}
      </text>

      <text x={W / 2} y={H - 4} fill="#93a3bb" fontSize="9" textAnchor="middle">
        pH is {protonated ? 'BELOW' : 'ABOVE'} the pKa → mostly {protonated ? protonatedLabel : deprotonatedLabel}
        {'   ·   shaded = buffering range (pKa ± 1)'}
      </text>
    </svg>
  )
}
