/**
 * The depth gauge — scroll position rendered as descent through a column.
 *
 * Both pages are built on the same conceit: the reader descends, and a rail on the
 * side reads out where they are. Core Sample descends an ice core, where annual
 * layers thin under load so age climbs steeply with depth. The Seam descends a
 * mine shaft, where the galleries are evenly spaced because rock does not compress
 * its record. Those differences are real and worth showing — but they are the only
 * differences, so the gauge is one module and the columns are configuration.
 *
 * The depth a page reports is always a *real position in its column*: each page
 * segment owns a depth interval, and scroll through a segment maps linearly onto
 * it. Sections differ wildly in screen height; the rail does not care.
 */

import * as d3 from 'd3';

import { grouped } from './format';

/** One page section, and the depth interval it occupies. */
export interface Segment {
  /** The element id this segment tracks. */
  readonly id: string;
  /** Depth at the top of the segment, in metres. */
  readonly d0: number;
  /** Depth at the bottom. */
  readonly d1: number;
  readonly stratum: string;
  readonly tone: 'light' | 'dark';
  readonly name: string;
}

/** A painted band of the column. */
export interface Stratum {
  readonly d0: number;
  readonly d1: number;
  readonly fill: string;
}

/** A horizontal rule inside the column: an ice lamination, or a mine gallery. */
export interface Lamination {
  readonly depth: number;
  /** Major rules are drawn heavier; minor ones recede. */
  readonly major: boolean;
}

export interface GaugeConfig {
  /** Total depth of the column, in metres. */
  readonly length: number;
  readonly segments: readonly Segment[];
  readonly strata: readonly Stratum[];
  /** Interior rules. Ice thins with depth, rock does not — hence a function. */
  readonly laminations: () => readonly Lamination[];
  /** Depths at which to draw a labelled or unlabelled tick on the depth axis. */
  readonly ticks: () => readonly { readonly depth: number; readonly labelled: boolean }[];
  /**
   * A single hairline marking a depth of special significance — the Anthropocene
   * boundary on the ice core. Omitted where a column has no such layer.
   */
  readonly hairline?: number;
  /** Fill the readout panel for a depth. Units differ per column, so this does too. */
  readonly readout: (depth: number) => GaugeReadout;
  /** Three short lines under the rail, saying what the scale is and is not. */
  readonly foot: readonly string[];
}

export interface GaugeReadout {
  readonly depth: string;
  readonly depthUnit: string;
  readonly age?: string;
  readonly ageUnit?: string;
}

interface Geometry {
  readonly horizontal: boolean;
  readonly scale: d3.ScaleLinear<number, number>;
}

/**
 * The rail is laid on its side below a square viewport, because a standing column
 * in a short wide space reads as a progress bar rather than as a core.
 */
export class DepthGauge {
  #geometry: Geometry | null = null;
  #lastStratum = '';

  constructor(private readonly config: GaugeConfig) {}

  /** Draw the rail. Safe to call on every resize; it clears and redraws. */
  draw(): void {
    const host = document.querySelector<HTMLElement>('.gauge-col');
    const node = document.getElementById('gaugeSvg');
    if (!host || !node) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;

    const svg = d3.select(node as unknown as SVGElement);
    svg.attr('width', width).attr('height', height).selectAll('*').remove();

    if (width > height) this.#drawRecumbent(svg, width, height);
    else this.#drawStanding(svg, width, height);
  }

  /** Read the current scroll position onto the column and repaint the cursor. */
  update(): void {
    const position = this.#positionFromScroll();
    if (!position) return;
    const { segment, depth } = position;

    const readout = this.config.readout(depth);
    text('gDepth', readout.depth);
    text('gDepthU', readout.depthUnit);
    if (readout.age !== undefined) text('gAge', readout.age);
    if (readout.ageUnit !== undefined) text('gAgeU', readout.ageUnit);

    if (segment.name !== this.#lastStratum) {
      text('gStratum', segment.name);
      this.#lastStratum = segment.name;
    }

    const cursor = document.getElementById('gCursor');
    if (cursor && this.#geometry) {
      const p = this.#geometry.scale(depth);
      cursor.setAttribute(
        'transform',
        this.#geometry.horizontal ? `translate(${p},0)` : `translate(0,${p})`,
      );
    }

    // State hook only. Ink is NOT driven from here — each stratum declares its own
    // colours in CSS, so text can never be painted for the wrong ground.
    document.body.setAttribute('data-stratum', segment.stratum);
    document.body.setAttribute('data-tone', segment.tone);
  }

  renderFoot(): void {
    const foot = document.getElementById('gFoot');
    if (foot) foot.innerHTML = this.config.foot.join('<br>');
  }

  /** Depth of the column, grouped for prose. */
  get lengthLabel(): string {
    return grouped(this.config.length);
  }

  /* ---------------------------------------------------------------------- */

  #positionFromScroll(): { segment: Segment; depth: number } | null {
    // The reference line sits at 42% of the viewport: high enough that a section
    // registers as you arrive at it, low enough that it is not the very top edge.
    const reference = window.scrollY + window.innerHeight * 0.42;

    let segment: Segment | null = null;
    let fraction = 0;

    for (const candidate of this.config.segments) {
      const el = document.getElementById(candidate.id);
      if (!el) continue;
      const top = el.offsetTop;
      const height = el.offsetHeight;
      if (reference < top) {
        segment = candidate;
        fraction = 0;
        break;
      }
      if (reference <= top + height) {
        segment = candidate;
        fraction = (reference - top) / Math.max(1, height);
        break;
      }
      segment = candidate;
      fraction = 1;
    }

