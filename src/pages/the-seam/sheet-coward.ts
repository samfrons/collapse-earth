/**
 * Sheet 4 — the biological route (model M-004).
 *
 * Act II establishes that everything between 2% and 30% CH₄ is handled "sealed and
 * diluted, never used raw". That sentence hides the actual hazard. Dilution is not a
 * jump from one composition to another; it is a **path**, and the path runs through
 * the band the safety factors were drawn to keep you out of. This sheet draws the path.
 *
 * The bed on the right is the biological alternative to the oxidizer for the diluted
 * stream: methanotrophs oxidising methane at ambient temperature with no support fuel.
 * It is drawn as a profile **shape** and nothing more — this page states no removal
 * efficiency for it, because the kinetics behind it are uncalibrated.
 *
 * Gas compositions are the page's own sourced anchors rather than fresh numbers, so
 * this sheet cannot drift away from Act II.
 */

import * as d3 from 'd3';

import {
  airFractionForTarget,
  blendPathCrossesFlammable,
  blendWithAir,
  classifyMixture,
  effectiveLowerLimit,
  effectiveUpperLimit,
  solveProfile,
  type FlammabilityLimits,
  type Mixture,
} from '@/bio';
import { byId, setHtml, setText } from '@/lib/dom';
import { html } from '@/lib/html';
import type { NonEmpty } from '@/lib/array';
import { cowardLimits } from './coward-limits';
import { P } from './params';

const INK = '#D7E7F2';
const HOT = '#F6A97F';
const COOL = '#8FB8C7';
const RAW = '#C9B693';

/**
 * Air ingress — the mine breathes, and that is where the oxygen comes from.
 *
 * UNECE No. 64 names oxygen in the extracted gas as the diagnostic for air ingress,
 * and names ingress as the mechanism behind falling purity in an unsealed working under
 * suction. If the diluent is air, the oxygen follows arithmetically from the purity the
 * page already models — which is better than an editorial constant, because it means
 * this sheet's oxygen is *derived from Act II* rather than asserted beside it:
 *
 *     CH₄ = c₀·(1 − f)  and  O₂ = 20.9·f  with f the ingressed air fraction
 *   ⇒ O₂ = 20.9·(1 − c/c₀)
 *
 * A perfect seal returns zero, which is the honest answer: no ingress, no oxygen.
 */
export const ingressO2 = (purityNow: number, purityAtStart: number): number => {
  if (purityAtStart <= 0) return 0;
  const f = 1 - purityNow / purityAtStart;
  return Math.max(0, Math.min(1, f)) * P('cow_airo2');
};

interface GasCase {
  readonly id: string;
  readonly chip: string;
  readonly label: string;
  readonly ch4: () => number;
  readonly o2: () => number;
}

export const GAS_CASES: NonEmpty<GasCase> = [
  {
    id: 'sealed',
    chip: 'sealed',
    label: 'sealed working',
    ch4: () => P('c_sealed') * 100,
    o2: () => ingressO2(P('c_sealed'), P('c_sealed')),
  },
  {
    id: 'leaky',
    chip: 'leaky',
    label: 'unsealed working',
    // Lohberg's own starting purity: suction has begun but the decade of ingress has
    // not yet run, so the oxygen is still near zero.
    ch4: () => P('c_leaky0') * 100,
    o2: () => ingressO2(P('c_leaky0'), P('c_sealed')),
  },
  {
    id: 'late',
    chip: 'late-life',
    label: 'unsealed, a decade on',
    // Purity from the page's own leak rate; oxygen from that purity.
    ch4: () => (P('c_leaky0') - P('leak_rate') * 10) * 100,
    o2: () => ingressO2(P('c_leaky0') - P('leak_rate') * 10, P('c_sealed')),
  },
  {
    id: 'vam',
    chip: 'ventilation air',
    label: 'ventilation air — active mine, for contrast',
    ch4: () => P('cow_vam_ch4'),
    o2: () => P('cow_airo2') - 0.3,
  },
];

const state = { gas: 'sealed', target: 1.0 };

const gasCase = (id: string): GasCase => GAS_CASES.find((g) => g.id === id) ?? GAS_CASES[0];

interface Solution {
  readonly raw: Required<Mixture>;
  readonly lim: FlammabilityLimits;
  readonly fEnd: number;
  readonly pts: readonly { f: number; ch4: number; o2: number; flammable: boolean }[];
  readonly enter: number | null;
  readonly exit: number | null;
  readonly crosses: boolean;
  /** A stream already at or below the target needs no air, so there is no path to draw. */
  readonly noDilution: boolean;
  readonly endpoint: Required<Mixture>;
}

