import { rngFor, pick, shuffleWith, makeChoices } from './util.js'

/**
 * Functional-group templates applied to randomly sized backbones, so each
 * group is drilled on many different-looking molecules rather than one
 * memorizable picture.
 *
 * Each template returns a molecule plus the group it installs.
 */
const TEMPLATES = [
  {
    group: 'Alcohol',
    hint: 'an –OH bonded to a carbon',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: 1 + Math.floor(rng() * (n - 1)), label: 'OH' }] }),
  },
  {
    group: 'Alkyl halide',
    hint: 'a halogen (F, Cl, Br, I) bonded to a carbon',
    build: (rng, n) => ({
      shape: 'chain',
      size: n,
      substituents: [{ vertexIndex: Math.floor(rng() * n), label: pick(rng, ['Cl', 'Br', 'I', 'F']) }],
    }),
  },
  {
    group: 'Amine',
    hint: 'a nitrogen bonded to carbon, with no carbonyl attached',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: Math.floor(rng() * n), label: 'NH2' }] }),
  },
  {
    group: 'Thiol',
    hint: 'an –SH group',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: Math.floor(rng() * n), label: 'SH' }] }),
  },
  {
    group: 'Ether',
    hint: 'an oxygen with a carbon on each side, and no carbonyl',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: 1 + Math.floor(rng() * (n - 1)), label: 'OCH3' }] }),
  },
  {
    group: 'Ketone',
    hint: 'a C=O with carbons on BOTH sides',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: 1 + Math.floor(rng() * (n - 2)), label: 'O', bond: 2 }] }),
  },
  {
    group: 'Aldehyde',
    hint: 'a C=O at the END of a chain, so it keeps one hydrogen',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: 0, label: 'O', bond: 2 }] }),
  },
  {
    group: 'Carboxylic acid',
    hint: 'a C=O and an –OH on the SAME carbon',
    build: (rng, n) => ({
      shape: 'chain',
      size: n,
      substituents: [
        { vertexIndex: 0, label: 'O', bond: 2 },
        { vertexIndex: 0, label: 'OH' },
      ],
    }),
  },
  {
    group: 'Ester',
    hint: 'a C=O with an –O–carbon attached to the same carbon',
    build: (rng, n) => ({
      shape: 'chain',
      size: n,
      substituents: [
        { vertexIndex: 0, label: 'O', bond: 2 },
        { vertexIndex: 0, label: 'OCH3' },
      ],
    }),
  },
  {
    group: 'Amide',
    hint: 'a C=O bonded directly to a nitrogen',
    build: (rng, n) => ({
      shape: 'chain',
      size: n,
      substituents: [
        { vertexIndex: 0, label: 'O', bond: 2 },
        { vertexIndex: 0, label: 'NH2' },
      ],
    }),
  },
  {
    group: 'Nitrile',
    hint: 'a carbon triple-bonded to nitrogen',
    build: (rng, n) => ({ shape: 'chain', size: n, substituents: [{ vertexIndex: 0, label: 'N', bond: 3 }] }),
  },
  {
    group: 'Alkene',
    hint: 'a carbon-carbon double bond',
    build: (rng, n) => ({ shape: 'chain', size: n, doubleBondAt: [Math.floor(rng() * (n - 1))] }),
  },
  {
    group: 'Alkyne',
    hint: 'a carbon-carbon triple bond, drawn as a straight linear segment',
    build: (rng, n) => ({ shape: 'chain', size: n, tripleBondAt: [rng() < 0.5 ? 0 : n - 2] }),
  },
  {
    group: 'Aromatic ring',
    hint: 'a six-membered ring with alternating double bonds',
    build: () => ({ shape: 'ring', size: 6, doubleBondAt: [0, 2, 4] }),
  },
]

export const ALL_GROUPS = TEMPLATES.map((t) => t.group)

/**
 * The carboxylic acid derivatives, drilled against each other rather than
 * against unrelated groups. All six are a C=O with something on the carbonyl
 * carbon, so telling them apart is a different and harder skill than picking
 * a ketone out of a list containing "alkyne" — and it is the one that matters,
 * because their reactivity order is the backbone of carbonyl chemistry.
 *
 * Deliberately a separate generator rather than more entries in TEMPLATES:
 * generateGroupId indexes with seed % TEMPLATES.length, so appending there
 * would remap every existing seed to a different group and quietly point all
 * stored progress at questions other than the ones it was earned on.
 */
const CARBOXYLOIDS = [
  {
    group: 'Carboxylic acid',
    tell: 'an –OH on the carbonyl carbon',
    sub: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'OH' }],
  },
  {
    group: 'Ester',
    tell: 'an –O– on the carbonyl carbon carrying a carbon, not a hydrogen',
    sub: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'OCH3' }],
  },
  {
    group: 'Amide',
    tell: 'a nitrogen on the carbonyl carbon',
    sub: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'NH2' }],
  },
  {
    group: 'Thioester',
    tell: 'a sulfur on the carbonyl carbon — an ester with S in place of O',
    sub: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'SCH3' }],
  },
  {
    group: 'Acid chloride',
    tell: 'a chlorine on the carbonyl carbon',
    sub: [{ vertexIndex: 0, label: 'O', bond: 2 }, { vertexIndex: 0, label: 'Cl' }],
  },
]

const CARBOXYLOID_NAMES = CARBOXYLOIDS.map((c) => c.group)

