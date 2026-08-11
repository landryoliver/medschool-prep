import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'
import {
  ORGO_GEOMETRIES,
  GEOMETRIES,
  lookupGeometry,
  ALL_SHAPES,
  ALL_ELECTRON_GEOMETRIES,
  ALL_HYBRIDIZATIONS,
  ALL_ANGLES,
} from '../lib/chem/vsepr.js'

/**
 * Real molecules with their central-atom electron-group counts.
 * `groups` counts attached atoms (a double or triple bond is ONE group).
 */
const MOLECULES = [
  { formula: 'CH₄', center: 'C', ligand: 'H', bonding: 4, lone: 0, note: 'four single bonds' },
  { formula: 'NH₃', center: 'N', ligand: 'H', bonding: 3, lone: 1, note: 'three bonds plus one lone pair' },
  { formula: 'H₂O', center: 'O', ligand: 'H', bonding: 2, lone: 2, note: 'two bonds plus two lone pairs' },
  { formula: 'CO₂', center: 'C', ligand: 'O', bonding: 2, lone: 0, note: 'two double bonds — each counts as ONE group' },
  { formula: 'BF₃', center: 'B', ligand: 'F', bonding: 3, lone: 0, note: 'three bonds, no lone pairs (boron is fine with 6 electrons)' },
  { formula: 'CH₂O', center: 'C', ligand: 'O/H', bonding: 3, lone: 0, note: 'one double bond to O and two C–H bonds = 3 groups' },
  { formula: 'HCN', center: 'C', ligand: 'N/H', bonding: 2, lone: 0, note: 'a triple bond and a single bond = 2 groups' },
  { formula: 'SO₂', center: 'S', ligand: 'O', bonding: 2, lone: 1, note: 'two bonded oxygens plus one lone pair on sulfur' },
  { formula: 'O₃ (ozone)', center: 'O', ligand: 'O', bonding: 2, lone: 1, note: 'central O has two bonded oxygens and one lone pair' },
  { formula: 'NH₄⁺', center: 'N', ligand: 'H', bonding: 4, lone: 0, note: 'four bonds, no lone pairs' },
  { formula: 'H₃O⁺', center: 'O', ligand: 'H', bonding: 3, lone: 1, note: 'three bonds plus one lone pair' },
  { formula: 'CH₃⁺ (methyl cation)', center: 'C', ligand: 'H', bonding: 3, lone: 0, note: 'three bonds, empty p orbital' },
  { formula: 'CH₃⁻ (methyl anion)', center: 'C', ligand: 'H', bonding: 3, lone: 1, note: 'three bonds plus a lone pair' },
  { formula: 'BeCl₂', center: 'Be', ligand: 'Cl', bonding: 2, lone: 0, note: 'two bonds, no lone pairs' },
  { formula: 'PCl₅', center: 'P', ligand: 'Cl', bonding: 5, lone: 0, note: 'five bonds — an expanded octet' },
  { formula: 'SF₆', center: 'S', ligand: 'F', bonding: 6, lone: 0, note: 'six bonds — an expanded octet' },
  { formula: 'SF₄', center: 'S', ligand: 'F', bonding: 4, lone: 1, note: 'four bonds plus one lone pair' },
]

/**
 * Specific atoms inside organic functional groups — the form the question
 * actually takes in an orgo course ("what is the hybridization of the
 * oxygen in an ester?"), as opposed to the gen-chem inorganics above.
 *
 * `groups` counts sigma bonds plus lone pairs on that atom.
 */
