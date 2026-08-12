import { useEffect } from 'react'
import PeriodicTable from './PeriodicTable.jsx'

/**
 * Slide-up periodic table for looking something up mid-question.
 *
 * Deliberately carries no scoring penalty: organic chemistry exams supply
 * a periodic table, so charging for it here would train against the real
 * test condition. Speed rounds are where recall gets pressure-tested, and
 * this is not offered there.
 */
export default function PeriodicSheet({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Periodic table">
        <div className="sheet-bar">
          <strong>Periodic table</strong>
          <button className="ghost sheet-close" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="sheet-body">
          <PeriodicTable />
        </div>
      </div>
    </div>
  )
}
