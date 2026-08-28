/**
 * The dial — one control, and the running count of what it puts in play.
 *
 * The floor is the smallest threshold minimum in the dataset and the ceiling is
 * this control's reading limit, both derived rather than chosen. The band chart's
 * axis deliberately runs further, so elements above the dial's reach stay on the
 * page instead of being cropped out of the argument.
 */

import { tippingSystems, warming } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { degC } from '@/lib/format';
import { html, raw } from '@/lib/html';
import { actOne, crossing, DIAL, type ThresholdState } from './thresholds';

const LEGEND = [
  {
    key: 'range still ahead',
    text: "The dial sits below the element's minimum estimate. Drawn as an open, broken ring.",
    art: "<circle cx='13' cy='13' r='8' fill='none' stroke='#17130E' stroke-width='1.1' stroke-dasharray='2 1.7' opacity='.72'/>",
  },
  {
    key: 'inside the range',
    text: 'The dial is between the minimum and maximum estimates. The wedge fills in proportion to how far into the band the dial has gone — this is the honest rendering, because a threshold is a range, not a date. A dot appears once the central estimate is passed.',
    art: "<path d='M13,13 L13,5 A8,8 0 0,1 20.6,10.5 Z' fill='#C8973F' stroke='#17130E' stroke-width='.7'/><circle cx='13' cy='13' r='8' fill='none' stroke='#17130E' stroke-width='1.1'/>",
  },
  {
    key: 'past the upper estimate',
    text: 'The dial is above the maximum estimate. Filled solid and struck through.',
    art: "<circle cx='13' cy='13' r='7.4' fill='#9C4A22' stroke='#17130E' stroke-width='1.1'/><path d='M8.9,13 H17.1 M13,8.9 V17.1' stroke='#EDE6DA' stroke-width='.9'/>",
  },
] as const;

const renderLegend = (): void => {
  setHtml(
    byId('legend'),
    html`${LEGEND.map(
      (r) =>
        html`<div class="legend-row">
          <svg viewBox="0 0 26 26" aria-hidden="true">${raw(r.art)}</svg>
          <p><b>${r.key}</b>${r.text}</p>
        </div>`,
    )}`,
  );
};

const updateReadout = (): void => {
  const { degreesC } = actOne.get();
  const counts: Record<ThresholdState, number> = { ahead: 0, inside: 0, past: 0 };
  for (const s of tippingSystems) counts[crossing(s, degreesC).state]++;

  setHtml(byId('dialVal'), html`${degreesC.toFixed(2)} <small>°C</small>`);
  setHtml(
    byId('dialCount'),
    html`<div><b>${counts.past}</b>past the upper estimate</div>
      <div><b>${counts.inside}</b>inside the range</div>
      <div><b>${counts.ahead}</b>range still ahead</div>`,
  );
};

export const renderDial = (): void => {
  const input = byId<HTMLInputElement>('dial');
  input.min = String(DIAL.min);
  input.max = String(DIAL.max);
  input.step = String(DIAL.step);
  input.value = String(actOne.get().degreesC);
  input.setAttribute(
    'aria-label',
    'Global warming above the 1850–1900 baseline, in degrees Celsius',
  );

  setText(byId('dialLab'), 'dial · warming above pre-industrial');
  setHtml(
    byId('dialScale'),
    html`<span>${degC(DIAL.min)}</span><span>observed ${degC(warming.current)}</span
      ><span>${degC(DIAL.max)}</span>`,
  );

  input.addEventListener('input', () => {
    actOne.set({ degreesC: Number(input.value) });
  });

  actOne.subscribe(updateReadout);
  renderLegend();
  updateReadout();
};
