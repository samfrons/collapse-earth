/**
 * Firn — the recovered core, and the one number the whole page is read against.
 */

import * as d3 from 'd3';

import { hypotheses, interventions, meta, sources, tippingSystems, warming } from '@/data';
import { byId, prefersReducedMotion, setHtml, setText } from '@/lib/dom';
import { capitalise, grouped, numberWord } from '@/lib/format';
import { html } from '@/lib/html';
import type { MediaLedger } from '@/lib/media';
import { ANTHROPOCENE_DEPTH, CORE_LENGTH, depthToAge, segmentById } from './column';
import { DIAL } from './thresholds';

/**
 * A rug of every central threshold estimate under the dial's span, with the
 * observed multi-year range picked out. One axis, one measure.
 */
const drawReadoutStrip = (): void => {
  const svg = d3.select('#readoutSvg');
  const W = 300;
  const H = 34;
  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', H);
  svg.selectAll('*').remove();

  const x = d3
    .scaleLinear()
    .domain([DIAL.min, DIAL.max])
    .range([2, W - 2]);
  const baseline = 15;

  svg
    .append('line')
    .attr('x1', 2)
    .attr('x2', W - 2)
    .attr('y1', baseline)
    .attr('y2', baseline)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 0.7)
    .attr('opacity', 0.35);

  for (const s of tippingSystems) {
    const at = x(Math.min(s.threshold.central, DIAL.max));
    svg
      .append('line')
      .attr('x1', at)
      .attr('x2', at)
      .attr('y1', baseline - 6)
      .attr('y2', baseline)
      .attr('stroke', '#17130E')
      .attr('stroke-width', 0.9)
      .attr('opacity', 0.55);
  }

  svg
    .append('rect')
    .attr('x', x(warming.range.min))
    .attr('width', Math.max(2, x(warming.range.max) - x(warming.range.min)))
    .attr('y', baseline - 9)
    .attr('height', 12)
    .attr('fill', '#3E6B7A')
    .attr('opacity', 0.2);
  svg
    .append('line')
    .attr('x1', x(warming.current))
    .attr('x2', x(warming.current))
    .attr('y1', baseline - 11)
    .attr('y2', baseline + 4)
    .attr('stroke', '#3E6B7A')
    .attr('stroke-width', 1.6);

  const anchors = ['start', 'middle', 'end'] as const;
  for (const [i, v] of [DIAL.min, warming.current, DIAL.max].entries()) {
    svg
      .append('text')
      .attr('x', x(v))
      .attr('y', H - 1)
      .attr('text-anchor', anchors[i === 0 ? 0 : i === 2 ? 2 : 1])
      .style('font-family', 'var(--mono)')
      .style('font-size', '7.4px')
      .style('letter-spacing', '.08em')
      .attr('fill', '#5C4B37')
      .text(v.toFixed(1));
  }

  svg
    .append('text')
    .attr('x', x(warming.current))
    .attr('y', 5)
    .attr('text-anchor', 'middle')
    .style('font-family', 'var(--mono)')
    .style('font-size', '6.6px')
    .style('letter-spacing', '.12em')
    .attr('fill', '#33596A')
    .text('NOW');

  svg
    .append('title')
    .text(
      "Every central threshold estimate in the atlas, plotted on the dial's span; " +
        'the marked band is the observed multi-year range.',
    );
};

