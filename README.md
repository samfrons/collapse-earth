# Collapse Earth

**An interactive atlas of Earth's climate tipping points, the capital allocated against them, and where the two do not line up.**

[collapse.earth](https://collapse.earth) · research and opinion, not investment advice

[![CI](https://github.com/samfrons/collapse-earth/actions/workflows/ci.yml/badge.svg)](https://github.com/samfrons/collapse-earth/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](./tsconfig.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-A48A5B.svg)](./LICENSE)

---

Sixteen Earth systems carry thresholds we can estimate but cannot schedule. Capital has
concentrated in the interventions that are easiest to count, not the ones with the most
leverage. This site reads as a core log: you scroll, and a rail on the side reports the
depth. Four strata — the thresholds, the misallocation, the hypotheses, the record.

Beneath it sits a field study, **The Seam**: 70 coal mines abandoned across the EU since
2015, still emitting an estimated 200 kt of methane a year, with a 2024 regulation now
forcing the measurement and nobody yet owning the closure.

## What makes this different from a dashboard

Most climate visualisations round the uncertainty away. This one is built so that it
cannot.

| The rule                                          | How it is enforced                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| No figure without a source and a date             | `Citations` is a **non-empty tuple** — an empty `sourceIds` is a compile error                                     |
| A threshold is a band, never a date               | `Threshold` requires `min`, `central`, `max` **and** a confidence rating                                           |
| "Announced" is never rendered as "delivered"      | `FundingBadge` is a closed union; the gloss lives beside the data, not in a page                                   |
| Money of different kinds is never summed          | The only public way to total capital is [`totalCapitalRaised`](./src/data/selectors.ts), which is covered by tests |
| A blank is not a zero                             | Undisclosed rows are counted and reported separately; they never drag a median down                                |
| Claiming an _absence_ requires the source's words | `AssertedAbsence` makes `sourceQuote` mandatory                                                                    |
| No model constant without provenance              | [`P()`](./src/pages/the-seam/params.ts) throws on an unsourced key — there are no literal numbers in model code    |
| Two copies of a published number must not drift   | The Coward constants are asserted equal to the physics module's at load, and again in CI                           |

The most dangerous line this codebase could contain is
`funding.reduce((n, f) => n + f.amount, 0)`. It compiles, it runs, and it produces a
number wrong in a way no reader can detect — because the ledger deliberately holds
capital, targets, contracts, prizes, grants and sector roll-ups side by side, plus
cumulative rows that already contain their own parts. So the arithmetic lives in one
place, named after what it means, and the naive version is untypeable at the API surface.

## The data

Everything on both pages is rendered from one typed atlas at runtime. Nothing numeric is
written into the markup — including the spelled-out counts, because a word like
"sixteen" is the one class of hardcoded figure a digit-only audit cannot see.

|                            |                                                                           |
| -------------------------- | ------------------------------------------------------------------------- |
| Tipping systems            | **16**, thresholds from Armstrong McKay et al., _Science_ (2022), Table 1 |
| Intervention categories    | **10**, with **44** individually badged and dated funding entries         |
| Falsifiable hypotheses     | **10**, each stating kill criteria _above_ its validation criteria        |
| Companies                  | **19** across three tiers, one sourced claim each                         |
| Citations                  | **34**, of which **7** are flagged `verify` and say so on the page        |
| Model constants (The Seam) | **37**, each carrying a unit, a source and a note                         |

## Architecture

```
src/
├── data/            the atlas — data only, no logic
│   ├── schema.ts        the editorial rules, written as types
│   ├── atlas.ts         1,200 lines of sourced data, `satisfies Atlas`
│   ├── selectors.ts     the funding arithmetic, once
│   ├── vocabulary.ts    plain-English glosses for the controlled vocabularies
│   └── index.ts         ids derived from the data; lookups that throw on a miss
│
├── bio/             methanotrophic packed-bed physics — pure, no DOM
│   ├── coward.ts        flammability geometry (Coward & Jones 1952) — safe to render
│   ├── kinetics.ts      Monod + cardinal temperature — uncalibrated, shape only
│   ├── profile.ts       axial profile through the bed
│   └── units.ts         ideal-gas conversions
│
├── lib/             shared machinery
│   ├── html.ts          tagged template that escapes by default
│   ├── depth-gauge.ts   scroll-as-descent, one implementation, two columns
│   ├── store.ts         a 30-line observable store
│   └── …                dom · format · media · tooltip · citations · array
│
└── pages/
    ├── core-sample/     the lead — globe, band chart, assay field, ledger, tags
    └── the-seam/        the field study — inventory, digital twin, four blueprint sheets
```

Two design decisions are worth calling out, because they are the difference between this
being a rewrite and a port:

**One depth gauge, two columns.** Both pages render scroll position as descent through a
column. Core Sample descends an ice core, where annual layers thin under load so age
climbs steeply with depth; The Seam descends a mine shaft, where the galleries are evenly
spaced because rock does not compress its record. Those differences are real and worth
showing — and they are the _only_ differences, so
[`DepthGauge`](./src/lib/depth-gauge.ts) is one class and the columns are configuration.

**Act I is a store, not a call graph.** A globe, a band chart, a dial and a dossier all
read two values: the warming the reader has dialled in, and which element they picked.
The original wrote that as each view calling every other view's repaint function. Here the
views subscribe. Nothing calls anything.

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev          # vite dev server, opens the switcher
```

| Command        | What it does                                         |
| -------------- | ---------------------------------------------------- |
| `pnpm dev`     | Dev server with HMR                                  |
| `pnpm build`   | Typecheck, then build to `dist/`                     |
| `pnpm preview` | Serve the production build locally                   |
| `pnpm test`    | Run the test suite                                   |
| `pnpm check`   | Everything CI runs: typecheck · lint · format · test |

## Tests

53 tests, in three groups. None of them are snapshots — each asserts a property the code
must have, so they stay meaningful if the implementation is rewritten.

- **[`atlas.test.ts`](./tests/atlas.test.ts)** — the editorial rules the compiler cannot
  check. Every citation resolves. Every band is ordered. Every cascade target exists.
  Capital raised equals the naive sum _minus_ the nested rows, on every intervention.
- **[`bio.test.ts`](./tests/bio.test.ts)** — the physics. The flammable window closes to
  zero width exactly at the limiting oxygen concentration. A sealed working diluted
  toward the bed crosses the envelope even though both endpoints are safe — and the
  reported edges are _inside_ it, at any sampling resolution. The bed profile converges as
  it is subdivided, so cell count is not a free parameter.
- **[`citation-gate.test.ts`](./tests/citation-gate.test.ts)** — the provenance gate.
  Every model constant resolves to a real source or a stated editorial call. The page's
  Coward constants equal the physics module's. And the twin, anchored only on one mine's
  dry figure, predicts the flooded figure it was never fitted to within 10%.

That last one is the strongest evidence on the site that the corrected decline constants
are the ones the source itself used, and it is a test rather than a sentence precisely so
that it cannot quietly stop being true.

## Rendering notes

- **No CDN at runtime.** d3, topojson and three are npm dependencies. Three.js is behind a
  dynamic `import()` and is fetched only when the 3-D plate approaches the viewport.
- **Coastlines are bundled**, not fetched — a 55 KB topojson asset.
- **Reduced motion is honoured, not approximated.** Under
  `prefers-reduced-motion` no `<video>` element is created at all, and the mine-shaft
  particles become a static density hatch, because the density is carrying information.
- **Charts are keyboard-navigable.** The globe uses a roving tabindex that always lands on
  a marker facing the reader; every band-chart row, assay marker and ladder rung is a focus
  stop that raises the same tooltip a pointer would.
- **Flags are encoded twice** — fill _and_ an outer ring, position _and_ hue — so they
  survive colour-vision deficiency and a greyscale print.

## Deployment

Deployed on [Vercel](https://vercel.com). `pnpm build` emits `dist/`; `/` serves Core
Sample and `/the-seam` serves the field study. Pushing to `main` deploys to production;
other branches get preview URLs.

## A note on the archive

The repository previously held ten standalone HTML files — four superseded drafts and
three unshipped design variants alongside the two live pages. Those are no longer tracked.
The two pages that ship are the ones in `src/pages/`, and their history is in the git log.

## Caveats, stated plainly

This is **research and opinion, not investment advice**. Thresholds are estimated ranges,
not dates. The gap assessment and the leverage bands in Act II are editorial ordinals and
are labelled as such everywhere they appear. Every emissions figure in The Seam is a model
estimate — the mines are largely uninstrumented, and that gap between modelled and
measured is not a caveat there. It is the opening.

## License

MIT — see [LICENSE](./LICENSE).
