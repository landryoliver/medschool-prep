# Orgo Prep

A personal study PWA for pre-organic-chemistry review. Installable to an
iPhone home screen, works offline, stores everything locally — no accounts,
no backend.

Live at **https://landryoliver.github.io/medschool-prep/**

## Running it

```bash
npm install
npm run dev        # local dev server
npm run validate   # checks every question and renders every diagram
npm run build      # production build
```

`npm run validate` runs in CI before every deploy. It fails the build if a
generated question is malformed, if a diagram would render with broken
coordinates, if two questions share an id, or if a topic's answers cluster
in one position. A wrong answer teaches the wrong chemistry, so this gate
matters more here than test coverage usually would.

## How questions work

Questions are mostly **generated**, not listed. A generator takes an integer
seed and returns the same question every time, which is what lets a
question have a stable identity — and therefore spaced-repetition history —
without anything being stored.

```js
export function generateThing(seed) {
  const rng = rngFor(seed)          // deterministic PRNG
  return {
    id: `thing-${seed}`,            // must be globally unique and stable
    topic: 'acid-base',             // drives per-topic accuracy
    kind: 'mcq',                    // 'mcq' | 'multi' | 'numeric'
    prompt: '…',
    choices: ['…'], correctIndex: 0,
    explanation: '…',               // shown after answering
    teach: '…',                     // the rule, behind an opt-in hint
    visual: { type: 'skeletal', molecule },  // optional diagram
  }
}
```

Return `null` when a seed produces a bad question (values too close to
compare, a structure that violates valence). `buildBank` drops nulls.

### The correctness rule

**Derive answers from the same data the question is built from.** Never
write a structure and its answer separately — that is how a drawing and
its stated answer drift apart.

- `src/lib/chem/molecule.js` derives molecular formula, implicit hydrogens,
  degrees of unsaturation, and hybridization from one molecule object.
- `src/lib/chem/vsepr.js` maps (bonding groups, lone pairs) to shape, angle,
  hybridization, and the diagram's own drawing spec.

Where an answer genuinely can't be derived safely — branched IUPAC names
need a real longest-chain search — the data is a hand-verified table
instead, and questions are generated *from* that table.

## Adding your own questions from coursework

Curated questions live in `src/data/curated/*.json` as plain arrays:

```json
{
  "id": "unique-slug",
  "topic": "acid-base",
  "prompt": "…",
  "choices": ["correct answer first", "…"],
  "correctIndex": 0,
  "explanation": "why",
  "teach": "the general rule"
}
```

Write the correct answer first; choices are shuffled deterministically at
load, so authoring order doesn't leak. Add the file to a topic's `build()`
in `src/lib/topics.js`, then run `npm run validate`.

## Layout

```
src/
  generators/     seeded question generators, one file per subject area
  data/
    genchem/      element, pKa and geometry reference data
    curated/      hand-written question banks
    reference.json  per-topic study notes (the Notes tab)
  lib/
    chem/         molecule model and VSEPR table — the chemistry source of truth
    topics.js     topic registry; composes generators into banks
    srs.js        Leitner boxes + weighted session selection
    useStudySession.js  session runner (learn vs test modes)
  components/
    visuals/      inline-SVG diagram renderers
```

## Backing up progress

All progress lives in this browser's IndexedDB. Phones sometimes clear
that storage on their own — iOS has done so for installed web apps after
periods of disuse — which would erase every spaced-repetition interval.

**Progress → Save a copy** writes a small JSON file. **Restore** merges it
back, keeping whichever record was practised most recently, so restoring
an older backup cannot overwrite newer work.

Worth doing every few weeks, and before reinstalling or clearing site data.

If storage is unavailable entirely (private browsing, quota refusal), the
app still runs for studying and says so on the Progress screen rather than
failing silently.

## Study behaviour worth knowing

- **Learn mode** gives immediate feedback, one retry, and an opt-in hint.
  Taking the hint records the answer without promoting it, since the hint
  usually states the rule outright.
- **Test mode** stays silent until an end-of-session review.
- **Speed rounds** never promote a question — a fast guess isn't recall —
  but a miss still demotes it.
- Session selection blends spaced-repetition due dates, unseen material,
  and a bias toward topics with low accuracy.