export const renderHero = (media: MediaLedger): void => {
  setHtml(
    byId('heroEyebrow'),
    html`Core log <b>01</b> · logged <b>${meta.updated}</b> · ${tippingSystems.length} elements ·
      ${interventions.length} intervention categories · ${hypotheses.length} hypotheses`,
  );

  // The lede's own count, spelled out and read from the data like every other.
  setText(byId('ledeSysN'), capitalise(numberWord(tippingSystems.length)));

  setHtml(
    byId('heroMeta'),
    html`${[
      'read top to bottom',
      'depth in metres, age in years before present',
      'scale illustrative — see methods',
    ].map((t) => html`<span>${t}</span>`)}`,
  );

  // Anthropocene note: the honest scale of our own layer against the core. Depth
  // and percentage both read off the calibration, so this sentence moves with it
  // instead of contradicting the gauge drawn from the same numbers.
  const anthroM = grouped(ANTHROPOCENE_DEPTH);
  const pct = (ANTHROPOCENE_DEPTH / CORE_LENGTH) * 100;
  setText(byId('anthroLab'), `our own layer · the top ≈${anthroM} m`);
  setText(
    byId('anthroNote'),
    `Everything since the mid-twentieth century sits in the top ≈${anthroM} m of a ` +
      `${grouped(CORE_LENGTH)}-metre core — ${pct.toFixed(1)}% of its length.`,
  );

  // The one number the whole page is read against.
  setText(byId('readoutK'), `observed warming · ${warming.unit}`);
  setText(byId('readoutV'), warming.current.toFixed(1));
  setHtml(byId('readoutU'), html`degrees Celsius<br />${warming.unit}`);
  setText(byId('readoutNote'), warming.currentNote);
  setText(
    byId('readoutSrc'),
    `source · ${sources(warming.sourceIds)
      .map((s) => s.date)
      .join(' · ')} — listed under methods`,
  );

  drawReadoutStrip();

  // Hero plate: satellite ice footage as a monochrome core photograph. It is the
  // only clip inside the first viewport, so the lazy-video observer would fetch it
  // on load and put the page over its 2.5 MB initial budget. It is therefore held
  // on its poster frame behind an explicit control.
  const slug = media.pick('ice');
  if (!slug) return;
  media.use(slug);
  const plate = byId('heroPlate');

  setHtml(
    plate,
    html`${media.markup(slug, '', { autoplay: false })}${
      prefersReducedMotion()
        ? ''
        : html`<button class="plate-play" id="heroPlay" type="button">
            <span class="plate-play-ico" aria-hidden="true"></span>
            <span>Play footage<em>${media.weight(slug)}</em></span>
          </button>`
    }`,
  );

  const clip = media.clipFor(slug);
  setText(byId('heroPlateCap'), `${clip.credit} · ${clip.license}`);

  const play = document.getElementById('heroPlay');
  play?.addEventListener('click', () => {
    const video = plate.querySelector('video');
    if (!video) return;
    video.preload = 'auto';
    // Refusal is fine; the poster stands in.
    void video.play().catch(() => undefined);
    play.remove();
  });
};

/**
 * Copy is per-band; the clip and the depth are not. The clip comes from the slot's
 * own `data-tags` / `data-pick` attributes and the depth from the segment log, so
 * editing either one cannot silently desynchronise the label from what is rendered.
 */
const CONTACT_COPY: Record<string, { name: string; sub: string }> = {
  contactA: {
    name: 'bone to ochre',
    sub:
      'Below this line the subject changes: from what the Earth systems do to what money ' +
      'has done about them.',
  },
  contactB: {
    name: 'pleistocene–holocene boundary',
    sub:
      'The last great climate transition, and where the page goes dark. Below it is ' +
      'argument rather than record.',
  },
  // The ice record from the hero returns here, screen-blended rather than framed: a
  // deliberate reprise at bedrock depth, and a clip the browser may already have
  // fetched, which keeps the page inside its payload budget.
  contactC: {
    name: 'rust to carbon · bedrock approach',
    sub: 'The deepest ice is the most deformed and hardest to date. What follows is the record.',
  },
};

export const renderContactBands = (media: MediaLedger): void => {
  for (const [id, copy] of Object.entries(CONTACT_COPY)) {
    const section = document.getElementById(id);
    if (!section) continue;

    const slot = section.querySelector('.contact-media-slot');
    if (slot) {
      const tag = slot.getAttribute('data-tags');
      const index = slot.getAttribute('data-pick') === 'second' ? 1 : 0;
      const slug = tag ? media.pick(tag, index) : undefined;
      if (slug) {
        slot.outerHTML = media.markup(slug, 'contact-media').value;
        media.use(slug);
      }
    }

    const segment = segmentById(id);
    setText(
      byId(`${id}Chip`),
      segment
        ? `contact · ${grouped(segment.d0)} m · ≈${grouped(depthToAge(segment.d0))} yr bp`
        : 'contact',
    );
    setText(byId(`${id}Name`), copy.name);
    setText(byId(`${id}Sub`), copy.sub);
  }
};
