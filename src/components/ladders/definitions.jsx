import aminoAcids from '../../data/genchem/aminoAcids.json'
import MNEMONICS from '../../data/genchem/aminoAcidMnemonics.json'
import { GEOMETRIES } from '../../lib/chem/vsepr.js'
import { GROUPS } from '../GroupPrimer.jsx'
import AminoAcidFull from '../visuals/AminoAcidFull.jsx'
import GroupDiagram from '../visuals/GroupDiagram.jsx'
import VseprDiagram from '../visuals/VseprDiagram.jsx'
import NUCLEOBASES from '../../data/genchem/nucleobases.json'
import NucleobaseStructure from '../visuals/NucleobaseStructure.jsx'
import TABLE from '../../data/genchem/periodicTable.json'
import ElementStrip from '../visuals/ElementStrip.jsx'
import { configFor, shorthandFor } from '../../lib/chem/electronConfig.js'
import PKA_TABLE from '../../data/genchem/pkaTable.json'
import { NAMING_LADDERS } from './namingLadders.jsx'

/**
 * Every set that can be learned one item at a time.
 *
 * The ladder was built for the twenty amino acids and works because the set
 * is fixed, finite, and only useful once you can tell the members apart.
 * That describes several other tables in this app, so the drill is defined
 * once and the sets are data.
 *
 * A ladder needs four things: an ordered list (the order IS the teaching
 * decision), a unique answer per item, something to draw, and the facts to
 * show while learning it. Anything whose members cannot be told apart by
 * name is not a ladder — the pKa table, for instance, wants value recall
 * rather than identification, which is a different drill.
 */

const CLASS_COLOR = { acidic: '#f87171', basic: '#38bdf8', polar: '#4ade80', nonpolar: '#facc15' }

/** Amino acids in the order the three sorting phrases spell out. */
export function ladderOrder() {
  const byOne = new Map(aminoAcids.map((a) => [a.one, a]))
  return MNEMONICS.flatMap((m) => [...m.letters]).map((l) => byOne.get(l))
}

const aminoItems = ladderOrder().map((a) => ({
  key: a.name,
  name: a.name,
  sub: `${a.three} · ${a.one}`,
  aliases: [a.three, a.one],
  accent: CLASS_COLOR[a.class],
  data: a,
}))

const groupItems = GROUPS.map((g) => ({
  key: g.kind,
  name: g.name,
  sub: g.formula,
  aliases: [g.formula],
  data: g,
}))

// Two geometries share the name "bent" and two share "linear", so the answer
// carries the electron-group count. That is not padding: the difference
// between electron geometry and molecular shape is the thing these are
// actually for, and it lives exactly in that number.
const vseprItems = GEOMETRIES.map((g) => ({
  key: `${g.bonding}-${g.lone}`,
  name: `${g.shape} · ${g.bonding + g.lone} groups`,
  sub: `${g.bonding} bonded, ${g.lone} lone · ${g.hybridization}`,
  aliases: [g.shape],
  data: g,
}))

