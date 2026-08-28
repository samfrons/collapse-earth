/**
 * The Coward triangle — flammability of methane in oxygen/inert mixtures.
 *
 * Coward & Jones, *US Bureau of Mines Bulletin 503* (1952). This is **geometry**:
 * nothing here is fitted. The limits are published, and the envelope follows from
 * them. It is the reason this module exists, and the only part of the bioreactor
 * model whose absolute output is safe to render.
 *
 * The limits are for **ambient temperature and pressure**. Both widen the envelope
 * when raised, so applying them to a hot bed is non-conservative. That is stated
 * here rather than silently assumed.
 *
 * This is a screening layer, not process-safety engineering. A real installation
 * needs a HAZOP and a DSEAR/ATEX assessment.
 */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Published flammability construction, in % v/v. */
export interface FlammabilityLimits {
  /** Lower flammable limit of methane in air. */
  readonly lflInAir: number;
  /** Upper flammable limit of methane in air. */
  readonly uflInAir: number;
  /** Limiting oxygen concentration — the nose of the triangle. */
  readonly noseO2: number;
  /** Methane concentration at the nose. */
  readonly noseCh4: number;
  /** Oxygen in dry ambient air. */
  readonly airO2: number;
}

/**
 * Coward & Jones (1952), as published.
 *
 * Pages mirror these in their own sourced parameter block and assert equality at
 * load. That assertion is the citation gate; this constant is not the gate.
 */
export const COWARD_1952: FlammabilityLimits = {
  lflInAir: 5.0,
  uflInAir: 15.0,
  noseO2: 12.1,
  noseCh4: 6.0,
  airO2: 20.9,
};

/** A gas composition, in % v/v. */
export interface Mixture {
  readonly ch4VolPct: number;
  readonly o2VolPct: number;
  readonly co2VolPct?: number;
}

export interface MixtureClassification {
  readonly flammable: boolean;
  readonly lowerLimitVolPct: number;
  readonly upperLimitVolPct: number;
  /**
   * Distance to the nearest edge of the envelope, in % v/v — of methane when the
   * mixture is oxygen-rich, of oxygen when it is inerted.
   */
  readonly marginVolPct: number;
  /** True below the limiting oxygen concentration: no methane level burns. */
  readonly inertedByOxygen: boolean;
}

/**
 * Fractional distance from ambient oxygen down to the limiting oxygen
 * concentration: 0 in full air, 1 at the nose.
 */
const noseApproach = (o2VolPct: number, lim: FlammabilityLimits): number => {
  const span = lim.airO2 - lim.noseO2;
  if (span <= 0) return 0;
  return clamp01((lim.airO2 - o2VolPct) / span);
};

/**
 * Both limit lines converge linearly on the nose as oxygen is depleted, so the
 * flammable window closes to zero width exactly at the limiting oxygen level.
 */
export const effectiveLowerLimit = (o2VolPct: number, lim: FlammabilityLimits): number =>
  lim.lflInAir + (lim.noseCh4 - lim.lflInAir) * noseApproach(o2VolPct, lim);

export const effectiveUpperLimit = (o2VolPct: number, lim: FlammabilityLimits): number =>
  lim.uflInAir + (lim.noseCh4 - lim.uflInAir) * noseApproach(o2VolPct, lim);

/**
 * Classify a methane/oxygen/inert mixture. Below the limiting oxygen
 * concentration no mixture burns at any methane level, however rich.
 */
export const classifyMixture = (
  ch4VolPct: number,
  o2VolPct: number,
  lim: FlammabilityLimits,
): MixtureClassification => {
  const lowerLimitVolPct = effectiveLowerLimit(o2VolPct, lim);
  const upperLimitVolPct = effectiveUpperLimit(o2VolPct, lim);

  if (o2VolPct < lim.noseO2) {
    return {
      flammable: false,
      lowerLimitVolPct,
      upperLimitVolPct,
      marginVolPct: lim.noseO2 - o2VolPct,
      inertedByOxygen: true,
    };
  }

  const flammable = ch4VolPct >= lowerLimitVolPct && ch4VolPct <= upperLimitVolPct;
  const marginVolPct = flammable
    ? 0
    : ch4VolPct < lowerLimitVolPct
      ? lowerLimitVolPct - ch4VolPct
      : ch4VolPct - upperLimitVolPct;

  return { flammable, lowerLimitVolPct, upperLimitVolPct, marginVolPct, inertedByOxygen: false };
};

