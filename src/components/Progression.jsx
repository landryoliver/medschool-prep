import { useEffect, useState } from 'react'
import progression from '../data/progression.json'
import { TOPICS, getTopicBank } from '../lib/topics.js'
import { getAllProgress } from '../lib/db.js'

const labelOf = (id) => TOPICS.find((t) => t.id === id)?.label ?? id

// What counts as "solid enough to move on". Mastering an entire 300-question
// bank is not a realistic bar, and waiting for it would stall the whole
// progression; surviving the spacing intervals on a couple of dozen
// questions is a fair proxy for the topic having stuck.
const MASTERY_TARGET = 25

function topicReadiness(bank, byId) {
  const target = Math.min(MASTERY_TARGET, bank.length)
  let mastered = 0
  let studied = 0
  for (const q of bank) {
    const p = byId.get(q.id)
    if (!p) continue
    studied += 1
    if (p.box >= 3) mastered += 1
  }
  return { ratio: target ? Math.min(1, mastered / target) : 0, mastered, target, studied }
}

function Bar({ ratio }) {
  const pct = Math.round(ratio * 100)
  return (
    <div className="progress-track thin">
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--good)' : 'var(--accent)' }}
      />
    </div>
  )
}

/**
 * Stage-based progression: which prep is still owed before orgo starts,
 * and how the prep maps onto the course once it does.
 *
 * Stages are advisory, never locked. A gate that refuses to open is
 * useful for a game and counterproductive for someone with a fixed start
 * date who may need a specific topic today.
 */
export default function Progression({ onPickTopic, onNotes }) {
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('stages')

  useEffect(() => {
    getAllProgress().then((rows) => {
      const byId = new Map(rows.map((r) => [r.id, r]))
      const next = {}
      for (const topic of TOPICS) next[topic.id] = topicReadiness(getTopicBank(topic.id), byId)
      setState(next)
    })
  }, [])

  const stageRatio = (stage) =>
    !state ? 0 : stage.topics.reduce((sum, id) => sum + (state[id]?.ratio ?? 0), 0) / stage.topics.length

  // The single most useful thing to say: the first unfinished topic in the
  // earliest unfinished stage.
  let nextUp = null
  if (state) {
    for (const stage of progression.stages) {
      if (stage.id === 'ahead') continue
      const pending = stage.topics.find((id) => (state[id]?.ratio ?? 0) < 1)
      if (pending) {
        nextUp = { stage, topicId: pending }
        break
      }
    }
  }

  return (
    <div>
      <div className="seg wide-seg">
        <button className={tab === 'stages' ? 'active' : ''} onClick={() => setTab('stages')}>
          Before orgo
        </button>
        <button className={tab === 'roadmap' ? 'active' : ''} onClick={() => setTab('roadmap')}>
          Once in orgo
        </button>
      </div>

      {tab === 'stages' && (
        <>
          <div className="card">
            {nextUp ? (
              <>
                <p className="muted next-label">Next up</p>
                <h3 className="next-title">{labelOf(nextUp.topicId)}</h3>
                <p className="muted next-sub">
                  {nextUp.stage.title} · {state[nextUp.topicId].mastered} of {state[nextUp.topicId].target} mastered
                </p>
                <div className="plan-topic-actions">
                  <button className="ghost plan-start" onClick={() => onNotes(nextUp.topicId)}>
                    Notes
                  </button>
                  <button className="primary plan-start" onClick={() => onPickTopic(nextUp.topicId)}>
                    Study
                  </button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0 }}>
                {state ? 'Every prep stage is covered. Keep the streak alive with mixed review.' : 'Loading…'}
              </p>
            )}
          </div>

          {progression.stages.map((stage) => {
            const ratio = stageRatio(stage)
            return (
              <div className="card" key={stage.id}>
                <div className="plan-head">
                  <span className="plan-day">{Math.round(ratio * 100)}%</span>
                  <h3 className="plan-title">{stage.title}</h3>
                </div>
                <p className="muted plan-how">{stage.subtitle}</p>
                <Bar ratio={ratio} />
                <p className="plan-why">{stage.why}</p>

                {stage.topics.map((id) => {
                  const s = state?.[id]
                  const done = (s?.ratio ?? 0) >= 1
                  return (
                    <div className="plan-topic" key={id}>
                      <div>
                        <div className="plan-topic-name">
                          {done ? '✓ ' : ''}
                          {labelOf(id)}
                        </div>
                        <div className="muted plan-topic-stat">
                          {!s || !s.studied ? 'Not started' : `${s.mastered} of ${s.target} mastered`}
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
            )
          })}
        </>
      )}

      {tab === 'roadmap' && (
        <>
          <div className="card">
            <p style={{ margin: 0 }}>
              Organic chemistry I is unusually standardized — Klein, Wade, Carey, Smith and Bruice all run close to this
              order. Weeks are approximate and your syllabus rules, but the sequence rarely varies.
            </p>
          </div>
          {progression.roadmap.map((unit) => (
            <div className="card" key={unit.unit}>
              <div className="plan-head">
                <span className="plan-day">{unit.when}</span>
                <h3 className="plan-title">{unit.unit}</h3>
              </div>
              <p className="plan-why">{unit.note}</p>
              <p className="muted plan-topic-stat" style={{ marginBottom: '0.4rem' }}>
                Prep that feeds it:
              </p>
              <div className="chip-row">
                {unit.prep.map((id) => {
                  const s = state?.[id]
                  const done = (s?.ratio ?? 0) >= 1
                  return (
                    <button key={id} className={`chip${done ? ' chip-done' : ''}`} onClick={() => onPickTopic(id)}>
                      {done ? '✓ ' : ''}
                      {labelOf(id)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
