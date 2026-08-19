import aminoAcids from '../../data/genchem/aminoAcids.json'
import MNEMONICS from '../../data/genchem/aminoAcidMnemonics.json'
import { GEOMETRIES } from '../../lib/chem/vsepr.js'
import { GROUPS } from '../GroupPrimer.jsx'
import AminoAcidFull from '../visuals/AminoAcidFull.jsx'
import GroupDiagram from '../visuals/GroupDiagram.jsx'
import VseprDiagram from '../visuals/VseprDiagram.jsx'
import NUCLEOBASES from '../../data/genchem/nucleobases.json'
import NucleobaseStructure from '../visuals/NucleobaseStructure.jsx'

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
