import fs from 'node:fs'
import { TOPICS, getTopicBank, getMixedBank, getSpeedBank } from '../src/lib/topics.js'
import { molecularFormula, condensedFormula, hydrogensAt, degreesOfUnsaturation, hybridizationAt, canonicalKey, isValidMolecule } from '../src/lib/chem/molecule.js'
import { nameHaloalkane, nameAlkanol, nameAlkene, nameAlkyne } from '../src/generators/nomenclature.js'
import { lookupGeometry, GEOMETRIES } from '../src/lib/chem/vsepr.js'
import { nextProgressState, selectSessionQuestions, BOX_INTERVALS_MS } from '../src/lib/srs.js'
import { TOPIC_META, buttonContrast } from '../src/lib/topicMeta.js'
import { ANCHORS as PKA_ANCHORS } from '../src/components/PkaLadder.jsx'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server.browser'
import QuestionVisual from '../src/components/visuals/QuestionVisual.jsx'
import { SUB_BOND, LABEL_GAP, HIGHLIGHT_R } from '../src/components/visuals/SkeletalDiagram.jsx'
import AminoAcidReference from '../src/components/AminoAcidReference.jsx'
import SideChainStructure, { buildSideChain, buildAminoAcid, labelBox, aminoSpan } from '../src/components/visuals/SideChainStructure.jsx'
import { parseFormula as parseFormulaLib } from '../src/lib/chem/formula.js'
import { referenceElementsFor } from '../src/lib/chem/elementsInText.js'
import PERIODIC from '../src/data/genchem/periodicTable.json' with { type: 'json' }
import Flashcards from '../src/components/Flashcards.jsx'
import GroupPrimer from '../src/components/GroupPrimer.jsx'
import PkaLadder from '../src/components/PkaLadder.jsx'
import VseprChart from '../src/components/VseprChart.jsx'
import CompoundTable from '../src/components/CompoundTable.jsx'
import LessonView from '../src/components/LessonView.jsx'
import Walkthroughs from '../src/components/Walkthroughs.jsx'
import BackupPanel from '../src/components/BackupPanel.jsx'
import LadderDrill from '../src/components/LadderDrill.jsx'
import LadderPicker from '../src/components/LadderPicker.jsx'
import { buildNucleobase } from '../src/components/visuals/NucleobaseStructure.jsx'
import { LADDERS, ladderOrder } from '../src/components/ladders/definitions.jsx'
import { loadLadder, saveLadder, staleness } from '../src/lib/ladderProgress.js'
import { revealAccent } from '../src/lib/revealAccent.js'

let errors = 0
const fail = (msg) => {
  errors++
  console.log('  FAIL: ' + msg)
}

const SUBSCRIPT = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 }

/**
 * Counts C/H/N/O/S in a condensed formula like "–(CH₂)₃NHC(NH₂)₂⁺",
 * handling parenthesised groups and their multipliers. The side-chain
 * captions are checked against the structures with this, so a caption and
 * a drawing cannot drift apart the way a hand-written pair would.
 */
function parseFormula(src) {
  const s = [...src].filter((c) => !'–-⁺⁻ '.includes(c)).join('')
  let i = 0
  const readCount = () => {
    let n = ''
    while (i < s.length && SUBSCRIPT[s[i]] !== undefined) n += String(SUBSCRIPT[s[i++]])
    return n === '' ? 1 : Number(n)
  }
  const parse = (depth) => {
    const acc = { C: 0, H: 0, N: 0, O: 0, S: 0 }
    while (i < s.length) {
      const c = s[i]
      if (c === '(') {
        i++
        const inner = parse(depth + 1)
        const mult = readCount()
        for (const k of Object.keys(acc)) acc[k] += inner[k] * mult
      } else if (c === ')') {
        if (depth === 0) throw new Error(`unbalanced ) in ${src}`)
        i++
        return acc
      } else if ('CHNOS'.includes(c)) {
        i++
        acc[c] += readCount()
      } else {
        throw new Error(`unexpected "${c}" in ${src}`)
      }
    }
    if (depth !== 0) throw new Error(`unbalanced ( in ${src}`)
    return acc
  }
  return parse(0)
}

/**
 * Does a bond pass through the box a text label occupies? Sampled along the
 * segment rather than solved analytically — a label box is small and the
 * sampling step is well under its size, so anything crossing it is hit.
 */
function segmentHitsBox(seg, cx, cy, halfW, halfH) {
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = seg.a.x + (seg.b.x - seg.a.x) * t
    const y = seg.a.y + (seg.b.y - seg.a.y) * t
    if (Math.abs(x - cx) < halfW && Math.abs(y - cy) < halfH) return true
  }
  return false
}

// Which class a question's material came from. This is provenance, not subject
// matter — an empirical-formula question that arrived via the organic syllabus
// is tagged 'orgo' even though the chemistry is general. The vocabulary is
// closed because a typo would make a question silently invisible to a
// course filter, and no other check looks at this field.
const COURSES = new Set(['orgo', 'genchem', 'biochem', 'bio', 'physics', 'psych'])

const seenIds = new Map()
// Content signature -> first id seen. Two questions that differ only by id
// are one question occupying two spaced-repetition rows, so the user is
// asked the same thing twice and "mastering" it takes double the work.
// The visual is part of the signature: many questions legitimately share a
// prompt and choice list and differ only in the structure drawn.
const seenContent = new Map()

console.log('=== Topic banks ===')
for (const topic of TOPICS) {
  const bank = getTopicBank(topic.id)
  console.log(`${topic.label.padEnd(26)} ${String(bank.length).padStart(4)} questions`)

  // Answer position must not be predictable. Curated banks are authored
  // with the correct answer first, so this catches a missing shuffle.
  const positions = new Map()
  let mcqCount = 0
  for (const q of bank) {
    if (q.kind !== 'mcq') continue
    mcqCount++
    positions.set(q.correctIndex, (positions.get(q.correctIndex) ?? 0) + 1)
  }
  // Only meaningful on a decent sample; a 10-question bank can land
  // lopsided by chance without anything being wrong.
  if (mcqCount >= 25) {
    for (const [pos, count] of positions) {
      if (count / mcqCount > 0.55) {
        fail(`${topic.id}: ${Math.round((count / mcqCount) * 100)}% of answers sit at position ${pos} — choices are probably not being shuffled`)
      }
    }
  }

  for (const q of bank) {
    if (!q.id) fail(`${topic.id}: question with no id`)
    // Any repeat is a duplicate: each question belongs to exactly one topic.
    if (seenIds.has(q.id)) {
      fail(`duplicate id "${q.id}" (${seenIds.get(q.id)} and ${topic.id}) — two questions would share one progress record`)
    }
    seenIds.set(q.id, topic.id)

    const signature = JSON.stringify([
      q.prompt,
      q.choices ?? null,
      q.correctIndex ?? q.correctIndices ?? q.answer ?? null,
      q.visual ?? null,
      q.choiceVisuals ?? null,
    ])
    if (seenContent.has(signature)) {
      fail(`${q.id}: identical question to "${seenContent.get(signature)}" — same prompt, options and answer`)
    } else {
      seenContent.set(signature, q.id)
    }

    if (!q.topic) fail(`${q.id}: missing topic`)
    if (q.course && !COURSES.has(q.course)) {
      fail(`${q.id}: unknown course tag "${q.course}" — expected one of ${[...COURSES].join(', ')}`)
    }
    if (!q.prompt) fail(`${q.id}: missing prompt`)

    if (q.kind === 'mcq') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) fail(`${q.id}: bad choices`)
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.choices.length) {
        fail(`${q.id}: correctIndex ${q.correctIndex} out of range (${q.choices?.length} choices)`)
      }
      if (new Set(q.choices).size !== q.choices.length) fail(`${q.id}: duplicate choices -> ${JSON.stringify(q.choices)}`)
    } else if (q.kind === 'multi') {
      if (!Array.isArray(q.correctIndices) || !q.correctIndices.length) fail(`${q.id}: bad correctIndices`)
      for (const i of q.correctIndices) {
        if (i < 0 || i >= q.choices.length) fail(`${q.id}: correctIndices out of range`)
      }
    } else if (q.kind === 'numeric') {
      if (typeof q.answer !== 'number') fail(`${q.id}: numeric answer not a number`)
    } else if (q.kind === 'lewisBuilder') {
      if (typeof q.answer?.bond !== 'number' || q.answer.lonePairs?.length !== 2) {
        fail(`${q.id}: builder answer malformed`)
      } else {
        // The accepted structure must use exactly the electron budget the
        // question states — otherwise the drill grades an impossible answer.
        const used = 2 * (q.answer.bond + q.answer.lonePairs[0] + q.answer.lonePairs[1])
        if (used !== q.build.totalElectrons) {
          fail(`${q.id}: accepted structure places ${used} electrons but the budget is ${q.build.totalElectrons}`)
        }
      }
    } else {
      fail(`${q.id}: unknown kind "${q.kind}"`)
    }

    // An IMF diagram is captioned with the force it shows. When the
    // answer IS that force, the caption hands it over, so the diagram has
    // to wait until the question is answered.
    if (q.visual?.type === 'imf' && !q.visualAfter) {
      const IMF_LABEL = { hbond: 'hydrogen bond', dipole: 'dipole', dispersion: 'london dispersion' }
      const answerText = (q.choices?.[q.correctIndex] ?? '').toLowerCase()
      if (answerText.includes(IMF_LABEL[q.visual.kind])) {
        fail(`${q.id}: IMF diagram is captioned "${IMF_LABEL[q.visual.kind]}" which is its own answer, but is not visualAfter`)
      }
    }

    // These two diagram types print the answer on their face — the amino
    // acid name, or which side of the pKa the pH falls on — so they must
    // stay hidden until the question has been answered.
    if ((q.visual?.type === 'aminoAcid' || q.visual?.type === 'phScale') && !q.visualAfter) {
      fail(`${q.id}: ${q.visual.type} visual names the answer but is not marked visualAfter`)
    }

    // Check answer options too, not just the question's own diagram —
    // an invalid structure offered as a distractor is still drawn.
    for (const visual of [q.visual, ...(q.choiceVisuals ?? [])]) {
      if (visual?.type !== 'skeletal') continue
      const mol = visual.molecule
      if (!mol || !mol.size) {
        fail(`${q.id}: skeletal visual missing molecule`)
        continue
      }
      // hydrogensAt clamps at 0, so a pentavalent carbon looks fine there.
      // Count the bonds directly instead.
      if (!isValidMolecule(mol)) fail(`${q.id}: structure has a carbon with more than four bonds`)
    }

    // Two options that are the same molecule mean two correct answers.
    if (q.choiceVisuals?.every((v) => v?.type === 'skeletal')) {
      const keys = q.choiceVisuals.map((v) => canonicalKey(v.molecule))
      if (new Set(keys).size !== keys.length) {
        fail(`${q.id}: two answer options are the same molecule`)
      }
    }
  }
}

