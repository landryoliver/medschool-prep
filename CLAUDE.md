# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A personal study PWA for pre-organic-chemistry and pre-biochemistry review.
Single user, installed to an iPhone home screen, offline, no backend, no
accounts. Deployed to GitHub Pages at
https://landryoliver.github.io/medschool-prep/

The user is several years out of chemistry, taking organic chemistry and
biochemistry concurrently, and sitting the MCAT afterwards. Content should
serve that: what those courses **assume on day one**, not what they teach.

## Commands

```bash
npm run dev        # local dev server
npm run validate   # correctness gate — run before every commit
npm run build      # production build
```

`npm run validate` runs in CI and blocks deploys. It renders every diagram,
checks molecule validity, catches duplicate ids and duplicate content, and
spot-checks derived chemistry.

## The rules that matter

### 1. Teach the heuristic, not just the fact

**This is the most important guidance in this file.** A question bank that
lists true facts but omits the procedure for *using* them is half-built.
Exams do not test recall of isolated facts; they test whether you can decide
quickly under time pressure. Every topic should answer "what do I actually
DO when I see this problem?"

Concretely, prefer the shortcut a working chemist uses over the textbook
derivation:

- **Bond type**: metal + nonmetal → ionic, nonmetal + nonmetal → covalent.
  This needs only a periodic table, which every exam supplies.
  Electronegativity values are printed on *no* exam, so numeric ΔEN cutoffs
  are a refinement, never the entry point.
- **Acidity**: ARIO (Atom → Resonance → Induction → Orbital), checked in
  order, stopping at the first factor that differs.
- **R/S**: if the lowest priority points toward you, assign as drawn and
  reverse — rather than rotating the molecule mentally.
- **SN1/SN2/E1/E2**: substrate → reagent → solvent/temperature, in that
  order, because substrate eliminates the most options fastest.

When adding a topic, actively research the heuristics students use. Do not
wait to be told one exists — the user should not have to supply them. Search
for it. Two rounds of this project were spent adding shortcuts (ARIO, the
metal/nonmetal rule) only after the user asked whether one existed.

Qualitative rules sometimes **beat** the quantitative ones, and should be
taught first when they do. H–F has ΔEN 1.78, above the 1.7 "ionic" cutoff,
yet is plainly covalent — two nonmetals cannot form an ionic bond. Where a
numeric rule has known failure cases, say so in the `teach` field.

### 2. Never state a fact you have not verified

A wrong answer here teaches the wrong chemistry and is worse than no
question at all. Assertions get checked against data before shipping.

An electronegativity mnemonic was added and then removed this way: it was
wrong at two steps (Cl actually exceeds N, S exceeds C). "Widely taught" is
not the same as "correct." If a study aid is inaccurate, do not ship it with
a caveat — leave it out.

Where a claim can be computed, compute it. `scripts/validate.js` exists for
exactly this, and one-off checks in `node -e` before committing are normal
practice here.

### 3. Derive answers from the same data the question is built from

Never write a structure and its answer separately — that is how a drawing
and its stated answer drift apart.

- `src/lib/chem/molecule.js` derives molecular formula, implicit hydrogens,
  degrees of unsaturation, hybridization and condensed formula from one
  molecule object.
- `src/lib/chem/vsepr.js` maps (bonding groups, lone pairs) to shape, angle,
  hybridization and the diagram's own drawing spec.
- `src/generators/energyDiagrams.js` reads step count, intermediate count,
  thermodynamics and rate-determining step off the same profile array the
  curve is drawn from.

Where an answer genuinely cannot be derived safely — branched IUPAC names
need a real longest-chain search — use a hand-verified table and generate
*from* it. Do not guess.

### 4. Only ask questions worth asking

The polarity generator once drew two arbitrary elements from the periodic
table and asked users to classify a P–K bond. Real compound; no exam has any
reason to ask about it. Validation cannot catch this, because the question
was internally consistent and correctly answered.

Before adding a generator, ask what an actual exam would put on the page.
Restrict pools to species that appear in the relevant course.

### 5. Respect the "before the course" filter

The user asked specifically for prerequisites, not course content. Newman
projections, oxidation levels and R/S mechanics are taught *in* orgo;
amino acid structures and buffer arithmetic are *assumed* by biochem. When
proposing content, say which side of that line it falls on and why.

## Adding questions

Generated questions take an integer seed and return the same question every
time. That determinism is what gives a question a stable identity, and
therefore spaced-repetition history, without storing anything.

```js
export function generateThing(seed) {
  const rng = rngFor(seed)              // deterministic PRNG
  return {
    id: `thing-${seed}`,                // globally unique and stable
    topic: 'acid-base',                 // drives per-topic accuracy
    kind: 'mcq',                        // 'mcq' | 'multi' | 'numeric' | 'lewisBuilder'
    prompt: '…',
    choices: ['…'], correctIndex: 0,
    explanation: '…',                   // shown after answering
    teach: '…',                         // the RULE, behind an opt-in hint
    visual: { type: 'skeletal', molecule },
  }
}
```

Return `null` for seeds that produce a bad question — values too close to
compare, a structure that violates valence, an ambiguous answer. `buildBank`
drops nulls and also drops duplicate content, so over-asking is harmless:
request more seeds than the pool supports and the bank caps itself.

Watch for id collisions when a generator indexes a fixed table. Use
`if (seed >= POOL.length) return null` rather than `seed % POOL.length`,
which silently produces two questions sharing one progress record.

Curated questions live in `src/data/curated/*.json`. Write the correct
answer **first**; choices are shuffled deterministically by id at load, so
authoring order does not leak.

Every topic should have reference notes in `src/data/reference.json` — the
"learn" half of learn-and-drill, and where heuristics belong in full.

## Layout

```
src/
  generators/     seeded question generators, one file per subject area
  data/
    genchem/      element, pKa, geometry and amino acid reference data
    curated/      hand-written question banks
    reference.json  per-topic study notes (the Notes tab)
    progression.json  prep stages and the orgo course roadmap
  lib/
    chem/         molecule model and VSEPR table — chemistry source of truth
    topics.js     topic registry; composes generators into banks
    srs.js        Leitner boxes + weighted session selection
    useStudySession.js  session runner (learn vs test modes)
  components/
    visuals/      inline-SVG diagram renderers
scripts/validate.js   the correctness gate
```

## Study behaviour worth knowing before changing it

- **Learn mode** gives immediate feedback, one retry, and an opt-in hint.
  Taking the hint records the answer without promoting it, since the hint
  usually states the rule outright.
- **Test mode** stays silent until an end-of-session review.
- **Speed rounds** never promote a question — a fast guess is not recall —
  but a miss still demotes it.
- **The periodic table** is available during any study session with no
  scoring penalty, because every real exam supplies one. It is deliberately
  absent from speed rounds, which are where recall gets pressure-tested.
- Session selection blends spaced-repetition due dates, unseen material, and
  a bias toward topics with low accuracy.

## Deploying

Push to `main`; GitHub Actions runs validate, builds, and deploys to Pages.
Pushing two commits in quick succession can make the older deploy job lose a
concurrency race and report failure — check whether a later run superseded it
before investigating. Verify a deploy landed by comparing the live bundle
hash against `dist/`:

```bash
curl -s https://landryoliver.github.io/medschool-prep/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
```

## Standing limitation

Claude has never seen this app render. Validation proves diagram geometry is
sound; it cannot prove anything is legible on a phone. State this plainly
rather than implying visual changes have been verified.
