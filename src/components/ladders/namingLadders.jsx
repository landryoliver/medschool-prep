import SkeletalDiagram from '../visuals/SkeletalDiagram.jsx'

/**
 * The two naming tables from the functional-group reading, as ladders.
 *
 * Both are exactly what the ladder is for: fixed, finite, useless until you
 * can tell the members apart, and normally met all at once in a table nobody
 * reads twice.
 *
 * Fragments are drawn with an R at the attachment point rather than as whole
 * molecules, because that is the difference being taught — propyl is not
 * propane, and an isopropyl drawn as propane would be a lie in the one place
 * the learner is looking.
 */

const mol = (m) => ({ doubleBondAt: [], tripleBondAt: [], substituents: [], shape: 'chain', ...m })

// ---------------------------------------------------------------- suffixes

const SUFFIXES = [
  {
    suffix: '-ane',
    group: 'alkane',
    example: 'butane',
    why: 'No double or triple bonds anywhere — "saturated". The default state a molecule is in before any functional group is added.',
    m: { size: 4 },
  },
  {
    suffix: '-ene',
    group: 'alkene',
    example: 'but-1-ene',
    why: 'A C=C. The number in the name says which carbon the double bond starts at, counted from the nearer end.',
    m: { size: 4, doubleBondAt: [0] },
  },
  {
    suffix: '-yne',
    group: 'alkyne',
    example: 'but-1-yne',
    why: 'A C≡C. Those two carbons and their neighbours are forced into a straight line, which is why alkynes never appear in a ring smaller than eight carbons.',
    m: { size: 4, tripleBondAt: [0] },
  },
  {
    suffix: '-ol',
    group: 'alcohol',
    example: 'butan-1-ol',
    why: 'An –OH on a carbon that is NOT a carbonyl. Take the alkane name, drop the e, add ol.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'OH' }] },
  },
  {
    suffix: '…yl …yl ether',
    group: 'ether',
    example: 'methyl propyl ether',
    aliases: ['ether', 'yl ether', 'yl yl ether'],
    why: 'An oxygen with a carbon on each side and no carbonyl. Named by listing both attached groups, then the word ether.',
    m: { size: 3, substituents: [{ vertexIndex: 0, label: 'OCH3' }] },
  },
  {
    suffix: '-amine',
    group: 'amine',
    example: 'butan-1-amine',
    why: 'A nitrogen on carbon with no carbonyl attached. Primary, secondary or tertiary counts the carbons on the nitrogen ITSELF — unlike alcohols.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'NH2' }] },
  },
  {
    suffix: 'halo- prefix',
    group: 'haloalkane',
    example: '1-chlorobutane',
    aliases: ['halo', 'chloro', 'chloro-ane', 'prefix'],
    why: 'The only group here named with a PREFIX rather than a suffix: fluoro, chloro, bromo, iodo, in front of the plain alkane name.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'Cl' }] },
  },
  {
    suffix: '-one',
    group: 'ketone',
    example: 'butan-2-one',
    why: 'A C=O with a carbon on BOTH sides. It can never sit at carbon 1, because that carbon would only have one neighbour.',
    m: { size: 4, substituents: [{ vertexIndex: 1, label: 'O', bond: 2 }] },
  },
  {
    suffix: '-al',
    group: 'aldehyde',
    example: 'butanal',
    why: 'A C=O at the END of the chain, so the carbonyl carbon keeps one hydrogen. Always carbon 1, so it never needs a number.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }] },
  },
  {
    suffix: '-oic acid',
    group: 'carboxylic acid',
    example: 'butanoic acid',
    aliases: ['oic acid', 'oic'],
    why: 'A C=O and an –OH on the same carbon. Outranks every other group here for the suffix slot.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'OH' }] },
  },
  {
    suffix: '…yl …oate',
    group: 'ester',
    example: 'methyl butanoate',
    aliases: ['oate', 'yl oate', '-oate'],
    why: 'Like a carboxylic acid but the –OH hydrogen is replaced by a carbon. Two-word name: the group on the oxygen first, then the carbonyl chain as -oate.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'OCH3' }] },
  },
  {
    suffix: '-amide',
    group: 'amide',
    example: 'butanamide',
    why: 'A C=O bonded straight to a nitrogen. Groups on that nitrogen get an N- prefix rather than a number. This is the peptide bond.',
    m: { size: 4, substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'NH2' }] },
  },
]