/* -------------------------------------------------------------------------- */
/* Air blending, and the path hazard                                          */
/* -------------------------------------------------------------------------- */

/**
 * Blend raw gas with ambient air at the given air fraction.
 *
 * This is the whole argument. Methanotrophs need oxygen. Mine drainage gas is
 * frequently **both** too rich to burn **and** too oxygen-poor to burn. Making it
 * biologically treatable means adding air — and doing so walks the mixture across
 * the explosive envelope. Both endpoints can be non-flammable while the path
 * between them is not, and inside a mixer, a duct or a vessel the intermediate
 * composition is physically real.
 */
export const blendWithAir = (
  raw: Mixture,
  airFraction: number,
  lim: FlammabilityLimits,
): Required<Mixture> => {
  const f = clamp01(airFraction);
  return {
    ch4VolPct: raw.ch4VolPct * (1 - f),
    o2VolPct: raw.o2VolPct * (1 - f) + lim.airO2 * f,
    co2VolPct: (raw.co2VolPct ?? 0) * (1 - f),
  };
};

const flammableAt = (raw: Mixture, f: number, lim: FlammabilityLimits): boolean => {
  const m = blendWithAir(raw, f, lim);
  return classifyMixture(m.ch4VolPct, m.o2VolPct, lim).flammable;
};

/**
 * Bisect between a known-safe and a known-flammable air fraction. Returns the
 * flammable-side bound, so a reported edge is always *inside* the envelope rather
 * than just outside it.
 */
const refineEdge = (
  raw: Mixture,
  safeF: number | null,
  hotF: number,
  lim: FlammabilityLimits,
): number => {
  if (safeF === null) return hotF;
  let lo = safeF;
  let hi = hotF;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (flammableAt(raw, mid, lim)) hi = mid;
    else lo = mid;
  }
  return hi;
};

export interface BlendPath {
  readonly crosses: boolean;
  readonly firstCrossingAirFraction: number | null;
  readonly lastCrossingAirFraction: number | null;
  readonly endpoint: Required<Mixture>;
}

/**
 * Walk the dilution path and report where it is flammable.
 *
 * **Resolution matters here in one direction only.** A sampled walk that steps
 * over a narrow flammable window reports "path clear" — a false negative on a
 * safety finding, which is the one error this function must not make.
 *
 * Two things prevent it. First, the sample set explicitly includes the two
 * breakpoints where the oxygen-depletion clamp engages; between those, the
 * flammable-limit lines and the mixture composition are all linear in `f`, so the
 * window cannot open and close unseen inside a sub-interval unless it is narrower
 * than one step. Second, the default step count is 2000, and entry and exit are
 * then refined by bisection — so accuracy does not depend on the sample count.
 */
export const blendPathCrossesFlammable = (
  raw: Mixture,
  targetAirFraction: number,
  lim: FlammabilityLimits,
  steps = 2000,
): BlendPath => {
  const fractions: number[] = [];
  for (let i = 0; i <= steps; i++) fractions.push((targetAirFraction * i) / steps);

  // The clamp's two corners: where the blend reaches ambient oxygen, and where it
  // reaches the limiting oxygen concentration.
  const denom = lim.airO2 - raw.o2VolPct;
  if (denom !== 0) {
    for (const target of [lim.airO2, lim.noseO2]) {
      const fb = (target - raw.o2VolPct) / denom;
      if (fb > 0 && fb < targetAirFraction) fractions.push(fb);
    }
  }
  fractions.sort((a, b) => a - b);

  let first: number | null = null;
  let last: number | null = null;
  let prev: number | null = null;

  for (const f of fractions) {
    if (flammableAt(raw, f, lim)) {
      first ??= refineEdge(raw, prev, f, lim);
      last = f;
    } else if (last !== null && first !== null) {
      last = refineEdge(raw, f, last, lim);
      break;
    }
    prev = f;
  }

  if (first !== null && last !== null && last === fractions.at(-1)) last = targetAirFraction;

  return {
    crosses: first !== null,
    firstCrossingAirFraction: first,
    lastCrossingAirFraction: last,
    endpoint: blendWithAir(raw, targetAirFraction, lim),
  };
};

/**
 * The air fraction that dilutes raw gas to a target methane concentration. Pure
 * algebra on the methane balance: `ch4_raw × (1 − f) = ch4_target`.
 */
