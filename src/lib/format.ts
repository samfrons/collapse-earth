/**
 * Number formatting, with one rule: never invent precision the source lacks.
 *
 * Every function here rounds *down* in confidence — dropping trailing zeros a
 * source did not assert, keeping hedges the source did assert, and spelling out
 * prose counts so that no figure is ever typed into markup by hand.
 */

import type { Qualifier } from '@/data';

/** Dollar amounts, at the precision the magnitude actually supports. */
export const money = (n: number | null | undefined): string | null => {
  if (n === null || n === undefined) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  return `$${String(Math.round(n / 1e3))}k`;
};

/** The hedge symbols, kept in front of the figure rather than rounded away. */
const QUALIFIER_SYMBOL: Record<Qualifier, string> = {
  'at-least': '≥',
  approximately: '≈',
};

/** A dollar amount carrying whatever hedge its source carried. */
export const moneyQualified = (entry: {
  readonly amount: number | null;
  readonly qualifier?: Qualifier;
}): string | null => {
  const figure = money(entry.amount);
  if (figure === null) return null;
  const symbol = entry.qualifier ? `${QUALIFIER_SYMBOL[entry.qualifier]} ` : '';
  return symbol + figure;
};

export const degC = (v: number): string => `${v.toFixed(1)} °C`;

/** Thin-space digit grouping, so long figures stay readable at small sizes. */
export const grouped = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
] as const;

/**
 * Prose counts are *rendered*, never typed. A spelled-out number in markup is the
 * one class of hardcoded figure that a digit-only audit cannot see, so the page
 * derives its words the same way it derives its digits.
 */
export const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);

export const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Megatonnes, at one decimal below 10 and whole numbers above. */
export const megatonnes = (v: number): number =>
  v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;

/**
 * Piecewise-linear interpolation over a table of `[a, b]` anchors, clamped at both
 * ends. `from`/`to` pick which column is the input and which the output, so one
 * table serves both directions.
 */
export const interpolate = (
  anchors: readonly (readonly [number, number])[],
  value: number,
  from: 0 | 1,
  to: 0 | 1,
): number => {
  const first = anchors[0];
  const last = anchors.at(-1);
  if (!first || !last) return 0;
  if (value <= first[from]) return first[to];
  if (value >= last[from]) return last[to];

  for (let i = 1; i < anchors.length; i++) {
    const hi = anchors[i];
    const lo = anchors[i - 1];
    if (!hi || !lo) continue;
    if (value <= hi[from]) {
      const t = (value - lo[from]) / (hi[from] - lo[from]);
      return lo[to] + t * (hi[to] - lo[to]);
    }
  }
  return last[to];
};

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