// Render every diagram. Catches crashes, and catches NaN coordinates that
// would silently produce an invisible or mangled SVG in the browser.
// Every topic needs its own colour and icon. A missing entry silently
// falls back to the default hue, so two cards end up looking identical —
// which is invisible in code and obvious only on screen.
{
  const iconSrc = fs.readFileSync('src/components/TopicIcon.jsx', 'utf8')
  const hues = new Map()
  for (const t of TOPICS) {
    const meta = TOPIC_META[t.id]
    if (!meta) {
      fail(`topic "${t.id}" has no entry in topicMeta, so it falls back to the default colour`)
      continue
    }
    if (!iconSrc.includes(meta.icon + ':')) {
      fail(`topic "${t.id}" uses icon "${meta.icon}" which TopicIcon does not draw`)
    }
    // Topic colours carry near-black button text, and blue hues are much
    // darker at the same lightness — two fell below the 4.5:1 needed for
    // body text before the lightness was solved per hue.
    const contrast = buttonContrast(t.id)
    if (contrast < 4.5) {
      fail(`topic "${t.id}" button colour has ${contrast.toFixed(2)}:1 against its text, below the 4.5:1 minimum`)
    }
    if (hues.has(meta.hue)) {
      fail(`topics "${hues.get(meta.hue)}" and "${t.id}" share hue ${meta.hue} and will look alike`)
    }
    hues.set(meta.hue, t.id)
  }
}

// Progression and roadmap must point at topics that exist, or a whole
// stage renders empty with nothing reported.
{
  const progression = JSON.parse(fs.readFileSync('src/data/progression.json', 'utf8'))
  const ids = new Set(TOPICS.map((t) => t.id))
  const covered = new Set()
  for (const stage of progression.stages) {
    for (const t of stage.topics) {
      if (!ids.has(t)) fail(`progression references unknown topic "${t}" in stage "${stage.title}"`)
      covered.add(t)
    }
  }
  for (const unit of progression.roadmap) {
    for (const t of unit.prep) {
      if (!ids.has(t)) fail(`roadmap references unknown topic "${t}" in unit "${unit.unit}"`)
    }
  }
  for (const t of ids) {
    if (!covered.has(t)) fail(`topic "${t}" appears in no progression stage, so it is unreachable from the grouped home screen`)
  }
  // Each subtitle hardcodes "Stage N", and the home screen renders the
  // stages in array order. Reordering the array without renumbering leaves
  // a block reading "Stage 4" sitting second on the page, which nothing
  // else would catch — both the order and the label are individually valid.
  progression.stages.forEach((stage, i) => {
    const claimed = /^Stage (\d+)/.exec(stage.subtitle ?? '')
    if (!claimed) {
      fail(`progression stage "${stage.id}" has no "Stage N" subtitle to check against its position`)
    } else if (Number(claimed[1]) !== i + 1) {
      fail(`progression stage "${stage.id}" sits at position ${i + 1} but its subtitle says Stage ${claimed[1]}`)
    }
  })
}

// === NUCLEOBASES ===
// A purine with a nitrogen in the wrong place still looks like a purine, so
// the drawing is counted and compared against the accepted molecular formula
// rather than inspected. These caught a real one: N1 of every ring sits at
// the origin, which the shared `finish` was treating as an amino acid's
// backbone carbon and dropping — five molecules each drawn one N short.
console.log('\n=== Nucleobases ===')
{
  const bases = JSON.parse(fs.readFileSync('src/data/genchem/nucleobases.json', 'utf8'))
  const ACCEPTED = {
    Adenine: { C: 5, N: 5, O: 0 },
    Guanine: { C: 5, N: 5, O: 1 },
    Cytosine: { C: 4, N: 3, O: 1 },
    Thymine: { C: 5, N: 2, O: 2 },
    Uracil: { C: 4, N: 2, O: 2 },
  }
  let nbBad = 0

  for (const b of bases) {
    const g = buildNucleobase(b.name)
    if (!g) { fail(`${b.name}: no geometry`); nbBad++; continue }

    const want = ACCEPTED[b.name]
    if (!want) { fail(`no accepted formula on record for ${b.name}`); nbBad++; continue }
    for (const el of ['C', 'N', 'O']) {
      if (g.composition[el] !== want[el]) {
        fail(`${b.name}: drawing has ${g.composition[el]} ${el}, accepted formula has ${want[el]}`)
        nbBad++
      }
    }
    // The stated formula on the card must agree with the drawing too.
    const stated = parseFormulaLib(b.formula)
    for (const el of ['C', 'N', 'O']) {
      if (stated[el] !== want[el]) {
        fail(`${b.name}: caption "${b.formula}" has ${stated[el]} ${el}, accepted has ${want[el]}`)
        nbBad++
      }
    }
  }

  // Pairing has to be symmetric, and the hydrogen-bond counts are the reason
  // GC-rich DNA melts at a higher temperature — getting them backwards would
  // teach the opposite.
  const byName = new Map(bases.map((b) => [b.name, b]))
  for (const [x, y, n] of [['Adenine', 'Thymine', 2], ['Adenine', 'Uracil', 2], ['Guanine', 'Cytosine', 3]]) {
    if (byName.get(x).bonds !== n || byName.get(y).bonds !== n) {
      fail(`${x}–${y} is ${n} hydrogen bonds, data says ${byName.get(x).bonds} and ${byName.get(y).bonds}`)
      nbBad++
    }
  }
  // Exactly two purines and three pyrimidines, or the class split is wrong.
  const purines = bases.filter((b) => b.class === 'purine').map((b) => b.name)
  const pyr = bases.filter((b) => b.class === 'pyrimidine').map((b) => b.name)
  if (purines.join() !== 'Adenine,Guanine') { fail(`purines are ${purines.join(', ')}, should be Adenine, Guanine`); nbBad++ }
  if (pyr.join() !== 'Cytosine,Thymine,Uracil') { fail(`pyrimidines are ${pyr.join(', ')}`); nbBad++ }

  if (!nbBad) console.log('  ok  5 nucleobases match their accepted formulas, pairings and class split')

  // Same geometry guards the amino acids get.
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const sgn = (v) => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0)
  const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1.5
  let geoBad = 0
  for (const b of bases) {
    const g = buildNucleobase(b.name)
    for (let i = 0; i < g.bonds.length; i++) {
      for (let j = i + 1; j < g.bonds.length; j++) {
        const s = g.bonds[i]
        const t = g.bonds[j]
        const shares = same(s.a, t.a) || same(s.a, t.b) || same(s.b, t.a) || same(s.b, t.b)
        if (shares) continue
        const d1 = sgn(cross(s.a, s.b, t.a))
        const d2 = sgn(cross(s.a, s.b, t.b))
        const d3 = sgn(cross(t.a, t.b, s.a))
        const d4 = sgn(cross(t.a, t.b, s.b))
        if (d1 !== d2 && d3 !== d4 && d1 && d2 && d3 && d4) {
          fail(`${b.name}: two bonds cross`)
          geoBad++
        }
      }
    }
    for (const l of g.labels) {
      const { halfW, halfH } = labelBox(l.text, l.size)
      for (const s of g.bonds) {
        if (segmentHitsBox(s, l.x, l.y, halfW, halfH)) {
          fail(`${b.name}: label "${l.text}" sits on a bond`)
          geoBad++
        }
      }
    }
  }
  if (!geoBad) console.log('  ok  5 nucleobase structures: no crossing bonds, no label over a bond')
}

