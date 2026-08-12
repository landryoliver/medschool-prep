import { rngFor, pick, shuffleWith, makeChoices } from './util.js'

/**
 * Buffers and Henderson-Hasselbalch.
 *
 * Biochemistry uses these constantly — whether a side chain is charged,
 * which buffer to pick, why blood holds pH 7.4 — and they are pure
 * arithmetic on pH versus pKa, so they generate cleanly.
 *
 * pH = pKa + log([A⁻]/[HA])
 */
const BUFFERS = [
  { name: 'acetate (acetic acid / acetate)', pKa: 4.8 },
  { name: 'the histidine side chain (imidazole)', pKa: 6.0 },
  { name: 'carbonic acid / bicarbonate', pKa: 6.4 },
  { name: 'phosphate (H₂PO₄⁻ / HPO₄²⁻)', pKa: 7.2 },
  { name: 'HEPES', pKa: 7.5 },
  { name: 'Tris', pKa: 8.1 },
  { name: 'the cysteine thiol', pKa: 8.3 },
  { name: 'ammonium / ammonia', pKa: 9.2 },
  { name: 'the lysine side chain', pKa: 10.5 },
]

/** Acidic groups lose a proton and become negative; basic groups gain one. */
const GROUPS = [
  { name: 'a carboxylic acid side chain (aspartate)', pKa: 3.9, protonated: 'neutral (–COOH)', deprotonated: 'negatively charged (–COO⁻)' },
  { name: 'a carboxylic acid side chain (glutamate)', pKa: 4.3, protonated: 'neutral (–COOH)', deprotonated: 'negatively charged (–COO⁻)' },
  { name: 'the histidine imidazole', pKa: 6.0, protonated: 'positively charged', deprotonated: 'neutral' },
  { name: 'the cysteine thiol', pKa: 8.3, protonated: 'neutral (–SH)', deprotonated: 'negatively charged (–S⁻)' },
  { name: 'the tyrosine phenol', pKa: 10.1, protonated: 'neutral (–OH)', deprotonated: 'negatively charged (–O⁻)' },
  { name: 'the lysine amine', pKa: 10.5, protonated: 'positively charged (–NH₃⁺)', deprotonated: 'neutral (–NH₂)' },
  { name: 'the arginine guanidinium', pKa: 12.5, protonated: 'positively charged', deprotonated: 'neutral' },
]

const PH_VALUES = [2, 4, 5, 7.4, 9, 11, 13]

export function generateProtonationState(seed) {
  const rng = rngFor(seed * 5171 + 13)
  const g = pick(rng, GROUPS)
  const pH = pick(rng, PH_VALUES)
  // A full unit of separation keeps the answer unambiguous.
  if (Math.abs(pH - g.pKa) < 1) return null

  const isProtonated = pH < g.pKa
  const correct = isProtonated ? `Mostly PROTONATED — ${g.protonated}` : `Mostly DEPROTONATED — ${g.deprotonated}`
  const wrong = isProtonated ? `Mostly DEPROTONATED — ${g.deprotonated}` : `Mostly PROTONATED — ${g.protonated}`
  const choices = shuffleWith(rng, [correct, wrong])

  return {
    id: `buffprot-${seed}`,
    topic: 'buffers',
    kind: 'mcq',
    prompt: `At pH ${pH}, is ${g.name} (pKa ≈ ${g.pKa}) mostly protonated or deprotonated?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `pH ${pH} is ${isProtonated ? 'BELOW' : 'ABOVE'} the pKa of ${g.pKa}, so the group ${isProtonated ? 'holds onto its proton' : 'has lost its proton'} — it is ${isProtonated ? g.protonated : g.deprotonated}.`,
    teach: 'Below the pKa, a group keeps its proton. Above the pKa, it loses it. Then ask what that does to the charge: losing a proton from a neutral acid gives −1; losing one from a positive amine gives neutral.',
  }
}

export function generateHHRatio(seed) {
  const rng = rngFor(seed * 3701 + 29)
  const b = pick(rng, BUFFERS)
  const delta = pick(rng, [-2, -1, 0, 1, 2])
  const pH = Math.round((b.pKa + delta) * 10) / 10

  const RATIOS = {
    '-2': '1 : 100 (almost all in the acid form)',
    '-1': '1 : 10',
    0: '1 : 1 — equal amounts',
    1: '10 : 1',
    2: '100 : 1 (almost all in the base form)',
  }
  const correct = RATIOS[String(delta)]
  const choices = shuffleWith(rng, Object.values(RATIOS))

  return {
    id: `buffhh-${seed}`,
    topic: 'buffers',
    kind: 'mcq',
    prompt: `A solution of ${b.name} (pKa ${b.pKa}) sits at pH ${pH}. What is the ratio of conjugate base to acid, [A⁻] : [HA]?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `Henderson-Hasselbalch: pH = pKa + log([A⁻]/[HA]). Here pH − pKa = ${delta}, so log of the ratio is ${delta} and the ratio is ${delta === 0 ? '1:1' : `10^${delta}`} — ${correct}.`,
    teach: 'Each pH unit above the pKa multiplies the base-to-acid ratio by ten. At pH = pKa the two forms are equal, which is also where buffering is strongest.',
  }
}

