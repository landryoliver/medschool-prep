import reference from '../data/reference.json'
import ElementReference from './ElementReference.jsx'

/** Read-first cheat sheet for a topic — the "learn" half of learn-and-drill. */
export default function ReferenceView({ topicId, title, onStudy }) {
  const sections = reference[topicId]

  if (!sections) return <p className="muted">No notes for this topic yet.</p>

  return (
    <div>
      <h2 className="section-title">{title} — the essentials</h2>
      {topicId === 'periodic' && <ElementReference />}
      {sections.map((section, i) => (
        <div key={i} className="card">
          <h3 className="ref-heading">{section.heading}</h3>
          <ul className="ref-list">
            {section.points.map((point, k) => (
              <li key={k}>{point}</li>
            ))}
          </ul>
        </div>
      ))}
      <button className="primary wide" onClick={onStudy}>
        Start drilling this
      </button>
    </div>
  )
}
