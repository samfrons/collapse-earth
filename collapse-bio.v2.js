/* ===========================================================================
   collapse-bio.v2.js — methanotrophic packed-bed model, the shipped subset.

   Transcribed from the Mine-Methane Biofilter process model in the MESSAI Lab
   (apps/lab/src/lib/biofilter/, TypeScript) and reduced to the half that can
   be held to this site's citation gate. ES5, no dependencies, no I/O. Assigns
   one global, window.COLLAPSE_BIO, and also works under node for the tests.

   WHAT IS HERE, AND WHY ONLY THIS
   -------------------------------
   Two bodies of physics, with very different epistemic standing:

   1. THE COWARD TRIANGLE — flammability of methane in oxygen/inert mixtures
      (Coward & Jones, US Bureau of Mines Bulletin 503, 1952). This is
      GEOMETRY. Nothing is fitted; the limits are published and the envelope
      follows from them. It is the reason this file exists.

   2. THE OXIDATION KINETICS — dual-substrate Monod with a cardinal-temperature
      model (Rosso et al. 1993). These are UNCALIBRATED against any field
      installation. They are used here ONLY to give the axial profile its
      shape — where in the bed oxidation concentrates, and which factor binds.

   THEREFORE, A HARD RULE FOR ANY CALLER:
   Do not render an absolute performance figure from this file — no removal
   efficiency, no elimination capacity, no tonnes abated. The upstream model's
   own design doc (§9) records that it has no channelling or short-circuiting
   term and so OVER-PREDICTS removal at high biomass. The profile shape is
   defensible; the magnitude is not. Deliberately omitted for the same reason:
   the Ergun pressure drop, the evaporative energy balance, transient biomass
   growth, and the clogging relation.

   The one performance number worth stating on the page is not ours and is not
   computed here — it is Limbri et al. 2014 (PLoS One 9(4):e94641), who
   MEASURED 27.2 +/- 0.66 g CH4 per m3 of bed per hour at 19.7 +/- 2.9 %
   removal from a 1 % v/v inlet, and reported that this implies roughly
   7,200 m3 of packed bed for a 50 m3/s flow. Cite that; do not model it.

   CONSTANTS
   ---------
   Every function takes its constants as arguments. The published Coward values
   are exported as COWARD_1952 so the page can assert its own sourced PARAMS
   block against them at load; that assertion is the gate, not this file.
   =========================================================================== */

