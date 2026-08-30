/**
 * The globe — sixteen tipping elements on an orthographic projection you can turn.
 *
 * Each marker is a small instrument rather than a dot: an open broken ring while
 * the dial sits below the element's minimum estimate, a wedge that fills in
 * proportion to how far into the estimated band the dial has gone, a dot once the
 * central estimate is passed, and a struck-through solid once the dial is above the
 * maximum. The point of the wedge is that it *cannot* be read as a date.
 */

import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Feature } from 'geojson';

import { tippingSystems, type TippingSystem, type TippingSystemId } from '@/data';
import { byId } from '@/lib/dom';
import { html, type SafeHtml } from '@/lib/html';
import { degC } from '@/lib/format';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';
import { actOne, crossing, STATE_WORD } from './thresholds';

import landTopo from '@/assets/land-110m.json';

/** Coastlines at 110 m resolution, bundled rather than fetched. */
const LAND = topojson.feature(
  landTopo as unknown as Parameters<typeof topojson.feature>[0],
  (landTopo as { objects: { land: unknown } }).objects.land as Parameters<
    typeof topojson.feature
  >[1],
) as unknown as Feature;

/** d3's data join wants a mutable array; the atlas is readonly by design. */
const SYSTEMS: TippingSystem[] = [...tippingSystems];

interface GlobeView {
  rotation: [number, number];
  projection: d3.GeoProjection | null;
  path: d3.GeoPath | null;
  radius: number;
  hover: TippingSystemId | null;
  /** The one marker in the tab order. Always a marker facing the reader. */
  roving: TippingSystemId | null;
  visible: TippingSystemId[];
}

const view: GlobeView = {
  rotation: [42, -34],
  projection: null,
  path: null,
  radius: 0,
  hover: null,
  roving: null,
  visible: [],
};

const select = (id: TippingSystemId, trigger: Element): void => {
  view.roving = id;
  actOne.set({ selected: id });
  onSelectRequest?.(id, trigger);
};

/**
 * The dossier tray owns focus management, so it registers here rather than being
 * imported — which would make the two modules mutually dependent for no gain.
 */
let onSelectRequest: ((id: TippingSystemId, trigger: Element) => void) | null = null;
export const onGlobeSelect = (handler: (id: TippingSystemId, trigger: Element) => void): void => {
  onSelectRequest = handler;
};

export const buildGlobe = (): void => {
  const svg = d3.select('#globeSvg');
  svg.selectAll('*').remove();

  const pattern = svg
    .append('defs')
    .append('pattern')
    .attr('id', 'hatchLand')
    .attr('width', 4)
    .attr('height', 4)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(38)');
  pattern
    .append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 4)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 0.55)
    .attr('opacity', 0.34);

  svg.append('g').attr('id', 'gHalo');
  svg.append('circle').attr('id', 'gSphere').attr('class', 'g-sphere');
  svg.append('path').attr('id', 'gGrat').attr('class', 'g-grat');
  svg.append('path').attr('id', 'gLand').attr('class', 'g-land');
  svg.append('g').attr('id', 'gCascades');
  svg.append('g').attr('id', 'gMarks');

  layoutGlobe();
  paintGlobe();
};

export const layoutGlobe = (): void => {
  const frame = byId('globeFrame');
  const width = frame.clientWidth;
  const height = frame.clientHeight;
  if (!width || !height) return;

  view.radius = Math.min(width, height) / 2 - Math.max(20, width * 0.055);
  d3.select('#globeSvg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', width)
    .attr('height', height);

  view.projection = d3
    .geoOrthographic()
    .scale(view.radius)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .rotate(view.rotation);
  view.path = d3.geoPath(view.projection);

  d3.select('#gSphere')
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', view.radius);

  const halo = d3.select('#gHalo');
  halo.selectAll('*').remove();
  for (const k of [1.035, 1.075]) {
    halo
      .append('circle')
      .attr('class', 'g-halo')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', view.radius * k);
  }
};