const suffixItems = SUFFIXES.map((s) => ({
  key: s.group,
  name: s.suffix,
  sub: s.group,
  aliases: [s.group, ...(s.aliases ?? [])],
  data: s,
}))

// ------------------------------------------------------------ alkyl groups

const CHAIN = ['methyl', 'ethyl', 'propyl', 'butyl', 'pentyl', 'hexyl', 'heptyl', 'octyl', 'nonyl', 'decyl']
const CHAIN_ABBR = { methyl: 'Me', ethyl: 'Et', propyl: 'Pr', butyl: 'Bu' }

const straight = CHAIN.map((name, i) => ({
  name,
  abbr: CHAIN_ABBR[name] ?? null,
  sub: `${i + 1} carbon${i ? 's' : ''}`,
  why: `${i + 1} carbons in a row, attached by the end one. The same prefix names a ${i + 1}-carbon main chain — meth, eth, prop, but, pent, hex, hept, oct, non, dec is one list used everywhere.`,
  m: { size: i + 1, substituents: [{ vertexIndex: 0, label: 'R' }] },
}))

const named = [
  {
    name: 'isopropyl',
    abbr: 'iPr',
    sub: 'C₃, attached at the middle',
    why: 'Three carbons attached through the MIDDLE one rather than the end. Same formula as propyl, different attachment — the two are not interchangeable.',
    m: { size: 3, substituents: [{ vertexIndex: 1, label: 'R' }] },
  },
  {
    name: 'isobutyl',
    abbr: 'iBu',
    sub: 'C₄, branch one carbon in',
    why: 'Attached through a CH₂, which then carries a CH branching to two methyls. Four carbons, attached at the end, with the branch one position along.',
    m: { size: 3, substituents: [{ vertexIndex: 1, label: 'CH3' }, { vertexIndex: 0, label: 'R' }] },
  },
  {
    name: 'sec-butyl',
    abbr: 'sBu',
    sub: 'C₄, attached at C2',
    why: 'Four carbons attached through the SECOND one. "sec" means the attachment carbon carries two other carbons.',
    m: { size: 4, substituents: [{ vertexIndex: 1, label: 'R' }] },
  },
  {
    name: 'tert-butyl',
    abbr: 'tBu',
    sub: 'C₄, attached at the branch point',
    why: 'A central carbon carrying three methyls. "tert" means the attachment carbon carries three other carbons. Bulky enough that its size alone decides the outcome of many reactions.',
    m: { size: 3, substituents: [{ vertexIndex: 1, label: 'CH3' }, { vertexIndex: 1, label: 'R' }] },
  },
  {
    name: 'vinyl',
    abbr: null,
    sub: 'attached ON a C=C',
    why: 'The attachment point is one of the double-bonded carbons itself. That carbon is sp², which makes vinyl behave nothing like an ethyl group.',
    m: { size: 2, doubleBondAt: [0], substituents: [{ vertexIndex: 0, label: 'R' }] },
  },
  {
    name: 'allyl',
    abbr: null,
    sub: 'attached NEXT TO a C=C',
    why: 'The attachment carbon is adjacent to the double bond, not part of it. That neighbouring position is unusually reactive, because a charge or radical there is delocalized into the C=C.',
    m: { size: 3, doubleBondAt: [1], substituents: [{ vertexIndex: 0, label: 'R' }] },
  },
  {
    name: 'phenyl',
    abbr: 'Ph',
    sub: 'C₆H₅–, ring attached directly',
    why: 'A benzene ring bonded straight on. Not benzyl, and not benzoyl.',
    m: { shape: 'ring', size: 6, doubleBondAt: [0, 2, 4], substituents: [{ vertexIndex: 0, label: 'R' }] },
  },
  {
    name: 'benzyl',
    abbr: 'Bn',
    sub: 'C₆H₅CH₂–, ring plus a CH₂',
    why: 'A ring plus one carbon, attached through that carbon. The benzylic position is stabilized by the ring, so cations, radicals and anions there are unusually happy.',
    m: { shape: 'ring', size: 6, doubleBondAt: [0, 2, 4], substituents: [{ vertexIndex: 0, label: 'CH2R' }] },
  },
  {
    name: 'acetyl',
    abbr: 'Ac',
    sub: 'CH₃CO–',
    why: 'A methyl on a carbonyl, attached through the carbonyl carbon. Acetyl is this specific two-carbon group; "acyl" is the general class of any R–C=O.',
    m: { size: 2, substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'R' }] },
  },
  {
    name: 'benzoyl',
    abbr: 'Bz',
    sub: 'C₆H₅CO–, ring on a carbonyl',
    why: 'A ring attached to a carbonyl. Benzoyl (Bz) and benzyl (Bn) are different groups with confusingly similar names and abbreviations — benzoyl has the C=O.',
    m: { shape: 'ring', size: 6, doubleBondAt: [0, 2, 4], substituents: [{ vertexIndex: 0, label: 'COR' }] },
  },
]