(function (root) {
  "use strict";

  /* --- small ES5 helpers --------------------------------------------------- */

  /* Shallow copy with one field replaced — stands in for object spread. */
  function withField(obj, key, value) {
    var out = {}, k;
    for (k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]; }
    out[key] = value;
    return out;
  }

  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  /* =========================================================================
     1. THE COWARD TRIANGLE
     Coward & Jones, US Bureau of Mines Bulletin 503 (1952). Limits are for
     AMBIENT temperature and pressure; both widen the envelope when raised, so
     this is non-conservative for a hot bed. Stated, not silently assumed.
     ========================================================================= */

  /* Published construction. The page mirrors these in its sourced PARAMS block
     and asserts equality at load — see bioSelfCheck(). */
  var COWARD_1952 = {
    lflInAir: 5.0,    /* % v/v CH4, lower flammable limit in air              */
    uflInAir: 15.0,   /* % v/v CH4, upper flammable limit in air             */
    noseO2: 12.1,     /* % v/v O2, limiting oxygen concentration — the nose  */
    noseCh4: 6.0,     /* % v/v CH4 at the nose                               */
    airO2: 20.9       /* % v/v O2 in dry ambient air                         */
  };

  /* Fractional distance from air oxygen down to the limiting oxygen level.
     0 in full air, 1 at the nose. */
  function noseApproach(o2VolPct, lim) {
    var span = lim.airO2 - lim.noseO2;
    if (span <= 0) return 0;
    return clamp01((lim.airO2 - o2VolPct) / span);
  }

  /* Both limit lines converge linearly on the nose as oxygen is depleted, so
     the flammable window closes to zero width exactly at the LOC. */
  function effectiveLowerLimit(o2VolPct, lim) {
    var t = noseApproach(o2VolPct, lim);
    return lim.lflInAir + (lim.noseCh4 - lim.lflInAir) * t;
  }

  function effectiveUpperLimit(o2VolPct, lim) {
    var t = noseApproach(o2VolPct, lim);
    return lim.uflInAir + (lim.noseCh4 - lim.uflInAir) * t;
  }

  /* Classify a methane/oxygen/inert mixture. Below the limiting oxygen
     concentration no mixture burns at any methane level, however rich. */
  function classifyMixture(ch4VolPct, o2VolPct, lim) {
    var lower = effectiveLowerLimit(o2VolPct, lim);
    var upper = effectiveUpperLimit(o2VolPct, lim);

    if (o2VolPct < lim.noseO2) {
      return {
        flammable: false,
        lowerLimitVolPct: lower,
        upperLimitVolPct: upper,
        marginVolPct: lim.noseO2 - o2VolPct,
        inertedByOxygen: true
      };
    }

    var flammable = ch4VolPct >= lower && ch4VolPct <= upper;
    var margin = flammable ? 0 : (ch4VolPct < lower ? lower - ch4VolPct : ch4VolPct - upper);

    return {
      flammable: flammable,
      lowerLimitVolPct: lower,
      upperLimitVolPct: upper,
      marginVolPct: margin,
      inertedByOxygen: false
    };
  }

  /* =========================================================================
     2. AIR BLENDING, AND THE PATH HAZARD
     This is the whole argument of the sheet. Methanotrophs need oxygen. Mine
     drainage gas is frequently BOTH too rich to burn AND too oxygen-poor to
     burn. Making it biologically treatable means adding air — and the act of
     doing so walks the mixture across the explosive envelope. Both endpoints
     can be non-flammable while the path between them is not. Inside a mixer,
     a duct or a vessel, the intermediate composition is physically real.
     ========================================================================= */

  function blendWithAir(raw, airFraction, lim) {
    var f = clamp01(airFraction);
    return {
      ch4VolPct: raw.ch4VolPct * (1 - f),
      o2VolPct: raw.o2VolPct * (1 - f) + lim.airO2 * f,
      co2VolPct: (raw.co2VolPct || 0) * (1 - f)
    };
  }

  /* Walk the dilution path and report the first air fraction at which the
     mixture becomes flammable. 400 steps is the upstream default; at typical
     mine-gas compositions the flammable window spans tens of percent of the
     air fraction, so the walk resolves it comfortably. */
  function blendPathCrossesFlammable(raw, targetAirFraction, lim, steps) {
    var n = steps || 400;
    var first = null;
    var i, f, mix;
    for (i = 0; i <= n; i++) {
      f = (targetAirFraction * i) / n;
      mix = blendWithAir(raw, f, lim);
      if (classifyMixture(mix.ch4VolPct, mix.o2VolPct, lim).flammable) { first = f; break; }
    }
    return {
      crosses: first !== null,
      firstCrossingAirFraction: first,
      endpoint: blendWithAir(raw, targetAirFraction, lim)
    };
  }

  /* The air fraction that dilutes raw gas to a target methane concentration.
     Pure algebra on the CH4 balance: ch4_raw * (1 - f) = ch4_target. */
  function airFractionForTarget(rawCh4VolPct, targetCh4VolPct) {
    if (rawCh4VolPct <= 0) return 0;
    if (targetCh4VolPct >= rawCh4VolPct) return 0;
    return 1 - (targetCh4VolPct / rawCh4VolPct);
  }

  /* Screening assessment of a proposed blend. Carries ONLY the three
     flammability findings from the upstream assessSafety(); its other findings
     (pressure drop, condensate carry-over, sensor disagreement, bed
     over-temperature) are driven by sub-models not transcribed here, and a
     finding that cannot be computed must not be implied by its absence.

     This is a screening layer, not process-safety engineering. A real
     installation needs a HAZOP and a DSEAR/ATEX assessment. Note also that the
     Coward limits used are for ambient temperature and pressure; both widen
     the envelope when raised, so this is non-conservative for a hot bed.

     Recommendations must never read as an operating target — the upstream
     tests assert this and so do ours. A hazardous state is not something to
     dial in. */
  function assessBlendSafety(input) {
    var findings = [];
    var lim = input.limits;

    var inletMixture = classifyMixture(input.inletCh4VolPct, input.inletO2VolPct, lim);
    var outletMixture = classifyMixture(input.outletCh4VolPct, input.outletO2VolPct, lim);

    if (inletMixture.flammable) {
      findings.push({
        id: "flammable-inlet",
        severity: "shutdown",
        title: "Inlet mixture is within the flammable envelope",
        responsibleParameters: ["inletCh4VolPct", "inletO2VolPct", "airBlendFraction"],
        recommendation: "Isolate the feed and stop the blower. This condition requires " +
          "engineering review before any further operation."
      });
    }

    if (outletMixture.flammable) {
      findings.push({
        id: "flammable-outlet",
        severity: "shutdown",
        title: "Discharge mixture is within the flammable envelope",
        responsibleParameters: ["outletCh4VolPct", "gasFlow_m3PerH", "bedDepth_m"],
        recommendation: "Isolate the discharge stack and stop the blower. Review stack " +
          "dispersion and ignition-source control with a competent person."
      });
    }

    var path = null;
    if (input.airBlendFraction > 0) {
      path = blendPathCrossesFlammable(input.rawGas, input.airBlendFraction, lim);
      if (path.crosses) {
        findings.push({
          id: "blend-path-flammable",
          severity: "shutdown",
          title: "Dilution path passes through the flammable envelope",
          responsibleParameters: ["airBlendFraction", "rawGas.ch4VolPct", "rawGas.o2VolPct"],
          recommendation: "Isolate and do not operate on this blend schedule. Adding air to " +
            "methane-bearing mine gas requires a dedicated hazard assessment; consider inert " +
            "pre-dilution, staged eduction with continuous composition monitoring, or a " +
            "different collection strategy."
        });
      }
    }

    var halt = false, i;
    for (i = 0; i < findings.length; i++) {
      if (findings[i].severity === "shutdown") { halt = true; break; }
    }

    return {
      state: halt ? "shutdown" : (findings.length ? "caution" : "normal"),
      findings: findings,
      haltSimulation: halt,
      inletMixture: inletMixture,
      outletMixture: outletMixture,
      blendPath: path
    };
  }

  /* =========================================================================
     3. UNIT CONVERSION — ideal gas
     ========================================================================= */

  var R_GAS = 8.314;          /* J/mol/K */
  var CH4_MOLAR_MASS = 16.043; /* g/mol  */
  var O2_MOLAR_MASS = 31.998;

  function molarDensity(temperatureC, pressurePa) {
    return (pressurePa || 101325) / (R_GAS * (temperatureC + 273.15));
  }

  function volFractionToGm3(volFraction, molarMass, temperatureC, pressurePa) {
    return volFraction * molarDensity(temperatureC, pressurePa) * molarMass;
  }

  function gm3ToVolFraction(gm3, molarMass, temperatureC, pressurePa) {
    return gm3 / (molarDensity(temperatureC, pressurePa) * molarMass);
  }

  /* =========================================================================
     4. ENVIRONMENTAL RESPONSE FUNCTIONS
     ========================================================================= */

  function monod(concentration, halfSaturation) {
    if (concentration <= 0) return 0;
    return concentration / (halfSaturation + concentration);
  }

  /* Cardinal temperature model with inflection (Rosso et al. 1993). Chosen
     over a bare Arrhenius because biological methane oxidation has a true
     optimum and a hard upper cutoff, which Arrhenius cannot represent.
     Returns exactly 1 at the optimum and exactly 0 at or beyond the cardinals. */
  function temperatureFactor(temperatureC, cardinal) {
    var tmin = cardinal.minC, topt = cardinal.optC, tmax = cardinal.maxC;
    if (temperatureC <= tmin || temperatureC >= tmax) return 0;

    var dmin = temperatureC - tmin;
    var numerator = (temperatureC - tmax) * dmin * dmin;
    var denominator = (topt - tmin) *
      ((topt - tmin) * (temperatureC - topt) - (topt - tmax) * (topt + tmin - 2 * temperatureC));

    if (denominator === 0) return 0;
    return clamp01(numerator / denominator);
  }

  /* Four-breakpoint moisture response: inactive when bone-dry, a plateau
     across the optimum band, and inactive again at saturation where
     water-filled pores cut off gas transport to the biofilm. */
  function moistureFactor(theta, response) {
    var lo = response.minTheta, a = response.optLo, b = response.optHi, hi = response.maxTheta;
    if (theta <= lo || theta >= hi) return 0;
    if (theta < a) return (theta - lo) / (a - lo);
    if (theta > b) return (hi - theta) / (hi - b);
    return 1;
  }

  /* Trapezoidal pH response with a neutral optimum plateau. */
  function phFactor(ph, biology) {
    var lo = biology.phMin, a = biology.phOptLo, b = biology.phOptHi, hi = biology.phMax;
    if (ph <= lo || ph >= hi) return 0;
    if (ph < a) return (ph - lo) / (a - lo);
    if (ph > b) return (hi - ph) / (hi - b);
    return 1;
  }

  /* =========================================================================
     5. RATE
     ========================================================================= */

  function rateFactors(state) {
    return {
      methane: monod(state.ch4_gm3, state.biology.kCH4_gm3),
      oxygen: monod(state.o2_gm3, state.biology.kO2_gm3),
      temperature: temperatureFactor(state.temperatureC, state.biology.cardinalTemperature),
      moisture: moistureFactor(state.moisture, state.medium.moistureResponse),
      ph: phFactor(state.ph, state.biology),
      nutrient: clamp01(state.nutrient)
    };
  }

  /* Intrinsic (kinetics-only) rate, g CH4 per m3 of BED per hour. Ignores
     transport resistance — see realizedRate. */
  function intrinsicRate(state) {
    if (state.biomass_gm3 <= 0) return 0;
    var f = rateFactors(state);
    return state.biology.vMax_gCH4_per_gVSS_per_h * state.biomass_gm3 *
      f.methane * f.oxygen * f.temperature * f.moisture * f.ph * f.nutrient;
  }

  /* Name the smallest multiplicative factor, when one is actually binding. */
  function bindingFactor(state) {
    var f = rateFactors(state);
    var entries = [
      ["methane", f.methane], ["oxygen", f.oxygen], ["temperature", f.temperature],
      ["moisture", f.moisture], ["ph", f.ph], ["nutrient", f.nutrient]
    ];
    var worst = "none", worstValue = Infinity, i;
    for (i = 0; i < entries.length; i++) {
      if (entries[i][1] < worstValue) { worstValue = entries[i][1]; worst = entries[i][0]; }
    }
    return worstValue >= 0.85 ? "none" : worst;
  }

  /* When the rate is exactly zero, say which factor killed it. */
  function inactiveReason(state) {
    if (state.biomass_gm3 <= 0) return "inactive";
    var f = rateFactors(state);
    if (f.methane === 0) return "methane";
    if (f.oxygen === 0) return "oxygen";
    if (f.temperature === 0) return "temperature";
    if (f.moisture === 0) return "moisture";
    if (f.ph === 0) return "ph";
    if (f.nutrient === 0) return "nutrient";
    return "inactive";
  }

  /* Rate actually achievable once gas-to-biofilm transport is accounted for.
     At steady state the flux into the biofilm equals the reaction inside it:

         k_g * a * (C_bulk - C_surface) = r(C_surface)

     Both sides are monotone in C_surface (one decreasing, one increasing), so
     bisection converges reliably. This is deliberately NOT min(kinetic,
     transport): a plain min() kinks the response surface, and the kink shows
     up as a crease in the rendered bed profile. */
  function realizedRate(state) {
    var kinetic = intrinsicRate(state);
    if (kinetic <= 0) {
      return { rate: 0, limitation: inactiveReason(state), surfaceCh4_gm3: state.ch4_gm3 };
    }

    var transportCoefficient =
      state.medium.gasFilmCoefficient_mPerH * state.medium.specificSurfaceArea_m2PerM3; /* 1/h */

    /* Fast path: when the transport ceiling dwarfs kinetic demand the surface
       concentration sits within a fraction of a percent of the bulk, so the
       root-find would return the kinetic rate anyway. Worth having because the
       axial march nests its own bisection around this call. */
    var transportCeiling = transportCoefficient * state.ch4_gm3;
    if (kinetic <= 0.02 * transportCeiling) {
      return { rate: kinetic, limitation: bindingFactor(state), surfaceCh4_gm3: state.ch4_gm3 };
    }

    /* residual(Cs) = transport supply - reaction demand.
       Positive at Cs = 0; negative at Cs = C_bulk (supply zero, demand maximal). */
    function residual(cs) {
      return transportCoefficient * (state.ch4_gm3 - cs) -
        intrinsicRate(withField(state, "ch4_gm3", cs));
    }

    var lo = 0, hi = state.ch4_gm3, mid, i;
    for (i = 0; i < 60; i++) {
      mid = (lo + hi) / 2;
      if (residual(mid) > 0) lo = mid; else hi = mid;
    }
    var surface = (lo + hi) / 2;
    var rate = Math.max(0, Math.min(kinetic, intrinsicRate(withField(state, "ch4_gm3", surface))));

    /* Transport binds when it has meaningfully depressed the rate below what
       the kinetics alone would deliver. */
    if (rate < kinetic * 0.9) {
      return { rate: rate, limitation: "mass-transfer", surfaceCh4_gm3: surface };
    }
    return { rate: rate, limitation: bindingFactor(state), surfaceCh4_gm3: surface };
  }

  /* =========================================================================
     6. AXIAL PROFILE — plug flow, implicit per cell
     Isothermal. The upstream model also solves an evaporative energy balance
     per cell; that sub-model is uncalibrated and is not carried here, so the
     bed is held at a single stated temperature and the caller must say so.
     ========================================================================= */

  /* opts: { inletCh4VolPct, inletO2VolPct, bedDepth_m, vesselDiameter_m,
             gasFlow_m3PerH, cellCount, temperatureC, pressurePa, moisture, ph,
             nutrient, biomass_gm3, biology, medium }

     Returns { cells: [...], outletFrac, inletCh4_gm3, oxygenLimited }.
     Each cell carries `frac` — methane remaining as a fraction of the inlet.
     That normalisation is the point: it is the shape, not the magnitude.  */
  function solveProfile(opts) {
    var area = Math.PI * Math.pow(opts.vesselDiameter_m / 2, 2);
    var cellCount = Math.max(1, Math.round(opts.cellCount));
    var dz = opts.bedDepth_m / cellCount;
    var velocity_mPerH = area > 0 ? opts.gasFlow_m3PerH / area : 0;
    var residence = velocity_mPerH > 0 ? dz / velocity_mPerH : 0; /* h per cell */

    var inletCh4_gm3 = volFractionToGm3(
      opts.inletCh4VolPct / 100, CH4_MOLAR_MASS, opts.temperatureC, opts.pressurePa);
    var inletO2_gm3 = volFractionToGm3(
      opts.inletO2VolPct / 100, O2_MOLAR_MASS, opts.temperatureC, opts.pressurePa);

    var ch4 = inletCh4_gm3;
    var o2 = inletO2_gm3;
    var cells = [];
    var oxygenLimited = false;
    var i, k;

    for (i = 0; i < cellCount; i++) {
      var base = {
        ch4_gm3: ch4,
        o2_gm3: o2,
        biomass_gm3: opts.biomass_gm3,
        temperatureC: opts.temperatureC,
        moisture: opts.moisture,
        ph: opts.ph,
        nutrient: opts.nutrient,
        biology: opts.biology,
        medium: opts.medium
      };

      var ch4Out = ch4;
      var limitation = realizedRate(base).limitation;

      if (residence > 0 && ch4 > 0) {
        /* Implicit cell balance: ch4_in - ch4_out = r(ch4_out) * residence.
           Both terms are monotone in ch4_out, so bisection is safe and cannot
           produce a negative outlet at any cell count. */
        var lo = 0, hi = ch4, mid;
        for (k = 0; k < 40; k++) {
          mid = (lo + hi) / 2;
          if (ch4 - mid - realizedRate(withField(base, "ch4_gm3", mid)).rate * residence > 0) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        ch4Out = (lo + hi) / 2;
      }

      var delta = Math.max(0, ch4 - ch4Out);

      /* Oxygen availability caps conversion regardless of kinetics. Uses the
         full-combustion 2:1 molar ratio, which is the conservative direction:
         a growing culture diverts carbon to biomass and needs LESS oxygen, so
         assuming 2:1 can only make oxygen look scarcer than it is.

         This cap is a numerical safety net, not the primary mechanism. The
         Monod oxygen term throttles the rate smoothly toward zero as O2
         depletes down the bed, so at realistic cell counts the cap never
         binds; it only engages when a single coarse cell tries to convert
         more methane than that cell's oxygen allows. Both paths are tested. */
      var o2Needed = (delta / CH4_MOLAR_MASS) * 2 * O2_MOLAR_MASS;
      if (o2Needed > o2) {
        oxygenLimited = true;
        var scale = o2 > 0 ? o2 / o2Needed : 0;
        delta = delta * scale;
        o2Needed = o2;
        ch4Out = ch4 - delta;
      }

      ch4 = Math.max(0, ch4Out);
      o2 = Math.max(0, o2 - o2Needed);

      cells.push({
        index: i,
        z_m: (i + 0.5) * dz,
        frac: inletCh4_gm3 > 0 ? ch4 / inletCh4_gm3 : 0,
        limitation: limitation
      });
    }

    return {
      cells: cells,
      outletFrac: inletCh4_gm3 > 0 ? ch4 / inletCh4_gm3 : 0,
      inletCh4_gm3: inletCh4_gm3,
      oxygenLimited: oxygenLimited
    };
  }

  /* =========================================================================
     EXPORT
     ========================================================================= */

  root.COLLAPSE_BIO = {
    COWARD_1952: COWARD_1952,
    CH4_MOLAR_MASS: CH4_MOLAR_MASS,
    O2_MOLAR_MASS: O2_MOLAR_MASS,

    effectiveLowerLimit: effectiveLowerLimit,
    effectiveUpperLimit: effectiveUpperLimit,
    classifyMixture: classifyMixture,
    blendWithAir: blendWithAir,
    blendPathCrossesFlammable: blendPathCrossesFlammable,
    airFractionForTarget: airFractionForTarget,
    assessBlendSafety: assessBlendSafety,

    molarDensity: molarDensity,
    volFractionToGm3: volFractionToGm3,
    gm3ToVolFraction: gm3ToVolFraction,

    monod: monod,
    temperatureFactor: temperatureFactor,
    moistureFactor: moistureFactor,
    phFactor: phFactor,
    rateFactors: rateFactors,
    intrinsicRate: intrinsicRate,
    realizedRate: realizedRate,

    solveProfile: solveProfile
  };

})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
