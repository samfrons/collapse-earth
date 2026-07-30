# Collapse Earth v2 — Redesign Design Spec

**Date:** 2026-07-30
**Status:** Draft for user review
**Supersedes:** the "Threshold" paper-and-ink design (`collapse-tech.html` and a/b/c variants)

## 1. Goal & positioning

Rebuild Collapse Earth as an **earnest, scientifically rigorous research thesis site** — no satire wrapper. Register: Globaïa-grade seriousness delivered with the cinematic bio-luxe craft of octarinebio.com, interstellarlab.com, caladan.bio, doublerainbowbio.com.

Three jobs, in order:
1. Communicate Earth-system tipping points with **full statistical honesty** (uncertainty ranges, confidence levels, sources — always).
2. Show the **misallocation** between where climate capital flows and where the leverage is.
3. Advance **falsifiable venture-scale hypotheses** — new theses worth testing, each with explicit kill criteria. This is the site's original contribution.

Not investment advice; it is a research position. State that plainly, once, without irony.

## 2. Content architecture — one flagship page, three acts

### Act I — The Thresholds
The tipping-point atlas, rebuilt with statistical treatment as a **first-class design element**:
- Primary sources: Armstrong McKay et al., *Science* (2022); Global Tipping Points Report (2023, and 2025 update where available); IPCC AR6 for GWP/attribution figures.
- Every threshold renders as **min / central / max + confidence level** (e.g., Greenland ice sheet: central ~1.5 °C, range 0.8–3.0 °C, medium confidence). Never a bare number.
- Keep the interactive globe + warming slider concept (it works), redesigned per variant; uncertainty bands drawn into the visualization itself.
- Distinguish **"crossing is triggered" vs "impacts fully realized"** — timescales (decades vs millennia) shown per system.

### Act II — The Misallocation
Where the money goes vs. where the leverage is:
- Source: existing `collapse-tech-research.md` (tiers, figures, caveats) — carried over, with its "announced/contracted ≠ delivered/verified" discipline **enforced by the design**: every funding figure gets a badge (`announced` / `delivered` / `verified`) and a date stamp.
- Core visual: funding vs. leverage scatter/flow — e.g., DAC (well-funded, ~1,186 t delivered) vs methane removal (~30% of warming rise, nearly unfunded).
- Company atlas condensed to the Tier 1/2/3 structure from the research doc.

### Act III — The Hypothesis Engine
The new layer. Each hypothesis is a **registered prediction**, formatted as:

| Field | Meaning |
|---|---|
| Claim | One falsifiable sentence: "A venture-scale company can…" |
| Mechanism | Why it could work, physically/economically |
| Why now | Which tipping system / funding gap creates the opening |
| Kill criteria | Observations that would falsify it — stated in advance |
| Validation milestone | What result would confirm venture scale |
| Maturity | TRL, honestly stated |
| Nearest actors | Who is closest today (from research doc) |

Initial hypothesis set (~8–10), grounded in the research doc's white spaces. Exemplars to be fully drafted:
- **H1 — Dilute methane destruction:** point-source destruction of sub-1% methane (dairy ventilation, coal-mine VAM) can reach <$50/tCO₂e-eq. Kill: energy cost per tonne at pilot scale exceeds 3× target after two design iterations.
- **H2 — MRV cost compression for ERW:** ML + sparse soil sampling can cut ERW verification cost ~10×, unlocking smallholder deployment (Mati-style) as the dominant supply. Kill: model-vs-measured weathering rates diverge beyond registry tolerance across ≥2 geographies.
- **H3 — Tipping-point early warning as a data business:** critical-slowing-down indicators (AMOC, ice sheets, Amazon) can be productized into insurance/sovereign risk pricing signals. Kill: indicators show no skill advantage over existing climate indices in backtests.
- **H4 — Microbial electrosynthesis first economics:** a validated techno-economic prototype (TRL 5–6) for CO₂→carboxylates at pilot scale. Kill: faradaic efficiency × product value cannot clear electricity cost floor.
- Others to draft: peatland water-table telemetry as credit infrastructure; biochar permanence verification at scale; OAE governance-grade MRV; enteric methane delivery mechanisms for pasture systems; Arctic interventions framed honestly as *non-investable research milestones*.

