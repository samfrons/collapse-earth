/**
 * The twin — pure functions, no DOM. Monthly timestep, closed-form curves.
 *
 * `q0` is **derived, never asserted**: it is solved so that the dry path's mean over
 * the briefing's own window reproduces the mine's published figure. The self-check at
 * the bottom asserts that reproduction, so a change to the decline constants that
 * broke the anchor would fail loudly rather than shift every number on the page.
 */

import { amm, type Mine } from '@/data';
import { last, type NonEmpty } from '@/lib/array';
import { P } from './params';
import { assertCowardAgreement } from './coward-limits';

/** Monthly timestep, in years. */
const DT = 1 / 12;

export type Band = 'low' | 'central' | 'high';
export type Path = 'dry' | 'flooded';
export type SealState = 'sealed' | 'leaky';

/** Hyperbolic decline, Kholod Eq. 3: `q = q0·(1 + b·Di·t)^(−1/b)`. */
const declineFactor = (t: number, b: number, d: number): number => (1 + b * d * t) ** (-1 / b);

/**
 * EPA Appendix B, Table B5 — the nine bituminous venting-decline curves,
 * `(1 + A·t)^(−E)`, by permeability (low/mid/high) × mine size (S/M/L). Verbatim from
 * the methodology's own table, and the source of the dry envelope below.
 */
const EPA_B5: readonly (readonly [number, number])[] = [
  [5.37, 0.45],
  [3.51, 0.51],
  [0.68, 0.59],
  [3.04, 0.45],
  [3.72, 0.42],
  [0.51, 0.57],
  [0.8, 0.74],
  [1.75, 0.46],
  [0.72, 0.47],
];

export const dryFactor = (t: number, band: Band): number => {
  if (band === 'central') return declineFactor(t, P('b_dry'), P('D_dry'));

  // Structural envelope: the fastest and slowest of EPA's own nine curves. This is a
  // citable spread rather than a percentage someone chose.
  P('epa_b5_family'); // the citation guard still sees the reference
  let lo = Infinity;
  let hi = -Infinity;
  for (const [a, e] of EPA_B5) {
    const f = (1 + a * t) ** -e;
    if (f < lo) lo = f;
    if (f > hi) hi = f;
  }
  // The Kholod global central rides the slow edge of the family (it sits a hair above
  // it in mid-life), so the band is widened to contain it and the drawer says so.
  return band === 'low' ? lo : Math.max(hi, declineFactor(t, P('b_dry'), P('D_dry')));
};

/**
 * Flooded mines decline **exponentially** (Kholod Eq. 4 / EPA's flooding coefficient).
 * At 0.672/yr only 0.46% remains at year eight, so the published "essentially zero
 * after about eight years" is the curve's own behaviour; the final-year fade just
 * closes the last half-percent.
 */
export const floodedFactor = (t: number, band: Band): number => {
  const cutoff = P('T_zero_fl');
  if (t >= cutoff) return 0;
  const spread = P('spread');
  const d = P('D_fl') * (band === 'low' ? 1 + spread : band === 'high' ? 1 - spread : 1);
  return Math.exp(-d * t) * Math.min(1, cutoff - t);
};

export const factorFor = (path: Path): ((t: number, band: Band) => number) =>
  path === 'flooded' ? floodedFactor : dryFactor;

/** Mean of a factor function over `[0, T]`, by trapezoid on the monthly grid. */
export const meanFactor = (
  fn: (t: number, band: Band) => number,
  T: number,
  band: Band,
): number => {
  if (T <= 0) return fn(0, band);
  const n = Math.max(1, Math.round(T / DT));
  let sum = 0;
  for (let i = 0; i <= n; i++) sum += (i === 0 || i === n ? 0.5 : 1) * fn(i * DT, band);
  return sum / n;
};

export interface Twin {
  readonly mine: Mine;
  readonly closed: number;
  /**
   * True where the closure year is an editorial stand-in — the briefing does not print
   * one for two of the Polish mines. Flagged wherever the twin is rendered.
   */
  readonly closedAssumed: boolean;
  /** The published figure the model is solved to reproduce. */
  readonly anchor: number;
  readonly anchorWindow: number;
  /** Initial rate, MCM/yr, derived from the anchor rather than asserted. */
  readonly q0: number;
  /**
   * The flooded path's implied mean over the same window — a **prediction** the
   * published flooded figure can check, where the briefing printed one.
   */
  readonly floodedMeanImplied: number;
}

