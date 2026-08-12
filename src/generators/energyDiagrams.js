import { rngFor, pick, makeChoices, shuffleWith } from './util.js'

/**
 * Questions generated FROM a reaction coordinate profile, so the diagram
 * and its answer cannot disagree.
 *
 * A profile alternates valleys and peaks: [reactants, TS, ...,
 * products]. Step count, intermediate count, exo/endothermic character
 * and the rate-determining step are all read off the same array the
 * picture is drawn from.
 */

// Deliberately varied: one-step and two-step, exo and endo, with the
// taller barrier sometimes first and sometimes second.
const PROFILES = [
  { levels: [0, 55, -25], name: 'one-step exothermic' },
  { levels: [0, 70, -10], name: 'one-step exothermic' },
  { levels: [0, 60, 30], name: 'one-step endothermic' },
  { levels: [0, 80, 45], name: 'one-step endothermic' },
  { levels: [0, 75, 25, 55, -20], name: 'two-step, first barrier tallest' },
  { levels: [0, 65, 20, 45, -30], name: 'two-step, first barrier tallest' },
  { levels: [0, 40, 15, 70, -15], name: 'two-step, second barrier tallest' },
  { levels: [0, 35, 10, 60, 25], name: 'two-step endothermic overall' },
  { levels: [0, 50, -20, 30, -45], name: 'two-step exothermic' },
  { levels: [0, 85, 40, 70, 10], name: 'two-step endothermic' },
  // The taller PEAK belongs to step 1, but step 2 has the bigger climb
  // from its own valley — so the rate-determining step is not the highest
  // point on the page. Without this case the lesson is never tested.
  { levels: [0, 60, -30, 50, -40], name: 'two-step, tallest peak is NOT the rate-determining step' },
  { levels: [0, 45, -35, 40, -55], name: 'two-step, tallest peak is NOT the rate-determining step' },
]

const stepsOf = (levels) => (levels.length - 1) / 2
const intermediatesOf = (levels) => stepsOf(levels) - 1

/** Barrier for each step, measured from the valley that precedes it. */
function barriers(levels) {
  const out = []
  for (let s = 0; s < stepsOf(levels); s++) out.push(levels[s * 2 + 1] - levels[s * 2])
  return out
}

function rdsIndex(levels) {
  const b = barriers(levels)
  return b.indexOf(Math.max(...b))
}

const ORDINAL = ['first', 'second', 'third']

export function generateDiagramSteps(seed) {
  // One question per profile; more seeds would only repeat ids.
  if (seed >= PROFILES.length) return null
  const rng = rngFor(seed * 4409 + 7)
  const p = PROFILES[seed % PROFILES.length]
  const steps = stepsOf(p.levels)
  const { choices, correctIndex } = makeChoices(rng, steps, [1, 2, 3, 4])

  return {
    id: `edsteps-${seed}`,
    topic: 'energy-kinetics',
    kind: 'mcq',
    prompt: 'How many STEPS does this mechanism have?',
    choices,
    correctIndex,
    explanation: `Each peak is one transition state, and each transition state is one step. This profile has ${steps} peak${steps === 1 ? '' : 's'}, so ${steps} step${steps === 1 ? '' : 's'}.`,
    teach: 'Count peaks to count steps. Count wells between peaks to count intermediates.',
    visual: { type: 'energy', levels: p.levels },
  }
}

export function generateDiagramIntermediates(seed) {
  // One question per profile; more seeds would only repeat ids.
  if (seed >= PROFILES.length) return null
  const rng = rngFor(seed * 911 + 13)
  const p = PROFILES[seed % PROFILES.length]
  const n = intermediatesOf(p.levels)
  const { choices, correctIndex } = makeChoices(rng, n, [0, 1, 2, 3])

  return {
    id: `edint-${seed}`,
    topic: 'energy-kinetics',
    kind: 'mcq',
    prompt: 'How many INTERMEDIATES does this mechanism have?',
    choices,
    correctIndex,
    explanation:
      n === 0
        ? 'There is no well between peaks — a single concerted step has no intermediate, only a transition state at the top.'
        : `There ${n === 1 ? 'is 1 dip' : `are ${n} dips`} between peaks. Each is a local minimum where a real (if short-lived) species sits.`,
    teach: 'Intermediates sit in wells (energy minima) and can sometimes be detected. Transition states sit at peaks and never can.',
    visual: { type: 'energy', levels: p.levels },
  }
}