// A circled atom is circled precisely because the question asks you to count
// its bonds. If the disc marking it swallows one, the question is unanswerable
// from the picture — and this is not something rendering the diagram can
// reveal, because the bond IS drawn, just almost entirely underneath.
{
  const visible = SUB_BOND - LABEL_GAP
  const clear = visible - HIGHLIGHT_R
  if (clear < 8) {
    fail(
      `a substituent bond on a highlighted atom shows only ${clear}px outside the marker ` +
        `(bond ${SUB_BOND}, label gap ${LABEL_GAP}, marker radius ${HIGHLIGHT_R}) — ` +
        `the question asks you to count bonds you cannot see`,
    )
  } else {
    console.log(`  ok  substituent bonds clear the highlight marker by ${clear}px`)
  }

  // The label itself must sit outside the marker too, or the letter lands on
  // the tinted disc and reads as part of it.
  if (SUB_BOND - HIGHLIGHT_R < 12) {
    fail(`a substituent label sits ${SUB_BOND - HIGHLIGHT_R}px from the highlight edge — too close to read as separate`)
  }
}

// The periodic-table cut beside a question must never print that question's
// own answer. Checked against the real bank rather than a list of topic
// names, because the first version of this rule excluded "periodic" while
// the questions were filed under "element-recall" and every one of them
// still showed its answer.
{
  let stripBad = 0
  let shown = 0
  for (const q of getMixedBank()) {
    const els = referenceElementsFor(q)
    if (!els.length) continue
    shown++
    if (q.kind !== 'mcq') continue
    const answer = String(q.choices[q.correctIndex]).trim()
    for (const sym of els) {
      const e = PERIODIC.find((x) => x.symbol === sym)
      if (!e) {
        fail(`${q.id}: strip would show "${sym}", which is not in the periodic table data`)
        stripBad++
        continue
      }
      // A leak is a question ASKING for a property the card prints — not a
      // numeric coincidence. BF₃ has three electron groups and boron has
      // three valence electrons; that correlation IS the chemistry, and
      // reaching the answer through valence is what a periodic table is for.
      // This app already supplies the whole table during any session on
      // exactly that reasoning, so flagging it would be inconsistent.
      const asksFor = (re, value) => re.test(q.prompt) && answer === String(value)
      for (const [what, hit] of [
        ['atomic number', asksFor(/atomic number/i, e.atomicNumber)],
        ['group number', asksFor(/\bgroup number\b|\bwhich group\b/i, e.group)],
        ['valence electron count', asksFor(/valence electron/i, e.valenceElectrons)],
      ]) {
        if (hit) {
          fail(`${q.id}: asks for ${sym}'s ${what} while the strip prints it — "${q.prompt.slice(0, 60)}"`)
          stripBad++
        }
      }
    }
  }
  if (!stripBad) console.log(`  ok  element strip on ${shown} questions, none printing its own answer`)
}

console.log('\n=== Rendering visuals ===')
let rendered = 0
for (const q of getMixedBank()) {
  const visuals = [q.visual, ...(q.choiceVisuals ?? [])].filter(Boolean)
  for (const visual of visuals) {
    try {
      const html = renderToStaticMarkup(createElement(QuestionVisual, { visual, revealed: true }))
      if (!html) fail(`${q.id}: visual rendered empty`)
      if (html.includes('NaN')) fail(`${q.id}: visual contains NaN coordinates`)
      // A diagram carries the question's content; unlabelled it announces
      // nothing at all to a screen reader.
      if (!/role="img"/.test(html) || !/aria-label="[^"]{8,}"/.test(html)) {
        fail(`${q.id}: ${visual.type} diagram has no descriptive aria-label`)
      }
      if (/(cx|cy|x1|y1|x2|y2|d)="[^"]*(Infinity|undefined)/.test(html)) {
        fail(`${q.id}: visual contains a non-finite coordinate`)
      }
      rendered++
    } catch (e) {
      fail(`${q.id}: visual threw during render — ${e.message}`)
    }
  }
}
console.log(`${rendered} diagrams rendered`)

console.log(`\nMixed bank: ${getMixedBank().length}`)
for (const t of TOPICS.filter((t) => t.speedRound)) {
  console.log(`Speed bank ${t.id}: ${getSpeedBank(t.id).length}`)
}


// === REFERENCE DATA AUDIT ===
// The generators derive answers correctly from their tables, so an error in
// a TABLE produces confidently wrong chemistry that every other check
// passes. These compare the tables against independent reference values.

// === SPACED REPETITION ===
// The scheduler decides what appears in every session, and a mistake here
// is invisible in the UI: questions simply come back at the wrong time.
// === REFERENCE VIEWS ===
// Everything that is not a question. These render nowhere else in this
// script, so a component that throws only when opened would ship unnoticed
// — which already happened once when an edit removed state a view still
// referenced, and both validate and build stayed green.
console.log('\n=== Reference views ===')
{
  const noop = () => {}
  const views = [
    ['AminoAcidReference', createElement(AminoAcidReference)],
    ['Flashcards', createElement(Flashcards, { onDone: noop })],
    ['GroupPrimer', createElement(GroupPrimer)],
    ['PkaLadder', createElement(PkaLadder)],
    ['VseprChart', createElement(VseprChart)],
    ['CompoundTable', createElement(CompoundTable)],
    ['BackupPanel', createElement(BackupPanel)],
    ['LadderPicker', createElement(LadderPicker, { onPick: noop, onDone: noop })],
    ...LADDERS.map((l) => [`LadderDrill(${l.id})`, createElement(LadderDrill, { ladderId: l.id, onDone: noop })]),
    ...TOPICS.map((t) => [
      `LessonView(${t.id})`,
      createElement(LessonView, { topicId: t.id, title: t.label, onNotes: noop, onStudy: noop }),
    ]),
    ...TOPICS.map((t) => [
      `Walkthroughs(${t.id})`,
      createElement(Walkthroughs, { topicId: t.id, title: t.label, onStudy: noop }),
    ]),
  ]
  let viewBad = 0
  for (const [name, el] of views) {
    try {
      const html = renderToStaticMarkup(el)
      if (!html || html.length < 40) {
        fail(`view ${name} rendered essentially empty`)
        viewBad++
      }
    } catch (e) {
      fail(`view ${name} threw while rendering — ${e.message}`)
      viewBad++
    }
  }
  if (!viewBad) console.log(`  ok  ${views.length} reference views render`)
}

