/**
 * The living mine — a schematic cross-section, and the gas rising through it.
 *
 * Three surface modules over a sealed wellhead and a shaft down to the workings. Gas
 * particles rise at the modelled rate; the water table follows the flooding
 * assumption. Illustrative, not a survey — and under a reduced-motion preference the
 * particles become a static density hatch rather than disappearing, because the
 * density is carrying information.
 */

import * as d3 from 'd3';

import { byId, prefersReducedMotion, setText } from '@/lib/dom';
import { P } from './params';
import { concentration, dryFactor, floodedFactor, route, type Twin } from './twin-model';
import { plannedSeal, playheadYear, twin } from './twin-state';

type Group = d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
type Text = d3.Selection<SVGTextElement, unknown, HTMLElement, unknown>;

interface ShaftGeometry {
  readonly shaftL: number;
  readonly shaftR: number;
  readonly groundY: number;
  readonly shaftBot: number;
  readonly workL: number;
  readonly workR: number;
  readonly workBot: number;
  readonly sumpY: number;
}

interface ShaftView {
  readonly modules: Record<string, Group>;
  readonly water: Group;
  readonly particles: Group;
  readonly stamp: Text;
  readonly geometry: ShaftGeometry;
}

let view: ShaftView | null = null;

export const drawShaft = (): void => {
  const svg = d3.select('#shaftSvg');
  svg.selectAll('*').remove();

  const W = 380;
  const H = 600;
  const geometry: ShaftGeometry = {
    groundY: 86,
    shaftL: 176,
    shaftR: 204,
    shaftBot: 470,
    workL: 40,
    workR: 340,
    workBot: 500,
    sumpY: 545,
  };
  const { groundY, shaftL, shaftR, shaftBot, workL, workR, workBot, sumpY } = geometry;
  const workTop = 470;
  const { status } = twin.get();

  setText(
    byId('shaftK'),
    'the shaft · schematic cross-section · ' +
      (status === 'flooded'
        ? 'water rising'
        : status === 'dry'
          ? 'dry workings'
          : 'status unknown — both waters drawn'),
  );

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr(
      'aria-label',
      'Schematic mine cross-section: three surface modules — gas engine, enclosed flare, ' +
        'regenerative oxidizer — over a sealed wellhead and shaft down to the workings. Gas ' +
        'particles rise at the modelled rate; the water table follows the flooding ' +
        'assumption. Illustrative, not a survey.',
    );

  // Country rock, in the page's palette.
  for (const [fill, y0, y1] of [
    ['#D8B98C', groundY, 180],
    ['#C8973F', 180, 300],
    ['#AE6A2E', 300, 400],
    ['#9C4A22', 400, 500],
    ['#4A2413', 500, H],
  ] as const) {
    svg
      .append('rect')
      .attr('x', 0)
      .attr('y', y0)
      .attr('width', W)
      .attr('height', y1 - y0)
      .attr('fill', fill)
      .attr('opacity', 0.55);
  }
  svg
    .append('line')
    .attr('x1', 0)
    .attr('x2', W)
    .attr('y1', groundY)
    .attr('y2', groundY)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 1.4);

  // The three surface modules — the unit's destinations.
  const modules: Record<string, Group> = {};
  for (const m of [
    { id: 'engine', x: 14, label: 'ENGINE · CHP' },
    { id: 'flare', x: 138, label: 'FLARE · OXID.' },
    { id: 'rto', x: 262, label: 'RTO · LEAN' },
  ]) {
    const g = svg
      .append('g')
      .attr('class', 'fd-mk')
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', `${m.label} module — lights when the modelled stream routes to it`);
    g.append('rect')
      .attr('x', m.x)
      .attr('y', 16)
      .attr('width', 104)
      .attr('height', 40)
      .attr('fill', 'rgba(23,19,14,.85)')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 1.2);
    g.append('text')
      .attr('class', 'fd-hd')
      .attr('x', m.x + 52)
      .attr('y', 39)
      .attr('text-anchor', 'middle')
      .style('fill', '#F4EFE6')
      .text(m.label);
    svg
      .append('line')
      .attr('x1', m.x + 52)
      .attr('x2', m.x + 52)
      .attr('y1', 56)
      .attr('y2', 70)
      .attr('stroke', '#17130E')
      .attr('stroke-width', 2);
    modules[m.id] = g as Group;
  }

  // Manifold to wellhead.
  svg
    .append('line')
    .attr('x1', 66)
    .attr('x2', 314)
    .attr('y1', 70)
    .attr('y2', 70)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 2);
  svg
    .append('line')
    .attr('x1', 190)
    .attr('x2', 190)
    .attr('y1', 70)
    .attr('y2', groundY)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 2);
  svg
    .append('rect')
    .attr('x', shaftL - 6)
    .attr('y', groundY - 6)
    .attr('width', 40)
    .attr('height', 12)
    .attr('fill', '#17130E');
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', shaftL - 14)
    .attr('y', groundY + 3)
    .attr('text-anchor', 'end')
    .text('SEALED WELLHEAD');

  // Shaft and workings.
  svg
    .append('rect')
    .attr('x', shaftL)
    .attr('y', groundY)
    .attr('width', shaftR - shaftL)
    .attr('height', shaftBot - groundY)
    .attr('fill', 'rgba(23,19,14,.88)');
  svg
    .append('rect')
    .attr('x', workL)
    .attr('y', workTop)
    .attr('width', workR - workL)
    .attr('height', workBot - workTop)
    .attr('fill', 'rgba(23,19,14,.88)');
  svg
    .append('rect')
    .attr('x', workL + 30)
    .attr('y', workBot)
    .attr('width', workR - workL - 60)
    .attr('height', sumpY - workBot + 14)
    .attr('fill', 'rgba(23,19,14,.82)');
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', 190)
    .attr('y', workBot + 30)
    .attr('text-anchor', 'middle')
    .style('fill', '#EADDC9')
    .text('THE WORKINGS · THE SEAM');

  view = {
    modules,
    water: svg.append('g') as Group,
    particles: svg.append('g') as Group,
    stamp: svg
      .append('text')
      .attr('class', 'fd-hd')
      .attr('x', 190)
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .style('fill', '#5A1A0C')
      .text('') as Text,
    geometry,
  };
};

