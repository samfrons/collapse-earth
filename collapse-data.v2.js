/* =============================================================================
   collapse-data.v2.js — shared scientific data layer for Collapse Earth v2
   -----------------------------------------------------------------------------
   All four design variants read from this single object. Plain script, no build
   step, no modules: it assigns one global and nothing else.

   Editorial rules baked into the shape (do not relax them when adding data):
     · No number without a source id and a date.
     · Every tipping threshold carries min / central / max + confidence.
       Threshold values and confidence ratings are Armstrong McKay et al.,
       Science (2022), Table 1 — that table is the authority for this file.
     · Every funding entry carries a badge (announced | delivered | verified |
       deployed-grants) and an asOf date. "Announced" is never rendered as
       "delivered". Where a source hedges ("more than", "approximately",
       "unresolved conflict"), the hedge is preserved in `qualifier` / `note`.
     · An entry that claims an ABSENCE of funding must carry
       `assertedAbsence: true` and a `sourceQuote` giving the words the source
       actually used. A source being silent about a company's funding is not
       the same as a source reporting that the company has none.

   HOW TO SUM funding[] — READ THIS BEFORE WRITING A RENDERER.
   A naive `funding.reduce((n, f) => n + f.amount, 0)` produces a WRONG number.
   The array deliberately holds several non-additive kinds of money, tagged by
   `stream`:
       capital    equity or debt actually raised by a company
       target     capital being sought, not closed — never counts as raised
       contract   offtake / purchase commitments (customer revenue, not capital)
       prize      prize awards
       grant      public or philanthropic grants (given to, or deployed by)
       aggregate  sector-level roll-ups that already contain company rows
   Two further flags handle roll-ups within a stream:
       cumulative: true        this entry is a total that supersedes its parts
       withinCumulative: "<holder>"  this entry is INSIDE the cumulative entry
                                     belonging to that holder — exclude it
   Therefore: total capital raised for an intervention is
       funding.filter(f => f.stream === "capital" && !f.withinCumulative)
              .reduce((n, f) => n + (f.amount ?? 0), 0)
   Never add across streams. Never add an `aggregate` row to company rows.
   The scratchpad validator asserts the resulting per-intervention totals
   against a hardcoded table, so reintroducing a double-count will fail it.
     · Every hypothesis states falsifiable kill criteria and an honest TRL.
     · Earnest register throughout. This file is research and opinion, not
       investment advice, and not satire.

   Source of record for funding / company claims: collapse-tech-research.md
   (internal synthesis, July 2026), whose own caveats are carried through here.
   ============================================================================= */

