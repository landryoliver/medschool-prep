import { useState } from 'react'
import TopicPicker from './components/TopicPicker.jsx'
import StudySessionView from './components/StudySessionView.jsx'
import SpeedRound from './components/SpeedRound.jsx'
import ProgressView from './components/ProgressView.jsx'
import ReferenceView from './components/ReferenceView.jsx'
import { TOPICS, getTopicBank, getMixedBank, getSpeedBank } from './lib/topics.js'

// One shared progress namespace: question ids are globally unique, so a
// question answered in mixed review and in its own topic session share
// the same spaced-repetition history.
const PROGRESS_MODE = 'prep'

export default function App() {
  const [view, setView] = useState({ name: 'topics' })

  const label = view.topicId ? TOPICS.find((t) => t.id === view.topicId)?.label : null

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
          />
        )}

        {view.name === 'learn' && (
          <ReferenceView
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
    </div>
  )
}
