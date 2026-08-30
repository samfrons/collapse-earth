/**
 * The assay field — Act II's chart. Two axes: disclosed capital, and leverage.
 *
 * This is v1's funding-versus-impact scatter rebuilt, and it exists to fix the two
 * things v1's own source comments admitted were wrong with it:
 *
 *  - v1 plotted a *synthesised* "potential climate impact" number on a continuous
 *    numeric axis, which reads as a measurement. Here the vertical is
 *    `leverageBand`, an editorial **ordinal**, drawn as five numbered bands with no
 *    scale — you cannot measure a distance on it, which is the point.
 *  - v1's "neglected" flag was never sourced per technology. Here the flag is
 *    `gapScore >= OPPORTUNITY_THRESHOLD`, the same derivation the opportunity board
 *    uses, so there is one flagged set on this page and no hardcoded list anywhere.
 *
 * No value below is typed: capital, leverage, readiness, the flag threshold and the
 * shaded region's ceiling all come out of the atlas.
 */

import * as d3 from 'd3';

import {
  interventions,
  isOpportunity,
  medianDisclosedCapital,
  NON_CAPITAL_STREAMS,
  OPPORTUNITY_THRESHOLD,
  streamNoun,
  totalCapitalRaised,
  totalForStream,
  type Intervention,
} from '@/data';
import { last, type NonEmpty } from '@/lib/array';
import { byId, setHtml, setText } from '@/lib/dom';
import { capitalise, money } from '@/lib/format';
import { html, type SafeHtml } from '@/lib/html';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';
import { hedgedTotal, openIntervention } from './ledger';
import { pips } from './thresholds';

/**
 * The leverage scale's definition — a property of the scale, not of the data.
 * "High leverage" is the top two bands, written as a subtraction so that widening
 * the scale in the data layer moves the shaded region with it.
 */
const LEV_MAX = 5;
const LEV_HI = LEV_MAX - 1;

/**
 * Marker size steps. `trlBand` is 1–9 and the marker takes one of three radii: the
 * reader is asked to tell small from large, never to read a radius as a number. The
 * legend prints these same three ranges, derived from this table.
 */
const TRL_STEPS: NonEmpty<{ readonly hi: number; readonly r: number }> = [
  { hi: 3, r: 7 },
  { hi: 6, r: 10 },
  { hi: 9, r: 13 },
];

const trlRadius = (band: number): number =>
  TRL_STEPS.find((s) => band <= s.hi)?.r ?? last(TRL_STEPS).r;

const trlStepLabel = (): string => {
  let lo = 1;
  return TRL_STEPS.map((s) => {
    const label = `${lo}–${s.hi}`;
    lo = s.hi + 1;
    return label;
  }).join(' · ');
};

/**
 * A category with no disclosed figure can never be in the shaded region — it has no
 * position on the capital axis at all, which is what the gutter says.
 */
const inSweetSpot = (iv: Intervention, ceiling: number): boolean => {
  const capital = totalCapitalRaised(iv);
  return iv.leverageBand >= LEV_HI && capital > 0 && capital < ceiling;
};

/** The marker *is* the category's section sigil, so marker and ledger row match. */
const sectionGlyph = (iv: Intervention): string => /\d+/.exec(iv.section)?.[0] ?? '·';

/* -------------------------------------------------------------------------- */
/* Captions                                                                   */
/* -------------------------------------------------------------------------- */

const LABEL_BUDGET = 26;
const GUTTER_LABEL_BUDGET = 13;
const GENERIC_TAIL = /\s+(intervention|restoration|enhancement|conversion)s?$/i;

/**
 * Marker captions must be short, but an earlier version bought that by always
 * dropping everything after the "&" — which threw away load-bearing halves. Two
 * names carry their argument in both halves, so the join is attempted first and only
 * abandoned when it will not fit.
 */
