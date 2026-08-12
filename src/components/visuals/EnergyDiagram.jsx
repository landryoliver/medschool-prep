const W = 320
const H = 200
const PAD_L = 34
const PAD_R = 14
const PAD_T = 18
const PAD_B = 30

/**
 * Reaction coordinate diagram.
 *
 * `levels` alternates minima and maxima: [reactants, TS, intermediate,
 * TS, products]. Odd indices are peaks (transition states), even indices
 * are valleys (reactants, intermediates, products) — so the number of
 * steps and intermediates is derivable from the array rather than stated
 * separately, and a question can never disagree with its own picture.
 */
export default function EnergyDiagram({ levels, marks = [], showEa = false, eaStep = 0 }) {
  const min = Math.min(...levels)
  const max = Math.max(...levels)
  const span = max - min || 1

  const x = (i) => PAD_L + (i / (levels.length - 1)) * (W - PAD_L - PAD_R)
  const y = (v) => PAD_T + (1 - (v - min) / span) * (H - PAD_T - PAD_B)

  // Cubic segments with horizontal tangents at each extremum, so peaks and
  // valleys read as smooth turning points rather than corners.
  let d = `M ${x(0)} ${y(levels[0])}`
  for (let i = 1; i < levels.length; i++) {
    const x0 = x(i - 1)
    const x1 = x(i)
    const mid = (x0 + x1) / 2
    d += ` C ${mid} ${y(levels[i - 1])} ${mid} ${y(levels[i])} ${x1} ${y(levels[i])}`
  }

  const peakIdx = levels.map((_, i) => i).filter((i) => i % 2 === 1)
  const startIdx = eaStep * 2
  const tsIdx = startIdx + 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 360, display: 'block', margin: '0 auto' }}>
      {/* axes */}
      <line x1={PAD_L} y1={PAD_T - 6} x2={PAD_L} y2={H - PAD_B} stroke="#475569" strokeWidth="1" />
      <line x1={PAD_L} y1={H - PAD_B} x2={W - 6} y2={H - PAD_B} stroke="#475569" strokeWidth="1" />
      <text x={8} y={PAD_T + 40} fill="#93a3bb" fontSize="9" transform={`rotate(-90 8 ${PAD_T + 40})`}>
        Energy
      </text>
      <text x={(W + PAD_L) / 2} y={H - 8} fill="#93a3bb" fontSize="9" textAnchor="middle">
        Reaction progress
      </text>

      {showEa && (
        <g>
          <line
            x1={x(startIdx) + 6}
            y1={y(levels[startIdx])}
            x2={x(startIdx) + 6}
            y2={y(levels[tsIdx])}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <text x={x(startIdx) + 10} y={(y(levels[startIdx]) + y(levels[tsIdx])) / 2} fill="#38bdf8" fontSize="10">
            Ea
          </text>
        </g>
      )}

      <path d={d} fill="none" stroke="#e6edf7" strokeWidth="2" />

      {peakIdx.map((i) => (
        <circle key={`p${i}`} cx={x(i)} cy={y(levels[i])} r="2.5" fill="#f87171" />
      ))}

      {marks.map((m) => (
        <g key={m.label}>
          <circle cx={x(m.index)} cy={y(levels[m.index])} r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <text
            x={x(m.index)}
            y={y(levels[m.index]) - 12}
            fill="#38bdf8"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            {m.label}
          </text>
        </g>
      ))}

      <text x={x(0)} y={y(levels[0]) + 16} fill="#93a3bb" fontSize="9" textAnchor="start">
        reactants
      </text>
      <text x={x(levels.length - 1)} y={y(levels[levels.length - 1]) + 16} fill="#93a3bb" fontSize="9" textAnchor="end">
        products
      </text>
    </svg>
  )
}
