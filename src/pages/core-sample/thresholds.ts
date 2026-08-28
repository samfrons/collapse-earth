/**
 * Act I's shared reading of the threshold data: the dial's span, and how a given
 * warming level stands against one element's estimated range.
 */

import * as d3 from 'd3';

import {
  tippingSystems,
  warming,
  type Confidence,
  type TippingSystem,
  type TippingSystemId,
} from '@/data';
import { createStore } from '@/lib/store';
import { html, raw, type SafeHtml } from '@/lib/html';

/**
 * The dial floor is the smallest threshold minimum in the dataset; the ceiling is
 * the reading ceiling for this control. The band chart's axis runs further, so the
 * elements above the dial's reach stay visible and labelled rather than clipped.
 */
export const DIAL = {
  min: d3.min(tippingSystems, (s) => s.threshold.min) ?? 1,
  max: 5.0,
  step: warming.dialRange.step,
} as const;

/** Axis ceiling for the band chart, rounded up to the next half-degree. */
export const AXIS_MAX = Math.ceil((d3.max(tippingSystems, (s) => s.threshold.max) ?? 5) * 2) / 2;

/* -------------------------------------------------------------------------- */
/* Crossing                                                                   */
/* -------------------------------------------------------------------------- */

export type ThresholdState = 'ahead' | 'inside' | 'past';

export interface Crossing {
  /** How far into the estimated band the dial has gone, 0–1. */
  readonly frac: number;
  readonly state: ThresholdState;
  readonly pastCentral: boolean;
}

/**
 * Uncertainty-aware. Nothing flips at the central estimate alone — that is exactly
 * the misreading the band chart exists to prevent, so the model behind it refuses
 * to collapse a range to a point.
 */
export const crossing = (system: TippingSystem, degreesC: number): Crossing => {
  const th = system.threshold;
  const span = Math.max(1e-6, th.max - th.min);
  return {
    frac: Math.max(0, Math.min(1, (degreesC - th.min) / span)),
    state: degreesC < th.min ? 'ahead' : degreesC >= th.max ? 'past' : 'inside',
    pastCentral: degreesC >= th.central,
  };
};

export const STATE_WORD: Record<ThresholdState, string> = {
  ahead: 'range still ahead',
  inside: 'inside the estimated range',
  past: 'past the upper estimate',
};

/**
 * A rating drawn as filled pips out of a total.
 *
 * Used for both the confidence rating and Act II's gap assessment, and used for both
 * *because* neither is a measurement: a row of pips can be compared but not read off,
 * which is exactly the affordance an editorial ordinal should have.
 */
export const pips = (on: number, total: number): SafeHtml => {
  let out = '';
  for (let i = 0; i < total; i++) out += `<i class="${i < on ? 'on' : ''}"></i>`;
  return html`<span class="pips">${raw(out)}</span>`;
};

const CONFIDENCE_PIPS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export const confidencePips = (confidence: Confidence): SafeHtml =>
  pips(CONFIDENCE_PIPS[confidence], 3);

/* -------------------------------------------------------------------------- */
/* Shared view state                                                          */
/* -------------------------------------------------------------------------- */

export interface ActOneState {
  /** Degrees Celsius the reader has dialled in. Starts at observed warming. */
  readonly degreesC: number;
  readonly selected: TippingSystemId | null;
}

export const actOne = createStore<ActOneState>({
  degreesC: warming.current,
  selected: null,
});

export const systemById = (id: TippingSystemId): TippingSystem | undefined =>
  tippingSystems.find((s) => s.id === id);
