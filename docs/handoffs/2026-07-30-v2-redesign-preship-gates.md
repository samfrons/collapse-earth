# v2 redesign — pre-publication gates & deferred items

**Date:** 2026-07-30 · **Branch:** `redesign/v2-variants` (merge-ready; final whole-branch review + fix wave clean)
**Lead variant:** `collapse-v2-coresample.html` (user-chosen). Deep Field / Signal / Overgrowth are archived explorations (all `noindex`).
**Live site unchanged:** `/` still rewrites to `collapse-tech.html`; merging publishes nothing new at `/`.

## HARD GATE before pointing `/` at Core Sample

**Verify the six `verify:true` citations in `collapse-data.v2.js` `meta.sources`** (they render on-page as "still to confirm before print"):

1. `benyami2024` — Ben-Yami et al., Science Advances 2024 (AMOC record-length caveat) — confirm exact DOI
2. `carbonplan` — CarbonPlan's "four orders of magnitude" ERW claim — pin exact publication
3. `mes-trl2024` — Trends in Biotechnology 2024, MES TRL 3/4
4. `ice-negative2024` — 42-glaciologist preprint condemning polar geoengineering (Oct 2024)
5. `ice-negative2025` — Sept 2025 ice-intervention viability study
6. `doe2025` — DOE grant terminations (Sublime $87M, Brimstone $189M, Cypress/South Texas ~$50M tranches)

Fold into the same pass (from Task 1 review): the 625.6t-vs-138t OAE delivery conflict (research doc says 138 t Planetary→Shopify/Stripe Nov 2024; old site's 625.6 t is unsourced — represent in `unresolvedConflict` or resolve); and the two background numbers cited to `research-doc` that the doc doesn't contain (cement+steel "~15% of global CO₂"; ocean "~50× more carbon than the atmosphere") — both standard figures, need proper source ids.

## Before public ship (soft)

- **Cross-browser pass:** everything was verified in Chromium only. Check in Safari + Firefox: specimen-tray transform/hidden transition, `playsinline` on the click-to-play hero clip, find-in-page across closed `<details>` (Chromium auto-expands; Safari/Firefox do not), scrollbar-gutter shift on tray scroll-lock (classic scrollbars).
- **Consider self-hosting the two Pexels strata clips** (robustness, not compliance — license recorded correctly, poster-first fallback exists).
- Word-count headroom on the lead is ~zero (default-visible target ≤~2,500; measured 2,467 prose). Any copy addition to a default-visible surface breaches it — re-run the measurement after prose edits.

## Accepted trade-offs (documented, not bugs)

Hero "PLAY FOOTAGE · 1.8 MB" control sits below the fold (payload-budget choice); posters load eagerly (~663 KB, inside budget); H3's "no Act II category" label sets narrow; 12,045 px height at 1512 px wide (11,649 at 1440, target ~12,000); `<details>` open/close not animated (native behavior); noscript philosophies differ across the four variants (all honest).

## Data-layer follow-up candidates

- `meta.policyReferences[]` for policy constants (Paris 1.5/2.0) if the lead ever renders them (Signal's pattern).
- `gapScore ≥ 4` board membership could become "top N by gap" if the dataset grows.

Full process record for this branch lived in `.superpowers/sdd/2026-07-30-collapse-earth-v2-variants/` (local only, deleted after merge readiness); durable references are the spec and plan under `docs/superpowers/`.