### Rigor rules (design-enforced, all acts)
1. No number without a source and date.
2. Every threshold: range + confidence, not a point.
3. Every funding figure: announced/delivered/verified badge.
4. Every hypothesis: kill criteria stated before validation criteria.
5. Methods & sources section at the page foot; inline superscript citations.

## 3. Media strategy — hybrid video + generative texture

- **Video:** short (5–15 s) compressed loops, muted, `playsinline`, lazy-loaded with poster frames; sources: NASA SVS / Goddard (public domain), ESA/Copernicus (attribution), CC0 macro nature footage. Used as blend-mode layers, not decoration.
- **Generative:** WebGL/canvas or SVG-turbulence noise, grain, caustics where video isn't worth the bytes.
- **Budget:** ≤2.5 MB initial load per page; videos lazy beyond that; total ≤15 MB per variant.
- `prefers-reduced-motion`: all video paused → poster, scroll animations disabled.

## 4. The four variants

All variants: single-file HTML (repo convention), Google Fonts, D3 retained for the globe/charts, IntersectionObserver scroll choreography, dark-first.

### V1 — Deep Field (`collapse-v2-deepfield.html`)
Caladan × Octarine. Abyssal near-black (#04070A base), **bioluminescent accent system keyed to Earth systems**: glacial cyan (cryosphere), deep teal (ocean circulation), chlorophyll→amber (biosphere), violet-pink (methane). Video: deep ocean, ice, plankton macro under `screen`/`color-dodge` — light emerges from dark. Type: Instrument Serif display + Inter Tight body + Geist Mono data. Hypothesis cards as illuminated specimen labels. Mood: solemn luminosity.

### V2 — Signal / Noise (`collapse-v2-signal.html`)
Globaïa × mission control. Graphite panel (#0E1013/#16191E), satellite Earth footage hero with `multiply`/`overlay` data layers drawn onto the planet. Amber (#FFB454) → red (#FF4747) threshold ramp; uncertainty bands are the loudest element. Type: Archivo (expanded) display + IBM Plex Mono data. Reads as an instrument you're inside of.

### V3 — Overgrowth (`collapse-v2-overgrowth.html`)
Interstellar Lab × Double Rainbow. **Color as narrative arc:** Act I desaturated/degraded → color floods in through Act III. Macro algae/fungi/plant-tissue video, iridescent gradients on hypothesis cards, `hard-light` organic texture over data. Type: Bricolage Grotesque display + Instrument Sans body. Mood: the problem is grave; the response is alive.

### V4 — Core Sample (`collapse-v2-coresample.html`)
Stratigraphic wildcard. Scroll = descending a drill core through deep time: ice strata → sediment → anthropocene boundary → possible futures. Photographic mineral textures under `multiply`; palette bone (#EDE6DA) → ochre (#C8973F) → rust (#9C4A22) → carbon (#17130E), light-to-dark as you descend. Type: Syne display + Source Serif 4 text. Evolves the current paper DNA into geology.

## 5. Technical approach

- Static, no build step (repo convention preserved); each variant fully self-contained except fonts/CDN libs/video URLs.
- Shared content data as an inline JS object per file (tipping systems, funding, hypotheses) so variants stay honest to identical data.
- Progressive enhancement: page fully readable with JS disabled (globe/charts degrade to static SVG or tables).
- Accessibility: WCAG AA contrast even over video (scrim layers), keyboard-navigable dossiers, `prefers-reduced-motion` honored.
- Verification: serve locally, screenshot each variant (hero + one section per act), check reduced-motion and no-JS renders.

## 6. Out of scope (this phase)

- Choosing/deploying the winner (user picks after exploring; `/` rewrite stays on the current site until then).
- Fresh verification sweep of all funding figures (figures carried from the July 2026 research doc with its caveats; a re-verification pass happens before the chosen variant ships publicly).
- Multi-page expansion, CMS, analytics.

## 7. Risks

- **Video sourcing:** direct-linkable public-domain URLs can rot or be slow; mitigate with poster-first rendering and graceful fallback to generative texture.
- **Page weight vs. luxe:** enforced by the media budget; blend modes and shaders carry texture where video is too heavy.
- **Rigor vs. drama tension:** resolved by the rigor rules — drama comes from craft, never from inflating numbers.