window.COLLAPSE_DATA = {

  /* ---------------------------------------------------------------------------
     META
     `url: null` means the citation is real and dated but we do not have a
     stable link we are confident in — better than a fabricated URL.
     `verify: true` marks a citation still worth confirming before print.
     --------------------------------------------------------------------------- */
  meta: {
    updated: "2026-07-30",
    disclaimer: "Research and opinion. Not investment advice. Thresholds are estimated ranges, not dates.",
    sources: [
      { id: "armstrong2022", label: "Armstrong McKay et al., \"Exceeding 1.5 °C global warming could trigger multiple climate tipping points\", Science 377, eabn7950 (2022) — Table 1", date: "2022-09", url: "https://doi.org/10.1126/science.abn7950" },
      { id: "ipccar6", label: "IPCC Sixth Assessment Report (AR6), WGI and Synthesis Report", date: "2021-2023", url: "https://www.ipcc.ch/report/ar6/syr/" },
      { id: "wmo2025", label: "WMO, State of the Global Climate 2024 (2024 the first calendar year above 1.5 °C)", date: "2025-03", url: "https://wmo.int/publication-series/state-of-global-climate-2024" },
      { id: "gtp2023", label: "Global Tipping Points Report 2023 (Lenton et al., University of Exeter)", date: "2023-12", url: "https://global-tipping-points.org/" },
      { id: "gtp2025", label: "Global Tipping Points Report 2025 (Lenton et al., University of Exeter)", date: "2025-10", url: "https://global-tipping-points.org/" },
      { id: "ditlevsen2023", label: "Ditlevsen & Ditlevsen, \"Warning of a forthcoming collapse of the Atlantic meridional overturning circulation\", Nature Communications 14, 4254 (2023)", date: "2023-07", url: "https://doi.org/10.1038/s41467-023-39810-w" },
      { id: "vanwesten2024", label: "van Westen, Kliphuis & Dijkstra, \"Physics-based early warning signal shows that AMOC is on tipping course\", Science Advances (2024)", date: "2024-02", url: "https://doi.org/10.1126/sciadv.adk1189" },
      { id: "benyami2024", label: "Ben-Yami et al., critique of AMOC early-warning dating (observational record too short), Science Advances (2024)", date: "2024", url: null, verify: true },
      { id: "gatti2021", label: "Gatti et al., \"Amazonia as a carbon source linked to deforestation and climate change\", Nature 595 (2021)", date: "2021-07", url: "https://doi.org/10.1038/s41586-021-03629-6" },
      { id: "noaa2024", label: "NOAA Coral Reef Watch — fourth global bleaching event declared 2023–24", date: "2024-04", url: "https://coralreefwatch.noaa.gov/" },
      { id: "research-doc", label: "Collapse Capital internal research synthesis, \"Deep Clean Tech: Viable Climate Companies by Tipping-Point Intervention Category\" (collapse-tech-research.md)", date: "2026-07", url: null },
      { id: "iea-methane", label: "IEA Global Methane Tracker — methane responsible for nearly 30% of the rise in global average temperature since the Industrial Revolution", date: "2025", url: "https://www.iea.org/reports/global-methane-tracker-2025" },
      { id: "cdrfyi2025", label: "CDR.fyi, 2025 DAC Market Snapshot (contracted vs delivered tonnes, supplier concentration)", date: "2025-H1", url: "https://www.cdr.fyi/" },
      { id: "carbonplan", label: "CarbonPlan — experimental enhanced-weathering CO₂-removal estimates vary by four orders of magnitude", date: "2024", url: "https://carbonplan.org/", verify: true },
      { id: "xprize2025", label: "XPRIZE Carbon Removal results — Mati Carbon grand prize ($50M); UNDO, NetZero, Vaulted Deep runners-up", date: "2025-04", url: "https://www.xprize.org/prizes/carbonremoval" },
      { id: "puro", label: "Puro.earth — biochar CO₂ removal methodology and certified deliveries", date: "2025", url: "https://puro.earth/" },
      { id: "iucn-peatland", label: "UK IUCN Peatland Programme, Peatland Code register (~361 projects / ~52,000 ha)", date: "2025-06", url: "https://www.iucn-uk-peatlandprogramme.org/peatland-code" },
      { id: "spglobal2025", label: "S&P Global Commodity Insights — blue carbon assessment record $29.30/tCO₂e (Aug 2025); Exomad Green run-rate ~120,000 mtCO₂e/yr (conflicts with company self-report)", date: "2025-08", url: null },
      { id: "mes-trl2024", label: "Trends in Biotechnology — microbial electrosynthesis assessed at TRL 3/4, lab scale, requiring process optimisation before an industrial prototype", date: "2024", url: null, verify: true },
      { id: "ice-negative2024", label: "Preprint by 42 glaciologists condemning ice-sheet and sea-ice thickening / polar geoengineering as infeasible and dangerous", date: "2024-10", url: null, verify: true },
      { id: "ice-negative2025", label: "Study concluding high-profile Arctic and polar interventions are not viable and may cause harm, each costing ≥$10B", date: "2025-09", url: null, verify: true },
      { id: "doe2025", label: "US DOE grant terminations and rescissions affecting DAC and low-carbon cement (Project Cypress, South Texas hub, Sublime $87M, Brimstone $189M)", date: "2025", url: null, verify: true }
    ]
  },

  /* ---------------------------------------------------------------------------
     WARMING — the master variable. Every threshold below is read against it.
     --------------------------------------------------------------------------- */
  warming: {
    current: 1.4,
    currentNote: "≈1.3–1.5 °C above 1850–1900 as a multi-year mean; 2024 was the first single calendar year above 1.5 °C. A single year above 1.5 °C is not the same as breaching the Paris limit, which is defined on a long-term mean.",
    unit: "°C above 1850–1900",
    range: { min: 1.3, max: 1.5 },
    dialRange: { min: 1.1, max: 3.0, step: 0.05 },
    sourceIds: ["ipccar6", "wmo2025"]
  },

  /* ---------------------------------------------------------------------------
     TIPPING SYSTEMS — all 16 elements of Armstrong McKay et al. 2022, Table 1.
     `tier` preserves the paper's own split: 9 global core elements whose
     tipping would materially change global mean surface temperature, and 7
     regional-impact elements. `threshold` and `confidence` are the paper's.
     --------------------------------------------------------------------------- */
  tippingSystems: [

    /* --- global core elements (9) --- */
    {
      id: "gris", name: "Greenland Ice Sheet", short: "Greenland ice",
      category: "cryosphere", tier: "global-core",
      threshold: { min: 0.8, central: 1.5, max: 3.0, confidence: "medium" },
      timescale: { triggerToImpact: "millennia", note: "commitment is near-term; full deglaciation ~10,000 yr" },
      lat: 72, lon: -42,
      plain: "Self-sustaining melt once surface lowering feeds back on itself: a lower ice surface sits in warmer air, which lowers it further.",
      impacts: "≈7 m sea-level equivalent; ≈+0.13 °C global mean surface temperature via albedo loss",
      observed: "Net ice loss every year for decades; record-scale surface melt in 2023–24.",
      signal: "Accelerating ice discharge and darkening (lower-albedo) ice absorbing more heat.",
      reversibility: "Effectively irreversible over millennia once committed.",
      cascades: ["amoc", "labsea"],
      sourceIds: ["armstrong2022", "ipccar6"]
    },
    {
      id: "wais", name: "West Antarctic Ice Sheet", short: "W. Antarctic ice",
      category: "cryosphere", tier: "global-core",
      threshold: { min: 1.0, central: 1.5, max: 3.0, confidence: "medium" },
      timescale: { triggerToImpact: "centuries to millennia", note: "~2,000 yr to full expression" },
      lat: -80, lon: -110,
      plain: "A marine ice sheet grounded below sea level, so retreat into deeper water accelerates itself.",
      impacts: "≈3–5 m sea-level equivalent; ≈+0.05 °C global mean surface temperature",
      observed: "Thwaites and Pine Island glaciers are accelerating; parts may already be destabilised.",
      signal: "Grounding-line retreat at Thwaites and Pine Island.",
      reversibility: "Self-sustaining once grounding lines retreat past a bed high point.",
      cascades: ["eais-basins"],
      sourceIds: ["armstrong2022", "gtp2023"]
    },
    {
      id: "amoc", name: "Atlantic Meridional Overturning Circulation", short: "AMOC",
      category: "ocean-circulation", tier: "global-core", contested: true,
      threshold: { min: 1.4, central: 4.0, max: 8.0, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~50 yr transition once tipped; the trigger is the contested part, not the speed" },
      lat: 50, lon: -30,
      plain: "The Atlantic's heat conveyor. Warming plus Greenland meltwater freshens the northern surface, which weakens the sinking that drives the whole circulation.",
      impacts: "≈−0.5 °C global mean surface temperature but sharp regional cooling of NW Europe, monsoon shifts affecting billions, and extra sea-level rise on the US East Coast",
      observed: "The subpolar \"cold blob\" south of Greenland persists; a subtropical slowdown of roughly 1 Sv per decade has been reported.",
      signal: "The cold blob — a cooling patch in a warming ocean — plus salinity-based early-warning indicators.",
      reversibility: "Bistable with hysteresis; restarting an \"off\" state is extremely hard.",
      cascades: ["amazon", "sahel", "labsea"],
      contestedNote: "Collapse timing is genuinely contested — four dated positions, not one date: Ditlevsen & Ditlevsen 2023 (statistical, central ≈2057, range 2025–2095); van Westen et al. 2024 (model-based, \"on tipping course\"); IPCC AR6 (full collapse unlikely before 2100); Ben-Yami et al. 2024 (observational record too short to date it).",
      sourceIds: ["armstrong2022", "ditlevsen2023", "vanwesten2024", "ipccar6", "benyami2024"]
    },
    {
      id: "labsea", name: "Labrador–Irminger Sea / subpolar gyre convection", short: "Subpolar gyre",
      category: "ocean-circulation", tier: "global-core",
      threshold: { min: 1.1, central: 1.8, max: 3.8, confidence: "low" },
      timescale: { triggerToImpact: "years to a decade", note: "~10 yr — the fastest transition in the table" },
      lat: 58, lon: -45,
      plain: "Deep winter mixing in the North Atlantic — a \"mini-AMOC\" that can switch off on its own, without a full overturning collapse.",
      impacts: "≈−0.5 °C global mean surface temperature; abrupt regional cooling of NW Europe",
      observed: "Modelled as able to tip even without a full AMOC shutdown; winter deep convection is weakening.",
      signal: "Declining winter mixed-layer depth in the Labrador and Irminger Seas.",
      reversibility: "Abrupt to cross but regionally recoverable.",
      cascades: ["amoc"],
      sourceIds: ["armstrong2022"]
    },
    {
      id: "eais-basins", name: "East Antarctic subglacial basins", short: "E. Antarctic basins",
      category: "cryosphere", tier: "global-core",
      threshold: { min: 2.0, central: 3.0, max: 6.0, confidence: "low" },
      timescale: { triggerToImpact: "millennia", note: "~2,000 yr" },
      lat: -73, lon: 100,
      plain: "Marine-grounded basins inside the largest ice sheet of all — the same instability as West Antarctica, engaged at higher warming.",
      impacts: "≈3–4 m sea-level equivalent from the vulnerable basins alone; ≈+0.05 °C global mean surface temperature",
      observed: "Warm-water intrusion beneath basin outlet glaciers; engaged later than West Antarctica but larger.",
      signal: "Ocean heat reaching Wilkes and Aurora basin grounding lines.",
      reversibility: "Millennial and effectively irreversible once engaged.",
      cascades: [],
      sourceIds: ["armstrong2022"]
    },
    {
      id: "amazon", name: "Amazon rainforest dieback", short: "Amazon",
      category: "biosphere", tier: "global-core",
      threshold: { min: 2.0, central: 3.5, max: 6.0, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~100 yr to full expression" },
      lat: -4, lon: -63,
      plain: "The forest makes much of its own rain. Past a point, warming, drought and clearing break that recycling and large areas flip toward savanna.",
      impacts: "≈150–200 Gt C stored in Amazon biomass and soils; ≈+0.2 °C global mean surface temperature if released",
      observed: "The south-eastern Amazon has already flipped to a net carbon source (Gatti et al. 2021).",
      signal: "Lengthening dry seasons and loss of forest connectivity.",
      reversibility: "A forest→savanna flip is hard to reverse once rainfall recycling breaks.",
      cascades: ["amoc"],
      directHandle: "The rare element with a real non-warming handle: halting deforestation and restoring forest raises the threshold outright.",
      sourceIds: ["armstrong2022", "gatti2021", "gtp2023"]
    },
    {
      id: "permafrost-collapse", name: "Boreal permafrost collapse", short: "Permafrost (collapse)",
      category: "carbon-feedback", tier: "global-core",
      threshold: { min: 3.0, central: 4.0, max: 6.0, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~50 yr" },
      lat: 67, lon: 100,
      plain: "Widespread loss of the frozen ground that holds roughly twice the carbon now in the atmosphere — distinct from, and later than, localised abrupt thaw.",
      impacts: "≈1,400–1,600 Gt C in permafrost; ≈+0.2 to +0.4 °C global mean surface temperature",
      observed: "Widespread permafrost warming; some regions are already net carbon emitters.",
      signal: "Rising ground temperatures and deepening active layers across Siberia and northern Canada.",
      reversibility: "Released carbon does not refreeze on human timescales.",
      cascades: ["boreal-south", "boreal-north"],
      sourceIds: ["armstrong2022", "ipccar6"]
    },
    {
      id: "arctic-winter-ice", name: "Arctic winter sea ice collapse", short: "Arctic winter ice",
      category: "cryosphere", tier: "global-core",
      threshold: { min: 4.5, central: 6.3, max: 8.7, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~20 yr once triggered" },
      lat: 85, lon: 0,
      plain: "Loss of the winter ice cover, not just the summer minimum. The highest threshold in the table — and the one most people confuse with the summer ice already disappearing.",
      impacts: "≈+0.6 °C global mean surface temperature via albedo loss",
      observed: "Summer sea ice is declining sharply; winter ice loss is a distinct, much later transition and is not currently underway.",
      signal: "Winter maximum extent and thickness trends.",
      reversibility: "Sea ice can regrow if warming reverses; the albedo feedback amplifies change first.",
      cascades: [],
      sourceIds: ["armstrong2022"]
    },
    {
      id: "eais", name: "East Antarctic Ice Sheet", short: "E. Antarctic ice sheet",
      category: "cryosphere", tier: "global-core",
      threshold: { min: 5.0, central: 7.5, max: 10.0, confidence: "low" },
      timescale: { triggerToImpact: "millennia", note: "~10,000 yr" },
      lat: -80, lon: 60,
      plain: "Wholesale collapse of the largest ice mass on Earth. Very far off on this table — included because it sets the ceiling, not because it is near.",
      impacts: "≈52 m sea-level equivalent; ≈+0.6 °C global mean surface temperature",
      observed: "Not underway. Distinguished here from the vulnerable subglacial basins, which engage far earlier.",
      signal: "None currently attributable at the whole-sheet scale.",
      reversibility: "Effectively permanent on any human timescale.",
      cascades: [],
      sourceIds: ["armstrong2022"]
    },

    /* --- regional-impact elements (7) --- */
    {
      id: "coral", name: "Low-latitude coral reefs", short: "Coral reefs",
      category: "biosphere", tier: "regional",
      threshold: { min: 1.0, central: 1.5, max: 2.0, confidence: "high" },
      timescale: { triggerToImpact: "years", note: "~10 yr — die-off, not a slow decline" },
      lat: 0, lon: 130,
      plain: "Tropical reefs bleach when water stays too warm for too long. The one element in the table with high confidence, and the one we are most likely already crossing.",
      impacts: "≈25% of marine species depend on reefs; roughly half a billion people rely on them for food and coastal protection",
      observed: "A fourth global bleaching event was declared in 2023–24; mass bleaching now recurs at today's warming.",
      signal: "Rising frequency of mass bleaching between heat spikes, with shrinking recovery windows.",
      reversibility: "Fast to cross; recovery is slow and increasingly uncertain.",
      cascades: [],
      sourceIds: ["armstrong2022", "gtp2023", "noaa2024"]
    },
    {
      id: "permafrost-abrupt", name: "Boreal permafrost abrupt thaw", short: "Permafrost (abrupt)",
      category: "carbon-feedback", tier: "regional",
      threshold: { min: 1.0, central: 1.5, max: 2.3, confidence: "medium" },
      timescale: { triggerToImpact: "decades to centuries", note: "~200 yr; localised and already beginning" },
      lat: 66, lon: -140,
      plain: "Localised ground collapse — thermokarst and thaw lakes — that releases carbon far faster than gradual warming of the soil column.",
      impacts: "≈+0.04 °C global mean surface temperature per 100 Gt C released",
      observed: "Expanding thermokarst and abrupt-thaw lakes across Alaska, Yukon and Siberia.",
      signal: "Growth in thermokarst area and in thaw-lake extent.",
      reversibility: "Released carbon does not refreeze on human timescales.",
      cascades: ["permafrost-collapse"],
      sourceIds: ["armstrong2022", "ipccar6"]
    },
    {
      id: "barents", name: "Barents Sea ice abrupt loss", short: "Barents Sea ice",
      category: "cryosphere", tier: "regional",
      threshold: { min: 1.5, central: 1.6, max: 1.7, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~25 yr" },
      lat: 75, lon: 40,
      plain: "Winter sea ice in Europe's fastest-warming sea, with a strikingly narrow trigger band — ±0.1 °C around the central estimate.",
      impacts: "Sharp regional warming step; \"Atlantification\" of the Barents ecosystem",
      observed: "The Barents is among the fastest-warming ocean regions on Earth.",
      signal: "Winter sea-ice variability and northward advance of Atlantic water.",
      reversibility: "Sea ice can regrow if warming reverses, but amplifies change first.",
      cascades: [],
      sourceIds: ["armstrong2022"]
    },
    {
      id: "glaciers", name: "Mountain glacier loss", short: "Mountain glaciers",
      category: "cryosphere", tier: "regional",
      threshold: { min: 1.5, central: 2.0, max: 3.0, confidence: "medium" },
      timescale: { triggerToImpact: "centuries", note: "~200 yr" },
      lat: 30, lon: 85,
      plain: "The frozen water towers that release meltwater in the dry season, when rivers would otherwise run low.",
      impacts: "≈1.9 billion people live downstream of High-Mountain-Asia glaciers; ≈+0.08 °C global mean surface temperature",
      observed: "Most glacier systems are in sustained negative mass balance.",
      signal: "Accelerating negative mass balance across nearly every range.",
      reversibility: "Ice lost this century will not return for centuries.",
      cascades: [],
      sourceIds: ["armstrong2022", "ipccar6"]
    },
    {
      id: "sahel", name: "Sahel & West African monsoon greening", short: "Sahel monsoon",
      category: "monsoon", tier: "regional",
      threshold: { min: 2.0, central: 2.8, max: 3.5, confidence: "low" },
      timescale: { triggerToImpact: "years to decades", note: "~50 yr" },
      lat: 15, lon: 5,
      plain: "The rain belt at the southern edge of the Sahara can shift abruptly. Direction is uncertain — this is one of the few transitions that could be regionally beneficial.",
      impacts: "Abrupt re-greening or drying of the Sahel; disruptive to agriculture and settlement either way",
      observed: "Instability in West African monsoon rainfall; the sign of the change is not settled.",
      signal: "Monsoon rainfall variability and vegetation-rainfall coupling.",
      reversibility: "Potentially reversible; direction of change uncertain.",
      cascades: [],
      sourceIds: ["armstrong2022"]
    },
    {
      id: "boreal-south", name: "Boreal forest southern dieback", short: "Boreal (southern dieback)",
      category: "biosphere", tier: "regional",
      threshold: { min: 1.4, central: 4.0, max: 5.0, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~100 yr" },
      lat: 55, lon: 105,
      plain: "Dieback at the warm southern margin of the northern conifer belt, driven by fire, drought and insect outbreaks.",
      impacts: "≈−0.18 °C global mean surface temperature — dieback exposes brighter ground, so the net sign is cooling even as carbon is lost",
      observed: "Increasingly severe boreal fire years across Siberia and Canada.",
      signal: "Rising fire, drought and insect-outbreak mortality at the southern margin.",
      reversibility: "A slow ecosystem transition, partly recoverable.",
      cascades: ["permafrost-collapse"],
      directHandle: "Partial land-use leverage: fire and forest management change the trajectory.",
      sourceIds: ["armstrong2022"]
    },
    {
      id: "boreal-north", name: "Boreal forest northward expansion", short: "Boreal (northward expansion)",
      category: "biosphere", tier: "regional",
      threshold: { min: 1.5, central: 4.0, max: 7.2, confidence: "low" },
      timescale: { triggerToImpact: "decades", note: "~100 yr" },
      lat: 66, lon: 90,
      plain: "The same belt advancing into tundra. Darker forest replacing bright tundra absorbs more sunlight — the opposite sign to southern dieback.",
      impacts: "≈+0.14 °C global mean surface temperature via albedo loss over former tundra",
      observed: "Shrub and tree encroachment into tundra across the circumpolar north.",
      signal: "Treeline advance and tundra shrubification.",
      reversibility: "A slow ecosystem transition; the albedo change persists as long as the forest does.",
      cascades: ["permafrost-collapse"],
      sourceIds: ["armstrong2022"]
    }
  ],

  /* ---------------------------------------------------------------------------
     INTERVENTIONS — Act II. One entry per research-doc category (§1–§9).
     `funding` holds dollar figures only, each with badge + asOf. Tonnage and
     delivery evidence lives in `delivered` so that money and matter are never
     silently interchanged. `gapScore` 1–5 is a directional read of how far
     potential impact runs ahead of capital, not a measured quantity.

     funding[] IS NOT SUMMABLE AS-IS — see the "HOW TO SUM funding[]" block in
     the file header. Filter on `stream === "capital"` and drop any entry with
     `withinCumulative` before adding anything up.
     --------------------------------------------------------------------------- */
  interventions: [
    {
      id: "methane-removal",
      name: "Atmospheric / point-source methane removal",
      section: "§1",
      leverage: "Methane is responsible for nearly 30% of the rise in global average temperature since the Industrial Revolution (IEA Global Methane Tracker); its 20-year global warming potential is ≈84–87× CO₂ (IPCC). Near-term methane action is among the highest-leverage climate moves available.",
      maturity: "TRL 1–3 (open-atmosphere) / TRL 4–5 pilot (point-source) / commercial (enteric additives in ration systems)",
      funding: [
        { amount: 8e6, qualifier: "at-least", stream: "grant", kind: "grants deployed TO third-party researchers, not capital received", holder: "Spark Climate Solutions (nonprofit funder/convener)", asOf: "2026-07", badge: "deployed-grants", note: "reported as more than $8M across more than 27 research grants; a 501(c)(3), not a company" },
        { amount: 37e6, stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Windfall Bio", asOf: "2024-04", badge: "announced", note: "$9M seed (Mar 2023) + $28M Series A (Apr 2024, led by Prelude Ventures); the two rounds are not listed separately, so this total is the only capital row for Windfall" },
        { amount: null, stream: "grant", assertedAbsence: true, kind: "grant-funded only", holder: "Ambient Carbon", asOf: "2026-07", badge: "verified",
          sourceQuote: "No disclosed venture/equity funding — grant-funded only (Innovation Fund Denmark via AgriFoodTure/PERMA project; partners include Arla Foods)",
          note: "the absence of a venture round is explicitly reported, not inferred from silence" },
        { amount: 30.8e6, qualifier: "approximately", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Rumin8 (enteric methane)", asOf: "2026-07", badge: "announced", note: "backers include Breakthrough Energy Ventures and Andrew Forrest" },
        { amount: null, stream: "capital", kind: "shareholder-funded plus an undisclosed loan", holder: "Atmospheric Methane Removal AG (open atmosphere)", asOf: "2024-10", badge: "announced", note: "voted to become non-profit-oriented in Oct 2024; nothing delivered in the field" }
      ],
      delivered: "Ambient Carbon MEPS pilot: a 40-ft container system treated ventilation air from a 250-cow dairy barn at Hofmansgave Foundation farm, removing up to 90% of the methane (2025). Rumin8 trials show up to ≈86–95% enteric methane reduction with regulatory approval secured in Brazil; DSM-firmenich's Bovaer (3-NOP) is the EU-approved incumbent at ≈30% reduction. Bennu ran an at-sea ship-based UV methane-destruction pilot on a Lomar Shipping vessel (2024–25).",
      announcedNotDelivered: "A Danone-funded ≈30× MEPS scale-up is planned for a 4,000+ head dairy in Indiana, US — announced, not built.",
      caveat: "Open-atmosphere methane removal is TRL 1–3, contested, and carries governance and side-effect risks (chlorine toxicity, ozone impacts). Scientists warn commercialisation is \"way beyond what the science yet supports.\" Point-source and enteric approaches are far more grounded.",
      gapScore: 5,
      sourceIds: ["research-doc", "iea-methane", "ipccar6"]
    },
    {
      id: "ocean-cdr",
      name: "Direct ocean capture & ocean alkalinity enhancement",
      section: "§2",
      leverage: "The ocean holds roughly 50× more carbon than the atmosphere and equilibrates with it; shifting seawater chemistry lets it absorb more, with storage as bicarbonate on a >10,000-year timescale. Some routes also relieve local acidification, which is the one intervention with a direct line to reef stress.",
      maturity: "TRL 4–5 — pilots operating, MRV and ecological effects unresolved",
      funding: [
        { amount: 20e6, qualifier: "at-least", stream: "capital", kind: "venture (Series A)", holder: "Ebb Carbon", asOf: "2026-07", badge: "announced" },
        { amount: 45.3e6, stream: "capital", kind: "venture (Series A, expanded)", holder: "Captura", asOf: "2026-07", badge: "announced", note: "backers include Equinor, Aramco Ventures, Eni Next, Maersk Growth. Distinct from the Series B below — the source reports ~$45M+ raised before that round." },
        { amount: 12.5e6, stream: "capital", kind: "venture (Series B, first close)", holder: "Captura — Series B", asOf: "2026-06", badge: "announced", note: "led by Equinor Ventures; additional to the Series A, not a restatement of it" },
        { amount: 14.6e6, qualifier: "approximately", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Planetary Technologies", asOf: "2026-07", badge: "announced" },
        { amount: 31e6, stream: "contract", kind: "offtake, Frontier-facilitated (customer commitment, not capital raised)", holder: "Planetary Technologies — Frontier offtake", asOf: "2026-07", badge: "announced" },
        { amount: 1e6, stream: "prize", kind: "XPRIZE XFACTOR award", holder: "Planetary Technologies — XPRIZE", asOf: "2025", badge: "verified" }
      ],
      delivered: "Ebb Carbon delivered an initial 1,333 tonnes under its Microsoft agreement (up to 350,000 tonnes over 10 years, Oct 2024 — the largest marine CDR commitment to date). Planetary Technologies delivered the first net OAE credits: 138 tonnes to Shopify and Stripe (Nov 2024). Ebb's Project Macoma pilot (Port Angeles) began operations in 2025, alongside a 100 t/yr system at PNNL Sequim; Equatic-1 in Singapore has ≈3,650 t/yr design capacity; Vesta holds the first US federal permit for a standalone ocean CDR pilot (North Carolina, 2024).",
      caveat: "Ocean scientists have called for caution or halts on some open-ocean projects; MRV and ecological effects are unresolved. The frequently quoted <$100/t by ~2028 figure is a projection, not an observation. Running Tide — an early kelp-sinking and alkalinity-buoy pioneer — wound down its ocean CDR operations, which is the category's cautionary case.",
      gapScore: 4,
      sourceIds: ["research-doc"]
    },
    {
      id: "erw",
      name: "Enhanced rock weathering",
      section: "§3",
      leverage: "Silicate rock dust reacts with CO₂ to form dissolved bicarbonate stored for 10,000+ years, while raising soil pH. It rides on infrastructure that already exists — quarry fines and farm spreading equipment — which is why it is one of the two CDR categories with credible near-term scale-up.",
      maturity: "TRL 5–6 — verified registry tonnes delivered; open-system MRV is the binding constraint",
      funding: [
        { amount: 58.2e6, stream: "capital", cumulative: true, kind: "venture (cumulative at launch)", holder: "Terradot", asOf: "2024-12", badge: "announced", note: "investors include Google, Microsoft Climate Innovation Fund, John Doerr; acquired Eion (Feb 2026)" },
        { amount: 27e6, stream: "contract", kind: "Frontier purchase, 90,000 tonnes (customer commitment, not capital raised)", holder: "Terradot — Frontier purchase", asOf: "2024-12", badge: "announced" },
        { amount: 63.4e6, qualifier: "approximately", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Lithos Carbon", asOf: "2026-07", badge: "announced", note: "Greylock, Union Square Ventures, Bain Capital Ventures" },
        { amount: 50e6, stream: "prize", kind: "XPRIZE Carbon Removal grand prize", holder: "Mati Carbon — XPRIZE", asOf: "2025-04", badge: "verified", note: "nonprofit-controlled via Swaniti Initiative" },
        { amount: 5e6, stream: "prize", kind: "XPRIZE runner-up award", holder: "UNDO — XPRIZE", asOf: "2025-04", badge: "verified" }
      ],
      delivered: "Lithos Carbon delivered 5,160 registry-certified tonnes in Dec 2025, described as the largest ERW issuance to date, against an 11,400-tonne Microsoft deal. Terradot has spread 48,000+ tonnes of rock over 1,800 hectares and holds ≈300,000 tonnes of contracted removals, including Google's 200,000-tonne purchase — its largest single CDR purchase. UNDO signed a 28,900-tonne Microsoft deal, the first CDR deal structured with debt capital. InPlanet signed a Microsoft ERW deal (Dec 2025).",
      caveat: "CarbonPlan notes that experimental CO₂-removal estimates for enhanced weathering vary by four orders of magnitude. MRV is improving but not settled, and contracted volume still exceeds delivered volume by roughly an order of magnitude.",
      gapScore: 3,
      sourceIds: ["research-doc", "carbonplan", "xprize2025"]
    },
    {
      id: "blue-carbon-peatland",
      name: "Blue carbon & peatland restoration (with MRV edge)",
      section: "§4",
      leverage: "Coastal and wetland ecosystems sequester carbon at high per-area rates, and drained peatlands are a vast avoided-emissions store. The price signal is already there: the S&P Global blue carbon assessment hit a record $29.30/tCO₂e in Aug 2025 — high precisely because rigorous MRV is scarce and costly.",
      maturity: "TRL 6–7 — the ecology is well understood and the restoration methods are mature; credit-grade measurement is the bottleneck and the actual technology opportunity",
      funding: [
        { amount: null, stream: "grant", kind: "grant plus carbon finance; no consolidated total published", holder: "UK IUCN Peatland Code (~361 projects / ~52,000 ha)", asOf: "2025-06", badge: "verified" },
        { amount: null, stream: "grant", kind: "public grant (Innovate UK)", holder: "Sylvera (satellite-based peatland MRV)", asOf: "2026-07", badge: "announced" },
        { amount: null, stream: "capital", kind: "venture (early; amount not disclosed in source)", holder: "aeco (European agricultural peatland rewetting with continuous water-level MRV)", asOf: "2026-07", badge: "announced" },
        { amount: null, stream: "grant", kind: "corporate-backed project funding; structure not disclosed in source", holder: "Pantheon Regeneration (US peatland restoration, Microsoft-backed)", asOf: "2026-07", badge: "announced" }
      ],
      delivered: "As of Oct 2025 roughly 81 blue-carbon projects existed but only about 10 were actively issuing credits; the market is under 1% of voluntary carbon credits and mangroves account for ≈99% of claimed removals. Germany's MoorFutures and the UK Peatland Code are the working precedents for peatland carbon finance.",
      caveat: "Most of this is high-integrity avoidance, not durable removal; permanence is measured in decades with long monitoring tails. Kelp and macroalgae remain methodologically uncreditable because permanence is unproven — Running Tide's wind-down is the object lesson.",
      gapScore: 4,
      sourceIds: ["research-doc", "spglobal2025", "iucn-peatland"]
    },
    {
      id: "dac",
      name: "Direct air capture",
      section: "§5",
      leverage: "The only removal route whose siting is independent of biology, geography and land competition: sorbents and solvents pull CO₂ from ambient air anywhere there is clean power and storage. That generality is why it attracts capital — and why its cost is the whole question.",
      maturity: "TRL 7 — commercially operating plants, but at ≈10× the target cost",
      funding: [
        { amount: 2.3e9, qualifier: "approximately", stream: "aggregate", cumulative: true, kind: "sector-total private DAC investment tracked 2021–H1 2025", holder: "DAC sector", asOf: "2025-H1", badge: "verified", note: "a sector aggregate that already contains company rows — never add it to them" },
        { amount: 1.4e9, qualifier: "at-least", stream: "aggregate", withinCumulative: "DAC sector", kind: "share of the tracked sector total (≈60%)", holder: "Climeworks + 1PointFive combined", asOf: "2025-H1", badge: "verified", note: "a slice of the $2.3B above, not additional to it" },
        { amount: 162e6, stream: "capital", kind: "venture (late-stage round)", holder: "Climeworks", asOf: "2025-Q3", badge: "announced", note: "falls after the 2021–H1 2025 window covered by the sector aggregates above, so it is not contained in them" },
        { amount: 150e6, stream: "capital", withinCumulative: "Heirloom Carbon", kind: "venture (Series B)", holder: "Heirloom Carbon — Series B", asOf: "2024-12", badge: "announced", note: "co-led by Future Positive and Lowercarbon Capital; included in the >$200M cumulative below" },
        { amount: 200e6, qualifier: "at-least", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Heirloom Carbon", asOf: "2026-07", badge: "announced" }
      ],
      delivered: "Only ≈1,186 tonnes have been delivered by six DAC suppliers since 2023 — about 0.05% of all contracted volume. Climeworks leads deliveries (≈81% of all DAC delivered) and operates Orca and Mammoth in Iceland (Mammoth design capacity 36,000 t/yr); 1PointFive leads credits sold (≈52%) and is building Stratos in West Texas, designed for 500,000 t/yr. Costs remain ≈$600–1,000/t against a ≈$100/t target. The top three suppliers account for over 80% of DAC tonnes contracted 2020–H1 2025.",
      policyRisk: "US DOE terminated initial ≈$50M tranches for Project Cypress (Climeworks/Heirloom) and the South Texas hub (1PointFive) in Oct 2025, though some DAC funding was later preserved in 2026. Climeworks laid off more than 10% of staff in 2025.",
      caveat: "Energy-intensive and costly. Included here as the funding contrast to the neglected categories rather than as the neglected case: DAC is the best-capitalised removal route with among the smallest delivered volumes. Note fossil-industry ownership at 1PointFive (an Occidental subsidiary) and the potential for enhanced-oil-recovery use.",
      gapScore: 1,
      sourceIds: ["research-doc", "cdrfyi2025", "doe2025"]
    },
    {
      id: "biochar",
      name: "Biochar & durable bio-based carbon removal",
      section: "§6",
      leverage: "Pyrolysis converts biomass into stable aromatic carbon that resists decomposition for centuries to millennia. It is the most-delivered durable CDR category by volume — the one place where verified tonnes, not forward contracts, are the headline number.",
      maturity: "TRL 8 — commercially operating at scale; permanence assurance is the maturing edge",
      funding: [
        { amount: 130e6, qualifier: "approximately", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Charm Industrial", asOf: "2026-07", badge: "announced", note: "bio-oil injection plus biochar; Google deals including 100,000 tonnes biochar (2025)" },
        { amount: 15e6, stream: "prize", kind: "XPRIZE runner-up award", holder: "NetZero — XPRIZE", asOf: "2025-04", badge: "verified" },
        { amount: 8e6, stream: "prize", kind: "XPRIZE runner-up award", holder: "Vaulted Deep — XPRIZE", asOf: "2025-04", badge: "verified" },
        { amount: null, stream: "contract", kind: "offtake, ≥1.24M tonnes over 10 years; no contract value disclosed", holder: "Exomad Green — Microsoft offtake", asOf: "2025-05", badge: "announced", note: "the source reports the volume and term but no dollar value, and says nothing about Exomad's equity funding either way — so no funding row is asserted for the company" }
      ],
      delivered: "Exomad Green has delivered over 320,000 tonnes cumulatively (≈84% carbon content, >1,000-year stability, Puro.earth certified) and signed the largest biochar carbon-removal deal in history by volume with Microsoft: at least 1.24M tonnes over 10 years (May 2025). Varaha converts invasive Prosopis juliflora to biochar with a Google offtake and digital MRV.",
      unresolvedConflict: "Exomad Green's annual run-rate is unresolved: the company self-reports ≈260,000 t/yr from two facilities (targeting 1M t/yr by 2027 across five sites), while S&P Global cites ≈120,000 mtCO₂e/yr currently. Flagged as an open conflict, not averaged.",
      caveat: "Biochar permanence depends on production quality, and MRV protocols (Puro, Isometric) are still maturing. Sustainable biomass availability is the ceiling on the category.",
      gapScore: 2,
      sourceIds: ["research-doc", "puro", "spglobal2025"]
    },
    {
      id: "microbial-electro",
      name: "Microbial, bioelectrochemical & CO₂/methane-to-products",
      section: "§7",
      leverage: "Turns waste carbon into a saleable product rather than a stored liability, which is the only route in this list whose unit economics improve with the product price instead of depending on a credit price. Gas fermentation is already commercial; the electrochemical routes are not.",
      maturity: "Commercial (gas fermentation) / TRL 3–4 (microbial electrosynthesis) — a genuinely wide spread inside one category, and conflating them is the field's main honesty failure",
      funding: [
        { amount: null, stream: "capital", kind: "public listing via SPAC (≈$2B valuation at close — a valuation, not capital raised, so no amount is recorded)", holder: "LanzaTech", asOf: "2023-02", badge: "verified" },
        { amount: null, stream: "grant", kind: "academic research funding, not consolidated or publicly tracked", holder: "Microbial electrosynthesis field", asOf: "2026-07", badge: "verified", note: "assessed at TRL 3/4 — lab scale, requiring process optimisation before an industrial prototype (Trends in Biotechnology, 2024). No claim is made about total funding in the field: the sources describe its maturity, not its capital." },
        { amount: null, stream: "capital", kind: "venture (amount not disclosed in source)", holder: "Twelve, Dioxide Materials (electro-CO₂ conversion)", asOf: "2026-07", badge: "announced" }
      ],
      delivered: "LanzaTech operates six commercial facilities and has produced 30M+ gallons of ethanol since 2021, with ArcelorMittal, Lululemon, Zara and Coty as partners, and has spun out LanzaJet (SAF) and LanzaX (chemicals). Microbial electrosynthesis sits at TRL 3/4 per peer-reviewed assessment (Trends in Biotechnology, 2024) — lab scale, needing process optimisation before an industrial prototype.",
      caveat: "Gas fermentation abates and recycles emissions; it is not permanent CDR unless paired with sequestration. MES and electro-conversion economics remain unproven at scale. This is the category where the temptation to overstate is highest, because the commercial leader and the research frontier share a section heading.",
      gapScore: 4,
      sourceIds: ["research-doc", "mes-trl2024"]
    },
    {
      id: "ice-intervention",
      name: "Ice-sheet & Arctic intervention",
      section: "§8",
      leverage: "In principle the only category that acts on a tipping element directly rather than through warming. In practice the published evidence currently says it does not work, which is why it appears here as a research question rather than a lever.",
      maturity: "TRL 1–2 — small field tests only; the two most recent independent assessments are negative",
      investable: false,
      framing: "break-glass research",
      funding: [
        { amount: 5e6, qualifier: "approximately", stream: "capital", kind: "founder/director commitment", holder: "Real Ice", asOf: "2026-07", badge: "announced" },
        { amount: 13e6, qualifier: "approximately", stream: "grant", kind: "public research grant to a consortium — the largest single award in the UK's ≈$75M geoengineering programme", holder: "Real Ice research consortium", asOf: "2025", badge: "deployed-grants", note: "awarded to a research group Real Ice belongs to, not to the company alone" },
        { amount: 1.1e6, qualifier: "approximately", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Arctic Reflections", asOf: "2026-07", badge: "announced" },
        { amount: null, stream: "grant", kind: "nonprofit research fund", holder: "Ocean Visions (Arctic Sea Ice research fund and road maps)", asOf: "2026-07", badge: "verified" }
      ],
      /* v1 quoted a specific thickness gain (in cm) here, attributed to "Science 2024". That
         figure could not be traced to a citation we are confident in, so the result is stated
         qualitatively instead of carrying an unsourced number. Do not reinstate a figure here
         without adding a real dated source to meta.sources. */
      delivered: "Field trials have been run at Cambridge Bay, Nunavut (Real Ice) and in Svalbard and Newfoundland (Arctic Reflections). Real Ice's stated aspiration is to refreeze ≈1M km², and it envisions \"cooling credits.\" No trial has yet demonstrated a winter thickness gain that survives the following melt season — that remains the open question, and it is what the negative assessments below turn on.",
      caveat: "In Oct 2024 a preprint by 42 glaciologists condemned ice-thickening and polar geoengineering as infeasible and dangerous; a Sept 2025 study concluded that high-profile interventions are not viable and may cause harm, each costing ≥$10B. Present this as break-glass research with a stated exit, never as an investable commercial category. The low gapScore here is not a claim that the category is well funded — it is a refusal to score a funding gap on an intervention whose feasibility is currently being falsified.",
      gapScore: 2,
      sourceIds: ["research-doc", "ice-negative2024", "ice-negative2025"]
    },
    {
      id: "clean-firm-power",
      name: "Clean firm power (enhanced geothermal)",
      section: "§9",
      leverage: "Acts on the master lever — peak warming — by displacing the fossil generation that removal technologies are otherwise paid to clean up after. Firm, dispatchable, land-light, and the only category in this list that has cleared a conventional bankability test.",
      maturity: "TRL 8–9 — commercially operating, project-financeable, fully contracted offtake",
      funding: [
        { amount: 1.5e9, qualifier: "approximately", stream: "capital", cumulative: true, kind: "cumulative private capital raised pre-IPO", holder: "Fervo Energy", asOf: "2025-12", badge: "announced", note: "contains the Series E below and earlier unitemised rounds" },
        { amount: 462e6, stream: "capital", withinCumulative: "Fervo Energy", kind: "venture (Series E)", holder: "Fervo Energy — Series E", asOf: "2025-12", badge: "announced", note: "led by B Capital with Google; included in the ≈$1.5B pre-IPO total above" },
        { amount: 2.2e9, qualifier: "approximately", stream: "capital", kind: "IPO gross proceeds (Nasdaq: FRVO, $27.00/share)", holder: "Fervo Energy — IPO", asOf: "2026-05", badge: "verified", note: "additional to the pre-IPO private total, not contained in it" },
        { amount: 421e6, qualifier: "approximately", stream: "capital", kind: "non-recourse project debt (closed)", holder: "Fervo Energy — Cape Station Phase I debt", asOf: "2026-05", badge: "verified", note: "led by Barclays, BBVA, HSBC, MUFG, Société Générale; the first non-recourse project financing for an enhanced-geothermal project globally. Project-level debt, additional to corporate equity." }
      ],
      delivered: "Cape Station (Utah): first 100 MW in 2026, scaling to 500 MW by 2028, permitted to 2 GW, with fully contracted PPAs to Southern California Edison and Shell Energy. Technology is horizontal drilling plus fibre-optic sensing borrowed from shale.",
      caveat: "Well capitalised — included as the counterexample that proves frontier climate technology can become bankable, not as an underfunded case. Adjacent categories (long-duration storage, industrial heat, fusion) are earlier and thinner.",
      gapScore: 1,
      sourceIds: ["research-doc"]
    },
    {
      id: "cement-steel",
      name: "Low-carbon cement & steel",
      section: "§9",
      leverage: "Cement and steel are roughly 15% of global CO₂ between them, and the emissions are chemical rather than energetic — you cannot decarbonise them by changing the power source alone. Electrochemical routes attack the reaction itself.",
      maturity: "TRL 6–7 — pilot production demonstrated, first commercial plants pending finance",
      funding: [
        { amount: 200e6, qualifier: "at-least", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Sublime Systems", asOf: "2026-07", badge: "announced", note: "strategic investors include Holcim, CRH, Siam Cement" },
        { amount: 500e6, qualifier: "at-least", stream: "capital", cumulative: true, kind: "venture (cumulative)", holder: "Boston Metal", asOf: "2026-07", badge: "announced", note: "backed by Breakthrough Energy Ventures and ArcelorMittal; contains the Tata Steel round below" },
        { amount: 75e6, stream: "capital", withinCumulative: "Boston Metal", kind: "venture (strategic, Tata Steel)", holder: "Boston Metal — Tata Steel round", asOf: "2026", badge: "announced", note: "included in the >$500M cumulative above" },
        { amount: 378e6, stream: "target", kind: "demo-plant capital being sought — a target, not money raised", holder: "Brimstone — demo plant", asOf: "2026-07", badge: "announced", note: "never counts toward capital raised; the source says Brimstone is raising for a $378M demo plant, not that it has closed it" }
      ],
      delivered: "Boston Metal produced 1+ ton of steel/iron at pilot scale via Molten Oxide Electrolysis (2025), with a commercial plant in Brazil focused on critical metals. Sublime Systems holds a Microsoft offtake of up to 622,500 tonnes; Brimstone holds an Amazon offtake and co-produces alumina and critical minerals.",
      policyRisk: "DOE rescinded Sublime's $87M grant in 2025, pausing the Holyoke plant and forcing a 10% layoff; Brimstone lost a $189M DOE award the same year. Strong technology, real and current policy risk — these companies de-risk if awards are restored or private offtakes cover the financing gap.",
      caveat: "Huge addressable emissions, but the binding constraint is first-plant finance rather than science, and US policy just removed a chunk of it.",
      gapScore: 2,
      sourceIds: ["research-doc", "doe2025"]
    }
  ],

  /* ---------------------------------------------------------------------------
     COMPANIES — staged by conviction, per the research doc's Recommendations.
     `keyFact.badge` uses the same vocabulary as funding badges so that nothing
     announced can be rendered as something delivered.
     --------------------------------------------------------------------------- */
  companies: {
    tier1Label: "Biggest impact × proven commercial viability",
    tier2Label: "High impact, credible, still scaling",
    tier3Label: "Frontier / underfunded / pre-commercial — high-leverage but early",

    tier1: [
      { name: "Fervo Energy", category: "clean-firm-power", country: "US",
        oneLiner: "Enhanced geothermal using horizontal drilling and fibre-optic sensing — the clearest bankability proof-point in frontier climate technology.",
        keyFact: { text: "IPO'd on Nasdaq (FRVO) on 14 May 2026 raising ≈$2.2B gross at $27.00/share, and closed ≈$421M in non-recourse project debt for Cape Station Phase I — the first such financing for an enhanced-geothermal project globally.", badge: "verified", asOf: "2026-05" } },
      { name: "Exomad Green", category: "biochar", country: "Bolivia",
        oneLiner: "World's largest biochar producer, converting forestry residues to durable carbon via pyrolysis.",
        keyFact: { text: "Over 320,000 tonnes delivered cumulatively; Microsoft signed the largest biochar carbon-removal deal in history by volume — at least 1.24M tonnes over 10 years. Annual run-rate is disputed (company ≈260,000 t/yr vs S&P Global ≈120,000 mtCO₂e/yr).", badge: "delivered", asOf: "2025-05" } },
      { name: "Terradot", category: "erw", country: "US / Brazil",
        oneLiner: "Enhanced rock weathering on Brazilian farmland, launched out of Stanford.",
        keyFact: { text: "$58.2M raised (Google, Microsoft Climate Innovation Fund, John Doerr) with ≈300,000 tonnes contracted, including Google's 200,000-tonne purchase; 48,000+ tonnes of rock spread over 1,800 hectares. Acquired Eion (Feb 2026).", badge: "announced", asOf: "2026-02" } },
      { name: "Lithos Carbon", category: "erw", country: "US",
        oneLiner: "Basalt on US farmland with soil-sampling MRV.",
        keyFact: { text: "Delivered 5,160 registry-certified tonnes in Dec 2025 — described as the largest ERW issuance to date — against an 11,400-tonne Microsoft deal; ≈$63.4M raised.", badge: "delivered", asOf: "2025-12" } },
      { name: "Climeworks", category: "dac", country: "Switzerland",
        oneLiner: "Solid-sorbent direct air capture; operates Orca and Mammoth in Iceland.",
        keyFact: { text: "Leads DAC deliveries at ≈81% of all DAC delivered, but on tiny absolute volumes and at costs near ≈$1,000/t; raised $162M late-stage in Q3 2025 and laid off more than 10% of staff the same year.", badge: "delivered", asOf: "2025-Q3" } },
      { name: "1PointFive / Carbon Engineering", category: "dac", country: "US",
        oneLiner: "Liquid-solvent DAC; an Occidental subsidiary building the largest plant in the world.",
        keyFact: { text: "Stratos (West Texas) is designed for 500,000 t/yr; leads DAC credits sold at ≈52% with Microsoft and Airbus offtakes. Note fossil-industry ownership and potential enhanced-oil-recovery use.", badge: "announced", asOf: "2025-H1" } },
      { name: "Heirloom Carbon", category: "dac", country: "US",
        oneLiner: "Accelerated limestone mineralisation DAC, targeting sub-$100/t at scale.",
        keyFact: { text: "$150M Series B (Dec 2024, co-led by Future Positive and Lowercarbon Capital) bringing the total above $200M; two Louisiana plants planned at ≈320,000 t/yr combined, with a Microsoft offtake up to 315,000 t.", badge: "announced", asOf: "2024-12" } },
      { name: "LanzaTech", category: "microbial-electro", country: "US",
        oneLiner: "Gas fermentation converting industrial CO/CO₂ into ethanol and chemicals — the commercial leader in carbon-to-products.",
        keyFact: { text: "Six commercial facilities and 30M+ gallons of ethanol produced since 2021; went public via SPAC in Feb 2023 at a ≈$2B valuation. Faces profitability pressure and grant-dependency risk.", badge: "verified", asOf: "2023-02" } },
      { name: "Sublime Systems", category: "cement-steel", country: "US",
        oneLiner: "Electrochemical \"true-zero\" cement, spun out of MIT.",
        keyFact: { text: "More than $200M raised (Holcim, CRH, Siam Cement) with a Microsoft offtake up to 622,500 tonnes — but DOE rescinded its $87M grant in 2025, pausing the Holyoke plant and forcing a 10% layoff.", badge: "announced", asOf: "2025" } },
      { name: "Boston Metal", category: "cement-steel", country: "US",
        oneLiner: "Molten Oxide Electrolysis for zero-carbon steel and critical metals.",
        keyFact: { text: "More than $500M raised including $75M in 2026 with Tata Steel; produced 1+ ton of steel/iron at pilot scale in 2025, with a Brazilian commercial plant focused on critical metals.", badge: "announced", asOf: "2026" } }
    ],

    tier2: [
      { name: "Ebb Carbon", category: "ocean-cdr", country: "US",
        oneLiner: "Electrochemical ocean alkalinity enhancement, splitting seawater into acid and base streams.",
        keyFact: { text: "Agreement with Microsoft to remove up to 350,000 tonnes over 10 years (Oct 2024) — the largest marine CDR commitment to date — with an initial delivery of 1,333 tonnes. Project Macoma pilot began operations in 2025.", badge: "delivered", asOf: "2024-10" } },
      { name: "Captura", category: "ocean-cdr", country: "US",
        oneLiner: "Direct ocean capture via bipolar-membrane electrodialysis, a Caltech spin-out.",
        keyFact: { text: "Series A expanded to $45.3M plus a first close of a $12.5M Series B in June 2026 led by Equinor Ventures; 1,000-tonne-capacity pilot plants in LA and Hawaii.", badge: "announced", asOf: "2026-06" } },
      { name: "Mati Carbon", category: "erw", country: "US / India",
        oneLiner: "Basalt on smallholder farms in India and Africa, nonprofit-controlled via Swaniti Initiative.",
        keyFact: { text: "Won the $50M XPRIZE Carbon Removal grand prize (April 2025) on a tech-heavy MRV and smallholder-cohort model; buyers include Stripe, Shopify and Siemens.", badge: "verified", asOf: "2025-04" } },
      { name: "Windfall Bio", category: "methane-removal", country: "US",
        oneLiner: "Methane-eating microbes (\"mems\") converting methane from any source into organic fertiliser plus carbon credits.",
        keyFact: { text: "≈$37M raised ($9M seed Mar 2023 + $28M Series A Apr 2024, led by Prelude Ventures with Amazon Climate Pledge Fund and Breakthrough Energy Ventures); pilot-stage, targeting dilute ventilation-air methane at 0.2–1%. TIME Best Invention 2024.", badge: "announced", asOf: "2024-04" } },
      { name: "Rumin8", category: "methane-removal", country: "Australia",
        oneLiner: "Synthetic anti-methanogenic compounds for enteric methane — the furthest along in a high-impact agricultural niche.",
        keyFact: { text: "≈$30.8M raised (Breakthrough Energy Ventures, Andrew Forrest); trials show up to ≈86–95% methane reduction and regulatory approval is secured in Brazil.", badge: "announced", asOf: "2026-07" } }
    ],

    tier3: [
      { name: "Ambient Carbon", category: "methane-removal", country: "Denmark",
        oneLiner: "\"MEPS\" — UV plus chlorine photochemistry destroying dilute methane at point sources; a University of Copenhagen spin-out.",
        keyFact: { text: "No disclosed venture or equity funding — grant-funded only. Delivered a 40-ft container pilot on a 250-cow dairy barn removing up to 90% of methane (2025); a Danone-funded ≈30× scale-up in Indiana is announced, not built.", badge: "delivered", asOf: "2025",
          assertedAbsence: true,
          sourceQuote: "No disclosed venture/equity funding — grant-funded only (Innovation Fund Denmark via AgriFoodTure/PERMA project; partners include Arla Foods)" } },
      { name: "Planetary Technologies", category: "ocean-cdr", country: "Canada",
        oneLiner: "Magnesium-hydroxide ocean alkalinity enhancement out of Nova Scotia.",
        keyFact: { text: "Delivered the first net OAE credits — 138 tonnes to Shopify and Stripe (Nov 2024) — against ≈$14.6M raised and a $31M Frontier-facilitated offtake; won a $1M XPRIZE XFACTOR award in 2025.", badge: "delivered", asOf: "2024-11" } },
      { name: "Real Ice / Arctic Reflections", category: "ice-intervention", country: "UK / Netherlands",
        oneLiner: "Sea-ice thickening via pumping — presented here as contested research, not as an investable category.",
        investable: false,
        framing: "contested research",
        keyFact: { text: "Real Ice directors committed ≈$5M and its research group received the largest grant (≈$13M) in the UK's ≈$75M geoengineering programme (2025); Arctic Reflections has raised ≈$1.1M. Against this, an Oct 2024 preprint by 42 glaciologists called ice-thickening infeasible and dangerous, and a Sept 2025 study found high-profile interventions not viable and potentially harmful at ≥$10B each.", badge: "announced", asOf: "2025-09" } },
      { name: "Microbial electrosynthesis (field, not a company)", category: "microbial-electro", country: "global academic",
        oneLiner: "CO₂ plus electricity to carboxylic acids via biofilms on cathodes — a research frontier, listed for honesty about its stage.",
        investable: false,
        framing: "research frontier",
        keyFact: { text: "Assessed at TRL 3/4 in peer-reviewed literature (Trends in Biotechnology, 2024): lab scale, requiring process optimisation before an industrial prototype. No disclosed commercial funding at scale.", badge: "verified", asOf: "2024" } }
    ]
  },

  /* ---------------------------------------------------------------------------
     HYPOTHESES — Act III, and the only original argument on this site.
     Each is a falsifiable claim with concrete kill criteria and an honest TRL.
     H9 and H10 carry `investable: false` because the honest version of each is
     a public-good research milestone, not a company to back.
     --------------------------------------------------------------------------- */
  hypotheses: [
    {
      id: "H1",
      claim: "Point-source destruction of sub-1% methane streams (dairy ventilation, coal-mine VAM) can reach <$50/tCO₂e-eq abated.",
      mechanism: "UV-chlorine photochemistry (MEPS) and methanotroph biofilters both operate at dilute concentrations; costs are dominated by air-handling energy, which falls with contact-area engineering rather than exotic inputs.",
      whyNow: "Methane is ≈30% of the warming rise since the industrial era yet removal is the least-funded category in this dataset; its 20-year leverage is 84–87× CO₂.",
      killCriteria: "Energy cost per tonne CO₂e-eq remains >3× target after two full design iterations at ≥250-cow-barn scale; OR chlorine byproduct toxicity fails environmental review at any pilot.",
      validation: "One site-year at a commercial dairy or VAM shaft with third-party-verified ≥80% destruction and all-in cost <$150/tCO₂e-eq on a credible path to $50.",
      maturity: "TRL 4–5 (point-source)",
      nearestActors: ["Ambient Carbon", "Windfall Bio"],
      relatedInterventions: ["methane-removal"],
      sourceIds: ["research-doc", "iea-methane", "ipccar6"]
    },
    {
      id: "H2",
      claim: "MRV cost per enhanced-rock-weathering credit can fall roughly 10× by moving from per-parcel soil sampling to a calibrated model anchored by sparse cohort sampling — and that compression, not rock supply, is what unlocks smallholder farmland as the largest ERW resource.",
      mechanism: "ERW cost structure is dominated by measurement, not material: basalt fines are an existing quarry by-product and spreading uses existing agricultural equipment. Soil-sampling MRV scales with the number of fields rather than the tonnage, which penalises small parcels hardest. A hybrid approach — a calibrated weathering model anchored by a statistically designed sparse sampling network across a pooled cohort — moves cost from per-parcel to per-cohort, and smallholdings are exactly where the per-parcel penalty bites.",
      whyNow: "Mati Carbon won the $50M XPRIZE Carbon Removal grand prize (April 2025) on precisely a tech-heavy-MRV, smallholder-cohort model, and Lithos delivered 5,160 registry-certified tonnes in Dec 2025 — the largest ERW issuance to date. Both the model and the registry path now have live reference points, while CarbonPlan still notes experimental removal estimates varying by four orders of magnitude. That spread is the gap this compression has to close.",
      killCriteria: "Modelled removal diverges from measured removal beyond the registry's stated tolerance in two or more distinct geographies (e.g. Brazilian oxisols and Indian alluvium) after a full crop cycle in each; OR a registry declines pooled-cohort sampling and requires per-parcel measurement, which restores the cost floor and ends the thesis.",
      validation: "One registry-issued cohort of ≥1,000 smallholder parcels with all-in MRV cost ≤$15/tonne and model-vs-measured agreement inside registry tolerance in at least two geographies.",
      maturity: "TRL 5–6 (ERW deployment is commercial; the cohort MRV methodology is not settled)",
      nearestActors: ["Mati Carbon", "Lithos Carbon", "Terradot", "InPlanet"],
      relatedInterventions: ["erw"],
      sourceIds: ["research-doc", "carbonplan", "xprize2025"]
    },
    {
      id: "H3",
      claim: "Statistical early-warning signals for tipping elements are worth more as priced risk data to insurers and sovereign lenders than as scientific publications — and selling them that way is the fastest available route to funding sustained observation of the systems in this atlas.",
      mechanism: "Critical slowing down — rising autocorrelation and variance in a system's own observables — is a generic property of systems approaching a bifurcation. The AMOC literature already applies it to sea-surface-temperature fingerprints; the same estimators run on Barents winter ice extent, Amazon dry-season length, or subpolar gyre convection depth. Insurers and sovereign lenders already pay for hazard data with weaker physical grounding. The product is a dated, revisable regional probability surface with an explicit uncertainty budget, not a collapse date.",
      whyNow: "AMOC timing is genuinely contested and the disagreement is itself the product: Ditlevsen & Ditlevsen 2023 give a statistical central estimate near 2057 (range 2025–2095), van Westen et al. 2024 find the system \"on tipping course\", IPCC AR6 judges full collapse unlikely before 2100, and Ben-Yami et al. 2024 argue the observational record is too short to date it at all. A four-way spread across a 75-year window is exactly what a risk market prices, and nobody is currently selling it as such.",
      killCriteria: "In a pre-registered backtest on withheld decades, the indicator adds no skill over named incumbent catastrophe or sovereign-risk indices at any lead time an underwriter would use (≤10 yr); OR indicator estimates flip sign or lead time under reasonable detrending and window choices, which would mean the signal is a preprocessing artefact rather than a physical one.",
      validation: "One paying insurance or sovereign-risk client renewing into a second year, plus a published backtest showing positive skill against a named incumbent index on withheld data.",
      maturity: "TRL 3–4 (research-grade estimators exist; there is no productised, revision-controlled data service)",
      nearestActors: ["Potsdam Institute (PIK) AMOC groups", "Global Tipping Points Report consortium", "climate-risk raters such as Sylvera"],
      relatedInterventions: [],
      sourceIds: ["armstrong2022", "ditlevsen2023", "vanwesten2024", "benyami2024", "gtp2025"]
    },
    {
      id: "H4",
      claim: "Microbial electrosynthesis reaches its first externally validated techno-economic case on a high-value C4+ carboxylic acid — not on acetate and not on fuels — because only a product priced above roughly $1,500/t tolerates achievable faradaic efficiency and current density.",
      mechanism: "MES economics reduce to three terms: faradaic efficiency into the target molecule, areal current density, and product price. Acetate and methane sit at commodity prices that demand efficiencies and densities MES has never demonstrated. Chain-elongated products (butyrate, caproate) carry specialty prices, so identical reactor performance clears the electricity cost floor. The unlock is therefore product selection and downstream separation, not a step change in the biofilm.",
      whyNow: "Peer-reviewed assessment (Trends in Biotechnology, 2024) places MES at TRL 3/4 — lab scale, needing process optimisation before an industrial prototype — while gas fermentation in the same category is fully commercial (LanzaTech: six facilities, 30M+ gallons of ethanol since 2021). The distance between those two is a product-selection gap at least as much as a biology gap, and no published validated TEA says so.",
      killCriteria: "Faradaic efficiency into the target product multiplied by product price stays below delivered industrial electricity cost per electron over a continuous 1,000-hour run; OR downstream separation energy for dilute C4+ acids exceeds 40% of product value at ≥100 L scale, which no product price rescues.",
      validation: "A third-party-reviewed techno-economic assessment built on ≥1,000 hours of continuous operation at ≥100 L, with ≥60% faradaic efficiency to a single C4+ product and positive gross margin at industrial power prices.",
      maturity: "TRL 3–4 today (Trends in Biotechnology, 2024); this hypothesis is a claim about reaching TRL 5–6, and nothing more",
      nearestActors: ["academic MES groups", "LanzaTech (adjacent gas fermentation)", "Dioxide Materials", "Twelve"],
      relatedInterventions: ["microbial-electro"],
      sourceIds: ["research-doc", "mes-trl2024"]
    },
    {
      id: "H5",
      claim: "Continuous water-table telemetry, not satellite imagery, is the binding constraint on peatland carbon credits — and a telemetry layer sold as shared infrastructure across many projects can pay for itself at roughly 1,000 hectares.",
      mechanism: "Peatland emissions are close to a monotonic function of mean annual water-table depth, which is why rewetting works at all. Satellites see surface wetness and vegetation, not the water table, so projects fall back on modelled proxies and buyers discount them accordingly. Dense in-situ dipwell telemetry converts a modelled estimate into a measured one. The economics only close if hardware, calibration and data handling are amortised across a portfolio rather than bought project by project.",
      whyNow: "The blue-carbon and peatland market is tiny and MRV-starved — roughly 81 projects existed as of Oct 2025 but only about 10 were actively issuing credits — and the S&P Global blue carbon assessment hit a record $29.30/tCO₂e in Aug 2025 precisely because rigorous MRV is scarce and costly. The UK IUCN Peatland Code (~361 projects, ~52,000 ha as of mid-2025) is a ready installed base, and aeco is already rewetting European agricultural peatlands with continuous water-level MRV.",
      killCriteria: "The verified price premium on telemetry-backed peatland credits is smaller than amortised sensor plus data cost per tonne at 1,000 ha across two full monitoring years; OR a registry accepts modelled water tables at parity with measured ones, which removes the premium the hardware is paid from.",
      validation: "1,000 ha under continuous telemetry for two years, a registry-recognised methodology upgrade that depends on it, and a documented per-tonne price premium exceeding amortised sensing cost.",
      maturity: "TRL 6–7 (sensing hardware is mature; the credit-grade methodology and the shared-infrastructure business model are not)",
      nearestActors: ["aeco", "Sylvera", "UK IUCN Peatland Code projects", "MoorFutures"],
      relatedInterventions: ["blue-carbon-peatland"],
      sourceIds: ["research-doc", "spglobal2025", "iucn-peatland"]
    },
    {
      id: "H6",
      claim: "Biochar's remaining price discount is a permanence-variance problem, not a volume problem: an inline production-quality assay tied to a per-batch permanence band is worth more per tonne than any further increase in pyrolysis capacity.",
      mechanism: "Biochar permanence scales with the aromatic condensation of its carbon, which is set by peak pyrolysis temperature and residence time and varies batch to batch with feedstock moisture and composition. Registries currently apply conservative portfolio-level permanence factors, so every producer is effectively priced at its worst credible batch. An inline proxy — organic H:C ratio calibrated against reference oxidation — issued per batch lets good batches be priced as good batches, and that repricing is where the margin sits.",
      whyNow: "Biochar is the most-delivered durable CDR category by volume: Exomad Green alone has delivered over 320,000 tonnes and signed the largest biochar deal in history with Microsoft (at least 1.24M tonnes over 10 years, May 2025). Meanwhile the record still says plainly that permanence depends on production quality and that Puro and Isometric protocols are maturing. Delivered volume has outrun assurance, and Exomad's own unresolved run-rate conflict (company ≈260,000 t/yr vs S&P ≈120,000 mtCO₂e/yr) shows how thin the measurement layer still is.",
      killCriteria: "Inline assay-to-reference agreement stays worse than ±20% on permanence-relevant carbon across three distinct feedstocks; OR a registry declines per-batch banding and retains a single portfolio permanence factor, which erases the price signal the assay is sold on.",
      validation: "A registry-approved per-batch permanence band in commercial use at ≥50,000 t/yr, with documented assay-to-reference agreement inside ±20% on three feedstocks.",
      maturity: "TRL 6–7 (production is commercial at scale; per-batch assurance instrumentation is early)",
      nearestActors: ["Exomad Green", "Charm Industrial", "Varaha", "Puro.earth", "Isometric"],
      relatedInterventions: ["biochar"],
      sourceIds: ["research-doc", "puro", "spglobal2025"]
    },
    {
      id: "H7",
      claim: "Ocean alkalinity enhancement will be gated by attribution rather than chemistry, and whoever makes plume attribution governance-grade captures more value than whoever adds the alkalinity.",
      mechanism: "The chemistry is well understood: added alkalinity shifts carbonate speciation and the ocean takes up more CO₂, stored as bicarbonate for millennia. The measurement problem is that the resulting flux is a small perturbation on a large, noisy, advecting background, and the plume dilutes below detection within kilometres. Defensible attribution therefore needs coupled tracer-plus-model machinery with an explicit uncertainty budget — which is shared infrastructure, not a per-operator asset, and is priced accordingly.",
      whyNow: "Ebb Carbon's Microsoft agreement — up to 350,000 tonnes over 10 years (Oct 2024) — is the largest marine CDR commitment to date, yet initial delivery was 1,333 tonnes, and Planetary Technologies' first net OAE credits totalled 138 tonnes to Shopify and Stripe (Nov 2024). Ocean scientists have simultaneously called for caution or halts on some open-ocean projects. Contracted volume runs two to three orders of magnitude ahead of verified delivery, and MRV is the term doing the gating.",
      killCriteria: "Plume-attributed uptake uncertainty remains above ±50% of claimed tonnage after two full field seasons at a single site; OR a regulator or registry requires per-discharge in-situ verification at a sampling density whose cost per tonne exceeds the credit price, which closes the unit economics regardless of the science.",
      validation: "One site with two field seasons of tracer-anchored attribution at ≤±25% uncertainty on ≥10,000 tonnes, accepted in a published registry methodology.",
      maturity: "TRL 4–5 (pilots operating; governance-grade MRV not established)",
      nearestActors: ["Ebb Carbon", "Planetary Technologies", "Captura", "Equatic", "Vesta"],
      relatedInterventions: ["ocean-cdr"],
      sourceIds: ["research-doc"]
    },
    {
      id: "H8",
      claim: "Enteric methane inhibition is a delivery problem rather than a molecule problem: the compounds already achieve large reductions in controlled feeding, so the unsolved and much larger prize is a slow-release route that works on pasture-grazed cattle, which are the majority of the global herd and never see a daily ration.",
      mechanism: "Bovaer (3-NOP), Asparagopsis-derived bromoform and synthetic anti-methanogenics all act in the rumen on the methyl-coenzyme M reductase step, and all currently depend on daily mixed rations — which means feedlots and dairy parlours. Pasture systems have no daily delivery vehicle, so the same active compound needs a rumen bolus or slow-release matrix that holds an effective concentration for months against variable intake, plus enough dose-retention evidence that a credit methodology can assume the animal actually received it.",
      whyNow: "Rumin8 (≈$30.8M raised) reports up to ≈86–95% methane reduction in trials and has secured regulatory approval in Brazil — a pasture-dominated herd — while Number 8 Bio is explicitly building a slow-release bolus alongside its feed additive. DSM-firmenich's Bovaer is the EU-approved incumbent at ≈30% reduction but remains ration-dependent. The active compounds have outrun the delivery route, and the delivery route is where the tonnage is.",
      killCriteria: "Dose retention — animals holding an effective concentration across the intended interval — stays below 60% in on-pasture trials across two herds; OR measured on-pasture reduction falls below 20%, at which point credit revenue no longer covers per-animal delivery cost.",
      validation: "Two on-pasture herds of ≥500 head each, with ≥60% dose retention over ≥90 days and third-party-measured ≥30% enteric methane reduction, under a credit methodology that accepts the delivery assumption.",
      maturity: "TRL 4–6 (additives are approved and commercial in ration systems; pasture delivery is pre-commercial)",
      nearestActors: ["Rumin8", "Number 8 Bio", "Symbrosia", "DSM-firmenich (Bovaer)"],
      relatedInterventions: ["methane-removal"],
      sourceIds: ["research-doc", "iea-methane"]
    },
    {
      id: "H9",
      investable: false,
      framing: "research milestone",
      claim: "A governed open-atmosphere methane removal field trial — pre-registered, independently monitored, with net climate benefit and side-effect accounting published whatever the result — is the single measurement that would either open or close the highest-leverage category in this dataset. It is a public-good research milestone, not a company to fund.",
      mechanism: "Iron-salt aerosol and related routes aim to accelerate the natural tropospheric chlorine chemistry that oxidises methane. The mechanism is plausible in the laboratory and in models but has never been isolated in the open atmosphere, where any signal must be separated from transport and background variability, and where the same chlorine chemistry has candidate side effects on ozone and aerosol composition. Only a designed, monitored release with a pre-committed analysis plan can distinguish \"works\" from \"unmeasurable\".",
      whyNow: "Methane is responsible for nearly 30% of the rise in global average temperature since the Industrial Revolution (IEA Global Methane Tracker) with a 20-year warming potential of ≈84–87× CO₂ (IPCC), yet open-atmosphere removal remains TRL 1–3 and the record is explicit that commercialisation is \"way beyond what the science yet supports\". Spark Climate Solutions has deployed more than $8M across more than 27 research grants, and for-profits in the space (Bennu, Atmospheric Methane Removal AG) have delivered nothing in the field — AMR even voted to become non-profit-oriented in Oct 2024. The field has funders and hypotheses and no field measurement.",
      killCriteria: "The trial cannot resolve a methane-oxidation enhancement distinguishable from background transport at achievable release rates — i.e. the required instrument sensitivity does not exist; OR modelled or measured ozone and chlorine side effects exceed the pre-registered net-benefit threshold, in which case the category should be publicly closed rather than quietly iterated.",
      validation: "One pre-registered, permitted, independently monitored open-atmosphere trial with results published either way, including a net-climate-benefit calculation and an explicit side-effect budget, under a named governance body.",
      maturity: "TRL 1–3 (open atmosphere); no governed field trial has yet been run",
      nearestActors: ["Spark Climate Solutions (nonprofit funder/convener)", "University of Copenhagen", "MIT (Kroll & Fiore)", "Bennu", "Atmospheric Methane Removal AG"],
      relatedInterventions: ["methane-removal"],
      sourceIds: ["research-doc", "iea-methane", "ipccar6"]
    },
    {
      id: "H10",
      investable: false,
      framing: "research milestone",
      claim: "Arctic ice intervention should be treated as a hypothesis the published evidence is currently falsifying, not as an emerging category. The honest research milestone is a pre-registered attempt to reproduce a durable thickening effect, carrying an explicit commitment to abandon the approach if the negative results hold.",
      mechanism: "Sea-ice thickening pumps winter seawater onto the surface to freeze, adding mass before the melt season. The physics working against it is that added surface ice insulates the ice beneath and suppresses basal growth, and that thicker, snow-loaded ice can flood and change its own albedo — so a winter gain need not survive the summer. Whether any winter mass gain does survive is exactly what the field trials have not yet demonstrated, and it is the measurement this milestone turns on.",
      whyNow: "Real Ice's directors have committed ≈$5M and its research group received the largest grant — about $13M — in the UK's roughly $75M geoengineering programme (2025), with field trials at Cambridge Bay; Arctic Reflections has raised ≈$1.1M. Against that, an Oct 2024 preprint by 42 glaciologists condemned ice-thickening and polar geoengineering as infeasible and dangerous, and a Sept 2025 study concluded that high-profile interventions are not viable and may cause harm, each costing $10B or more. Money is arriving while the evidence moves the other way, which is exactly when the framing has to be a research milestone with a stated exit.",
      killCriteria: "Two independent field seasons show no statistically significant end-of-melt-season ice-mass difference between treated and control areas; OR measured cost per km² sustained, extrapolated to a climatically meaningful area, exceeds the ≥$10B-per-intervention figures already published — at which point the approach should be publicly retired rather than rebranded as \"cooling credits\".",
      validation: "A pre-registered multi-season trial with treated and control plots, end-of-melt-season mass balance published either way, and an ecological monitoring record. Success means a durable, replicated, positive net effect — not a winter-only thickness gain.",
      maturity: "TRL 1–2; the two most recent independent assessments are negative",
      nearestActors: ["Real Ice", "Arctic Reflections", "Ocean Visions (research funder)"],
      relatedInterventions: ["ice-intervention"],
      sourceIds: ["research-doc", "ice-negative2024", "ice-negative2025"]
    }
  ],

  media: {} /* filled by Task 2 */
};
