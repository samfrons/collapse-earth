/**
 * The threshold band chart — every element's estimated range, on one axis.
 *
 * A bar per element running minimum to maximum estimate, with the central estimate
 * marked but never standing in for the range. The dial's position is drawn over the
 * top, so what the reader is being asked to compare is a *setting* against a
 * *band* — not a year against a date.
 */

import * as d3 from 'd3';

import { tippingSystems, warming, type TippingSystem, type TippingSystemId } from '@/data';
import { byId, setText } from '@/lib/dom';
import { degC } from '@/lib/format';
import { html, type SafeHtml } from '@/lib/html';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';
import { actOne, AXIS_MAX, crossing, DIAL, STATE_WORD } from './thresholds';

const GROUPS = [
  {
    key: 'global-core',
    label: 'global core elements · tipping would change global mean temperature',
  },
  { key: 'regional', label: 'regional-impact elements' },
] as const;

const LAYOUT = {
  width: 900,
  rowH: 37,
  gapH: 32,
  padTop: 42,
  padBot: 34,
  plotL: 258,
  plotR: 668,
  metaL: 682,
} as const;

let x: d3.ScaleLinear<number, number> | null = null;
let height = 0;

let onSelectRequest: ((id: TippingSystemId, trigger: Element) => void) | null = null;
export const onBandSelect = (handler: (id: TippingSystemId, trigger: Element) => void): void => {
  onSelectRequest = handler;
};

const tipFor = (s: TippingSystem, degreesC: number): SafeHtml => {
  const c = crossing(s, degreesC);
  return html`<b>${s.name}</b>central ${s.threshold.central.toFixed(1)} °C · range
    ${s.threshold.min.toFixed(1)}–${s.threshold.max.toFixed(1)} °C<br />confidence:
    ${s.threshold.confidence}<br />at dial ${degC(degreesC)}: ${STATE_WORD[c.state]}`;
};

