/**
 * The twin's parameter block — every constant the specimen-mine model uses.
 *
 * Each entry carries its value, unit, source id, verification state and a note
 * explaining what it is and why it is that number. The model reads constants **only**
 * through {@link P}, which throws on an unsourced key, so there are no literal numbers
 * in model code and no constant without a citation.
 *
 * `editorial` is a legitimate source id for a stated judgment call; everything else
 * must resolve to a real entry in the atlas's source list. Entries with
 * `verified: false` render as PENDING and are listed at load. **The ship gate is zero
 * PENDING stamps.**
 */

import { source, type KnownSourceId } from '@/data';

export interface Parameter {
  readonly value: number;
  readonly unit: string;
  /** A citation id, or the literal `editorial` for a stated judgment call. */
  readonly src: KnownSourceId | 'editorial';
  /** `false` renders a PENDING stamp on every surface the value reaches. */
  readonly verified: boolean;
  readonly note: string;
  /** Exposed in the assumptions pane for the reader to change. */
  readonly editable?: boolean;
}

const PARAMS = {
  /* decline-curve constants — VERIFIED against Kholod et al. 2020 §2.3.3 and
     the US EPA abandoned-mines methodology.
     IMPORTANT — DO NOT "FIX" THESE BACK TO MATCH THE PAPER'S TABLE 1: that
     table is mis-typeset. It prints b=2.017/Di=0.302 in the FLOODED row, but
     the paper's own flooded equation (Eq. 4, exponential) has no b term, and
     EPA — Kholod's stated data source — publishes 0.672 explicitly as the
     FLOODING coefficient (EPA abandoned-mines methodology, Table 3.1:
     "Flooding = Exp(−0.672t)"). Dry mines: hyperbolic Eq. 3,
     q = q0·(1 + b·Di·t)^(−1/b). */
  b_dry: {
    value: 2.017,
    unit: '—',
    src: 'kholod2020',
    verified: true,
    note: 'hyperbolic exponent, dry mine (Kholod Eq. 3; Table 1 row labels corrected against EPA Table 3.1 — see the parameter-block comment)',
  },
  D_dry: {
    value: 0.302,
    unit: '1/yr',
    src: 'kholod2020',
    verified: true,
    note: "initial decline rate, dry mine (implied exponent −0.496 sits inside EPA's venting range of −0.42 to −0.59)",
  },
  D_fl: {
    value: 0.672,
    unit: '1/yr',
    src: 'epa-vam',
    verified: true,
    note: "flooded-mine EXPONENTIAL decline, q = q0·e^(−0.672t) — EPA's curve-fitted flooding coefficient, also Kholod Eq. 4; at 8 years the remaining fraction is 0.46%",
  },
  T_zero_fl: {
    value: 8,
    unit: 'yr',
    src: 'gem2024amm',
    verified: true,
    note: "flooded mines reach 'essentially zero after about eight years' (EPA; GEM applies the same 8-year rule dataset-wide). With the exponential at 0.672/yr this cutoff is cosmetic — 0.46% remains — and the twin fades it to exactly zero over the final year.",
  },
  spread: {
    value: 0.35,
    unit: 'fraction',
    src: 'editorial',
    verified: true,
    note: "±35% envelope on the FLOODED path's decline rate only — EPA publishes a single flooding coefficient, so its spread stays an editorial call. The dry envelope is structural, not scaled: see epa_b5_family.",
  },
  epa_b5_family: {
    value: 9,
    unit: 'curves',
    src: 'epa-vam',
    verified: true,
    note: "the dry envelope is EPA's own Appendix B Table B5 — nine venting-decline curves for BITUMINOUS coal (three permeability classes × three mine sizes), form (1+A·t)^(−E). At each year the band spans the fastest and slowest of the nine: a citable structural spread, replacing the earlier ±35% guess. Central stays Kholod's global pair.",
  },
  horizon: {
    value: 2050,
    unit: 'yr',
    src: 'editorial',
    verified: true,
    note: 'simulation horizon',
  },
  gemWindowEnd: {
    value: 2023,
    unit: 'yr',
    src: 'gem2024amm',
    verified: true,
    note: "GEM's per-mine figures are averages over closure→2023 (the briefing's 2015–2023 window)",
  },

  /* concentration — REBUILT by the verification pass. The literature's claim
     (UNECE No. 64, 2019) is that purity is governed by SEAL QUALITY and
     suction management, NOT by mine age: a well-sealed mine held 80–85% CH₄
     fifteen years after closure (Stillingfleet, p.47), while unsealed Lohberg
     bled ≈40%→25% over a decade of unmanaged suction (Fig. 9.3). The earlier
     time-decay exponent (γ) is DELETED — purity is not a clock, it is a seal.
     Volume stays time-driven (Kholod/EPA); the two are kept separate because
     the source keeps them separate (No. 64, Ch. 8). */
  c_sealed: {
    value: 0.82,
    unit: 'fraction CH₄',
    src: 'unece-amm',
    verified: true,
    editable: true,
    note: "well-sealed anchor: Stillingfleet ran 80–85% CH₄ in 2019, fifteen years post-closure, behind 'an excellent gas tight seal' (No. 64 p.47). Held flat here — no source claims sealed purity decays.",
  },
  c_leaky0: {
    value: 0.4,
    unit: 'fraction CH₄',
    src: 'unece-amm',
    verified: true,
    editable: true,
    note: 'leaky anchor, starting purity: Lohberg ≈40% CH₄ in 2008 as suction began through unsealed shafts (No. 64 Fig. 9.3)',
  },
  leak_rate: {
    value: 0.015,
    unit: 'fraction/yr',
    src: 'unece-amm',
    verified: true,
    editable: true,
    note: "leaky decline under unmanaged suction: Lohberg lost ≈15 points over 2008–2018 (40%→25%). The clock runs on OPERATING years — the unit's own suction pulls the air in.",
  },
  c_floor: {
    value: 0.008,
    unit: 'fraction CH₄',
    src: 'editorial',
    verified: true,
    note: "extrapolation floor below Lohberg's observed range (25%) — the extension past the data is editorial and flagged",
  },

  /* routing thresholds — verified against UNECE BPG (2nd ed., 2016) and EPA
     VAM materials. The research pass KILLED this page's first-draft 15–30%
     flare band: UNECE p.20 rules use of methane-air mixtures unacceptable not
     just inside 5–15% but within safety factors of 2.5× the LEL (2%) and 2×
     the UEL (30%) — so everything between 2% and 30% is handled sealed and
     diluted, never used raw. */
  thr_engine: {
    value: 0.35,
    unit: 'fraction',
    src: 'unece-amm',
    verified: true,
    note: "CHP / power-generation gas-quality requirement >35% CH₄ (UNECE No. 64, Table 4.1). The 2016 BPG's 30% floor is a TRANSPORT limit — moot for a wellhead-mounted unit, so the quality requirement binds. Lohberg's 25% sat below this line, which is why its gensets starved.",
  },
  uel: {
    value: 0.15,
    unit: 'fraction',
    src: 'unece-bpg',
    verified: true,
    note: 'upper explosive limit of methane in air — UNECE BPG p.20',
  },
  lel: {
    value: 0.05,
    unit: 'fraction',
    src: 'unece-bpg',
    verified: true,
    note: 'lower explosive limit of methane in air — UNECE BPG p.20',
  },
  margin_lo: {
    value: 0.02,
    unit: 'fraction',
    src: 'unece-bpg',
    verified: true,
    note: 'the safety-factored floor of the no-use zone: 2.5× LEL (UNECE BPG p.20). Between here and 30%, the stream is diluted below RTO feed levels, never used raw.',
  },
  rto_ceiling: {
    value: 0.015,
    unit: 'fraction',
    src: 'epa-vam',
    verified: true,
    note: "RTO is 'the only commercially operational technology capable of using VAM as a primary fuel at methane concentrations below 1.5 percent' (EPA-430-F-19-023) — the dilution target sits under this",
  },
  thr_rto: {
    value: 0.002,
    unit: 'fraction',
    src: 'unece-bpg',
    verified: true,
    note: "VAM oxidation 'technically feasible at concentrations above 0.20%' (UNECE BPG §6.2.1 p.58) — the autothermal floor",
  },

  mammoth: {
    value: 36,
    unit: 'kt CO₂/yr',
    src: 'research-doc',
    verified: true,
    note: 'Climeworks Mammoth DAC nameplate (Hellisheiði, switched on May 2024) — a GROSS DESIGN TARGET: only 12 of 72 collectors (≈6 kt/yr) were installed at launch. The comparison says nameplate because that is the number DAC quotes for itself.',
  },

  /* economics — an editorial sandbox. Every figure here is an ESTIMATE meant
     to be challenged in the assumptions pane, not a quote. */
  capex_unit: {
    value: 2.5e6,
    unit: 'EUR',
    src: 'editorial',
    verified: true,
    editable: true,
    note: 'installed cost of one containerized unit incl. wellhead works — editorial estimate; challenge it',
  },
  opex_unit: {
    value: 2.5e5,
    unit: 'EUR/yr',
    src: 'editorial',
    verified: true,
    editable: true,
    note: 'operations, maintenance, telemetry per unit-year — editorial estimate',
  },
  eta_capture: {
    value: 0.7,
    unit: 'fraction',
    src: 'editorial',
    verified: true,
    editable: true,
    note: "share of the mine's modelled emissions the sealed wellhead actually intercepts — the biggest editorial number in the economics",
  },
  eta_destroy: {
    value: 0.9,
    unit: 'fraction',
    src: 'acm0008',
    verified: true,
    editable: true,
    note: 'CDM TOOL06 v04.0 default for a monitored enclosed flare (90%; open flare 50%). CARB uses 99.5% for enclosed — a legitimate spread; edit to taste, the default stays conservative',
  },
  project_life: {
    value: 15,
    unit: 'yr',
    src: 'editorial',
    verified: true,
    editable: true,
    note: 'unit service life used for amortisation',
  },
  lhv_m3: {
    value: 35.8,
    unit: 'MJ/m³ CH₄',
    src: 'editorial',
    verified: true,
    note: 'lower heating value of methane at reference conditions — a physical constant, carried here so the energy panel derives rather than asserts',
  },

  /* --- SHEET M-004, the biological route ---------------------------------
     Flammability GEOMETRY, not a fitted model: these five numbers define the
     Coward triangle and nothing about them is tuned. They are asserted equal
     to collapse-bio.v2.js's own COWARD_1952 block at load (bioSelfCheck), so
     the two cannot drift apart silently.

     Note what is NOT here: no q_max, no half-saturation constants, no film
     coefficient. The oxidation kinetics that shade the bed are uncalibrated
     and the sheet renders no absolute performance figure from them, so they
     are deliberately not dignified with parameter-block entries. The one
     performance number the sheet quotes is Limbri's MEASUREMENT, cited as a
     measurement — see cow_ec_measured. */
  cow_lfl: {
    value: 5.0,
    unit: '% v/v CH₄',
    src: 'coward1952',
    verified: true,
    note: "lower flammable limit of methane in air (Bulletin 503). Also the floor UNECE applies its 2.5× safety factor to, giving this page's 2% routing bound",
  },
  cow_ufl: {
    value: 15.0,
    unit: '% v/v CH₄',
    src: 'coward1952',
    verified: true,
    note: "upper flammable limit of methane in air (Bulletin 503). UNECE's 2× factor on this gives the 30% bound",
  },
  /* The nose is the one soft pair on this sheet, and it is deliberately left
     PENDING rather than rounded into false precision. Published limiting-
     oxygen values for methane sit around 11.7–12.2% depending on the diluent
     and the source (Zabetakis's nitrogen figure is nearer 11.7; NFPA 69 rounds
     to 12). WHAT THE SHEET CLAIMS DOES NOT TURN ON IT: swept across
     11.5–12.5% O₂ and 5.6–6.4% CH₄, the sealed-mine dilution path crosses the
     envelope in every case, and the fraction of the blend spent inside it
     moves only between 8.14% and 8.50%. The crossing is structural — air
     dilution drives methane down and oxygen up together, so any gas starting
     above the band must pass through it. Confirm the figures before print;
     do not let the confirmation change the finding. */
  cow_loc: {
    value: 12.1,
    unit: '% v/v O₂',
    src: 'coward1952',
    verified: false,
    note: 'limiting oxygen concentration — the nose of the triangle, below which no methane/air/inert mixture burns at any methane level. Conventional Coward-diagram value; PENDING page-level confirmation, and the finding is insensitive to it across 11.5–12.5% (see the block comment)',
  },
  cow_nose: {
    value: 6.0,
    unit: '% v/v CH₄',
    src: 'coward1952',
    verified: false,
    note: 'methane concentration at the nose, where the two limit lines meet. Conventional value; PENDING alongside cow_loc, and equally non-load-bearing',
  },
  cow_airo2: {
    value: 20.9,
    unit: '% v/v O₂',
    src: 'editorial',
    verified: true,
    note: 'oxygen in dry ambient air — the composition every dilution path runs toward, and why adding air raises O₂ past the LOC',
  },
  cow_ec_measured: {
    value: 27.2,
    unit: 'g CH₄ m⁻³ h⁻¹',
    src: 'limbri2014',
    verified: true,
    note: "MEASURED maximum elimination capacity of a coal-packed biofilter at 1% v/v inlet, 30 °C, EBRT 1.6–19.5 min (27.2 ± 0.66, at 19.7 ± 2.9% removal). Quoted as a measurement, never reproduced by this page's model — the kinetics here are uncalibrated",
  },
  cow_ec_bed: {
    value: 7200,
    unit: 'm³ of bed',
    src: 'limbri2014',
    verified: true,
    note: "the authors' own scale-up: the bed volume their measured performance implies for a 50 m³ s⁻¹ ventilation flow. The honest headline of the whole approach",
  },
  cow_vam_flow: {
    value: 50,
    unit: 'm³ s⁻¹',
    src: 'limbri2014',
    verified: true,
    note: 'the ventilation flow that scale-up is stated against',
  },
  /* --- GROUND-TRUTHING — the twin's own epistemics, in its source's words ---
     UNECE No. 64 §7 is unusually blunt about what geological modelling of an
     abandoned mine is worth without physical testing, and it supplies the
     number. This page models a mine it has never drilled; these two constants
     are the honest scale of that. */
  gt_model_mw: {
    value: 20,
    unit: 'MW electrical',
    src: 'unece-amm',
    verified: true,
    note: 'what extensive geological modelling projected for one UK AMM development — the modelled reserve',
  },
  gt_actual_mw: {
    value: 6,
    unit: 'MWe',
    src: 'unece-amm',
    verified: true,
    note: "what boreholes drilled into the same workings actually found. UNECE's own words: 'the need to combine modelling and physical testing is graphically illustrated.' A 70% overestimate by a competent developer using the same class of tool this page uses",
  },
  amm_suitable_hi: {
    value: 0.2,
    unit: 'fraction of mines',
    src: 'unece-amm',
    verified: true,
    note: "'no more than 10–20 per cent of any group of mines' is expected to suit an AMM project — gassy, drained during operation, and not quickly flooded. The upper bound is carried; the inventory is not the opportunity",
  },

  cow_vam_ch4: {
    value: 0.6,
    unit: '% v/v CH₄',
    src: 'editorial',
    verified: true,
    note: "representative ventilation-air methane, shown on this sheet only as the CONTRAST case — VAM comes from ACTIVE mines' ventilation shafts and has no place in this page's abandoned-mine inventory. Typical VAM runs below 1% and often below 0.5%; UNECE BPG §6.2.1 puts the oxidation floor at 0.20%. Representative value, hence editorial",
  },
} as const satisfies Record<string, Parameter>;

export type ParamKey = keyof typeof PARAMS;

/** Every parameter, for the assumptions pane and the methods list. */
export const parameters: Readonly<Record<ParamKey, Parameter>> = PARAMS;

/**
 * Reader overrides from the assumptions pane. Kept separate from the block above so
 * the shipped defaults survive and "reset" can mean something honest.
 */
const overrides = new Map<ParamKey, number>();

export const override = (key: ParamKey, value: number): void => {
  overrides.set(key, value);
};

export const resetOverrides = (): void => {
  overrides.clear();
};

export const isOverridden = (key: ParamKey): boolean => overrides.has(key);

export const defaultValue = (key: ParamKey): number => parameters[key].value;

/**
 * Read a model constant.
 *
 * Throws on a key whose source does not resolve — which is the whole point: a number
 * without provenance must stop the page rather than quietly render.
 */
export const P = (key: ParamKey): number => {
  const p = parameters[key];
  if (p.src !== 'editorial') source(p.src);
  return overrides.get(key) ?? p.value;
};

/** Keys still awaiting confirmation. The ship gate is an empty list. */
export const pendingKeys = (): readonly ParamKey[] =>
  (Object.keys(parameters) as ParamKey[]).filter((k) => !parameters[k].verified);