/**
 * Walk the blend once and hand back everything both the drawing and the prose need, so
 * the two cannot disagree about what the model said.
 *
 * The **safety** answer comes from the model, which refines its edges by bisection —
 * never from this loop. The loop exists only to draw the curve, and drawing resolution
 * must not be able to change what the page claims.
 */
const solvePath = (def: GasCase, targetCh4: number): Solution => {
  const raw: Required<Mixture> = { ch4VolPct: def.ch4(), o2VolPct: def.o2(), co2VolPct: 0 };
  const lim = cowardLimits();
  const fEnd = airFractionForTarget(raw.ch4VolPct, targetCh4);
  const path = blendPathCrossesFlammable(raw, fEnd, lim);

  const N = 300;
  const pts: { f: number; ch4: number; o2: number; flammable: boolean }[] = [];
  for (let i = 0; i <= N; i++) {
    const f = (fEnd * i) / N;
    const mix = blendWithAir(raw, f, lim);
    // Colour the drawn segment from the model's edges, so a sample that falls just
    // outside a narrow window still renders as hot.
    const flammable =
      path.crosses &&
      path.firstCrossingAirFraction !== null &&
      path.lastCrossingAirFraction !== null &&
      f >= path.firstCrossingAirFraction &&
      f <= path.lastCrossingAirFraction;
    pts.push({ f, ch4: mix.ch4VolPct, o2: mix.o2VolPct, flammable });
  }

  return {
    raw,
    lim,
    fEnd,
    pts,
    enter: path.firstCrossingAirFraction,
    exit: path.lastCrossingAirFraction,
    crosses: path.crosses,
    noDilution: fEnd <= 1e-6,
    endpoint: blendWithAir(raw, fEnd, lim),
  };
};

const ariaFor = (def: GasCase, sol: Solution): string =>
  `Sheet 4, model M-004: Coward flammability triangle with the dilution path for ` +
  `${def.label} at ${sol.raw.ch4VolPct.toFixed(1)} percent methane, diluted to ` +
  `${state.target.toFixed(1)} percent. ` +
  (sol.crosses
    ? 'The path passes through the flammable envelope between air fractions ' +
      `${(sol.enter ?? 0).toFixed(3)} and ${(sol.exit ?? 0).toFixed(3)}.`
    : 'The path stays outside the flammable envelope for its whole length.');

const paintNote = (def: GasCase, sol: Solution): void => {
  const rawSafe = !classifyMixture(sol.raw.ch4VolPct, sol.raw.o2VolPct, sol.lim).flammable;
  const opening = html`<b>${def.label}</b> — ${sol.raw.ch4VolPct.toFixed(1)}% CH₄,
    ${sol.raw.o2VolPct.toFixed(1)}% O₂, ${rawSafe ? 'not flammable' : 'FLAMMABLE AS FOUND'}. `;

  let body;
  if (sol.crosses && sol.enter !== null && sol.exit !== null) {
    const mEnter = blendWithAir(sol.raw, sol.enter, sol.lim);
    const mExit = blendWithAir(sol.raw, sol.exit, sol.lim);
    body = html`To ${state.target.toFixed(1)}% needs ${(sol.fEnd * 100).toFixed(1)}% air, of which
      ${((sol.exit - sol.enter) * 100).toFixed(1)}% sits inside the explosive envelope —
      ${mEnter.ch4VolPct.toFixed(1)}% down to ${mExit.ch4VolPct.toFixed(1)}% CH₄.
      <b>Both ends of the path are safe. The middle is not.</b> Bed held: interlock, not result.`;
  } else if (sol.noDilution) {
    body = html`Already under ${state.target.toFixed(1)}%: no air added, so no path to cross. Dilute
    gas is the only gas never walked through the envelope.`;
  } else {
    body = html`To ${state.target.toFixed(1)}% never enters the envelope — this stream starts below
    the lower flammable limit.`;
  }

  setHtml(byId('cowNote'), html`${opening}${body}`);
};

type Svg = d3.Selection<d3.BaseType, unknown, HTMLElement, unknown>;

/**
 * The packed bed as a vertical column of solver cells, shaded by how much methane is
 * left at that depth **relative to its own inlet**. Deliberately a fraction and not a
 * concentration: the shape of the profile is defensible, the magnitude is not.
 */