const fieldLabel = (iv: Intervention): string => {
  const budget = totalCapitalRaised(iv) === 0 ? GUTTER_LABEL_BUDGET : LABEL_BUDGET;
  const full = iv.name.replace(/\s*\([^)]*\)/g, '').trim();
  const amp = full.indexOf('&');
  let head = (amp === -1 ? full : full.slice(0, amp)).trim();

  if (amp !== -1) {
    const joined = `${head} & ${full
      .slice(amp + 1)
      .trim()
      .replace(GENERIC_TAIL, '')}`;
    if (joined.length <= budget) return capitalise(joined);
  }
  if (head.length > budget) head = head.replace(/,\s*[^,]*$/, '');
  if (head.length > budget && head.includes('/')) head = head.split('/').pop()?.trim() ?? head;
  return capitalise(head);
};

type TextSel = d3.Selection<SVGTextElement, unknown, HTMLElement, unknown>;

/**
 * Real advance width at the rendered font. The captions are already in the document,
 * so they can be measured rather than estimated from character counts — and the
 * collision resolution below is only as good as this number.
 */
const textWidth = (sel: TextSel): number => {
  const node = sel.node();
  if (!node) return 0;
  try {
    return node.getComputedTextLength();
  } catch {
    return node.textContent.length * 5.6;
  }
};

interface Mark {
  readonly iv: Intervention;
  readonly hit: d3.Selection<SVGRectElement, unknown, HTMLElement, unknown>;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly nameT: TextSel;
  readonly valT: TextSel | null;
  readonly fwT: TextSel | null;
  readonly gapR: number;
  readonly gapL: number;
  readonly forceRight: boolean;
}

const FIELD = { marks: [] as Mark[], width: 900, plotL: 0, plotR: 0 };

/**
 * Two captions that merely fail to overlap still read as continuous text, so a
 * caption reserves this much clear space on each side and a neighbour inside that
 * margin counts as a collision.
 */
const CAP_CLEAR = 13;

interface Geom {
  readonly m: Mark;
  readonly forceRight: boolean;
  /** The side the caption would take if nothing else were in the band. */
  readonly pref: boolean;
  readonly w: number;
  readonly disc: Span;
}

interface Span {
  readonly x0: number;
  readonly x1: number;
  readonly owner: string;
  readonly right?: boolean;
}

const capSpan = (g: Geom, right: boolean): Span => {
  const x0 = right ? g.m.cx + g.m.gapR : g.m.cx - g.m.gapL - g.w;
  return { x0, x1: x0 + g.w, owner: g.m.iv.id, right };
};

/** Clear distance between two spans; negative means they collide. */
const spanGap = (a: Span, b: Span): number =>
  a.x0 > b.x1 ? a.x0 - b.x1 : b.x0 > a.x1 ? b.x0 - a.x1 : -1;

/**
 * Caption layout. Widths are **measured**, and the sides are **solved**, not chosen
 * greedily one marker at a time — which was the bug this replaced. Greedy placed
 * §1's long caption to the right because nothing was there yet, and §9 arriving
 * afterwards had nowhere left to go: the two rendered 1.5 units apart and read as
 * one run of text. Both fit comfortably once §1 goes left instead, but no marker can
 * see that on its own.
 *
 * So each band's side assignment is solved over the whole band. A band holds at most
 * a handful of markers, so every combination can simply be tried: keep the
 * collision-free ones, and among those prefer the fewest markers pushed off their
 * natural side, breaking ties on the largest minimum clearance.
 *
 * If a band cannot be solved at all — captions genuinely wider than the space — it
 * falls back to placing each caption on its natural side and stepping the later ones
 * down inside the band, which degrades legibly.
 *
 * **Idempotent.** Every position is recomputed from the marker geometry, so this can
 * be called again at any time (after a webfont swaps in, say) and simply produces a
 * better answer.
 */
