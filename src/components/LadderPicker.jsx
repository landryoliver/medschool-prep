import { useEffect, useState } from 'react'
import { LADDERS } from './ladders/definitions.jsx'
import { loadAll, staleness } from '../lib/ladderProgress.js'

/**
 * Which set to build up.
 *
 * Separate from the flashcard deck on purpose: a deck shuffles a set you are
 * assumed to already have, a ladder assembles one you do not. They are
 * different activities and were confusing as tabs of the same screen.
 */
export default function LadderPicker({ onPick, onDone }) {
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    setProgress(loadAll(LADDERS))
  }, [])

  return (
    <div>
      <p className="muted fc-hint">
        One at a time. Progress kept per set.
      </p>
      {LADDERS.map((l) => {
        const p = progress?.[l.id]
        const done = p?.learned.length ?? 0
        const gap = p ? staleness(p.lastSeenAt) : null
        return (
          <button key={l.id} className="action-btn ladder-pick" onClick={() => onPick(l.id)}>
            <span className="action-title">{l.label}</span>
            <span className="action-sub">
              {done === 0 ? l.blurb : `${done} of ${l.items.length}${gap ? ` · ${gap.text} ago` : ''}`}
            </span>
            <span className="progress-track thin ladder-pick-bar">
              <span className="progress-fill" style={{ width: `${(done / l.items.length) * 100}%` }} />
            </span>
          </button>
        )
      })}
      <button className="ghost wide" onClick={onDone}>
        ← Back to topics
      </button>
    </div>
  )
}
