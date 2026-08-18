import { useState } from 'react'
import lessons from '../data/lessons.json'

/**
 * The first rung of the ladder: prose that teaches a topic from scratch.
 *
 * The Notes are a condensed cheat sheet — excellent for review, wrong for
 * first exposure, because a bullet like "ARIO, checked in order" only means
 * something once you already know what those factors are. This explains,
 * then hands off to Notes for revision, walkthroughs for procedure, and
 * questions for practice.
 */
export default function LessonView({ topicId, title, onNotes, onStudy, onCards }) {
  const lesson = lessons[topicId]
  const [read, setRead] = useState(0)

  if (!lesson) {
    return (
      <div>
        <p className="muted">No full lesson written for this topic yet — the Notes cover it in summary form.</p>
        <button className="primary wide" onClick={onNotes}>
          Go to Notes
        </button>
      </div>
    )
  }

  const total = lesson.sections.length
  const visible = lesson.sections.slice(0, read + 1)
  const done = read >= total - 1

  return (
    <div>
      <h2 className="section-title">{title}</h2>
      <p className="lesson-intro">{lesson.intro}</p>

      <div className="lesson-progress">
        {lesson.sections.map((_, i) => (
          <span key={i} className={`lesson-dot${i <= read ? ' on' : ''}`} />
        ))}
        <span className="muted lesson-count">
          {read + 1} / {total}
        </span>
      </div>

      {visible.map((section, i) => (
        <div className="card lesson-card" key={i}>
          <h3 className="lesson-heading">{section.heading}</h3>
          {section.body.map((para, k) => (
            <p className="lesson-body" key={k}>
              {para}
            </p>
          ))}
          {section.example && (
            <div className="lesson-example">
              <strong>{section.example.label}</strong>
              {section.example.text}
            </div>
          )}
        </div>
      ))}

      {!done && (
        <button className="primary wide" onClick={() => setRead((n) => n + 1)}>
          Continue →
        </button>
      )}

      {done && (
        <>
          <div className="card lesson-done">
            <strong>That's the whole idea.</strong>
            <p className="muted" style={{ margin: '0.3rem 0 0' }}>
              The Notes condense this into a page you can re-read in a minute. Then practise it.
            </p>
          </div>
          <button className="primary wide" onClick={onNotes}>
            Notes — the summary →
          </button>
          <button className="ghost wide" onClick={onStudy}>
            Skip to practice
          </button>
          {/* The deck belongs with the teaching, not as a sixth button on a
              topic card that was already too crowded to read. */}
          {onCards && (
            <button className="ghost wide" onClick={onCards}>
              Flashcards
            </button>
          )}
        </>
      )}
    </div>
  )
}
