import { courseIndex } from '../lib/courseWeeks.js'

/**
 * Your courses, week by week.
 *
 * Deliberately shows only material tagged with a course and a week, so a week
 * that has not been fed in yet is simply absent rather than appearing empty.
 * The count on each row is the honest one: how many questions came out of that
 * week's material, not how many the app could ask about the same topics.
 */
export default function CourseWeeks({ onWeek, onCourse, onLadder }) {
  const courses = courseIndex()

  if (!courses.length) {
    return (
      <div className="card">
        <h2 className="section-title">Nothing tagged yet</h2>
        <p className="muted">
          Questions built from a course reading carry that course and week, and show up here. Nothing
          has been tagged so far.
        </p>
      </div>
    )
  }

  return (
    <div>
      {courses.map((c) => {
        const total = c.weeks.reduce((n, w) => n + w.questions.length, 0)
        return (
          <div key={c.id} className="card">
            <div className="aa-head">
              <strong>{c.label}</strong>
              <span className="muted">
                {c.weeks.length} week{c.weeks.length === 1 ? '' : 's'} · {total} questions
              </span>
            </div>

            {c.weeks.map((w) => (
              <div key={w.week}>
                <button className="action-btn" onClick={() => onWeek(c.id, w.week)}>
                  <span className="action-title">Week {w.week}</span>
                  <span className="action-sub">
                    {w.questions.length} question{w.questions.length === 1 ? '' : 's'}
                    {w.ladders.length > 0 &&
                      ` · ${w.ladders.length} set${w.ladders.length === 1 ? '' : 's'} to build`}
                  </span>
                </button>
                {w.ladders.map((l) => (
                  <button
                    key={l.id}
                    className="ghost wide week-ladder"
                    onClick={() => onLadder(l.id)}
                  >
                    Build up: {l.label} ({l.items})
                  </button>
                ))}
              </div>
            ))}

            {c.weeks.length > 1 && (
              <button className="ghost wide" onClick={() => onCourse(c.id)}>
                All {total} across every week
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
