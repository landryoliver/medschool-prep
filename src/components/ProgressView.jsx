import { useEffect, useState } from 'react'
import { getAllSessionLog } from '../lib/db.js'
import { accuracyByTopic, accuracyByMode, overallAccuracy } from '../lib/scoring.js'
import TopicAccuracyBars from './TopicAccuracyBars.jsx'

const MODE_LABELS = {
  'mode0-genchem': 'Gen-Chem Prep',
  'mode3-formalcharge': 'Formal Charge',
  'mode4-skeletal': 'Skeletal Fluency',
  'mode5-curated': 'Curated Bank',
  'mode2-functionalgroups': 'Functional Groups',
  'mode1-nomenclature': 'Nomenclature',
}

export default function ProgressView() {
  const [log, setLog] = useState(null)

  useEffect(() => {
    getAllSessionLog().then(setLog)
  }, [])

  if (!log) return <p>Loading…</p>

  const byTopic = accuracyByTopic(log)
  const byMode = accuracyByMode(log).map((r) => ({ ...r, key: MODE_LABELS[r.key] ?? r.key }))
  const overall = overallAccuracy(log)

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Overall</h2>
        <p>
          {log.length} questions answered · {Math.round(overall * 100)}% accuracy
        </p>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>By mode</h3>
        <TopicAccuracyBars rows={byMode} />
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>By topic</h3>
        <TopicAccuracyBars rows={byTopic} />
      </div>
    </div>
  )
}
