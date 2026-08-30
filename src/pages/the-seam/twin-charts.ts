/**
 * Instrument 01 and 02 — the decline chart, the purity chart, the counters.
 *
 * Two futures, one mine, and the gap between them drawn as an area rather than
 * described in a caption. The model's only anchor to a published figure is the red
 * bracket: the twin is *solved through* it, not tuned by hand.
 */

import * as d3 from 'd3';

import { amm } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { grouped, megatonnes } from '@/lib/format';
import { html } from '@/lib/html';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';
import { P } from './params';
import { co2eBoth } from './warming-lenses';
import {
  concentration,
  dryFactor,
  floodedFactor,
  route,
  series,
  ventedSince,
  type SeriesPoint,
  type Twin,
} from './twin-model';
import { playheadYear, twin } from './twin-state';

/** Monthly step, matching the model's own grid. */
const DT = 1 / 12;

interface NowLine {
  readonly x: d3.ScaleLinear<number, number>;
  readonly top: number;
  readonly bottom: number;
  readonly group: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

/**
 * The two charts do not share an x domain: the decline chart starts at the mine's
 * closure year, the purity chart at the unit's start year, and the playhead ranges over
 * the former. A year before a chart's domain must therefore be *omitted* from that
 * chart rather than drawn — an unclamped scale would put the line outside the plot,
 * where it reads as a position on an axis that does not contain it.
 */
const withinDomain = (g: NowLine, year: number): boolean => {
  const [lo, hi] = g.x.domain();
  return lo !== undefined && hi !== undefined && year >= lo && year <= hi;
};

let declineNow: NowLine | null = null;
let routeNow: NowLine | null = null;

type Triple = Record<'low' | 'central' | 'high', readonly SeriesPoint[]>;

const envelope = (s: Triple): { year: number; lo: number; hi: number }[] =>
  s.central.map((d, i) => {
    const lo = s.low[i]?.q ?? d.q;
    const hi = s.high[i]?.q ?? d.q;
    return { year: d.year, lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
  });

const declineAria = (tw: Twin, dry: Triple): string => {
  const last = dry.central[dry.central.length - 1];
  return (
    `Decline chart for ${tw.mine.name}, ${twin.get().status} status: dry path from ` +
    `${String(Math.round(tw.q0))} down to ${(last?.q ?? 0).toFixed(1)} MCM per year across ` +
    `${tw.closed} to ${String(P('horizon'))}; flooded path reaching zero by ` +
    `${String(Math.round(tw.closed + P('T_zero_fl')))}. GEM anchor mean ${tw.anchor} ` +
    'MCM per year. All values modelled.'
  );
};

export const drawDecline = (tw: Twin): void => {
  const svg = d3.select('#declineSvg');
  svg.selectAll('*').remove();

  const W = 900;
  const H = 400;
  const plotL = 64;
  const plotR = 872;
  const plotTop = 26;
  const plotBot = 322;
  const axisY = plotBot + 6;

  const dry: Triple = {
    low: series(tw, 'dry', 'low'),
    central: series(tw, 'dry', 'central'),
    high: series(tw, 'dry', 'high'),
  };
  const flooded: Triple = {
    low: series(tw, 'flooded', 'low'),
    central: series(tw, 'flooded', 'central'),
    high: series(tw, 'flooded', 'high'),
  };

  const x = d3
    .scaleLinear()
    .domain([tw.closed, P('horizon')])
    .range([plotL, plotR]);
  const yMax = tw.q0 * 1.06;
  const y = d3.scaleLinear().domain([0, yMax]).range([plotBot, plotTop]);

  const { status, startYear } = twin.get();
  const showDry = status !== 'flooded';
  const showFlooded = status !== 'dry';

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('aria-label', declineAria(tw, dry));

  const axis = svg.append('g').attr('class', 'fd-axis').attr('color', '#17130E');
  axis.append('line').attr('x1', plotL).attr('x2', plotR).attr('y1', axisY).attr('y2', axisY);
  for (let yr = Math.ceil(tw.closed / 5) * 5; yr <= P('horizon'); yr += 5) {
    axis
      .append('line')
      .attr('x1', x(yr))
      .attr('x2', x(yr))
      .attr('y1', axisY)
      .attr('y2', axisY + 5);
    axis
      .append('text')
      .attr('x', x(yr))
      .attr('y', axisY + 17)
      .attr('text-anchor', 'middle')
      .text(String(yr));
  }
  for (const v of d3.ticks(0, yMax, 5)) {
    axis
      .append('line')
      .attr('x1', plotL - 5)
      .attr('x2', plotL)
      .attr('y1', y(v))
      .attr('y2', y(v));
    axis
      .append('text')
      .attr('x', plotL - 8)
      .attr('y', y(v) + 3)
      .attr('text-anchor', 'end')
      .text(String(Math.round(v)));
  }
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotL)
    .attr('y', H - 26)
    .text('calendar year →');
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('transform', `translate(14,${String((plotTop + plotBot) / 2)}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .text('MCM CH₄ / yr · editorial model, not a measurement');

  const line = d3
    .line<SeriesPoint>()
    .x((d) => x(d.year))
    .y((d) => y(d.q));
  const area = d3
    .area<{ year: number; lo: number; hi: number }>()
    .x((d) => x(d.year))
    .y0((d) => y(d.lo))
    .y1((d) => y(d.hi));

  // Forfeited years — the area under the dry curve between the first possible start
  // and the chosen one, hatched: delay made visible in place.
  if (startYear > 2026) {
    const pattern = svg
      .append('defs')
      .append('pattern')
      .attr('id', 'hatchForf')
      .attr('width', 6)
      .attr('height', 6)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(135)');
    pattern
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', 6)
      .attr('stroke', '#5A1A0C')
      .attr('stroke-width', 1.3)
      .attr('opacity', 0.85);

    const forfeited = dry.central.filter((d) => d.year >= 2026 && d.year <= startYear);
    if (forfeited.length > 1) {
      svg
        .append('path')
        .attr(
          'd',
          d3
            .area<SeriesPoint>()
            .x((d) => x(d.year))
            .y0(y(0))
            .y1((d) => y(d.q))(forfeited) ?? '',
        )
        .attr('fill', 'url(#hatchForf)')
        .attr('opacity', 0.8);
      svg
        .append('text')
        .attr('class', 'fd-hd')
        .attr('x', x((2026 + startYear) / 2))
        .attr('y', y(0) - 8)
        .attr('text-anchor', 'middle')
        .style('fill', '#5A1A0C')
        .text('FORFEITED');
    }
  }

  // The flooding gap — the honest default state's centrepiece.
  if (showDry && showFlooded) {
    const gap = dry.central.map((d, i) => ({
      year: d.year,
      lo: flooded.central[i]?.q ?? 0,
      hi: d.q,
    }));
    svg
      .append('path')
      .attr('d', area(gap) ?? '')
      .attr('fill', '#3E6B7A')
      .attr('opacity', 0.14);

    const mid = Math.floor(dry.central.length * 0.45);
    const gy = y(((dry.central[mid]?.q ?? 0) + (flooded.central[mid]?.q ?? 0)) / 2);
    svg
      .append('text')
      .attr('class', 'fd-hd')
      .attr('x', x(tw.closed + (P('horizon') - tw.closed) * 0.45))
      .attr('y', gy)
      .attr('text-anchor', 'middle')
      .style('fill', '#17130E')
      .text('the flooding gap — one unknown bit');
  }

  if (showDry) {
    svg
      .append('path')
      .attr('d', area(envelope(dry)) ?? '')
      .attr('fill', 'rgba(23,19,14,.08)');
    svg
      .append('path')
      .attr('d', line(dry.central) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 2);
    const last = dry.central[dry.central.length - 1];
    if (last) {
      svg
        .append('text')
        .attr('class', 'fd-val')
        .attr('x', x(last.year) - 2)
        .attr('y', y(last.q) - 7)
        .attr('text-anchor', 'end')
        .text(`dry — still ≈${last.q.toFixed(1)} MCM/yr in ${String(Math.round(last.year))}`);
    }
  }

  if (showFlooded) {
    svg
      .append('path')
      .attr('d', area(envelope(flooded)) ?? '')
      .attr('fill', 'rgba(23,19,14,.08)');
    svg
      .append('path')
      .attr('d', line(flooded.central) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '7 4');
    const zeroYear = tw.closed + P('T_zero_fl');
    svg
      .append('text')
      .attr('class', 'fd-val')
      .attr('x', x(Math.min(zeroYear + 1, P('horizon') - 2)))
      .attr('y', y(0) - 8)
      .attr('text-anchor', 'start')
      .text(`flooded — ends by ${String(Math.round(zeroYear))}`);
  }

  // The anchor: a MEAN over the window, drawn as a bracket, not a point.
  const wx0 = x(tw.closed);
  const wx1 = x(tw.closed + tw.anchorWindow);
  const wy = y(tw.anchor);
  svg
    .append('line')
    .attr('x1', wx0)
    .attr('x2', wx1)
    .attr('y1', wy)
    .attr('y2', wy)
    .attr('stroke', '#5A1A0C')
    .attr('stroke-width', 1.6);
  for (const bx of [wx0, wx1]) {
    svg
      .append('line')
      .attr('x1', bx)
      .attr('x2', bx)
      .attr('y1', wy - 5)
      .attr('y2', wy + 5)
      .attr('stroke', '#5A1A0C')
      .attr('stroke-width', 1.6);
  }

  const anchorG = svg
    .append('g')
    .attr('class', 'fd-mk')
    .attr('tabindex', 0)
    .attr('role', 'img')
    .attr(
      'aria-label',
      `GEM 2024 anchor: mean ${tw.anchor} MCM per year over ${tw.closed} to ` +
        `${tw.closed + tw.anchorWindow}, assuming the dry path. The model's q-zero is ` +
        'solved to reproduce this mean.',
    );
  anchorG
    .append('circle')
    .attr('cx', (wx0 + wx1) / 2)
    .attr('cy', wy)
    .attr('r', 4.5)
    .attr('fill', '#5A1A0C');
  anchorG
    .append('circle')
    .attr('cx', (wx0 + wx1) / 2)
    .attr('cy', wy)
    .attr('r', 8.5)
    .attr('fill', 'none')
    .attr('stroke', '#5A1A0C');
  svg
    .append('text')
    .attr('class', 'fd-val')
    .attr('x', wx1 + 8)
    .attr('y', wy + 3)
    .text(`GEM 2024 · mean ${tw.closed}–${tw.closed + tw.anchorWindow} · assumes dry`);

  const anchorTip = html`<b>the anchor</b>GEM's published figure is a mean over
    ${tw.closed}–${tw.closed + tw.anchorWindow}, not a spot rate.<br />The twin derives its starting
    rate by solving the dry curve through this mean — the model is anchored to the source, not tuned
    by hand.`;
  anchorG
    .on('mouseenter', (ev: MouseEvent) => {
      showTip(ev, anchorTip);
    })
    .on('mousemove', (ev: MouseEvent) => {
      showTip(ev, anchorTip);
    })
    .on('mouseleave', hideTip)
    .on('focus', function () {
      showTipAt(this, anchorTip);
    })
    .on('blur', hideTip);

  declineNow = { x, top: plotTop, bottom: plotBot, group: svg.append('g') };

  // The validation sentence is DERIVED, never typed: swap the specimen or edit a decline
  // constant and this recomputes — or disappears, when the mine has no published flooded
  // figure to check against. A typed agreement would go on claiming a match the model no
  // longer makes.
  const delta = tw.mine.floodedDelta;
  const crossCheck = delta
    ? html` One check worth knowing: anchored only on this mine's dry figure, the model
        <em>predicts</em> a flooded-path mean of ≈${tw.floodedMeanImplied.toFixed(1)} MCM/yr over
        GEM's window — GEM's independently published flooded figure is ${delta.flooded}. A
        ${Math.round((Math.abs(tw.floodedMeanImplied - delta.flooded) / delta.flooded) * 100)}% miss
        with zero tuning is the strongest evidence on this page that the corrected constants are the
        ones GEM itself used.`
    : html` GEM publishes no separate flooded figure for this mine, so the cross-check that
      validates the constants (see Auguste Victoria) cannot be run here.`;

  setHtml(
    byId('declineFoot'),
    html`<strong>Two futures, one mine.</strong> The solid curve is the dry path — hyperbolic, q =
      q₀(1 + b·D·t)^(−1/b) with b = ${P('b_dry')} and D = ${P('D_dry')}/yr (Kholod et al. 2020),
      leaking for decades. The dashed curve is the flooded path — exponential at ${P('D_fl')}/yr
      (EPA's flooding coefficient), effectively zero within ${P('T_zero_fl')} years. One publishing
      note the assumptions record: the paper's parameter table mis-assigns these rows, and the
      values here follow EPA's own coefficients instead. The dry band is not a guess any more: it
      spans the fastest and slowest of EPA's own nine bituminous decline curves (Appendix B, Table
      B5 — permeability × mine size), a citable structural spread. A finding worth having: the
      global Kholod fit rides the SLOW edge of that family — aggregate modelling assumes the long
      tail. The flooded band keeps an editorial ±${Math.round(P('spread') * 100)}%. The tinted
      region between the curves is what one unknown bit — flooded or not — does to the number. The
      red bracket is the model's only anchor to a published figure, and the model is solved through
      it, not tuned by hand.${crossCheck}`,
  );
};

/* -------------------------------------------------------------------------- */
/* The purity chart                                                           */
/* -------------------------------------------------------------------------- */

const ROUTE_SHORT: Record<string, string> = {
  engine: 'engine',
  margin: 'dilute → RTO',
  rto: 'RTO direct',
  end: 'end',
};

export const drawRoute = (): void => {
  const svg = d3.select('#routeSvg');
  svg.selectAll('*').remove();

  const W = 900;
  const H = 470;
  const plotL = 186;
  const plotR = 872;
  const plotTop = 22;
  const plotBot = 300;
  const stripY = 330;
  const stripH = 20;
  const stripGap = 6;
  const axisY = plotBot + 6;

  const { seal, startYear } = twin.get();
  const y0 = startYear;
  const y1 = P('horizon');

  setText(byId('routeK'), `purity · seal-governed, not age-governed · operating years from ${y0}`);

  const x = d3.scaleLinear().domain([y0, y1]).range([plotL, plotR]);
  const y = d3.scaleLog().domain([0.0015, 1]).range([plotBot, plotTop]).clamp(true);

  const bands = [
    {
      lo: P('thr_engine'),
      hi: 1,
      label: `engine · ≥${String(Math.round(P('thr_engine') * 100))}% quality spec`,
    },
    { lo: P('margin_lo'), hi: P('thr_engine'), label: 'no raw use · dilute → RTO' },
    { lo: P('thr_rto'), hi: P('margin_lo'), label: 'regenerative oxidation' },
    { lo: 0.0015, hi: P('thr_rto'), label: 'end of abatement' },
  ];

  const showSealed = seal !== 'leaky';
  const showLeaky = seal !== 'sealed';

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr(
      'aria-label',
      `Purity chart, seal state ${seal}: methane concentration of the extracted stream ` +
        'against operating years. A well-sealed mine holds about ' +
        `${String(Math.round(P('c_sealed') * 100))} percent — Stillingfleet ran 80 to 85 ` +
        'percent fifteen years after closure. A leaky mine starts near ' +
        `${String(Math.round(P('c_leaky0') * 100))} percent and loses about ` +
        `${(P('leak_rate') * 100).toFixed(1)} points a year under its own suction — Lohberg ` +
        'fell from 40 to 25 percent over a decade. Regime bands: engine above ' +
        `${String(Math.round(P('thr_engine') * 100))} percent, sealed dilution to the ` +
        'regenerative oxidizer below, a hatched explosive core between ' +
        `${String(Math.round(P('lel') * 100))} and ${String(Math.round(P('uel') * 100))} ` +
        'percent never operated. Era strips beneath name the active module per seal future. ' +
        'Anchors cited to UNECE Energy Series 64.',
    );

  const pattern = svg
    .append('defs')
    .append('pattern')
    .attr('id', 'hatchShut')
    .attr('width', 7)
    .attr('height', 7)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(135)');
  pattern.append('rect').attr('width', 7).attr('height', 7).attr('fill', 'rgba(90,26,12,.10)');
  pattern
    .append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 7)
    .attr('stroke', '#5A1A0C')
    .attr('stroke-width', 1.2);

