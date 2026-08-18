import { NOTATIONS } from '../lib/useNotation.js'

/**
 * Switches how the structures are drawn.
 *
 * `compact` drops the explanatory line. Over a question the reader is
 * looking at the chart, so a sentence describing what the chart looks like
 * is words in the way — and it repeated on every card of a round. On the
 * reading screens the line stays, because that is where the two words
 * "skeletal" and "written out" have to be defined at all.
 */
export default function NotationToggle({ notation, onChange, compact = false }) {
  const active = NOTATIONS.find((n) => n.id === notation) ?? NOTATIONS[0]
  return (
    <div className="notation">
      <div className="seg wide-seg">
        {NOTATIONS.map((n) => (
          <button key={n.id} className={notation === n.id ? 'active' : ''} onClick={() => onChange(n.id)}>
            {n.label}
          </button>
        ))}
      </div>
      {!compact && <p className="muted notation-hint">{active.hint}</p>}
    </div>
  )
}
