# The Seam (`collapse-methane-mines.html`) — build state & pre-ship gates

> **2026-08-01 — Sheet 4, MODEL M-004: the biological route.** Ports the flammability
> core of the Mine-Methane Biofilter process model from `~/repos/messai-ai`
> (`apps/lab/src/lib/biofilter/`, TypeScript) into a new ES5 `collapse-bio.v2.js`.
> **Answers a question Act II leaves hanging**: the page asserts everything between 2%
> and 30% CH₄ routes as "sealed dilution → RTO, never raw use", but never models the
> dilution — and the dilution is where the hazard lives. Sheet 4 draws a Coward triangle
> (Coward & Jones 1952) with the live blend path across it, plus the packed bed as a
> 14-cell axial profile. Sealed / leaky / late-life gases all trip the interlock; the bed
> greys to HELD and reports nothing. Ventilation air is the contrast case and passes
> straight through — labelled on-sheet as an ACTIVE-mine stream that has no place in this
> page's abandoned-mine inventory.
>
> **What was deliberately NOT ported** (upstream design doc §9): removal efficiency,
> elimination capacity, Ergun pressure drop, the evaporative energy balance, transient
> growth and clogging, and the 9-overlay/15-preset system. All uncalibrated, and the
> upstream model has no channelling term so it **over-predicts at high biomass**. The
> sheet therefore states no absolute performance figure — a CDP check asserts this. The
> one performance number on the plate is Limbri et al. 2014's *measurement*
> (27.2 g CH₄ m⁻³ h⁻¹) and their own scale-up from it (≈7,200 m³ of bed for 50 m³ s⁻¹),
> quoted as a measurement and included because it is the strongest argument *against*
> what the sheet draws.
>
> **The finding is structural, not parameter-dependent** — worth knowing before anyone
> "fixes" the soft constants. Air dilution drives CH₄ down and O₂ up together, so any gas
> starting above the flammable band must pass through it on the way to a treatable
> concentration. Swept 0–20% raw O₂ across 16–82% CH₄: crosses every time. Swept the
> Coward nose across 11.5–12.5% O₂ and 5.6–6.4% CH₄: still crosses every time, with the
> fraction of the blend spent inside the envelope moving only between 8.14% and 8.50%.
> The two PENDING constants below are therefore not load-bearing.
>
> Verified: 26/26 new CDP interaction checks (`scratchpad/m004-checks.mjs`), 56/56 model
> unit tests ported from the upstream vitest suites (`scratchpad/bio-tests.mjs`),
> `node --check` clean on both JS files and the page's inline block, no uncaught
> exceptions on either page, H1's `fieldwork` hash lands on the plate.
>
> Budget gate resolved: **Sam raised this page's word budget to ≤2,600 on basis B**
> (2026-08-01). Remaining open: the two PENDING Coward constants and a contrast audit
> of the new sheet — "Still open" items 6 and 8. Neither blocks the argument.

> **2026-08-01 — earlier: scientific-accuracy upgrades (Sam-requested).**
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
  assumptions pane (22 constants, all sourced, zero PENDING *as of that round* —
  see the 2026-08-01 note: Sheet M-004 later reopened this gate).
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
- Word budget: **basis B = 1,698** (target at the time ≤2,400; raised to ≤2,600 on
  2026-08-01 — see item 7) via the rebuilt
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

### Opened by Sheet 4 (2026-08-01) — need a decision, not just work

6. **PENDING is no longer zero.** `cow_loc` (12.1% O₂) and `cow_nose` (6.0% CH₄) ship
   `verified:false`. Published limiting-oxygen values for methane sit around 11.7–12.2%
   depending on diluent and source; Bulletin 503 needs checking at page level, and the
   `coward1952` source entry carries `verify:true` accordingly. Per the sensitivity sweep
   recorded above, confirming these will move the crossing figures by well under a
   percentage point and **cannot change the finding** — so this is a citation chore, not
   a scientific risk. Fetching Bulletin 627 (Zabetakis 1965), which carries the
   methane–inert–air diagram explicitly, is probably the faster route than 503.
7. ~~**Both budgets are now effectively spent, and basis B is over.**~~
   **CLOSED 2026-08-01 — Sam raised the word budget for this page from ≤2,400 to
   ≤2,600 on basis B.** Measured with `scratchpad/word-bases.mjs` (the only counter
   whose numbers are comparable to each other):

   | Gate | Target | Before sheet 4 | Now | Verdict |
   |---|---|---|---|---|
   | basis B | ≤2,600 *(was 2,400)* | 2,333 | **2,469** | inside, 131 to spare |
   | height @1440 | ≤12,000 | ≈11,000 | **11,761** | inside, 239px to spare |

   Reasoning, so the raise is not read as the budget quietly drifting: the sheet costs
   ~136 words net after two trim passes (full hedge moved into a drawer, prose mirror
   tightened, plate labels shortened), and what remained to cut was the plot's axis
   numbers and the accessible live mirror — gaming the counter, not tightening the
   writing. The budget exists to prevent TEXT WALLS; a chart with a live readout is not
   one. **The height budget is unchanged and is now the binding constraint — treat 12,000px
   as the gate that must not move.** With 239px of headroom, any further default-visible
   addition to this page needs a height measurement before it lands, not after.
8. Sheet 4 has had no pixel-contrast audit. New pairings to probe: the ochre→ice bed
   ramp and the `#F6A97F` envelope stroke, both on the blueprint plate.

Local preview: `python3 -m http.server 8199` was left running →
http://localhost:8199/collapse-methane-mines.html