const ORGANIC_ATOMS = [
  { molecule: 'a ketone (R₂C=O)', atom: 'carbonyl carbon', groups: 3, note: 'two single bonds to carbon plus one double bond to oxygen = 3 groups' },
  { molecule: 'a ketone (R₂C=O)', atom: 'carbonyl oxygen', groups: 3, note: 'one double bond to carbon plus two lone pairs = 3 groups' },
  { molecule: 'an aldehyde (RCHO)', atom: 'carbonyl carbon', groups: 3, note: 'bonds to R, H and a double bond to O = 3 groups' },
  { molecule: 'a carboxylic acid (RCOOH)', atom: 'carbonyl carbon', groups: 3, note: 'bonds to R, to the –OH oxygen, and a double bond to O = 3 groups' },
  { molecule: 'an alcohol (ROH)', atom: 'oxygen', groups: 4, note: 'two single bonds plus two lone pairs = 4 groups' },
  { molecule: 'an ether (ROR)', atom: 'oxygen', groups: 4, note: 'two single bonds to carbon plus two lone pairs = 4 groups' },
  { molecule: 'an amine (RNH₂)', atom: 'nitrogen', groups: 4, note: 'three single bonds plus one lone pair = 4 groups' },
  { molecule: 'an alkene (R₂C=CR₂)', atom: 'either alkene carbon', groups: 3, note: 'two single bonds plus one double bond = 3 groups' },
  { molecule: 'an alkyne (RC≡CR)', atom: 'either alkyne carbon', groups: 2, note: 'one single bond plus one triple bond = 2 groups' },
  { molecule: 'benzene', atom: 'any ring carbon', groups: 3, note: 'two ring bonds plus one C–H bond = 3 groups' },
  { molecule: 'a nitrile (RC≡N)', atom: 'the nitrile carbon', groups: 2, note: 'one single bond plus one triple bond = 2 groups' },
  { molecule: 'a nitrile (RC≡N)', atom: 'the nitrile nitrogen', groups: 2, note: 'one triple bond plus one lone pair = 2 groups' },
  { molecule: 'an alkane (RCH₃)', atom: 'any carbon', groups: 4, note: 'four single bonds = 4 groups' },
  { molecule: 'a carbocation (R₃C⁺)', atom: 'the positive carbon', groups: 3, note: 'three single bonds and an EMPTY p orbital — the empty orbital is not a group' },
  { molecule: 'a carbanion (R₃C⁻)', atom: 'the negative carbon', groups: 4, note: 'three single bonds plus one lone pair = 4 groups' },
  {
    molecule: 'an amide (RCONH₂)',
    atom: 'the nitrogen',
    groups: 3,
    note: "the nitrogen's lone pair delocalizes into the C=O, so it sits in a p orbital and the nitrogen is planar rather than pyramidal",
  },
]

const GROUPS_TO_HYBRIDIZATION = { 2: 'sp', 3: 'sp2', 4: 'sp3' }

const GROUP_RULE = 'Count electron GROUPS, not bonds: a double or triple bond counts as one group, and each lone pair counts as one.'

function geometryVisual(geo, centerLabel = 'A', ligandLabel = 'X') {
  return { type: 'vsepr', geometry: geo, centerLabel, ligandLabel }
}

/** Abstract: given group counts, name the molecular shape. */
export function generateShapeFromCounts(seed) {
  const rng = rngFor(seed)
  const geo = pick(rng, rng() < 0.8 ? ORGO_GEOMETRIES : GEOMETRIES)
  const { choices, correctIndex } = makeChoices(rng, geo.shape, ALL_SHAPES)

  return {
    id: `vshape-${seed}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `A central atom has ${geo.bonding} bonding group${geo.bonding === 1 ? '' : 's'} and ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'}. What is the MOLECULAR shape?`,
    choices,
    correctIndex,
    explanation: `${geo.bonding} + ${geo.lone} = ${geo.bonding + geo.lone} electron groups → ${geo.electronGeometry} electron geometry. Ignoring the lone pair${geo.lone === 1 ? '' : 's'} leaves a ${geo.shape} molecular shape (${geo.angle}).`,
    teach: 'Electron geometry counts lone pairs; molecular shape describes only where the ATOMS sit.',
    visual: geometryVisual(geo),
    visualAfter: true,
  }
}

/** Abstract: given group counts, name the electron geometry. */
export function generateElectronGeometry(seed) {
  const rng = rngFor(seed)
  const geo = pick(rng, rng() < 0.8 ? ORGO_GEOMETRIES : GEOMETRIES)
  const { choices, correctIndex } = makeChoices(rng, geo.electronGeometry, ALL_ELECTRON_GEOMETRIES)

  return {
    id: `vegeo-${seed}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `A central atom has ${geo.bonding} bonding group${geo.bonding === 1 ? '' : 's'} and ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'}. What is the ELECTRON geometry?`,
    choices,
    correctIndex,
    explanation: `${geo.bonding + geo.lone} total electron groups → ${geo.electronGeometry}. (The molecular shape is ${geo.shape}.)`,
    teach: 'Electron geometry depends only on the TOTAL number of groups: 2 linear, 3 trigonal planar, 4 tetrahedral, 5 trigonal bipyramidal, 6 octahedral.',
    visual: geometryVisual(geo),
    visualAfter: true,
  }
}

/** Hybridization from group count — the orgo workhorse. */
export function generateHybridization(seed) {
  const rng = rngFor(seed)
  const geo = pick(rng, rng() < 0.85 ? ORGO_GEOMETRIES : GEOMETRIES)
  const { choices, correctIndex } = makeChoices(rng, geo.hybridization, ALL_HYBRIDIZATIONS)
  const groups = geo.bonding + geo.lone

  return {
    id: `vhyb-${seed}`,
    topic: 'hybridization',
    kind: 'mcq',
    prompt: `A central atom has ${geo.bonding} bonding group${geo.bonding === 1 ? '' : 's'} and ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'}. What is its hybridization?`,
    choices,
    correctIndex,
    explanation: `${groups} electron groups → ${geo.hybridization}.`,
    teach: 'Hybridization follows the group count directly: 2 groups = sp, 3 groups = sp², 4 groups = sp³.',
    visual: geometryVisual(geo),
    visualAfter: true,
  }
}