const tipFor = (s: TippingSystem, degreesC: number): SafeHtml => {
  const c = crossing(s, degreesC);
  return html`<b>${s.name}</b>central ${s.threshold.central.toFixed(1)} °C · range
    ${s.threshold.min.toFixed(1)}–${s.threshold.max.toFixed(1)} °C<br />confidence:
    ${s.threshold.confidence}<br />at dial ${degC(degreesC)}: ${STATE_WORD[c.state]}`;
};

/** Move the roving tabindex to the next or previous marker facing the reader. */
const moveRoving = (step: number): void => {
  if (view.visible.length === 0) return;
  const i = view.roving === null ? -1 : view.visible.indexOf(view.roving);
  const next = i === -1 ? 0 : (i + step + view.visible.length) % view.visible.length;
  view.roving = view.visible[next] ?? null;
  paintGlobe();
  d3.select('#gMarks')
    .selectAll<SVGGElement, TippingSystem>('g.mk')
    .filter((s) => s.id === view.roving)
    .node()
    ?.focus();
};

export const paintGlobe = (): void => {
  if (!view.projection || !view.path) return;
  const { degreesC, selected } = actOne.get();
  const projection = view.projection;
  const path = view.path;

  projection.rotate(view.rotation);
  d3.select('#gGrat').attr('d', path(d3.geoGraticule().step([15, 15])()));
  d3.select('#gLand').attr('d', path(LAND));

  const centre: [number, number] = [-view.rotation[0], -view.rotation[1]];
  const arc = d3.arc().innerRadius(0).startAngle(0);

  const marks = d3
    .select('#gMarks')
    .selectAll<SVGGElement, TippingSystem>('g.mk')
    .data(SYSTEMS, (s) => s.id)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'mk').attr('tabindex', -1).attr('role', 'button');
      g.append('path').attr('class', 'mk-wedge');
      g.append('circle').attr('class', 'mk-ring');
      g.append('circle').attr('class', 'mk-core');
      g.append('path').attr('class', 'mk-cross');
      g.append('text').attr('class', 'mk-lab');

      g.on('click', function (_ev, s) {
        select(s.id as TippingSystemId, this);
      })
        .on('mouseenter', function (ev: MouseEvent, s) {
          view.hover = s.id as TippingSystemId;
          showTip(ev, tipFor(s, actOne.get().degreesC));
          paintGlobe();
        })
        .on('mouseleave', () => {
          view.hover = null;
          hideTip();
          paintGlobe();
        })
        .on('focus', function (_ev, s) {
          view.hover = s.id as TippingSystemId;
          showTipAt(this, tipFor(s, actOne.get().degreesC));
          paintGlobe();
        })
        .on('blur', () => {
          view.hover = null;
          hideTip();
          paintGlobe();
        })
        // Roving tabindex: exactly one visible marker is in the tab order, and the
        // arrow keys step between markers rather than rotating the globe — rotation
        // is what the frame itself handles. stopPropagation keeps the two key
        // handlers from both firing.
        .on('keydown', function (ev: KeyboardEvent, s) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            ev.stopPropagation();
            select(s.id as TippingSystemId, this);
            return;
          }
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
          if (step) {
            ev.preventDefault();
            ev.stopPropagation();
            moveRoving(step);
            return;
          }
          if (ev.key === 'Escape') {
            ev.stopPropagation();
            byId('globeFrame').focus();
          }
        });
      return g;
    });

  // Recompute which markers face the reader. The roving tabindex must always land
  // on one of them, or the globe becomes keyboard-unreachable after a turn.
  view.visible = SYSTEMS.filter(
    (s) =>
      d3.geoDistance([s.lon, s.lat], centre) < (Math.PI / 2) * 0.985 &&
      !!projection([s.lon, s.lat]),
  ).map((s) => s.id as TippingSystemId);
  if (view.roving === null || !view.visible.includes(view.roving)) {
    view.roving = view.visible[0] ?? null;
  }

  marks.each(function (s) {
    const g = d3.select(this);
    const visible = view.visible.includes(s.id as TippingSystemId);
    g.attr('display', visible ? null : 'none')
      .attr('aria-hidden', visible ? null : 'true')
      .attr('tabindex', visible && s.id === view.roving ? 0 : -1);
    if (!visible) return;

    const pt = projection([s.lon, s.lat]);
    if (!pt) {
      g.attr('display', 'none');
      return;
    }

    const c = crossing(s, degreesC);
    const isSelected = selected === s.id;
    const isHovered = view.hover === s.id;
    const r = Math.max(5.5, (isSelected ? 9.5 : 7.4) * (view.radius / 240));

    g.attr('transform', `translate(${pt[0]},${pt[1]})`)
      .attr('aria-selected', isSelected ? 'true' : 'false')
      .attr('aria-label', `${s.name} — ${STATE_WORD[c.state]}`);

    g.select('.mk-wedge')
      .attr(
        'd',
        c.state === 'ahead'
          ? null
          : arc({
              innerRadius: 0,
              outerRadius: r - 0.6,
              startAngle: 0,
              endAngle: Math.PI * 2 * (c.state === 'past' ? 1 : c.frac),
            }),
      )
      .attr('fill', c.state === 'past' ? '#9C4A22' : '#C8973F')
      .attr('display', c.state === 'ahead' ? 'none' : null);

    g.select('.mk-ring')
      .attr('r', r)
      .attr('class', `mk-ring${c.state === 'ahead' ? ' mk-ring--pending' : ''}`);

    g.select('.mk-core').attr('r', c.pastCentral && c.state === 'inside' ? 1.7 : 0);

    g.select('.mk-cross').attr(
      'd',
      c.state === 'past' ? `M${-r * 0.55},0 H${r * 0.55} M0,${-r * 0.55} V${r * 0.55}` : null,
    );

    g.select('.mk-lab')
      .attr('x', r + 4)
      .attr('y', 3)
      .attr('display', isSelected || isHovered ? null : 'none')
      .text(s.short);
  });

  // Cascades: geodesics from the selected element to what it destabilises.
  const cascades = d3.select('#gCascades');
  cascades.selectAll('*').remove();
  if (!selected) return;
  const src = SYSTEMS.find((s) => s.id === selected);
  if (!src) return;
  for (const id of src.cascades) {
    const target = SYSTEMS.find((s) => s.id === id);
    if (!target) continue;
    cascades
      .append('path')
      .attr('class', 'g-cascade')
      .attr(
        'd',
        path({
          type: 'LineString',
          coordinates: [
            [src.lon, src.lat],
            [target.lon, target.lat],
          ],
        }),
      );
  }
};

/** Drag to turn; arrow keys on the frame do the same in fixed steps. */
export const wireGlobeInput = (): void => {
  const frame = byId('globeFrame');

  const drag = d3
    .drag<HTMLElement, unknown>()
    .on('start', () => {
      hideTip();
    })
    .on('drag', (ev: d3.D3DragEvent<HTMLElement, unknown, unknown>) => {
      const k = (90 / view.radius) * 1.25;
      view.rotation = [
        view.rotation[0] + ev.dx * k,
        Math.max(-88, Math.min(88, view.rotation[1] - ev.dy * k)),
      ];
      paintGlobe();
    });
  d3.select<HTMLElement, unknown>(frame).call(drag);

  frame.addEventListener('keydown', (ev) => {
    const step: [number, number] | undefined = {
      ArrowLeft: [-9, 0] as [number, number],
      ArrowRight: [9, 0] as [number, number],
      ArrowUp: [0, -7] as [number, number],
      ArrowDown: [0, 7] as [number, number],
    }[ev.key];
    if (!step) return;
    ev.preventDefault();
    view.rotation = [
      view.rotation[0] + step[0],
      Math.max(-88, Math.min(88, view.rotation[1] + step[1])),
    ];
    paintGlobe();
  });
};
