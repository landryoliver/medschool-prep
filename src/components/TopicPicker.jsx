import { useEffect, useState } from 'react'
import { TOPICS, getTopicBank, getMixedBank } from '../lib/topics.js'
import { getAllProgress } from '../lib/db.js'
import { getStreak } from '../lib/streaks.js'
import lessons from '../data/lessons.json'

const hasLesson = (id) => Boolean(lessons[id])

// Two short sessions a day — enough to keep the spacing engine fed
// without being the kind of target that gets abandoned on a busy day.
const DAILY_GOAL = 30

// 25 mastered is "solid enough to move on", matching the progression view.
const MASTERY_TARGET = 25

/**
 * Mastery as a ring rather than a number. Scanning fifteen topic cards for
 * where to spend time is a visual comparison, and a filled arc reads at a
 * glance in a way "7 mastered" does not.
 */
function MasteryRing({ mastered }) {
  const R = 15
  const C = 2 * Math.PI * R
  const ratio = Math.min(1, mastered / MASTERY_TARGET)
  const done = ratio >= 1

  return (
    <div className="ring-wrap" title={`${mastered} of ${MASTERY_TARGET} mastered`}>
      <svg viewBox="0 0 40 40" className="ring">
        <circle cx="20" cy="20" r={R} fill="none" stroke="#0d1626" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={done ? 'var(--good)' : 'var(--accent)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${ratio * C} ${C}`}
          transform="rotate(-90 20 20)"
        />
        <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill={done ? 'var(--good)' : 'var(--text)'}>
          {done ? '✓' : mastered}
        </text>
      </svg>
    </div>
  )
}

function TopicStat({ stat }) {
  if (!stat.seen) return <span className="muted">Not started</span>
  const pct = Math.round((stat.correct / stat.seen) * 100)
  return <span className="muted">{pct}% correct</span>
}

export default function TopicPicker({ onStudy, onSpeed, onMixed, onLearn, onLesson, onReviewMisses, onPlan }) {
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
            <div className="topic-row">
              <MasteryRing mastered={stat?.mastered ?? 0} />
              <div className="topic-main">
                <div className="topic-head">
                  <h3>{topic.label}</h3>
                  {stat ? <TopicStat stat={stat} /> : <span className="muted">…</span>}
                </div>
                <p className="muted topic-blurb">{topic.blurb}</p>
              </div>
            </div>
            {stat?.seen ? (
              <div className="progress-track thin">
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--good)' : pct >= 40 ? '#facc15' : 'var(--bad)' }}
                />
              </div>
            ) : null}
            <div className="topic-actions">
              {hasLesson(topic.id) && (
                <button className={stat?.seen ? 'ghost' : 'primary'} onClick={() => onLesson(topic.id)}>
                  Learn
                </button>
              )}
              <button className="ghost" onClick={() => onLearn(topic.id)}>
                Notes
              </button>
              <button className={stat?.seen || !hasLesson(topic.id) ? 'primary' : 'ghost'} onClick={() => onStudy(topic.id)}>
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
