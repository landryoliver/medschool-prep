const W = 300
const H = 190

/**
 * The diagonal (aufbau) chart — the standard way to recall filling order
 * without memorizing a nineteen-item sequence.
 *
 * Write the subshells in rows by shell number, then read the diagonals
 * from top right to bottom left. The order falls out of the geometry,
 * which is why this is worth drawing rather than listing.
 */
const ROWS = [
  ['1s'],
  ['2s', '2p'],
  ['3s', '3p', '3d'],
  ['4s', '4p', '4d', '4f'],
  ['5s', '5p', '5d', '5f'],
  ['6s', '6p', '6d'],
  ['7s', '7p'],
]

const COL_W = 38
const ROW_H = 24
const X0 = 26
const Y0 = 20

export default function AufbauDiagram({ highlightThrough = null }) {
  const cells = []
  const order = []

  ROWS.forEach((row, r) => {
    row.forEach((label, c) => {
      cells.push({ label, r, c, x: X0 + c * COL_W, y: Y0 + r * ROW_H })
    })
  })

  // Each diagonal is a constant (row + col), which is the (n + l) sum the
  // aufbau principle actually orders by. Within a diagonal, the lower
  // shell comes first — so read top-right DOWN to bottom-left, meaning
  // ASCENDING row. Traversing the other way yields 1s 2s 3s 2p …, which
  // is not the filling order.
  const maxSum = ROWS.length + 3
  for (let s = 0; s <= maxSum; s++) {
    for (let r = 0; r < ROWS.length; r++) {
      const c = s - r
      const cell = cells.find((x) => x.r === r && x.c === c)
      if (cell) order.push(cell)
    }
  }

  const cutoff = highlightThrough ? order.findIndex((c) => c.label === highlightThrough) : -1

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 330, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="Aufbau chart: subshells in rows by shell number, read diagonally for filling order 1s, 2s, 2p, 3s, 3p, 4s, 3d"
    >
      {/* diagonal guides, drawn behind the labels */}
      {Array.from({ length: maxSum + 1 }, (_, s) => {
        const on = order.filter((c) => c.r + c.c === s)
        if (on.length < 2) return null
        const first = on[0]
        const last = on[on.length - 1]
        return (
          <line
            key={s}
            x1={first.x + 22}
            y1={first.y - 4}
            x2={last.x + 4}
            y2={last.y + 6}
            stroke="#38bdf8"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
        )
      })}

      {cells.map((cell) => {
        const idx = order.indexOf(cell)
        const used = cutoff >= 0 && idx <= cutoff
        return (
          <text
            key={cell.label}
            x={cell.x}
            y={cell.y}
            fill={used ? '#38bdf8' : '#93a3bb'}
            fontSize="13"
            fontWeight={used ? 700 : 500}
          >
            {cell.label}
          </text>
        )
      })}

      <text x={W / 2} y={H - 22} fill="#93a3bb" fontSize="9" textAnchor="middle">
        Read each diagonal from top-right down to bottom-left
      </text>
      <text x={W / 2} y={H - 8} fill="#e6edf7" fontSize="9.5" textAnchor="middle">
        1s · 2s · 2p 3s · 3p 4s · 3d 4p 5s · 4d 5p 6s …
      </text>
    </svg>
  )
}
