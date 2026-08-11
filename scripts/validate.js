import { TOPICS, getTopicBank, getMixedBank, getSpeedBank } from '../src/lib/topics.js'
import { molecularFormula, condensedFormula, hydrogensAt } from '../src/lib/chem/molecule.js'
import { nameHaloalkane, nameAlkanol, nameAlkene } from '../src/generators/nomenclature.js'
import { lookupGeometry } from '../src/lib/chem/vsepr.js'

let errors = 0
const fail = (msg) => {
  errors++
  console.log('  FAIL: ' + msg)
}

const seenIds = new Map()

console.log('=== Topic banks ===')
for (const topic of TOPICS) {
  const bank = getTopicBank(topic.id)
  console.log(`${topic.label.padEnd(26)} ${String(bank.length).padStart(4)} questions`)

  for (const q of bank) {
    if (!q.id) fail(`${topic.id}: question with no id`)
    if (seenIds.has(q.id) && seenIds.get(q.id) !== topic.id) {
      fail(`duplicate id "${q.id}" across topics ${seenIds.get(q.id)} and ${topic.id}`)
    }
    seenIds.set(q.id, topic.id)

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
    } else {
      fail(`${q.id}: unknown kind "${q.kind}"`)
    }

    if (q.visual?.type === 'skeletal') {
      const mol = q.visual.molecule
      if (!mol || !mol.size) fail(`${q.id}: skeletal visual missing molecule`)
      for (let v = 0; v < mol.size; v++) {
        const h = hydrogensAt(mol, v)
        if (h < 0 || h > 3) fail(`${q.id}: vertex ${v} has impossible H count ${h}`)
      }
    }
  }
}

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

// VSEPR
check('water shape', lookupGeometry(2, 2).shape, 'bent')
check('water hybridization', lookupGeometry(2, 2).hybridization, 'sp3')
check('ammonia shape', lookupGeometry(3, 1).shape, 'trigonal pyramidal')
check('methane angle', lookupGeometry(4, 0).angle, '109.5°')
check('CO2 shape', lookupGeometry(2, 0).shape, 'linear')

console.log(errors ? `\n${errors} FAILURES` : '\nAll checks passed')
process.exit(errors ? 1 : 0)
