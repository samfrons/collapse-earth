/**
 * The public face of the data layer.
 *
 * Pages import from here and nowhere else. Two things happen at this boundary
 * that cannot happen inside `atlas.ts` itself:
 *
 *  1. Ids become types. `KnownSourceId`, `InterventionId` and friends are derived
 *     from the literal data, so a citation to a source that does not exist is a
 *     compile error at the call site rather than a blank in the rendered page.
 *  2. Lookups become total. `source()` and `intervention()` throw on a miss
 *     instead of returning `undefined` for a renderer to quietly swallow — a
 *     missing citation should stop a build, not ship as an empty parenthesis.
 */

import { atlas } from './atlas';
import type {
  AbandonedMineMethane,
  CompanyAtlas,
  Hypothesis,
  Intervention,
  Meta,
  Mine,
  Source,
  TippingSystem,
  Warming,
} from './schema';

export { atlas };
export * from './schema';
export * from './selectors';
export * from './vocabulary';

/* -------------------------------------------------------------------------- */
/* Ids, derived from the data rather than declared beside it                   */
/* -------------------------------------------------------------------------- */

/** Every citation id that actually exists. Autocompletes; rejects typos. */
export type KnownSourceId = (typeof atlas)['meta']['sources'][number]['id'];

export type InterventionId = (typeof atlas)['interventions'][number]['id'];

export type TippingSystemId = (typeof atlas)['tippingSystems'][number]['id'];

export type HypothesisId = (typeof atlas)['hypotheses'][number]['id'];

export type MediaSlug = keyof (typeof atlas)['media'];

/* -------------------------------------------------------------------------- */
/* Total lookups                                                              */
/* -------------------------------------------------------------------------- */

const missing = (kind: string, id: string): never => {
  throw new Error(
    `Unknown ${kind}: "${id}". Every reference must resolve to a record in the atlas.`,
  );
};

/**
 * A known id, or any string.
 *
 * The union half gives editors autocomplete over the ids that actually exist and
 * flags a typo'd literal; the `string & {}` half keeps ids that were *read from the
 * data* — where the type has been widened to `string` — assignable without a cast.
 * Anything that slips through is caught at runtime by the throwing lookups below.
 */
type Id<K extends string> = K | (string & {});

const sourceIndex = new Map<string, Source>(atlas.meta.sources.map((s) => [s.id, s]));

/** Resolve a citation id to its full entry. Throws rather than rendering a blank. */
export const source = (id: Id<KnownSourceId>): Source =>
  sourceIndex.get(id) ?? missing('source', id);

/** Resolve several citation ids at once, preserving order. */
export const sources = (ids: readonly string[]): readonly Source[] =>
  ids.map((id) => sourceIndex.get(id) ?? missing('source', id));

const interventionIndex = new Map<string, Intervention>(
  atlas.interventions.map((iv) => [iv.id, iv]),
);

export const intervention = (id: Id<InterventionId>): Intervention =>
  interventionIndex.get(id) ?? missing('intervention', id);

const tippingIndex = new Map<string, TippingSystem>(atlas.tippingSystems.map((s) => [s.id, s]));

export const tippingSystem = (id: Id<TippingSystemId>): TippingSystem =>
  tippingIndex.get(id) ?? missing('tipping system', id);

const mineIndex = new Map<string, Mine>(atlas.amm.mines.map((m) => [m.id, m]));

export const mine = (id: string): Mine => mineIndex.get(id) ?? missing('mine', id);

/* -------------------------------------------------------------------------- */
/* Media, addressed by meaning                                                */
/* -------------------------------------------------------------------------- */

/**
 * Clips are chosen by tag, never by hardcoded slug, so replacing footage is a
 * one-line edit in the atlas rather than a search across every page.
 */
export const clipsTagged = (tag: string): readonly MediaSlug[] =>
  (Object.keys(atlas.media) as MediaSlug[]).filter((slug) =>
    (atlas.media[slug].tags as readonly string[]).includes(tag),
  );

export const clip = (slug: MediaSlug) => atlas.media[slug];

/* -------------------------------------------------------------------------- */
/* The reading view of the atlas                                              */
/* -------------------------------------------------------------------------- */

/**
 * Pages read the atlas through these bindings, which are annotated with the
 * *interface* types rather than the literal types `as const` produced.
 *
 * The literals are what make `KnownSourceId` and friends above possible, but they
 * are the wrong thing to render from: a `readonly [A, B, C, …]` of ten structurally
 * different object types means `interventions.map(iv => iv.policyRisk)` is an error
 * on every member that happens not to carry the optional field. Widening here gives
 * every consumer one uniform record type, while the derived id unions above keep the
 * precision where precision is worth having.
 */
export const meta: Meta = atlas.meta;
export const warming: Warming = atlas.warming;
export const tippingSystems: readonly TippingSystem[] = atlas.tippingSystems;
export const interventions: readonly Intervention[] = atlas.interventions;
export const companies: CompanyAtlas = atlas.companies;
export const hypotheses: readonly Hypothesis[] = atlas.hypotheses;
export const amm: AbandonedMineMethane = atlas.amm;