export const paintShaftWater = (tw: Twin): void => {
  if (!view) return;
  const geo = view.geometry;
  view.water.selectAll('*').remove();

  const t = playheadYear(tw) - tw.closed;
  const progress = Math.min(1, Math.max(0, t / P('T_zero_fl')));
  const floodY = geo.sumpY - progress * (geo.sumpY - 160);

  // The sump is always wet.
  view.water
    .append('rect')
    .attr('x', geo.workL + 30)
    .attr('y', geo.sumpY)
    .attr('width', geo.workR - geo.workL - 60)
    .attr('height', 14)
    .attr('fill', '#3E6B7A')
    .attr('opacity', 0.8);

  const waterTo = (yTop: number, dashed: boolean): void => {
    if (!view) return;
    const top = Math.max(yTop, geo.groundY + 20);
    if (yTop < geo.workBot) {
      view.water
        .append('rect')
        .attr('x', geo.workL)
        .attr('y', top)
        .attr('width', geo.workR - geo.workL)
        .attr('height', geo.workBot - top)
        .attr('fill', '#3E6B7A')
        .attr('opacity', dashed ? 0 : 0.55);
    }
    view.water
      .append('line')
      .attr('x1', geo.workL - 6)
      .attr('x2', geo.workR + 6)
      .attr('y1', top)
      .attr('y2', top)
      .attr('stroke', '#8FB8C7')
      .attr('stroke-width', 1.6)
      .attr('stroke-dasharray', dashed ? '4 3' : null);
    if (!dashed && top < geo.workBot) {
      view.water
        .append('rect')
        .attr('x', geo.shaftL)
        .attr('y', top)
        .attr('width', geo.shaftR - geo.shaftL)
        .attr('height', Math.max(0, geo.shaftBot - top))
        .attr('fill', '#3E6B7A')
        .attr('opacity', 0.55);
    }
  };

  const { status } = twin.get();
  if (status === 'dry') return;

  waterTo(floodY, status === 'unknown');
  view.water
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', geo.workL - 4)
    .attr('y', Math.max(floodY, geo.groundY + 20) - 6)
    .attr('text-anchor', 'start')
    .style('fill', '#1F4152')
    .text(status === 'flooded' ? 'WATER · RISING' : 'WATER? — UNKNOWN');
};

