# The Seam (`collapse-methane-mines.html`) — build state & pre-ship gates

> **2026-08-01 — scientific-accuracy upgrades (Sam-requested).**
> (1) **Dry envelope is now structural and citable**: the decline chart's band spans the
> fastest/slowest of EPA Appendix B Table B5's nine bituminous curves (permeability ×
> size), replacing the ±35% guess (which now applies to the flooded path only, where EPA
> publishes a single coefficient). Finding stated on-chart: Kholod's global fit rides the
> SLOW edge of that family.
> (2) **The concentration model was rebuilt on new primary research** (UNECE ECE Energy
> Series No. 64, 2019 — added to `meta.sources` as `unece-amm`): purity is governed by
> SEAL QUALITY and suction management, not mine age. The invented time-decay exponent γ
> is DELETED. New model: sealed anchor ≈82% held flat (Stillingfleet: 80–85% CH₄ fifteen
> years post-closure, p.47); leaky anchor 40% − 1.5 pts/yr of OPERATING time (Lohberg
> 40%→25% over 2008–2018 under unmanaged suction, Fig. 9.3; extrapolation below 25%
> flagged editorial). A third bench dice joined flooding: SEALED / UNSURVEYED (default)
> / LEAKY, and the routing chart now draws both futures with the two cited anchors, a
> "seal gap" fill, and per-future era strips. Engine threshold corrected 30%→35%: for a
> wellhead-mounted unit the >35% CHP gas-quality requirement (No. 64 Table 4.1) binds,
> not the transport floor. Flow (time-driven) and purity (seal-driven) are kept separate
> because the source keeps them separate (Ch. 8). Negative results recorded: neither
> Kholod nor EPA states any purity figure; Kędzior's Silesian data is near-surface soil
> gas (do not conflate); INERIS/Pokryszka is bot-blocked (open lead).
> 18/18 checks pass; basis B 2,333 (≤2,400); height ≈11k px.

> **2026-07-31, third round — the 3-D digital-twin explorer (Sheet 3, "MODEL M-003").**
> A Three.js (r128, cdnjs, **lazy-loaded only on approach** — initial page weight
> unchanged) cutaway diorama on the blueprint plate: strata block in the page palette,
> shaft/galleries/sump with projected HTML labels, A-frame headframe, the AMAS
> container with interior modules, custom drag/keyboard orbit (no wheel capture).
> Five-station guided tour (mine → seal → x-ray inside → router → scenarios) and live
> scenarios driven by the SAME model functions as the instruments (dryFactor /
> floodedFactor / concentration / route): year slider, dry↔flooded (water plane rises
> over T_zero across the section face), unit on/off — ember methane particles route
> through the container and leave the active stack as ice-grey CO₂, or vent raw to the
> sky when the unit is off. Degrades: WebGL-fail → stated fallback (verified in the
> no-GPU test run); reduced-motion → still frames + station cuts; no-JS → sheets 1–2
> carry the content. 18/18 checks pass; basis B 2,271 (≤2,400); height ≈10.8k px
> (≤12k). Rendering verified headlessly via SwiftShader across stations/scenarios.

