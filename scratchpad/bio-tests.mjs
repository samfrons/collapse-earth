/* Tests for collapse-bio.v2.js — ported from the upstream vitest suites in
   messai-ai/apps/lab/src/lib/biofilter/{safety,kinetics,solver}.test.ts,
   restricted to the functions this site actually ships, plus new cases for
   solveProfile (which is our reduction, not theirs).

   Run: node scratchpad/bio-tests.mjs
   No dependencies — this repo has no package.json and no build step. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "collapse-bio.v2.js"), "utf8");
// The file assigns one global; evaluating it in this scope populates globalThis.
new Function(src).call(globalThis);
const B = globalThis.COLLAPSE_BIO;

/* ── tiny runner ──────────────────────────────────────────────────────── */
let pass = 0;
const failures = [];
let group = "";

function describe(name, fn) { group = name; fn(); }
function it(name, fn) {
  try { fn(); pass++; }
  catch (e) { failures.push(`${group} › ${name}\n    ${e.message}`); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }
function eq(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function close(a, b, tol, msg) {
  if (!(Math.abs(a - b) <= tol)) {
    throw new Error(msg || `expected ${a} within ${tol} of ${b}`);
  }
}

const LIM = B.COWARD_1952;

/* Reference parameter sets. These mirror the upstream DEFAULT_BIOLOGY /
   DEFAULT_MEDIUM so the ported assertions stay meaningful. They are test
   fixtures only — the page supplies its own via its sourced PARAMS block. */
const BIO = {
  vMax_gCH4_per_gVSS_per_h: 0.01,
  kCH4_gm3: 6.6,
  kO2_gm3: 4.0,
  cardinalTemperature: { minC: 2, optC: 30, maxC: 45 },
  phMin: 4.5, phOptLo: 6.5, phOptHi: 7.5, phMax: 9.0
};
const MED = {
  specificSurfaceArea_m2PerM3: 350,
  gasFilmCoefficient_mPerH: 5,
  moistureResponse: { minTheta: 0.15, optLo: 0.4, optHi: 0.65, maxTheta: 0.95 }
};
function cell(over) {
  return Object.assign({
    ch4_gm3: 6.6, o2_gm3: 280, biomass_gm3: 5000, temperatureC: 30,
    moisture: 0.5, ph: 7.0, nutrient: 1, biology: BIO, medium: MED
  }, over || {});
}

/* ── Coward triangle ──────────────────────────────────────────────────── */
describe("classifyMixture", () => {
  it("flags a stoichiometric CH4/air mixture as flammable", () => {
    ok(B.classifyMixture(9.5, 20.9, LIM).flammable);
  });
  it("treats CH4 below the lower flammable limit in air as non-flammable", () => {
    ok(!B.classifyMixture(2.0, 20.9, LIM).flammable);
  });
  it("treats CH4 above the upper flammable limit in air as non-flammable (too rich)", () => {
    ok(!B.classifyMixture(40.0, 20.9, LIM).flammable);
  });
  it("inerts any CH4 concentration below the limiting oxygen concentration", () => {
    for (const ch4 of [1, 5, 9.5, 15, 40, 80]) {
      ok(!B.classifyMixture(ch4, 10.0, LIM).flammable, `CH4 ${ch4} should be inerted at 10 % O2`);
    }
  });
  it("is flammable just above the LOC at the nose composition", () => {
    ok(B.classifyMixture(6.0, 12.2, LIM).flammable);
  });
  it("reports a positive margin outside the envelope and zero inside it", () => {
    eq(B.classifyMixture(9.5, 20.9, LIM).marginVolPct, 0);
    ok(B.classifyMixture(2.0, 20.9, LIM).marginVolPct > 0);
    ok(B.classifyMixture(40.0, 20.9, LIM).marginVolPct > 0);
  });
  it("narrows the flammable window as oxygen falls toward the LOC", () => {
    const wide = B.classifyMixture(9.5, 20.9, LIM);
    const narrow = B.classifyMixture(9.5, 15.0, LIM);
    const w1 = wide.upperLimitVolPct - wide.lowerLimitVolPct;
    const w2 = narrow.upperLimitVolPct - narrow.lowerLimitVolPct;
    ok(w2 < w1, `window should narrow: ${w2} !< ${w1}`);
    // and close to exactly zero width at the nose
    const atNose = B.classifyMixture(6.0, LIM.noseO2, LIM);
    close(atNose.upperLimitVolPct - atNose.lowerLimitVolPct, 0, 1e-9);
  });
});

/* ── blending ─────────────────────────────────────────────────────────── */
describe("blendWithAir", () => {
  const raw = { ch4VolPct: 40, o2VolPct: 2, co2VolPct: 8 };
  it("returns the raw gas unchanged at zero air fraction", () => {
    const m = B.blendWithAir(raw, 0, LIM);
    close(m.ch4VolPct, 40, 1e-9); close(m.o2VolPct, 2, 1e-9);
  });
  it("approaches ambient air composition at full dilution", () => {
    const m = B.blendWithAir(raw, 1, LIM);
    close(m.ch4VolPct, 0, 1e-9); close(m.o2VolPct, LIM.airO2, 1e-9);
  });
  it("conserves the CH4 mole fraction linearly in the air fraction", () => {
    for (const f of [0.1, 0.25, 0.5, 0.9]) {
      close(B.blendWithAir(raw, f, LIM).ch4VolPct, 40 * (1 - f), 1e-9);
    }
  });
});

describe("blendPathCrossesFlammable", () => {
  it("detects that diluting rich, O2-poor mine gas to a treatable CH4 level passes through the explosive envelope", () => {
    // The central hazard: 40 % CH4 at 2 % O2 is too rich AND too oxygen-poor
    // to burn; 1 % CH4 in air is far below the LFL. Both endpoints safe.
    const raw = { ch4VolPct: 40, o2VolPct: 2, co2VolPct: 8 };
    const target = B.airFractionForTarget(40, 1.0);
    ok(!B.classifyMixture(raw.ch4VolPct, raw.o2VolPct, LIM).flammable, "raw endpoint must be safe");
    const end = B.blendWithAir(raw, target, LIM);
    ok(!B.classifyMixture(end.ch4VolPct, end.o2VolPct, LIM).flammable, "final endpoint must be safe");
    const path = B.blendPathCrossesFlammable(raw, target, LIM);
    ok(path.crosses, "path between two safe endpoints must be detected as crossing");
    ok(path.firstCrossingAirFraction > 0 && path.firstCrossingAirFraction < target);
  });
  it("finds no crossing when the raw gas is already dilute and below the LFL", () => {
    const raw = { ch4VolPct: 0.6, o2VolPct: 20.9, co2VolPct: 0.1 };
    ok(!B.blendPathCrossesFlammable(raw, 0.5, LIM).crosses);
  });
  it("reports the endpoint composition regardless of crossing", () => {
    const raw = { ch4VolPct: 40, o2VolPct: 2, co2VolPct: 8 };
    const path = B.blendPathCrossesFlammable(raw, 0.9, LIM);
    close(path.endpoint.ch4VolPct, 4, 1e-9);
  });
  it("crosses for sealed-mine gas diluted to a treatable level (The Seam's own 82 % anchor)", () => {
    const raw = { ch4VolPct: 82, o2VolPct: 0.5, co2VolPct: 6 };
    const target = B.airFractionForTarget(82, 1.0);
    ok(B.blendPathCrossesFlammable(raw, target, LIM).crosses);
  });
  it("crosses for ANY raw oxygen content, so the finding does not rest on that assumption", () => {
    // Load-bearing for the page: the O2 content of raw mine gas is the one
    // parameter we have no article-level source for yet. It turns out not to
    // matter for WHETHER the path crosses. Air dilution drives CH4 down and O2
    // up together, so a gas that starts above the flammable band must pass
    // through it on the way to a treatable concentration — whatever oxygen it
    // started with. The raw O2 value changes only WHERE the crossing happens.
    for (let o2 = 0; o2 <= 20; o2 += 0.5) {
      for (const ch4 of [82, 60, 40, 25, 16]) {
        const raw = { ch4VolPct: ch4, o2VolPct: o2, co2VolPct: 0 };
        const target = B.airFractionForTarget(ch4, 1.0);
        ok(B.blendPathCrossesFlammable(raw, target, LIM).crosses,
          `expected a crossing for ${ch4} % CH4 at ${o2} % O2`);
      }
    }
  });
  it("does not cross when the raw gas already sits below the lower flammable limit", () => {
    // Ventilation air is the case that needs no dilution at all, and this is
    // exactly why it is the stream biofiltration is proposed for.
    for (const ch4 of [0.3, 0.6, 1.0, 2.0, 4.0]) {
      const raw = { ch4VolPct: ch4, o2VolPct: 20.6, co2VolPct: 0.1 };
      ok(!B.blendPathCrossesFlammable(raw, 0.9, LIM).crosses,
        `${ch4} % CH4 in ventilation air should never cross`);
    }
  });
});

/* ── blend safety assessment ──────────────────────────────────────────── */
describe("assessBlendSafety", () => {
  const nominal = {
    limits: LIM, inletCh4VolPct: 0.6, inletO2VolPct: 20.5,
    outletCh4VolPct: 0.2, outletO2VolPct: 20.3,
    airBlendFraction: 0, rawGas: { ch4VolPct: 0.6, o2VolPct: 20.9, co2VolPct: 0.1 }
  };
  it("returns an all-clear normal state for nominal operation", () => {
    const a = B.assessBlendSafety(nominal);
    eq(a.state, "normal"); eq(a.haltSimulation, false); eq(a.findings.length, 0);
  });
  it("halts and reports shutdown when the inlet mixture is flammable", () => {
    const a = B.assessBlendSafety(Object.assign({}, nominal,
      { inletCh4VolPct: 9.5, inletO2VolPct: 20.9 }));
    eq(a.haltSimulation, true); eq(a.state, "shutdown");
    ok(a.findings.some((f) => f.id === "flammable-inlet"));
  });
  it("halts when the air-blend path crosses the flammable envelope even if both endpoints are safe", () => {
    const raw = { ch4VolPct: 40, o2VolPct: 2, co2VolPct: 8 };
    const a = B.assessBlendSafety(Object.assign({}, nominal, {
      rawGas: raw, airBlendFraction: B.airFractionForTarget(40, 1.0),
      inletCh4VolPct: 1.0, inletO2VolPct: 20.4
    }));
    eq(a.haltSimulation, true);
    ok(a.findings.some((f) => f.id === "blend-path-flammable"));
  });
  it("never labels a flammable condition as an acceptable operating target", () => {
    const a = B.assessBlendSafety(Object.assign({}, nominal,
      { inletCh4VolPct: 9.5, inletO2VolPct: 20.9 }));
    for (const f of a.findings) {
      const r = f.recommendation.toLowerCase();
      ok(!r.includes("optimal"), "recommendation must not say 'optimal'");
      ok(!r.includes("recommended target"), "must not say 'recommended target'");
      ok(!r.includes("acceptable"), "must not say 'acceptable'");
    }
  });
  it("always attributes every finding to at least one named parameter", () => {
    const a = B.assessBlendSafety(Object.assign({}, nominal,
      { inletCh4VolPct: 9.5, inletO2VolPct: 20.9, outletCh4VolPct: 9.0, outletO2VolPct: 20.0 }));
    ok(a.findings.length > 0);
    for (const f of a.findings) ok(f.responsibleParameters.length > 0, `${f.id} has no parameters`);
  });
});

/* ── unit conversion ──────────────────────────────────────────────────── */
describe("unit conversion", () => {
  it("converts 1 % v/v CH4 at 25 C, 101325 Pa to ~6.6 g/m3", () => {
    close(B.volFractionToGm3(0.01, B.CH4_MOLAR_MASS, 25, 101325), 6.6, 0.1);
  });
  it("round-trips vol fraction -> g/m3 -> vol fraction", () => {
    const gm3 = B.volFractionToGm3(0.006, B.CH4_MOLAR_MASS, 20, 101325);
    close(B.gm3ToVolFraction(gm3, B.CH4_MOLAR_MASS, 20, 101325), 0.006, 1e-12);
  });
  it("is denser at lower temperature (ideal gas)", () => {
    ok(B.molarDensity(5, 101325) > B.molarDensity(35, 101325));
  });
});

/* ── response functions ───────────────────────────────────────────────── */
describe("temperatureFactor", () => {
  const C = BIO.cardinalTemperature;
  it("is exactly 1 at the optimum", () => { close(B.temperatureFactor(30, C), 1, 1e-9); });
  it("is 0 at and beyond the cardinal limits", () => {
    eq(B.temperatureFactor(2, C), 0); eq(B.temperatureFactor(45, C), 0);
    eq(B.temperatureFactor(-10, C), 0); eq(B.temperatureFactor(60, C), 0);
  });
  it("is bounded to [0,1] and unimodal around the optimum", () => {
    let prev = -1, rising = true;
    for (let t = 2; t <= 45; t += 0.5) {
      const f = B.temperatureFactor(t, C);
      ok(f >= 0 && f <= 1, `f(${t}) = ${f} out of range`);
      if (f < prev - 1e-12) rising = false;
      ok(!(rising === false && f > prev + 1e-12), `not unimodal at ${t}`);
      prev = f;
    }
  });
  it("penalises cold-weather operation (5 C well below optimum)", () => {
    ok(B.temperatureFactor(5, C) < 0.3);
  });
});

describe("moistureFactor", () => {
  const R = MED.moistureResponse;
  it("is 1 across the optimum plateau", () => {
    close(B.moistureFactor(0.4, R), 1, 1e-9);
    close(B.moistureFactor(0.5, R), 1, 1e-9);
    close(B.moistureFactor(0.65, R), 1, 1e-9);
  });
  it("is 0 at bone-dry and at full saturation (flooded, gas transport lost)", () => {
    eq(B.moistureFactor(0.15, R), 0); eq(B.moistureFactor(0.95, R), 0);
    eq(B.moistureFactor(0.05, R), 0); eq(B.moistureFactor(1.0, R), 0);
  });
  it("declines monotonically on the dry side and the wet side", () => {
    ok(B.moistureFactor(0.2, R) < B.moistureFactor(0.3, R));
    ok(B.moistureFactor(0.9, R) < B.moistureFactor(0.7, R));
  });
});

describe("phFactor", () => {
  it("peaks inside the neutral optimum band", () => {
    close(B.phFactor(7.0, BIO), 1, 1e-9);
  });
  it("collapses at strongly acidic / alkaline pH", () => {
    eq(B.phFactor(4.5, BIO), 0); eq(B.phFactor(9.0, BIO), 0);
    ok(B.phFactor(5.0, BIO) < 0.5); ok(B.phFactor(8.5, BIO) < 0.5);
  });
});

describe("monod", () => {
  it("is 0.5 at C = K", () => { close(B.monod(6.6, 6.6), 0.5, 1e-12); });
  it("is 0 at zero substrate and asymptotes to 1", () => {
    eq(B.monod(0, 6.6), 0); ok(B.monod(1e6, 6.6) > 0.999);
  });
  it("never returns negative for negative (numerically undershot) input", () => {
    eq(B.monod(-1e-9, 6.6), 0);
  });
});

/* ── rate ─────────────────────────────────────────────────────────────── */
describe("intrinsicRate", () => {
  it("returns 0 when any multiplicative factor is 0", () => {
    eq(B.intrinsicRate(cell({ temperatureC: 50 })), 0);
    eq(B.intrinsicRate(cell({ moisture: 0.99 })), 0);
    eq(B.intrinsicRate(cell({ ph: 3 })), 0);
    eq(B.intrinsicRate(cell({ nutrient: 0 })), 0);
    eq(B.intrinsicRate(cell({ biomass_gm3: 0 })), 0);
  });
  it("scales linearly with biomass at fixed substrate", () => {
    const a = B.intrinsicRate(cell({ biomass_gm3: 1000 }));
    const b = B.intrinsicRate(cell({ biomass_gm3: 2000 }));
    close(b / a, 2, 1e-9);
  });
  it("is oxygen-limited when O2 is scarce even with abundant CH4", () => {
    const rich = B.intrinsicRate(cell({ ch4_gm3: 1000, o2_gm3: 280 }));
    const starved = B.intrinsicRate(cell({ ch4_gm3: 1000, o2_gm3: 0.5 }));
    ok(starved < rich * 0.2, `expected strong O2 penalty, got ${starved} vs ${rich}`);
  });
});

describe("realizedRate", () => {
  it("never exceeds the intrinsic kinetic rate", () => {
    for (const kg of [0.01, 0.1, 1, 5, 50, 500]) {
      const s = cell({ medium: Object.assign({}, MED, { gasFilmCoefficient_mPerH: kg }) });
      ok(B.realizedRate(s).rate <= B.intrinsicRate(s) + 1e-12, `violated at k_g = ${kg}`);
    }
  });
  it("approaches the kinetic rate as mass transfer becomes very fast", () => {
    const s = cell({ medium: Object.assign({}, MED, { gasFilmCoefficient_mPerH: 1e6 }) });
    close(B.realizedRate(s).rate, B.intrinsicRate(s), B.intrinsicRate(s) * 1e-3);
  });
  it("reports mass-transfer limitation when the film coefficient is tiny", () => {
    const s = cell({
      biomass_gm3: 30000,
      medium: Object.assign({}, MED, { gasFilmCoefficient_mPerH: 1e-4 })
    });
    eq(B.realizedRate(s).limitation, "mass-transfer");
  });
  it("attributes the binding constraint to oxygen when O2 is the scarce factor", () => {
    eq(B.realizedRate(cell({ ch4_gm3: 500, o2_gm3: 0.2 })).limitation, "oxygen");
  });
  it("attributes the binding constraint to temperature in the cold", () => {
    eq(B.realizedRate(cell({ ch4_gm3: 500, temperatureC: 5 })).limitation, "temperature");
  });
  it("attributes the binding constraint to moisture when flooded", () => {
    eq(B.realizedRate(cell({ moisture: 0.94 })).limitation, "moisture");
  });
  it("returns a non-negative rate for every plausible cell state", () => {
    for (const ch4 of [0, 0.1, 6.6, 100, 1000]) {
      for (const t of [0, 5, 30, 44, 50]) {
        for (const m of [0.1, 0.3, 0.5, 0.8, 0.96]) {
          const r = B.realizedRate(cell({ ch4_gm3: ch4, temperatureC: t, moisture: m })).rate;
          ok(r >= 0 && isFinite(r), `negative or non-finite at ${ch4}/${t}/${m}: ${r}`);
        }
      }
    }
  });
});

/* ── axial profile (our reduction, not upstream) ──────────────────────── */
describe("solveProfile", () => {
  // 3.0 m diameter x 1.2 m deep = 8.48 m3 of bed. At 50 m3/h that is a 10.2 min
  // empty-bed residence time, inside the 1.6-19.5 min band Limbri et al. 2014
  // actually measured. Anything above ~500 m3/h leaves this vessel below their
  // fastest case, where almost nothing is converted and the profile is flat.
  function profileOpts(over) {
    return Object.assign({
      inletCh4VolPct: 0.6, inletO2VolPct: 20.5,
      bedDepth_m: 1.2, vesselDiameter_m: 3.0, gasFlow_m3PerH: 50,
      cellCount: 14, temperatureC: 25, pressurePa: 101325,
      moisture: 0.5, ph: 7.0, nutrient: 1, biomass_gm3: 5000,
      biology: BIO, medium: MED
    }, over || {});
  }

  it("returns one cell per requested cell and normalises to the inlet", () => {
    const r = B.solveProfile(profileOpts());
    eq(r.cells.length, 14);
    ok(r.cells[0].frac <= 1 + 1e-12, "first cell cannot exceed the inlet");
  });
  it("decreases monotonically with depth and never goes negative", () => {
    const r = B.solveProfile(profileOpts());
    let prev = 1;
    for (const c of r.cells) {
      ok(c.frac >= 0, `negative fraction at cell ${c.index}`);
      ok(c.frac <= prev + 1e-12, `profile rose at cell ${c.index}`);
      prev = c.frac;
    }
  });
  it("cannot produce a negative outlet at any cell count", () => {
    for (const n of [1, 2, 5, 14, 40, 200]) {
      const r = B.solveProfile(profileOpts({ cellCount: n }));
      ok(r.outletFrac >= 0 && r.outletFrac <= 1, `outletFrac ${r.outletFrac} at n = ${n}`);
    }
  });
  it("converges as the cell count rises (implicit march is stable)", () => {
    const coarse = B.solveProfile(profileOpts({ cellCount: 40 })).outletFrac;
    const fine = B.solveProfile(profileOpts({ cellCount: 400 })).outletFrac;
    close(coarse, fine, 0.02, `coarse ${coarse} vs fine ${fine}`);
  });
  it("removes more methane in a deeper bed", () => {
    const shallow = B.solveProfile(profileOpts({ bedDepth_m: 0.4 })).outletFrac;
    const deep = B.solveProfile(profileOpts({ bedDepth_m: 2.4 })).outletFrac;
    ok(deep < shallow, `deeper bed should remove more: ${deep} !< ${shallow}`);
  });
  it("removes less methane at higher flow (shorter residence)", () => {
    const slow = B.solveProfile(profileOpts({ gasFlow_m3PerH: 26 })).outletFrac;   // 19.6 min
    const fast = B.solveProfile(profileOpts({ gasFlow_m3PerH: 500 })).outletFrac;  // 1.0 min
    ok(fast > slow, `faster flow should remove less: ${fast} !> ${slow}`);
  });
  it("is inert when the bed is frozen, flooded, or sterile", () => {
    for (const over of [{ temperatureC: 0 }, { moisture: 0.99 }, { biomass_gm3: 0 }]) {
      close(B.solveProfile(profileOpts(over)).outletFrac, 1, 1e-9,
        `expected no conversion for ${JSON.stringify(over)}`);
    }
  });
  it("throttles conversion when the feed is oxygen-starved", () => {
    // The Monod oxygen term is the primary mechanism: as O2 depletes down the
    // bed the rate falls smoothly toward zero, so a rich but oxygen-poor feed
    // converts far less than the same feed in air. This is the physical point
    // of the whole sheet — methanotrophs cannot work without oxygen.
    const starved = B.solveProfile(profileOpts({ inletCh4VolPct: 5, inletO2VolPct: 0.2 }));
    const inAir = B.solveProfile(profileOpts({ inletCh4VolPct: 5, inletO2VolPct: 20.5 }));
    ok(1 - starved.outletFrac < (1 - inAir.outletFrac) * 0.5,
      `oxygen starvation should roughly halve conversion at worst: ` +
      `${1 - starved.outletFrac} vs ${1 - inAir.outletFrac}`);
  });
  it("engages the hard stoichiometric oxygen cap at coarse discretisation", () => {
    // With one cell spanning the whole bed a single step can try to convert
    // more methane than the cell's oxygen allows. The cap exists to stop that
    // producing a physically impossible result; at realistic cell counts the
    // Monod term throttles first and the cap never binds.
    const r = B.solveProfile(profileOpts({
      inletCh4VolPct: 5, inletO2VolPct: 0.2, cellCount: 1
    }));
    ok(r.oxygenLimited, "expected the oxygen cap to bind in a single-cell march");
    ok(r.outletFrac >= 0 && r.outletFrac <= 1, "capped result must stay physical");
  });
  it("names a limitation for every cell", () => {
    for (const c of B.solveProfile(profileOpts()).cells) {
      ok(typeof c.limitation === "string" && c.limitation.length > 0,
        `cell ${c.index} has no limitation label`);
    }
  });
});

/* ── report ───────────────────────────────────────────────────────────── */
console.log(`\n  ${pass} passing, ${failures.length} failing\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}\n`);
  process.exit(1);
}
