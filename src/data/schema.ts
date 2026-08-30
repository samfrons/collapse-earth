/**
 * The shape of the atlas — and, more usefully, the shape of its editorial rules.
 *
 * Every rule this project cares about is written here as a type rather than as a
 * comment, so that breaking one is a compile error rather than a reading error:
 *
 *   - No figure exists without `sourceIds`. There is no numeric record in this
 *     file whose type permits an empty provenance.
 *   - A threshold is a range with a confidence rating, never a scalar. You cannot
 *     construct a tipping point that claims to know its own trigger exactly.
 *   - Money is tagged by `stream`, and the tags are not interchangeable. Summing
 *     across them is prevented at the API surface (see `selectors.ts`), not by
 *     asking the caller to remember.
 *   - Claiming an *absence* of funding requires the words the source used:
 *     `AssertedAbsence` makes `sourceQuote` mandatory. A source being silent
 *     about a company is not a source reporting that the company has nothing.
 *
 * Authority for threshold values and confidence ratings: Armstrong McKay et al.,
 * *Science* (2022), Table 1.
 */

/** ISO-8601 calendar date, `YYYY-MM-DD`. Narrow enough to catch a typo'd year. */
export type IsoDate = `${number}-${number}-${number}`;

/**
 * A date carried at exactly the precision its source gave it.
 *
 * A source that says "H1 2025" has not said "2025-01-01", and flattening the two
 * into one calendar date invents precision. So the union admits `2026-07-30`,
 * `2026-07`, `2025-H1`, `2025-Q2`, `2024-2025` and `2024` — and nothing else,
 * which is still tight enough to reject `July 2026` or `2026/07`.
 */
export type DateStamp =
  IsoDate | `${number}-${number}` | `${number}-H${number}` | `${number}-Q${number}` | `${number}`;

/**
 * A key into {@link Atlas.meta.sources}.
 *
 * Structurally this is a string, because the atlas literal is where the ids are
 * *defined* and a nominal brand there would be circular. The exact union of ids
 * that exist is derived from the data in `index.ts` as `KnownSourceId`, and that
 * is the type every call site sees. Referential integrity — every id used
 * resolving to a real entry — is asserted at test time.
 */
export type SourceId = string;

/** One or more citations. The tuple type forbids `[]` — silence is not a source. */
export type Citations = readonly [SourceId, ...SourceId[]];

/* -------------------------------------------------------------------------- */
/* Provenance                                                                 */
/* -------------------------------------------------------------------------- */

export interface Source {
  readonly id: SourceId;
  readonly label: string;
  /**
   * `null` means the citation is real and dated but we have no link we are
   * confident in. That is strictly better than inventing a plausible URL.
   */
  readonly url: string | null;
  readonly date: DateStamp;
  /** Still worth confirming before print. Surfaced in the UI, not hidden. */
  readonly verify?: true;
}

export interface Meta {
  readonly updated: IsoDate;
  readonly disclaimer: string;
  readonly sources: readonly Source[];
}

/* -------------------------------------------------------------------------- */
/* Warming                                                                    */
/* -------------------------------------------------------------------------- */

export interface Warming {
  /** Degrees Celsius above pre-industrial. */
  readonly current: number;
  readonly currentNote: string;
  readonly unit: string;
  readonly range: Range;
  readonly dialRange: Range & { readonly step: number };
  readonly sourceIds: Citations;
}

export interface Range {
  readonly min: number;
  readonly max: number;
}

/* -------------------------------------------------------------------------- */
/* Tipping systems                                                            */
/* -------------------------------------------------------------------------- */

export type TippingCategory =
  'cryosphere' | 'ocean-circulation' | 'biosphere' | 'carbon-feedback' | 'monsoon';

/** Armstrong McKay et al. distinguish globally-consequential cores from regional impacts. */
export type TippingTier = 'global-core' | 'regional';

export type Confidence = 'low' | 'medium' | 'high';

/**
 * A threshold is a band, not a date and not a number. Making `central` merely one
 * of three required fields is the point: no consumer can read a tipping point's
 * trigger without also having its uncertainty in hand.
 */
export interface Threshold {
  readonly min: number;
  readonly central: number;
  readonly max: number;
  readonly confidence: Confidence;
}

