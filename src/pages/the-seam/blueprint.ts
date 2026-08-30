/**
 * Drawing primitives for the blueprint sheets.
 *
 * These sheets are drawings, not diagrams: monoline light ink on a dark plate, three
 * lineweights, ballooned parts, nominal dimensions, a title block. The helpers below
 * are the pen — every sheet draws with the same one, so the three cannot drift into
 * three different visual languages.
 */

import type * as d3 from 'd3';

import { html } from '@/lib/html';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';
import { EQUIPMENT, type Equipment } from './equipment';

export const INK = '#D7E7F2';
export const HIGHLIGHT = '#F4FAFE';

export type Svg = d3.Selection<d3.BaseType, unknown, HTMLElement, unknown>;

/**
 * One selection type for every mark the pen makes.
 *
 * d3's `.append('line')` and `.append('path')` return selections whose element types are
 * invariant with respect to each other, so a drawing that keeps a mixed list of marks —
 * as the P&ID does, to repaint whole flow paths at once — cannot type that list without
 * a widening step. It happens once, here, rather than at every call site.
 */
export type Mark = d3.Selection<SVGElement, unknown, HTMLElement, unknown>;

const widen = (sel: unknown): Mark => sel as Mark;

const equipmentTip = (e: Equipment) => html`<b>(${e.n}) ${e.name}</b>${e.tip}`;

export interface Pen {
  ln: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w?: number,
    dash?: string | null,
    op?: number,
  ) => Mark;
  rect: (x: number, y: number, w: number, h: number, sw?: number, fill?: string) => Mark;
  circ: (cx: number, cy: number, r: number, sw?: number, fill?: string) => Mark;
  path: (d: string, sw?: number, fill?: string) => Mark;
  txt: (
    x: number,
    y: number,
    s: string | number,
    size?: number,
    anchor?: string,
    op?: number,
  ) => Mark;
  /** An ISA-style instrument bubble on a leader. */
  bubble: (cx: number, cy: number, tag: string, px: number, py: number, tip: string) => void;
  /** A numbered balloon with a leader to its part. */
  balloon: (n: number, cx: number, cy: number, px: number, py: number) => void;
  /** A gate or globe valve as a bowtie on a line; optionally actuated. */
  valve: (cx: number, cy: number, s: number, actuated?: boolean, vert?: boolean) => void;
}

export const pen = (svg: Svg): Pen => {
  const ln: Pen['ln'] = (x1, y1, x2, y2, w = 1, dash = null, op = 1) =>
    widen(
      svg
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', INK)
        .attr('stroke-width', w)
        .attr('stroke-dasharray', dash)
        .attr('opacity', op),
    );

  const rect: Pen['rect'] = (x, y, w, h, sw = 1, fill = 'none') =>
    widen(
      svg
        .append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', w)
        .attr('height', h)
        .attr('fill', fill)
        .attr('stroke', INK)
        .attr('stroke-width', sw),
    );

  const circ: Pen['circ'] = (cx, cy, r, sw = 1, fill = 'none') =>
    widen(
      svg
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill', fill)
        .attr('stroke', INK)
        .attr('stroke-width', sw),
    );

  const path: Pen['path'] = (d, sw = 1, fill = 'none') =>
    widen(
      svg
        .append('path')
        .attr('d', d)
        .attr('fill', fill)
        .attr('stroke', INK)
        .attr('stroke-width', sw),
    );

  // Annotation opacity is clamped: dimmer than .78 puts 7px labels under AA on the
  // blended plate — hierarchy comes from size, not from fading.
  const txt: Pen['txt'] = (x, y, s, size = 8, anchor = 'start', op = 1) =>
    widen(
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
        .text(String(s)),
    );

  const hoverable = (
    group: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
    content: ReturnType<typeof html>,
  ): void => {
    group
      .on('mouseenter', (ev: MouseEvent) => {
        showTip(ev, content);
      })
      .on('mousemove', (ev: MouseEvent) => {
        showTip(ev, content);
      })
      .on('mouseleave', hideTip)
      .on('focus', function () {
        showTipAt(this, content);
      })
      .on('blur', hideTip);
  };

  const bubble: Pen['bubble'] = (cx, cy, tag, px, py, tip) => {
    const g = svg
      .append('g')
      .attr('class', 'fd-mk')
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `${tag} — ${tip}`);
    g.append('line')
      .attr('x1', cx)
      .attr('y1', cy + 13)
      .attr('x2', px)
      .attr('y2', py)
      .attr('stroke', INK)
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.7);
    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 13)
      .attr('fill', 'rgba(7,20,34,.65)')
      .attr('stroke', INK)
      .attr('stroke-width', 1);
    g.append('line')
      .attr('x1', cx - 13)
      .attr('x2', cx + 13)
      .attr('y1', cy)
      .attr('y2', cy)
      .attr('stroke', INK)
      .attr('stroke-width', 0.6);
    const [head = '', tail = ''] = tag.split('-');
    g.append('text')
      .attr('x', cx)
      .attr('y', cy - 3)
      .attr('text-anchor', 'middle')
      .style('font-family', 'var(--mono)')
      .style('font-size', '7px')
      .attr('fill', HIGHLIGHT)
      .text(head);
    g.append('text')
      .attr('x', cx)
      .attr('y', cy + 8)
      .attr('text-anchor', 'middle')
      .style('font-family', 'var(--mono)')
      .style('font-size', '7px')
      .attr('fill', HIGHLIGHT)
      .text(tail);
    hoverable(g, html`<b>${tag}</b>${tip}`);
  };

  const balloon: Pen['balloon'] = (n, cx, cy, px, py) => {
    const e = EQUIPMENT[n - 1];
    if (!e) return;
    const g = svg
      .append('g')
      .attr('class', 'fd-mk')
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `Item ${n}: ${e.name}. ${e.tip}`);
    g.append('line')
      .attr('x1', cx)
      .attr('y1', cy)
      .attr('x2', px)
      .attr('y2', py)
      .attr('stroke', INK)
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.7);
    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 10)
      .attr('fill', 'rgba(7,20,34,.75)')
      .attr('stroke', HIGHLIGHT)
      .attr('stroke-width', 1.1);
    g.append('text')
      .attr('x', cx)
      .attr('y', cy + 3.4)
      .attr('text-anchor', 'middle')
      .style('font-family', 'var(--mono)')
      .style('font-size', '9.5px')
      .style('font-weight', '600')
      .attr('fill', HIGHLIGHT)
      .text(String(n));
    hoverable(g, equipmentTip(e));
  };

  const valve: Pen['valve'] = (cx, cy, s, actuated = false, vert = false) => {
    const d = vert
      ? `M${cx - s},${cy - s} L${cx + s},${cy - s} ` + `L${cx - s},${cy + s} L${cx + s},${cy + s} Z`
      : `M${cx - s},${cy - s} L${cx - s},${cy + s} ` +
        `L${cx + s},${cy - s} L${cx + s},${cy + s} Z`;
    path(d, 1);
    if (actuated) {
      ln(cx, cy - s, cx, cy - s - 8, 0.9);
      path(`M${cx - 7},${cy - s - 8} a7,5 0 0 1 14,0 Z`, 0.9);
    } else {
      ln(cx, cy - s, cx, cy - s - 7, 0.9);
      ln(cx - 5, cy - s - 7, cx + 5, cy - s - 7, 0.9);
    }
  };

  return { ln, rect, circ, path, txt, bubble, balloon, valve };
};