/** Tell the carboxylic acid derivatives apart from one another. */
export function generateCarboxyloidId(seed) {
  const rng = rngFor(seed)
  const t = CARBOXYLOIDS[seed % CARBOXYLOIDS.length]
  const size = 4 + Math.floor(rng() * 4)
  const mol = { doubleBondAt: [], tripleBondAt: [], substituents: t.sub, shape: 'chain', size }
  const { choices, correctIndex } = makeChoices(rng, t.group, CARBOXYLOID_NAMES)

  return {
    id: `cbx-${seed}`,
    topic: 'functional-groups',
    kind: 'mcq',
    prompt: 'Every one of these is a C=O with something attached. Which derivative is this?',
    choices,
    correctIndex,
    explanation: `${/^[AEIOU]/.test(t.group) ? 'An' : 'A'} ${t.group.toLowerCase()} — the giveaway is ${t.tell}.`,
    teach:
      'Read the atom attached to the carbonyl carbon and nothing else: –OH acid, –OR ester, ' +
      '–SR thioester, –N amide, –Cl acid chloride. That one atom also sets reactivity, which runs ' +
      'acid chloride > anhydride > thioester > ester > amide — the better the leaving group, the ' +
      'more reactive. Thioesters sitting above esters is why acetyl-CoA works as a biological ' +
      'acetyl donor.',
    visual: { type: 'skeletal', molecule: mol },
  }
}

/** Identify the single functional group in a generated structure. */
export function generateGroupId(seed) {
  const rng = rngFor(seed)
  const template = TEMPLATES[seed % TEMPLATES.length]
  const size = 4 + Math.floor(rng() * 4)
  const mol = { doubleBondAt: [], tripleBondAt: [], substituents: [], ...template.build(rng, size) }
  const { choices, correctIndex } = makeChoices(rng, template.group, ALL_GROUPS)

  return {
    id: `fg-${seed}`,
    topic: 'functional-groups',
    kind: 'mcq',
    prompt: 'Which functional group is present in this structure?',
    choices,
    correctIndex,
    explanation: `This is ${/^[AEIOU]/.test(template.group) ? 'an' : 'a'} ${template.group.toLowerCase()} — look for ${template.hint}.`,
    teach: 'Carbonyl-containing groups differ only in what else is attached to the C=O carbon: nothing extra = aldehyde/ketone, –OH = carboxylic acid, –OR = ester, –N = amide.',
    visual: { type: 'skeletal', molecule: mol },
  }
}

/**
 * Groups that can be dropped onto a single interior carbon without
 * changing identity. A ketone must keep carbons on both sides — placing
 * one at a chain end would silently draw an aldehyde instead.
 */
const PLACEABLE = [
  { group: 'Alcohol', at: (v) => ({ vertexIndex: v, label: 'OH' }) },
  { group: 'Alkyl halide', at: (v, rng) => ({ vertexIndex: v, label: pick(rng, ['Cl', 'Br', 'I', 'F']) }) },
  { group: 'Amine', at: (v) => ({ vertexIndex: v, label: 'NH2' }) },
  { group: 'Thiol', at: (v) => ({ vertexIndex: v, label: 'SH' }) },
  { group: 'Ether', at: (v) => ({ vertexIndex: v, label: 'OCH3' }) },
  { group: 'Ketone', at: (v) => ({ vertexIndex: v, label: 'O', bond: 2 }) },
]

/** Select every functional group present when two are combined. */
export function generateMultiGroupId(seed) {
  const rng = rngFor(seed * 977 + 41)
  const first = PLACEABLE[seed % PLACEABLE.length]
  const second = pick(rng, PLACEABLE.filter((t) => t.group !== first.group))

  // Both anchors are interior carbons and never collide, so each group
  // keeps the identity its label claims.
  const size = 6 + Math.floor(rng() * 2)
  const merged = {
    shape: 'chain',
    size,
    doubleBondAt: [],
    tripleBondAt: [],
    substituents: [first.at(1, rng), second.at(size - 2, rng)],
  }

  const correctGroups = [first.group, second.group]
  const distractors = shuffleWith(rng, ALL_GROUPS.filter((g) => !correctGroups.includes(g))).slice(0, 3)
  const choices = shuffleWith(rng, [...correctGroups, ...distractors])

  return {
    id: `fgmulti-${seed}`,
    topic: 'functional-groups',
    kind: 'multi',
    prompt: 'Select ALL functional groups present in this structure.',
    choices,
    correctIndices: correctGroups.map((g) => choices.indexOf(g)),
    explanation: `This molecule contains ${correctGroups.join(' and ').toLowerCase()}.`,
    teach: 'Molecules routinely carry more than one functional group — scan the whole structure before answering.',
    visual: { type: 'skeletal', molecule: merged },
  }
}

/** Recognize a group from its written description. */
export function generateGroupFromDescription(seed) {
  const rng = rngFor(seed * 313 + 7)
  const template = TEMPLATES[seed % TEMPLATES.length]
  const { choices, correctIndex } = makeChoices(rng, template.group, ALL_GROUPS)

  return {
    id: `fgdesc-${seed % TEMPLATES.length}`,
    topic: 'functional-groups',
    kind: 'mcq',
    prompt: `Which functional group is defined by ${template.hint}?`,
    choices,
    correctIndex,
    explanation: `${template.group}: ${template.hint}.`,
  }
}