console.log('\n=== Spaced repetition ===')
{
  const DAY = 86400000
  let srsBad = 0
  const srs = (label, cond) => { if (!cond) { fail('SRS: ' + label); srsBad++ } }

  let p = nextProgressState(undefined, 'q', 'm', 't', true, 0)
  srs('first correct answer should reach box 1 and a one-day interval', p.box === 1 && p.nextDueAt === DAY)
  srs('a freshly learned question must not be instantly due again', p.nextDueAt > 0)

  p = nextProgressState(p, 'q', 'm', 't', true, DAY)
  srs('second correct answer should reach box 2', p.box === 2)
  p = nextProgressState(p, 'q', 'm', 't', true, 4 * DAY)
  srs('three correct recalls should equal mastery (box 3), matching the UI', p.box === 3)

  const missed = nextProgressState(p, 'q', 'm', 't', false, 5 * DAY)
  srs('a miss resets to box 0 and becomes due immediately', missed.box === 0 && missed.nextDueAt === 5 * DAY)

  const hinted = nextProgressState(undefined, 'h', 'm', 't', true, 0, { promote: false })
  srs('a hinted correct answer records the attempt without promoting', hinted.box === 0 && hinted.timesSeen === 1)
  const hintedMiss = nextProgressState(p, 'h', 'm', 't', false, 0, { promote: false })
  srs('a miss demotes even when promotion is suppressed', hintedMiss.box === 0)

  let capped = p
  for (let i = 0; i < 10; i++) capped = nextProgressState(capped, 'c', 'm', 't', true, i * DAY)
  srs('the box caps at 4 rather than growing without bound', capped.box === 4)
  srs('intervals strictly increase with the box', BOX_INTERVALS_MS.every((x, i, a) => i === 0 || x > a[i - 1]))

  // Selection must favour due and unseen material over things not yet due.
  const bank = Array.from({ length: 60 }, (_, i) => ({ id: 'x' + i, topic: 't' }))
  const progress = new Map()
  const now = Date.now()
  for (let i = 0; i < 20; i++) progress.set('x' + i, { id: 'x' + i, topic: 't', box: 4, nextDueAt: now + 30 * DAY, timesSeen: 5, timesCorrect: 5, lastResult: true })
  for (let i = 20; i < 40; i++) progress.set('x' + i, { id: 'x' + i, topic: 't', box: 1, nextDueAt: now - 5 * DAY, timesSeen: 2, timesCorrect: 1, lastResult: true })
  let notDue = 0, due = 0, unseen = 0
  for (let run = 0; run < 120; run++) {
    for (const id of selectSessionQuestions(bank, progress, 15)) {
      const n = +id.slice(1)
      if (n < 20) notDue++
      else if (n < 40) due++
      else unseen++
    }
  }
  srs('due material must dominate not-yet-due material', due > notDue * 3)
  srs('unseen material must still surface', unseen > 0)
  srs('not-yet-due material must not be excluded entirely', notDue > 0)

  if (!srsBad) console.log('  ok  promotion, demotion, intervals, hint handling and session selection')
}