export const airFractionForTarget = (rawCh4VolPct: number, targetCh4VolPct: number): number => {
  if (rawCh4VolPct <= 0) return 0;
  if (targetCh4VolPct >= rawCh4VolPct) return 0;
  return 1 - targetCh4VolPct / rawCh4VolPct;
};

/* -------------------------------------------------------------------------- */
/* Screening assessment                                                       */
/* -------------------------------------------------------------------------- */

export type Severity = 'shutdown' | 'caution';
export type SafetyState = 'normal' | 'caution' | 'shutdown';

export interface SafetyFinding {
  readonly id: 'flammable-inlet' | 'flammable-outlet' | 'blend-path-flammable';
  readonly severity: Severity;
  readonly title: string;
  readonly responsibleParameters: readonly string[];
  /**
   * Never an operating target. A hazardous state is not something to dial in, and
   * the tests assert that no recommendation reads as one.
   */
  readonly recommendation: string;
}

export interface BlendSafetyInput {
  readonly inletCh4VolPct: number;
  readonly inletO2VolPct: number;
  readonly outletCh4VolPct: number;
  readonly outletO2VolPct: number;
  readonly airBlendFraction: number;
  readonly rawGas?: Mixture;
  readonly limits: FlammabilityLimits;
}

export interface BlendSafetyAssessment {
  readonly state: SafetyState;
  readonly findings: readonly SafetyFinding[];
  readonly haltSimulation: boolean;
  readonly inletMixture: MixtureClassification;
  readonly outletMixture: MixtureClassification;
  readonly blendPath: BlendPath | null;
}

/**
 * Screening assessment of a proposed blend.
 *
 * Carries **only** the three flammability findings. The upstream model's other
 * findings — pressure drop, condensate carry-over, sensor disagreement, bed
 * over-temperature — are driven by sub-models not transcribed here, and a finding
 * that cannot be computed must not be implied by its absence.
 */
export const assessBlendSafety = (input: BlendSafetyInput): BlendSafetyAssessment => {
  const findings: SafetyFinding[] = [];
  const lim = input.limits;

  // A blend schedule with no gas to blend is a caller bug, and the failure must be
  // loud: silently skipping the path check would return "normal" for the exact
  // case this function exists to catch.
  if (input.airBlendFraction > 0 && !input.rawGas) {
    throw new Error('assessBlendSafety: rawGas is required when airBlendFraction > 0');
  }

  const inletMixture = classifyMixture(input.inletCh4VolPct, input.inletO2VolPct, lim);
  const outletMixture = classifyMixture(input.outletCh4VolPct, input.outletO2VolPct, lim);

  if (inletMixture.flammable) {
    findings.push({
      id: 'flammable-inlet',
      severity: 'shutdown',
      title: 'Inlet mixture is within the flammable envelope',
      responsibleParameters: ['inletCh4VolPct', 'inletO2VolPct', 'airBlendFraction'],
      recommendation:
        'Isolate the feed and stop the blower. This condition requires engineering ' +
        'review before any further operation.',
    });
  }

  if (outletMixture.flammable) {
    findings.push({
      id: 'flammable-outlet',
      severity: 'shutdown',
      title: 'Discharge mixture is within the flammable envelope',
      responsibleParameters: ['outletCh4VolPct', 'gasFlow_m3PerH', 'bedDepth_m'],
      recommendation:
        'Isolate the discharge stack and stop the blower. Review stack dispersion and ' +
        'ignition-source control with a competent person.',
    });
  }

  let blendPath: BlendPath | null = null;
  if (input.airBlendFraction > 0 && input.rawGas) {
    blendPath = blendPathCrossesFlammable(input.rawGas, input.airBlendFraction, lim);
    if (blendPath.crosses) {
      findings.push({
        id: 'blend-path-flammable',
        severity: 'shutdown',
        title: 'Dilution path passes through the flammable envelope',
        responsibleParameters: ['airBlendFraction', 'rawGas.ch4VolPct', 'rawGas.o2VolPct'],
        recommendation:
          'Isolate and do not operate on this blend schedule. Adding air to methane-bearing ' +
          'mine gas requires a dedicated hazard assessment; consider inert pre-dilution, ' +
          'staged eduction with continuous composition monitoring, or a different ' +
          'collection strategy.',
      });
    }
  }

  const haltSimulation = findings.some((f) => f.severity === 'shutdown');

  return {
    state: haltSimulation ? 'shutdown' : findings.length > 0 ? 'caution' : 'normal',
    findings,
    haltSimulation,
    inletMixture,
    outletMixture,
    blendPath,
  };
};