  bands.forEach((b, i) => {
    const yTop = y(b.hi);
    const yBot = y(b.lo);
    svg
      .append('rect')
      .attr('x', plotL)
      .attr('y', yTop)
      .attr('width', plotR - plotL)
      .attr('height', yBot - yTop)
      .attr('fill', i % 2 ? 'rgba(23,19,14,.05)' : 'transparent')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.35);
    svg
      .append('text')
      .attr('class', 'fd-hd')
      .attr('x', plotL - 6)
      .attr('y', (yTop + yBot) / 2 + 3)
      .attr('text-anchor', 'end')
      .text(b.label);
  });

  svg
    .append('rect')
    .attr('x', plotL)
    .attr('y', y(P('uel')))
    .attr('width', plotR - plotL)
    .attr('height', y(P('lel')) - y(P('uel')))
    .attr('fill', 'url(#hatchShut)');
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotR - 8)
    .attr('y', (y(P('uel')) + y(P('lel'))) / 2 + 3)
    .attr('text-anchor', 'end')
    .style('fill', '#5A1A0C')
    .text(
      `EXPLOSIVE ${String(Math.round(P('lel') * 100))}–${String(Math.round(P('uel') * 100))}% ` +
        '· SAFETY MARGIN 2–30%',
    );

  const sealPoints = (state: 'sealed' | 'leaky'): { year: number; c: number }[] => {
    const out: { year: number; c: number }[] = [];
    for (let t = 0; y0 + t <= y1; t += DT) out.push({ year: y0 + t, c: concentration(t, state) });
    return out;
  };
  const pSealed = sealPoints('sealed');
  const pLeaky = sealPoints('leaky');

  const line = d3
    .line<{ year: number; c: number }>()
    .x((d) => x(d.year))
    .y((d) => y(Math.max(d.c, 0.0015)));

  if (showSealed && showLeaky) {
    svg
      .append('path')
      .attr(
        'd',
        d3
          .area<{ year: number; c: number }>()
          .x((d) => x(d.year))
          .y0((_d, i) => y(Math.max(pLeaky[i]?.c ?? 0.0015, 0.0015)))
          .y1((d) => y(d.c))(pSealed) ?? '',
      )
      .attr('fill', '#1F4152')
      .attr('opacity', 0.12);
    svg
      .append('text')
      .attr('class', 'fd-hd')
      .attr('x', x(y0 + (y1 - y0) * 0.6))
      .attr('y', y(0.5))
      .attr('text-anchor', 'middle')
      .style('fill', '#17130E')
      .text('THE SEAL GAP — SURVEYED FOR THOUSANDS, BET ON FOR MILLIONS');
  }

  if (showSealed) {
    svg
      .append('path')
      .attr('d', line(pSealed) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 2);
    svg
      .append('text')
      .attr('class', 'fd-val')
      .attr('x', plotR - 4)
      .attr('y', y(P('c_sealed')) - 7)
      .attr('text-anchor', 'end')
      .text('sealed — Stillingfleet held 80–85% at +15 yr');
  }

  if (showLeaky) {
    svg
      .append('path')
      .attr('d', line(pLeaky) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '7 4');
    // The Lohberg anchor: start point and the ten-year mark, both cited.
    svg
      .append('circle')
      .attr('cx', x(y0))
      .attr('cy', y(P('c_leaky0')))
      .attr('r', 4.5)
      .attr('fill', '#5A1A0C');
    svg
      .append('text')
      .attr('class', 'fd-val')
      .attr('x', x(y0) + 8)
      .attr('y', y(P('c_leaky0')) - 8)
      .text('leaky — Lohberg: 40% at suction start…');
    const c10 = concentration(10, 'leaky');
    svg
      .append('circle')
      .attr('cx', x(y0 + 10))
      .attr('cy', y(c10))
      .attr('r', 4.5)
      .attr('fill', 'none')
      .attr('stroke', '#5A1A0C')
      .attr('stroke-width', 1.6);
    svg
      .append('text')
      .attr('class', 'fd-val')
      .attr('x', x(y0 + 10) + 8)
      .attr('y', y(c10) + 14)
      .text('…25% ten years later (№64, Fig. 9.3)');
  }

  const axis = svg.append('g').attr('class', 'fd-axis').attr('color', '#17130E');
  axis.append('line').attr('x1', plotL).attr('x2', plotR).attr('y1', axisY).attr('y2', axisY);
  for (let yr = Math.ceil(y0 / 5) * 5; yr <= y1; yr += 5) {
    axis
      .append('line')
      .attr('x1', x(yr))
      .attr('x2', x(yr))
      .attr('y1', axisY)
      .attr('y2', axisY + 5);
    axis
      .append('text')
      .attr('x', x(yr))
      .attr('y', axisY + 17)
      .attr('text-anchor', 'middle')
      .text(String(yr));
  }
  for (const [v, label] of [
    [1, '100%'],
    [0.35, '35%'],
    [0.15, '15%'],
    [0.05, '5%'],
    [0.02, '2%'],
    [0.002, '0.2%'],
  ] as const) {
    axis
      .append('line')
      .attr('x1', plotL - 4)
      .attr('x2', plotL)
      .attr('y1', y(v))
      .attr('y2', y(v));
    axis
      .append('text')
      .attr('x', plotR + 6)
      .attr('y', y(v) + 3)
      .attr('text-anchor', 'start')
      .text(label);
  }
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotL)
    .attr('y', plotTop - 8)
    .text('CH₄ concentration · log · seal-governed (UNECE №64) · operating years under suction');

  // Era strips — one per visible seal future.
  const eras = (state: 'sealed' | 'leaky'): { id: string; from: number; to: number }[] => {
    const out: { id: string; from: number; to: number }[] = [];
    for (let t = 0; y0 + t <= y1; t += DT) {
      const r = route(concentration(t, state));
      const last = out[out.length - 1];
      if (last?.id === r.id) last.to = y0 + t;
      else out.push({ id: r.id, from: y0 + t, to: y0 + t });
    }
    return out;
  };

  const rows: { tag: string; list: { id: string; from: number; to: number }[] }[] = [];
  if (showSealed) rows.push({ tag: 'SEALED', list: eras('sealed') });
  if (showLeaky) rows.push({ tag: 'LEAKY', list: eras('leaky') });

  rows.forEach((row, ri) => {
    const yTop = stripY + ri * (stripH + stripGap);
    svg
      .append('text')
      .attr('class', 'fd-hd')
      .attr('x', plotL - 6)
      .attr('y', yTop + stripH / 2 + 3)
      .attr('text-anchor', 'end')
      .text(row.tag);
    row.list.forEach((e, i) => {
      const ex0 = x(e.from);
      const ex1 = x(Math.min(e.to + DT, y1));
      svg
        .append('rect')
        .attr('x', ex0)
        .attr('y', yTop)
        .attr('width', Math.max(1, ex1 - ex0))
        .attr('height', stripH)
        .attr('fill', `rgba(23,19,14,${String(0.1 + (i % 2) * 0.07)})`)
        .attr('stroke', '#17130E')
        .attr('stroke-width', 0.6);
      if (ex1 - ex0 > 40) {
        svg
          .append('text')
          .attr('class', 'fd-hd')
          .attr('x', (ex0 + ex1) / 2)
          .attr('y', yTop + stripH / 2 + 3)
          .attr('text-anchor', 'middle')
          .text(ROUTE_SHORT[e.id] ?? e.id);
      }
    });
  });

  const stripBot = stripY + rows.length * (stripH + stripGap);
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotL)
    .attr('y', stripBot + 14)
    .text('what runs, per seal future — the unit at level iii, era by era');

  routeNow = { x, top: plotTop, bottom: stripBot, group: svg.append('g') };

  setHtml(
    byId('routeFoot'),
    html`<strong>The verification pass rewrote this chart.</strong> Its first draft decayed purity
      as a function of mine age — the literature says otherwise, and supplied both anchors drawn
      here. Purity is governed by SEAL QUALITY and suction management (UNECE Energy Series №64,
      2019): Stillingfleet, behind 'an excellent gas tight seal', was still producing 80–85% CH₄
      fifteen years after closure; unsealed Lohberg fell from ≈40% to 25% over a decade — dragged
      down by its own unmanaged suction pulling air through bad seals, until it starved the >35%
      quality requirement its gensets needed (№64, Table 4.1). Below Lohberg's observed 25% the
      dashed extension is editorial and flagged in the assumptions. Volume, meanwhile, stays
      time-driven (Kholod/EPA) — the model keeps flow and purity separate because the source does.
      The engine floor here is the CHP gas-quality spec, not the 30% transport limit, which is moot
      for a wellhead-mounted unit. And the business point the two anchors make together: the seal
      gap is surveyable for thousands of euros before anyone bets millions — the assessment IS the
      product.`,
  );
};

