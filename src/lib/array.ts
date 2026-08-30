/**
 * Small array helpers that keep `noUncheckedIndexedAccess` honest.
 *
 * The compiler is right that `xs[xs.length - 1]` may be undefined for a plain array.
 * Where a list is non-empty *by construction*, saying so in the type is better than
 * asserting it away at every call site.
 */

/** An array the type system knows has at least one element. */
export type NonEmpty<T> = readonly [T, ...T[]];

/** Last element of a non-empty list. Total, and free of assertions. */
export const last = <T>(xs: NonEmpty<T>): T => xs.at(-1) ?? xs[0];
