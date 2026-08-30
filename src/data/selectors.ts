/**
 * Derived readings of the atlas.
 *
 * These exist because the most dangerous line of code this project could contain
 * is `funding.reduce((n, f) => n + f.amount, 0)`. It compiles, it runs, and it
 * produces a number that is wrong in a way no reader can detect — because the
 * ledger deliberately holds several kinds of money that must never be added
 * together, plus roll-ups that already contain their own constituent rows.
 *
 * So the arithmetic lives here, once, named after what it means, and covered by
 * tests. Pages call `totalCapitalRaised(iv)`; they do not touch `.amount`.
 */

import type { FundingEntry, FundingStream, Intervention } from './schema';

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The one rule that governs every sum below: a row inside another row's
 * cumulative total is already counted by that total, so counting it again
 * double-counts. Rows with no disclosed amount contribute nothing — a blank is
 * not a zero, and is reported separately by {@link undisclosedCapitalRows}.
 */
const countable = (stream: FundingStream) => (f: FundingEntry) =>
  f.stream === stream && f.withinCumulative === undefined;

const sumAmounts = (rows: readonly FundingEntry[]): number =>
  rows.reduce((total, f) => total + (f.amount ?? 0), 0);

/**
 * Capital actually raised: equity and debt, closed, and not already inside
 * another row's cumulative total.
 *
 * Explicitly excluded, because they are different kinds of money: `target`
 * (being sought, not closed), `contract` (customer revenue), `prize`, `grant`,
 * and `aggregate` (sector roll-ups that already contain the company rows).
 */
export const totalCapitalRaised = (iv: Intervention): number =>
  sumAmounts(iv.funding.filter(countable('capital')));

/**
 * How many capital rows exist whose amount was never disclosed. Rendering a
 * total without this count implies the total is complete when it is not.
 */
export const undisclosedCapitalRows = (iv: Intervention): number =>
  iv.funding.filter(countable('capital')).filter((f) => f.amount === null).length;

/** The same arithmetic for any one stream, reported on its own and never merged. */
export const totalForStream = (iv: Intervention, stream: FundingStream): number =>
  sumAmounts(iv.funding.filter(countable(stream)));

/** Streams present on an intervention, in ledger order, with their row counts. */
export const streamsPresent = (
  iv: Intervention,
): readonly { readonly stream: FundingStream; readonly rows: number }[] => {
  const order: readonly FundingStream[] = [
    'capital',
    'target',
    'contract',
    'prize',
    'grant',
    'aggregate',
  ];
  return order
    .map((stream) => ({ stream, rows: iv.funding.filter((f) => f.stream === stream).length }))
    .filter(({ rows }) => rows > 0);
};

/**
 * True when the disclosed total is a floor rather than a figure — because some
 * row hedged, or because a capital row disclosed no amount at all. The caller
 * renders "≥" rather than an unqualified number.
 */
export const capitalIsHedged = (iv: Intervention): boolean =>
  undisclosedCapitalRows(iv) > 0 ||
  iv.funding.filter(countable('capital')).some((f) => 'qualifier' in f && Boolean(f.qualifier));

/**
 * Median disclosed capital across all interventions.
 *
 * Used as the capital ceiling of the assay chart's "under-funded, high-leverage"
 * region, so that the region follows the data rather than a dollar figure someone
 * chose. Interventions with nothing disclosed are excluded: a blank must not drag
 * the median down, since it is an absence of information, not an absence of money.
 */
export const medianDisclosedCapital = (interventions: readonly Intervention[]): number => {
  const disclosed = interventions
    .map(totalCapitalRaised)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (disclosed.length === 0) return 0;
  const mid = Math.floor(disclosed.length / 2);
  if (disclosed.length % 2 === 1) return disclosed[mid] ?? 0;
  return ((disclosed[mid - 1] ?? 0) + (disclosed[mid] ?? 0)) / 2;
};

/* -------------------------------------------------------------------------- */
/* Opportunity                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The single flagged set on the site. Both the opportunity board and the assay
 * chart's red markers derive from this one predicate, so the page can never show
 * two different answers to "which of these is under-funded".
 */
export const OPPORTUNITY_THRESHOLD = 4;

export const isOpportunity = (iv: Intervention): boolean => iv.gapScore >= OPPORTUNITY_THRESHOLD;

/** Interventions flagged as under-funded relative to their leverage, ledger order preserved. */
export const opportunities = (interventions: readonly Intervention[]): readonly Intervention[] =>
  interventions.filter(isOpportunity);