/* -------------------------------------------------------------------------- */
/* Counters and readout                                                       */
/* -------------------------------------------------------------------------- */

export const drawCounters = (tw: Twin): void => {
  const upto = playheadYear(tw);
  const kt = ventedSince(tw, upto);
  const both = co2eBoth(kt);
  const mammothYears = (both.mt20 * 1000) / P('mammoth');
  const span = Math.round(upto) - tw.closed;

  setHtml(
    byId('twinCounters'),
    html`<div class="counter">
        <span class="readout-k">vented since closure · dry path</span>
        <b>≈${kt < 100 ? kt.toFixed(1) : grouped(kt)} kt CH₄</b>
        <small>${span} years · modelled · IPCC 2006 density convention</small>
      </div>
      <div class="counter">
        <span class="readout-k">both lenses · one tile</span>
        <b>≈${megatonnes(both.mt20)} / ${megatonnes(both.mt100)} Mt</b>
        <small>CO₂e at 20-yr / 100-yr GWP — always together</small>
      </div>
      <div class="counter">
        <span class="readout-k">for scale</span>
        <b>≈${mammothYears < 10 ? mammothYears.toFixed(1) : Math.round(mammothYears)} yr</b>
        <small
          >of Climeworks Mammoth's nameplate capture, 20-yr lens — nameplate, not delivered: ≈1/6 of
          collectors installed at launch</small
        >
      </div>`,
  );
};