// Representative degrees for each angle string, so distractors can be kept
// far enough from the key to be genuinely distinguishable. Offering ~107°
// against 109.5° is not a real question when the prompt says "approximate".
const ANGLE_DEGREES = {
  '180°': 180,
  '120°': 120,
  '~118°': 118,
  '109.5°': 109.5,
  '~107°': 107,
  '~104.5°': 104.5,
  '90°': 90,
  '~90°': 90,
  '90° and 120°': 105,
  '~90° and ~120°': 105,
}

const MIN_ANGLE_GAP = 8

/** Bond angle from group counts. */
export function generateBondAngle(seed) {
  const rng = rngFor(seed)
  const geo = pick(rng, ORGO_GEOMETRIES)
  const keyDeg = ANGLE_DEGREES[geo.angle]
  const distinct = ALL_ANGLES.filter((a) => Math.abs(ANGLE_DEGREES[a] - keyDeg) >= MIN_ANGLE_GAP)
  const { choices, correctIndex } = makeChoices(rng, geo.angle, distinct)

  return {
    id: `vang-${seed}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `What is the approximate bond angle for a ${geo.shape} molecule (${geo.bonding} bonding group${geo.bonding === 1 ? '' : 's'}, ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'})?`,
    choices,
    correctIndex,
    explanation: `${geo.shape} from ${geo.electronGeometry} geometry → ${geo.angle}.${geo.lone ? ' Lone pairs repel harder than bonds, squeezing the angle slightly below the ideal.' : ''}`,
    teach: 'Ideal angles: 2 groups 180°, 3 groups 120°, 4 groups 109.5°. Each lone pair compresses them a few degrees.',
    visual: geometryVisual(geo),
    visualAfter: true,
  }
}

/** Real molecule → shape. */
export function generateMoleculeShape(seed) {
  const rng = rngFor(seed)
  const mol = MOLECULES[seed % MOLECULES.length]
  const geo = lookupGeometry(mol.bonding, mol.lone)
  if (!geo) return null
  const { choices, correctIndex } = makeChoices(rng, geo.shape, ALL_SHAPES)

  return {
    id: `vmol-${seed % MOLECULES.length}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `What is the molecular shape of ${mol.formula}?`,
    choices,
    correctIndex,
    explanation: `${mol.formula} has ${mol.note} → ${mol.bonding} bonding group${mol.bonding === 1 ? '' : 's'} + ${mol.lone} lone pair${mol.lone === 1 ? '' : 's'} = ${geo.electronGeometry} electron geometry, ${geo.shape} shape, ${geo.angle}.`,
    teach: GROUP_RULE,
    visual: geometryVisual(geo, mol.center, mol.ligand),
    visualAfter: true,
  }
}

/** Real molecule → hybridization of the central atom. */
export function generateMoleculeHybridization(seed) {
  const rng = rngFor(seed)
  const mol = MOLECULES[seed % MOLECULES.length]
  const geo = lookupGeometry(mol.bonding, mol.lone)
  if (!geo) return null
  const { choices, correctIndex } = makeChoices(rng, geo.hybridization, ALL_HYBRIDIZATIONS)

  return {
    id: `vmolhyb-${seed % MOLECULES.length}`,
    topic: 'hybridization',
    kind: 'mcq',
    prompt: `What is the hybridization of the central ${mol.center} atom in ${mol.formula}?`,
    choices,
    correctIndex,
    explanation: `${mol.formula}: ${mol.note} → ${mol.bonding + mol.lone} electron groups → ${geo.hybridization}.`,
    teach: GROUP_RULE,
    visual: geometryVisual(geo, mol.center, mol.ligand),
    visualAfter: true,
  }
}

/**
 * Visual drills: the geometry diagram IS the question, rather than a
 * reward shown after answering. Reading a shape off a drawing is a
 * different skill from deriving one from group counts.
 */
export function generateShapeFromDiagram(seed) {
  const rng = rngFor(seed * 3299 + 13)
  const geo = pick(rng, ORGO_GEOMETRIES)
  const { choices, correctIndex } = makeChoices(rng, geo.shape, ALL_SHAPES)

  return {
    id: `vseeshape-${seed}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: 'What is the molecular shape shown here?',
    choices,
    correctIndex,
    explanation: `${geo.bonding} bonded atom${geo.bonding === 1 ? '' : 's'} and ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'} → ${geo.shape}, ${geo.angle}.`,
    teach: 'Lone pairs are drawn as dot pairs. Count only the ATOMS to name the molecular shape.',
    visual: geometryVisual(geo),
  }
}

/** Read a bond angle off a drawn geometry. */
export function generateAngleFromDiagram(seed) {
  const rng = rngFor(seed * 5417 + 29)
  const geo = pick(rng, ORGO_GEOMETRIES)
  const keyDeg = ANGLE_DEGREES[geo.angle]
  const distinct = ALL_ANGLES.filter((a) => Math.abs(ANGLE_DEGREES[a] - keyDeg) >= MIN_ANGLE_GAP)
  const { choices, correctIndex } = makeChoices(rng, geo.angle, distinct)

  return {
    id: `vseeangle-${seed}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: 'What is the approximate bond angle in the geometry shown?',
    choices,
    correctIndex,
    explanation: `This is ${geo.shape} (${geo.bonding} bonded, ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'}) → ${geo.angle}.`,
    teach: 'Each lone pair pushes the bonding pairs slightly closer together, dropping the angle a few degrees below ideal.',
    visual: geometryVisual(geo),
  }
}

/** Name → pick the matching geometry diagram. */
export function generateDiagramFromShape(seed) {
  const rng = rngFor(seed * 6091 + 37)
  const geo = pick(rng, ORGO_GEOMETRIES)
  const others = ORGO_GEOMETRIES.filter((g) => g.shape !== geo.shape)
  if (others.length < 3) return null

  const options = shuffleWith(rng, [geo, ...pickN(rng, others, 3)])

  return {
    id: `vseepick-${seed}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `Which diagram shows a ${geo.shape} molecule?`,
    choices: options.map((_, i) => `Option ${'ABCD'[i]}`),
    choiceVisuals: options.map((g) => geometryVisual(g)),
    correctIndex: options.indexOf(geo),
    explanation: `${geo.shape} comes from ${geo.bonding} bonded atom${geo.bonding === 1 ? '' : 's'} and ${geo.lone} lone pair${geo.lone === 1 ? '' : 's'} (${geo.electronGeometry} electron geometry).`,
    teach: 'Wedges point toward you and hashed lines point away — together they show a 3-D shape on a flat page.',
  }
}

/** Hybridization of a named atom inside an organic functional group. */
export function generateOrganicHybridization(seed) {
  const rng = rngFor(seed * 1543 + 31)
  const entry = ORGANIC_ATOMS[seed % ORGANIC_ATOMS.length]
  const correct = GROUPS_TO_HYBRIDIZATION[entry.groups]
  const choices = ['sp', 'sp2', 'sp3']

  return {
    id: `orghyb-${seed % ORGANIC_ATOMS.length}`,
    topic: 'hybridization',
    kind: 'mcq',
    prompt: `What is the hybridization of ${entry.atom} in ${entry.molecule}?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `${entry.note} → ${entry.groups} electron groups → ${correct}.`,
    teach: 'Lone pairs count as groups; an empty orbital does not. A carbocation is sp² with an empty p orbital, while a carbanion is sp³.',
  }
}

/** Electron-group count on a named organic atom. */
export function generateOrganicGroupCount(seed) {
  const rng = rngFor(seed * 2129 + 47)
  const entry = ORGANIC_ATOMS[seed % ORGANIC_ATOMS.length]
  const choices = shuffleWith(rng, ['2', '3', '4', '5'])

  return {
    id: `orggrp-${seed % ORGANIC_ATOMS.length}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `How many electron groups surround ${entry.atom} in ${entry.molecule}?`,
    choices,
    correctIndex: choices.indexOf(String(entry.groups)),
    explanation: `${entry.note}.`,
    teach: GROUP_RULE,
  }
}

/** Electron-group counting itself, isolated from the geometry lookup. */
export function generateGroupCount(seed) {
  const rng = rngFor(seed)
  const mol = MOLECULES[seed % MOLECULES.length]
  const total = mol.bonding + mol.lone
  const choices = shuffleWith(rng, ['2', '3', '4', '5', '6'])

  return {
    id: `vgroups-${seed % MOLECULES.length}`,
    topic: 'vsepr',
    kind: 'mcq',
    prompt: `How many ELECTRON GROUPS surround the central ${mol.center} atom in ${mol.formula}?`,
    choices,
    correctIndex: choices.indexOf(String(total)),
    explanation: `${mol.note} → ${mol.bonding} bonding group${mol.bonding === 1 ? '' : 's'} + ${mol.lone} lone pair${mol.lone === 1 ? '' : 's'} = ${total}.`,
    teach: GROUP_RULE,
  }
}
