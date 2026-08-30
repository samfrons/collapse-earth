/**
 * The twin's controls, and the two bits nobody has read.
 *
 * `unknown` and `unsurveyed` are the honest defaults. The reader lands on two futures
 * and the gap between them, because that gap *is* the finding: the inventory cannot
 * tell you whether a mine is flooded, and nobody has surveyed its seal either.
 */

import { amm, mine, type Mine } from '@/data';
import { createStore } from '@/lib/store';
import { P } from './params';
import { mineTwin, type Twin } from './twin-model';

export type FloodStatus = 'dry' | 'unknown' | 'flooded';
export type SealQuality = 'sealed' | 'unsurveyed' | 'leaky';

export interface TwinState {
  readonly mineId: string;
  readonly status: FloodStatus;
  readonly seal: SealQuality;
  /** Playhead position, in calendar years. `null` until the specimen is first drawn. */
  readonly year: number | null;
  /** Unit start year — every year of delay burns the best years. */
  readonly startYear: number;
  /** Carbon price, €/t. Upside, never the base case. */
  readonly price: number;
}

export const twin = createStore<TwinState>({
  mineId: 'auguste-victoria',
  status: 'unknown',
  seal: 'unsurveyed',
  year: null,
  startYear: 2026,
  price: 0,
});

export const currentMine = (): Mine => mine(twin.get().mineId);

export const currentTwin = (): Twin => mineTwin(currentMine());

/** The playhead year, clamped into the specimen's own span. */
export const playheadYear = (t: Twin = currentTwin()): number => {
  const { year } = twin.get();
  const horizon = P('horizon');
  if (year === null || year < t.closed || year > horizon) {
    return Math.min(Math.max(new Date().getFullYear(), t.closed), horizon);
  }
  return year;
};

/**
 * The seal the model plans on. `unsurveyed` plans on the leaky path — the
 * conservative read, stated in the drawer rather than assumed silently.
 */
export const plannedSeal = (): 'sealed' | 'leaky' =>
  twin.get().seal === 'sealed' ? 'sealed' : 'leaky';

export const specimens = amm.mines;

export const shortMineName = (m: Mine): string =>
  m.name.replace(/^KWK /, '').replace(/ (Coal Mine|Colliery|Mine)$/, '');