console.log('\n=== Reference data ===')
{
  // Amino acids: codes, class, side-chain pKa and charge at pH 7.4.
  const AA_REF = {
    Glycine: ['Gly', 'G', 'nonpolar', null, 0], Alanine: ['Ala', 'A', 'nonpolar', null, 0],
    Valine: ['Val', 'V', 'nonpolar', null, 0], Leucine: ['Leu', 'L', 'nonpolar', null, 0],
    Isoleucine: ['Ile', 'I', 'nonpolar', null, 0], Methionine: ['Met', 'M', 'nonpolar', null, 0],
    Proline: ['Pro', 'P', 'nonpolar', null, 0], Phenylalanine: ['Phe', 'F', 'nonpolar', null, 0],
    Tryptophan: ['Trp', 'W', 'nonpolar', null, 0], Serine: ['Ser', 'S', 'polar', null, 0],
    Threonine: ['Thr', 'T', 'polar', null, 0], Cysteine: ['Cys', 'C', 'polar', 8.3, 0],
    Tyrosine: ['Tyr', 'Y', 'polar', 10.1, 0], Asparagine: ['Asn', 'N', 'polar', null, 0],
    Glutamine: ['Gln', 'Q', 'polar', null, 0], Aspartate: ['Asp', 'D', 'acidic', 3.9, -1],
    Glutamate: ['Glu', 'E', 'acidic', 4.3, -1], Lysine: ['Lys', 'K', 'basic', 10.5, 1],
    Arginine: ['Arg', 'R', 'basic', 12.5, 1], Histidine: ['His', 'H', 'basic', 6.0, 0],
  }
  const aa = JSON.parse(fs.readFileSync('src/data/genchem/aminoAcids.json', 'utf8'))
  if (aa.length !== 20) fail(`amino acid table has ${aa.length} entries, expected 20`)
  let aaBad = 0
  for (const a of aa) {
    const r = AA_REF[a.name]
    if (!r) { fail(`unknown amino acid "${a.name}"`); aaBad++; continue }
    const [three, one, cls, pka, ch] = r
    if (a.three !== three) { fail(`${a.name}: three-letter code "${a.three}" should be "${three}"`); aaBad++ }
    if (a.one !== one) { fail(`${a.name}: one-letter code "${a.one}" should be "${one}"`); aaBad++ }
    if (a.class !== cls) { fail(`${a.name}: class "${a.class}" should be "${cls}"`); aaBad++ }
    if (a.pKaR !== pka) { fail(`${a.name}: side-chain pKa ${a.pKaR} should be ${pka}`); aaBad++ }
    if (!a.groupName || !a.groupWhat) { fail(a.name + ': no plain-language explanation of its side-chain group, which the flashcard renders'); aaBad++ }
    if (a.charge7 !== ch) { fail(`${a.name}: charge at pH 7.4 is ${a.charge7}, should be ${ch}`); aaBad++ }
  }
  // The ladder's default view filters by these keys. A key that matches
  // nothing drops that acid silently — which already happened once with a
  // carboxylic acid written as CH3COOH when the table uses RCOOH.
  {
    const pka = JSON.parse(fs.readFileSync('src/data/genchem/pkaTable.json', 'utf8'))
    const keys = new Set(pka.map((e) => e.acid))
    let anchorBad = 0
    for (const a of PKA_ANCHORS) {
      if (!keys.has(a)) {
        fail(`pKa anchor "${a}" matches no entry in pkaTable, so it never shows on the ladder`)
        anchorBad++
      }
    }
    if (!anchorBad) console.log(`  ok  ${PKA_ANCHORS.size} pKa anchors all resolve`)
  }

  // The sorting phrases must keep matching the data. A mnemonic that
  // drifts out of sync teaches a wrong classification, which is worse than
  // having none — one was already removed this project for being wrong.
  {
    const mn = JSON.parse(fs.readFileSync('src/data/genchem/aminoAcidMnemonics.json', 'utf8'))
    let mnBad = 0
    for (const m of mn) {
      const claimed = [...m.letters].sort().join('')
      const real = aa
        .filter((x) => (m.cls === 'charged' ? x.class === 'acidic' || x.class === 'basic' : x.class === m.cls))
        .map((x) => x.one)
        .sort()
        .join('')
      if (claimed !== real) {
        fail('mnemonic for ' + m.cls + ' gives ' + claimed + ' but the data has ' + real)
        mnBad++
      }
    }
    const all = mn.flatMap((m) => [...m.letters])
    if (all.length !== 20 || new Set(all).size !== 20) {
      fail('the sorting phrases cover ' + new Set(all).size + ' distinct residues, not all 20')
      mnBad++
    }
    if (!mnBad) console.log('  ok  3 sorting mnemonics match the data and cover all 20')
  }

  // Every residue needs a drawable side chain. A missing shape renders
  // nothing at all, leaving a card with a backbone and an empty R box.
  {
    let shapeBad = 0
    for (const a of aa) {
      const html = renderToStaticMarkup(createElement(SideChainStructure, { name: a.name }))
      if (!html || html.includes('NaN')) {
        fail(a.name + ': side-chain structure does not draw')
        shapeBad++
      }
    }
    if (!shapeBad) console.log('  ok  20 side-chain structures draw')
  }

  // A drawing can render cleanly, contain no NaN, and still be unreadable.
  // Asparagine's C=O was placed at a hand-picked angle that folded back over
  // the bond arriving at the carbonyl carbon, and the card showed a scribble
  // rather than an amide. Two separate things make that happen, and only
  // checking both catches it:
  //
  //   1. bonds that cross somewhere in the middle
  //   2. bonds that LEAVE THE SAME ATOM at too small an angle
  //
  // The shipped asparagine bug was (2), not (1) — the C=O sat 25° off the
  // incoming chain bond, so the lines nearly coincided without ever properly
  // intersecting. A crossing check alone would have passed it.
  {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
    const sign = (v) => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0)
    const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1.5
    const shareEnd = (s, t) => same(s.a, t.a) || same(s.a, t.b) || same(s.b, t.a) || same(s.b, t.b)
    const crosses = (s, t) => {
      if (shareEnd(s, t)) return false
      const d1 = sign(cross(s.a, s.b, t.a))
      const d2 = sign(cross(s.a, s.b, t.b))
      const d3 = sign(cross(t.a, t.b, s.a))
      const d4 = sign(cross(t.a, t.b, s.b))
      return d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0
    }

    // Smallest angle a real structure here needs: a five-membered ring's
    // interior angle is 108°, a trigonal centre 120°, and the widest pair of
    // hand-placed branches 100°. 45° leaves room under all of them and well
    // above the 25° that produced the scribble.
    const MIN_ANGLE = 45
    const angleAt = (v, s) => {
      const far = same(v, s.a) ? s.b : s.a
      return (Math.atan2(far.y - v.y, far.x - v.x) * 180) / Math.PI
    }
    const sharedVertex = (s, t) => {
      for (const p of [s.a, s.b]) for (const q of [t.a, t.b]) if (same(p, q)) return p
      return null
    }

    let crossBad = 0
    // Both geometries: the side chain alone, and the whole residue that the
    // cards actually display. Adding the backbone to the same space can
    // create a crossing or a cramped angle that the side chain never had.
    const geometries = aa.flatMap((a) =>
      ['skeletal', 'written'].flatMap((n) => [
        [`${a.name} side chain, ${n}`, buildSideChain(a.name, n)],
        [`${a.name} whole residue, ${n}`, buildAminoAcid(a.name, n)],
      ]),
    )
    for (const [label, g] of geometries) {
      const a = { name: label }
      if (!g) { fail(label + ': no geometry'); crossBad++; continue }
      for (let i = 0; i < g.bonds.length; i++) {
        for (let j = i + 1; j < g.bonds.length; j++) {
          const s = g.bonds[i]
          const t = g.bonds[j]
          if (crosses(s, t)) {
            fail(
              `${a.name}: bonds cross — (${s.a.x.toFixed(0)},${s.a.y.toFixed(0)})–` +
                `(${s.b.x.toFixed(0)},${s.b.y.toFixed(0)}) over ` +
                `(${t.a.x.toFixed(0)},${t.a.y.toFixed(0)})–(${t.b.x.toFixed(0)},${t.b.y.toFixed(0)})`,
            )
            crossBad++
          }
          // An inner ring line runs parallel to the edge it doubles, so it is
          // exempt — that near-zero angle is exactly what a double bond is.
          if (s.inner || t.inner) continue
          const v = sharedVertex(s, t)
          if (!v) continue
          let d = Math.abs(angleAt(v, s) - angleAt(v, t)) % 360
          if (d > 180) d = 360 - d
          if (d < MIN_ANGLE) {
            fail(
              `${a.name}: two bonds leave the atom at (${v.x.toFixed(0)},${v.y.toFixed(0)}) ` +
                `only ${d.toFixed(0)}° apart — they will read as one line`,
            )
            crossBad++
          }
        }
      }
      // A label sitting on top of a bond is the same failure in a different
      // form: the letter and the line occupy the same pixels.
      for (const l of g.labels) {
        const { halfW, halfH } = labelBox(l.text, l.size)
        for (const s of g.bonds) {
          if (segmentHitsBox(s, l.x, l.y, halfW, halfH)) {
            fail(`${a.name}: label "${l.text}" sits on a bond`)
            crossBad++
          }
        }
      }
    }
    if (!crossBad) console.log('  ok  80 structures (side chain + residue, skeletal + written): no crossings, no bond pair under 45°, no label over a bond')
  }

  // Clean geometry is not the same as correct chemistry: a drawing with one
  // CH₂ too few crosses nothing and reads perfectly. Count what each drawing
  // actually contains and check it against the residue's real composition.
  //
  // These counts are the side chain only, obtained by subtracting the
  // backbone (C2 N1 O2 — the alpha carbon, the carboxyl carbon, its two
  // oxygens and the amino nitrogen) from the residue's molecular formula.
  // Proline's ring shares the backbone nitrogen, so its N is counted here
  // because the drawing shows it.
  {
    const EXPECTED = {
      Glycine: { C: 0, N: 0, O: 0, S: 0, H: 1 },       // C2H5NO2
      Alanine: { C: 1, N: 0, O: 0, S: 0 },             // C3H7NO2
      Valine: { C: 3, N: 0, O: 0, S: 0 },              // C5H11NO2
      Leucine: { C: 4, N: 0, O: 0, S: 0 },             // C6H13NO2
      Isoleucine: { C: 4, N: 0, O: 0, S: 0 },          // C6H13NO2
      Methionine: { C: 3, N: 0, O: 0, S: 1 },          // C5H11NO2S
      Proline: { C: 3, N: 1, O: 0, S: 0 },             // C5H9NO2, ring shares backbone N
      Phenylalanine: { C: 7, N: 0, O: 0, S: 0 },       // C9H11NO2
      Tryptophan: { C: 9, N: 1, O: 0, S: 0 },          // C11H12N2O2
      Serine: { C: 1, N: 0, O: 1, S: 0 },              // C3H7NO3
      Threonine: { C: 2, N: 0, O: 1, S: 0 },           // C4H9NO3
      Cysteine: { C: 1, N: 0, O: 0, S: 1 },            // C3H7NO2S
      Tyrosine: { C: 7, N: 0, O: 1, S: 0 },            // C9H11NO3
      Asparagine: { C: 2, N: 1, O: 1, S: 0 },          // C4H8N2O3
      Glutamine: { C: 3, N: 1, O: 1, S: 0 },           // C5H10N2O3
      Aspartate: { C: 2, N: 0, O: 2, S: 0 },           // C4H7NO4
      Glutamate: { C: 3, N: 0, O: 2, S: 0 },           // C5H9NO4
      Lysine: { C: 4, N: 1, O: 0, S: 0 },              // C6H14N2O2
      Arginine: { C: 4, N: 3, O: 0, S: 0 },            // C6H14N4O2
      Histidine: { C: 4, N: 2, O: 0, S: 0 },           // C6H9N3O2
    }

    let compBad = 0
    for (const a of aa) {
      const exp = EXPECTED[a.name]
      if (!exp) { fail(`no expected composition for ${a.name}`); compBad++; continue }
      // Both notations must depict the same molecule. The written-out form
      // states hydrogens that the skeletal form leaves implied, so only
      // C/N/O/S are comparable across the two — but those are exactly the
      // atoms that tell the residues apart.
      for (const notation of ['skeletal', 'written']) {
        // The side chain alone — the composed residue would also count the
        // backbone's own C, N and two O, which are not part of R.
        const g = buildSideChain(a.name, notation)
        for (const el of ['C', 'N', 'O', 'S']) {
          const want = exp[el] ?? 0
          if (g.composition[el] !== want) {
            fail(`${a.name} (${notation}): structure draws ${g.composition[el]} ${el}, but the side chain has ${want}`)
            compBad++
          }
        }

        // Two atoms in the same place means the structure has folded back
        // onto itself. The atom count still comes out right, so the
        // composition check above passes and the drawing is still nonsense.
        for (let i = 0; i < g.atoms.length; i++) {
          for (let j = i + 1; j < g.atoms.length; j++) {
            const d = Math.hypot(g.atoms[i].x - g.atoms[j].x, g.atoms[i].y - g.atoms[j].y)
            if (d < 13) {
              fail(
                `${a.name} (${notation}): two atoms only ${d.toFixed(1)} apart at ` +
                  `(${g.atoms[i].x.toFixed(0)},${g.atoms[i].y.toFixed(0)}) — the structure overlaps itself`,
              )
              compBad++
            }
          }
        }
      }

      // The caption under each card states the condensed formula. It is
      // written by hand, so it gets parsed and checked against the same
      // composition the drawing is checked against — otherwise the picture
      // and the words underneath it drift apart silently.
      if (!a.formula) {
        fail(`${a.name}: no condensed side-chain formula for the card caption`)
        compBad++
      } else {
        let counted
        try {
          counted = parseFormula(a.formula)
        } catch (e) {
          fail(`${a.name}: formula "${a.formula}" will not parse — ${e.message}`)
          compBad++
        }
        if (counted) {
          // Proline is the one residue where the drawing and the formula
          // legitimately differ: the nitrogen in its ring is the BACKBONE
          // amine, so the structure shows an N that the side-chain formula
          // has no business listing. Stated here rather than loosening the
          // check, so any OTHER mismatch still fails.
          const captionExp = a.name === 'Proline' ? { ...exp, N: 0 } : exp
          for (const el of ['C', 'N', 'O', 'S']) {
            if (counted[el] !== (captionExp[el] ?? 0)) {
              fail(`${a.name}: caption "${a.formula}" has ${counted[el]} ${el}, but the side chain has ${captionExp[el] ?? 0}`)
              compBad++
            }
          }
        }
      }

    }
    if (!compBad) console.log('  ok  20 structures and their captions match the residue formulas atom for atom')
  }