export const buildBands = (): void => {
  const svg = d3.select('#bandsSvg');
  svg.selectAll('*').remove();

  const { width, rowH, gapH, padTop, padBot, plotL, plotR, metaL } = LAYOUT;

  height = padTop + padBot;
  for (const g of GROUPS) {
    height += gapH + tippingSystems.filter((s) => s.tier === g.key).length * rowH;
  }

  x = d3.scaleLinear().domain([0, AXIS_MAX]).range([plotL, plotR]);
  const scale = x;

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', height)
    .attr(
      'aria-label',
      `Threshold bands for all ${tippingSystems.length} tipping elements, ` +
        'minimum to maximum estimate with the central estimate marked.',
    );

  const pattern = svg
    .append('defs')
    .append('pattern')
    .attr('id', 'hatchBand')
    .attr('width', 4)
    .attr('height', 4)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(38)');
  pattern.append('rect').attr('width', 4).attr('height', 4).attr('fill', 'rgba(255,255,255,.42)');
  pattern
    .append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 4)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.32);

  // Reference marks sit under the bars.
  const refs = svg.append('g').attr('id', 'bxRefs');
  refs
    .append('rect')
    .attr('class', 'bx-nowband')
    .attr('x', scale(warming.range.min))
    .attr('y', padTop - 12)
    .attr('width', scale(warming.range.max) - scale(warming.range.min))
    .attr('height', height - padTop - padBot + 20);
  refs
    .append('line')
    .attr('class', 'bx-now')
    .attr('x1', scale(warming.current))
    .attr('x2', scale(warming.current))
    .attr('y1', padTop - 12)
    .attr('y2', height - padBot + 8);
  refs
    .append('text')
    .attr('class', 'bx-flag')
    .attr('fill', '#33596A')
    .attr('x', scale(warming.current))
    .attr('y', padTop - 17)
    .attr('text-anchor', 'middle')
    .text(`OBSERVED ${degC(warming.current)}`);

  const rows = svg.append('g').attr('id', 'bxRows');
  let y = padTop;

  for (const group of GROUPS) {
    rows
      .append('text')
      .attr('class', 'bx-group')
      .attr('x', 0)
      .attr('y', y + 12)
      .text(group.label);
    rows
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y + 20)
      .attr('y2', y + 20)
      .attr('stroke', '#17130E')
      .attr('stroke-width', 0.8)
      .attr('opacity', 0.4);
    y += gapH;

    const members: TippingSystem[] = tippingSystems
      .filter((s) => s.tier === group.key)
      .toSorted((a, b) => a.threshold.central - b.threshold.central);

    for (const s of members) {
      const cy = y + rowH / 2 - 2;
      const g = rows
        .append('g')
        .attr('class', 'bx-row')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('data-id', s.id)
        .attr(
          'aria-label',
          `${s.name} — threshold ${s.threshold.central.toFixed(1)} °C, range ` +
            `${s.threshold.min.toFixed(1)} to ${s.threshold.max.toFixed(1)} °C, ` +
            `${s.threshold.confidence} confidence. Opens the dossier.`,
        );

      g.append('rect')
        .attr('class', 'bx-hit')
        .attr('x', 0)
        .attr('y', y - 2)
        .attr('width', width)
        .attr('height', rowH - 2);
      g.append('text')
        .attr('class', 'bx-name')
        .attr('x', 0)
        .attr('y', cy - 2)
        .text(s.name);
      g.append('text')
        .attr('class', 'bx-meta')
        .attr('x', 0)
        .attr('y', cy + 10)
        .text(`${s.category.replace(/-/g, ' ')} · ${s.timescale.triggerToImpact}`);
      g.append('rect')
        .attr('class', 'bx-track')
        .attr('y', cy - 5.5)
        .attr('height', 11)
        .attr('x', scale(s.threshold.min))
        .attr('width', Math.max(2, scale(s.threshold.max) - scale(s.threshold.min)));
      g.append('rect')
        .attr('class', 'bx-fill')
        .attr('y', cy - 4.6)
        .attr('height', 9.2)
        .attr('x', scale(s.threshold.min))
        .attr('width', 0);
      g.append('line')
        .attr('class', 'bx-central')
        .attr('x1', scale(s.threshold.central))
        .attr('x2', scale(s.threshold.central))
        .attr('y1', cy - 9)
        .attr('y2', cy + 9);
      g.append('circle')
        .attr('class', 'bx-cdot')
        .attr('cx', scale(s.threshold.central))
        .attr('cy', cy)
        .attr('r', 2.6);
      g.append('text')
        .attr('class', 'bx-meta')
        .attr('x', metaL)
        .attr('y', cy - 2)
        .text(
          `${s.threshold.central.toFixed(1)} °C  [${s.threshold.min.toFixed(1)}–` +
            `${s.threshold.max.toFixed(1)}]`,
        );
      g.append('text')
        .attr('class', 'bx-meta')
        .attr('x', metaL)
        .attr('y', cy + 10)
        .text(`confidence ${s.threshold.confidence}${s.contested ? ' · contested' : ''}`);

      const pick = (node: Element): void => {
        actOne.set({ selected: s.id as TippingSystemId });
        onSelectRequest?.(s.id as TippingSystemId, node);
      };

      g.on('click', function () {
        pick(this);
      })
        .on('keydown', function (ev: KeyboardEvent) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            pick(this);
          }
        })
        .on('mouseenter', (ev: MouseEvent) => {
          showTip(ev, tipFor(s, actOne.get().degreesC));
        })
        .on('mousemove', (ev: MouseEvent) => {
          showTip(ev, tipFor(s, actOne.get().degreesC));
        })
        .on('mouseleave', hideTip)
        .on('focus', function () {
          showTipAt(this, tipFor(s, actOne.get().degreesC));
        })
        .on('blur', hideTip);

      y += rowH;
    }
  }

  // Axes drawn after the rows so their labels sit above the row plates.
  const axes = svg.append('g').attr('class', 'bx-axis');
  for (const axis of [
    { y: padTop - 12, up: true },
    { y: height - padBot + 8, up: false },
  ]) {
    axes.append('line').attr('x1', plotL).attr('x2', plotR).attr('y1', axis.y).attr('y2', axis.y);
    for (let v = 0; v <= AXIS_MAX + 1e-9; v += 0.5) {
      const major = Math.abs(v % 1) < 1e-9;
      const len = major ? 5 : 3;
      axes
        .append('line')
        .attr('x1', scale(v))
        .attr('x2', scale(v))
        .attr('y1', axis.y)
        .attr('y2', axis.y + (axis.up ? -len : len));
      if (major) {
        axes
          .append('text')
          .attr('x', scale(v))
          .attr('y', axis.y + (axis.up ? -9 : 16))
          .attr('text-anchor', 'middle')
          .text(v.toFixed(0));
      }
    }
    axes
      .append('text')
      .attr('x', plotR + 7)
      .attr('y', axis.y + (axis.up ? -9 : 16))
      .attr('text-anchor', 'start')
      .text('°C');
  }

  // The dial marker rides on top of everything.
  svg.append('g').attr('id', 'bxDial');

  paintBands();

  setText(
    byId('bandsFoot'),
    `Axis runs to ${degC(AXIS_MAX)} so the whole table fits; the dial stops at ` +
      `${degC(DIAL.max)}. Threshold values and confidence ratings are Armstrong McKay ` +
      'et al., Science (2022), Table 1 — the authority for every figure in this act. ' +
      'Rows are sorted by central estimate within each group.',
  );
};

export const paintBands = (): void => {
  if (!x) return;
  const scale = x;
  const { degreesC, selected } = actOne.get();

  d3.select('#bxRows')
    .selectAll<SVGGElement, unknown>('g.bx-row')
    .each(function () {
      const g = d3.select(this);
      const s = tippingSystems.find((candidate) => candidate.id === g.attr('data-id'));
      if (!s) return;
      const c = crossing(s, degreesC);
      const x0 = scale(s.threshold.min);
      const x1 = scale(Math.min(degreesC, s.threshold.max));

      // .style(), not .attr(): a presentation attribute loses to any author CSS
      // rule, which previously froze this fill at one colour for every dial value.
      g.select('.bx-fill')
        .attr('width', Math.max(0, x1 - x0))
        .style('fill', c.state === 'past' ? '#9C4A22' : '#C8973F');
      g.classed('bx-sel', selected === s.id);
      g.select('.bx-name').classed('bx-name--sel', selected === s.id);
    });

  const dial = d3.select('#bxDial');
  dial.selectAll('*').remove();
  dial
    .append('line')
    .attr('class', 'bx-dial')
    .attr('x1', scale(degreesC))
    .attr('x2', scale(degreesC))
    .attr('y1', 30)
    .attr('y2', height - 26);
  dial
    .append('text')
    .attr('class', 'bx-flag')
    .attr('fill', '#17130E')
    .attr('x', scale(degreesC))
    .attr('y', height - 16)
    .attr('text-anchor', degreesC > AXIS_MAX * 0.85 ? 'end' : 'middle')
    .text(`DIAL ${degC(degreesC)}`);
};
