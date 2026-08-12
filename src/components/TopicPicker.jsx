import { useEffect, useState } from 'react'
import { TOPICS, getTopicBank, getMixedBank } from '../lib/topics.js'
import { getAllProgress } from '../lib/db.js'
import { getStreak } from '../lib/streaks.js'

// Two short sessions a day — enough to keep the spacing engine fed
// without being the kind of target that gets abandoned on a busy day.
const DAILY_GOAL = 30

function TopicStat({ stat }) {
  if (!stat.seen) return <span className="muted">Not started</span>
  const pct = Math.round((stat.correct / stat.seen) * 100)
  return (
    <span className="muted">
      {pct}% · {stat.mastered} mastered
    </span>
  )
}

export default function TopicPicker({ onStudy, onSpeed, onMixed, onLearn, onReviewMisses, onPlan }) {
  const [stats, setStats] = useState(null)
  const [missedCount, setMissedCount] = useState(0)
  const streak = getStreak()

  useEffect(() => {
    getAllProgress().then((rows) => {
      const byId = new Map(rows.map((r) => [r.id, r]))
      setMissedCount(rows.filter((r) => r.lastResult === false).length)
      const next = {}
      for (const topic of TOPICS) {
        const bank = getTopicBank(topic.id)
        let seen = 0
        let correct = 0
        let studied = 0
        let mastered = 0
        for (const q of bank) {
          const p = byId.get(q.id)
          if (!p) continue
          studied += 1
          seen += p.timesSeen
          correct += p.timesCorrect
          // Box 3 means it has survived three correct recalls and is now
          // on a week-plus interval — a fairer bar for "known" than "seen".
          if (p.box >= 3) mastered += 1
        }
        next[topic.id] = { seen, correct, studied, mastered, total: bank.length }
      }
      setStats(next)
    })
  }, [])

  const totalQuestions = getMixedBank().length

  return (
    <div>
      <div className="card">
        <div className="hero">
          <div>
            <div className="hero-streak">{streak.current}</div>
            <div className="muted">day streak</div>
          </div>
          <div className="hero-side">
            <div>
              <strong>{streak.answeredToday}</strong>
              <span className="muted"> / {DAILY_GOAL} today</span>
            </div>
            <div className="muted">{totalQuestions} questions available</div>
          </div>
        </div>
        <div className="progress-track thin" style={{ marginBottom: 0 }}>
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, (streak.answeredToday / DAILY_GOAL) * 100)}%`,
              background: streak.answeredToday >= DAILY_GOAL ? 'var(--good)' : 'var(--accent)',
            }}
          />
        </div>
        {streak.answeredToday >= DAILY_GOAL && <p className="feedback good goal-hit">Daily goal hit</p>}
      </div>

      <button className="ghost wide" onClick={onPlan}>
        Progression — what I still need before orgo
      </button>
      <p className="muted hint-line">Stages of prep with readiness, plus how each one maps onto the course once it starts.</p>

      <button className="primary wide" onClick={onMixed}>
        Mixed review — all topics
      </button>
      <p className="muted hint-line">Blends every topic and leans toward whatever you have been missing.</p>

      {missedCount > 0 && (
        <>
          <button className="ghost wide" onClick={onReviewMisses}>
            Review your misses ({missedCount})
          </button>
          <p className="muted hint-line">Only the questions you got wrong on your last attempt.</p>
        </>
      )}

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
