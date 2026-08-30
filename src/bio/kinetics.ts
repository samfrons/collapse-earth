/**
 * Methanotrophic oxidation kinetics — dual-substrate Monod with a cardinal
 * temperature model (Rosso et al. 1993).
 *
 * **These are uncalibrated against any field installation.** They are used only to
 * give the axial profile its *shape* — where in the bed oxidation concentrates,
 * and which factor binds. Do not render an absolute performance figure from this
 * module: no removal efficiency, no elimination capacity, no tonnes abated. The
 * upstream model has no channelling or short-circuiting term and so over-predicts
 * removal at high biomass. The shape is defensible; the magnitude is not.
 *
 * The one performance number worth stating is not ours and is not computed here —
 * it is Limbri et al. 2014 (*PLoS One* 9(4):e94641), who **measured** 27.2 ± 0.66 g
 * CH₄ per m³ of bed per hour at 19.7 ± 2.9 % removal from a 1 % v/v inlet. Cite
 * that; do not model it.
 */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/* -------------------------------------------------------------------------- */
/* Parameters                                                                 */
/* -------------------------------------------------------------------------- */

export interface CardinalTemperature {
  readonly minC: number;
  readonly optC: number;
  readonly maxC: number;
}

export interface Biology {
  /** Maximum specific oxidation rate, g CH₄ per g VSS per hour. */
  readonly vMax_gCH4_per_gVSS_per_h: number;
  /** Half-saturation constants, g/m³. */
  readonly kCH4_gm3: number;
  readonly kO2_gm3: number;
  readonly cardinalTemperature: CardinalTemperature;
  readonly phMin: number;
  readonly phOptLo: number;
  readonly phOptHi: number;
  readonly phMax: number;
}

export interface MoistureResponse {
  readonly minTheta: number;
  readonly optLo: number;
  readonly optHi: number;
  readonly maxTheta: number;
}

export interface Medium {
  readonly moistureResponse: MoistureResponse;
  /** Gas-film mass transfer coefficient, m/h. */
  readonly gasFilmCoefficient_mPerH: number;
  /** Specific surface area of the packing, m²/m³. */
  readonly specificSurfaceArea_m2PerM3: number;
}

/** One point in the bed, fully specified. */
export interface BedState {
  readonly ch4_gm3: number;
  readonly o2_gm3: number;
  readonly biomass_gm3: number;
  readonly temperatureC: number;
  readonly moisture: number;
  readonly ph: number;
  readonly nutrient: number;
  readonly biology: Biology;
  readonly medium: Medium;
}

/** What is holding the rate down. `none` means nothing is meaningfully binding. */
export type Limitation =
  | 'none'
  | 'methane'
  | 'oxygen'
  | 'temperature'
  | 'moisture'
  | 'ph'
  | 'nutrient'
  | 'mass-transfer'
  | 'inactive';

export interface RateFactors {
  readonly methane: number;
  readonly oxygen: number;
  readonly temperature: number;
  readonly moisture: number;
  readonly ph: number;
  readonly nutrient: number;
}

/* -------------------------------------------------------------------------- */
/* Environmental response functions                                           */
/* -------------------------------------------------------------------------- */

export const monod = (concentration: number, halfSaturation: number): number =>
  concentration <= 0 ? 0 : concentration / (halfSaturation + concentration);

/**
 * Cardinal temperature model with inflection (Rosso et al. 1993). Chosen over a
 * bare Arrhenius because biological methane oxidation has a true optimum and a
 * hard upper cutoff, which Arrhenius cannot represent. Returns exactly 1 at the
 * optimum and exactly 0 at or beyond the cardinals.
 */
export const temperatureFactor = (temperatureC: number, cardinal: CardinalTemperature): number => {
  const { minC: tmin, optC: topt, maxC: tmax } = cardinal;
  if (temperatureC <= tmin || temperatureC >= tmax) return 0;

  const dmin = temperatureC - tmin;
  const numerator = (temperatureC - tmax) * dmin * dmin;
  const denominator =
    (topt - tmin) *
    ((topt - tmin) * (temperatureC - topt) - (topt - tmax) * (topt + tmin - 2 * temperatureC));

  if (denominator === 0) return 0;
  return clamp01(numerator / denominator);
};

/**
 * Four-breakpoint moisture response: inactive when bone-dry, a plateau across the
 * optimum band, and inactive again at saturation, where water-filled pores cut off
 * gas transport to the biofilm.
 */
export const moistureFactor = (theta: number, response: MoistureResponse): number => {
  const { minTheta: lo, optLo: a, optHi: b, maxTheta: hi } = response;
  if (theta <= lo || theta >= hi) return 0;
  if (theta < a) return (theta - lo) / (a - lo);
  if (theta > b) return (hi - theta) / (hi - b);
  return 1;
};

/** Trapezoidal pH response with a neutral optimum plateau. */
export const phFactor = (ph: number, biology: Biology): number => {
  const { phMin: lo, phOptLo: a, phOptHi: b, phMax: hi } = biology;
  if (ph <= lo || ph >= hi) return 0;
  if (ph < a) return (ph - lo) / (a - lo);
  if (ph > b) return (hi - ph) / (hi - b);
  return 1;
};

