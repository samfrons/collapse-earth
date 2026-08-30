/**
 * Sheet 2 — process and instrumentation.
 *
 * The router as logic, not prose: pick a gas state on the chips and the drawing routes
 * it — open valves hollow, closed valves filled, the live path in ember, the governing
 * interlock rule lit in the logic block. Detail B explains why the oxidizer can burn
 * 0.2% gas.
 */

import * as d3 from 'd3';

import { amm } from '@/data';
import { byId, setText } from '@/lib/dom';
import { INK, pen, type Mark, type Svg } from './blueprint';
import { P } from './params';

const EMBER = '#F6A97F';

type Bucket = 'feed' | 'rich' | 'mid' | 'lean' | 'dil';
type ValveId = 'esd' | 'v101' | 'v102' | 'v103' | 'fv104';

interface Sheet {
  readonly segments: Record<Bucket, Mark[]>;
  readonly valves: Partial<Record<ValveId, Mark>>;
  readonly rules: { id: string; el: Mark }[];
  stamp: Mark | null;
}

let sheet: Sheet | null = null;

/** Which preset the chips have selected. */
export const unit = { state: 'rich' };

export const drawPid = (): void => {
  const svg = d3.select('#pidSvg') as Svg;
  svg.selectAll('*').remove();

  const W = 1000;
  const H = 560;
  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%');

  const h = pen(svg);
  sheet = {
    segments: { feed: [], rich: [], mid: [], lean: [], dil: [] },
    valves: {},
    rules: [],
    stamp: null,
  };
  const s = sheet;

  h.rect(10, 10, W - 20, H - 20, 0.7).attr('opacity', 0.5);

  const PY0 = 170;
  const RY = 96;
  const LY = 244;

  const seg = (bucket: Bucket, x1: number, y1: number, x2: number, y2: number): void => {
    s.segments[bucket].push(h.ln(x1, y1, x2, y2, 1.3));
  };
  const arrow = (bucket: Bucket, x: number, y: number, label: string): void => {
    s.segments[bucket].push(h.path(`M${x},${y} l-9,-4 v8 Z`, 1, INK));
    h.txt(x + 6, y + 3, label, 6.5, 'start', 0.7);
  };
  /** A control valve whose open/closed state {@link paintPid} repaints. */
  const xv = (id: ValveId, cx: number, cy: number, tag: string): void => {
    const d = `M${cx - 9},${cy - 9} L${cx - 9},${cy + 9} L${cx + 9},${cy - 9} L${cx + 9},${cy + 9} Z`;
    s.valves[id] = h.path(d, 1.2);
    h.ln(cx, cy - 9, cx, cy - 18, 0.9);
    h.path(`M${cx - 8},${cy - 18} a8,6 0 0 1 16,0 Z`, 0.9);
    h.txt(cx, cy + 24, `${tag}·FC`, 6.5, 'middle', 0.7);
  };

  // Source: the mine.
  h.path(`M40,${PY0 - 22} a22,22 0 0 1 44,0 Z`, 1.3);
  h.ln(40, PY0 - 22, 84, PY0 - 22, 1.3);
  h.txt(62, PY0 - 34, 'MINE', 7, 'middle', 0.8);
  h.txt(62, PY0 + 44, 'SEALED', 6.5, 'middle', 0.55);
  h.txt(62, PY0 + 54, 'WELLHEAD', 6.5, 'middle', 0.55);
  seg('feed', 62, PY0 - 22, 62, PY0);
  seg('feed', 62, PY0, 96, PY0);

  xv('esd', 112, PY0, 'XV-100');
  seg('feed', 121, PY0, 150, PY0);

  // Metering: orifice plate, then the bubbles that read it.
  h.ln(158, PY0 - 8, 158, PY0 + 8, 1.6);
  h.rect(153, PY0 - 8, 3, 16, 0.8);
  h.rect(162, PY0 - 8, 3, 16, 0.8);
  seg('feed', 165, PY0, 214, PY0);
  h.bubble(128, 104, 'FT-01', 155, PY0 - 10, 'flow — the record');
  h.bubble(
    172,
    84,
    'AT-01',
    168,
    PY0 - 10,
    'CH₄ — the deciding input; every rule below reads this tag',
  );
  h.bubble(216, 104, 'AT-02', 180, PY0 - 8, 'O₂ — air-ingress watchdog');

  // Knockout drum under the line.
  seg('feed', 214, PY0, 232, PY0);
  h.ln(232, PY0, 232, 196, 1.1);
  h.path('M224,196 a10,6 0 0 1 20,0 V236 a10,6 0 0 1 -20,0 Z', 1.1);
  h.ln(234, 242, 234, 250, 0.8);
  h.txt(234, 260, 'LV', 6, 'middle', 0.55);
  h.ln(244, 196, 244, PY0, 1.1);
  h.txt(234, 282, 'V-100', 6.5, 'middle', 0.6);
  seg('feed', 244, PY0, 282, PY0);

  // Blower.
  h.circ(300, PY0, 15, 1.2);
  h.path(`M300,${PY0} l10,-8 M300,${PY0} l10,8 M300,${PY0} l-12,0`, 0.8);
  h.txt(300, PY0 + 30, 'K-100·EX', 6.5, 'middle', 0.7);
  seg('feed', 315, PY0, 356, PY0);

  // Router bus.
  s.segments.feed.push(h.ln(376, RY, 376, LY, 1.6));
  seg('feed', 356, PY0, 376, PY0);
  seg('rich', 376, RY, 412, RY);
  seg('mid', 376, PY0, 412, PY0);
  seg('lean', 376, LY, 412, LY);

  xv('v101', 430, RY, 'XV-101');
  xv('v102', 430, PY0, 'XV-102');
  xv('v103', 430, LY, 'XV-103');

  // Rich → engine.
  seg('rich', 439, RY, 496, RY);
  h.circ(520, RY, 20, 1.3);
  h.txt(520, RY + 4, 'G', 11, 'middle', 0.9);
  h.path(`M506,${RY - 24} q7,-7 14,0 q7,7 14,0`, 0.9);
  h.txt(520, RY + 34, 'G-101 · ENGINE + GEN', 6.5, 'middle', 0.7);
  seg('rich', 540, RY, 640, RY);
  arrow('rich', 648, RY, '');
  h.txt(646, RY + 16, 'TO ATM · GRID POWER', 6.5, 'end', 0.7);

  // Mid → flare.
  seg('mid', 439, PY0, 502, PY0);
  h.path(`M508,${PY0 + 14} h24 l-12,-34 Z`, 1.3);
  h.ln(520, PY0 - 20, 520, PY0 - 34, 1.1);
  h.circ(528, PY0 - 6, 2.5, 0.8);
  h.txt(520, PY0 + 28, 'F-101 · ENCLOSED FLARE', 6.5, 'middle', 0.7);
  seg('mid', 520, PY0 - 34, 520, PY0 - 44);
  arrow('mid', 520, PY0 - 50, 'TO ATM · η ≥ 90%');

  // Lean: dilution tee, then the oxidizer.
  seg('lean', 439, LY, 486, LY);
  h.rect(408, 296, 14, 18, 1);
  for (let y = 300; y < 312; y += 4) h.ln(409, y, 421, y, 0.5, null, 0.6);
  h.circ(436, 305, 8, 1);
  h.path('M436,305 l5,-4 M436,305 l5,4 M436,305 l-6,0', 0.7);
  s.valves.fv104 = h.path('M462,296 L462,314 L480,296 L480,314 Z', 1.1);
  h.ln(444, 305, 458, 305, 1);
  h.ln(484, 305, 500, 305, 1);
  s.segments.dil.push(h.ln(500, 305, 500, LY, 1.3));
  h.txt(414, 330, 'AIR', 6.5, 'middle', 0.6);
  h.txt(471, 330, 'FV-104', 6.5, 'middle', 0.6);
  seg('lean', 486, LY, 536, LY);

  // Bed hatch for this sheet, declared before the beds that reference it.
  const bed = svg
    .append('defs')
    .append('pattern')
    .attr('id', 'gaBed2')
    .attr('width', 6)
    .attr('height', 6)
    .attr('patternUnits', 'userSpaceOnUse');
  bed
    .append('path')
    .attr('d', 'M0,3 H6 M3,0 V6')
    .attr('stroke', INK)
    .attr('stroke-width', 0.45)
    .attr('opacity', 0.55);

  for (const bx of [540, 586]) {
    svg
      .append('rect')
      .attr('x', bx)
      .attr('y', LY - 22)
      .attr('width', 26)
      .attr('height', 44)
      .attr('fill', 'url(#gaBed2)')
      .attr('stroke', INK)
      .attr('stroke-width', 1.2);
  }
  h.rect(540, LY - 34, 72, 12, 1.1);
  h.path(`M566,${LY + 30} l10,-8 l10,8 l-10,8 Z`, 1);
  h.txt(576, LY + 52, 'OX-101', 6.5, 'middle', 0.7);
  seg('lean', 612, LY, 648, LY);
  arrow('lean', 656, LY, '');
  h.txt(654, LY + 18, 'TO ATM', 6.5, 'end', 0.7);

  // The logic block.
  const LBX = 60;
  const LBY = 356;
  const LBW = 560;
  const LBH = 140;
  h.rect(LBX, LBY, LBW, LBH, 1.2, 'rgba(7,20,34,.6)');
  h.txt(
    LBX + 10,
    LBY + 16,
    'UY-100 · ROUTE SELECT — READS AT-01, COMMANDS THE VALVES',
    7,
    'start',
    0.85,
  );
  h.ln(172, 98, 172, LBY, 0.5, '3 4', 0.5);
  for (const [x, y] of [
    [430, RY + 28],
    [430, PY0 + 28],
    [430, LY + 28],
    [471, 334],
  ] as const) {
    h.ln(x, y, x, LBY, 0.5, '3 4', 0.5);
  }
  h.ln(112, PY0 + 26, 112, LBY, 0.5, '3 4', 0.5);

  const TE = Math.round(P('thr_engine') * 100);
  const RULES = [
    { id: 'rich', text: `AT-01 ≥ ${TE}%  →  XV-101 OPEN · ENGINE (CHP QUALITY SPEC)` },
    { id: 'mid', text: `AT-01 ≥ ${TE}% · NO OFFTAKE  →  XV-102 OPEN · FLARE` },
    {
      id: 'lean',
      text: `0.2% ≤ AT-01 < ${TE}%  →  XV-103 + FV-104 · DILUTE UNDER 1.5% → RTO`,
    },
    { id: 'unsafe', text: '5–15% RAW IN ANY ENCLOSURE  →  TRIP · EVERY VALVE FAILS CLOSED' },
  ];
  RULES.forEach((r, i) => {
    const el = h.txt(LBX + 14, LBY + 40 + i * 24, r.text, 8.5);
    el.style('letter-spacing', '.06em');
    s.rules.push({ id: r.id, el });
  });
  s.stamp = h.txt(LBX + LBW - 12, LBY + 16, '', 7.5, 'end');
  s.stamp.style('fill', EMBER).style('font-weight', '600');

  // Legend.
  h.ln(60, 526, 92, 526, 1.3);
  h.txt(98, 529, 'PROCESS', 6.5, 'start', 0.6);
  h.ln(160, 526, 192, 526, 0.6, '3 4', 0.5);
  h.txt(198, 529, 'SIGNAL', 6.5, 'start', 0.6);

  // Detail B: the regenerative cycle.
  const DX = 664;
  const DY = 40;
  h.rect(DX, DY, 316, 300, 1);
  h.txt(DX + 10, DY + 18, 'DETAIL B — WHY 0.2% GAS BURNS', 7.5, 'start', 0.85);
  h.txt(
    DX + 10,
    DY + 32,
    'THE REGENERATIVE CYCLE · VALVES REVERSE EVERY 60–120 s',
    6.5,
    'start',
    0.6,
  );

  const phase = (px: number, label: string, leftToRight: boolean): void => {
    h.rect(px, DY + 52, 120, 16, 1);
    h.path(`M${px + 60},${DY + 68} l-4,-7 h8 Z`, 0.8);
    h.txt(px + 60, DY + 47, '≈850 °C', 6.5, 'middle', 0.6);
    for (const bx of [px, px + 76]) {
      svg
        .append('rect')
        .attr('x', bx)
        .attr('y', DY + 68)
        .attr('width', 44)
        .attr('height', 88)
        .attr('fill', 'url(#gaBed2)')
        .attr('stroke', INK)
        .attr('stroke-width', 1.1);
    }
    const upX = leftToRight ? px + 22 : px + 98;
    const dnX = leftToRight ? px + 98 : px + 22;
    h.path(
      `M${upX},${DY + 168} V${DY + 84} M${upX},${DY + 84} l-4,7 M${upX},${DY + 84} l4,7`,
      1.1,
    ).attr('stroke', EMBER);
    h.path(
      `M${dnX},${DY + 76} V${DY + 160} M${dnX},${DY + 160} l-4,-7 M${dnX},${DY + 160} l4,-7`,
      1.1,
    );
    h.txt(upX, DY + 184, 'IN · COLD', 6, 'middle', 0.6);
    h.txt(dnX, DY + 184, 'OUT · CHARGES BED', 6, 'middle', 0.6);
    h.txt(px + 60, DY + 202, label, 6.5, 'middle', 0.75);
  };
  phase(DX + 22, 'PHASE A', true);
  phase(DX + 174, 'PHASE B — REVERSED', false);

  [
    'THE OUTGOING EXHAUST STORES ITS HEAT IN CERAMIC;',
    'THE INCOMING LEAN STREAM RECLAIMS IT ON THE WAY UP —',
    'SO METHANE TOO LEAN FOR ANY FLAME OXIDIZES',
    'WITH NO SUPPORT FUEL, DOWN TO ≈0.2% CH₄ (UNECE).',
  ].forEach((t, i) => {
    h.txt(DX + 10, DY + 232 + i * 13, t, 6.8, 'start', 0.7);
  });

  // Title strip.
  const TBX = 664;
  const TBY = 500;
  h.rect(TBX, TBY, 316, 44, 1.1);
  h.ln(TBX, TBY + 22, TBX + 316, TBY + 22, 0.6);
  h.txt(TBX + 8, TBY + 15, 'PROCESS & INSTRUMENTATION — ROUTER LOGIC', 7);
  h.txt(TBX + 8, TBY + 36, 'DWG PID-002 · REV A · SHEET 2 OF 2 · CONCEPT', 7);
};

