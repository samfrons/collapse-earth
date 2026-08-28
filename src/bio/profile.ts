/**
 * Axial profile through a packed bed — plug flow, implicit per cell.
 *
 * Isothermal. The upstream model also solves an evaporative energy balance per
 * cell; that sub-model is uncalibrated and is not carried here, so the bed is held
 * at a single stated temperature and the caller must say so.
 *
 * Each cell reports `frac` — methane remaining as a fraction of the inlet. That
 * normalisation is the point: this module gives you the *shape*, never a magnitude.
 */

import type { BedState, Biology, Limitation, Medium } from './kinetics';
import { realizedRate } from './kinetics';
import { CH4_MOLAR_MASS, O2_MOLAR_MASS, volFractionToGm3 } from './units';

export interface ProfileOptions {
  readonly inletCh4VolPct: number;
  readonly inletO2VolPct: number;
  readonly bedDepth_m: number;
  readonly vesselDiameter_m: number;
  readonly gasFlow_m3PerH: number;
  readonly cellCount: number;
  readonly temperatureC: number;
  readonly pressurePa?: number;
  readonly moisture: number;
  readonly ph: number;
  readonly nutrient: number;
  readonly biomass_gm3: number;
  readonly biology: Biology;
  readonly medium: Medium;
}

export interface ProfileCell {
  readonly index: number;
  /** Depth into the bed at the cell centre, m. */
  readonly z_m: number;
  /** Methane remaining as a fraction of the inlet. */
  readonly frac: number;
  readonly limitation: Limitation;
}

export interface Profile {
  readonly cells: readonly ProfileCell[];
  readonly outletFrac: number;
  readonly inletCh4_gm3: number;
  /** True if oxygen — not kinetics — capped conversion in any cell. */
  readonly oxygenLimited: boolean;
}

/**
 * NaN propagates silently through this whole function: `Math.max(1, NaN)` is NaN,
 * `dz` becomes NaN, `i < NaN` is false on the first test, and the caller gets
 * `cells: []` with `outletFrac: 1` — a result that looks exactly like a valid inert
 * bed. A DOM value arriving as a string, or a missing field, would read as "the bed
 * does nothing" rather than as an error. So the guard is explicit and loud.
 */
const REQUIRED_FINITE = [
  'cellCount',
  'bedDepth_m',
  'vesselDiameter_m',
  'gasFlow_m3PerH',
] as const satisfies readonly (keyof ProfileOptions)[];

export const solveProfile = (opts: ProfileOptions): Profile => {
  for (const key of REQUIRED_FINITE) {
    const value: number = opts[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`solveProfile: ${key} must be a finite number, got ${value}`);
    }
  }

  const area = Math.PI * (opts.vesselDiameter_m / 2) ** 2;
  const cellCount = Math.max(1, Math.round(opts.cellCount));
  const dz = opts.bedDepth_m / cellCount;
  const velocity_mPerH = area > 0 ? opts.gasFlow_m3PerH / area : 0;
  /** Hours per cell. */
  const residence = velocity_mPerH > 0 ? dz / velocity_mPerH : 0;

  const inletCh4_gm3 = volFractionToGm3(
    opts.inletCh4VolPct / 100,
    CH4_MOLAR_MASS,
    opts.temperatureC,
    opts.pressurePa,
  );
  const inletO2_gm3 = volFractionToGm3(
    opts.inletO2VolPct / 100,
    O2_MOLAR_MASS,
    opts.temperatureC,
    opts.pressurePa,
  );

  let ch4 = inletCh4_gm3;
  let o2 = inletO2_gm3;
  let oxygenLimited = false;
  const cells: ProfileCell[] = [];

  for (let i = 0; i < cellCount; i++) {
    const base: BedState = {
      ch4_gm3: ch4,
      o2_gm3: o2,
      biomass_gm3: opts.biomass_gm3,
      temperatureC: opts.temperatureC,
      moisture: opts.moisture,
      ph: opts.ph,
      nutrient: opts.nutrient,
      biology: opts.biology,
      medium: opts.medium,
    };

    const { limitation } = realizedRate(base);
    let ch4Out = ch4;

    if (residence > 0 && ch4 > 0) {
      // Implicit cell balance: ch4_in − ch4_out = r(ch4_out) · residence. Both
      // terms are monotone in ch4_out, so bisection is safe and cannot produce a
      // negative outlet at any cell count.
      let lo = 0;
      let hi = ch4;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const supply = ch4 - mid - realizedRate({ ...base, ch4_gm3: mid }).rate * residence;
        if (supply > 0) lo = mid;
        else hi = mid;
      }
      ch4Out = (lo + hi) / 2;
    }

    let delta = Math.max(0, ch4 - ch4Out);

    // Oxygen availability caps conversion regardless of kinetics. Uses the
    // full-combustion 2:1 molar ratio, which is the conservative direction: a
    // growing culture diverts carbon to biomass and needs LESS oxygen, so assuming
    // 2:1 can only make oxygen look scarcer than it is.
    //
    // This cap is a numerical safety net, not the primary mechanism. The Monod
    // oxygen term throttles the rate smoothly toward zero as O2 depletes down the
    // bed, so at realistic cell counts the cap never binds; it only engages when a
    // single coarse cell tries to convert more methane than its oxygen allows.
    // Both paths are tested.
    let o2Needed = (delta / CH4_MOLAR_MASS) * 2 * O2_MOLAR_MASS;
    if (o2Needed > o2) {
      oxygenLimited = true;
      delta *= o2 > 0 ? o2 / o2Needed : 0;
      o2Needed = o2;
      ch4Out = ch4 - delta;
    }

    ch4 = Math.max(0, ch4Out);
    o2 = Math.max(0, o2 - o2Needed);

    cells.push({
      index: i,
      z_m: (i + 0.5) * dz,
      frac: inletCh4_gm3 > 0 ? ch4 / inletCh4_gm3 : 0,
      limitation,
    });
  }

  return {
    cells,
    outletFrac: inletCh4_gm3 > 0 ? ch4 / inletCh4_gm3 : 0,
    inletCh4_gm3,
    oxygenLimited,
  };
};
