/**
 * The methanotrophic packed-bed model — the shipped subset.
 *
 * Reduced from the Mine-Methane Biofilter process model to the half that can be
 * held to this site's citation gate. Two bodies of physics with very different
 * epistemic standing, kept in separate modules so the difference stays visible:
 *
 *  - `coward.ts` — flammability geometry (Coward & Jones 1952). Nothing is fitted;
 *    the limits are published and the envelope follows from them. **Safe to render.**
 *  - `kinetics.ts` / `profile.ts` — dual-substrate Monod with a cardinal
 *    temperature model. **Uncalibrated.** Shape only: where in the bed oxidation
 *    concentrates and which factor binds. Never an absolute performance figure.
 *
 * Deliberately omitted, for the same reason: the Ergun pressure drop, the
 * evaporative energy balance, transient biomass growth, and the clogging relation.
 */

export * from './coward';
export * from './kinetics';
export * from './profile';
export * from './units';