export const placeFieldCaptions = (): void => {
  const flipX = FIELD.plotL + (FIELD.plotR - FIELD.plotL) * 0.55;

  const bands = new Map<number, Mark[]>();
  for (const m of FIELD.marks) {
    const list = bands.get(m.iv.leverageBand) ?? [];
    list.push(m);
    bands.set(m.iv.leverageBand, list);
  }

  for (const group of bands.values()) {
    const geom: Geom[] = group.map((m) => ({
      m,
      forceRight: m.forceRight,
      pref: m.forceRight ? true : m.cx < flipX,
      w: Math.max(textWidth(m.nameT), m.valT ? textWidth(m.valT) : 0, m.fwT ? textWidth(m.fwT) : 0),
      disc: { x0: m.cx - m.r - 3, x1: m.cx + m.r + 3, owner: m.iv.id },
    }));
    const discs = geom.map((g) => g.disc);

    // Solve the band: 2^n side assignments, n small by construction.
    let best: { spans: Span[]; score: number } | null = null;
    if (geom.length <= 8) {
      for (let mask = 0; mask < 1 << geom.length; mask++) {
        const spans: Span[] = [];
        let cost = 0;
        let minGap = Infinity;
        let ok = true;

        for (let i = 0; i < geom.length && ok; i++) {
          const g = geom[i];
          if (!g) break;
          const span = capSpan(g, (mask & (1 << i)) !== 0);
          if (!span.right && g.forceRight) {
            ok = false;
            break;
          }
          if (span.right !== g.pref) cost++;
          if (span.x0 < 4 || span.x1 > FIELD.width - 4) {
            ok = false;
            break;
          }
          for (const disc of discs) {
            if (disc.owner === span.owner) continue;
            const gap = spanGap(span, disc);
            if (gap < CAP_CLEAR) {
              ok = false;
              break;
            }
            minGap = Math.min(minGap, gap);
          }
          for (const other of spans) {
            if (!ok) break;
            const gap = spanGap(span, other);
            if (gap < CAP_CLEAR) {
              ok = false;
              break;
            }
            minGap = Math.min(minGap, gap);
          }
          if (ok) spans.push(span);
        }

        if (!ok) continue;
        const score = cost * 1000 - Math.min(minGap, 999);
        if (!best || score < best.score) best = { spans, score };
      }
    }

    geom.forEach((g, i) => {
      const solved = best?.spans[i];
      const right = solved ? solved.right === true : g.forceRight || g.pref;
      // Unsolvable band — natural side, and step later captions down.
      const dy = solved ? 0 : i * 15;

      const tx = right ? g.m.cx + g.m.gapR : g.m.cx - g.m.gapL;
      const cy = g.m.cy + dy;
      const anchor = right ? 'start' : 'end';
      // Three lines shift the block up half a line so the disc stays centred on the
      // caption stack rather than on its first line.
      const triple = g.m.valT !== null && g.m.fwT !== null;
      const y0 = cy - (triple ? 7 : 0);

      g.m.nameT
        .attr('x', tx)
        .attr('y', y0 + (g.m.valT ? -1 : 3.6))
        .attr('text-anchor', anchor);
      g.m.valT
        ?.attr('x', tx)
        .attr('y', y0 + 11)
        .attr('text-anchor', anchor);
      // Clears the DISC, not just the value line — at TRL-9 radii the disc reaches
      // further down than the captions do.
      g.m.fwT
        ?.attr('x', tx)
        .attr('y', Math.max(y0 + 28, g.m.cy + g.m.r + 14))
        .attr('text-anchor', anchor);

      // The hit area is the union of disc and caption, so the whole marker — not
      // just the 20px disc — is a click and hover target.
      const lx = right ? tx : tx - g.w;
      const rx = right ? tx + g.w : tx;
      const hx0 = Math.min(g.m.cx - g.m.r, lx) - 4;
      const hx1 = Math.max(g.m.cx + g.m.r, rx) + 4;
      const hy0 = Math.min(g.m.cy - g.m.r, y0 - 11) - 3;
      // Stop the button's hit area ABOVE the field-study link — two overlapping
      // targets with different destinations is a worse bug than a small one.
      const hy1 = triple
        ? Math.max(g.m.cy + g.m.r, y0 + 15)
        : Math.max(g.m.cy + g.m.r, cy + (g.m.valT ? 15 : 7)) + 3;

      g.m.hit
        .attr('x', hx0)
        .attr('y', hy0)
        .attr('width', hx1 - hx0)
        .attr('height', hy1 - hy0);
    });
  }
};

/* -------------------------------------------------------------------------- */
/* Accessible names and tooltips                                              */
/* -------------------------------------------------------------------------- */

