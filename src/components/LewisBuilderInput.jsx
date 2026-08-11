import { useState } from 'react'
import LewisDiagram from './visuals/LewisDiagram.jsx'

const fc = (valence, lp, bond) => valence - 2 * lp - bond

function chargeText(charge) {
  if (charge === 0) return '0'
  return charge > 0 ? `+${charge}` : `${charge}`
}

function Stepper({ label, value, min, max, disabled, onChange }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label={`decrease ${label}`}>
          −
        </button>
        <span className="stepper-value">{value}</span>
        <button disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label={`increase ${label}`}>
          +
        </button>
      </div>
    </div>
  )
}

/**
 * Tap-to-build Lewis structure input. Formal charges and the electron
 * budget update live with every change — watching the +/− appear as you
 * move electrons IS the lesson, so nothing here waits for submission.
 */
export default function LewisBuilderInput({ question, phase, onSubmit }) {
  const { a, b, totalElectrons } = question.build
  const [bond, setBond] = useState(1)
  const [lpA, setLpA] = useState(0)
  const [lpB, setLpB] = useState(0)

  const locked = phase === 'revealed'
  const fcA = fc(a.valence, lpA, bond)
  const fcB = fc(b.valence, lpB, bond)
  const used = 2 * (bond + lpA + lpB)
  const balanced = used === totalElectrons

  return (
    <div>
      <div className="card builder-preview">
        <LewisDiagram
          structure={{
            center: a.symbol,
            centerCharge: fcA,
            centerLonePairs: lpA,
            ligands: [{ symbol: b.symbol, bond, lonePairs: lpB, charge: fcB }],
          }}
          height={150}
        />
        <div className="builder-readout">
          <span className={balanced ? 'good' : used > totalElectrons ? 'bad' : 'muted'}>
            Electrons placed: {used} / {totalElectrons}
          </span>
          <span className="muted">
            Formal charges: {a.symbol} {chargeText(fcA)} · {b.symbol} {chargeText(fcB)}
          </span>
        </div>
      </div>

      <div className="builder-controls">
        <Stepper
          label={`${a.symbol}–${b.symbol} bond order`}
          value={bond}
          min={1}
          max={3}
          disabled={locked}
          onChange={setBond}
        />
        <Stepper label={`Lone pairs on ${a.symbol}`} value={lpA} min={0} max={4} disabled={locked} onChange={setLpA} />
        <Stepper label={`Lone pairs on ${b.symbol}`} value={lpB} min={0} max={4} disabled={locked} onChange={setLpB} />
      </div>

      {!locked && (
        <button className="primary next-btn" onClick={() => onSubmit({ bond, lonePairs: [lpA, lpB] })}>
          {phase === 'retry' ? 'Try again' : 'Check my structure'}
        </button>
      )}
    </div>
  )
}