export interface TippingSystem {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly category: TippingCategory;
  readonly tier: TippingTier;
  readonly threshold: Threshold;
  readonly timescale: {
    /** Human-readable span between crossing the threshold and the impact landing. */
    readonly triggerToImpact: string;
    readonly note: string;
  };
  readonly lat: number;
  readonly lon: number;
  /** Plain-language statement of the mechanism, for readers who are not scientists. */
  readonly plain: string;
  readonly impacts: string;
  /** What has actually been measured, as distinct from what is projected. */
  readonly observed: string;
  readonly signal: string;
  readonly reversibility: string;
  /** Ids of other systems this one can trigger. */
  readonly cascades: readonly string[];
  /** Set where the literature genuinely disagrees; `contestedNote` then explains how. */
  readonly contested?: true;
  readonly contestedNote?: string;
  /** Present where an intervention can act on this system directly, not only via
   *  warming. The string says what that handle is; its absence says there is none. */
  readonly directHandle?: string;
  readonly sourceIds: Citations;
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The kinds of money in the ledger. These are **not** additive with each other,
 * and the whole reason the tag exists is that a naive `reduce` over `amount`
 * produces a number that is wrong in a way no reader can detect.
 *
 * | stream      | what it is                                              |
 * | ----------- | ------------------------------------------------------- |
 * | `capital`   | equity or debt actually raised by a company              |
 * | `target`    | capital being *sought*, not closed — never "raised"      |
 * | `contract`  | offtake / purchase commitments — customer revenue        |
 * | `prize`     | prize awards                                            |
 * | `grant`     | public or philanthropic grants, given or deployed        |
 * | `aggregate` | sector-level roll-ups that already contain company rows  |
 *
 * @see totalCapitalRaised in `selectors.ts` — the only supported way to sum.
 */
export type FundingStream = 'capital' | 'target' | 'contract' | 'prize' | 'grant' | 'aggregate';

/**
 * How firm the money is. `announced` is never rendered as `delivered`; the two
 * words describe different states of the world and the distinction is the single
 * most-abused number in climate finance reporting.
 */
export type FundingBadge = 'announced' | 'delivered' | 'verified' | 'deployed-grants';

/** A hedge the source itself used. Preserved verbatim rather than rounded away. */
export type Qualifier = 'at-least' | 'approximately';

interface FundingCommon {
  readonly stream: FundingStream;
  readonly kind: string;
  /** The company, fund or programme the money belongs to. */
  readonly holder: string;
  readonly badge: FundingBadge;
  readonly asOf: DateStamp;
  readonly note?: string;
  readonly sourceQuote?: string;
  /** This entry is a total that supersedes its constituent rows. */
  readonly cumulative?: true;
  /** This entry sits *inside* the named holder's cumulative row — exclude when summing. */
  readonly withinCumulative?: string;
}

/** An entry reporting money that exists. */
export interface FundingAmount extends FundingCommon {
  readonly amount: number;
  readonly qualifier?: Qualifier;
  readonly assertedAbsence?: never;
}

/**
 * Money that exists but whose size was never published. Distinct from
 * {@link AssertedAbsence}: "no consolidated total published" and "this company
 * has raised nothing" are different facts about the world, and the ledger keeps
 * them apart. `kind` carries the wording.
 */
export interface UndisclosedFunding extends FundingCommon {
  readonly amount: null;
  readonly assertedAbsence?: never;
}

/**
 * An entry reporting that a source *stated* there is no money — which is a claim
 * with an author, not an inference from silence. The type therefore demands the
 * words the source actually used.
 */
export interface AssertedAbsence extends FundingCommon {
  readonly amount: null;
  readonly assertedAbsence: true;
  readonly sourceQuote: string;
}

export type FundingEntry = FundingAmount | UndisclosedFunding | AssertedAbsence;

/* -------------------------------------------------------------------------- */
/* Interventions                                                              */
/* -------------------------------------------------------------------------- */

/** Section marker used for ordering and for the dossier's running head. */
export type Section = `§${number}`;

/** A link out to a long-form field study for this intervention. */
export interface Fieldwork {
  readonly href: string;
  readonly label: string;
  readonly short?: string;
}

export interface Intervention {
  readonly id: string;
  readonly name: string;
  readonly section: Section;
  /** Prose argument for why acting here moves more than acting elsewhere. */
  readonly leverage: string;
  /** Honest TRL, spelled out — including where one category spans a wide spread. */
  readonly maturity: string;
  /**
   * Editorial leverage, as an **ordinal 1–5** — the assay chart's vertical. Deliberately
   * not a scale: band 5 is higher than band 4, but not by any stated amount, and the
   * interval between bands is undefined.
   */
  readonly leverageBand: number;
  /**
   * Technology readiness, **1–9**, read off the `maturity` statement rather than
   * assessed. Drives the assay marker's size, in three steps.
   */
  readonly trlBand: number;
  readonly funding: readonly FundingEntry[];
  readonly delivered: string;
  /** The gap between what was announced and what actually landed, where one is
   *  documented. Absent means no such gap has been reported — not that none exists. */
  readonly announcedNotDelivered?: string;
  readonly caveat: string;
  /** 0–1. Higher means more leverage per dollar currently committed. */
  readonly gapScore: number;
  readonly fieldwork?: Fieldwork;
  readonly policyRisk?: string;
  /** Set where two credible sources disagree and we decline to pick a winner. */
  readonly unresolvedConflict?: string;
  readonly investable?: boolean;
  readonly framing?: string;
  readonly sourceIds: Citations;
}

/* -------------------------------------------------------------------------- */
/* Companies                                                                  */
/* -------------------------------------------------------------------------- */

/** A single sourced, dated claim about a company — the only claim we make. */
export interface KeyFact {
  readonly text: string;
  readonly badge: FundingBadge;
  readonly asOf: DateStamp;
  readonly assertedAbsence?: true;
  readonly sourceQuote?: string;
  readonly sourceIds: Citations;
}

export interface Company {
  readonly name: string;
  readonly category: string;
  readonly country: string;
  readonly oneLiner: string;
  readonly keyFact: KeyFact;
  readonly investable?: boolean;
  readonly framing?: string;
}

export type CompanyTier = 'tier1' | 'tier2' | 'tier3';

export type CompanyAtlas = {
  readonly [T in CompanyTier as `${T}Label`]: string;
} & Readonly<Record<CompanyTier, readonly Company[]>>;

/* -------------------------------------------------------------------------- */
/* Hypotheses                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A hypothesis without kill criteria is a pitch. `killCriteria` and `validation`
 * are required for exactly that reason.
 */
export interface Hypothesis {
  readonly id: string;
  readonly claim: string;
  readonly mechanism: string;
  readonly whyNow: string;
  /** What observation would falsify this. Required. */
  readonly killCriteria: string;
  /** The cheapest experiment that would produce that observation. */
  readonly validation: string;
  readonly maturity: string;
  readonly nearestActors: readonly string[];
  readonly relatedInterventions: readonly string[];
  readonly fieldwork?: Fieldwork;
  readonly investable?: boolean;
  readonly framing?: string;
  readonly sourceIds: Citations;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

export type MediaTag =
  'ice' | 'satellite' | 'abyss' | 'plankton' | 'algae' | 'macro-plant' | 'fungi' | 'strata';

export interface MediaClip {
  readonly mp4: string;
  readonly poster: string;
  readonly credit: string;
  readonly license: string;
  /** Pages address clips by tag, never by hardcoded slug, so swaps stay local. */
  readonly tags: readonly MediaTag[];
  readonly bytes: number;
  readonly verifiedAt: DateStamp;
}

export type MediaLibrary = Readonly<Record<string, MediaClip>>;

/* -------------------------------------------------------------------------- */
/* Abandoned-mine methane (the field study behind "The Seam")                 */
/* -------------------------------------------------------------------------- */

/** A quantity given as a band, with a flag for whether we modelled it or read it. */
export interface Band {
  readonly min: number;
  readonly central: number;
  readonly max: number;
}

export interface RegulationMilestone {
  readonly date: IsoDate;
  readonly label: string;
  /** Article of the EU Methane Regulation this obligation comes from. */
  readonly art: string;
  readonly what: string;
  /** Marks the milestone the page counts down to. */
  readonly clock?: boolean;
}

export interface MineScenario {
  readonly id: string;
  readonly label: string;
  /** Million cubic metres of methane per year. */
  readonly mcm: number;
  /** Kilotonnes of methane per year; `null` where the source gives only volume. */
  readonly kt: number | null;
  readonly ktQualifier?: Qualifier;
}

export interface MineCountry {
  readonly name: string;
  readonly mcm: number;
  readonly qualifier?: Qualifier;
  readonly note?: string;
}

export interface Mine {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly country: string;
  /** Year operations ceased; `null` where no closure year is on record. */
  readonly closed: number | null;
  readonly mcm: number;
  /**
   * Whether the workings are dry or flooded. `unknown` dominates the inventory,
   * and since a flooded mine emits far less, it is the largest single error bar
   * in the whole estimate — so it is a value, never a default.
   */
  readonly status: 'unknown' | 'dry' | 'flooded';
  readonly note: string;
  /**
   * Where the source publishes both cases, the pair is kept rather than collapsed
   * to one figure, because the spread between them *is* the finding.
   */
  readonly floodedDelta?: {
    readonly dry: number;
    readonly flooded: number;
    readonly note: string;
  };
  readonly sourceIds: Citations;
}

export interface FermiEstimate {
  readonly id: string;
  readonly label: string;
  readonly ktCh4: Band;
  /** `true` marks an editorial order-of-magnitude estimate, not a measurement. */
  readonly modelled: boolean;
  readonly basis: string;
  readonly sourceIds: Citations;
}

export interface VentureLayer {
  readonly id: string;
  readonly label: string;
  readonly what: string;
}

export interface RevenueLine {
  readonly label: string;
  readonly kind: string;
  /** Marks a line that carries a risk the reader should weigh before the upside. */
  readonly warn?: boolean;
}

export interface KillCriterion {
  readonly id: `K${number}`;
  readonly clause: string;
}

/** Gas quality bands, which decide the route a site's methane can take. */
export interface ProductState {
  readonly id: string;
  readonly label: string;
  readonly band: string;
  readonly route: string;
  readonly note: string;
}

export interface AbandonedMineMethane {
  readonly sourceId: SourceId;
  readonly conversion: {
    /** Kilograms of methane per cubic metre at the stated basis. */
    readonly kgPerM3: number;
    readonly basis: string;
    readonly sourceIds: Citations;
  };
  readonly regulation: {
    readonly id: string;
    readonly responsibility: {
      readonly abandoned: string;
      readonly closed: string;
      readonly note: string;
    };
    readonly milestones: readonly RegulationMilestone[];
    readonly recital128: { readonly note: string; readonly sourceIds: Citations };
    readonly sourceIds: Citations;
  };
  readonly inventory: {
    readonly window: string;
    readonly counts: {
      readonly total: number;
      readonly underground: number;
      readonly surface: number;
    };
    readonly central: { readonly mcm: number; readonly kt: number; readonly basis: string };
    readonly scenarios: readonly MineScenario[];
    readonly countries: readonly MineCountry[];
    readonly topThreeShare: string;
    readonly status: {
      readonly unknown: number;
      readonly dry: number;
      readonly flooded: number;
      readonly of: number;
      readonly note: string;
    };
    readonly sixMines: { readonly mcm: number; readonly kt: number; readonly note: string };
    /** Where two inventories disagree, we say so rather than averaging them. */
    readonly inventoryConflict: { readonly note: string; readonly sourceIds: Citations };
    readonly sourceIds: Citations;
  };
  readonly mines: readonly Mine[];
  readonly gwp: {
    readonly gwp20: number;
    readonly gwp100: number;
    readonly basis: string;
    readonly sourceIds: Citations;
  };
  readonly fermi: readonly FermiEstimate[];
  /** Direct air capture, for scale contrast: what that sector's capital has bought. */
  readonly dacContrast: {
    readonly sectorCapitalUsd: number;
    readonly sectorCapitalQualifier: Qualifier;
    readonly sectorCapitalWhat: string;
    readonly deliveredT: number;
    readonly deliveredQualifier: Qualifier;
    readonly deliveredWhat: string;
    readonly costPerT: string;
    readonly sourceIds: Citations;
  };
  readonly venture: {
    readonly framing: string;
    readonly name: string;
    readonly namesConsidered: readonly string[];
    readonly layers: readonly VentureLayer[];
    readonly revenue: readonly RevenueLine[];
    readonly killCriteria: readonly KillCriterion[];
    readonly productStates: readonly ProductState[];
  };
}

/* -------------------------------------------------------------------------- */
/* The atlas                                                                  */
/* -------------------------------------------------------------------------- */

export interface Atlas {
  readonly meta: Meta;
  readonly warming: Warming;
  readonly tippingSystems: readonly TippingSystem[];
  readonly interventions: readonly Intervention[];
  readonly companies: CompanyAtlas;
  readonly hypotheses: readonly Hypothesis[];
  readonly media: MediaLibrary;
  readonly amm: AbandonedMineMethane;
}