/**
 * Spoken name for a marker. It carries the hedge, and it states the gutter case as
 * an absence of information rather than as a position.
 */
const fieldAria = (iv: Intervention): string =>
  `${iv.name} — ` +
  (totalCapitalRaised(iv)
    ? `capital raised ${hedgedTotal(iv)}`
    : 'no dollar figure for capital raised is disclosed in the sources, so this marker ' +
      'sits in the gutter and has no position on the capital axis') +
  `, leverage band ${iv.leverageBand} of ${LEV_MAX}` +
  ', an editorial assessment and not a measurement' +
  `, readiness approximately TRL ${iv.trlBand} of 9` +
  `, gap assessment ${iv.gapScore} of 5. Opens the full entry.`;

const fieldTip = (iv: Intervention): SafeHtml => {
  const capital = totalCapitalRaised(iv);
  const extra = NON_CAPITAL_STREAMS.map((s) => {
    const v = totalForStream(iv, s);
    return v ? `${streamNoun(s)} ${money(v) ?? ''}` : null;
  }).filter((s): s is string => s !== null);

  // The two editorial ordinals each carry the house hedge IN FULL and ADJACENT to the
  // number. This is the highest-traffic surface for both of them — a reader who hovers
  // a marker may never read the axis title or open the entry — so neither may appear
  // here as a bare figure. Readiness is not hedged the same way because it is read off
  // the maturity statement rather than assessed, and is printed with a ≈ of its own.
  return html`<b>${iv.section} · ${iv.name}</b>${
      capital ? `capital raised ${hedgedTotal(iv)}` : 'capital raised: no figure disclosed'
    }${extra.length > 0 ? html`<br />separately: ${extra.join(' · ')}` : ''}<br />leverage band
    ${iv.leverageBand}/${LEV_MAX} · editorial assessment, not a measurement<br />readiness ≈ TRL
    ${iv.trlBand}/9<br />gap ${pips(iv.gapScore, 5)} ${iv.gapScore}/5 · editorial assessment, not a
    measurement`;
};

/**
 * The standing takeaway.
 *
 * **The region is derived from the region, not from the flag.** An earlier version
 * computed the shaded corner's occupants as `flagged.filter(inSweetSpot)`, which
 * silently assumed the two sets coincide. They need not: raise any unflagged category
 * to a high leverage band with modest capital and it appears inside the rect on screen
 * while the sentence underneath omits it — so the callout would contradict the chart
 * it captions. Occupancy comes from every category, and an occupant that does **not**
 * carry the flag is named and marked as such rather than quietly folded in.
 */
const fieldCallout = (ceiling: number): string => {
  const flagged = interventions.filter(isOpportunity);
  const inRegion = interventions.filter((iv) => inSweetSpot(iv, ceiling));
  const unflaggedInRegion = inRegion.filter((iv) => !isOpportunity(iv));
  const noFigure = flagged.filter((iv) => totalCapitalRaised(iv) === 0);
  const rest = flagged.filter((iv) => !inRegion.includes(iv) && !noFigure.includes(iv));

  if (flagged.length === 0 && inRegion.length === 0) return '';

  let out =
    inRegion.length > 0
      ? `Shaded corner — high leverage, least capital: ${fieldNames(inRegion)}.`
      : 'Nothing sits in the shaded corner.';
  if (unflaggedInRegion.length > 0) {
    out +=
      ` ${fieldNames(unflaggedInRegion)}${unflaggedInRegion.length > 1 ? ' sit' : ' sits'}` +
      ' there without carrying the gap flag.';
  }
  if (noFigure.length > 0) {
    out +=
      ` ${fieldNames(noFigure)}${noFigure.length > 1 ? ' carry' : ' carries'}` +
      ' the flag with no capital figure disclosed, so ' +
      `${noFigure.length > 1 ? 'they sit' : 'it sits'} in the gutter.`;
  }
  if (rest.length > 0) {
    out += ` ${fieldNames(rest)}${rest.length > 1 ? ' carry' : ' carries'} it from further right.`;
  }
  return out;
};

