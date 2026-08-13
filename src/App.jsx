import { useEffect, useState } from 'react'
import TopicPicker from './components/TopicPicker.jsx'
import StudySessionView from './components/StudySessionView.jsx'
import SpeedRound from './components/SpeedRound.jsx'
import ProgressView from './components/ProgressView.jsx'
import ReferenceView from './components/ReferenceView.jsx'
import Walkthroughs from './components/Walkthroughs.jsx'
import LessonView from './components/LessonView.jsx'
import Progression from './components/Progression.jsx'
import UpdateCheck from './components/UpdateCheck.jsx'
import { TOPICS, getTopicBank, getMixedBank, getSpeedBank, getMissedBank } from './lib/topics.js'
import { getAllProgress } from './lib/db.js'

// One shared progress namespace: question ids are globally unique, so a
// question answered in mixed review and in its own topic session share
// the same spaced-repetition history.
const PROGRESS_MODE = 'prep'

export default function App() {
  const [view, setView] = useState({ name: 'topics' })
  const [missedBank, setMissedBank] = useState(null)

  const label = view.topicId ? TOPICS.find((t) => t.id === view.topicId)?.label : null

  // The missed set changes every session, so rebuild it when one is requested.
  useEffect(() => {
    if (view.name !== 'misses') return
    getAllProgress().then((rows) => setMissedBank(getMissedBank(rows)))
  }, [view.name])

  return (
    <div className="app-shell">
      <header className="app-header">
        {view.name === 'topics' ? (
          <h1>Orgo Prep</h1>
        ) : (
          <button className="back" onClick={() => setView({ name: 'topics' })}>
            ‹ Topics
          </button>
        )}
        <button
          className={`header-link ${view.name === 'progress' ? 'active' : ''}`}
          onClick={() => setView(view.name === 'progress' ? { name: 'topics' } : { name: 'progress' })}
        >
          Progress
        </button>
      </header>

      <main className="app-main">
        {view.name === 'topics' && (
          <TopicPicker
            onStudy={(topicId) => setView({ name: 'session', topicId })}
            onSpeed={(topicId) => setView({ name: 'speed', topicId })}
            onMixed={() => setView({ name: 'session', topicId: null })}
            onLearn={(topicId) => setView({ name: 'learn', topicId })}
            onLesson={(topicId) => setView({ name: 'lesson', topicId })}
            onReviewMisses={() => {
              setMissedBank(null)
              setView({ name: 'misses' })
            }}
            onPlan={() => setView({ name: 'plan' })}
          />
        )}

        {view.name === 'plan' && (
          <Progression
            onPickTopic={(topicId) => setView({ name: 'session', topicId })}
            onNotes={(topicId) => setView({ name: 'lesson', topicId })}
          />
        )}

        {view.name === 'misses' &&
          (missedBank ? (
            <StudySessionView
              mode={PROGRESS_MODE}
              title="Your misses"
              bank={missedBank}
              sessionSize={Math.min(20, missedBank.length)}
            />
          ) : (
            <p>Loading…</p>
          ))}

        {view.name === 'learn' && (
          <ReferenceView
            topicId={view.topicId}
            title={label}
            onStudy={() => setView({ name: 'session', topicId: view.topicId })}
            onWalk={() => setView({ name: 'walk', topicId: view.topicId })}
          />
        )}

        {view.name === 'lesson' && (
          <LessonView
            topicId={view.topicId}
            title={label}
            onNotes={() => setView({ name: 'learn', topicId: view.topicId })}
            onStudy={() => setView({ name: 'session', topicId: view.topicId })}
          />
        )}

        {view.name === 'walk' && (
          <Walkthroughs
            topicId={view.topicId}
            title={label}
            onStudy={() => setView({ name: 'session', topicId: view.topicId })}
          />
        )}

        {view.name === 'session' && (
          <StudySessionView
            key={view.topicId ?? 'mixed'}
            mode={PROGRESS_MODE}
            title={label ?? 'Mixed review'}
            bank={view.topicId ? getTopicBank(view.topicId) : getMixedBank()}
            sessionSize={15}
          />
        )}

        {view.name === 'speed' && (
          <SpeedRound
            drillId={view.topicId}
            mode={PROGRESS_MODE}
            title={label}
            bank={getSpeedBank(view.topicId)}
            onExit={() => setView({ name: 'topics' })}
          />
        )}

        {view.name === 'progress' && <ProgressView />}
      </main>
      {view.name === 'topics' && <UpdateCheck />}
    </div>
  )
}