export const LADDERS = [
  {
    id: 'aminoacids',
    topic: 'aminoacids',
    label: 'The 20 amino acids',
    unit: 'residue',
    blurb: 'Structures, names and their one- and three-letter codes.',
    typePlaceholder: 'e.g. Tryptophan, Trp or W',
    items: aminoItems,
    notation: true,
    Visual: ({ item, hideAnswer, notation }) => (
      <AminoAcidFull aa={item.data} hideAnswer={hideAnswer} notation={notation} />
    ),
    Facts: ({ item }) => {
      const a = item.data
      const phrase = MNEMONICS.find((m) => m.letters.includes(a.one))
      return (
        <>
          <div className="aa-facts">
            <span style={{ color: CLASS_COLOR[a.class] }}>{a.class}</span>
            <span className="muted">{a.pKaR != null ? `pKa ${a.pKaR}` : 'no ionizable side chain'}</span>
            <span className="muted">charge {a.charge7 > 0 ? '+1' : a.charge7 < 0 ? '−1' : '0'}</span>
          </div>
          <div className="fc-group">
            <strong>Side chain: {a.groupName}</strong>
            {a.groupWhat}
          </div>
          <p className="muted aa-note">{a.note}</p>
          {phrase && (
            <p className="muted ladder-phrase">
              Letter {phrase.letters.indexOf(a.one) + 1} of “{phrase.phrase}” — the {phrase.cls} group.
            </p>
          )}
        </>
      )
    },
  },
  {
    id: 'groups',
    topic: 'functional',
    label: 'Functional groups',
    unit: 'group',
    blurb: 'The arrangements every reaction is named after.',
    typePlaceholder: 'e.g. Hydroxyl or –OH',
    items: groupItems,
    Visual: ({ item, hideAnswer }) => (
      <figure className="aaf">
        <GroupDiagram kind={item.data.kind} width={210} height={128} />
        <figcaption className="aaf-caption">
          {!hideAnswer && <span className="aaf-name">{item.data.name}</span>}
          <span className="muted aaf-formula">{item.data.formula}</span>
        </figcaption>
      </figure>
    ),
    Facts: ({ item }) => (
      <>
        <div className="fc-group">
          <strong>Why it matters</strong>
          {item.data.why}
        </div>
        <p className="muted aa-note">Found in: {item.data.found}</p>
      </>
    ),
  },
  {
    id: 'vsepr',
    topic: 'vsepr',
    label: 'VSEPR shapes',
    unit: 'shape',
    blurb: 'Every electron-group count and the shape it forces.',
    // No typed mode. Two of these are called "bent" and two "linear", so a
    // typed answer either accepts the bare shape - which passes for both and
    // stops testing the electron-count distinction this set exists to teach -
    // or demands "bent · 3 groups" character for character, which is a
    // transcription exercise rather than recall.
    typeable: false,
    items: vseprItems,
    Visual: ({ item, hideAnswer }) => (
      <figure className="aaf">
        <VseprDiagram geometry={item.data} height={168} />
        <figcaption className="aaf-caption">
          {!hideAnswer && <span className="aaf-name">{item.data.shape}</span>}
          <span className="muted aaf-formula">
            {item.data.bonding} bonded + {item.data.lone} lone
          </span>
        </figcaption>
      </figure>
    ),
    Facts: ({ item }) => {
      const g = item.data
      return (
        <>
          <div className="aa-facts">
            <span className="muted">electron geometry: {g.electronGeometry}</span>
            <span className="muted">angle {g.angle}</span>
            <span className="muted">{g.hybridization}</span>
          </div>
          <div className="fc-group">
            <strong>Shape vs electron geometry</strong>
            {g.lone === 0
              ? `With no lone pairs the molecular shape IS the electron geometry — ${g.shape}.`
              : `${g.bonding + g.lone} electron groups give ${g.electronGeometry} electron geometry, but ${g.lone} of them ${
                  g.lone === 1 ? 'is a lone pair' : 'are lone pairs'
                } you cannot see, so the SHAPE is ${g.shape}.`}
          </div>
        </>
      )
    },
  },
]

export const ladderById = (id) => LADDERS.find((l) => l.id === id)
export const ladderForTopic = (topicId) => LADDERS.find((l) => l.topic === topicId)

// --- nucleobases ------------------------------------------------------
// Purines first, so the two-ring/one-ring split is established before the
// three pyrimidines arrive; thymine and uracil last and adjacent, because
// the only difference between them is a methyl and that is easiest to see
// when they are side by side.
const BASE_ORDER = ['Adenine', 'Guanine', 'Cytosine', 'Thymine', 'Uracil']
const CLASS_TINT = { purine: '#a78bfa', pyrimidine: '#38bdf8' }

const baseItems = BASE_ORDER.map((n) => {
  const b = NUCLEOBASES.find((x) => x.name === n)
  return {
    key: b.name,
    name: b.name,
    sub: `${b.code} · ${b.class}`,
    aliases: [b.code],
    accent: CLASS_TINT[b.class],
    data: b,
  }
})

LADDERS.push({
  id: 'nucleobases',
  topic: 'biomolecules',
  label: 'The five nucleobases',
  unit: 'base',
  blurb: 'Purine or pyrimidine, what pairs with what, and DNA versus RNA.',
  typePlaceholder: 'e.g. Adenine or A',
  items: baseItems,
  Visual: ({ item, hideAnswer }) => (
    <figure className="aaf">
      <NucleobaseStructure name={item.data.name} />
      {!hideAnswer && (
        <figcaption className="aaf-caption">
          <span className="aaf-name">{item.data.name}</span>
          <span className="muted aaf-formula">{item.data.formula}</span>
        </figcaption>
      )}
    </figure>
  ),
  Facts: ({ item }) => {
    const b = item.data
    return (
      <>
        <div className="aa-facts">
          <span style={{ color: CLASS_TINT[b.class] }}>{b.class}</span>
          <span className="muted">pairs with {b.pairsWith}</span>
          <span className="muted">{b.bonds} H-bonds</span>
        </div>
        <div className="fc-group">
          <strong>Side group: {b.groupName}</strong>
          {b.groupWhat}
        </div>
        <p className="muted aa-note">{b.note}</p>
        <p className="muted ladder-phrase">
          {b.class === 'purine'
            ? 'PURe As Gold — the purines are Adenine and Guanine, and they are the two-ring ones.'
            : 'CUT the PYe — Cytosine, Uracil and Thymine are the pyrimidines, and they have one ring.'}{' '}
          Found in {b.foundIn}.
        </p>
      </>
    )
  },
})