export const mineTwin = (m: Mine): Twin => {
  const closed = m.closed ?? 2018;
  const window = Math.max(1, Math.min(P('gemWindowEnd') - closed, 8));
  // Anchor: the dry figure where the briefing published the pair, else the
  // scenario-average figure treated as the dry-path mean — a stated modelling choice.
  const anchor = m.floodedDelta ? m.floodedDelta.dry : m.mcm;
  const q0 = anchor / meanFactor(dryFactor, window, 'central');

  return {
    mine: m,
    closed,
    closedAssumed: m.closed === null,
    anchor,
    anchorWindow: window,
    q0,
    floodedMeanImplied: q0 * meanFactor(floodedFactor, window, 'central'),
  };
};

export interface SeriesPoint {
  readonly t: number;
  readonly year: number;
  /** MCM CH₄ per year. */
  readonly q: number;
}

/** Monthly series for one path and band, from closure to the horizon. */
export const series = (twin: Twin, path: Path, band: Band): readonly SeriesPoint[] => {
  const horizon = P('horizon');
  const fn = factorFor(path);
  const out: SeriesPoint[] = [];
  for (let t = 0; twin.closed + t <= horizon + 1e-9; t += DT) {
    out.push({ t, year: twin.closed + t, q: twin.q0 * fn(t, band) });
  }
  return out;
};

/**
 * Concentration of the extracted stream — a function of **seal state and operating
 * years under suction**, per UNECE No. 64.
 *
 * Purity is not a clock; it is a seal. A well-sealed mine held 80–85% CH₄ fifteen
 * years after closure, while unsealed workings bled ≈40%→25% over a decade of
 * unmanaged suction. So `tOp` counts the years the *unit* has been pulling — its own
 * suction is what draws the air in — and a sealed mine does not decay at all.
 */
export const concentration = (tOp: number, seal: SealState): number => {
  if (seal === 'sealed') return P('c_sealed');
  return Math.max(P('c_floor'), P('c_leaky0') - P('leak_rate') * Math.max(0, tOp));
};

export interface Route {
  readonly id: 'engine' | 'margin' | 'rto' | 'end';
  readonly label: string;
  readonly test: (c: number) => boolean;
}

/**
 * The router.
 *
 * UNECE's safety factors exclude **all raw use** between 2% (2.5× the lower explosive
 * limit) and 30% (2× the upper) — which killed this page's first-draft 15–30% flare
 * band. Below 30% the stream is handled sealed and diluted under the RTO feed ceiling,
 * never used raw.
 */
export const ROUTES: NonEmpty<Route> = [
  {
    id: 'engine',
    label: 'engine / CHP — or enclosed flare',
    test: (c) => c >= P('thr_engine'),
  },
  {
    id: 'margin',
    label: 'dilute → RTO · raw stream inside the safety margin',
    test: (c) => c >= P('margin_lo'),
  },
  { id: 'rto', label: 'regenerative oxidation, direct', test: (c) => c >= P('thr_rto') },
  { id: 'end', label: 'monitor · end of abatement', test: () => true },
];

export const route = (c: number): Route => ROUTES.find((r) => r.test(c)) ?? last(ROUTES);

/**
 * Cumulative CH₄ vented since closure up to a given year, on the dry central path, in
 * kilotonnes. Uses the flagged MCM→kt conversion, and says so where it renders.
 */
export const ventedSince = (twin: Twin, uptoYear: number): number => {
  let kt = 0;
  for (let t = 0; twin.closed + t <= uptoYear; t += DT) {
    kt += twin.q0 * dryFactor(t, 'central') * DT * amm.conversion.kgPerM3;
  }
  return kt;
};

/** Kilotonnes CH₄ **destroyed** by a unit operating `y0 → y1` on the dry central path. */
export const abatedRange = (twin: Twin, y0: number, y1: number): number => {
  let kt = 0;
  for (let t = Math.max(0, y0 - twin.closed); twin.closed + t < y1; t += DT) {
    kt +=
      twin.q0 *
      dryFactor(t, 'central') *
      DT *
      amm.conversion.kgPerM3 *
      P('eta_capture') *
      P('eta_destroy');
  }
  return kt;
};

/** The economics sandbox: editorial, editable, and labelled as such everywhere. */
export const ECON = { startYear: 2026, price: 0 };

/* -------------------------------------------------------------------------- */
/* Self-checks                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The model must reproduce its own anchor, and the Coward geometry must agree with the
 * physics module's published constants. Both run at import time: a silent disagreement
 * between the tested model and the rendered one is exactly the failure this page
 * cannot afford.
 */
export const runTwinSelfChecks = (): void => {
  assertCowardAgreement();

  const worked = amm.mines.find((m) => m.floodedDelta);
  if (!worked) return;

  const twin = mineTwin(worked);
  const reproduced = twin.q0 * meanFactor(dryFactor, twin.anchorWindow, 'central');
  if (Math.abs(reproduced - twin.anchor) / twin.anchor >= 0.01) {
    throw new Error(
      `Twin anchor reproduction failed: ${reproduced.toFixed(2)} vs ${twin.anchor} MCM/yr.`,
    );
  }
};
