# Collapse Earth v2 — Four-Variant Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four radically different, scientifically rigorous single-page design variants of Collapse Earth (Deep Field, Signal/Noise, Overgrowth, Core Sample) on a shared data layer, per `docs/superpowers/specs/2026-07-30-collapse-earth-redesign-design.md`.

**Architecture:** One canonical data file (`collapse-data.v2.js`) holds all tipping-point, funding, and hypothesis content so the four variants cannot drift apart on facts. Each variant is a self-contained HTML file (repo convention) that loads that data file plus fonts/D3 from CDN and lazy-loads verified public-domain video textures. No build step.

**Tech Stack:** Plain HTML/CSS/JS, D3 v7 + topojson (already used by current site), Google Fonts, IntersectionObserver scroll choreography, CSS blend modes, `<video>` texture layers with poster fallbacks.

## Global Constraints

- Static site, **no build step**; deploys as-is to Vercel (repo convention).
- Each variant file: `collapse-v2-<name>.html` at repo root (matches existing `collapse-tech-*.html` convention; root placement is the established pattern here).
- Shared data via `<script src="collapse-data.v2.js">` — variants must NOT inline-copy or fork the data. (Deliberate deviation from spec's "inline per file" wording: a shared file is the only way to guarantee identical data.)
- **Rigor rules (from spec §2, enforced in markup):** no number without source+date; thresholds always min/central/max + confidence; funding figures always carry an `announced|delivered|verified` badge; hypotheses state kill criteria before validation criteria.
- Media budget: ≤2.5 MB initial load; videos lazy-loaded, muted, `playsinline`, `loop`, with poster; total ≤15 MB per variant.
- `prefers-reduced-motion`: videos replaced by posters, scroll animation disabled.
- Accessibility: WCAG AA contrast over video via scrim layers; keyboard-navigable interactive elements; page readable with JS disabled (charts degrade to text/tables via `<noscript>` or server-rendered fallback text).
- Do not modify `collapse-tech.html` (live site) or existing a/b/c variants.
- Copy register: earnest, precise, no satire. Site name: **Collapse Earth**. One plain disclaimer: "This is a research position, not investment advice."
- Every commit message co-authored per session convention.

---

### Task 1: Shared data layer — `collapse-data.v2.js`

**Files:**

- Create: `collapse-data.v2.js`
- Read (source material): `collapse-tech.html` (existing tipping-point data object), `collapse-tech-research.md` (funding/companies), spec §2 (hypothesis format + exemplars)
- Test: `scratchpad` node script (see Step 4)

**Interfaces:**

- Produces: global `window.COLLAPSE_DATA` with shape:

```js
window.COLLAPSE_DATA = {
  meta: {
    updated: '2026-07-30',
    sources: [
      {
        id: 'armstrong2022',
        label: 'Armstrong McKay et al., Science (2022)',
        url: 'https://doi.org/10.1126/science.abn7950',
      } /* GTP Report 2023/2025, IPCC AR6, CDR.fyi, company announcements from research doc */,
    ],
  },
  warming: {
    current: 1.4,
    currentNote: '≈1.3–1.5 °C above 1850–1900; 2024 was the first single year above 1.5 °C',
    sourceIds: ['ipccar6'],
  },
  tippingSystems: [
    // one entry per system, ALL from Armstrong McKay et al. 2022 table
    {
      id: 'gris',
      name: 'Greenland Ice Sheet',
      category: 'cryosphere',
      threshold: { min: 0.8, central: 1.5, max: 3.0, confidence: 'high' },
      timescale: {
        triggerToImpact: 'millennia',
        note: 'commitment is near-term; full deglaciation ~10,000 yr',
      },
      lat: 72,
      lon: -42,
      plain: 'Self-sustaining melt once surface lowering feeds back',
      impacts: '≈7 m sea-level equivalent',
      cascades: ['amoc'],
      sourceIds: ['armstrong2022'],
    },
    // ... every system in the existing site's dataset, re-verified against the 2022 table:
    // wais 1.5 [1.0–3.0], amoc 4.0 [1.4–8.0], labsea/subpolar gyre 1.8 [1.1–3.8],
    // amazon 3.5 [2.0–6.0], permafrost-collapse 4.0 [3.0–6.0], arctic-winter-ice 6.3 [4.5–8.7],
    // eais 7.5 [5.0–10.0], coral 1.5 [1.0–2.0], permafrost-abrupt 1.5 [1.0–2.3],
    // barents 1.6 [1.5–1.7], glaciers 2.0 [1.5–3.0], sahel 2.8 [2.0–3.5],
    // boreal-south 4.0 [1.4–5.0], boreal-north 4.0 [1.5–7.2], eais-basins 3.0 [2.0–6.0]
  ],
  interventions: [
    // Act II — from collapse-tech-research.md, one per category §1–§9
    {
      id: 'methane-removal',
      name: 'Atmospheric / point-source methane removal',
      leverage: 'Methane ≈30% of warming rise since industrial era (IEA); GWP20 ≈84–87× CO₂ (IPCC)',
      maturity: 'TRL 1–3 (open-atmosphere) / pilot (point-source)',
      funding: [
        {
          amount: 8e6,
          kind: 'deployed-grants',
          holder: 'Spark Climate Solutions (nonprofit)',
          asOf: '2026-07',
          badge: 'verified',
        },
        {
          amount: 37e6,
          kind: 'venture',
          holder: 'Windfall Bio',
          asOf: '2024-04',
          badge: 'announced',
        },
      ],
      delivered: 'Ambient Carbon pilot: up to 90% methane destruction, 250-cow barn (2025)',
      gapScore: 5,
      sourceIds: ['research-doc', 'iea-methane'],
    },
    // ... ocean CDR, ERW, blue carbon/peatland, DAC, biochar, microbial/electro, ice intervention, clean firm power, cement/steel
  ],
  companies: {
    tier1: [
      /* Fervo, Exomad, Terradot, Lithos, Climeworks, 1PointFive, Heirloom, LanzaTech, Sublime, Boston Metal — name, category, oneLiner, keyFact{text, badge, asOf} */
    ],
    tier2: [/* Ebb, Captura, Mati, Windfall, Rumin8 */],
    tier3: [
      /* Ambient Carbon, Planetary, Real Ice / Arctic Reflections (flagged non-investable), MES field */
    ],
  },
  hypotheses: [
    // Act III — 8–10 entries, EXACT format from spec §2
    {
      id: 'H1',
      claim:
        'Point-source destruction of sub-1% methane streams (dairy ventilation, coal-mine VAM) can reach <$50/tCO₂e-eq abated.',
      mechanism:
        'UV-chlorine photochemistry (MEPS) and methanotroph biofilters both operate at dilute concentrations; costs are dominated by air-handling energy, which falls with contact-area engineering rather than exotic inputs.',
      whyNow:
        'Methane ≈30% of warming rise yet removal is the least-funded category in the dataset; 20-yr leverage is 84–87× CO₂.',
      killCriteria:
        'Energy cost per tonne CO₂e-eq remains >3× target after two full design iterations at ≥250-cow-barn scale; OR chlorine byproduct toxicity fails environmental review at any pilot.',
      validation:
        'One site-year at a commercial dairy or VAM shaft with third-party-verified ≥80% destruction and all-in cost <$150/tCO₂e-eq on a credible path to $50.',
      maturity: 'TRL 4–5 (point-source)',
      nearestActors: ['Ambient Carbon', 'Windfall Bio'],
      sourceIds: ['research-doc'],
    },
    // H2 ERW MRV cost compression (10×, smallholder unlock; kill: model-vs-measured divergence beyond registry tolerance in ≥2 geographies)
    // H3 tipping-point early warning as insurance/sovereign risk data (critical slowing down; kill: no skill over existing indices in backtest)
    // H4 microbial electrosynthesis first validated TEA at TRL 5–6 (kill: faradaic efficiency × product value below electricity cost floor)
    // H5 peatland water-table telemetry as credit infrastructure (continuous MRV; kill: sensor-credit premium < sensor cost at 1,000 ha)
    // H6 biochar permanence assurance at registry scale (kill: production-quality variance makes >±20% permanence bands unclosable)
    // H7 OAE governance-grade MRV (kill: plume attribution uncertainty stays >50% past two field seasons)
    // H8 enteric-methane delivery for pasture (non-feedlot) systems (kill: bolus/slow-release compliance <60% in trials)
    // H9 (framed as research milestone, NOT investable): governed open-atmosphere methane field trial with net-benefit verification
    // H10 (framed as research milestone, NOT investable): Arctic ice intervention viability — present the 2024/2025 negative evidence honestly
  ],
  media: {/* filled by Task 2 */},
};
```

- [ ] **Step 1: Extract the existing tipping-point dataset** from `collapse-tech.html` (grep for the JS data array; it drives the current globe) and diff every threshold against the Armstrong McKay 2022 values listed above. Correct any drift; add `min/max/confidence` where the current site has only central values.
- [ ] **Step 2: Write `collapse-data.v2.js`** with the full shape above — all ~16 tipping systems, all 9–10 intervention categories with funding entries and badges taken from `collapse-tech-research.md` (keep its hedges: e.g. Exomad run-rate conflict noted verbatim), tier1/2/3 companies, and all 8–10 hypotheses fully written (no stubs — H1 style and depth for every entry).
- [ ] **Step 3: Write validation script** `scratchpad/validate-data.mjs`:

```js
import { readFileSync } from 'node:fs';
const src = readFileSync('collapse-data.v2.js', 'utf8');
const window = {};
eval(src);
const d = window.COLLAPSE_DATA;
const errs = [];
for (const t of d.tippingSystems) {
  if (!(t.threshold.min <= t.threshold.central && t.threshold.central <= t.threshold.max))
    errs.push(`${t.id}: threshold order`);
  if (!t.threshold.confidence) errs.push(`${t.id}: missing confidence`);
  if (!t.sourceIds?.length) errs.push(`${t.id}: missing sources`);
}
for (const i of d.interventions)
  for (const f of i.funding ?? [])
    if (!['announced', 'delivered', 'verified', 'deployed-grants'].includes(f.badge) || !f.asOf)
      errs.push(`${i.id}: bad funding badge/asOf`);
for (const h of d.hypotheses)
  for (const k of ['claim', 'mechanism', 'whyNow', 'killCriteria', 'validation', 'maturity'])
    if (!h[k]) errs.push(`${h.id}: missing ${k}`);
if (errs.length) {
  console.error(errs.join('\n'));
  process.exit(1);
}
console.log(
  `OK: ${d.tippingSystems.length} systems, ${d.interventions.length} interventions, ${d.hypotheses.length} hypotheses`,
);
```

- [ ] **Step 4: Run it** — `node <scratchpad>/validate-data.mjs` from repo root. Expected: `OK: 16 systems, …` (fails first if fields missing; fix until green).
- [ ] **Step 5: Commit** — `git add collapse-data.v2.js && git commit -m "feat: shared v2 data layer with uncertainty, badges, hypothesis engine"`

### Task 2: Verified media manifest

**Files:**

- Modify: `collapse-data.v2.js` (fill `media` key)

**Interfaces:**

- Produces: `COLLAPSE_DATA.media = { <slug>: { mp4: url, poster: url|null, credit, license, tags:[...] } }` — only URLs that returned HTTP 200 with `content-type: video/mp4` at build time.

- [ ] **Step 1: Curate candidates** (10–16 clips) from: NASA SVS (`svs.gsfc.nasa.gov` direct .mp4 — Earth from space, ice sheets, AMOC/ocean currents visualizations, methane plumes), NASA Images, ESA/Copernicus (attribution required — record it), Pexels CC0 direct file URLs (`videos.pexels.com/video-files/...` — deep ocean, plankton/jellyfish macro, algae, fungi, moss, rock strata, ice).
- [ ] **Step 2: Verify every URL**: `curl -sI <url> | head -5` → require `200` and video content-type; record content-length (reject clips >8 MB).
- [ ] **Step 3: Write the manifest** into `collapse-data.v2.js` with tags variants can query (`abyss`, `ice`, `satellite`, `plankton`, `algae`, `strata`, `macro-plant`…). Every entry has `credit` + `license`.
- [ ] **Step 4: Re-run validation script** (extend it: every media entry must have mp4+credit+license). Expected: OK.
- [ ] **Step 5: Commit** — `git commit -am "feat: verified public-domain media manifest"`

### Tasks 3–6: The four variants (independent; run in parallel after Task 2)

Common contract for each variant task:

**Files:** Create `collapse-v2-<slug>.html` (only file). Load `collapse-data.v2.js` via relative script tag; D3 v7 + topojson from cdnjs (same URLs as `collapse-tech.html`); fonts via Google Fonts.

**Consumes:** `window.COLLAPSE_DATA` (Task 1/2 shape). Render ALL content from it — no hardcoded numbers in markup.

**Required page anatomy (all variants, expressed in each one's own visual language):**

1. **Hero** — site name, thesis sentence, current-warming readout with range note, video/generative texture treatment.
2. **Act I — The Thresholds**: interactive globe (D3, drag-rotate, warming slider 0.8–5.0 °C) where each system renders by status at slider value **using its uncertainty range** (e.g., partially-crossed rendering between min and max, not a binary flip at central); threshold band chart (min–max bars, central markers, confidence labels); per-system dossier panel (threshold, timescale trigger-vs-impact, impacts, cascades, sources).
3. **Act II — The Misallocation**: leverage-vs-funding visualization from `interventions` (funding badges rendered as visible chips with `asOf` dates); tiered company atlas from `companies`.
4. **Act III — The Hypothesis Engine**: one card per hypothesis with ALL seven fields; kill criteria visually precede validation; H9/H10 visually marked "research milestone — not investable".
5. **Methods & Sources** — full source list from `meta.sources`, the disclaimer sentence, `meta.updated` date.

**Required engineering (all variants):** lazy video via IntersectionObserver (`<video muted loop playsinline preload="none" poster=…>`, `.play()` on intersect); `prefers-reduced-motion` disables autoplay + scroll effects; scrim layers keep AA contrast over video; `<noscript>` fallback table of tipping systems; keyboard-accessible dossier (focus trap, Esc closes); no console errors.

**Per-task verification steps (each variant):**

- [ ] Serve: `npx serve .` (check `lsof` for a free port first, per house rules)
- [ ] Screenshot hero + one section per act (browser tools), confirm: readable type, working globe, visible uncertainty rendering, badges present, hypothesis cards complete
- [ ] Toggle `prefers-reduced-motion` emulation → posters shown, no autoplay
- [ ] Disable JS → page still readable, noscript table renders
- [ ] `node <scratchpad>/validate-data.mjs` still green (variant must not have edited the data file)
- [ ] Commit: `git add collapse-v2-<slug>.html && git commit -m "feat: v2 variant — <name>"`

#### Task 3: V1 Deep Field — `collapse-v2-deepfield.html`

Design tokens: bg `#04070A`, panel `#0A1216`; accents keyed to system category — cryosphere `#7FE7FF`, ocean `#2EC4B6`, biosphere `#9BE564` degrading to `#E5B769`, methane/atmosphere `#C77DFF`; alarm `#FF5A6E`. Type: Instrument Serif (display, incl. italic), Inter Tight (body), Geist Mono (data). Video: `abyss`/`ice`/`plankton` tags composited `mix-blend-mode: screen` / `color-dodge` over near-black; glow via layered `text-shadow`/`filter: blur` pseudo-elements, restrained. Globe: dark sphere, systems as bioluminescent nodes whose glow radius = uncertainty width. Hypothesis cards: "illuminated specimen labels" — thin luminous border, serif italic claim, mono metadata. Mood: solemn luminosity.

#### Task 4: V2 Signal/Noise — `collapse-v2-signal.html`

Tokens: graphite `#0E1013`/`#16191E`, grid hairlines `#2A2F36`, text `#E8EAED`, threshold ramp `#6FD3FF → #FFB454 → #FF4747`. Type: Archivo (Expanded weights for display), IBM Plex Mono (all numerals/labels). Hero: `satellite` tag video with data layers drawn over it (`mix-blend-mode: overlay`/`multiply` scan-line + reticle SVG). Uncertainty bands are the loudest element: thick luminous min–max bars, thin central ticks. Instrument chrome: corner brackets, tick rules, readout panels; slider styled as a calibrated instrument. Hypothesis cards as numbered log entries (`H-01 … REGISTERED`), kill criteria in red-boxed callouts. Mood: observatory.

#### Task 5: V3 Overgrowth — `collapse-v2-overgrowth.html`

Tokens: narrative desaturation arc — Act I near-grayscale `#101210`/`#8A8D86`, saturation returns through Act II, Act III fully verdant `#0E1F14` with `#7CE577`, spore gold `#E8C468`, iridescent gradient (mint→gold→magenta, `background: linear-gradient(...)` + `hue-rotate` animation ≤ subtle) reserved for hypothesis cards. Implement the arc with a scroll-driven CSS custom property (`--vitality: 0→1`) modulating `filter: saturate()`/accent tokens per act (IntersectionObserver; static per-section values under reduced motion). Type: Bricolage Grotesque (display — use its optical sizes), Instrument Sans (body). Video: `algae`/`macro-plant`/`fungi` tags under `hard-light`/`soft-light`. Mood: the problem is grave; the response is alive.

#### Task 6: V4 Core Sample — `collapse-v2-coresample.html`

Tokens: descent strata — page background shifts by act: bone `#EDE6DA` → ochre `#C8973F` → rust `#9C4A22` → carbon `#17130E` (text flips light past the anthropocene boundary; maintain AA at every stratum). Scroll = drill core: fixed left depth-gauge rail (mono, meters/years-BP ticks) tracking scroll position; act transitions rendered as photographic strata bands (`strata`/`ice` tag media, `mix-blend-mode: multiply`). Type: Syne (display), Source Serif 4 (text), mono for gauge. Globe rendered as an engraved/etched line-art sphere (stroke-only D3). Hypothesis cards as core-sample tags (kraft-label aesthetic on dark carbon ground). Mood: deep time, material.

### Task 7: Consolidated review + variant index

**Files:**

- Create: `collapse-v2-index.html` (small switcher page linking the four variants with one-line descriptions)
- Modify: `README.md` (add v2 variants section)

- [ ] **Step 1: Build `collapse-v2-index.html`** — minimal dark page, four links with names + one-liners, note that `/` still serves the current site.
- [ ] **Step 2: Cross-variant audit** — open all four; verify identical numbers across variants (spot-check GrIS threshold, methane leverage line, H1 card on each); run validation script one final time.
- [ ] **Step 3: Full-page screenshots of all four** for the user's review message.
- [ ] **Step 4: Update README** structure section (v2 files, data layer, index).
- [ ] **Step 5: Commit** — `git commit -am "feat: v2 variant index + README"`
- [ ] **Step 6: Present to user** — screenshots + how to view locally + which act to look at in each variant; ask which direction wins (or what to hybridize).

## Self-review notes

- Spec coverage: Acts I–III + rigor rules → Task 1 (data) + variant anatomy contract; media strategy → Task 2 + engineering contract; four variants → Tasks 3–6; verification → per-task steps + Task 7. Out-of-scope items (deploy switch, fresh figure re-verification) remain excluded. ✓
- Deviation from spec recorded: shared data file instead of inline-per-file (Global Constraints). ✓
- Type consistency: all tasks consume `window.COLLAPSE_DATA` with the Task 1 shape; media tags used by Tasks 3–6 (`abyss`, `ice`, `satellite`, `plankton`, `algae`, `macro-plant`, `fungi`, `strata`) are produced by Task 2's tag list. ✓