// --- electron configuration -------------------------------------------
// Every configuration is derived from the (n + ℓ) rule, so the ladder, the
// aufbau chart and the question bank cannot disagree with each other.
// Elements come in atomic-number order, which is also the order the rule
// fills them in — learning them any other way fights the pattern.
const configItems = TABLE.map((e) => ({
  key: e.symbol,
  name: configFor(e.atomicNumber),
  sub: `${e.name} (${e.symbol})`,
  aliases: [shorthandFor(e.atomicNumber)],
  data: e,
}))

LADDERS.push({
  id: 'econfig',
  topic: 'periodic',
  label: 'Electron configurations',
  unit: 'element',
  blurb: 'Fill order for the elements organic chemistry actually uses.',
  items: configItems,
  // Typing "1s² 2s² 2p⁶ 3s² 3p⁵" is a transcription exercise, superscripts
  // and all. This one stays multiple choice.
  typeable: false,
  Visual: ({ item, hideAnswer }) => (
    <figure className="aaf">
      <ElementStrip symbols={[item.data.symbol]} showConfigHint />
      {!hideAnswer && (
        <figcaption className="aaf-caption">
          <span className="aaf-name">{configFor(item.data.atomicNumber)}</span>
          <span className="muted aaf-formula">{shorthandFor(item.data.atomicNumber)}</span>
        </figcaption>
      )}
    </figure>
  ),
  Facts: ({ item }) => {
    const e = item.data
    return (
      <>
        <div className="aa-facts">
          <span className="muted">period {e.period}</span>
          <span className="muted">group {e.group}</span>
          <span className="muted">{e.valenceElectrons} valence e⁻</span>
        </div>
        <div className="fc-group">
          <strong>Shorthand: {shorthandFor(e.atomicNumber)}</strong>
          The noble gas in brackets stands for every electron below the outer shell. Only what follows it does any
          chemistry.
        </div>
        <p className="muted aa-note">
          {e.valenceElectrons} valence electrons means {e.typicalBonds} bond{e.typicalBonds === 1 ? '' : 's'} in a
          neutral molecule — the count that decides what this atom can attach to.
        </p>
      </>
    )
  },
})

// --- hybridization ----------------------------------------------------
// Same pictures as the VSEPR ladder, a different question: that one asks
// what SHAPE the electron groups force, this one asks what the orbitals had
// to become to point that way. Learning them apart is the point — the shape
// is what you see, the hybridization is what you write.
const HYBRIDS = [
  { key: 'sp', name: 'sp', groups: 2, angle: '180°', example: 'the carbons of an alkyne, or CO₂', mix: 'one s and one p orbital' },
  { key: 'sp2', name: 'sp²', groups: 3, angle: '120°', example: 'the carbons of an alkene, or a carbonyl carbon', mix: 'one s and two p orbitals' },
  { key: 'sp3', name: 'sp³', groups: 4, angle: '109.5°', example: 'any saturated carbon, and the oxygen of water', mix: 'one s and three p orbitals' },
  { key: 'sp3d', name: 'sp³d', groups: 5, angle: '120° and 90°', example: 'PCl₅ — only for atoms below period 2', mix: 'one s, three p and one d orbital' },
  { key: 'sp3d2', name: 'sp³d²', groups: 6, angle: '90°', example: 'SF₆', mix: 'one s, three p and two d orbitals' },
]

const hybridItems = HYBRIDS.map((h) => ({
  key: h.key,
  name: h.name,
  sub: `${h.groups} electron groups`,
  aliases: [h.name.replace('²', '2').replace('³', '3')],
  data: { ...h, geometry: GEOMETRIES.find((g) => g.bonding === h.groups && g.lone === 0) },
}))

LADDERS.push({
  id: 'hybridization',
  topic: 'vsepr',
  label: 'Hybridization',
  unit: 'state',
  blurb: 'Count the electron groups, read off the orbitals.',
  items: hybridItems,
  typePlaceholder: 'e.g. sp2 or sp³',
  Visual: ({ item, hideAnswer }) => (
    <figure className="aaf">
      <VseprDiagram geometry={item.data.geometry} height={168} centerLabel="C" />
      {!hideAnswer && (
        <figcaption className="aaf-caption">
          <span className="aaf-name">{item.data.name}</span>
          <span className="muted aaf-formula">{item.data.groups} groups · {item.data.angle}</span>
        </figcaption>
      )}
    </figure>
  ),
  Facts: ({ item }) => {
    const h = item.data
    return (
      <>
        <div className="aa-facts">
          <span className="muted">{h.groups} electron groups</span>
          <span className="muted">{h.angle}</span>
        </div>
        <div className="fc-group">
          <strong>What is mixed</strong>
          {h.mix}. The number of hybrid orbitals always equals the number of electron groups, which is why counting
          groups is the whole method.
        </div>
        <p className="muted aa-note">Seen in: {h.example}</p>
        <p className="muted ladder-phrase">
          Count groups, not bonds: a double bond is ONE group, and a lone pair counts as one too.
        </p>
      </>
    )
  },
})