// Each ladder is a set you identify by name, so every answer label has to be
// unique — two items sharing one label makes a multiple-choice question with
// two correct-looking buttons and no way to be right. Two VSEPR geometries
// really are both called "bent", which is why their labels carry the
// electron-group count.
{
  let lBad = 0
  for (const l of LADDERS) {
    if (!l.items.length) { fail(`ladder "${l.id}" has no items`); lBad++; continue }
    if (!TOPICS.some((t) => t.id === l.topic)) {
      fail(`ladder "${l.id}" points at topic "${l.topic}", which does not exist`)
      lBad++
    }
    const names = l.items.map((i) => i.name)
    const dupName = names.find((n, i) => names.indexOf(n) !== i)
    if (dupName) {
      fail(`ladder "${l.id}": two items are both labelled "${dupName}" — a quiz over them cannot be answered`)
      lBad++
    }
    const keys = l.items.map((i) => i.key)
    const dupKey = keys.find((k, i) => keys.indexOf(k) !== i)
    if (dupKey) {
      fail(`ladder "${l.id}": duplicate item key "${dupKey}" — progress would be shared between two items`)
      lBad++
    }
    for (const i of l.items) {
      if (!i.key || !i.name) { fail(`ladder "${l.id}" has an item missing key or name`); lBad++ }
    }
    // A ladder with fewer than four items cannot fill a four-option question
    // from its own set, which is fine, but under two it is not a ladder.
    if (l.items.length < 3) { fail(`ladder "${l.id}" has only ${l.items.length} items`); lBad++ }
  }
  if (!lBad) console.log(`  ok  ${LADDERS.length} ladders: unique labels and keys, real topics, ${LADDERS.reduce((n, l) => n + l.items.length, 0)} items total`)
}
// Typed answers are only fair if every accepted spelling is reachable and no
// two items accept the same string — otherwise a correct answer is marked
// wrong, or one answer satisfies two different questions.
{
  let tBad = 0
  for (const l of LADDERS) {
    if (l.typeable === false) continue // opted out, see its definition
    if (!l.typePlaceholder) {
      fail(`ladder "${l.id}" has no placeholder telling you what to type`)
      tBad++
    }
    const seen = new Map()
    for (const item of l.items) {
      const accepted = [item.name, ...(item.aliases ?? [])].map((a) => String(a).trim().toLowerCase())
      for (const a of accepted) {
        if (!a) {
          fail(`ladder "${l.id}": ${item.name} accepts an empty answer`)
          tBad++
          continue
        }
        if (seen.has(a) && seen.get(a) !== item.key) {
          fail(`ladder "${l.id}": "${a}" is accepted for both ${seen.get(a)} and ${item.key}`)
          tBad++
        }
        seen.set(a, item.key)
      }
    }
  }
  if (!tBad) console.log('  ok  4 ladders: every typed answer is unambiguous and every set says what to type')
}

// Numeric answers need to be far enough apart to CHOOSE between. Water at
// 15.7 and ethanol at 16.0 are both correct chemistry and a coin flip as two
// options in one question — and the thing being taught is that they occupy
// the same bracket, so asking anyone to separate them teaches the opposite.
// Distinct-but-indistinguishable is not caught by the duplicate-label rule.
{
  // Half a pKa unit. Below that the same acid is quoted at either value by
  // different textbooks, so choosing between them tests the edition rather
  // than the chemistry. Ammonium at 9.2 against phenol at 10 stays: 0.8
  // units is a factor of six in acidity and a real distinction.
  const COIN_FLIP_GAP = 0.5
  let gapBad = 0
  for (const l of LADDERS) {
    // Only when the answer IS a number. VSEPR answers like "bent · 3 groups"
    // merely contain one, and two of those differing only in the word are
    // perfectly distinguishable — flagging them was this check's first
    // behaviour and it was wrong. The test is that every answer shares one
    // skeleton once the number is removed, so the number is the whole
    // difference between them.
    const parsed = l.items.map((i) => ({
      key: i.key,
      n: Number((/(-?\d+(?:\.\d+)?)/.exec(i.name) ?? [])[1]),
      skeleton: i.name.replace(/-?\d+(?:\.\d+)?/, '#'),
    }))
    const nums = parsed.filter((x) => Number.isFinite(x.n))
    if (nums.length !== l.items.length || nums.length < 2) continue
    if (new Set(nums.map((x) => x.skeleton)).size !== 1) continue
    const sorted = [...nums].sort((a, b) => a.n - b.n)
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].n - sorted[i - 1].n
      if (gap < COIN_FLIP_GAP) {
        fail(
          `ladder "${l.id}": ${sorted[i - 1].key} and ${sorted[i].key} answer ${sorted[i - 1].n} and ${sorted[i].n} — ` +
            `${gap.toFixed(1)} apart, which is a coin flip as two options in one question`,
        )
        gapBad++
      }
    }
  }
  if (!gapBad) console.log('  ok  numeric ladder answers are far enough apart to choose between')
}


// iOS Safari zooms the whole page in when a focused input is under 16px, and
// the drill inputs sit directly under a structure — the zoom magnified it and
// pushed it off the top of the screen the instant the keyboard opened. The
// rule is invisible in review and trivially undone by a tidy-up, so it is
// pinned here.
{
  let inBad = 0
  const css = fs.readFileSync('src/app.css', 'utf8')
  const block = /\.text-input\s*\{([^}]*)\}/.exec(css)
  if (!block) {
    fail('.text-input rule is missing from app.css')
    inBad++
  } else {
    const size = /font-size:\s*([\d.]+)px/.exec(block[1])
    if (!size) {
      fail('.text-input has no font-size in px — iOS zooms the page on focus below 16px')
      inBad++
    } else if (Number(size[1]) < 16) {
      fail(`.text-input font-size is ${size[1]}px; iOS zooms the page on focus below 16px`)
      inBad++
    }
  }

  // autoFocus on a drill input opens the keyboard over the structure before
  // it has been looked at.
  for (const f of ['src/components/LadderDrill.jsx', 'src/components/Flashcards.jsx']) {
    const src = fs.readFileSync(f, 'utf8')
    // Comments stripped first: the note explaining why autoFocus is absent
    // names it, and a bare token search flagged that as the violation.
    const code = src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '').replace(/^\s*\/\/.*$/gm, '')
    // A plain token search, not a match inside the <input> tag: an arrow
    // function in any earlier attribute contains ">", which ends a [^>]*
    // class and makes the tag-scoped version unable to fire at all. Found by
    // break-testing it — it passed with autoFocus sitting right there.
    if (/\bautoFocus\b/.test(code)) {
      fail(`${f}: uses autoFocus, which opens the keyboard over the question before it has been seen`)
      inBad++
    }
    // A placeholder starting with "Name" makes iOS offer to autofill a contact.
    for (const m of src.matchAll(/placeholder="([^"]+)"/g)) {
      if (/^name\b/i.test(m[1])) {
        fail(`${f}: placeholder "${m[1]}" reads as a name field, so iOS offers contact autofill`)
        inBad++
      }
    }
  }
  for (const l of LADDERS) {
    if (l.typePlaceholder && /^name\b/i.test(l.typePlaceholder)) {
      fail(`ladder "${l.id}" placeholder "${l.typePlaceholder}" reads as a name field to iOS`)
      inBad++
    }
  }
  if (!inBad) console.log('  ok  answer inputs: 16px, no autoFocus, no placeholder iOS reads as a name')
}


// The mode promotes itself exactly once, when the set is finished, and a
// manual choice afterwards has to stick.
{
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
  }
  let mBad = 0

  const fresh = loadLadder('modetest', ['a', 'b'])
  if (fresh.answerMode !== 'mc') { fail(`a new ladder starts in "${fresh.answerMode}", should be multiple choice`); mBad++ }
  if (fresh.promoted) { fail('a new ladder is already marked promoted'); mBad++ }

  // A stored manual choice of multiple choice must survive, even though the
  // set is complete — that is what `promoted` is for.
  saveLadder('modetest', { learned: ['a', 'b'], lastSeenAt: 1, answerMode: 'mc', promoted: true })
  const kept = loadLadder('modetest', ['a', 'b'])
  if (kept.answerMode !== 'mc' || !kept.promoted) {
    fail(`a deliberate switch back to multiple choice was not kept: ${JSON.stringify(kept)}`)
    mBad++
  }

  saveLadder('modetest2', { learned: [], lastSeenAt: 1, answerMode: 'type', promoted: true })
  if (loadLadder('modetest2', []).answerMode !== 'type') { fail('typed mode does not persist'); mBad++ }

  delete globalThis.localStorage
  if (!mBad) console.log('  ok  answer mode starts at multiple choice and a manual override persists')
}


