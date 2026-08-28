/**
 * The atlas's editorial rules, as tests.
 *
 * The type system enforces the *shape* of these rules — every figure carries a source,
 * every threshold is a band. What it cannot check is whether the ids resolve and
 * whether the arithmetic downstream is the arithmetic the file documents. That is what
 * these are for.
 */

import { describe, expect, it } from 'vitest';

import {
  amm,
  atlas,
  capitalIsHedged,
  companies,
  hypotheses,
  interventions,
  meta,
  tippingSystems,
  crossingAt,
  isOpportunity,
  medianDisclosedCapital,
  OPPORTUNITY_THRESHOLD,
  totalCapitalRaised,
  totalForStream,
  undisclosedCapitalRows,
} from '../src/data';

const sourceIds = new Set(meta.sources.map((s) => s.id as string));

describe('provenance', () => {
  it('resolves every citation used anywhere in the atlas', () => {
    const unresolved: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((v, i) => {
          walk(v, `${path}[${i}]`);
        });
        return;
      }
      if (node === null || typeof node !== 'object') return;

      for (const [key, value] of Object.entries(node)) {
        if ((key === 'sourceIds' || key === 'sourceId') && value !== null) {
          const ids = Array.isArray(value) ? (value as string[]) : [value as string];
          for (const id of ids) {
            if (!sourceIds.has(id)) unresolved.push(`${path}.${key} → "${id}"`);
          }
          continue;
        }
        walk(value, `${path}.${key}`);
      }
    };
    walk(atlas, 'atlas');
    expect(unresolved).toEqual([]);
  });

  it('gives every source a date, and a url or an explicit null', () => {
    for (const s of meta.sources) {
      expect(s.date, s.id).toMatch(/^\d{4}(-\d{2}){0,2}$|^\d{4}-[HQ]\d$|^\d{4}-\d{4}$/);
      expect(s.url === null || s.url.startsWith('http'), s.id).toBe(true);
    }
  });

  it('has no duplicate source ids', () => {
    expect(sourceIds.size).toBe(meta.sources.length);
  });
});

describe('tipping thresholds', () => {
  it('orders every band min ≤ central ≤ max', () => {
    for (const s of tippingSystems) {
      expect(s.threshold.min, s.id).toBeLessThanOrEqual(s.threshold.central);
      expect(s.threshold.central, s.id).toBeLessThanOrEqual(s.threshold.max);
    }
  });

  it('resolves every cascade target to a real system', () => {
    const ids = new Set(tippingSystems.map((s) => s.id as string));
    for (const s of tippingSystems) {
      for (const target of s.cascades) expect(ids.has(target), `${s.id} → ${target}`).toBe(true);
    }
  });

  it('explains a contested timing wherever it flags one', () => {
    for (const s of tippingSystems) {
      if (s.contested) expect(s.contestedNote, s.id).toBeTruthy();
    }
  });

  it('is three-valued about crossing, never two', () => {
    const [first] = tippingSystems;
    expect(first).toBeDefined();
    if (!first) return;
    expect(crossingAt(first, first.threshold.min - 0.1)).toBe('below');
    expect(crossingAt(first, first.threshold.central)).toBe('within');
    expect(crossingAt(first, first.threshold.max + 0.1)).toBe('beyond');
  });
});

