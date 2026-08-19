import { useEffect, useMemo, useState } from 'react'
import { ladderById } from './ladders/definitions.jsx'
import { loadLadder, saveLadder, staleness } from '../lib/ladderProgress.js'
import { useNotation } from '../lib/useNotation.js'
import NotationToggle from './NotationToggle.jsx'
import { revealAccent } from '../lib/revealAccent.js'

/**
 * Learn one, name it against everything you already have, add the next.
 *
 * Shuffling a set of twenty unfamiliar things tests a set you do not have
 * yet: every card is equally unknown, so a miss carries no information and
 * the deck never feels like it is shrinking. Building the set one item at a
 * time means each round is mostly things you know with exactly one new thing
 * to place among them, so what gets tested is telling them APART.
 *
 * The chain is soft. A first version stored only how far you had got, which
 * made advancing the only possible action — the set you had already built was
 * invisible and unreachable, and coming back after a week dropped you
 * straight into new material. Now the learned set itself is stored, so it can
 * be reviewed alone or browsed, and a gap since the last visit offers a
 * warm-up before anything new is added.
 */
/**
 * Accepts the item's name or any of its aliases — a three- or one-letter
 * code, a base's letter, a bare shape name. Typing "W" for tryptophan is
 * recall; making you spell it is a spelling test.
 */
