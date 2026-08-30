/**
 * The Coward geometry exists in two places: this page's sourced parameter block, and
 * the physics module's own `COWARD_1952` constants, which its unit tests are written
 * against.
 *
 * Two copies of a number drift. So they are asserted equal at load, rather than
 * discovering later that the tested model and the rendered model disagree. That
 * assertion is the citation gate for sheet M-004 — not either constant on its own.
 */

import { COWARD_1952, type FlammabilityLimits } from '@/bio';
import { P } from './params';

export const cowardLimits = (): FlammabilityLimits => ({
  lflInAir: P('cow_lfl'),
  uflInAir: P('cow_ufl'),
  noseO2: P('cow_loc'),
  noseCh4: P('cow_nose'),
  airO2: P('cow_airo2'),
});

export const assertCowardAgreement = (): void => {
  const mine = cowardLimits();
  for (const key of Object.keys(COWARD_1952) as (keyof FlammabilityLimits)[]) {
    if (mine[key] !== COWARD_1952[key]) {
      throw new Error(
        `Coward constant drift: the parameter block has ${key} = ${mine[key]}, ` +
          `but the physics module has ${COWARD_1952[key]}.`,
      );
    }
  }
};
