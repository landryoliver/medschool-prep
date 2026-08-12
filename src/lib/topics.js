import { buildBank } from '../generators/util.js'
import { mulberry32 } from './prng.js'
import * as elements from '../generators/elements.js'
import * as formalCharge from '../generators/formalCharge.js'
import * as lewisErrors from '../generators/lewisErrors.js'
import * as lewisBuilder from '../generators/lewisBuilder.js'
import * as vsepr from '../generators/vsepr.js'
import * as acidBase from '../generators/acidBase.js'
import * as skeletal from '../generators/skeletal.js'
import * as nomenclature from '../generators/nomenclature.js'
import * as functionalGroups from '../generators/functionalGroups.js'

import lewisStructures from '../data/genchem/lewisStructures.json'
import electronConfig from '../data/genchem/electronConfig.json'
import vseprCurated from '../data/genchem/vsepr.json'
import acidBaseCurated from '../data/genchem/acidBase.json'
import curvedArrows from '../data/curated/curvedArrows.json'
import resonance from '../data/curated/resonance.json'
import branchedNomenclature from '../data/curated/branchedNomenclature.json'
import pkaComparisons from '../data/curated/pkaComparisons.json'
import mechanismConcepts from '../data/curated/mechanismConcepts.json'
import snsE from '../data/curated/snsE.json'
import imf from '../data/curated/imf.json'
import energyKinetics from '../data/curated/energyKinetics.json'
import isomers from '../data/curated/isomers.json'
import resonanceExtra from '../data/curated/resonanceExtra.json'
import arrowsExtra from '../data/curated/arrowsExtra.json'
import * as imfGen from '../generators/imf.js'