// --- pKa anchors -------------------------------------------------------
// The one ladder where the ANSWER is a number rather than a name: you are
// shown an acid and asked roughly where it sits. That is the skill — nobody
// needs 4.76, everyone needs "carboxylic acids are about 4, so a carboxylate
// is the conjugate base you will meet at every biological pH".
//
// Ordered strongest to weakest, which is how the ladder in the Notes is
// drawn and how the scale is actually reasoned about: each anchor tells you
// what sits above and below it.
const PKA_ANCHOR_ORDER = [
  'HCl',
  'H₃O⁺',
  'RCOOH',
  'NH₄⁺',
  'PhOH',
  'H₂O',
  // Ethanol deliberately absent. At 16 against water's 15.7 the two would
  // appear as separate options in one question, and choosing between them is
  // a coin flip — while the thing actually being taught is that alcohols and
  // water sit in the SAME bracket. Water carries that anchor for both.
  'terminal alkyne (RC≡CH)',
  'NH₃',
  'alkane (CH₃CH₃)',
]

// Rounded to what is actually memorised. "pKa ≈ 4.76" claims a precision the
// word "approximately" denies, and nobody recalls the second decimal.
const fmtPka = (v) => `pKa ≈ ${Math.round(v * 10) / 10}`

const pkaItems = PKA_ANCHOR_ORDER.map((acid) => {
  const row = PKA_TABLE.find((r) => r.acid === acid)
  return {
    key: acid,
    name: fmtPka(row.pKa),
    sub: `${row.acid} · ${row.class}`,
    data: row,
  }
})

LADDERS.push({
  id: 'pka',
  topic: 'acidbase',
  label: 'pKa anchors',
  unit: 'anchor',
  blurb: 'Ten values that bracket every acid you will be asked to compare.',
  items: pkaItems,
  // The answer is a number, and typing "15.7" or "4.76" is transcription
  // rather than recall. What matters is which bracket it falls in, which is
  // exactly what choosing between four values tests.
  typeable: false,
  Visual: ({ item, hideAnswer }) => (
    <figure className="aaf">
      <div className="pka-card">
        <span className="pka-acid">{item.data.acid}</span>
        <span className="muted pka-class">{item.data.class}</span>
        <span className="muted pka-conj">
          conjugate base: <strong>{item.data.base}</strong>
          {item.data.baseName ? ` (${item.data.baseName})` : ''}
        </span>
      </div>
      {!hideAnswer && (
        <figcaption className="aaf-caption">
          <span className="aaf-name">{fmtPka(item.data.pKa)}</span>
        </figcaption>
      )}
    </figure>
  ),
  Facts: ({ item }) => {
    const r = item.data
    const strong = r.pKa < 0
    return (
      <>
        <div className="aa-facts">
          <span className="muted">pKa {r.pKa}</span>
          <span className="muted">{r.class}</span>
          <span className="muted">{strong ? 'stronger than H₃O⁺' : 'weaker than H₃O⁺'}</span>
        </div>
        <div className="fc-group">
          <strong>What this anchor is for</strong>
          Lower pKa means the stronger acid and the more stable conjugate base. Anything you are asked to compare sits
          between two of these ten, so placing it between the neighbours you know is usually the whole answer.
        </div>
        <p className="muted aa-note">
          Losing its proton gives {r.base}
          {r.baseName ? `, the ${r.baseName}` : ''}. {strong
            ? 'Below zero the acid is fully dissociated in water — "strong" means exactly that.'
            : 'Above about 16 nothing in water will deprotonate it; you need a base made for the job.'}
          {r.acid === 'H₂O' && ' Alcohols sit at essentially the same value (~16), so this one anchor covers both.'}
        </p>
        <p className="muted ladder-phrase">
          A base can only deprotonate an acid whose pKa is LOWER than that of its own conjugate acid. That one sentence
          is what the whole scale is used for.
        </p>
      </>
    )
  },
})

// The two naming tables from the functional-group reading. Defined in their
// own module because they carry twelve and twenty structures between them,
// which would double the length of this file for no gain.
LADDERS.push(...NAMING_LADDERS)