export function generateBestBuffer(seed) {
  const rng = rngFor(seed * 811 + 41)
  const targetPh = pick(rng, [4.8, 6.0, 7.2, 8.1, 9.2, 10.5])
  const best = BUFFERS.reduce((a, b) => (Math.abs(b.pKa - targetPh) < Math.abs(a.pKa - targetPh) ? b : a))
  // Only ask when one buffer is clearly the best choice.
  const others = BUFFERS.filter((b) => b !== best)
  const runnerUp = others.reduce((a, b) => (Math.abs(b.pKa - targetPh) < Math.abs(a.pKa - targetPh) ? b : a))
  if (Math.abs(runnerUp.pKa - targetPh) - Math.abs(best.pKa - targetPh) < 0.8) return null

  const distractors = shuffleWith(rng, others).slice(0, 3)
  const options = shuffleWith(rng, [best, ...distractors])
  const choices = options.map((b) => `${b.name}, pKa ${b.pKa}`)

  return {
    id: `buffbest-${seed}`,
    topic: 'buffers',
    kind: 'mcq',
    prompt: `You need to hold a solution at pH ${targetPh}. Which buffer is the best choice?`,
    choices,
    correctIndex: options.indexOf(best),
    explanation: `A buffer works best within about one pH unit of its pKa, and is strongest exactly at pH = pKa. ${best.name} has pKa ${best.pKa}, closest to ${targetPh}.`,
    teach: 'Pick the buffer whose pKa is nearest the pH you want. This is why phosphate (pKa 7.2) and HEPES (7.5) are the standard buffers for biological work near pH 7.4.',
  }
}

const CONCEPTS = [
  {
    q: 'A buffer resists pH change most effectively when:',
    a: 'The pH equals the pKa, where the acid and base forms are present in equal amounts',
    d: ['The pH is far above the pKa', 'The pH is far below the pKa', 'Only the acid form is present'],
    why: 'With equal amounts of both forms, the buffer can absorb added acid or added base equally well. Beyond about one pH unit from the pKa, one form runs out and buffering collapses.',
  },
  {
    q: 'What actually makes a buffer work?',
    a: 'It contains appreciable amounts of BOTH a weak acid and its conjugate base, so it can neutralize added acid or base',
    d: ['It contains a strong acid', 'It contains only a conjugate base', 'It prevents any reaction from occurring'],
    why: 'Added H⁺ is mopped up by the conjugate base; added OH⁻ is neutralized by the weak acid. A strong acid cannot buffer, because it has no meaningful conjugate acid-base pair.',
  },
  {
    q: 'Blood is held near pH 7.4 largely by the bicarbonate system. Why can it buffer effectively despite a pKa of ~6.1?',
    a: 'It is an open system — the lungs and kidneys continuously adjust CO₂ and bicarbonate levels',
    d: ['Its pKa is actually 7.4', 'Blood contains no acid', 'Bicarbonate is a strong base'],
    why: 'Normally a buffer more than one unit from the target pH would be poor, but physiological removal of CO₂ by breathing keeps the ratio adjustable, which extends its effective range.',
  },
  {
    q: 'The isoelectric point (pI) of an amino acid is:',
    a: 'The pH at which it carries no NET charge',
    d: ['The pH at which it is most soluble', 'The same as its side-chain pKa', 'Always 7.0'],
    why: 'At the pI, positive and negative charges balance exactly. Proteins are least soluble at their pI, which is the basis of isoelectric precipitation and IEF gels.',
  },
  {
    q: 'For an amino acid with no ionizable side chain, the pI is calculated as:',
    a: 'The average of the two pKa values flanking the neutral species (the α-COOH and α-NH₃⁺)',
    d: ['The sum of all pKa values', 'The side-chain pKa', 'Always 7.0'],
    why: 'Average the two pKa values on either side of the zwitterion. For glycine, roughly (2.3 + 9.6) / 2 ≈ 6.0.',
  },
  {
    q: 'Why is histidine uniquely useful in enzyme active sites?',
    a: 'Its pKa of ~6.0 is close to physiological pH, so it can donate OR accept a proton under normal conditions',
    d: ['It is the largest amino acid', 'It forms disulfide bonds', 'It is always positively charged'],
    why: 'Catalysis often needs a group that can shuttle protons both ways. Only histidine has a side chain poised near pH 7.4 to do that.',
  },
]

export function generateBufferConcept(seed) {
  if (seed >= CONCEPTS.length) return null
  const rng = rngFor(seed * 1493 + 7)
  const c = CONCEPTS[seed]
  const { choices, correctIndex } = makeChoices(rng, c.a, c.d)

  return {
    id: `buffcon-${seed}`,
    topic: 'buffers',
    kind: 'mcq',
    prompt: c.q,
    choices,
    correctIndex,
    explanation: c.why,
    teach: 'Buffering range is pKa ± 1. At pH = pKa the buffer is strongest and the two forms are equal.',
  }
}
