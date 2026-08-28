/**
 * The bioreactor model, held to what its sources actually say.
 *
 * These are invariants, not regression snapshots: each one asserts a property the
 * physics must have, so they stay meaningful if the implementation is rewritten.
 */

import { describe, expect, it } from 'vitest';

import {
  airFractionForTarget,
  assessBlendSafety,
  blendPathCrossesFlammable,
  blendWithAir,
  CH4_MOLAR_MASS,
  classifyMixture,
  COWARD_1952,
  effectiveLowerLimit,
  effectiveUpperLimit,
  gm3ToVolFraction,
  intrinsicRate,
  moistureFactor,
  monod,
  phFactor,
  realizedRate,
  solveProfile,
  temperatureFactor,
  volFractionToGm3,
  type BedState,
} from '../src/bio';

const lim = COWARD_1952;

const biology = {
  vMax_gCH4_per_gVSS_per_h: 0.01,
  kCH4_gm3: 6.6,
  kO2_gm3: 4.0,
  cardinalTemperature: { minC: 2, optC: 30, maxC: 45 },
  phMin: 4.5,
  phOptLo: 6.5,
  phOptHi: 7.5,
  phMax: 9.0,
};

const medium = {
  specificSurfaceArea_m2PerM3: 350,
  gasFilmCoefficient_mPerH: 5,
  moistureResponse: { minTheta: 0.15, optLo: 0.4, optHi: 0.65, maxTheta: 0.95 },
};

const state = (over: Partial<BedState> = {}): BedState => ({
  ch4_gm3: 10,
  o2_gm3: 200,
  biomass_gm3: 5000,
  temperatureC: 25,
  moisture: 0.5,
  ph: 7,
  nutrient: 1,
  biology,
  medium,
  ...over,
});

describe('the Coward triangle', () => {
  it('matches the published limits in air', () => {
    expect(effectiveLowerLimit(lim.airO2, lim)).toBeCloseTo(lim.lflInAir, 6);
    expect(effectiveUpperLimit(lim.airO2, lim)).toBeCloseTo(lim.uflInAir, 6);
  });

  it('closes the window to zero width exactly at the limiting oxygen concentration', () => {
    const lower = effectiveLowerLimit(lim.noseO2, lim);
    const upper = effectiveUpperLimit(lim.noseO2, lim);
    expect(lower).toBeCloseTo(lim.noseCh4, 6);
    expect(upper).toBeCloseTo(lim.noseCh4, 6);
  });

  it('burns nothing below the limiting oxygen concentration, however rich', () => {
    for (const ch4 of [1, 5, 10, 15, 40, 90]) {
      const c = classifyMixture(ch4, lim.noseO2 - 0.5, lim);
      expect(c.flammable).toBe(false);
      expect(c.inertedByOxygen).toBe(true);
    }
  });

  it('is flammable exactly between the limits in air', () => {
    expect(classifyMixture(4.9, lim.airO2, lim).flammable).toBe(false);
    expect(classifyMixture(5.0, lim.airO2, lim).flammable).toBe(true);
    expect(classifyMixture(10, lim.airO2, lim).flammable).toBe(true);
    expect(classifyMixture(15.0, lim.airO2, lim).flammable).toBe(true);
    expect(classifyMixture(15.1, lim.airO2, lim).flammable).toBe(false);
  });
});

describe('the dilution path — the sheet’s whole argument', () => {
  it('finds a crossing for a sealed working diluted toward the bed', () => {
    // 82% CH₄, no oxygen: safe as found, safe at the target, and not safe in between.
    const raw = { ch4VolPct: 82, o2VolPct: 0, co2VolPct: 0 };
    const target = airFractionForTarget(raw.ch4VolPct, 1);
    const path = blendPathCrossesFlammable(raw, target, lim);

    expect(classifyMixture(raw.ch4VolPct, raw.o2VolPct, lim).flammable).toBe(false);
    const end = blendWithAir(raw, target, lim);
    expect(classifyMixture(end.ch4VolPct, end.o2VolPct, lim).flammable).toBe(false);
    expect(path.crosses).toBe(true);
  });

  it('reports edges that are inside the envelope, never just outside it', () => {
    const raw = { ch4VolPct: 82, o2VolPct: 0, co2VolPct: 0 };
    const path = blendPathCrossesFlammable(raw, airFractionForTarget(82, 1), lim);
    for (const f of [path.firstCrossingAirFraction, path.lastCrossingAirFraction]) {
      expect(f).not.toBeNull();
      if (f === null) continue;
      const m = blendWithAir(raw, f, lim);
      expect(classifyMixture(m.ch4VolPct, m.o2VolPct, lim).flammable).toBe(true);
    }
  });

  it('does not depend on drawing resolution for its safety answer', () => {
    const raw = { ch4VolPct: 82, o2VolPct: 0, co2VolPct: 0 };
    const target = airFractionForTarget(82, 1);
    const coarse = blendPathCrossesFlammable(raw, target, lim, 60);
    const fine = blendPathCrossesFlammable(raw, target, lim, 4000);
    expect(coarse.crosses).toBe(fine.crosses);
    expect(coarse.firstCrossingAirFraction).toBeCloseTo(fine.firstCrossingAirFraction ?? 0, 4);
  });

  it('adds no air to a stream already under the target', () => {
    expect(airFractionForTarget(0.6, 1)).toBe(0);
    expect(airFractionForTarget(0, 1)).toBe(0);
  });

  it('refuses to assess a blend schedule with no gas to blend', () => {
    expect(() =>
      assessBlendSafety({
        inletCh4VolPct: 1,
        inletO2VolPct: 20,
        outletCh4VolPct: 0.5,
        outletO2VolPct: 20,
        airBlendFraction: 0.9,
        limits: lim,
      }),
    ).toThrow(/rawGas is required/);
  });

  it('halts on a crossing, and never phrases a hazard as an operating target', () => {
    const assessment = assessBlendSafety({
      inletCh4VolPct: 82,
      inletO2VolPct: 0,
      outletCh4VolPct: 1,
      outletO2VolPct: 20,
      airBlendFraction: airFractionForTarget(82, 1),
      rawGas: { ch4VolPct: 82, o2VolPct: 0, co2VolPct: 0 },
      limits: lim,
    });
    expect(assessment.state).toBe('shutdown');
    expect(assessment.haltSimulation).toBe(true);
    for (const f of assessment.findings) {
      expect(f.recommendation).toMatch(/isolate/i);
      expect(f.recommendation).not.toMatch(/operate at|maintain|target of/i);
    }
  });
});

