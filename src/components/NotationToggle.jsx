import { NOTATIONS } from '../lib/useNotation.js'

/**
 * Switches how the structures are drawn, with the difference stated on
 * screen rather than in a tooltip no phone will surface.
 *
 * Two labels alone would be another "Flip" — a control whose meaning you
 * have to discover by pressing it. The hint line under the buttons says
 * what each notation actually is, because that distinction is itself part
 * of what has to be learned: the two courses draw the same molecule two
 * different ways, and an exam may use either.
 */
export default function NotationToggle({ notation, onChange }) {
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
      <p className="muted notation-hint">{active.hint}</p>
    </div>
  )
}