// Progress storage must survive a renamed or removed item rather than
// leaving a "learned" ghost that is never shown again.
{
  const order = ['a', 'b', 'c']
  const stored = { learned: ['a', 'gone'], lastSeenAt: 5 }
  globalThis.localStorage = {
    getItem: (k) => (k === 'orgoprep.ladder.test' ? JSON.stringify(stored) : null),
    setItem: () => {},
  }
  const got = loadLadder('test', order)
  if (got.learned.join() !== 'a') {
    fail(`ladder progress kept a key that is no longer in the set: ${JSON.stringify(got.learned)}`)
  } else {
    console.log('  ok  ladder progress drops items that left the set')
  }

  // The old integer-stage format has to migrate, or existing progress is lost.
  globalThis.localStorage = {
    getItem: (k) => (k === 'orgoprep.ladder.stage' ? '4' : null),
    setItem: () => {},
  }
  const migrated = loadLadder('aminoacids', ladderOrder().map((a) => a.name))
  if (migrated.learned.length !== 3) {
    fail(`legacy stage 4 migrated to ${migrated.learned.length} learned, expected 3`)
  } else {
    console.log('  ok  legacy stage counter migrates to a learned set')
  }
  delete globalThis.localStorage

  // Staleness thresholds: no nudge for a fresh visit, a nudge after a gap.
  const HOUR = 3600e3
  if (staleness(Date.now() - HOUR)) fail('staleness nudges after only an hour')
  else if (!staleness(Date.now() - 72 * HOUR)) fail('staleness fails to nudge after three days')
  else console.log('  ok  staleness quiet for an hour, nudges after days')
}

// Nothing on an unanswered card may name the thing being asked about.
//
// The name was hidden and the condensed formula was not, so every question
// carried "R = –CH₂C₈H₆N" underneath the structure — which identifies
// tryptophan exactly as well as the word does. The class colour on the card
// border is the same failure in CSS: yellow nonpolar, green polar, red
// acidic, blue basic, against options that are not matched by class.
{
  let leakBad = 0
  // The deck opens on an unflipped card: the leaking state.
  const deck = renderToStaticMarkup(createElement(Flashcards, { onDone: () => {} }))

  for (const a of aa) {
    if (deck.includes(a.formula)) {
      fail(`Flashcards prints the side-chain formula "${a.formula}" on a card whose answer is still hidden`)
      leakBad++
      break
    }
  }
  for (const name of aa.map((x) => x.name)) {
    if (deck.includes(`>${name}<`)) {
      fail(`Flashcards prints the name "${name}" on a card whose answer is still hidden`)
      leakBad++
      break
    }
  }
  for (const c of ['#facc15', '#4ade80', '#f87171', '#38bdf8']) {
    if (deck.includes(`3px solid ${c}`)) {
      fail(`Flashcards shows the ${c} class border before the answer is revealed`)
      leakBad++
    }
  }

  // And the shared rule both screens use must withhold by construction.
  if (revealAccent('#facc15', false) !== undefined) {
    fail('revealAccent returns a style while the answer is still hidden')
    leakBad++
  }
  if (!revealAccent('#facc15', true)) {
    fail('revealAccent withholds the style even after the answer is shown')
    leakBad++
  }
  if (!leakBad) console.log('  ok  unanswered cards leak neither the name, the formula, nor the class colour')
}

// Question prompts pick a residue BY its condensed formula, so two residues
  // sharing one would be a question with two right answers.
  {
    const fs_ = aa.map((x) => x.formula)
    const dup = fs_.find((f, i) => fs_.indexOf(f) !== i)
    if (dup) {
      fail(`two residues share the condensed formula "${dup}" — a question asking which one has it has two right answers`)
    } else {
      console.log('  ok  20 condensed formulas are one per residue')
    }
  }

  // The ladder introduces residues one at a time, in the order the three
  // sorting phrases spell out. If that order drops one, the drill simply
  // never teaches it and nothing else in the app notices — the question
  // banks would still cover it, so accuracy would look fine.
  {
    const order = ladderOrder()
    let ladBad = 0
    if (order.length !== aa.length) {
      fail(`ladder covers ${order.length} residues, not ${aa.length}`)
      ladBad++
    }
    if (order.some((x) => !x)) {
      fail('ladder order contains a letter with no matching amino acid')
      ladBad++
    } else {
      const names = order.map((x) => x.name)
      if (new Set(names).size !== names.length) {
        fail('ladder order repeats a residue — it would be taught twice and another never')
        ladBad++
      }
      const missing = aa.filter((x) => !names.includes(x.name)).map((x) => x.name)
      if (missing.length) {
        fail(`ladder never introduces: ${missing.join(', ')}`)
        ladBad++
      }
      // Each phrase must arrive as an unbroken run, or "letter 3 of Santa's
      // Team Crafts New Quilts Yearly" shown during the drill is wrong.
      let at = 0
      for (const m of JSON.parse(fs.readFileSync("src/data/genchem/aminoAcidMnemonics.json", "utf8"))) {
        const run = names.slice(at, at + m.letters.length).map((n) => aa.find((x) => x.name === n).one).join('')
        if (run !== m.letters) {
          fail(`ladder run for "${m.cls}" is ${run}, but the phrase spells ${m.letters}`)
          ladBad++
        }
        at += m.letters.length
      }
    }
    if (!ladBad) console.log(`  ok  ladder introduces all 20 once, in the order the three phrases spell`)
  }

  if (!aaBad) console.log('  ok  20 amino acids: codes, classes, pKa and charges')

  // VSEPR: shape and hybridization per (bonding, lone), and the drawing
  // must show exactly the groups the entry claims.
  const VSEPR_REF = {
    '2,0': ['linear', 'sp'], '3,0': ['trigonal planar', 'sp2'], '2,1': ['bent', 'sp2'],
    '4,0': ['tetrahedral', 'sp3'], '3,1': ['trigonal pyramidal', 'sp3'], '2,2': ['bent', 'sp3'],
    '5,0': ['trigonal bipyramidal', 'sp3d'], '4,1': ['seesaw', 'sp3d'], '3,2': ['T-shaped', 'sp3d'],
    '2,3': ['linear', 'sp3d'], '6,0': ['octahedral', 'sp3d2'], '5,1': ['square pyramidal', 'sp3d2'],
    '4,2': ['square planar', 'sp3d2'],
  }
  let vBad = 0
  for (const g of GEOMETRIES) {
    const key = `${g.bonding},${g.lone}`
    const r = VSEPR_REF[key]
    if (!r) { fail(`unexpected VSEPR entry ${key}`); vBad++; continue }
    if (g.shape !== r[0]) { fail(`VSEPR (${key}): shape "${g.shape}" should be "${r[0]}"`); vBad++ }
    if (g.hybridization !== r[1]) { fail(`VSEPR (${key}): hybridization "${g.hybridization}" should be "${r[1]}"`); vBad++ }
    if (g.draw.bonds.length !== g.bonding) { fail(`VSEPR (${key}): drawing shows ${g.draw.bonds.length} bonds but entry claims ${g.bonding}`); vBad++ }
    if (g.draw.lone.length !== g.lone) { fail(`VSEPR (${key}): drawing shows ${g.draw.lone.length} lone pairs but entry claims ${g.lone}`); vBad++ }
  }
  if (!vBad) console.log('  ok  13 VSEPR geometries: shapes, hybridizations, and drawings')

  // Branched alkane names: every name must account for exactly the carbons
  // its structure contains, and satisfy the lowest-locant rule.
  const src = fs.readFileSync('src/generators/nomenclature.js', 'utf8')
  const branchBlock = src.match(/const BRANCHED = \[([\s\S]*?)\n\]/)
  if (!branchBlock) {
    fail('could not read the BRANCHED table — this check would pass without testing anything')
  } else {
    const rows = [...branchBlock[1].matchAll(/\{ size: (\d+), subs: \[(.*?)\], name: '([^']+)' \}/g)]
    if (rows.length === 0) {
      fail('BRANCHED table parsed to zero rows — check is vacuous')
    } else {
      const STEM = { meth: 1, eth: 2, prop: 3, but: 4, pent: 5, hex: 6, hept: 7, oct: 8, non: 9, dec: 10 }
      const SUBC = { CH3: 1, CH2CH3: 2 }
      const MULT = { di: 2, tri: 3, tetra: 4 }
      let nBad = 0
      for (const [, size, subs, name] of rows) {
        const subList = [...subs.matchAll(/'([A-Za-z0-9]+)'/g)].map((x) => x[1])
        const structC = +size + subList.reduce((n, s) => n + (SUBC[s] || 0), 0)
        const stemKey = Object.keys(STEM).find((k) => name.endsWith(k + 'ane'))
        if (!stemKey) { fail(`branched name "${name}": could not parse parent stem`); nBad++; continue }
        let nameC = STEM[stemKey]
        for (const [, mult, sub] of name.matchAll(/(di|tri|tetra)?(methyl|ethyl)/g)) {
          nameC += (MULT[mult] || 1) * (sub === 'methyl' ? 1 : 2)
        }
        if (structC !== nameC) { fail(`branched name "${name}": structure has ${structC} carbons but the name implies ${nameC}`); nBad++ }
        const locs = (name.match(/^[\d,]+/) || [''])[0].split(',').filter(Boolean).map(Number)
        const n = STEM[stemKey]
        for (const l of locs) if (l > n) { fail(`branched name "${name}": locant ${l} exceeds the ${n}-carbon parent`); nBad++ }
        if (locs.length) {
          const mirrored = locs.map((l) => n + 1 - l).sort((a, b) => a - b)
          const forward = [...locs].sort((a, b) => a - b)
          for (let i = 0; i < forward.length; i++) {
            if (forward[i] < mirrored[i]) break
            if (forward[i] > mirrored[i]) { fail(`branched name "${name}" violates the lowest-locant rule`); nBad++; break }
          }
        }
      }
      if (!nBad) console.log(`  ok  ${rows.length} branched alkane names: carbon counts and lowest locants`)
    }
  }
}

