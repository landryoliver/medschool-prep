import { useRef, useState } from 'react'
import { exportProgress, importProgress, storageAvailable } from '../lib/db.js'

/**
 * Save and restore progress.
 *
 * Everything lives in one browser's IndexedDB, and iOS has historically
 * cleared site data for installed web apps after periods of disuse. Months
 * of spacing history would vanish with no way back, so a file the user
 * actually holds is the only real insurance.
 */
export default function BackupPanel() {
  const [status, setStatus] = useState(null)
  const fileRef = useRef(null)

  async function save() {
    try {
      const data = await exportProgress()
      const count = data.progress.length
      if (!count) {
        setStatus({ kind: 'muted', text: 'Nothing to back up yet — answer some questions first.' })
        return
      }
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orgoprep-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus({ kind: 'good', text: `Saved ${count} questions of progress.` })
    } catch (err) {
      setStatus({ kind: 'bad', text: `Could not save: ${err.message}` })
    }
  }

  async function restore(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const backup = JSON.parse(await file.text())
      const { restored, logs } = await importProgress(backup)
      setStatus({
        kind: 'good',
        text: `Restored ${restored} question${restored === 1 ? '' : 's'} and ${logs} session record${logs === 1 ? '' : 's'}. Reload to see it.`,
      })
    } catch (err) {
      setStatus({ kind: 'bad', text: `Could not restore: ${err.message}` })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="card">
      <h3 className="ref-heading">Back up your progress</h3>
      <p className="muted backup-note">
        Everything is stored only in this browser. Phones sometimes clear that storage on their own, so save a copy
        occasionally — especially before reinstalling or clearing site data.
      </p>

      {!storageAvailable() && (
        <p className="feedback bad">
          Storage is unavailable in this browser, so progress is not being saved at all. Private browsing is the usual
          cause.
        </p>
      )}

      <div className="action-row">
        <button className="action-btn" onClick={save}>
          <span className="action-title">Save a copy</span>
          <span className="action-sub">Downloads a small file</span>
        </button>
        <button className="action-btn" onClick={() => fileRef.current?.click()}>
          <span className="action-title">Restore</span>
          <span className="action-sub">From a saved file</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={restore} style={{ display: 'none' }} />

      {status && <p className={`feedback ${status.kind === 'muted' ? 'muted' : status.kind}`}>{status.text}</p>}
    </div>
  )
}
