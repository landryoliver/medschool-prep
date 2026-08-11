import { useEffect } from 'react'
import ElementReference from './ElementReference.jsx'

/**
 * Slide-up periodic table for looking something up mid-question.
 *
 * On most topics this is legitimate reference — nobody learns VSEPR by
 * memorizing atomic numbers. On the topics the table itself answers
 * (element recall, trends, polarity) the caller marks the question as
 * hinted, so it records the attempt without granting mastery. Otherwise
 * the fastest route to a "mastered" electronegativity question would be
 * to read the answer off the table.
 */
export default function PeriodicSheet({ onClose, counted }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Periodic table reference">
        <div className="sheet-bar">
          <strong>Element reference</strong>
          <button className="ghost sheet-close" onClick={onClose}>
            Done
          </button>
        </div>
        {counted && (
          <p className="muted sheet-note">
            This question is about the table itself, so looking it up counts as a hint — it still records, but won’t
            count toward mastery.
          </p>
        )}
        <div className="sheet-body">
          <ElementReference />
        </div>
      </div>
    </div>
  )
}