export const renderTwinReadout = (tw: Twin): void => {
  const nowYear = new Date().getFullYear();
  const t = Math.max(0, nowYear - tw.closed);
  const qDry = tw.q0 * dryFactor(t, 'central');
  const qFlooded = tw.q0 * floodedFactor(t, 'central');
  const { status } = twin.get();
  const pick = status === 'dry' ? qDry : status === 'flooded' ? qFlooded : null;

  const reading =
    pick === null
      ? qFlooded <= 0.05
        ? html`this year, modelled: either <span class="num">≈${qDry.toFixed(1)}</span> MCM CH₄ — or
            none at all, if it flooded years ago. Nobody has measured which.`
        : html`this year, modelled:
            <span class="num">≈${qFlooded.toFixed(1)}–${qDry.toFixed(1)}</span> MCM CH₄ — the
            flooding gap IS the error bar`
      : html`this year, modelled (${status}): <span class="num">≈${pick.toFixed(1)}</span> MCM CH₄`;

  const ktHi = qDry * amm.conversion.kgPerM3;
  const both = co2eBoth(ktHi);

  setHtml(
    byId('twinReadout'),
    html`<p class="readout-k">the reading · ${nowYear}</p>
      <p style="margin:8px 0 0;font-size:.9375rem">${reading}</p>
      <p class="note" style="margin:8px 0 0;font-size:.75rem">
        Dry-path upper bound ≈${ktHi.toFixed(1)} kt ≈ ${megatonnes(both.mt20)} Mt CO₂e/yr at 20
        years, ${megatonnes(both.mt100)} Mt at 100 (AR6 fossil GWP ${amm.gwp.gwp20}× /
        ${amm.gwp.gwp100}×; IPCC 2006 density convention). Modelled, not measured.
      </p>`,
  );
};

/** The now-lines that ride on top of both charts. */
export const paintNowLines = (year: number): void => {
  for (const g of [routeNow, declineNow]) {
    if (!g) continue;
    g.group.selectAll('*').remove();
    if (!withinDomain(g, year)) continue;
    const px = g.x(year);
    g.group
      .append('line')
      .attr('x1', px)
      .attr('x2', px)
      .attr('y1', g.top)
      .attr('y2', g.bottom)
      .attr('stroke', '#1F4152')
      .attr('stroke-width', 1.4)
      .attr('stroke-dasharray', '4 3');
  }
};