const drawBed = (svg: Svg, x: number, y: number, w: number, h: number, sol: Solution): void => {
  const CELLS = 14;
  const profile = solveProfile({
    inletCh4VolPct: Math.max(0.05, sol.endpoint.ch4VolPct),
    inletO2VolPct: sol.endpoint.o2VolPct,
    bedDepth_m: 1.2,
    vesselDiameter_m: 3.0,
    // 50 m³/h through this vessel is a 10.2 min empty-bed residence time, inside the
    // 1.6–19.5 min band Limbri actually measured.
    gasFlow_m3PerH: 50,
    cellCount: CELLS,
    temperatureC: 25,
    pressurePa: 101325,
    moisture: 0.5,
    ph: 7.0,
    nutrient: 1,
    biomass_gm3: 5000,
    biology: {
      vMax_gCH4_per_gVSS_per_h: 0.01,
      kCH4_gm3: 6.6,
      kO2_gm3: 4.0,
      cardinalTemperature: { minC: 2, optC: 30, maxC: 45 },
      phMin: 4.5,
      phOptLo: 6.5,
      phOptHi: 7.5,
      phMax: 9.0,
    },
    medium: {
      specificSurfaceArea_m2PerM3: 350,
      gasFilmCoefficient_mPerH: 5,
      moistureResponse: { minTheta: 0.15, optLo: 0.4, optHi: 0.65, maxTheta: 0.95 },
    },
  });

  const halted = sol.crosses;
  const ch = h / CELLS;

  for (let i = 0; i < CELLS; i++) {
    const frac = profile.cells[i]?.frac ?? 0;
    // Ochre where methane is still present, cooling to ice as it is consumed.
    svg
      .append('rect')
      .attr('x', x)
      .attr('y', y + i * ch)
      .attr('width', w)
      .attr('height', ch - 1)
      .attr('fill', halted ? '#2A3A47' : d3.interpolateRgb('#C8973F', '#3E6B7A')(1 - frac))
      .attr('fill-opacity', halted ? 0.5 : 0.92)
      .attr('stroke', INK)
      .attr('stroke-width', 0.4)
      .attr('opacity', 0.95);
  }

  // REDUNDANT ENCODING, the same rule the assay field follows: the profile must survive
  // colour-vision deficiency and a greyscale print. The ochre→ice ramp alone does not —
  // at realistic conversions its two ends measure barely 1.5:1 apart, so the gradient is
  // close to invisible as a quantity. A polyline whose horizontal position tracks
  // methane remaining carries the same information as position, which needs no hue at
  // all. Drawn as a dark casing under a paper-white line so it holds contrast over every
  // fill in the ramp.
  if (!halted) {
    const pts = profile.cells.map(
      (c, k) => [x + 3 + (w - 6) * c.frac, y + (k + 0.5) * ch] as const,
    );
    const d = `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}`;
    svg
      .append('path')
      .attr('d', d)
      .attr('fill', 'none')
      .attr('stroke', '#0B1A28')
      .attr('stroke-width', 3.4)
      .attr('stroke-linejoin', 'round');
    svg
      .append('path')
      .attr('d', d)
      .attr('fill', 'none')
      .attr('stroke', '#F2F8FC')
      .attr('stroke-width', 1.5)
      .attr('stroke-linejoin', 'round');
    // Endpoints, so the direction of travel is unambiguous.
    for (const p of [pts[0], pts[pts.length - 1]]) {
      if (!p) continue;
      svg
        .append('circle')
        .attr('cx', p[0])
        .attr('cy', p[1])
        .attr('r', 2.2)
        .attr('fill', '#F2F8FC')
        .attr('stroke', '#0B1A28')
        .attr('stroke-width', 0.9);
    }
  }

  svg
    .append('rect')
    .attr('x', x)
    .attr('y', y)
    .attr('width', w)
    .attr('height', h)
    .attr('fill', 'none')
    .attr('stroke', INK)
    .attr('stroke-width', 1);

  const label = (
    tx: number,
    ty: number,
    text: string,
    size: number,
    anchor: string,
    opacity = 1,
  ): void => {
    svg
      .append('text')
      .attr('x', tx)
      .attr('y', ty)
      .attr('text-anchor', anchor)
      .style('font-family', 'var(--mono)')
      .style('font-size', `${size}px`)
      .style('letter-spacing', '.08em')
      .attr('fill', INK)
      .attr('opacity', opacity)
      .text(text);
  };

  label(x + w / 2, y - 8, halted ? 'BED — HELD' : 'PACKED BED', 8, 'middle');
  label(x + w + 7, y + 9, 'gas in', 7.5, 'start', 0.82);
  label(x + w + 7, y + h - 2, 'gas out', 7.5, 'start', 0.82);
  label(x + w / 2, y + h + 15, halted ? 'interlock' : 'CH₄ left, shape only', 7.5, 'middle', 0.82);
};

