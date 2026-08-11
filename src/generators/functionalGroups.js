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

/** Select every functional group present when two are combined. */
export function generateMultiGroupId(seed) {
  const rng = rngFor(seed * 977 + 41)
  const combinable = TEMPLATES.filter((t) => ['Alcohol', 'Alkyl halide', 'Amine', 'Thiol', 'Ether', 'Ketone', 'Alkene'].includes(t.group))
  const first = combinable[seed % combinable.length]
  const second = pick(rng, combinable.filter((t) => t.group !== first.group))

  const size = 6 + Math.floor(rng() * 2)
  const a = { doubleBondAt: [], substituents: [], ...first.build(rng, size) }
  const b = { doubleBondAt: [], substituents: [], ...second.build(rng, size) }

  // Merge the two templates onto one backbone, keeping their groups apart.
  const merged = {
    shape: 'chain',
    size,
    doubleBondAt: [...new Set([...(a.doubleBondAt ?? []), ...(b.doubleBondAt ?? [])])],
    substituents: [
      ...(a.substituents ?? []).map((s) => ({ ...s, vertexIndex: 0 + (s.bond === 2 ? 1 : 0) })),
      ...(b.substituents ?? []).map((s) => ({ ...s, vertexIndex: size - 1 })),
    ],
  }

  // A double bond into a carbonyl carbon would be invalid; drop conflicts.
  const conflicted = merged.doubleBondAt.some((bond) =>
    merged.substituents.some((s) => s.bond === 2 && (s.vertexIndex === bond || s.vertexIndex === bond + 1)),
  )
  if (conflicted) merged.doubleBondAt = []

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
