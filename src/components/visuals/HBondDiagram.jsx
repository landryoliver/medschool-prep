const W = 300
const H = 132

/**
 * Two molecules and the attraction between them.
 *
 * Every other diagram in the app draws a single molecule, which quietly
 * reinforces the wrong mental model for intermolecular forces — the whole
 * point is what happens BETWEEN molecules. Drawing two, with the gap
 * between them labelled, is the lesson.
 *
 * `kind` picks which force is shown: a hydrogen bond (dashed, labelled
 * donor and acceptor), a dipole-dipole pairing, or dispersion.
 */
export default function HBondDiagram({ kind = 'hbond' }) {
  const label = { hbond: 'Hydrogen bond', dipole: 'Dipole–dipole', dispersion: 'London dispersion' }[kind]
  const strength = { hbond: 'strongest', dipole: 'moderate', dispersion: 'weakest — but always present' }[kind]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 330, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={`Two molecules attracting: ${label}, ${strength}`}
    >
      {kind === 'hbond' && (
        <>
          {/* donor molecule: O-H */}
          <text x="42" y="52" fill="#e6edf7" fontSize="16" textAnchor="middle">O</text>
          <text x="30" y="38" fill="#38bdf8" fontSize="10" textAnchor="middle">δ−</text>
          <line x1="52" y1="52" x2="76" y2="52" stroke="#e6edf7" strokeWidth="2" />
          <text x="86" y="52" fill="#e6edf7" fontSize="16" textAnchor="middle">H</text>
          <text x="86" y="36" fill="#facc15" fontSize="10" textAnchor="middle">δ+</text>

          {/* the attraction itself */}
          <line x1="98" y1="52" x2="176" y2="52" stroke="#4ade80" strokeWidth="2" strokeDasharray="5 4" />
          <text x="137" y="42" fill="#4ade80" fontSize="9" textAnchor="middle">attraction</text>

          {/* acceptor molecule: lone pair on O */}
          <text x="190" y="52" fill="#e6edf7" fontSize="16" textAnchor="middle">O</text>
          <text x="178" y="38" fill="#38bdf8" fontSize="10" textAnchor="middle">δ−</text>
          <circle cx="184" cy="62" r="1.8" fill="#38bdf8" />
          <circle cx="192" cy="62" r="1.8" fill="#38bdf8" />
          <line x1="200" y1="52" x2="224" y2="52" stroke="#e6edf7" strokeWidth="2" />
          <text x="234" y="52" fill="#e6edf7" fontSize="16" textAnchor="middle">H</text>

          <text x="70" y="88" fill="#93a3bb" fontSize="9" textAnchor="middle">DONOR — H on N, O or F</text>
          <text x="212" y="88" fill="#93a3bb" fontSize="9" textAnchor="middle">ACCEPTOR — a lone pair</text>
        </>
      )}

      {kind === 'dipole' && (
        <>
          <rect x="26" y="36" width="92" height="34" rx="17" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" />
          <text x="46" y="58" fill="#facc15" fontSize="12" textAnchor="middle">δ+</text>
          <text x="98" y="58" fill="#38bdf8" fontSize="12" textAnchor="middle">δ−</text>

          <line x1="122" y1="53" x2="176" y2="53" stroke="#4ade80" strokeWidth="2" strokeDasharray="5 4" />

          <rect x="180" y="36" width="92" height="34" rx="17" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" />
          <text x="200" y="58" fill="#facc15" fontSize="12" textAnchor="middle">δ+</text>
          <text x="252" y="58" fill="#38bdf8" fontSize="12" textAnchor="middle">δ−</text>

          <text x={W / 2} y="88" fill="#93a3bb" fontSize="9" textAnchor="middle">
            the δ− end of one molecule attracts the δ+ end of the next
          </text>
        </>
      )}

      {kind === 'dispersion' && (
        <>
          <ellipse cx="76" cy="53" rx="48" ry="22" fill="rgba(147,163,187,0.14)" stroke="#93a3bb" />
          <text x="56" y="58" fill="#facc15" fontSize="11" textAnchor="middle">δ+</text>
          <text x="98" y="58" fill="#38bdf8" fontSize="11" textAnchor="middle">δ−</text>

          <line x1="128" y1="53" x2="172" y2="53" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="3 4" />

          <ellipse cx="224" cy="53" rx="48" ry="22" fill="rgba(147,163,187,0.14)" stroke="#93a3bb" />
          <text x="204" y="58" fill="#facc15" fontSize="11" textAnchor="middle">δ+</text>
          <text x="246" y="58" fill="#38bdf8" fontSize="11" textAnchor="middle">δ−</text>

          <text x={W / 2} y="88" fill="#93a3bb" fontSize="9" textAnchor="middle">
            a momentary lopsided electron cloud induces one next door
          </text>
        </>
      )}

      <text x={W / 2} y={H - 12} fill="#e6edf7" fontSize="11" textAnchor="middle" fontWeight="650">
        {label}
      </text>
      <text x={W / 2} y={H - 2} fill="#93a3bb" fontSize="8.5" textAnchor="middle">
        {strength}
      </text>
    </svg>
  )
}