export const drawCoward = (): void => {
  const def = gasCase(state.gas);
  const sol = solvePath(def, state.target);
  const lim = sol.lim;

  const W = 900;
  const H = 430;
  const M = { t: 18, r: 172, b: 46, l: 58 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const Y0 = 0.2;
  const Y1 = 100;

  const sx = (o2: number): number => M.l + (o2 / 21) * iw;
  const sy = (ch4: number): number => {
    const v = Math.max(Y0, Math.min(Y1, ch4));
    return M.t + ih - (Math.log(v / Y0) / Math.log(Y1 / Y0)) * ih;
  };

  const svg = d3.select('#cowSvg');
  svg.selectAll('*').remove();
  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('height', null)
    .attr('aria-label', ariaFor(def, sol));

  // The same clamp as the other sheets: hierarchy from size, never from fading.
  const txt = (
    x: number,
    y: number,
    s: string | number,
    size = 8,
    anchor = 'start',
    op = 1,
  ): void => {
    svg
      .append('text')
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', anchor)
      .style('font-family', 'var(--mono)')
      .style('font-size', `${size}px`)
      .style('letter-spacing', '.08em')
      .attr('fill', INK)
      .attr('opacity', Math.max(op, 0.78))
      .text(String(s));
  };

  for (const tick of [0.2, 0.5, 1, 2, 5, 10, 15, 25, 50, 100]) {
    const yy = sy(tick);
    svg
      .append('line')
      .attr('x1', M.l)
      .attr('y1', yy)
      .attr('x2', M.l + iw)
      .attr('y2', yy)
      .attr('stroke', INK)
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.18);
    txt(M.l - 7, yy + 3, tick, 8, 'end');
  }
  for (let o2 = 0; o2 <= 21; o2 += 3) {
    svg
      .append('line')
      .attr('x1', sx(o2))
      .attr('y1', M.t)
      .attr('x2', sx(o2))
      .attr('y2', M.t + ih)
      .attr('stroke', INK)
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.18);
    txt(sx(o2), M.t + ih + 15, o2, 8, 'middle');
  }
  txt(M.l + iw / 2, H - 12, 'oxygen, % v/v', 8.5, 'middle');
  svg
    .append('text')
    .attr('transform', `rotate(-90 16 ${M.t + ih / 2})`)
    .attr('x', 16)
    .attr('y', M.t + ih / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', 'var(--mono)')
    .style('font-size', '8.5px')
    .style('letter-spacing', '.08em')
    .attr('fill', INK)
    .text('methane, % v/v — log scale');

  // The envelope.
  const lo: [number, number][] = [];
  const hi: [number, number][] = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const o2 = lim.noseO2 + (21 - lim.noseO2) * (i / N);
    lo.push([sx(o2), sy(effectiveLowerLimit(o2, lim))]);
    hi.push([sx(o2), sy(effectiveUpperLimit(o2, lim))]);
  }
  hi.reverse();
  svg
    .append('path')
    .attr('d', `M${[...lo, ...hi].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`)
    .attr('fill', '#B8391A')
    .attr('fill-opacity', 0.34)
    .attr('stroke', HOT)
    .attr('stroke-width', 1.1);
  svg
    .append('text')
    .attr('x', sx(16.4))
    .attr('y', sy(2.6))
    .attr('text-anchor', 'middle')
    .style('font-family', 'var(--mono)')
    .style('font-size', '8.5px')
    .style('letter-spacing', '.14em')
    .attr('fill', HOT)
    .text('FLAMMABLE');
  svg
    .append('circle')
    .attr('cx', sx(lim.noseO2))
    .attr('cy', sy(lim.noseCh4))
    .attr('r', 2.6)
    .attr('fill', HOT);
  // The label sits left of the nose, clear of the envelope's lower edge.
  svg
    .append('text')
    .attr('x', sx(lim.noseO2) - 8)
    .attr('y', sy(lim.noseCh4) + 3)
    .attr('text-anchor', 'end')
    .style('font-family', 'var(--mono)')
    .style('font-size', '8px')
    .style('letter-spacing', '.08em')
    .attr('fill', HOT)
    .text(`nose · ${lim.noseO2}% O₂`);

  // The dilution path, drawn in runs so the hot stretch reads hot.
  let run = sol.pts[0] ? [sol.pts[0]] : [];
  for (let j = 1; j <= sol.pts.length; j++) {
    const pt = sol.pts[j];
    const head = run[0];
    if (pt?.flammable === head?.flammable && pt && head) {
      run.push(pt);
      continue;
    }
    if (run.length > 1 && head) {
      svg
        .append('path')
        .attr('d', `M${run.map((q) => `${sx(q.o2).toFixed(1)},${sy(q.ch4).toFixed(1)}`).join('L')}`)
        .attr('fill', 'none')
        .attr('stroke', head.flammable ? HOT : COOL)
        .attr('stroke-width', head.flammable ? 3.6 : 1.8)
        .attr('stroke-dasharray', head.flammable ? null : '4 3');
    }
    const prev = sol.pts[j - 1];
    run = pt && prev ? [prev, pt] : [];
  }

  // Endpoints and the crossing.
  svg
    .append('circle')
    .attr('cx', sx(sol.raw.o2VolPct))
    .attr('cy', sy(sol.raw.ch4VolPct))
    .attr('r', 4)
    .attr('fill', RAW)
    .attr('stroke', '#0F2438')
    .attr('stroke-width', 1);

  if (sol.noDilution) {
    // Already treatable: raw gas and bed feed are the same point, so a second marker and
    // a second label would just be two words on top of each other.
    txt(
      sx(sol.raw.o2VolPct) - 9,
      sy(sol.raw.ch4VolPct) + 3,
      'straight to the bed — no dilution',
      8.5,
      'end',
    );
  } else {
    txt(sx(sol.raw.o2VolPct) + 8, sy(sol.raw.ch4VolPct) + 3, 'raw gas', 8.5);
    svg
      .append('circle')
      .attr('cx', sx(sol.endpoint.o2VolPct))
      .attr('cy', sy(sol.endpoint.ch4VolPct))
      .attr('r', 4)
      .attr('fill', COOL)
      .attr('stroke', '#0F2438')
      .attr('stroke-width', 1);
    txt(sx(sol.endpoint.o2VolPct) - 8, sy(sol.endpoint.ch4VolPct) + 3, 'to the bed', 8.5, 'end');
  }

  if (sol.crosses) {
    for (const f of [sol.enter, sol.exit]) {
      if (f === null) continue;
      const m = blendWithAir(sol.raw, f, lim);
      svg
        .append('circle')
        .attr('cx', sx(m.o2VolPct))
        .attr('cy', sy(m.ch4VolPct))
        .attr('r', 5)
        .attr('fill', 'none')
        .attr('stroke', HOT)
        .attr('stroke-width', 1.6);
    }
  }

  drawBed(svg, W - M.r + 30, M.t + 14, 54, 210, sol);

  // The scale reality, in Limbri's own numbers. Not our model's output — a measurement
  // and the authors' own scale-up from it. It belongs on the sheet because it is the
  // strongest argument against the thing the sheet is drawing, and leaving it off would
  // be advocacy.
  const bx = W - M.r + 12;
  const by = M.t + 268;
  svg
    .append('line')
    .attr('x1', bx)
    .attr('y1', by - 14)
    .attr('x2', W - 14)
    .attr('y2', by - 14)
    .attr('stroke', INK)
    .attr('stroke-width', 0.6)
    .attr('opacity', 0.45);
  txt(bx, by, 'MEASURED, NOT MODELLED', 7.5, 'start', 0.95);

  const scaleLines = [
    `${String(P('cow_ec_measured'))} g CH₄ m⁻³ h⁻¹`,
    'peak, at a 1% inlet',
    '',
    `≈${P('cow_ec_bed').toLocaleString('en-GB')} m³ of bed`,
    `at ${String(P('cow_vam_flow'))} m³ s⁻¹`,
  ];
  scaleLines.forEach((line, k) => {
    if (!line) return;
    const strong = k === 0 || k === 3;
    txt(bx, by + 15 + k * 12, line, strong ? 8.5 : 7.5, 'start', strong ? 1 : 0.86);
  });
  txt(bx, by + 15 + 5 * 12 + 4, 'Limbri et al. 2014', 7, 'start', 0.82);

  paintNote(def, sol);
};

export const wireCoward = (): void => {
  const gasEl = document.getElementById('cowGas');
  const targetEl = document.getElementById('cowTgt');
  if (!gasEl || !(targetEl instanceof HTMLInputElement)) return;

  gasEl.addEventListener('change', (ev) => {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || input.name !== 'cowgas') return;
    state.gas = input.value;
    drawCoward();
  });

  targetEl.addEventListener('input', () => {
    state.target = Number.parseFloat(targetEl.value);
    setText(byId('cowTgtVal'), `${state.target.toFixed(1)}%`);
    drawCoward();
  });
};