console.log('\n=== Chemistry spot checks ===')
const check = (label, actual, expected) => {
  if (String(actual) !== String(expected)) fail(`${label}: got "${actual}", expected "${expected}"`)
  else console.log(`  ok  ${label} = ${actual}`)
}

// Molecular formulas
check('hexane', molecularFormula({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [] }), 'C6H14')
check('cyclohexane', molecularFormula({ shape: 'ring', size: 6, doubleBondAt: [], substituents: [] }), 'C6H12')
check('benzene', molecularFormula({ shape: 'ring', size: 6, doubleBondAt: [0, 2, 4], substituents: [] }), 'C6H6')
check('ethene', molecularFormula({ shape: 'chain', size: 2, doubleBondAt: [0], substituents: [] }), 'C2H4')
check(
  'propan-1-ol',
  molecularFormula({ shape: 'chain', size: 3, doubleBondAt: [], substituents: [{ vertexIndex: 0, label: 'OH' }] }),
  'C3H8O',
)
check(
  'acetic acid (2-carbon w/ =O and OH)',
  molecularFormula({
    shape: 'chain',
    size: 2,
    doubleBondAt: [],
    substituents: [
      { vertexIndex: 0, label: 'O', bond: 2 },
      { vertexIndex: 0, label: 'OH' },
    ],
  }),
  'C2H4O2',
)
check(
  'acetaldehyde',
  molecularFormula({ shape: 'chain', size: 2, doubleBondAt: [], substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }] }),
  'C2H4O',
)
check(
  'acetone (propan-2-one)',
  molecularFormula({ shape: 'chain', size: 3, doubleBondAt: [], substituents: [{ vertexIndex: 1, label: 'O', bond: 2 }] }),
  'C3H6O',
)
check(
  'acetonitrile',
  molecularFormula({ shape: 'chain', size: 2, doubleBondAt: [], substituents: [{ vertexIndex: 0, label: 'N', bond: 3 }] }),
  'C2H3N',
)

// Implicit H counts
check('hexane C1 H count', hydrogensAt({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [] }, 0), 3)
check('hexane C2 H count', hydrogensAt({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [] }, 1), 2)
check('benzene CH count', hydrogensAt({ shape: 'ring', size: 6, doubleBondAt: [0, 2, 4], substituents: [] }, 0), 1)

// Condensed structural formulas
check('condensed butane', condensedFormula({ shape: 'chain', size: 4, doubleBondAt: [], substituents: [] }), 'CH3CH2CH2CH3')
check(
  'condensed 2-chlorobutane',
  condensedFormula({ shape: 'chain', size: 4, doubleBondAt: [], substituents: [{ vertexIndex: 1, label: 'Cl' }] }),
  'CH3CH(Cl)CH2CH3',
)
check('condensed but-1-ene', condensedFormula({ shape: 'chain', size: 4, doubleBondAt: [0], substituents: [] }), 'CH2=CHCH2CH3')
check('condensed ring returns null', condensedFormula({ shape: 'ring', size: 6, doubleBondAt: [], substituents: [] }), 'null')

// Nomenclature
check('2-bromobutane', nameHaloalkane(4, [{ vertexIndex: 1, label: 'Br' }]), '2-bromobutane')
check('1-chloropropane', nameHaloalkane(3, [{ vertexIndex: 0, label: 'Cl' }]), '1-chloropropane')
check(
  '2,3-dichlorobutane',
  nameHaloalkane(4, [{ vertexIndex: 1, label: 'Cl' }, { vertexIndex: 2, label: 'Cl' }]),
  '2,3-dichlorobutane',
)
check(
  'lowest-locant flip (Br on C4 of pentane -> C2)',
  nameHaloalkane(5, [{ vertexIndex: 3, label: 'Br' }]),
  '2-bromopentane',
)
check(
  'alphabetical order bromo before chloro',
  nameHaloalkane(4, [{ vertexIndex: 0, label: 'Cl' }, { vertexIndex: 1, label: 'Br' }]),
  '2-bromo-1-chlorobutane',
)
check('pentan-2-ol', nameAlkanol(5, 1), 'pentan-2-ol')
check('pentan-2-ol from far end', nameAlkanol(5, 3), 'pentan-2-ol')
check('hex-1-ene', nameAlkene(6, 0), 'hex-1-ene')
check('hex-2-ene', nameAlkene(6, 1), 'hex-2-ene')
check('hex-2-ene from far end', nameAlkene(6, 3), 'hex-2-ene')
check('but-1-yne', nameAlkyne(4, 0), 'but-1-yne')
check('pent-2-yne', nameAlkyne(5, 1), 'pent-2-yne')

// Alkynes: triple bonds count as two pi bonds everywhere
check(
  'propyne formula',
  molecularFormula({ shape: 'chain', size: 3, doubleBondAt: [], tripleBondAt: [0], substituents: [] }),
  'C3H4',
)
check(
  'ethyne (acetylene) formula',
  molecularFormula({ shape: 'chain', size: 2, doubleBondAt: [], tripleBondAt: [0], substituents: [] }),
  'C2H2',
)
check(
  'alkyne terminal carbon H count',
  hydrogensAt({ shape: 'chain', size: 4, doubleBondAt: [], tripleBondAt: [0], substituents: [] }, 0),
  1,
)
check(
  'alkyne degrees of unsaturation',
  degreesOfUnsaturation({ shape: 'chain', size: 4, doubleBondAt: [], tripleBondAt: [0], substituents: [] }),
  2,
)
check(
  'alkyne carbon is sp',
  hybridizationAt({ shape: 'chain', size: 4, doubleBondAt: [], tripleBondAt: [0], substituents: [] }, 0),
  'sp',
)
check(
  'condensed but-1-yne',
  condensedFormula({ shape: 'chain', size: 4, doubleBondAt: [], tripleBondAt: [0], substituents: [] }),
  'CH≡CCH2CH3',
)

// Canonical keys: a chain and its end-to-end reversal are one molecule
check(
  '3-bromohexane == 4-bromohexane (same molecule)',
  canonicalKey({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [{ vertexIndex: 2, label: 'Br' }] }) ===
    canonicalKey({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [{ vertexIndex: 3, label: 'Br' }] }),
  true,
)
check(
  '2-bromohexane != 3-bromohexane (different molecules)',
  canonicalKey({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [{ vertexIndex: 1, label: 'Br' }] }) ===
    canonicalKey({ shape: 'chain', size: 6, doubleBondAt: [], substituents: [{ vertexIndex: 2, label: 'Br' }] }),
  false,
)
check(
  'pent-1-yne == pent-4-yne reversed',
  canonicalKey({ shape: 'chain', size: 5, doubleBondAt: [], tripleBondAt: [0], substituents: [] }) ===
    canonicalKey({ shape: 'chain', size: 5, doubleBondAt: [], tripleBondAt: [3], substituents: [] }),
  true,
)
check(
  'pentavalent carbon rejected',
  isValidMolecule({
    shape: 'chain',
    size: 5,
    doubleBondAt: [2],
    substituents: [{ vertexIndex: 2, label: 'CH3' }, { vertexIndex: 2, label: 'F' }],
  }),
  false,
)

// VSEPR
check('water shape', lookupGeometry(2, 2).shape, 'bent')
check('water hybridization', lookupGeometry(2, 2).hybridization, 'sp3')
check('ammonia shape', lookupGeometry(3, 1).shape, 'trigonal pyramidal')
check('methane angle', lookupGeometry(4, 0).angle, '109.5°')
check('CO2 shape', lookupGeometry(2, 0).shape, 'linear')

console.log(errors ? `\n${errors} FAILURES` : '\nAll checks passed')
process.exit(errors ? 1 : 0)
