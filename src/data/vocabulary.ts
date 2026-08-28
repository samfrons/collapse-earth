/**
 * Plain-English glosses for the ledger's controlled vocabularies.
 *
 * These live beside the data rather than inside a page because they are part of
 * what the tags *mean*. A page that renders `stream: "contract"` as "funding" has
 * misreported the ledger; rendering it through this table cannot.
 */

import type { FundingBadge, FundingStream } from './schema';

export const STREAM_WORD: Record<FundingStream, string> = {
  capital: 'equity or debt raised',
  target: 'capital being sought — not closed',
  contract: 'offtake or purchase commitment — customer money, not capital',
  prize: 'prize award',
  grant: 'grant, public or philanthropic',
  aggregate: 'sector-level roll-up — already contains company rows',
};

/** The short form, for a chip with no room for the clause. */
export const streamNoun = (stream: FundingStream): string =>
  STREAM_WORD[stream].split(' —')[0] ?? stream;

export const BADGE_WORD: Record<FundingBadge, string> = {
  announced: 'announced',
  delivered: 'delivered',
  verified: 'verified',
  'deployed-grants': 'grants deployed',
};

/** Streams that are reported alongside capital raised, never added to it. */
export const NON_CAPITAL_STREAMS = [
  'contract',
  'prize',
  'grant',
  'target',
  'aggregate',
] as const satisfies readonly FundingStream[];
