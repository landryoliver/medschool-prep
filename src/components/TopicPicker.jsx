import { useEffect, useState } from 'react'
import { TOPICS, getTopicBank, getMixedBank } from '../lib/topics.js'
import { ladderForTopic } from './ladders/definitions.jsx'
import { courseIndex } from '../lib/courseWeeks.js'
import { getAllProgress } from '../lib/db.js'
import { getStreak } from '../lib/streaks.js'
import { topicColor, topicTint, topicButtonColor } from '../lib/topicMeta.js'
import TopicIcon from './TopicIcon.jsx'
import lessons from '../data/lessons.json'
import progression from '../data/progression.json'

const hasLesson = (id) => Boolean(lessons[id])

// Two short sessions a day — enough to keep the spacing engine fed
// without being the kind of target that gets abandoned on a busy day.
const DAILY_GOAL = 30

// 25 mastered is "solid enough to move on", matching the progression view.
const MASTERY_TARGET = 25

/**
 * Two arcs, not one. The bright arc is mastery, which needs several
 * spaced correct recalls and therefore stays empty for the first few
 * days; the dim arc behind it is simply how much of the topic has been
 * seen. Showing only mastery meant a card could read 94% correct beside
 * an apparently empty ring, which looks broken and hides real work.
 */
function MasteryRing({ mastered, studied, total, topicId }) {
  const R = 16
  const C = 2 * Math.PI * R
  const ratio = Math.min(1, mastered / MASTERY_TARGET)
  const seenRatio = total ? Math.min(1, studied / Math.min(MASTERY_TARGET, total)) : 0
  const done = ratio >= 1
  const color = done ? 'var(--good)' : topicColor(topicId)

  return (
    <div className="ring-wrap" title={`${mastered} mastered · ${studied} seen`}>
      <svg viewBox="0 0 44 44" className="ring" role="img" aria-label={`${mastered} mastered, ${studied} seen`}>
        <circle cx="22" cy="22" r={R} fill="none" stroke="var(--line)" strokeWidth="3" />
        {seenRatio > 0 && (
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={topicColor(topicId)}
            strokeOpacity="0.32"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${seenRatio * C} ${C}`}
            transform="rotate(-90 22 22)"
          />
        )}
        {ratio > 0 && (
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${ratio * C} ${C}`}
            transform="rotate(-90 22 22)"
          />
        )}
        <g transform="translate(9 10)">
          <TopicIcon topicId={topicId} size={26} />
        </g>
      </svg>
      {done && <span className="ring-check">✓</span>}
    </div>
  )
}

function TopicCard({ topic, stat, onLesson, onLearn, onStudy, onSpeed, onCards, onBuild }) {
  const pct = stat?.seen ? Math.round((stat.correct / stat.seen) * 100) : 0
  const color = topicColor(topic.id)
  const btnColor = topicButtonColor(topic.id)

  return (
    <div className="card topic-card" style={{ borderLeft: `3px solid ${color}`, background: topicTint(topic.id, 0.05) }}>
      <div className="topic-row">
        <MasteryRing
          mastered={stat?.mastered ?? 0}
          studied={stat?.studied ?? 0}
          total={stat?.total ?? 0}
          topicId={topic.id}
        />
        <div className="topic-main">
          <div className="topic-head">
            <h3>{topic.label}</h3>
            <span className="muted">{!stat?.seen ? 'New' : `${pct}%`}</span>
          </div>
          <p className="muted topic-blurb">{topic.blurb}</p>
          {stat?.seen ? (
            <p className="muted topic-stat">
              {stat.mastered} mastered · {stat.studied} of {stat.total} seen
            </p>
          ) : null}
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
            style={stat?.seen ? undefined : { background: btnColor, color: '#06121f' }}
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
          style={stat?.seen ? { background: btnColor, color: '#06121f' } : undefined}
          onClick={() => onStudy(topic.id)}
        >
          Study
        </button>
        {topic.speedRound && (
          <button className="ghost" onClick={() => onSpeed(topic.id)}>
            Speed
          </button>
        )}
        {ladderForTopic(topic.id) && (
          <button className="ghost" onClick={() => onBuild(ladderForTopic(topic.id).id)}>
            Build
          </button>
        )}
      </div>
    </div>
  )
}

export default function TopicPicker({ onStudy, onSpeed, onMixed, onLearn, onLesson, onCards, onBuild, onReviewMisses, onPlan, onCourses }) {
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

  const cardProps = { onLesson, onLearn, onStudy, onSpeed, onCards, onBuild }

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

      {/* Compact two-line buttons: the explanation sits inside the control
          rather than as a paragraph beneath it, which previously pushed the
          first topic most of a screen down. */}
      <button className="action-btn primary-action" onClick={onMixed}>
        <span className="action-title">Mixed review</span>
        <span className="action-sub">All topics, weighted toward your weak spots</span>
      </button>

      {/* The amino acid deck is the daily driver while biochemistry is
          running, and it used to sit four stage-blocks down the page behind
          a button labelled only "Cards". Pinned here so it costs no
          scrolling and says what it actually does. */}
      <button className="action-btn primary-action" onClick={() => onBuild(null)}>
        <span className="action-title">Build up a set</span>
        <span className="action-sub">One at a time</span>
      </button>

      {/* Only offered once a course reading has actually been tagged. An
          empty "My courses" button is worse than no button — it looks like a
          feature that is broken rather than one waiting on input. */}
      {courseIndex().length > 0 && (
        <button className="action-btn" onClick={onCourses}>
          <span className="action-title">My courses</span>
          <span className="action-sub">Week by week, from your readings</span>
        </button>
      )}

      <div className="action-row">
        <button className="action-btn" onClick={onPlan}>
          <span className="action-title">Progression</span>
          <span className="action-sub">What's still needed</span>
        </button>
        {missedCount > 0 && (
          <button className="action-btn" onClick={onReviewMisses}>
            <span className="action-title">Your misses</span>
            <span className="action-sub">{missedCount} to redo</span>
          </button>
        )}
      </div>

      {grouped.map((stage) => {
        if (!stage.items.length) return null
        // Report topics STARTED rather than fully mastered. Mastery needs
        // several spaced recalls, so an early-days count reads 0/5 next to
        // 94% accuracy, which is both discouraging and misleading.
        const started = stage.items.filter((t) => (stats?.[t.id]?.seen ?? 0) > 0).length
        const done = stage.items.filter((t) => (stats?.[t.id]?.mastered ?? 0) >= MASTERY_TARGET).length
        return (
          <section key={stage.id} className="stage-block">
            <div className="stage-head">
              <h2 className="stage-title">{stage.title}</h2>
              <span className="muted stage-count">
                {done > 0 ? `${done} mastered · ` : ''}
                {started} / {stage.items.length} started
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