> **2026-07-31, later — redesign round on Sam's feedback.** (1) Style aligned to the
> lead: photographic rock contacts (reusing the lead's verified strata clips, lazy,
> REDUCED→poster, credited in methods), unboxed ochre charts, scroll reveals,
> instrument numbering. (2) Act III rebuilt as a two-sheet **engineering drawing set on
> Prussian-blue blueprint plates** (faint drafting grid; paper-white ink; all pairings
> pixel-probed 7.4–11.3:1): GA-001 general arrangement (ballooned parts list,
> instrument bubbles, dimensions, title block, kraft NOT-FOR-CONSTRUCTION stamp) and
> PID-002 process & instrumentation — the state chips route the live path, repaint
> valve open/closed states, highlight the governing interlock rule, and trip to
> "SEALED" on the explosive state; DETAIL B explains the regenerative cycle.
> (3) Act IV gained "The case, in three plates": the mandate & who pays (2030
> prohibition, SRK concentration), the impact priced against DAC (≈$2.3B → ≈1,186 t
> delivered vs one €6.3M unit → ≈2.7 Mt modelled at ≈€2.3/t — delivered-vs-modelled
> asymmetry stated), and the value before any credit (≈480 GWh/yr thermal at
> closure-year flow, LHV-derived; Germany's 99% utilisation). 17/17 interaction
> checks pass; basis B 2,171 (≤2,400); height ≈9,900px.

**2026-07-31.** New field-study page beneath Core Sample §1: abandoned-mine methane in the
EU. Ships unlisted (`noindex`) at its own URL; the lead links to it from the §1 ledger
entry and the H1 tag (data-driven `fieldwork` fields in `collapse-data.v2.js`).

## What shipped

- **Hero** — thesis lede, three modelled-not-measured readouts, regulatory clock
  (Reg. (EU) 2024/1787: 2026-08-05 reports → 2027-02-05 plans → 2030-01-01 venting
  restrictions, live today-tick).
- **Act I, the inventory** — seam field chart: country rows (PL ≈110 / CZ ≈90 / DE ≈55 MCM,
  derived remainder row labelled as derived), six named mines placed at their own modelled
  rates; each opens the right-slide mine dossier. Drawers: broken-inventory (34/53 unknown
  flooded status, Auguste Victoria −70% pair, conflicting EU/Romania totals) and regulation.
- **Act II, the twin** — Auguste Victoria by default, all six mines on the bench.
  Dry path hyperbolic (Kholod 2020: b=2.017, D=0.302/yr), flooded path exponential
  (EPA coefficient 0.672/yr). q₀ derived by solving through GEM's published mean, never
  asserted; load-time self-check asserts reproduction within 1%. **Validation worth
  knowing: anchored only on the dry figure, the model predicts a flooded mean of
  8.9 MCM/yr; GEM independently published 8.4 — 6% off with zero tuning.**
  Shaft cross-section (particles ∝ modelled rate, water table per flooding assumption,
  REDUCED-motion static fallback), routing chart with corrected safety bands, playhead,
  counters, economics sandbox (start-year forfeit hatch, carbon price as upside), editable
  assumptions pane (22 constants, all sourced, **zero PENDING**).
- **Act III, the unit** — containerized cutaway with four state chips; kraft-plated
  CONCEPT stamp; module bill drawer.
- **Act IV, at depth** — Fermi ladder (both GWP lenses, Mammoth nameplate marked, with its
  ≈1/6-installed caveat), six layers, revenue-before-credits, six kill tags, methods with
  auto-rendered assumptions table and per-page sources.

## Corrections the verification pass forced (do not revert)

1. **Kholod Table 1 is mis-typeset** — it puts b=2.017/Di=0.302 in the *flooded* row, but
   Eq. 4 (flooded) is exponential with no b term. EPA's abandoned-mines methodology
   (Table 3.1, "Flooding = Exp(−0.672t)") disambiguates. The parameter block carries a
   comment so nobody "fixes" it back.
2. **The 15–30% flare band died.** UNECE BPG p.20 rules use of methane-air mixtures
   unacceptable within safety factors of 2.5× LEL (2%) and 2× UEL (30%) — everything
   between 2% and 30% routes as sealed dilution → RTO, never raw use. The 30% engine
   floor is a *transport-safety* limit.
3. Density convention named: 0.67 kg/m³ (IPCC 2006 coal Tier 1, 20 °C) — matches GEM's own
   MCM↔kt pairs exactly.
4. GWP AR6 fossil 82.5/29.8 confirmed exact. Destruction efficiency default 90%
   (CDM TOOL06; CARB's 99.5% noted as the legitimate spread, editable).

## Verified (this build)

- 16/16 CDP interaction checks pass (tray open/close/esc/focus-return, flood toggle,
  playhead, forfeit hatch, assumptions edit→recompute, unit chips, GWP toggle, keyboard
  Enter on chart marks). Driver: `scratchpad/cdp-test.mjs` (session scratchpad copy).
- Pixel-sampled contrast spot audit: all text pairings ≥4.5:1 after fixes (new
  `--ember-lt:#F6A97F` for dark grounds; deep `#5A1A0C` for alert marks on ochre; dark
  plot plates on rust/carbon; kraft-plated stamps). NOTE: this was a *spot* audit of new
  pairings, not the lead's full blank-glyph modal-pixel audit.
- Word budget: **basis B = 1,698** (target ≤2,400) via the rebuilt
  `scratchpad/word-bases.mjs`. Caveat the lead's header insists on: this reconstruction
  reads the lead at 3,264 where the original session-local counter read 2,492 — absolutes
  do not travel between counter implementations; this page is comfortably inside budget
  under any of them. Height 8,379px at 1440×900 (≤12,000 budget).
- `node --check` clean on both files; lead page unaffected (fieldwork links render,
  hash-open fix, tray-sliver `[hidden]` fix applied to lead too).

## Citation gates — CLOSED 2026-07-31 (article-level verification applied)

1. **eumr2024 — verified** against the official text (EUR-Lex is behind a bot challenge;
   use the Publications Office cellar endpoint,
   `https://publications.europa.eu/resource/celex/32024R1787` with
   `Accept: application/xhtml+xml`). Corrections applied to the page:
   - inventory was due **2025-08-05** (Art. 25(1)); measurement from **2026-05-05** on
     elements >0.5 t CH₄/yr (Art. 25(2)); first reports 2026-08-05 are **estimates**
     (Art. 25(6)); mitigation plans (Art. 26(1)) cover **closed and abandoned** mines;
     2030-01-01 is an outright **prohibition on venting AND flaring** (Art. 26(2)), sole
     exception demonstrated infeasibility/safety.
   - Responsibility (Art. 25(7)): closed — "mine operators **or** Member States";
     abandoned — Member States; the split is definitional (Arts. 2(53)–(54)); under
     alternative use the permit holder carries it (Art. 26(3)).
   - Scope is a **fixed date** ("operations ceased after 3 August 1954"), not a rolling
     70-year window. The Art. 22 drainage-station / t-per-kt rules belong to ACTIVE
     mines — never attribute them to closed/abandoned ones.
   - Recital 128 added to the regulation drawer (non-flooded mines still ≈40% of
     closure-time emissions at 10 years; EU AMM expected to increase).
2. **iea-amm — verified & updated**: ≈4.5 Mt CH₄ (2025), ≈60% China — GMT 2026
   ("Understanding methane emissions" page); GMT 2025 said "nearly 5 Mt" for 2024 and was
   the FIRST edition to carry a global abandoned-mine estimate (do not cite GMT 2024).
   The old "rising as mines close" gloss is unsupported by the IEA (their estimate moved
   down between editions) — the EU-specific version now cites Recital 128 instead.

## Still open before removing `noindex`

3. Cross-browser pass (everything verified in Chromium only; check `:has()` chip
   styling and the tray in Safari/Firefox).
4. Optional: run the lead's full rendered-pixel contrast audit method over this page.
5. Editorial read-through by Sam; then remove `<meta name="robots" content="noindex">`.

Local preview: `python3 -m http.server 8199` was left running →
http://localhost:8199/collapse-methane-mines.html
