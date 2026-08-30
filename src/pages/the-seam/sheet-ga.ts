/**
 * Sheet 1 — general arrangement.
 *
 * A drawing, not a diagram: monoline light ink on the dark plate, three lineweights,
 * ballooned parts list, nominal dimensions, title block. Schematic — and the title
 * block says so, in the place a drawing office would put it.
 */

import * as d3 from 'd3';

import { meta } from '@/data';
import { EQUIPMENT } from './equipment';
import { INK, pen, type Svg } from './blueprint';

export const drawGeneralArrangement = (): void => {
  const svg = d3.select('#gaSvg') as Svg;
  svg.selectAll('*').remove();

  const W = 1000;
  const H = 600;
  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr(
      'aria-label',
      'Sheet 1, general arrangement: side elevation of the containerized unit. Gas flows ' +
        'from a sealed wellhead tie-in outside the container through an emergency-shutdown ' +
        'valve, a metering run with flow, methane, oxygen, pressure and temperature ' +
        'instruments, a knockout drum, and an explosion-proof blower to a three-way router ' +
        'manifold feeding a gas engine with generator, an enclosed flare, and a twin-bed ' +
        'regenerative oxidizer with a dilution-air package. Ten ballooned items with a parts ' +
        'list, nominal dimensions, and a title block reading concept — not for construction.',
    );

  const h = pen(svg);

  const defs = svg.append('defs');
  const ground = defs
    .append('pattern')
    .attr('id', 'gaGround')
    .attr('width', 8)
    .attr('height', 8)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)');
  ground
    .append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 8)
    .attr('stroke', INK)
    .attr('stroke-width', 0.7)
    .attr('opacity', 0.5);
  const bed = defs
    .append('pattern')
    .attr('id', 'gaBed')
    .attr('width', 7)
    .attr('height', 7)
    .attr('patternUnits', 'userSpaceOnUse');
  bed
    .append('path')
    .attr('d', 'M0,3.5 H7 M3.5,0 V7')
    .attr('stroke', INK)
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.55);

  // Sheet frame with corner ticks.
  h.rect(10, 10, W - 20, H - 20, 0.7).attr('opacity', 0.5);
  for (const [cx, cy] of [
    [10, 10],
    [W - 10, 10],
    [10, H - 10],
    [W - 10, H - 10],
  ] as const) {
    h.ln(cx - 6, cy, cx + 6, cy, 0.7, null, 0.5);
    h.ln(cx, cy - 6, cx, cy + 6, 0.7, null, 0.5);
  }

  /** Process line elevation. */
  const PY = 260;
  const CT = 120;
  const CB = 420;
  const CL = 130;
  const CR = 930;
  /** Ground line. */
  const GY = 462;

  // Ground: hatched section cut.
  h.ln(20, GY, W - 20, GY, 1.4);
  svg
    .append('rect')
    .attr('x', 20)
    .attr('y', GY)
    .attr('width', W - 40)
    .attr('height', 26)
    .attr('fill', 'url(#gaGround)')
    .attr('stroke', 'none');
  h.txt(W - 26, GY + 18, 'GRADE', 7, 'end', 0.7);

  // Container shell, with corrugation along the top and bottom skins.
  h.rect(CL, CT, CR - CL, CB - CT, 1.6);
  for (let cx = CL + 12; cx < CR - 8; cx += 16) {
    h.ln(cx, CT + 2, cx + 8, CT + 8, 0.5, null, 0.45);
    h.ln(cx, CB - 2, cx + 8, CB - 8, 0.5, null, 0.45);
  }
  for (const [x, y] of [
    [CL, CT],
    [CR - 14, CT],
    [CL, CB - 14],
    [CR - 14, CB - 14],
  ] as const) {
    h.rect(x, y, 14, 14, 1.1);
  }
  h.rect(CL + 30, CB, 60, GY - CB, 1);
  h.rect(CR - 90, CB, 60, GY - CB, 1);
  for (let x = CL + 34; x < CL + 88; x += 9) h.ln(x, CB, x - 6, GY, 0.5, null, 0.4);
  for (let x = CR - 86; x < CR - 32; x += 9) h.ln(x, CB, x - 6, GY, 0.5, null, 0.4);
  h.ln(CR - 46, CT + 6, CR - 46, CB - 6, 0.7, '5 4', 0.6);
  h.txt(CR - 52, CT + 30, 'DOORS', 7, 'end', 0.6);
  h.ln(CL + 4, CB - 20, CR - 4, CB - 20, 0.6, '2 3', 0.5);

  // (1) Wellhead assembly, outside the box.
  h.rect(72, 330, 20, GY - 330, 1.3);
  for (let y = 336; y < GY - 4; y += 10) h.ln(73, y, 91, y, 0.5, null, 0.35);
  for (const fy of [326, 316, 306]) h.rect(60, fy, 44, 7, 1.2, 'rgba(7,20,34,.6)');
  h.ln(82, 306, 82, 292, 1.3);
  h.valve(82, 280, 9, false, true);
  h.ln(82, 268, 82, 252, 1.3);
  h.rect(70, 226, 24, 26, 1.2);
  for (let y = 230; y < 250; y += 4) h.ln(72, y, 92, y, 0.5, null, 0.5);
  h.ln(82, 226, 82, PY - 46, 1.3);
  h.path(`M82,${PY - 46} Q82,${PY} 126,${PY}`, 1.3);
  h.txt(40, 210, 'BATTERY LIMIT', 7, 'start', 0.6);
  h.ln(112, 130, 112, 452, 0.6, '7 5', 0.45);

  // Process pipe main run.
  h.ln(126, PY, 536, PY, 1.3);

  // (2) ESD valve.
  h.valve(160, PY, 9, true);
  h.txt(160, PY + 22, 'ESD·FC', 7, 'middle', 0.7);

  // (3) Metering run — orifice flange pair, then the instrument bubbles.
  h.rect(216, PY - 12, 6, 24, 1.1);
  h.rect(240, PY - 12, 6, 24, 1.1);
  h.ln(231, PY - 16, 231, PY + 16, 1.6);
  h.bubble(196, 170, 'FT-01', 214, PY - 12, 'orifice flow — the tonnes the report will claim');
  h.bubble(232, 148, 'AT-01', 231, PY - 16, "CH₄ analyser — the router's deciding input");
  h.bubble(268, 170, 'AT-02', 243, PY - 12, 'O₂ analyser — air-ingress and safety watchdog');
  h.bubble(304, 148, 'PT-01', 260, PY - 8, "wellhead vacuum — the blower's setpoint");
  h.bubble(340, 170, 'TT-01', 280, PY - 8, 'temperature — completes the mass-flow record');

  // (4) Knockout drum.
  h.path('M300,220 a26,10 0 0 1 52,0 V330 a26,10 0 0 1 -52,0 Z', 1.3);
  svg
    .append('rect')
    .attr('x', 302)
    .attr('y', 228)
    .attr('width', 48)
    .attr('height', 12)
    .attr('fill', 'url(#gaBed)')
    .attr('stroke', INK)
    .attr('stroke-width', 0.6);
  h.ln(296, PY, 300, PY, 1.3);
  h.path(`M326,210 L326,196 L380,196 L380,${PY}`, 1.3);
  h.ln(326, 340, 326, 352, 1);
  h.valve(326, 360, 6, false, true);
  h.ln(326, 368, 326, CB - 20, 1);
  h.circ(360, 300, 6, 0.8);
  h.ln(354, 300, 348, 300, 0.6);
  h.txt(360, 303, 'L', 6, 'middle');

  // (5) Blower, with discharge up to the run and the motor behind.
  h.ln(380, PY, 402, PY, 1.3);
  h.circ(430, PY + 4, 26, 1.3, 'rgba(7,20,34,.55)');
  h.path(`M430,${PY + 4} m-16,0 a16,16 0 1 1 8,13`, 0.8);
  h.path(`M430,${PY - 22} L430,${PY - 34} L468,${PY - 34} L468,${PY}`, 1.3);
  h.rect(444, PY - 6, 34, 24, 1.1);
  for (let x = 448; x < 476; x += 5) h.ln(x, PY - 4, x, PY + 16, 0.5, null, 0.4);
  h.txt(430, PY + 44, 'EX', 8, 'middle', 0.8);
  h.circ(430, PY + 41, 8, 0.8);
  h.ln(468, PY, 536, PY, 1.3);

  // (6) Router manifold — three takeoffs with actuated valves.
  h.rect(532, 160, 10, 210, 1.4, 'rgba(7,20,34,.55)');
  for (const [y, tag, toX, above] of [
    [176, 'V-101', 620, 0],
    [PY, 'V-102', 806, 0],
    [352, 'V-103', 600, 1],
  ] as const) {
    h.ln(542, y, 566, y, 1.3);
    h.valve(578, y, 8, true);
    h.ln(590, y, toX, y, 1.3);
    if (above) h.txt(594, y - 22, `${tag}·FC`, 6.5, 'end', 0.7);
    else h.txt(578, y + 21, `${tag}·FC`, 6.5, 'middle', 0.7);
  }

  // (7) Engine and generator.
  h.ln(614, 214, 800, 214, 1.1);
  h.rect(620, 156, 92, 58, 1.3, 'rgba(7,20,34,.5)');
  for (let x = 628; x < 706; x += 11) h.ln(x, 160, x, 210, 0.5, null, 0.45);
  for (const bx of [634, 656, 678, 700]) h.path(`M${bx - 6},156 a6,4 0 0 1 12,0`, 0.9);
  h.circ(738, 192, 20, 1.3);
  h.circ(738, 192, 7, 0.8);
  h.ln(712, 192, 718, 192, 1.1);
  h.txt(738, 226, 'G-101 · MW-CLASS', 6.5, 'middle', 0.7);
  h.ln(648, 156, 648, 116, 1.2);
  h.rect(640, 94, 16, 22, 1.1);
  h.ln(648, 94, 648, 82, 1.2);
  h.path('M642,82 L654,82 M645,78 L651,78', 1);
  h.rect(764, 176, 26, 32, 1);
  for (let x = 768; x < 788; x += 4) h.ln(x, 180, x, 204, 0.5, null, 0.5);
  h.txt(794, 172, 'HX', 6.5, 'start', 0.6);

  // (8) Enclosed flare.
  h.rect(806, PY - 22, 44, 44, 1.3, 'rgba(7,20,34,.5)');
  h.path(`M816,${PY + 12} l6,-12 l6,12 M822,${PY + 12} l6,-12 l6,12`, 0.9);
  h.rect(818, 90, 20, PY - 112, 1.3);
  for (let y = 100; y < 112; y += 4) h.ln(819, y, 837, y, 0.5, null, 0.5);
  h.ln(828, 90, 828, 80, 1.1);
  h.path('M822,76 q3,-6 6,0 q3,6 6,0', 0.8).attr('opacity', 0.7);
  h.txt(856, PY - 6, 'F-101', 6.5, 'start', 0.7);

  // (9) Regenerative oxidizer — twin bed, combustion chamber bridging them.
  h.rect(600, 300, 180, 18, 1.2, 'rgba(7,20,34,.5)');
  h.path('M690,318 l-5,-9 h10 Z', 0.9);
  for (const bx of [608, 710]) {
    svg
      .append('rect')
      .attr('x', bx)
      .attr('y', 318)
      .attr('width', 62)
      .attr('height', 74)
      .attr('fill', 'url(#gaBed)')
      .attr('stroke', INK)
      .attr('stroke-width', 1.3);
  }
  // Flow arrows: up bed A, across, down bed B.
  h.path('M639,388 L639,332 M639,332 l-4,7 M639,332 l4,7', 1);
  h.path('M741,324 L741,384 M741,384 l-4,-7 M741,384 l4,-7', 1);
  h.ln(600, 400, 780, 400, 1.2);
  for (const px of [626, 652, 728, 754]) h.path(`M${px},400 l-6,-8 h12 Z`, 0.9);
  h.path('M600,352 L596,352 L596,400 L600,400', 1.3);
  h.ln(780, 400, 872, 400, 1.2);
  h.ln(872, 400, 872, 100, 1.3);
  h.rect(864, 100, 16, 10, 1.1);
  h.txt(690, 350, 'OX-101', 6.5, 'middle', 0.8);
  h.txt(690, 416, 'REGENERATIVE OXIDIZER · TWIN BED', 6.5, 'middle', 0.7);

  // (10) Dilution air and controls.
  h.rect(544, 366, 16, 26, 1.1);
  for (let y = 370; y < 390; y += 5) h.ln(545, y, 559, y, 0.6, null, 0.6);
  h.circ(572, 379, 8, 1);
  h.path('M572,379 l5,-4 M572,379 l5,4 M572,379 l-6,0', 0.7);
  h.ln(580, 379, 592, 379, 1);
  h.ln(592, 379, 592, 400, 1);
  h.ln(592, 400, 600, 400, 1.2);
  h.txt(552, 410, 'DIL. AIR', 6.5, 'middle', 0.6);
  h.rect(884, 330, 34, 70, 1.2, 'rgba(7,20,34,.55)');
  h.ln(901, 334, 901, 396, 0.6, null, 0.5);
  for (let y = 338; y < 352; y += 4) h.ln(888, y, 898, y, 0.5, null, 0.5);
  h.txt(901, 414, 'CTRL', 6.5, 'middle', 0.7);
  // Instrument signal: dashed from the AT-01 leader zone to the control cabinet.
  h.ln(231, 126, 901, 126, 0.5, '3 4', 0.5);
  h.ln(901, 126, 901, 326, 0.5, '3 4', 0.5);

  // Dimensions.
  h.ln(CL, CT - 10, CL, 42, 0.7, null, 0.7);
  h.ln(CR, CT - 10, CR, 42, 0.7, null, 0.7);
  h.ln(CL, 48, CR, 48, 0.8);
  h.path(`M${CL},48 l8,-3 v6 Z`, 0.8, INK);
  h.path(`M${CR},48 l-8,-3 v6 Z`, 0.8, INK);
  h.txt((CL + CR) / 2, 42, '12.19 m (40 FT) — NOMINAL', 8, 'middle');
  h.ln(CR + 14, CT, CR + 34, CT, 0.7, null, 0.7);
  h.ln(CR + 14, CB, CR + 34, CB, 0.7, null, 0.7);
  h.ln(CR + 27, CT, CR + 27, CB, 0.8);
  h.path(`M${CR + 27},${CT} l-3,8 h6 Z`, 0.8, INK);
  h.path(`M${CR + 27},${CB} l-3,-8 h6 Z`, 0.8, INK);
  svg
    .append('text')
    .attr('x', CR + 44)
    .attr('y', (CT + CB) / 2)
    .attr('transform', `rotate(-90,${CR + 44},${(CT + CB) / 2})`)
    .attr('text-anchor', 'middle')
    .style('font-family', 'var(--mono)')
    .style('font-size', '8px')
    .style('letter-spacing', '.08em')
    .attr('fill', INK)
    .text('2.90 m');

  // Balloons.
  for (const [n, cx, cy, px, py] of [
    [1, 44, 260, 70, 280],
    [2, 160, 316, 160, PY + 10],
    [3, 231, 108, 231, 136],
    [4, 300, 180, 314, 214],
    [5, 404, 316, 424, PY + 24],
    [6, 520, 138, 536, 160],
    [7, 700, 128, 668, 154],
    [8, 782, 72, 818, 92],
    [9, 566, 300, 604, 308],
    [10, 512, 400, 552, 384],
  ] as const) {
    h.balloon(n, cx, cy, px, py);
  }

  // Parts list.
  const PLX = 24;
  const PLY = 496;
  h.ln(PLX, PLY - 10, 600, PLY - 10, 0.8);
  h.txt(PLX, PLY, 'PARTS LIST', 7.5, 'start', 0.8);
  EQUIPMENT.forEach((e, i) => {
    const x = PLX + (i < 5 ? 0 : 290);
    const y = PLY + 14 + (i % 5) * 15;
    h.circ(x + 5, y - 3, 6, 0.8);
    h.txt(x + 5, y - 0.5, e.n, 6.5, 'middle');
    h.txt(x + 18, y, e.name, 7);
  });

  // Title block, with the stamp inside it as a drawing office would put it.
  const TBX = 640;
  const TBY = 486;
  const TBW = 344;
  const TBH = 100;
  h.rect(TBX, TBY, TBW, TBH, 1.2);
  h.ln(TBX, TBY + 24, TBX + TBW, TBY + 24, 0.7);
  h.ln(TBX, TBY + 46, TBX + TBW, TBY + 46, 0.7);
  h.ln(TBX + 190, TBY + 46, TBX + 190, TBY + TBH, 0.7);
  h.txt(TBX + 10, TBY + 16, 'COLLAPSE EARTH — THE SEAM · FIELD STUDY', 8);
  h.txt(TBX + 10, TBY + 38, 'ADAPTIVE METHANE ABATEMENT UNIT — GENERAL ARRANGEMENT', 7.5);
  h.txt(TBX + 10, TBY + 62, 'DWG GA-001 · REV A · SHEET 1 OF 2', 7);
  h.txt(TBX + 10, TBY + 78, 'SCALE: SCHEMATIC · DIMS NOMINAL', 7);
  h.txt(TBX + 10, TBY + 92, `DRAWN: EDITORIAL · ${meta.updated}`, 7);

  const stamp = svg.append('g').attr('transform', `translate(${TBX + 200},${TBY + 56}) rotate(-2)`);
  stamp
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 134)
    .attr('height', 34)
    .attr('fill', '#E3D5B8')
    .attr('stroke', '#5A1A0C')
    .attr('stroke-width', 2);
  for (const [y, text] of [
    [14, 'CONCEPT — FOAK'],
    [26, 'NOT FOR CONSTRUCTION'],
  ] as const) {
    stamp
      .append('text')
      .attr('x', 67)
      .attr('y', y)
      .attr('text-anchor', 'middle')
      .style('font-family', 'var(--mono)')
      .style('font-size', '7.5px')
      .style('font-weight', '600')
      .style('letter-spacing', '.12em')
      .attr('fill', '#5A1A0C')
      .text(text);
  }
};