export function generateDiagramThermo(seed) {
  // One question per profile; more seeds would only repeat ids.
  if (seed >= PROFILES.length) return null
  const rng = rngFor(seed * 3299 + 5)
  const p = PROFILES[seed % PROFILES.length]
  const exo = p.levels[p.levels.length - 1] < p.levels[0]
  const correct = exo ? 'Exothermic — products are lower in energy than reactants' : 'Endothermic — products are higher in energy than reactants'
  const choices = shuffleWith(rng, [
    'Exothermic — products are lower in energy than reactants',
    'Endothermic — products are higher in energy than reactants',
  ])

  return {
    id: `edthermo-${seed}`,
    topic: 'energy-kinetics',
    kind: 'mcq',
    prompt: 'Is the OVERALL reaction shown exothermic or endothermic?',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `Compare only the start and the end. The products finish ${exo ? 'below' : 'above'} the reactants, so the reaction is ${exo ? 'exothermic (negative ΔH)' : 'endothermic (positive ΔH)'}.`,
    teach: 'Overall ΔH depends only on where you start and where you finish. The height of the hills in between has nothing to do with it.',
    visual: { type: 'energy', levels: p.levels },
  }
}

export function generateDiagramRds(seed) {
  const rng = rngFor(seed * 7717 + 11)
  const multi = PROFILES.filter((p) => stepsOf(p.levels) > 1)
  if (seed >= multi.length) return null
  const p = multi[seed]
  const idx = rdsIndex(p.levels)
  const b = barriers(p.levels)
  const choices = shuffleWith(rng, ['The first step', 'The second step'])
  const correct = idx === 0 ? 'The first step' : 'The second step'

  return {
    id: `edrds-${seed}`,
    topic: 'energy-kinetics',
    kind: 'mcq',
    prompt: 'Which step is the RATE-DETERMINING step?',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `Measure each barrier from the valley just before it: step 1 climbs ${b[0]}, step 2 climbs ${b[1]}. The ${ORDINAL[idx]} step has the larger barrier, so it sets the overall rate.`,
    teach: 'The rate-determining step is the one with the tallest barrier measured from the valley BEFORE it — not simply the highest point on the page.',
    visual: { type: 'energy', levels: p.levels },
  }
}

export function generateDiagramEa(seed) {
  // One question per profile; more seeds would only repeat ids.
  if (seed >= PROFILES.length) return null
  const rng = rngFor(seed * 601 + 23)
  const p = PROFILES[seed % PROFILES.length]
  const ea = barriers(p.levels)[0]
  const distractors = [ea + 15, ea - 15, ea + 30, Math.abs(p.levels[p.levels.length - 1] - p.levels[0])]
  const { choices, correctIndex } = makeChoices(rng, ea, distractors.filter((v) => v > 0 && v !== ea))

  return {
    id: `edea-${seed}`,
    topic: 'energy-kinetics',
    kind: 'mcq',
    prompt: 'Reading off the axis, what is the activation energy (Ea) of the FIRST step, in kJ/mol?',
    choices,
    correctIndex,
    explanation: `Ea is the climb from the reactants (${p.levels[0]}) up to the first transition state (${p.levels[1]}) — a rise of ${ea}. The overall energy change is a different quantity entirely.`,
    teach: 'Ea is measured from the starting valley UP to the peak. ΔH is measured from start to finish. Confusing the two is the classic error on these diagrams.',
    visual: { type: 'energy', levels: p.levels, showEa: true, eaStep: 0 },
  }
}

/** Identify what a labelled point on the curve represents. */
export function generateDiagramPoint(seed) {
  const rng = rngFor(seed * 1721 + 29)
  const p = PROFILES[seed % PROFILES.length]
  const pointable = p.levels.map((_, i) => i).filter((i) => i > 0 && i < p.levels.length - 1)
  if (!pointable.length) return null
  const index = pick(rng, pointable)
  const isPeak = index % 2 === 1

  const correct = isPeak
    ? 'A transition state — an energy maximum that cannot be isolated'
    : 'An intermediate — a real species sitting in an energy minimum'
  const choices = shuffleWith(rng, [
    'A transition state — an energy maximum that cannot be isolated',
    'An intermediate — a real species sitting in an energy minimum',
    'The activation energy',
    'The overall energy change of the reaction',
  ])

  return {
    id: `edpoint-${seed}`,
    topic: 'energy-kinetics',
    kind: 'mcq',
    prompt: 'What does the labelled point A represent?',
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: isPeak
      ? 'A sits at a peak. Peaks are transition states: partial bonds, maximum energy, and impossible to isolate.'
      : 'A sits in a well between two peaks. Wells hold intermediates — real species, however short-lived. A carbocation is the usual example.',
    teach: 'Peak = transition state (drawn with dashed partial bonds and a double dagger). Well = intermediate (a species you can draw normally).',
    visual: { type: 'energy', levels: p.levels, marks: [{ index, label: 'A' }] },
  }
}