describe('unit conversion', () => {
  it('round-trips a volume fraction through g/m³', () => {
    const frac = 0.012;
    const gm3 = volFractionToGm3(frac, CH4_MOLAR_MASS, 25, 101325);
    expect(gm3ToVolFraction(gm3, CH4_MOLAR_MASS, 25, 101325)).toBeCloseTo(frac, 12);
  });
});

describe('environmental response', () => {
  it('gives Monod a half-maximum at the half-saturation constant', () => {
    expect(monod(6.6, 6.6)).toBeCloseTo(0.5, 12);
    expect(monod(0, 6.6)).toBe(0);
  });

  it('returns exactly 1 at the temperature optimum and 0 at the cardinals', () => {
    const cardinal = biology.cardinalTemperature;
    expect(temperatureFactor(cardinal.optC, cardinal)).toBeCloseTo(1, 6);
    expect(temperatureFactor(cardinal.minC, cardinal)).toBe(0);
    expect(temperatureFactor(cardinal.maxC, cardinal)).toBe(0);
    expect(temperatureFactor(cardinal.maxC + 10, cardinal)).toBe(0);
  });

  it('is inactive bone-dry and inactive at saturation', () => {
    const r = medium.moistureResponse;
    expect(moistureFactor(r.minTheta, r)).toBe(0);
    expect(moistureFactor(r.maxTheta, r)).toBe(0);
    expect(moistureFactor((r.optLo + r.optHi) / 2, r)).toBe(1);
  });

  it('plateaus across the neutral pH band', () => {
    expect(phFactor(7, biology)).toBe(1);
    expect(phFactor(biology.phMin, biology)).toBe(0);
    expect(phFactor(biology.phMax, biology)).toBe(0);
  });
});

describe('rate', () => {
  it('is zero without biomass, and names why', () => {
    const r = realizedRate(state({ biomass_gm3: 0 }));
    expect(r.rate).toBe(0);
    expect(r.limitation).toBe('inactive');
  });

  it('names the factor that killed the rate', () => {
    expect(realizedRate(state({ o2_gm3: 0 })).limitation).toBe('oxygen');
    expect(realizedRate(state({ temperatureC: -10 })).limitation).toBe('temperature');
    expect(realizedRate(state({ ph: 2 })).limitation).toBe('ph');
  });

  it('never exceeds the kinetic rate, because transport can only remove', () => {
    for (const ch4 of [0.5, 5, 50, 500]) {
      const s = state({ ch4_gm3: ch4 });
      expect(realizedRate(s).rate).toBeLessThanOrEqual(intrinsicRate(s) + 1e-9);
    }
  });

  it('is monotone in methane', () => {
    let previous = -1;
    for (const ch4 of [0.1, 1, 5, 20, 100, 400]) {
      const rate = realizedRate(state({ ch4_gm3: ch4 })).rate;
      expect(rate).toBeGreaterThanOrEqual(previous);
      previous = rate;
    }
  });
});

describe('the axial profile', () => {
  const opts = {
    inletCh4VolPct: 1,
    inletO2VolPct: 20,
    bedDepth_m: 1.2,
    vesselDiameter_m: 3,
    gasFlow_m3PerH: 50,
    cellCount: 14,
    temperatureC: 25,
    pressurePa: 101325,
    moisture: 0.5,
    ph: 7,
    nutrient: 1,
    biomass_gm3: 5000,
    biology,
    medium,
  };

  it('decreases monotonically down the bed and never goes negative', () => {
    const profile = solveProfile(opts);
    let previous = 1;
    for (const cell of profile.cells) {
      expect(cell.frac).toBeGreaterThanOrEqual(0);
      expect(cell.frac).toBeLessThanOrEqual(previous + 1e-12);
      previous = cell.frac;
    }
    expect(profile.outletFrac).toBeCloseTo(profile.cells.at(-1)?.frac ?? 0, 12);
  });

  it('converges as the bed is subdivided, so cell count is not a free parameter', () => {
    const coarse = solveProfile({ ...opts, cellCount: 12 });
    const fine = solveProfile({ ...opts, cellCount: 240 });
    expect(Math.abs(coarse.outletFrac - fine.outletFrac)).toBeLessThan(0.05);
  });

  it('caps conversion on oxygen when a coarse cell asks for more than it has', () => {
    const starved = solveProfile({ ...opts, inletO2VolPct: 0.05, cellCount: 1 });
    expect(starved.oxygenLimited).toBe(true);
    expect(starved.outletFrac).toBeGreaterThan(0);
  });

  it('refuses a non-finite input rather than reporting an inert bed', () => {
    expect(() => solveProfile({ ...opts, cellCount: Number.NaN })).toThrow(/finite number/);
    expect(() => solveProfile({ ...opts, gasFlow_m3PerH: '50' as unknown as number })).toThrow(
      /finite number/,
    );
  });
});
