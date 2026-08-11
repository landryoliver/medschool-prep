import { useEffect, useState } from 'react'
import plan from '../data/studyPlan.json'
import { TOPICS, getTopicBank } from '../lib/topics.js'
import { getAllProgress } from '../lib/db.js'

const labelOf = (id) => TOPICS.find((t) => t.id === id)?.label ?? id

/**
 * A suggested order through the topics, with the reasoning for each step.
 * Twelve topics and two thousand questions is hard to start on; the point
 * here is to remove the "what do I do first" decision, not to be a
 * schedule anyone is obliged to keep. Days are numbered rather than dated
 * so falling behind doesn't invalidate the plan.
 */
export default function StudyPlan({ onPickTopic, onNotes }) {
  const [mastery, setMastery] = useState(null)

  useEffect(() => {
    getAllProgress().then((rows) => {
      const byId = new Map(rows.map((r) => [r.id, r]))
      const next = {}
      for (const topic of TOPICS) {
        const bank = getTopicBank(topic.id)
        let mastered = 0
        let studied = 0
        for (const q of bank) {
          const p = byId.get(q.id)
          if (!p) continue
          studied += 1
          if (p.box >= 3) mastered += 1
        }
        next[topic.id] = { mastered, studied, total: bank.length }
      }
      setMastery(next)
    })
  }, [])

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Suggested order</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Each topic here depends on the ones before it. If you only get through the first four days, you will still
          walk into class able to read the notation — which is the part that costs the most to lack.
        </p>
      </div>

      {plan.map((day) => (
        <div className="card" key={day.day}>
          <div className="plan-head">
            <span className="plan-day">Day {day.day}</span>
            <h3 className="plan-title">{day.title}</h3>
          </div>

          <p className="plan-why">{day.why}</p>
          <p className="plan-how muted">{day.how}</p>

          <div className="plan-topics">
            {day.topics.map((id) => {
              const m = mastery?.[id]
              return (
                <div className="plan-topic" key={id}>
                  <div>
                    <div className="plan-topic-name">{labelOf(id)}</div>
                    <div className="muted plan-topic-stat">
                      {!m || !m.studied ? 'Not started' : `${m.mastered} mastered of ${m.studied} seen`}
                    </div>
                  </div>
                  <div className="plan-topic-actions">
                    <button className="ghost plan-start" onClick={() => onNotes(id)}>
                      Notes
                    </button>
                    <button className="primary plan-start" onClick={() => onPickTopic(id)}>
                      Study
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
