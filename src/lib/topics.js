import { buildBank } from '../generators/util.js'
import * as elements from '../generators/elements.js'
import * as formalCharge from '../generators/formalCharge.js'
import * as lewisErrors from '../generators/lewisErrors.js'
import * as vsepr from '../generators/vsepr.js'
import * as acidBase from '../generators/acidBase.js'
import * as skeletal from '../generators/skeletal.js'
import * as nomenclature from '../generators/nomenclature.js'
import * as functionalGroups from '../generators/functionalGroups.js'

import lewisStructures from '../data/genchem/lewisStructures.json'
import vseprCurated from '../data/genchem/vsepr.json'
import acidBaseCurated from '../data/genchem/acidBase.json'
import curvedArrows from '../data/curated/curvedArrows.json'
import resonance from '../data/curated/resonance.json'
import branchedNomenclature from '../data/curated/branchedNomenclature.json'
import pkaComparisons from '../data/curated/pkaComparisons.json'
import mechanismConcepts from '../data/curated/mechanismConcepts.json'
import snsE from '../data/curated/snsE.json'

const withKind = (rows) => rows.map((q) => ({ kind: 'mcq', ...q }))

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
      ...buildBank(elements.generateSymbolName, 40),
      ...buildBank(elements.generateValence, 24),
      ...buildBank(elements.generateBondCount, 24),
      ...buildBank(elements.generateBondCompare, 30),
      ...buildBank(elements.generateTrendCompare, 45),
      ...buildBank(elements.generateENRanking, 30),
      ...buildBank(elements.generateTrendDirection, 12),
    ],
  },
  {
    id: 'polarity',
    label: 'Bond Polarity',
    blurb: 'Which atom gets δ−, how polar a bond is, and where dipoles point.',
    speedRound: true,
    build: () => [
      ...buildBank(elements.generatePolarityDirection, 40),
      ...buildBank(elements.generatePolarityClass, 30),
      ...buildBank(elements.generateMorePolarBond, 30),
    ],
  },
  {
    id: 'lewis',
    label: 'Lewis & Formal Charge',
    blurb: 'Lone pairs, octets, formal charge, and spotting a broken structure.',
    build: () => [
      ...buildBank(formalCharge.generateFormalCharge, 20),
      ...buildBank(formalCharge.generateLonePairCount, 20),
      ...buildBank(formalCharge.generateOctetCheck, 20),
      ...buildBank(formalCharge.generateChargeIdentify, 20),
      ...buildBank(lewisErrors.generateSpotError, 48),
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
      ...withKind(vseprCurated),
    ],
  },
  {
    id: 'acidbase',
    label: 'Acids & Bases',
    blurb: 'pKa comparisons, conjugate pairs, and which way a proton actually moves.',
    build: () => [
      ...buildBank(acidBase.generateStrongerAcid, 40),
      ...buildBank(acidBase.generateStrongerBase, 30),
      ...buildBank(acidBase.generateConjugateBase, 27),
      ...buildBank(acidBase.generateConjugateAcid, 27),
      ...buildBank(acidBase.generateProtonTransfer, 45),
      ...buildBank(acidBase.generateAcidRanking, 30),
      ...buildBank(acidBase.generatePkaRecall, 27),
      ...buildBank(acidBase.generateAcidBaseRole, 4),
      ...withKind(acidBaseCurated),
      ...withKind(pkaComparisons),
    ],
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
    ],
  },
  {
    id: 'functional',
    label: 'Functional Groups',
    blurb: 'Spot alcohols, carbonyls, amines and the rest on sight.',
    speedRound: true,
    build: () => [
      ...buildBank(functionalGroups.generateGroupId, 52),
      ...buildBank(functionalGroups.generateMultiGroupId, 21),
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
      ...withKind(branchedNomenclature),
    ],
  },
  {
    id: 'resonance',
    label: 'Resonance',
    blurb: 'Delocalization, major vs minor contributors, and what resonance is not.',
    build: () => withKind(resonance),
  },
  {
    id: 'arrows',
    label: 'Curved Arrows',
    blurb: 'Recognition only — what an arrow means before mechanisms start in class.',
    build: () => withKind(curvedArrows),
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

/** Only the fast, mechanical topics work well against a clock. */
export function getSpeedBank(topicId) {
  return getTopicBank(topicId).filter((q) => q.kind === 'mcq' && !q.choiceVisuals && q.choices?.length <= 4)
}

export const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]))
