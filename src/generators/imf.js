import compounds from '../data/genchem/compounds.json'
import { rngFor, pick, pickN, shuffleWith, makeChoices } from './util.js'

/**
 * Intermolecular-force drills generated from one compound table, so the
 * boiling points quoted in a question and its explanation can never
 * disagree with each other.
 *
 * Comparisons are only generated when the pair teaches a CLEAN principle:
 * either the same force with different sizes, or different forces at
 * similar size. Mixed cases (octane out-boils methanol despite methanol's
 * hydrogen bonding) are real but need a nuanced answer, so they are
 * skipped rather than explained wrongly.
 */
const MIN_BP_GAP = 15

const FORCE_RANK = { dispersion: 1, 'dipole-dipole': 2, 'hydrogen bonding': 3 }

export function generateBoilingCompare(seed) {
  const rng = rngFor(seed * 7717 + 3)
  const [a, b] = pickN(rng, compounds, 2)
  if (Math.abs(a.bp - b.bp) < MIN_BP_GAP) return null

  const sameForce = a.force === b.force
  const sizeGap = Math.abs(a.carbons - b.carbons)
  // Clean cases only: size explains it, or force explains it — not both.
  const sizeDriven = sameForce && sizeGap >= 1
  const forceDriven = !sameForce && sizeGap <= 1
  if (!sizeDriven && !forceDriven) return null

  const higher = a.bp > b.bp ? a : b
  const lower = higher === a ? b : a

  // The cleaner case must also agree with reality, or the lesson is wrong.
  if (sizeDriven && higher.carbons < lower.carbons) return null
  if (forceDriven && FORCE_RANK[higher.force] < FORCE_RANK[lower.force]) return null

  const choices = [`${a.name} (${a.formula})`, `${b.name} (${b.formula})`]
  const explanation = sizeDriven
    ? `${higher.name} boils at ${higher.bp} °C, ${lower.name} at ${lower.bp} °C. Both rely on ${a.force}, but ${higher.name} is larger (${higher.carbons} carbons vs ${lower.carbons}), giving more surface contact.`
    : `${higher.name} boils at ${higher.bp} °C, ${lower.name} at ${lower.bp} °C. They are similar in size, so the difference is the force: ${higher.name} uses ${higher.force} while ${lower.name} has only ${lower.force}.`

  return {
    id: `imfbp-${seed}`,
    topic: 'imf',
    kind: 'mcq',
    prompt: `Which has the HIGHER boiling point: ${a.name} (${a.formula}) or ${b.name} (${b.formula})?`,
    choices,
    correctIndex: higher === a ? 0 : 1,
    explanation,
    teach: sizeDriven
      ? 'Same force, bigger molecule wins: dispersion grows with size and surface area.'
      : 'Similar size, stronger force wins: hydrogen bonding > dipole-dipole > dispersion.',
  }
}

/** Name the strongest intermolecular force present in a pure sample. */
export function generateStrongestForce(seed) {
  // One question per compound, so the bank tracks the table rather than a
  // hardcoded count that would silently start colliding ids if it grew.
  if (seed >= compounds.length) return null
  const rng = rngFor(seed * 3301 + 17)
  const c = compounds[seed]
  const choices = shuffleWith(rng, ['hydrogen bonding', 'dipole-dipole', 'London dispersion'])
  const correct = c.force === 'dispersion' ? 'London dispersion' : c.force

  const why =
    c.force === 'hydrogen bonding'
      ? `${c.name} has an H bonded directly to N or O, so its molecules hydrogen-bond to each other.`
      : c.force === 'dipole-dipole'
        ? `${c.name} is polar but has no H on N, O, or F, so it cannot donate a hydrogen bond — dipole-dipole is its strongest.`
        : `${c.name} is nonpolar, so dispersion is all it has.`

  return {
    id: `imfforce-${seed}`,
    topic: 'imf',
    kind: 'mcq',
    prompt: `What is the STRONGEST intermolecular force between molecules of ${c.name} (${c.formula})?`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: `${why} (Every molecule also has dispersion; the question asks for the strongest.)`,
    teach: 'Work down the list: H on N/O/F → hydrogen bonding. Otherwise polar → dipole-dipole. Otherwise dispersion.',
  }
}

/** Water solubility, contrasting a soluble compound with an insoluble one. */
export function generateSolubility(seed) {
  const rng = rngFor(seed * 911 + 29)
  const soluble = compounds.filter((c) => c.waterSoluble && c.family !== 'inorganic')
  const insoluble = compounds.filter((c) => !c.waterSoluble)
  const a = pick(rng, soluble)
  const b = pick(rng, insoluble)
  if (!a || !b) return null

  const order = rng() < 0.5
  const choices = order
    ? [`${a.name} (${a.formula})`, `${b.name} (${b.formula})`]
    : [`${b.name} (${b.formula})`, `${a.name} (${a.formula})`]

  return {
    id: `imfsol-${seed}`,
    topic: 'imf',
    kind: 'mcq',
    prompt: `Which is MORE soluble in water: ${choices[0]} or ${choices[1]}?`,
    choices,
    correctIndex: order ? 0 : 1,
    explanation: `${a.name} can hydrogen-bond with water${a.carbons ? ` and its carbon chain is short enough not to dominate` : ''}. ${b.name} ${b.polar ? 'is polar but cannot hydrogen-bond well enough to break into water’s network' : 'is nonpolar, so dissolving it would cost water-water hydrogen bonds and pay back only dispersion'}.`,
    teach: 'Like dissolves like. For alcohols the rule of thumb is ~4-5 carbons: beyond that the hydrocarbon tail wins and solubility drops.',
  }
}

/** Given a family, which force does it rely on — pattern recognition by group. */
export function generateFamilyForce(seed) {
  const pool = compounds.filter((x) => x.family !== 'inorganic')
  // Indexed rather than sampled: 40 random picks from 31 compounds would
  // guarantee repeats — the same question under two ids and two SRS rows.
  if (seed >= pool.length) return null
  const rng = rngFor(seed * 577 + 41)
  const c = pool[seed]
  const canDonate = c.force === 'hydrogen bonding'
  const canAccept = c.polar

  const correct = canDonate
    ? 'Both donate and accept hydrogen bonds'
    : canAccept
      ? 'Accept hydrogen bonds only — it has lone pairs but no H on N, O, or F'
      : 'Neither donate nor accept hydrogen bonds'
  const choices = shuffleWith(rng, [
    'Both donate and accept hydrogen bonds',
    'Accept hydrogen bonds only — it has lone pairs but no H on N, O, or F',
    'Neither donate nor accept hydrogen bonds',
  ])

  return {
    id: `imfhb-${seed}`,
    topic: 'imf',
    kind: 'mcq',
    prompt: `Regarding hydrogen bonding with water, ${c.name} (${c.formula}) can:`,
    choices,
    correctIndex: choices.indexOf(correct),
    explanation: canDonate
      ? `${c.name} has an H on N or O (a donor) and lone pairs (an acceptor), so it does both.`
      : canAccept
        ? `${c.name} has lone pairs that accept a hydrogen bond, but no H on N, O, or F, so it cannot donate one.`
        : `${c.name} is a hydrocarbon: no lone pairs to accept with, and no H on N, O, or F to donate.`,
    teach: 'Donor needs H on N/O/F. Acceptor needs a lone pair on N/O/F. Ketones and ethers accept but never donate — which is why they mix with water but boil low.',
  }
}