    if (!segment) return null;
    const t = Math.max(0, Math.min(1, fraction));
    return { segment, depth: segment.d0 + (segment.d1 - segment.d0) * t };
  }

  #drawRecumbent(svg: Selection, width: number, height: number): void {
    const x = d3
      .scaleLinear()
      .domain([0, this.config.length])
      .range([4, width - 4]);
    this.#geometry = { horizontal: true, scale: x };

    const top = 9;
    const h = height - 18;

    for (const s of this.config.strata) {
      svg
        .append('rect')
        .attr('x', x(s.d0))
        .attr('width', Math.max(1, x(s.d1) - x(s.d0)))
        .attr('y', top)
        .attr('height', h)
        .attr('fill', s.fill)
        .attr('opacity', 0.92);
    }

    svg
      .append('rect')
      .attr('x', x(0))
      .attr('width', x(this.config.length) - x(0))
      .attr('y', top)
      .attr('height', h)
      .attr('class', 'g-core-edge');

    for (const s of this.config.segments) {
      if (s.stratum !== 'contact') continue;
      svg
        .append('line')
        .attr('x1', x(s.d0))
        .attr('x2', x(s.d0))
        .attr('y1', top)
        .attr('y2', top + h)
        .attr('class', 'g-contact');
    }

    if (this.config.hairline !== undefined) {
      svg
        .append('line')
        .attr('x1', x(this.config.hairline))
        .attr('x2', x(this.config.hairline))
        .attr('y1', top - 4)
        .attr('y2', top + h + 4)
        .attr('class', 'g-anthro');
    }

    const cursor = svg.append('g').attr('class', 'g-cursor').attr('id', 'gCursor');
    cursor
      .append('line')
      .attr('y1', top - 5)
      .attr('y2', top + h + 5);
    cursor
      .append('circle')
      .attr('cy', top + h / 2)
      .attr('r', 3);
  }

  #drawStanding(svg: Selection, width: number, height: number): void {
    const y = d3
      .scaleLinear()
      .domain([0, this.config.length])
      .range([8, height - 22]);
    this.#geometry = { horizontal: false, scale: y };

    // cx0 must leave room for a four-digit depth label to the left of the column,
    // or the deepest ticks get clipped at narrow rail widths.
    const cx0 = Math.max(30, width * 0.4);
    const cx1 = width - 8;

    for (const s of this.config.strata) {
      svg
        .append('rect')
        .attr('x', cx0)
        .attr('width', cx1 - cx0)
        .attr('y', y(s.d0))
        .attr('height', Math.max(1, y(s.d1) - y(s.d0)))
        .attr('fill', s.fill)
        .attr('opacity', 0.94);
    }

    for (const lam of this.config.laminations()) {
      if (lam.depth >= this.config.length) continue;
      svg
        .append('line')
        .attr('x1', cx0 + 1)
        .attr('x2', cx1 - 1)
        .attr('y1', y(lam.depth))
        .attr('y2', y(lam.depth))
        .attr('class', lam.major ? 'g-lam' : 'g-lam g-lam--minor');
    }

    svg
      .append('rect')
      .attr('x', cx0)
      .attr('width', cx1 - cx0)
      .attr('y', y(0))
      .attr('height', y(this.config.length) - y(0))
      .attr('class', 'g-core-edge');

    for (const tick of this.config.ticks()) {
      svg
        .append('line')
        .attr('x1', tick.labelled ? cx0 - 7 : cx0 - 4)
        .attr('x2', cx0)
        .attr('y1', y(tick.depth))
        .attr('y2', y(tick.depth))
        .attr('class', tick.labelled ? 'g-tick' : 'g-tickmin');
      if (tick.labelled) {
        // Unspaced digits here: the rail column is too narrow for a separator.
        svg
          .append('text')
          .attr('x', cx0 - 8)
          .attr('y', y(tick.depth) + 2.4)
          .attr('text-anchor', 'end')
          .attr('class', 'g-label')
          .text(String(tick.depth));
      }
    }

    svg
      .append('text')
      .attr('x', cx0 - 8)
      .attr('y', y(this.config.length) + 2.4)
      .attr('text-anchor', 'end')
      .attr('class', 'g-label')
      .text(String(this.config.length));

    for (const s of this.config.segments) {
      if (s.stratum !== 'contact') continue;
      svg
        .append('line')
        .attr('x1', cx0 - 2)
        .attr('x2', cx1 + 2)
        .attr('y1', y(s.d0))
        .attr('y2', y(s.d0))
        .attr('class', 'g-contact');
    }

    if (this.config.hairline !== undefined) {
      // Our own layer, at true scale: a hairline you have to be told is there.
      svg
        .append('line')
        .attr('x1', cx0 - 5)
        .attr('x2', cx1 + 5)
        .attr('y1', y(this.config.hairline))
        .attr('y2', y(this.config.hairline))
        .attr('class', 'g-anthro');
    }

    const cursor = svg.append('g').attr('class', 'g-cursor').attr('id', 'gCursor');
    cursor
      .append('line')
      .attr('x1', cx0 - 10)
      .attr('x2', cx1 + 4);
    cursor.append('path').attr('d', `M${cx1 + 4},-4 L${cx1 + 4},4 L${cx1 - 3},0 Z`);
    cursor
      .append('circle')
      .attr('cx', (cx0 + cx1) / 2)
      .attr('r', 2.6);
  }
}

type Selection = d3.Selection<SVGElement, unknown, null, undefined>;

const text = (id: string, value: string): void => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};
