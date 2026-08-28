/**
 * The core — an illustrative depth/age calibration, and the page's descent through it.
 *
 * Patterned on a deep Greenland ice core roughly 3,053 m to bedrock, where annual
 * layers thin under load so age climbs steeply with depth. **These anchors are
 * illustrative.** They set the reading scale for the page's descent. They are not
 * measured data, and no claim on this page rests on them.
 */

import { grouped, interpolate } from '@/lib/format';
import type { GaugeConfig, Lamination, Segment, Stratum } from '@/lib/depth-gauge';

/** Metres to bedrock. */
export const CORE_LENGTH = 3053;

/** Depth–age anchors: `[metres, years before present]`. */
export const CORE_ANCHORS = [
  [0, 0],
  [50, 180],
  [100, 400],
  [200, 800],
  [300, 1300],
  [450, 2050],
  [600, 2900],
  [750, 3650],
  [900, 4700],
  [1100, 6100],
  [1300, 7800],
  [1500, 9400],
  [1678, 11640],
  [1850, 14200],
  [2000, 17000],
  [2200, 25000],
  [2400, 38000],
  [2600, 52000],
  [2800, 76000],
  [3000, 105000],
  [3053, 120000],
] as const satisfies readonly (readonly [number, number])[];

export const depthToAge = (depth: number): number => interpolate(CORE_ANCHORS, depth, 0, 1);
export const ageToDepth = (age: number): number => interpolate(CORE_ANCHORS, age, 1, 0);

/**
 * Our own layer, read through the same anchors as everything else.
 *
 * The mid-twentieth-century boundary is ≈75 years before present, and near the
 * surface the calibration above runs ≈278 mm/yr — so it sits tens of metres down,
 * not in the top half-metre. Deriving it means the hero copy cannot contradict the
 * gauge, which draws from the same numbers.
 */
export const ANTHROPOCENE_AGE_YR = 75;
export const ANTHROPOCENE_DEPTH = ageToDepth(ANTHROPOCENE_AGE_YR);

/**
 * Each page segment occupies a depth interval. Scroll through a segment maps
 * linearly onto its interval, so the gauge always reads a real position in the core
 * even though sections differ wildly in screen height.
 */
export const SEGMENTS: readonly Segment[] = [
  { id: 'hero', d0: 0, d1: 40, tone: 'light', stratum: 'firn', name: 'firn · the recovered core' },
  { id: 'act1', d0: 40, d1: 900, tone: 'light', stratum: 'bone', name: 'bone · the thresholds' },
  {
    id: 'contactA',
    d0: 900,
    d1: 980,
    tone: 'light',
    stratum: 'contact',
    name: 'contact · bone to ochre',
  },
  {
    id: 'act2',
    d0: 980,
    d1: 1678,
    tone: 'light',
    stratum: 'ochre',
    name: 'ochre · the misallocation',
  },
  {
    id: 'contactB',
    d0: 1678,
    d1: 1760,
    tone: 'dark',
    stratum: 'contact',
    name: 'contact · pleistocene–holocene',
  },
  {
    id: 'act3',
    d0: 1760,
    d1: 2600,
    tone: 'dark',
    stratum: 'rust',
    name: 'rust · the hypothesis engine',
  },
  {
    id: 'contactC',
    d0: 2600,
    d1: 2700,
    tone: 'dark',
    stratum: 'contact',
    name: 'contact · rust to carbon',
  },
  {
    id: 'methods',
    d0: 2700,
    d1: 3053,
    tone: 'dark',
    stratum: 'carbon',
    name: 'carbon · methods & sources',
  },
];

/** Colours for the rail's scale drawing of the core, by depth interval. */
const STRATA: readonly Stratum[] = [
  { d0: 0, d1: 40, fill: '#F5F1E8' },
  { d0: 40, d1: 900, fill: '#EDE6DA' },
  { d0: 900, d1: 980, fill: '#D8B98C' },
  { d0: 980, d1: 1678, fill: '#C8973F' },
  { d0: 1678, d1: 1760, fill: '#AE6A2E' },
  { d0: 1760, d1: 2600, fill: '#9C4A22' },
  { d0: 2600, d1: 2700, fill: '#4A2413' },
  { d0: 2700, d1: 3053, fill: '#17130E' },
];

export const segmentById = (id: string): Segment | undefined => SEGMENTS.find((s) => s.id === id);

/**
 * Laminations are drawn at fixed **age** intervals, so on the rail they crowd
 * downward exactly as annual layers thin under load. That crowding is the single
 * most informative thing the gauge does, and it is a consequence of the
 * calibration rather than a drawing decision.
 */
const laminations = (): readonly Lamination[] => {
  const out: Lamination[] = [];
  for (let age = 250; age < 12000; age += 250) {
    out.push({ depth: ageToDepth(age), major: age % 1000 === 0 });
  }
  for (let age = 12500; age <= 120000; age += 2500) {
    out.push({ depth: ageToDepth(age), major: age % 10000 === 0 });
  }
  return out;
};

/** Every 250 m, labelled every 500 m. */
const ticks = (): readonly { depth: number; labelled: boolean }[] => {
  const out: { depth: number; labelled: boolean }[] = [];
  for (let d = 0; d <= CORE_LENGTH; d += 250) out.push({ depth: d, labelled: d % 500 === 0 });
  return out;
};

export const gaugeConfig: GaugeConfig = {
  length: CORE_LENGTH,
  segments: SEGMENTS,
  strata: STRATA,
  laminations,
  ticks,
  hairline: ANTHROPOCENE_DEPTH,
  readout: (depth) => ({
    depth: depth < 100 ? depth.toFixed(1) : grouped(depth),
    depthUnit: 'metres depth',
    age:
      depthToAge(depth) < 1000 ? String(Math.round(depthToAge(depth))) : grouped(depthToAge(depth)),
    ageUnit: 'years before present',
  }),
  foot: [
    `core ${grouped(CORE_LENGTH)} m`,
    `to ≈${grouped(depthToAge(CORE_LENGTH))} yr bp`,
    'scale illustrative',
  ],
};