function hashId(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Curated JSON is authored with the correct answer first, which would
 * make "pick the top option" a winning strategy. Shuffle deterministically
 * from the question id so the order is stable across reloads (and so a
 * question's spaced-repetition history still lines up with what it shows).
 */
function shuffleChoices(q) {
  if (!Array.isArray(q.choices) || q.choices.length < 2) return q
  const rng = mulberry32(hashId(q.id))
  const order = q.choices.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const next = { ...q, choices: order.map((i) => q.choices[i]) }
  if (q.choiceVisuals) next.choiceVisuals = order.map((i) => q.choiceVisuals[i])
  if (typeof q.correctIndex === 'number') next.correctIndex = order.indexOf(q.correctIndex)
  if (Array.isArray(q.correctIndices)) next.correctIndices = q.correctIndices.map((i) => order.indexOf(i))
  return next
}

const withKind = (rows) => rows.map((q) => shuffleChoices({ kind: 'mcq', ...q }))

/**
 * Study topics for the pre-organic prep track. Banks are built once on
 * first access and cached — generated questions are deterministic per
 * seed, so a question's identity (and its spaced-repetition history)
 * stays stable across sessions and reloads.
 */
export const TOPICS = [
  {
    id: 'periodic',
    label: 'Periodic Table',
    blurb: 'Symbols, valence, bonding patterns, and the trends that drive everything else.',
    speedRound: true,
    build: () => [
      ...buildBank(elements.generateSymbolName, 70),
      ...buildBank(elements.generateAtomicNumber, 50),
      ...buildBank(elements.generateValence, 60),
      ...buildBank(elements.generateBondCount, 40),
      ...buildBank(elements.generateBondCompare, 80),
      ...buildBank(elements.generateTrendCompare, 110),
      ...buildBank(elements.generateENRanking, 60),
      ...buildBank(elements.generateTrendDirection, 12),
      ...withKind(electronConfig),
    ],
  },
  {
    id: 'polarity',
    label: 'Bond Polarity',
    blurb: 'Which atom gets δ−, how polar a bond is, and where dipoles point.',
    speedRound: true,
    build: () => [
      ...buildBank(elements.generatePolarityDirection, 90),
      ...buildBank(elements.generatePolarityClass, 60),
      ...buildBank(elements.generateMorePolarBond, 70),
    ],
  },
  {
    id: 'lewis',
    label: 'Lewis & Formal Charge',
    blurb: 'Build structures dot by dot, count lone pairs, compute formal charge, spot broken drawings.',
    build: () => [
      ...buildBank(formalCharge.generateFormalCharge, 20),
      ...buildBank(formalCharge.generateLonePairCount, 20),
      ...buildBank(formalCharge.generateOctetCheck, 20),
      ...buildBank(formalCharge.generateChargeIdentify, 20),
      ...buildBank(lewisErrors.generateSpotError, 48),
      ...buildBank(lewisBuilder.generateBuilder, 12),
      ...withKind(lewisStructures),
    ],
  },
  {
    id: 'vsepr',
    label: 'VSEPR & Hybridization',
    blurb: 'Electron groups to shapes, angles, and sp/sp²/sp³.',
    build: () => [
      ...buildBank(vsepr.generateShapeFromCounts, 26),
      ...buildBank(vsepr.generateElectronGeometry, 22),
      ...buildBank(vsepr.generateHybridization, 26),
      ...buildBank(vsepr.generateBondAngle, 22),
      ...buildBank(vsepr.generateMoleculeShape, 17),
      ...buildBank(vsepr.generateMoleculeHybridization, 17),
      ...buildBank(vsepr.generateGroupCount, 17),
      ...buildBank(vsepr.generateOrganicHybridization, 16),
      ...buildBank(vsepr.generateOrganicGroupCount, 16),
      ...buildBank(vsepr.generateShapeFromDiagram, 20),
      ...buildBank(vsepr.generateAngleFromDiagram, 18),
      ...buildBank(vsepr.generateDiagramFromShape, 18),
      ...withKind(vseprCurated),
    ],
  },
  {
    id: 'acidbase',
    label: 'Acids & Bases',
    blurb: 'pKa comparisons, conjugate pairs, and which way a proton actually moves.',
    build: () => [
      ...buildBank(acidBase.generateStrongerAcid, 80),
      ...buildBank(acidBase.generateStrongerBase, 60),
      ...buildBank(acidBase.generateConjugateBase, 27),
      ...buildBank(acidBase.generateConjugateAcid, 27),
      ...buildBank(acidBase.generateProtonTransfer, 90),
      ...buildBank(acidBase.generateAcidRanking, 60),
      ...buildBank(acidBase.generatePkaRecall, 27),
      ...buildBank(acidBase.generateAcidBaseRole, 4),
      ...withKind(acidBaseCurated),
      ...withKind(pkaComparisons),
    ],
  },
  {
    id: 'imf',
    label: 'Intermolecular Forces',
    blurb: 'H-bonding, dipoles, dispersion — what sets boiling points and solubility.',
    build: () => [
      ...withKind(imf),
      ...buildBank(imfGen.generateBoilingCompare, 90),
      ...buildBank(imfGen.generateStrongestForce, 40),
      ...buildBank(imfGen.generateSolubility, 40),
      ...buildBank(imfGen.generateFamilyForce, 40),
    ],
  },
  {
    id: 'energy',
    label: 'Energy & Kinetics',
    blurb: 'Energy diagrams, activation barriers, rate laws — why SN1 and SN2 differ.',
    build: () => withKind(energyKinetics),
  },
  {
    id: 'isomers',
    label: 'Isomers',
    blurb: 'Constitutional vs stereo, conformers, and spotting a stereocenter.',
    build: () => withKind(isomers),
  },
  {
    id: 'skeletal',
    label: 'Skeletal Structures',
    blurb: 'Read line-angle drawings fast: hidden hydrogens, formulas, unsaturation.',
    speedRound: true,
    build: () => [
      ...buildBank(skeletal.generateImplicitH, 45),
      ...buildBank(skeletal.generateFormula, 40),
      ...buildBank(skeletal.generateCarbonCount, 35),
      ...buildBank(skeletal.generateDegreesUnsaturation, 30),
      ...buildBank(skeletal.generateSkeletalHybridization, 35),
      ...buildBank(skeletal.generateCondensed, 35),
      ...buildBank(skeletal.generateCondensedToSkeletal, 25),
    ],
  },
  {
    id: 'functional',
    label: 'Functional Groups',
    blurb: 'Spot alcohols, carbonyls, amines and the rest on sight.',
    speedRound: true,
    build: () => [
      ...buildBank(functionalGroups.generateGroupId, 110),
      ...buildBank(functionalGroups.generateMultiGroupId, 60),
      ...buildBank(functionalGroups.generateGroupFromDescription, 13),
    ],
  },
  {
    id: 'nomenclature',
    label: 'Nomenclature',
    blurb: 'Name simple chains both directions: structure to name and back.',
    build: () => [
      ...buildBank(nomenclature.generateStructureToName, 45),
      ...buildBank(nomenclature.generateNameToStructure, 30),
      ...buildBank(nomenclature.generateStemRecall, 20),
      ...buildBank(nomenclature.generateBranchedName, 20),
      ...buildBank(nomenclature.generateBranchedStructure, 20),
      ...withKind(branchedNomenclature),
    ],
  },
  {
    id: 'resonance',
    label: 'Resonance',
    blurb: 'Delocalization, major vs minor contributors, and what resonance is not.',
    build: () => [...withKind(resonance), ...withKind(resonanceExtra)],
  },
  {
    id: 'arrows',
    label: 'Curved Arrows',
    blurb: 'Recognition only — what an arrow means before mechanisms start in class.',
    build: () => [...withKind(curvedArrows), ...withKind(arrowsExtra)],
  },
  {
    id: 'orgopreview',
    label: 'Orgo Preview',
    blurb: 'A look ahead: mechanism concepts and SN1/SN2/E1/E2 conditions.',
    build: () => [...withKind(mechanismConcepts), ...withKind(snsE)],
  },
]

const cache = new Map()

export function getTopicBank(topicId) {
  if (!cache.has(topicId)) {
    const topic = TOPICS.find((t) => t.id === topicId)
    cache.set(topicId, topic ? topic.build() : [])
  }
  return cache.get(topicId)
}

/** Every question across every topic — powers mixed review. */
export function getMixedBank() {
  if (!cache.has('__mixed')) {
    cache.set('__mixed', TOPICS.flatMap((t) => getTopicBank(t.id)))
  }
  return cache.get('__mixed')
}

/** Questions whose most recent attempt was wrong, newest miss first. */
export function getMissedBank(progressRows) {
  const missed = new Set(progressRows.filter((p) => p.lastResult === false).map((p) => p.id))
  return getMixedBank().filter((q) => missed.has(q.id))
}

/** Only the fast, mechanical topics work well against a clock. */
export function getSpeedBank(topicId) {
  return getTopicBank(topicId).filter((q) => q.kind === 'mcq' && !q.choiceVisuals && q.choices?.length <= 4)
}

export const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]))
