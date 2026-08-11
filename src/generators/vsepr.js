import { rngFor, pick, shuffleWith, makeChoices } from './util.js'
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