export const paintPid = (): void => {
  if (!sheet) return;
  const st = unit.state;

  const lit: Record<Bucket, boolean> = {
    feed: st !== 'unsafe',
    rich: st === 'rich',
    mid: st === 'mid',
    lean: st === 'lean',
    dil: st === 'lean',
  };
  const open: Record<ValveId, boolean> = {
    esd: st !== 'unsafe',
    v101: st === 'rich',
    v102: st === 'mid',
    v103: st === 'lean',
    fv104: st === 'lean',
  };

  for (const [bucket, segments] of Object.entries(sheet.segments) as [Bucket, Mark[]][]) {
    const on = lit[bucket];
    for (const sel of segments) {
      const node = sel.node();
      const isArrow = node instanceof SVGPathElement && sel.attr('fill') !== 'none';
      sel
        .attr('stroke', on ? EMBER : INK)
        .attr('stroke-width', on ? (bucket === 'feed' ? 2.2 : 2.4) : 1.3)
        .attr('opacity', on ? 1 : 0.55);
      if (isArrow) sel.attr('fill', on ? EMBER : INK);
    }
  }

  for (const [id, sel] of Object.entries(sheet.valves) as [ValveId, Mark][]) {
    sel
      .attr('fill', open[id] ? 'none' : INK)
      .attr('fill-opacity', open[id] ? 0 : 0.85)
      .attr('stroke', open[id] ? EMBER : INK)
      .attr('stroke-width', open[id] ? 1.8 : 1.2);
  }

  for (const rule of sheet.rules) {
    const on = rule.id === st;
    rule.el
      .attr('fill', on ? EMBER : INK)
      .style('font-weight', on ? '600' : '400')
      .attr('opacity', on ? 1 : 0.65);
  }
  sheet.stamp?.text(st === 'unsafe' ? 'TRIPPED — SEALED' : '');

  const productState = amm.venture.productStates.find((x) => x.id === st);
  setText(
    byId('pidK'),
    'sheet 2 · process & instrumentation · state: ' +
      (productState ? `${productState.label} (${productState.band})` : st),
  );

  const livePath =
    st === 'rich'
      ? 'valve XV-101 and the gas engine, exhaust to atmosphere with power to grid. '
      : st === 'mid'
        ? 'valve XV-102 and the enclosed flare, destruction efficiency at least 90 percent. '
        : 'valve XV-103 with dilution air through FV-104, holding the stream under the 1.5 ' +
          'percent feed ceiling into the regenerative oxidizer. ';

  d3.select('#pidSvg').attr(
    'aria-label',
    `Sheet 2, process and instrumentation. Gas state ${productState?.label ?? st}: ` +
      (st === 'unsafe'
        ? 'trip condition — the emergency valve and all three route valves fail closed; the ' +
          'mine is sealed. '
        : 'the live path runs from the sealed wellhead through the emergency valve, metering ' +
          `run, knockout drum and blower to ${livePath}`) +
      'Four interlock rules are drawn in the route-select logic block; the governing rule is ' +
      'highlighted. Detail B explains the regenerative cycle: outgoing exhaust stores heat in ' +
      'ceramic beds that incoming lean gas reclaims, so methane oxidizes without support fuel ' +
      'down to about 0.2 percent.',
  );
};
