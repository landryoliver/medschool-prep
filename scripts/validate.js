import fs from 'node:fs'
import { TOPICS, getTopicBank, getMixedBank, getSpeedBank } from '../src/lib/topics.js'
import { molecularFormula, condensedFormula, hydrogensAt, degreesOfUnsaturation, hybridizationAt, canonicalKey, isValidMolecule } from '../src/lib/chem/molecule.js'
import { nameHaloalkane, nameAlkanol, nameAlkene, nameAlkyne } from '../src/generators/nomenclature.js'
import { lookupGeometry, GEOMETRIES } from '../src/lib/chem/vsepr.js'
import { nextProgressState, selectSessionQuestions, BOX_INTERVALS_MS } from '../src/lib/srs.js'
import { TOPIC_META, buttonContrast } from '../src/lib/topicMeta.js'
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
    if (a.charge7 !== ch) { fail(`${a.name}: charge at pH 7.4 is ${a.charge7}, should be ${ch}`); aaBad++ }
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
