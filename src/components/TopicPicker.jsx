import { useEffect, useState } from 'react'
import { TOPICS, getTopicBank, getMixedBank } from '../lib/topics.js'
import { getAllProgress } from '../lib/db.js'
import { getStreak } from '../lib/streaks.js'
import { topicColor, topicTint } from '../lib/topicMeta.js'
import TopicIcon from './TopicIcon.jsx'
import lessons from '../data/lessons.json'
import progression from '../data/progression.json'

const hasLesson = (id) => Boolean(lessons[id])

// Two short sessions a day — enough to keep the spacing engine fed
// without being the kind of target that gets abandoned on a busy day.
const DAILY_GOAL = 30

// 25 mastered is "solid enough to move on", matching the progression view.
const MASTERY_TARGET = 25

function MasteryRing({ mastered, topicId }) {
  const R = 15
  const C = 2 * Math.PI * R
  const ratio = Math.min(1, mastered / MASTERY_TARGET)
  const done = ratio >= 1
  const color = done ? 'var(--good)' : topicColor(topicId)

  return (
    <div className="ring-wrap" title={`${mastered} of ${MASTERY_TARGET} mastered`}>
      <svg viewBox="0 0 40 40" className="ring">
        <circle cx="20" cy="20" r={R} fill="none" stroke="#0d1626" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ratio * C} ${C}`}
          transform="rotate(-90 20 20)"
        />
        <g transform="translate(8 9)">
          <TopicIcon topicId={topicId} size={24} />
        </g>
      </svg>
      {done && <span className="ring-check">✓</span>}
    </div>
  )
}

function TopicCard({ topic, stat, onLesson, onLearn, onStudy, onSpeed }) {
  const pct = stat?.seen ? Math.round((stat.correct / stat.seen) * 100) : 0
  const color = topicColor(topic.id)

  return (
    <div className="card topic-card" style={{ borderLeft: `3px solid ${color}`, background: topicTint(topic.id, 0.05) }}>
      <div className="topic-row">
        <MasteryRing mastered={stat?.mastered ?? 0} topicId={topic.id} />
        <div className="topic-main">
          <div className="topic-head">
            <h3>{topic.label}</h3>
            <span className="muted">{!stat?.seen ? 'Not started' : `${pct}%`}</span>
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
          <button
            className={stat?.seen ? 'ghost' : 'primary'}
            style={stat?.seen ? undefined : { background: color, color: '#06121f' }}
            onClick={() => onLesson(topic.id)}
          >
            Learn
          </button>
        )}
        <button className="ghost" onClick={() => onLearn(topic.id)}>
          Notes
        </button>
        <button
          className={stat?.seen ? 'primary' : 'ghost'}
          style={stat?.seen ? { background: color, color: '#06121f' } : undefined}
          onClick={() => onStudy(topic.id)}
        >
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
          if (p.box >= 3) mastered += 1
        }
        next[topic.id] = { seen, correct, studied, mastered, total: bank.length }
      }
      setStats(next)
    })
  }, [])

  const totalQuestions = getMixedBank().length
  const goalPct = Math.min(100, (streak.answeredToday / DAILY_GOAL) * 100)
  const goalHit = streak.answeredToday >= DAILY_GOAL

  // Grouped by the same stages the progression uses, so the seventeen
  // topics read as four short lists with a purpose each rather than one
  // undifferentiated wall.
  const grouped = progression.stages.map((stage) => ({
    ...stage,
    items: stage.topics.map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean),
  }))
  const groupedIds = new Set(grouped.flatMap((g) => g.items.map((t) => t.id)))
  const ungrouped = TOPICS.filter((t) => !groupedIds.has(t.id))

  const cardProps = { onLesson, onLearn, onStudy, onSpeed }

  return (
    <div>
      <div className="card hero-card">
        <div className="hero">
          <div>
            <div className={`hero-streak${goalHit ? ' lit' : ''}`}>{streak.current}</div>
            <div className="muted">day streak</div>
          </div>
          <div className="hero-side">
            <div>
              <strong className={goalHit ? 'good' : ''}>{streak.answeredToday}</strong>
              <span className="muted"> / {DAILY_GOAL} today</span>
            </div>
            <div className="muted">{totalQuestions.toLocaleString()} questions</div>
          </div>
        </div>
        <div className="progress-track thin" style={{ marginBottom: 0 }}>
          <div
            className="progress-fill"
            style={{ width: `${goalPct}%`, background: goalHit ? 'var(--good)' : 'var(--accent)' }}
          />
        </div>
        {goalHit && <p className="feedback good goal-hit">Daily goal hit — nice.</p>}
      </div>

      <button className="ghost wide" onClick={onPlan}>
        Progression — what I still need
      </button>
      <p className="muted hint-line">Prep stages with readiness, and how each maps onto the course.</p>

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

      {grouped.map((stage) => {
        if (!stage.items.length) return null
        const done = stage.items.filter((t) => (stats?.[t.id]?.mastered ?? 0) >= MASTERY_TARGET).length
        return (
          <section key={stage.id} className="stage-block">
            <div className="stage-head">
              <h2 className="stage-title">{stage.title}</h2>
              <span className="muted stage-count">
                {done} / {stage.items.length}
              </span>
            </div>
            {stage.items.map((topic) => (
              <TopicCard key={topic.id} topic={topic} stat={stats?.[topic.id]} {...cardProps} />
            ))}
          </section>
        )
      })}

      {ungrouped.length > 0 && (
        <section className="stage-block">
          <div className="stage-head">
            <h2 className="stage-title">Also available</h2>
          </div>
          {ungrouped.map((topic) => (
            <TopicCard key={topic.id} topic={topic} stat={stats?.[topic.id]} {...cardProps} />
          ))}
        </section>
      )}
    </div>
  )
}