/* -------------------------------------------------------------------------- */
/* Rate                                                                       */
/* -------------------------------------------------------------------------- */

export const rateFactors = (state: BedState): RateFactors => ({
  methane: monod(state.ch4_gm3, state.biology.kCH4_gm3),
  oxygen: monod(state.o2_gm3, state.biology.kO2_gm3),
  temperature: temperatureFactor(state.temperatureC, state.biology.cardinalTemperature),
  moisture: moistureFactor(state.moisture, state.medium.moistureResponse),
  ph: phFactor(state.ph, state.biology),
  nutrient: clamp01(state.nutrient),
});

/**
 * Intrinsic (kinetics-only) rate, g CH₄ per m³ of **bed** per hour. Ignores
 * transport resistance — see {@link realizedRate}.
 */
export const intrinsicRate = (state: BedState): number => {
  if (state.biomass_gm3 <= 0) return 0;
  const f = rateFactors(state);
  return (
    state.biology.vMax_gCH4_per_gVSS_per_h *
    state.biomass_gm3 *
    f.methane *
    f.oxygen *
    f.temperature *
    f.moisture *
    f.ph *
    f.nutrient
  );
};

const FACTOR_ORDER = [
  'methane',
  'oxygen',
  'temperature',
  'moisture',
  'ph',
  'nutrient',
] as const satisfies readonly (keyof RateFactors)[];

/** Name the smallest multiplicative factor, when one is actually binding. */
const bindingFactor = (state: BedState): Limitation => {
  const f = rateFactors(state);
  let worst: Limitation = 'none';
  let worstValue = Infinity;
  for (const key of FACTOR_ORDER) {
    if (f[key] < worstValue) {
      worstValue = f[key];
      worst = key;
    }
  }
  return worstValue >= 0.85 ? 'none' : worst;
};

/** When the rate is exactly zero, say which factor killed it. */
const inactiveReason = (state: BedState): Limitation => {
  if (state.biomass_gm3 <= 0) return 'inactive';
  const f = rateFactors(state);
  return FACTOR_ORDER.find((key) => f[key] === 0) ?? 'inactive';
};

export interface RealizedRate {
  /** g CH₄ per m³ of bed per hour. */
  readonly rate: number;
  readonly limitation: Limitation;
  /** Methane concentration at the biofilm surface, g/m³. */
  readonly surfaceCh4_gm3: number;
}

/**
 * Rate actually achievable once gas-to-biofilm transport is accounted for.
 *
 * At steady state the flux into the biofilm equals the reaction inside it:
 *
 *     k_g · a · (C_bulk − C_surface) = r(C_surface)
 *
 * Both sides are monotone in `C_surface` (one decreasing, one increasing), so
 * bisection converges reliably. This is deliberately **not** `min(kinetic,
 * transport)`: a plain `min()` kinks the response surface, and the kink shows up
 * as a visible crease in the rendered bed profile.
 */
export const realizedRate = (state: BedState): RealizedRate => {
  const kinetic = intrinsicRate(state);
  if (kinetic <= 0) {
    return { rate: 0, limitation: inactiveReason(state), surfaceCh4_gm3: state.ch4_gm3 };
  }

  /** 1/h. */
  const transportCoefficient =
    state.medium.gasFilmCoefficient_mPerH * state.medium.specificSurfaceArea_m2PerM3;

  // Fast path: when the transport ceiling dwarfs kinetic demand, the surface
  // concentration sits within a fraction of a percent of the bulk, so the
  // root-find would return the kinetic rate anyway. Worth having because the axial
  // march nests its own bisection around this call.
  const transportCeiling = transportCoefficient * state.ch4_gm3;
  if (kinetic <= 0.02 * transportCeiling) {
    return { rate: kinetic, limitation: bindingFactor(state), surfaceCh4_gm3: state.ch4_gm3 };
  }

  // Review suggested hoisting the methane-independent factors (f_T, f_θ, f_pH,
  // nutrient) out of this bisection, since intrinsicRate recomputes all six every
  // iteration. Correct, and not taken: the axial march nests 40 iterations around
  // these 60, but a full sheet redraw is still imperceptible, and the saving would
  // come at the cost of splitting the rate law across two functions whose agreement
  // is exactly what the unit tests pin. Revisit only if a redraw becomes visible.
  //
  // residual(Cs) = transport supply − reaction demand.
  // Positive at Cs = 0; negative at Cs = C_bulk (supply zero, demand maximal).
  const residual = (cs: number): number =>
    transportCoefficient * (state.ch4_gm3 - cs) - intrinsicRate({ ...state, ch4_gm3: cs });

  let lo = 0;
  let hi = state.ch4_gm3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (residual(mid) > 0) lo = mid;
    else hi = mid;
  }
  const surfaceCh4_gm3 = (lo + hi) / 2;
  const rate = Math.max(0, Math.min(kinetic, intrinsicRate({ ...state, ch4_gm3: surfaceCh4_gm3 })));

  // Transport binds when it has meaningfully depressed the rate below what the
  // kinetics alone would deliver.
  if (rate < kinetic * 0.9) return { rate, limitation: 'mass-transfer', surfaceCh4_gm3 };
  return { rate, limitation: bindingFactor(state), surfaceCh4_gm3 };
};
