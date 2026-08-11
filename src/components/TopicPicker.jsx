import { useEffect, useState } from 'react'
import { TOPICS, getTopicBank, getMixedBank } from '../lib/topics.js'
import { getAllProgress } from '../lib/db.js'
import { getStreak } from '../lib/streaks.js'

function TopicStat({ stat }) {
  if (!stat.seen) return <span className="muted">Not started</span>
  const pct = Math.round((stat.correct / stat.seen) * 100)
  return (
    <span className="muted">
      {pct}% · {stat.studied}/{stat.total} seen
    </span>
  )
}

export default function TopicPicker({ onStudy, onSpeed, onMixed, onLearn }) {
  const [stats, setStats] = useState(null)
  const streak = getStreak()

  useEffect(() => {
    getAllProgress().then((rows) => {
      const byId = new Map(rows.map((r) => [r.id, r]))
      const next = {}
      for (const topic of TOPICS) {
        const bank = getTopicBank(topic.id)
        let seen = 0
        let correct = 0
        let studied = 0
        for (const q of bank) {
          const p = byId.get(q.id)
          if (!p) continue
          studied += 1
          seen += p.timesSeen
          correct += p.timesCorrect
        }
        next[topic.id] = { seen, correct, studied, total: bank.length }
      }
      setStats(next)
    })
  }, [])

  const totalQuestions = getMixedBank().length

  return (
    <div>
      <div className="card hero">
        <div>
          <div className="hero-streak">{streak.current}</div>
          <div className="muted">day streak</div>
        </div>
        <div className="hero-side">
          <div>
            <strong>{streak.answeredToday}</strong> <span className="muted">answered today</span>
          </div>
          <div className="muted">{totalQuestions} questions available</div>
        </div>
      </div>

      <button className="primary wide" onClick={onMixed}>
        Mixed review — all topics
      </button>
      <p className="muted hint-line">Blends every topic and leans toward whatever you have been missing.</p>

      {TOPICS.map((topic) => {
        const stat = stats?.[topic.id]
        const pct = stat?.seen ? Math.round((stat.correct / stat.seen) * 100) : 0
        return (
          <div key={topic.id} className="card topic-card">
            <div className="topic-head">
              <h3>{topic.label}</h3>
              {stat ? <TopicStat stat={stat} /> : <span className="muted">…</span>}
            </div>
            <p className="muted topic-blurb">{topic.blurb}</p>
            {stat?.seen ? (
              <div className="progress-track thin">
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--good)' : pct >= 40 ? '#facc15' : 'var(--bad)' }}
                />
              </div>
            ) : null}
            <div className="topic-actions">
              <button className="ghost" onClick={() => onLearn(topic.id)}>
                Notes
              </button>
              <button className="primary" onClick={() => onStudy(topic.id)}>
                Study
              </button>
              {topic.speedRound && (
                <button className="ghost" onClick={() => onSpeed(topic.id)}>
                  Speed
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
