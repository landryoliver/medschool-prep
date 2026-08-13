import { TOPICS, getTopicBank, getMixedBank, getSpeedBank } from '../src/lib/topics.js'
import { molecularFormula, condensedFormula, hydrogensAt, degreesOfUnsaturation, hybridizationAt, canonicalKey, isValidMolecule } from '../src/lib/chem/molecule.js'
import { nameHaloalkane, nameAlkanol, nameAlkene, nameAlkyne } from '../src/generators/nomenclature.js'
import { lookupGeometry } from '../src/lib/chem/vsepr.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server.browser'
import QuestionVisual from '../src/components/visuals/QuestionVisual.jsx'

let errors = 0
const fail = (msg) => {
  errors++
  console.log('  FAIL: ' + msg)
}

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
console.log('\n=== Rendering visuals ===')
let rendered = 0
for (const q of getMixedBank()) {
  const visuals = [q.visual, ...(q.choiceVisuals ?? [])].filter(Boolean)
  for (const visual of visuals) {
    try {
      const html = renderToStaticMarkup(createElement(QuestionVisual, { visual, revealed: true }))
      if (!html) fail(`${q.id}: visual rendered empty`)
      if (html.includes('NaN')) fail(`${q.id}: visual contains NaN coordinates`)
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
