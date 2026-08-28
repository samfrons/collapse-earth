/**
 * The shaft — a schematic depth profile for the page's descent.
 *
 * **Illustrative.** This is a reading scale, not a survey of any mine. The rail and
 * every eyebrow say so. Unlike the ice core on the lead page, the gallery lines are
 * evenly spaced: rock does not compress its record, and that quiet visual difference
 * is also true.
 */

import { grouped } from '@/lib/format';
import type { GaugeConfig, Lamination, Segment, Stratum } from '@/lib/depth-gauge';

export const SHAFT_LENGTH = 1030;

export const SEGMENTS: readonly Segment[] = [
  { id: 'hero', d0: 0, d1: 15, stratum: 'surface', tone: 'light', name: 'surface works' },
  {
    id: 'act1',
    d0: 15,
    d1: 260,
    stratum: 'bone',
    tone: 'light',
    name: 'overburden · the inventory',
  },
  {
    id: 'contactA',
    d0: 260,
    d1: 300,
    stratum: 'contact',
    tone: 'light',
    name: 'contact · into the seam',
  },
  {
    id: 'act2',
    d0: 300,
    d1: 620,
    stratum: 'ochre',
    tone: 'light',
    name: 'the seam · one mine, modelled',
  },
  {
    id: 'contactB',
    d0: 620,
    d1: 660,
    stratum: 'contact',
    tone: 'dark',
    name: 'contact · to the face',
  },
  { id: 'act3', d0: 660, d1: 840, stratum: 'rust', tone: 'dark', name: 'working face · the unit' },
  {
    id: 'contactC',
    d0: 840,
    d1: 880,
    stratum: 'contact',
    tone: 'dark',
    name: 'contact · to depth',
  },
  {
    id: 'act4',
    d0: 880,
    d1: 1030,
    stratum: 'carbon',
    tone: 'dark',
    name: 'at depth · the company',
  },
];

const STRATA: readonly Stratum[] = [
  { d0: 0, d1: 15, fill: '#F5F1E8' },
  { d0: 15, d1: 260, fill: '#EDE6DA' },
  { d0: 260, d1: 300, fill: '#D8B98C' },
  { d0: 300, d1: 620, fill: '#C8973F' },
  { d0: 620, d1: 660, fill: '#AE6A2E' },
  { d0: 660, d1: 840, fill: '#9C4A22' },
  { d0: 840, d1: 880, fill: '#4A2413' },
  { d0: 880, d1: 1030, fill: '#17130E' },
];

export const segmentById = (id: string): Segment | undefined => SEGMENTS.find((s) => s.id === id);

/** Gallery lines every 25 m — uniform, unlike the ice core. */
const laminations = (): readonly Lamination[] => {
  const out: Lamination[] = [];
  for (let d = 25; d < SHAFT_LENGTH; d += 25) out.push({ depth: d, major: d % 100 === 0 });
  return out;
};

const ticks = (): readonly { depth: number; labelled: boolean }[] => {
  const out: { depth: number; labelled: boolean }[] = [];
  for (let d = 0; d <= SHAFT_LENGTH - 30; d += 100) out.push({ depth: d, labelled: d % 200 === 0 });
  return out;
};

export const gaugeConfig: GaugeConfig = {
  length: SHAFT_LENGTH,
  segments: SEGMENTS,
  strata: STRATA,
  laminations,
  ticks,
  readout: (depth) => ({
    depth: depth < 100 ? depth.toFixed(0) : grouped(depth),
    depthUnit: 'm below surface',
  }),
  foot: [`shaft ${grouped(SHAFT_LENGTH)} m`, 'schematic —', 'not a survey'],
};
