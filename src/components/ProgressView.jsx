import { useEffect, useState } from 'react'
import { getAllSessionLog } from '../lib/db.js'
import { accuracyByTopic, overallAccuracy } from '../lib/scoring.js'
import { getStreak } from '../lib/streaks.js'
import TopicAccuracyBars from './TopicAccuracyBars.jsx'

const TOPIC_LABELS = {
  'element-recall': 'Element recall',
  'periodic-trends': 'Periodic trends',
  'electron-config': 'Electron configuration',
  'bond-polarity': 'Bond polarity',
  'molecular-polarity': 'Molecular polarity',
  'lewis-structures': 'Lewis structures',
  'formal-charge': 'Formal charge',
  vsepr: 'VSEPR geometry',
  hybridization: 'Hybridization',
  'acid-base': 'Acids & bases',
  imf: 'Intermolecular forces',
  'energy-kinetics': 'Energy & kinetics',
  isomers: 'Isomers',
  'amino-acids': 'Amino acids',
  buffers: 'pH & buffers',
  biomolecules: 'Biomolecules',
  pka: 'pKa comparisons',
  'skeletal-fluency': 'Skeletal structures',
  'functional-groups': 'Functional groups',
  nomenclature: 'Nomenclature',
  resonance: 'Resonance',
  'curved-arrows': 'Curved arrows',
  mechanism: 'Mechanism concepts',
  'sn-e': 'SN1/SN2/E1/E2',
}

export default function ProgressView() {
  const [log, setLog] = useState(null)
  const streak = getStreak()

  useEffect(() => {
    getAllSessionLog().then(setLog)
  }, [])

  if (!log) return <p>Loading…</p>

  if (!log.length) {
    return (
      <div className="card">
        <h2 className="section-title">No data yet</h2>
        <p className="muted">Finish a session and your accuracy by topic will show up here.</p>
      </div>
    )
  }

  const byTopic = accuracyByTopic(log)
    .map((r) => ({ ...r, key: TOPIC_LABELS[r.key] ?? r.key }))
    .sort((a, b) => a.accuracy - b.accuracy)
  const overall = overallAccuracy(log)

  return (
    <div>
      <div className="card">
        <h2 className="section-title">Overall</h2>
        <p className="score">
          {Math.round(overall * 100)}% <span className="muted">across {log.length} answers</span>
        </p>
        <p className="muted">
          {streak.current}-day streak (best {streak.best}) · {streak.answeredToday} answered today
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">By topic — weakest first</h3>
        <p className="muted hint-line">Sessions automatically pull more questions from the topics near the top.</p>
        <TopicAccuracyBars rows={byTopic} />
      </div>
    </div>
  )
}
