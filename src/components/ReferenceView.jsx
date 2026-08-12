import reference from '../data/reference.json'
import ElementReference from './ElementReference.jsx'
import PeriodicTable from './PeriodicTable.jsx'
import walkthroughs from '../data/walkthroughs.json'

/** Read-first cheat sheet for a topic — the "learn" half of learn-and-drill. */
export default function ReferenceView({ topicId, title, onStudy, onWalk }) {
  const hasWalk = Boolean(walkthroughs[topicId]?.length)
  const sections = reference[topicId]

  if (!sections) return <p className="muted">No notes for this topic yet.</p>

  return (
    <div>
      <h2 className="section-title">{title} — the essentials</h2>
      {topicId === 'periodic' && (
        <>
          <PeriodicTable />
          <ElementReference />
        </>
      )}
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
      {hasWalk && (
        <button className="primary wide" onClick={onWalk}>
          See it worked through →
        </button>
      )}
      <button className={`${hasWalk ? 'ghost' : 'primary'} wide`} onClick={onStudy}>
        Start drilling this
      </button>
    </div>
  )
}
