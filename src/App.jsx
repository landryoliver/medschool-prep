import { useEffect, useState } from 'react'
import TopicPicker from './components/TopicPicker.jsx'
import StudySessionView from './components/StudySessionView.jsx'
import SpeedRound from './components/SpeedRound.jsx'
import ProgressView from './components/ProgressView.jsx'
import ReferenceView from './components/ReferenceView.jsx'
import Walkthroughs from './components/Walkthroughs.jsx'
import LessonView from './components/LessonView.jsx'
import Flashcards from './components/Flashcards.jsx'
import LadderDrill from './components/LadderDrill.jsx'
import LadderPicker from './components/LadderPicker.jsx'
import Progression from './components/Progression.jsx'
import UpdateCheck from './components/UpdateCheck.jsx'
import { TOPICS, getTopicBank, getMixedBank, getSpeedBank, getMissedBank } from './lib/topics.js'
import { getAllProgress } from './lib/db.js'

// One shared progress namespace: question ids are globally unique, so a
// question answered in mixed review and in its own topic session share
// the same spaced-repetition history.
const PROGRESS_MODE = 'prep'

// What the back arrow returns you to, by view name. The header used to jump
// straight home from anywhere, which meant a second, smaller back control had
// to exist inside pages for "the step before" — two arrows, two meanings.
const BACK_LABEL = {
  topics: 'Topics',
  ladders: 'Sets',
  ladder: 'Set',
  learn: 'Notes',
  lesson: 'Lesson',
  plan: 'Progression',
  cards: 'Flashcards',
  progress: 'Progress',
}

export default function App() {
  // A stack, not a single view: one back arrow that always means "the page
  // before this one".
  const [stack, setStack] = useState([{ name: 'topics' }])
  const view = stack[stack.length - 1]
  const [missedBank, setMissedBank] = useState(null)
  // A screen with its own internal steps (the ladder's hub, browse and card
  // views) registers a handler here, so the same arrow walks those first
  // instead of leaving the screen from halfway in.
  const [innerBack, setInnerBack] = useState(null)

  const setView = (v) => setStack((s) => [...s, v])
  const goBack = () => {
    if (innerBack) {
      innerBack()
      return
    }
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }

  const previous = stack.length > 1 ? stack[stack.length - 2] : null
  const backLabel = innerBack ? 'Back' : BACK_LABEL[previous?.name] ?? 'Back'

  const label = view.topicId ? TOPICS.find((t) => t.id === view.topicId)?.label : null

  // The missed set changes every session, so rebuild it when one is requested.
  useEffect(() => {
    if (view.name !== 'misses') return
    getAllProgress().then((rows) => setMissedBank(getMissedBank(rows)))
  }, [view.name])

  return (
    <div className="app-shell">
      <header className="app-header">
        {stack.length === 1 && !innerBack ? (
          <h1>Orgo Prep</h1>
        ) : (
          <button className="back" onClick={goBack}>
            ‹ {backLabel}
          </button>
        )}
        <button
          className={`header-link ${view.name === 'progress' ? 'active' : ''}`}
          onClick={() => (view.name === 'progress' ? goBack() : setView({ name: 'progress' }))}
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
            onCards={() => setView({ name: 'cards' })}
            onBuild={(ladderId) => setView(ladderId ? { name: 'ladder', ladderId } : { name: 'ladders' })}
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

        {view.name === 'cards' && <Flashcards onDone={goBack} />}

        {view.name === 'ladders' && (
          <LadderPicker
            onPick={(ladderId) => setView({ name: 'ladder', ladderId })}
            onDone={goBack}
          />
        )}

        {view.name === 'ladder' && (
          <LadderDrill ladderId={view.ladderId} onDone={goBack} onInnerBack={setInnerBack} />
        )}

        {view.name === 'lesson' && (
          <LessonView
            topicId={view.topicId}
            title={label}
            onNotes={() => setView({ name: 'learn', topicId: view.topicId })}
            onStudy={() => setView({ name: 'session', topicId: view.topicId })}
            onCards={view.topicId === 'aminoacids' ? () => setView({ name: 'cards' }) : undefined}
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