const alkylItems = [...straight, ...named].map((g) => ({
  key: g.name,
  name: g.name,
  sub: g.abbr ? `${g.abbr} · ${g.sub}` : g.sub,
  aliases: g.abbr ? [g.abbr, g.name.replace('-', '')] : [g.name.replace('-', '')],
  data: g,
}))

// ------------------------------------------------------------------ export

export const NAMING_LADDERS = [
  {
    id: 'suffixes',
    topic: 'nomenclature',
    label: 'Naming suffixes',
    unit: 'suffix',
    blurb: 'Read a structure, know which ending its name has to take.',
    typePlaceholder: 'e.g. -one, -al or -oic acid',
    items: suffixItems,
    Visual: ({ item, hideAnswer }) => (
      <figure className="aaf">
        <SkeletalDiagram molecule={mol(item.data.m)} height={120} />
        {!hideAnswer && (
          <figcaption className="aaf-caption">
            <span className="aaf-name">{item.data.suffix}</span>
            <span className="muted aaf-formula">{item.data.group}</span>
          </figcaption>
        )}
      </figure>
    ),
    Facts: ({ item }) => (
      <>
        <div className="fc-group">
          <strong>Example: {item.data.example}</strong>
          {item.data.why}
        </div>
        <p className="muted aa-note">
          Only the highest-priority group gets the suffix; the rest become prefixes. Priority runs
          carboxylic acid → ester → amide → aldehyde → ketone → alcohol → amine.
        </p>
      </>
    ),
  },
  {
    id: 'alkyl',
    topic: 'nomenclature',
    label: 'Alkyl and common groups',
    unit: 'group',
    blurb: 'The fragments named as pieces: methyl through decyl, plus isopropyl, vinyl, phenyl and the rest.',
    typePlaceholder: 'e.g. Isopropyl or iPr',
    items: alkylItems,
    Visual: ({ item, hideAnswer }) => (
      <figure className="aaf">
        <SkeletalDiagram molecule={mol(item.data.m)} height={120} />
        {!hideAnswer && (
          <figcaption className="aaf-caption">
            <span className="aaf-name">{item.data.name}</span>
            {item.data.abbr && <span className="muted aaf-formula">{item.data.abbr}</span>}
          </figcaption>
        )}
      </figure>
    ),
    Facts: ({ item }) => (
      <>
        <div className="fc-group">
          <strong>{item.sub}</strong>
          {item.data.why}
        </div>
        <p className="muted aa-note">
          R marks where the group attaches to the rest of the molecule. That attachment point is the
          whole difference between propyl and isopropyl, and between phenyl, benzyl and benzoyl.
        </p>
      </>
    ),
  },
]

export default NAMING_LADDERS