describe('funding arithmetic', () => {
  it('never counts a row that sits inside another row’s cumulative total', () => {
    for (const iv of interventions) {
      const naive = iv.funding
        .filter((f) => f.stream === 'capital')
        .reduce((n, f) => n + (f.amount ?? 0), 0);
      const nested = iv.funding
        .filter((f) => f.stream === 'capital' && f.withinCumulative !== undefined)
        .reduce((n, f) => n + (f.amount ?? 0), 0);
      expect(totalCapitalRaised(iv), iv.id).toBe(naive - nested);
    }
  });

  it('never mixes streams into capital raised', () => {
    for (const iv of interventions) {
      const others = (['target', 'contract', 'prize', 'grant', 'aggregate'] as const).reduce(
        (n, s) => n + totalForStream(iv, s),
        0,
      );
      // If any other stream carries money, the capital total must be strictly smaller
      // than a total that had swept everything in.
      if (others > 0) {
        expect(totalCapitalRaised(iv), iv.id).toBeLessThan(totalCapitalRaised(iv) + others);
      }
    }
  });

  it('quotes the source wherever it asserts an absence of funding', () => {
    for (const iv of interventions) {
      for (const f of iv.funding) {
        if (!f.assertedAbsence) continue;
        expect(f.sourceQuote, `${iv.id}/${f.holder}`).toBeTruthy();
        expect(f.amount, `${iv.id}/${f.holder}`).toBeNull();
      }
    }
    for (const tier of [companies.tier1, companies.tier2, companies.tier3]) {
      for (const c of tier) {
        if (c.keyFact.assertedAbsence) expect(c.keyFact.sourceQuote, c.name).toBeTruthy();
      }
    }
  });

  it('hedges a total whenever a counted row is hedged or undisclosed', () => {
    for (const iv of interventions) {
      const hasHedge = iv.funding.some(
        (f) => f.stream === 'capital' && 'qualifier' in f && f.qualifier,
      );
      if (hasHedge || undisclosedCapitalRows(iv) > 0) {
        expect(capitalIsHedged(iv), iv.id).toBe(true);
      }
    }
  });

  it('excludes undisclosed categories from the median, so a blank is not a zero', () => {
    const disclosed = interventions.map(totalCapitalRaised).filter((n) => n > 0);
    const median = medianDisclosedCapital(interventions);
    expect(median).toBeGreaterThan(0);
    expect(median).toBeGreaterThanOrEqual(Math.min(...disclosed));
    expect(median).toBeLessThanOrEqual(Math.max(...disclosed));
  });
});

describe('the single flagged set', () => {
  it('derives the opportunity board and the assay flag from one predicate', () => {
    for (const iv of interventions) {
      expect(isOpportunity(iv), iv.id).toBe(iv.gapScore >= OPPORTUNITY_THRESHOLD);
    }
  });

  it('keeps every gap score inside the one-to-five scale it is labelled with', () => {
    for (const iv of interventions) {
      expect(iv.gapScore, iv.id).toBeGreaterThanOrEqual(1);
      expect(iv.gapScore, iv.id).toBeLessThanOrEqual(5);
      expect(iv.leverageBand, iv.id).toBeGreaterThanOrEqual(1);
      expect(iv.leverageBand, iv.id).toBeLessThanOrEqual(5);
      expect(iv.trlBand, iv.id).toBeGreaterThanOrEqual(1);
      expect(iv.trlBand, iv.id).toBeLessThanOrEqual(9);
    }
  });
});

describe('hypotheses', () => {
  it('states kill criteria and validation for every claim', () => {
    for (const h of hypotheses) {
      expect(h.killCriteria, h.id).toBeTruthy();
      expect(h.validation, h.id).toBeTruthy();
    }
  });

  it('resolves every related intervention', () => {
    const ids = new Set(interventions.map((iv) => iv.id as string));
    for (const h of hypotheses) {
      for (const id of h.relatedInterventions) expect(ids.has(id), `${h.id} → ${id}`).toBe(true);
    }
  });
});

describe('abandoned-mine methane', () => {
  it('keeps the six named mines inside the published inventory total', () => {
    const named = amm.mines.reduce((n, m) => n + m.mcm, 0);
    expect(named).toBeLessThan(amm.inventory.central.mcm);
    expect(amm.inventory.sixMines.mcm).toBeLessThan(amm.inventory.central.mcm);
  });

  it('accounts for every mine status in the counts', () => {
    const st = amm.inventory.status;
    expect(st.unknown + st.dry + st.flooded).toBe(st.of);
  });

  it('keeps the 20-year lens above the 100-year one', () => {
    expect(amm.gwp.gwp20).toBeGreaterThan(amm.gwp.gwp100);
  });

  it('orders every Fermi band min ≤ central ≤ max', () => {
    for (const r of amm.fermi) {
      expect(r.ktCh4.min, r.id).toBeLessThanOrEqual(r.ktCh4.central);
      expect(r.ktCh4.central, r.id).toBeLessThanOrEqual(r.ktCh4.max);
    }
  });
});