export const paintShaftModules = (tw: Twin): void => {
  if (!view) return;

  // The operating clock runs from the unit's start year; an unsurveyed seal plans on
  // the leaky path — the conservative read, stated in the drawer.
  const tOp = Math.max(0, playheadYear(tw) - twin.get().startYear);
  const c = concentration(tOp, plannedSeal());
  const r = route(c);
  const active = r.id === 'engine' ? 'engine' : r.id === 'margin' || r.id === 'rto' ? 'rto' : null;

  for (const [id, g] of Object.entries(view.modules)) {
    const box = g.select('rect');
    if (id === active) {
      box.attr('fill', '#5A1A0C').attr('stroke', '#17130E');
      g.attr('opacity', 1);
    } else {
      box.attr('fill', 'rgba(23,19,14,.85)');
      g.attr('opacity', 0.45);
    }
  }

  view.stamp.text(
    c >= P('lel') && c <= P('uel')
      ? 'RAW STREAM IN THE EXPLOSIVE RANGE — SEALED HANDLING ONLY'
      : '',
  );
};

/* -------------------------------------------------------------------------- */
/* Gas particles — spawn rate follows the modelled rate                       */
/* -------------------------------------------------------------------------- */

interface Particle {
  x: number;
  y: number;
  v: number;
  r: number;
}

let particles: Particle[] = [];
let running = false;

/**
 * Density carries information here, so the animated and reduced-motion views must read
 * the same factor. They previously disagreed: a flooded specimen past the cutoff showed
 * no particles when animated and dry-path density when still.
 */
const emissionFraction = (tw: Twin): number => {
  const t = Math.max(0, playheadYear(tw) - tw.closed);
  return twin.get().status === 'flooded' ? floodedFactor(t, 'central') : dryFactor(t, 'central');
};

const stepParticles = (tw: Twin): void => {
  if (!view) return;
  const geo = view.geometry;
  const frac = emissionFraction(tw);

  if (particles.length < 40 && Math.random() < frac * 0.55) {
    particles.push({
      x: geo.shaftL + 6 + Math.random() * (geo.shaftR - geo.shaftL - 12),
      y: geo.shaftBot - 8,
      v: 1.2 + Math.random() * 1.6,
      r: 1.4 + Math.random() * 1.4,
    });
  }

  for (const p of particles) {
    p.y -= p.v;
    p.x += (Math.random() - 0.5) * 0.8;
  }
  particles = particles.filter((p) => p.y >= geo.groundY - 40);

  view.particles
    .selectAll<SVGCircleElement, Particle>('circle')
    .data(particles)
    .join((enter) => enter.append('circle').attr('fill', '#EADDC9').attr('opacity', 0.75))
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => d.r);
};

/** Reduced-motion stand-in: dash density maps to the modelled rate. */
export const drawStaticGas = (tw: Twin): void => {
  if (!view) return;
  const geo = view.geometry;
  const n = Math.round(emissionFraction(tw) * 26);

  view.particles.selectAll('*').remove();
  for (let i = 0; i < n; i++) {
    view.particles
      .append('circle')
      .attr('cx', geo.shaftL + 5 + ((i * 13) % (geo.shaftR - geo.shaftL - 10)))
      .attr('cy', geo.groundY + 24 + ((i * 37) % (geo.shaftBot - geo.groundY - 40)))
      .attr('r', 1.6)
      .attr('fill', '#EADDC9')
      .attr('opacity', 0.7);
  }
};

/** Run the particles only while the act is on screen, and never under reduced motion. */
export const wireParticleGate = (currentTwin: () => Twin): void => {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const loop = (): void => {
    if (!running) return;
    stepParticles(currentTwin());
    requestAnimationFrame(loop);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !running) {
          running = true;
          loop();
        } else if (!e.isIntersecting) {
          running = false;
        }
      }
    },
    { threshold: 0.05 },
  );
  observer.observe(byId('act2'));
};
