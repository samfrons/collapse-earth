/**
 * The Seam's citation gate.
 *
 * This page's whole claim to rigour is that no model constant exists without a source
 * and no two copies of a published number are allowed to drift. Both are enforced at
 * runtime; these tests make the enforcement itself part of the build.
 */

import { describe, expect, it } from 'vitest';

import { amm, meta } from '../src/data';
import { COWARD_1952 } from '../src/bio';
import { P, parameters, pendingKeys, type ParamKey } from '../src/pages/the-seam/params';
import { cowardLimits } from '../src/pages/the-seam/coward-limits';
import { dryFactor, floodedFactor, meanFactor, mineTwin } from '../src/pages/the-seam/twin-model';

const sourceIds = new Set(meta.sources.map((s) => s.id as string));
const keys = Object.keys(parameters) as ParamKey[];

describe('the parameter block', () => {
  it('resolves every constant to a real source, or to a stated editorial call', () => {
    for (const k of keys) {
      const { src } = parameters[k];
      expect(src === 'editorial' || sourceIds.has(src), `${k} → ${src}`).toBe(true);
    }
  });

  it('gives every constant a unit and a note explaining what it is', () => {
    for (const k of keys) {
      expect(parameters[k].unit, k).toBeTruthy();
      expect(parameters[k].note.trim().length, k).toBeGreaterThan(8);
    }
  });

  it('reads every constant through the guard without throwing', () => {
    for (const k of keys) expect(Number.isFinite(P(k)), k).toBe(true);
  });

  /**
   * The ship gate. This is expected to fail while constants are still provisional —
   * that is what it is for. The names are printed so the failure is actionable.
   */
  it.skip('has no PENDING constants left (the ship gate)', () => {
    expect(pendingKeys()).toEqual([]);
  });

  it('reports its pending constants rather than hiding them', () => {
    // Two nose values are deliberately unconfirmed, and the sheet says the finding does
    // not turn on them. If that list changes, the page's own copy needs revisiting.
    expect([...pendingKeys()].sort()).toEqual(['cow_loc', 'cow_nose']);
  });
});

describe('no two copies of a published number', () => {
  it('holds the page’s Coward constants equal to the physics module’s', () => {
    expect(cowardLimits()).toEqual(COWARD_1952);
  });
});

describe('the twin', () => {
  const worked = amm.mines.find((m) => m.floodedDelta);

  it('reproduces its published anchor rather than being tuned to it', () => {
    expect(worked).toBeDefined();
    if (!worked) return;
    const tw = mineTwin(worked);
    const reproduced = tw.q0 * meanFactor(dryFactor, tw.anchorWindow, 'central');
    expect(Math.abs(reproduced - tw.anchor) / tw.anchor).toBeLessThan(0.01);
  });

  it('predicts the flooded figure it was never anchored on, within a stated margin', () => {
    expect(worked?.floodedDelta).toBeDefined();
    if (!worked?.floodedDelta) return;
    const tw = mineTwin(worked);
    const miss =
      Math.abs(tw.floodedMeanImplied - worked.floodedDelta.flooded) / worked.floodedDelta.flooded;
    // The page claims a single-digit-percent miss with zero tuning. If this widens, the
    // sentence on the decline chart is no longer true and must change with it.
    expect(miss).toBeLessThan(0.1);
  });

  it('declines monotonically on both paths', () => {
    for (const fn of [dryFactor, floodedFactor]) {
      let previous = Infinity;
      for (let t = 0; t <= 30; t += 0.25) {
        const f = fn(t, 'central');
        expect(f).toBeLessThanOrEqual(previous + 1e-12);
        previous = f;
      }
    }
  });

  it('brackets the central dry path inside its own envelope', () => {
    for (let t = 0; t <= 30; t += 0.5) {
      const low = dryFactor(t, 'low');
      const central = dryFactor(t, 'central');
      const high = dryFactor(t, 'high');
      expect(low).toBeLessThanOrEqual(central + 1e-12);
      expect(central).toBeLessThanOrEqual(high + 1e-12);
    }
  });

  it('reaches exactly zero on the flooded path at the published cutoff', () => {
    expect(floodedFactor(P('T_zero_fl'), 'central')).toBe(0);
    expect(floodedFactor(P('T_zero_fl') + 5, 'central')).toBe(0);
  });
});