const fieldNames = (list: readonly Intervention[]): string => {
  const names = list.map((iv) => `${iv.section} ${fieldLabel(iv)}`);
  if (names.length === 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
};

/* -------------------------------------------------------------------------- */
/* The chart                                                                  */
/* -------------------------------------------------------------------------- */

export const buildField = (): void => {
  const svg = d3.select('#fieldSvg');
  svg.selectAll('*').remove();

  const W = FIELD.width;
  const padTop = 34;
  const bandH = 62;
  const plotTop = padTop;
  const plotBot = plotTop + LEV_MAX * bandH;
  const axisY = plotBot + 8;
  const tickY = axisY + 18;
  const titleY = axisY + 40;
  const legendCY = axisY + 70;
  const H = legendCY + 24;

  // Left to right: band numbers · the hatched gutter · an annotation lane for the
  // gutter's captions · the axis break · the plotting area. The lane exists so a
  // gutter caption never sits on the hatch and never crosses the break into the plot,
  // where its position would read as a value on the capital axis.
  const bandNumX = 40;
  const gutterL = 56;
  const gutterR = 120;
  const gutterCX = (gutterL + gutterR) / 2;
  const laneL = gutterR + 14;
  const breakX = 212;
  const plotL = 228;
  const plotR = 812;

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('height', H)
    .attr(
      'aria-label',
      `Assay field: all ${interventions.length} intervention categories placed by ` +
        'disclosed capital raised on a horizontal log axis against an editorial leverage ' +
        'band on the vertical, with marker size standing for readiness. Categories whose ' +
        'sources disclose no capital figure sit in a hatched gutter and carry no ' +
        'horizontal position.',
    );

  // Hatch lines at FULL ink strength rather than the 30% that measured 1.42:1. They
  // can be that strong because no text sits on them any more — the gutter's captions
  // were moved out to the annotation lane beside it.
  const pattern = svg
    .append('defs')
    .append('pattern')
    .attr('id', 'hatchGutter')
    .attr('width', 6)
    .attr('height', 6)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(135)');
  pattern.append('rect').attr('width', 6).attr('height', 6).attr('fill', 'rgba(23,19,14,.05)');
  pattern
    .append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', 6)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 1.1);

  const x = d3.scaleLog().domain([1e6, 5e9]).range([plotL, plotR]).clamp(true);
  const bandY = (b: number): number => plotTop + (LEV_MAX - b) * bandH + bandH / 2;
  const ceiling = medianDisclosedCapital(interventions);

  // Band plates stop where the plotting area stops — they are a reading aid for the
  // rows, not a frame, and running them to the edge would imply the field extends
  // past the axis.
  const plateL = gutterL - 8;
  const plateR = plotR + 20;
  for (let b = LEV_MAX; b >= 1; b--) {
    if ((LEV_MAX - b) % 2 === 0) continue; // alternate, so rows read as bands
    svg
      .append('rect')
      .attr('class', 'fd-band')
      .attr('x', plateL)
      .attr('y', plotTop + (LEV_MAX - b) * bandH)
      .attr('width', plateR - plateL)
      .attr('height', bandH);
  }

  if (ceiling > 0) {
    svg
      .append('rect')
      .attr('class', 'fd-sweet')
      .attr('x', plotL)
      .attr('y', plotTop)
      .attr('width', Math.max(2, x(ceiling) - plotL))
      .attr('height', (LEV_MAX - LEV_HI + 1) * bandH);
  }

  svg
    .append('rect')
    .attr('class', 'fd-gutter')
    .attr('x', gutterL)
    .attr('y', plotTop)
    .attr('width', gutterR - gutterL)
    .attr('height', plotBot - plotTop);
  svg
    .append('line')
    .attr('class', 'fd-break')
    .attr('x1', breakX)
    .attr('x2', breakX)
    .attr('y1', plotTop)
    .attr('y2', plotBot);
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', gutterCX)
    .attr('y', plotTop - 12)
    .attr('text-anchor', 'middle')
    .text('no figure disclosed');

  const axis = svg.append('g').attr('class', 'fd-axis');
  axis.append('line').attr('x1', plotL).attr('x2', plotR).attr('y1', axisY).attr('y2', axisY);
  for (const t of [1e6, 1e7, 1e8, 1e9, 5e9]) {
    axis
      .append('line')
      .attr('x1', x(t))
      .attr('x2', x(t))
      .attr('y1', axisY)
      .attr('y2', axisY + 5);
    axis
      .append('text')
      .attr('x', x(t))
      .attr('y', tickY)
      .attr('text-anchor', 'middle')
      .text(money(t) ?? '');
  }
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotL)
    .attr('y', titleY)
    .text('capital raised · equity and debt closed · log scale →');

  // The vertical carries its own disclaimer, because a reader who looks at nothing
  // else will still look at the axis they are reading a position from.
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('transform', `translate(12,${String((plotTop + plotBot) / 2)}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .text('leverage band ↑ · editorial assessment, not a measurement');
  for (let n = LEV_MAX; n >= 1; n--) {
    svg
      .append('text')
      .attr('class', 'fd-bandnum')
      .attr('x', bandNumX)
      .attr('y', bandY(n) + 4)
      .attr('text-anchor', 'end')
      .text(String(n));
  }

  // Paint and tab order: highest band first, and inside a band left to right, so the
  // tab sequence is the walk the eye makes — most leverage first, and within a band
  // from least capital to most, gutter cases ahead of the axis.
  const ordered: Intervention[] = interventions.toSorted((p, q) => {
    if (q.leverageBand !== p.leverageBand) return q.leverageBand - p.leverageBand;
    const cp = totalCapitalRaised(p);
    const cq = totalCapitalRaised(q);
    if (cp > 0 !== cq > 0) return cp > 0 ? 1 : -1;
    return cp - cq;
  });

  const marksG = svg.append('g').attr('id', 'fdMarks');
  const laid: Mark[] = [];

  for (const iv of ordered) {
    const capital = totalCapitalRaised(iv);
    const none = capital === 0;
    const cx = none ? gutterCX : x(capital);
    const cy = bandY(iv.leverageBand);
    const r = trlRadius(iv.trlBand);
    const flagged = isOpportunity(iv);

    const g = marksG
      .append('g')
      .attr('class', 'fd-mk')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('data-iv', iv.id)
      .attr('aria-label', fieldAria(iv));
    const hit = g.append('rect').attr('class', 'fd-hit');

    // The flag is carried twice — fill AND an outer ring — so it survives
    // colour-vision deficiency and a greyscale print.
    if (flagged) {
      g.append('circle')
        .attr('class', 'fd-ring')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r + 4);
    }
    g.append('circle')
      .attr('class', `fd-disc${flagged ? ' fd-disc--flag' : ''}${none ? ' fd-disc--none' : ''}`)
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', r);
    g.append('text')
      .attr('class', 'fd-num')
      .attr('x', cx)
      .attr('y', cy + 3.4)
      .attr('text-anchor', 'middle')
      .text(sectionGlyph(iv));

    const nameT = g.append('text').attr('class', 'fd-name').text(fieldLabel(iv));
    // No value line in the gutter: the gutter's own header already says it, and
    // printing "no figure" twice would state an absence as if it were a reading.
    const valT = none ? null : g.append('text').attr('class', 'fd-val').text(hedgedTotal(iv));

    // A category with a field study gets a real link under its captions. Deliberately
    // a SIBLING of the marker group, not a child: the group is already role="button"
    // (it opens the entry), and nesting an anchor inside a button is both invalid and
    // unusable by keyboard. As a sibling it takes its own tab stop, and sits below the
    // group's hit rect so the two targets never overlap.
    let fwT: TextSel | null = null;
    if (iv.fieldwork?.short) {
      fwT = marksG
        .append('a')
        .attr('href', iv.fieldwork.href)
        .attr('class', 'fd-fw')
        .attr('aria-label', iv.fieldwork.label)
        .append('text')
        .attr('class', 'fd-fwt')
        .text(`${iv.fieldwork.short} ↗`);
    }

    g.on('click', () => {
      openIntervention(iv.id, true);
    })
      .on('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openIntervention(iv.id, true);
        }
      })
      .on('mouseenter', (ev: MouseEvent) => {
        showTip(ev, fieldTip(iv));
      })
      .on('mousemove', (ev: MouseEvent) => {
        showTip(ev, fieldTip(iv));
      })
      .on('mouseleave', hideTip)
      .on('focus', function () {
        showTipAt(this, fieldTip(iv));
      })
      .on('blur', hideTip);

    // A gutter marker's caption is anchored to the annotation LANE, not to the disc,
    // and it can only go right — there is nothing to its left but the band numbers,
    // and nothing to its right it may cross.
    laid.push({
      iv,
      hit: hit,
      cx,
      cy,
      r,
      nameT: nameT,
      valT: valT,
      fwT,
      gapR: none ? laneL - cx : r + 6,
      gapL: r + 6,
      forceRight: none,
    });
  }

  FIELD.marks = laid;
  FIELD.plotL = plotL;
  FIELD.plotR = plotR;
  placeFieldCaptions();

  // Legend: what size and what colour mean.
  const legend = svg.append('g');
  let sx = 6;
  for (const step of TRL_STEPS) {
    legend
      .append('circle')
      .attr('class', 'fd-disc')
      .attr('cx', sx + step.r)
      .attr('cy', legendCY)
      .attr('r', step.r);
    sx += step.r * 2 + 6;
  }
  legend
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', sx + 4)
    .attr('y', legendCY + 3)
    .text(`readiness TRL ${trlStepLabel()}`);
  legend
    .append('circle')
    .attr('class', 'fd-ring')
    .attr('cx', 300)
    .attr('cy', legendCY)
    .attr('r', 14);
  legend
    .append('circle')
    .attr('class', 'fd-disc fd-disc--flag')
    .attr('cx', 300)
    .attr('cy', legendCY)
    .attr('r', 10);
  legend
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', 322)
    .attr('y', legendCY + 3)
    .text(`flagged · gap ≥ ${OPPORTUNITY_THRESHOLD}`);
  legend
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', 452)
    .attr('y', legendCY + 3)
    .text('numeral · ledger section');

  setText(byId('fieldCallout'), fieldCallout(ceiling));

  setHtml(
    byId('fieldFoot'),
    html`<strong>Horizontal — capital raised.</strong> The same log axis and the same summing rule
      as the ledger below: only entries the sources record as equity or debt actually closed, never
      a row already inside another row's cumulative total. A marker four times further right sits on
      a hundred times more money, so read the printed figure and not the distance; each one keeps
      the ≥ or ≈ its underlying entries carry. Offtakes, prizes, grants, capital being sought and
      sector roll-ups are different kinds of money and are not on this axis at all — they are in the
      tooltip and in the entry. <strong>The hatched gutter</strong> holds the categories whose
      sources disclose no dollar figure. They have a leverage band, so they have a height, but they
      have no horizontal position and are never given a placeholder one: a blank is not a zero, and
      it is not the smallest number either. <strong>Vertical — leverage band.</strong> An editorial
      assessment, ordinal, five bands, and deliberately not a scale: band ${LEV_MAX} is higher than
      band ${LEV_MAX - 1} but not by any stated amount, and the interval between bands is undefined.
      Each band is derived from the leverage argument already written for that category in the data
      layer — the argument is the evidence, the band is only a handle for plotting it — and where
      that argument is hedged the band goes down rather than up.
      <strong>Marker size — readiness.</strong> Three steps (TRL ${trlStepLabel()}) taken from the
      approximate midpoint of each category's maturity, rounded down where a midpoint fell on a
      half. Two categories span from lab bench to commercial inside one heading; collapsing those to
      a single step loses real information, so the maturity line in the entry, not the marker, is
      the authority. <strong>The ring and dark fill</strong> mark every category the gap assessment
      puts at ${OPPORTUNITY_THRESHOLD} of 5 or above — the same derivation as the opportunity board
      above, not a second list. <strong>The shaded corner</strong> is the top
      ${LEV_MAX - LEV_HI + 1} leverage bands left of the median disclosed capital figure, so it
      moves if the money does. <strong>The numeral</strong> in each disc is the category's section
      in the ledger below. Click or press Enter on any marker to open that entry — leverage,
      maturity, every money figure as its source labels it, what has actually been delivered, and
      the caveats.`,
  );
};

export { fieldLabel };