function typedMatches(input, item) {
  const v = input.trim().toLowerCase()
  if (!v) return false
  return [item.name, ...(item.aliases ?? [])].some((a) => String(a).trim().toLowerCase() === v)
}

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function LadderDrill({ ladderId = 'aminoacids', onDone, onInnerBack }) {
  const ladder = ladderById(ladderId)
  const order = useMemo(() => ladder.items.map((i) => i.key), [ladder])

  const [state, setState] = useState(() => loadLadder(ladder.id, order))
  const [phase, setPhase] = useState('hub') // hub | learn | drill | browse | view
  const [reviewOnly, setReviewOnly] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [queue, setQueue] = useState([])
  const [qi, setQi] = useState(0)
  const [missed, setMissed] = useState([])
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(false)
  const [notation, setNotation] = useNotation()
  // Items ticked on the hub for a custom round. Picking your own set is the
  // point of showing them all: the weak ones are rarely the next ones.
  const [picked, setPicked] = useState(() => new Set())
  const [typed, setTyped] = useState('')

  // Measured once on entry. Reading it live would make the prompt vanish
  // mid-session the moment anything saved.
  const [gap] = useState(() => staleness(loadLadder(ladder.id, order).lastSeenAt))

  // A set whose answers are not single words cannot be typed fairly.
  const typeable = ladder.typeable !== false
  const answerMode = typeable ? (state.answerMode ?? 'mc') : 'mc'
  const learnedKeys = state.learned
  const learnedSet = new Set(learnedKeys)
  const learnedItems = ladder.items.filter((i) => learnedSet.has(i.key))
  const next = ladder.items.find((i) => !learnedSet.has(i.key)) ?? null
  const allDone = !next

  useEffect(() => {
    saveLadder(ladder.id, state)
  }, [ladder.id, state])

  // The header arrow walks this screen's own steps before leaving it, so
  // there is one back control with one meaning instead of a large arrow that
  // jumps home and a small one that goes up a level.
  useEffect(() => {
    if (!onInnerBack) return undefined
    const step =
      phase === 'view'
        ? () => setPhase('browse')
        : phase === 'hub'
          ? null
          : () => {
              setPhase('hub')
              setResult(null)
            }
    onInnerBack(() => step)
    return () => onInnerBack(() => null)
  }, [phase, onInnerBack])

  const touch = () => setState((s) => ({ ...s, lastSeenAt: Date.now() }))
  const setAnswerMode = (m) => setState((s) => ({ ...s, answerMode: m, promoted: true }))

  // Once the whole set is in place, picking from four is the easy version of
  // a test you have already passed, so typing becomes the default. Done once
  // and recorded, so a later switch back to multiple choice sticks — and so
  // it never asks, which would be a question on every round forever.
  useEffect(() => {
    if (typeable && allDone && !state.promoted && state.answerMode !== 'type') {
      setState((s) => ({ ...s, answerMode: 'type', promoted: true }))
    }
  }, [allDone, state.promoted, state.answerMode])

  function startDrill(review, custom) {
    const pool = custom ?? (review ? learnedItems : [...learnedItems, next])
    setReviewOnly(review)
    setQueue(shuffled(pool))
    setQi(0)
    setMissed([])
    setResult(null)
    setTyped('')
    setRetry(false)
    setPhase('drill')
  }

  const card = queue[qi]

  // Four options, preferring things already learned — the question is "which
  // of the ones you know is this", so the wrong answers should be things you
  // know. Early on there are not four yet, so the rest come from further up.
  const options = useMemo(() => {
    if (!card) return []
    const known = queue.filter((i) => i.key !== card.key)
    const rest = ladder.items.filter((i) => i.key !== card.key && !known.some((k) => k.key === i.key))
    return shuffled([card, ...[...shuffled(known), ...shuffled(rest)].slice(0, 3)])
  }, [card, ladder])

  function grade(correct) {
    setResult(correct ? 'right' : 'wrong')
    if (!correct) setMissed((m) => (m.some((x) => x.key === card.key) ? m : [...m, card]))
  }

  function advance() {
    setResult(null)
    setTyped('')
    if (qi + 1 < queue.length) {
      setQi(qi + 1)
      return
    }
    // Anything missed comes back before the round counts as passed. Advancing
    // past something you just failed to name turns "learn" into click-through.
    if (missed.length) {
      setQueue(shuffled(missed))
      setMissed([])
      setQi(0)
      setRetry(true)
      return
    }
    // Spread, or the answer mode and the promotion flag are lost every time
    // a round finishes — the setting would silently reset itself.
    setState((s) => ({
      ...s,
      learned: reviewOnly || !next ? s.learned : [...s.learned, next.key],
      lastSeenAt: Date.now(),
    }))
    setPhase('hub')
  }

  const Visual = ladder.Visual
  const Facts = ladder.Facts
  const showNotation = !!ladder.notation

  const header = (
    <>
      <div className="session-bar">
        <span className="muted">
          {phase === 'drill'
            ? `${qi + 1} / ${queue.length}${retry ? ' · missed' : ''}`
            : `${learnedKeys.length} of ${ladder.items.length} learned`}
        </span>
        {phase === 'hub' && (
          <button className="ghost small" onClick={onDone}>
            Done
          </button>
        )}
      </div>
      {/* The bar has to measure whatever the number beside it measures. It
          used to always show learned-of-total, so a round that had just
          started under "1 / 10" sat half filled, because ten of twenty were
          learned — two different scales one line apart. */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${
              phase === 'drill'
                ? (qi / Math.max(queue.length, 1)) * 100
                : (learnedKeys.length / ladder.items.length) * 100
            }%`,
          }}
        />
      </div>
    </>
  )

  // ---- browse: every item, learned or not ------------------------------
  if (phase === 'view' && viewing) {
    return (
      <div>
        {header}
        <div
          className="card ladder-learn"
          style={revealAccent(viewing.accent, true)}
        >
          <div className="aa-head">
            <strong>{viewing.name}</strong>
            {viewing.sub && <span className="muted">{viewing.sub}</span>}
          </div>
          {showNotation && <NotationToggle notation={notation} onChange={setNotation} />}
          <Visual item={viewing} notation={notation} />
          <Facts item={viewing} />
        </div>

      </div>
    )
  }

  if (phase === 'browse') {
    return (
      <div>
        {header}
        <p className="muted fc-hint">
          Tap any {ladder.unit} to read it.
        </p>
        <div className="ladder-grid">
          {ladder.items.map((i, n) => (
            <button
              key={i.key}
              className={`ladder-chip${learnedSet.has(i.key) ? ' learned' : ''}`}
              onClick={() => {
                setViewing(i)
                setPhase('view')
              }}
            >
              <span className="ladder-chip-n">{n + 1}</span>
              <span className="ladder-chip-name">{i.name}</span>
              {i.sub && <span className="muted ladder-chip-sub">{i.sub}</span>}
            </button>
          ))}
        </div>

      </div>
    )
  }

  // ---- learn: the next unlearned item ----------------------------------
  if (phase === 'learn' && next) {
    return (
      <div>
        {header}
        <p className="muted fc-hint">
          {learnedKeys.length === 0
            ? `Learn it, then name it. One at a time to ${ladder.items.length}.`
            : `New — then name it against your ${learnedKeys.length}.`}
        </p>
        {showNotation && <NotationToggle notation={notation} onChange={setNotation} />}
        <div
          className="card ladder-learn"
          style={revealAccent(next.accent, true)}
        >
          <div className="ladder-new">New</div>
          <div className="aa-head">
            <strong>{next.name}</strong>
            {next.sub && <span className="muted">{next.sub}</span>}
          </div>
          <Visual item={next} notation={notation} />
          <Facts item={next} />
        </div>
        <button className="primary wide" onClick={() => startDrill(false)}>
          {learnedKeys.length === 0 ? 'Got it — name it' : `Got it — name all ${learnedKeys.length + 1}`}
        </button>
      </div>
    )
  }

  // ---- drill -----------------------------------------------------------
  if (phase === 'drill' && card) {
    return (
      <div>
        {header}
        {/* No caption. "Review · 10 you know" restated the button just
            pressed and the "1 / 10" directly above it, and the notation line
            described a chart already on screen. Only the retry state says
            anything new — that these are repeats. */}
        {retry && <p className="muted fc-hint">Missed only.</p>}
        {showNotation && <NotationToggle notation={notation} onChange={setNotation} compact />}
        <div
          className="card flashcard"
          style={revealAccent(card.accent, !!result)}
        >
          <Visual item={card} hideAnswer={!result} notation={notation} />
        </div>

        {!result &&
          (answerMode === 'type' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (typed.trim()) grade(typedMatches(typed, card))
              }}
            >
              {/* No autoFocus: it opened the keyboard over the structure
                  before you had seen it. Tap the box when you are ready.
                  The field is named "answer" and the placeholder leads with
                  an example rather than the word "name", because iOS reads
                  both and was offering to autofill a contact. */}
              <input
                className="text-input"
                name="answer"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={ladder.typePlaceholder ?? 'Answer'}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button className="primary wide" type="submit">
                Check
              </button>
            </form>
          ) : (
            <div>
              {options.map((o) => (
                <button key={o.key} className="choice-btn" onClick={() => grade(o.key === card.key)}>
                  {o.name} {o.sub && <span className="muted">({o.sub})</span>}
                </button>
              ))}
            </div>
          ))}

        {result && (
          <>
            <p className={`feedback ${result === 'right' ? 'good' : 'bad'}`}>
              {result === 'right' ? 'Correct' : `That was ${card.name} — it comes back this round`}
            </p>
            <button className="primary wide" onClick={advance}>
              {qi + 1 < queue.length
                ? 'Next →'
                : missed.length
                  ? 'Retry the missed ones →'
                  : reviewOnly
                    ? 'Finish review →'
                    : 'Add it to the set →'}
            </button>
          </>
        )}
      </div>
    )
  }

  // ---- hub -------------------------------------------------------------
  const canReview = learnedItems.length >= 2
  return (
    <div>
      {header}

      {/* Coming back after a break should not drop you straight into new
          material — the set you already built is the thing at risk, not the
          next item. */}
      {gap && canReview && (
        <div className="card ladder-nudge">
          <strong>Been {gap.text}.</strong>
          <p className="muted">
            Warm up on the {learnedItems.length} you know first?
          </p>
          <button
            className="primary wide"
            onClick={() => {
              touch()
              startDrill(true)
            }}
          >
            Warm up →
          </button>
        </div>
      )}

      <p className="muted fc-hint">{ladder.blurb}</p>

      {allDone ? (
        <div className="card done-card">
          <h2 className="section-title">All {ladder.items.length} learned</h2>
          <p className="muted">
            Review keeps it. The question bank for this topic tests it on a schedule.
          </p>
        </div>
      ) : (
        <button
          className="action-btn primary-action"
          onClick={() => {
            touch()
            setPhase('learn')
          }}
        >
          <span className="action-title">
            {learnedKeys.length === 0 ? `Start — learn the first ${ladder.unit}` : `Add the next ${ladder.unit}`}
          </span>
          <span className="action-sub">
            {learnedKeys.length === 0
              ? `${ladder.items.length} to go`
              : `${next.name} · ${learnedKeys.length + 1} of ${ladder.items.length}`}
          </span>
        </button>
      )}

      <div className="action-row">
        {canReview && (
          <button
            className="action-btn"
            onClick={() => {
              touch()
              startDrill(true)
            }}
          >
            <span className="action-title">Review</span>
            <span className="action-sub">The {learnedItems.length} you know</span>
          </button>
        )}
        <button className="action-btn" onClick={() => setPhase('browse')}>
          <span className="action-title">Browse all</span>
          <span className="action-sub">All {ladder.items.length}</span>
        </button>
      </div>

      {/* How rounds ask. Lives here rather than over each question, because
          it is a setting rather than part of answering one. */}
      {typeable && (
      <div className="seg wide-seg answer-mode">
        <button className={answerMode === 'mc' ? 'active' : ''} onClick={() => setAnswerMode('mc')}>
          Multiple choice
        </button>
        <button className={answerMode === 'type' ? 'active' : ''} onClick={() => setAnswerMode('type')}>
          Type it
        </button>
      </div>
      )}
      {allDone && answerMode === 'type' && (
        <p className="muted fc-hint">All {ladder.items.length} learned — typing is the harder half.</p>
      )}

      {/* Both halves of the set, learned first and the rest dimmed below.
          Tapping picks rather than opens: the items you most want to drill
          are the shaky ones, which are rarely the next ones in order, and
          the two buttons above already cover the common path. */}
      {ladder.items.length > 0 && (
        <>
          <p className="muted fc-hint ladder-pick-hint">
            Tap to pick your own round.{picked.size > 0 && ` ${picked.size} picked.`}
          </p>
          {[
            { title: 'Learned', items: learnedItems, learned: true },
            { title: 'Not yet', items: ladder.items.filter((i) => !learnedSet.has(i.key)), learned: false },
          ]
            .filter((g) => g.items.length)
            .map((g) => (
              <section key={g.title} className="stage-block">
                <div className="stage-head">
                  <h2 className="stage-title">{g.title}</h2>
                  <span className="muted stage-count">
                    {g.items.length} of {ladder.items.length}
                  </span>
                </div>
                <div className="ladder-grid">
                  {g.items.map((i) => (
                    <button
                      key={i.key}
                      className={`ladder-chip${g.learned ? ' learned' : ' unlearned'}${
                        picked.has(i.key) ? ' picked' : ''
                      }`}
                      aria-pressed={picked.has(i.key)}
                      onClick={() =>
                        setPicked((p) => {
                          const n = new Set(p)
                          n.has(i.key) ? n.delete(i.key) : n.add(i.key)
                          return n
                        })
                      }
                    >
                      <span className="ladder-chip-name">{i.name}</span>
                      {i.sub && <span className="muted ladder-chip-sub">{i.sub}</span>}
                    </button>
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {/* Sticks to the bottom while you pick, so the button is reachable
          without scrolling back up a list of twenty. */}
      {picked.size > 0 && (
        <div className="ladder-picked-bar">
          <button
            className="primary"
            onClick={() => {
              touch()
              startDrill(true, ladder.items.filter((i) => picked.has(i.key)))
            }}
          >
            Drill {picked.size} picked →
          </button>
          <button className="ghost" onClick={() => setPicked(new Set())}>
            Clear
          </button>
        </div>
      )}

      {learnedItems.length > 0 && (
        <button
          className="ghost wide"
          onClick={() => {
            if (confirm(`Clear your progress on all ${ladder.items.length}? This cannot be undone.`)) {
              setState({ learned: [], lastSeenAt: Date.now() })
              setPhase('hub')
            }
          }}
        >
          Start the set over
        </button>
      )}
    </div>
  )
}
