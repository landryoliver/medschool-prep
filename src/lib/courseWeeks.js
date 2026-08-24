import { getMixedBank } from './topics.js'
import { LADDERS } from '../components/ladders/definitions.jsx'

/**
 * Course and week are provenance: which class the material came from, and
 * which week of it. Both are sparse on purpose — only material actually taken
 * from a syllabus carries them, so this view shows the course as it has been
 * fed in rather than pretending the whole bank belongs to a class.
 *
 * Derived from the bank instead of a hand-kept index, because a list of weeks
 * maintained separately from the questions is a list that goes stale the first
 * time a question is retagged.
 */

export const COURSE_LABELS = {
  orgo: 'Organic Chemistry',
  genchem: 'General Chemistry',
  biochem: 'Biochemistry',
  bio: 'Biology',
  physics: 'Physics',
  psych: 'Psych/Soc',
}

let cache = null

function build() {
  const courses = new Map()

  const slot = (course, week) => {
    if (!courses.has(course)) courses.set(course, new Map())
    const weeks = courses.get(course)
    if (!weeks.has(week)) weeks.set(week, { week, questions: [], ladders: [] })
    return weeks.get(week)
  }

  for (const q of getMixedBank()) {
    if (!q.course || q.week == null) continue
    slot(q.course, q.week).questions.push(q)
  }
  for (const l of LADDERS) {
    if (!l.course || l.week == null) continue
    slot(l.course, l.week).ladders.push({ id: l.id, label: l.label, items: l.items.length })
  }

  return [...courses]
    .map(([id, weeks]) => ({
      id,
      label: COURSE_LABELS[id] ?? id,
      weeks: [...weeks.values()].sort((a, b) => a.week - b.week),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Courses that have tagged material, each with its weeks in order. */
export function courseIndex() {
  if (!cache) cache = build()
  return cache
}

export function weekBank(courseId, week) {
  const c = courseIndex().find((x) => x.id === courseId)
  return c?.weeks.find((w) => w.week === week)?.questions ?? []
}

/** Every tagged question for a course, all weeks — for a end-of-term review. */
export function courseBank(courseId) {
  const c = courseIndex().find((x) => x.id === courseId)
  return c ? c.weeks.flatMap((w) => w.questions) : []
}
