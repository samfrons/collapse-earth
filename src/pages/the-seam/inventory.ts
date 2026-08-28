/**
 * Overburden — the inventory, and the regulatory clock above it.
 *
 * Rows are countries; the horizontal axis is modelled MCM CH₄/yr. Each country's bar
 * runs to its ≈total; the six named mines are placed at their own modelled rate on the
 * same axis, so a disc's position and its printed figure agree. Everything comes from
 * the atlas — no value below is typed.
 */

import * as d3 from 'd3';

import { amm, source, type Mine } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { grouped } from '@/lib/format';
import { html, type SafeHtml } from '@/lib/html';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';

/* -------------------------------------------------------------------------- */
/* The regulatory clock                                                       */
/* -------------------------------------------------------------------------- */

/** Parse a `YYYY-MM-DD` stamp as a local date, avoiding UTC's off-by-one. */
const asDate = (stamp: string): Date => {
  const [y = 0, m = 1, d = 1] = stamp.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const MS_PER_DAY = 864e5;

/**
 * Three dated obligations from the EU methane regulation and a "today" cursor.
 *
 * Dates come from the atlas; the source is verify-flagged until the article wording is
 * confirmed, and the strip says so rather than presenting them as settled.
 */
export const buildClock = (today = new Date()): void => {
  const reg = amm.regulation;
  byId('clockHost').hidden = false;
  setText(byId('clockK'), `the regulatory clock · ${reg.id}`);

  const svg = d3.select('#clockSvg');
  svg.selectAll('*').remove();

  const W = 900;
  const H = 128;
  const yLine = 56;
  const x = d3
    .scaleTime()
    .domain([new Date(2025, 5, 1), new Date(2030, 6, 1)])
    .range([16, W - 16])
    .clamp(true);

  // The strip carries four of the five dates — measurement-begins lives in the
  // regulation drawer, where its 0.5 t/yr threshold can be stated.
  const milestones = reg.milestones
    .filter((m) => m.clock !== false)
    .map((m) => ({ milestone: m, date: asDate(m.date) }));
  const next = milestones.find((e) => e.date > today);

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr(
      'aria-label',
      `Regulatory clock for ${reg.id}: ` +
        milestones.map((e) => `${e.milestone.label} ${e.milestone.date}`).join('; ') +
        ". Today's date is marked. Dates still to confirm against the regulation text.",
    );

  svg
    .append('line')
    .attr('x1', 16)
    .attr('x2', W - 16)
    .attr('y1', yLine)
    .attr('y2', yLine)
    .attr('stroke', '#17130E')
    .attr('stroke-width', 0.8)
    .attr('opacity', 0.5);

  // Labels stagger when neighbouring milestones crowd — the first two dates sit seven
  // months apart on a four-year axis, so same-row labels would collide.
  let lastX = -1e9;
  milestones.forEach((e, i) => {
    const cx = x(e.date);
    const crowded = cx - lastX < 150;
    lastX = cx;
    const past = e.date <= today;
    const last = i === milestones.length - 1;
    const anchor = i === 0 ? 'start' : last ? 'end' : 'middle';
    const tx = i === 0 ? cx - 4 : last ? cx + 4 : cx;

    const g = svg.append('g').attr('opacity', past ? 0.55 : 1);
    g.append('line')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', yLine - 12)
      .attr('y2', yLine + 12)
      .attr('stroke', '#17130E')
      .attr('stroke-width', 1.4);
    g.append('text')
      .attr('class', 'fd-hd')
      .attr('x', tx)
      .attr('y', crowded ? yLine - 34 : yLine - 20)
      .attr('text-anchor', anchor)
      .text(`${e.milestone.date}${past ? ' ·' : ''}`);
    g.append('text')
      .attr('x', tx)
      .attr('y', crowded ? yLine + 42 : yLine + 28)
      .attr('text-anchor', anchor)
      .style('font-family', 'var(--serif)')
      .style('font-size', '12.5px')
      .attr('fill', '#17130E')
      .text(e.milestone.label);
  });

  // Today — the reader's own position on the clock. Named in the footer line, not
  // beside the tick, where it would collide with the first deadline.
  const todayX = x(today);
  svg
    .append('line')
    .attr('x1', todayX)
    .attr('x2', todayX)
    .attr('y1', yLine - 17)
    .attr('y2', yLine + 17)
    .attr('stroke', '#33596A')
    .attr('stroke-width', 1.6);

  const countdown = next
    ? `${String(Math.ceil((next.date.getTime() - today.getTime()) / MS_PER_DAY))} days to ` +
      next.milestone.label
    : 'every date has passed';
  const unconfirmed = reg.sourceIds[0] ? source(reg.sourceIds[0]).verify === true : false;

  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', 16)
    .attr('y', H - 4)
    .text(
      `blue tick — today · dimmed — passed · ${countdown} · abandoned: member states · ` +
        `closed: operators or the state${unconfirmed ? ' · dates to confirm' : ''}`,
    );
};

/* -------------------------------------------------------------------------- */
/* The seam field                                                             */
/* -------------------------------------------------------------------------- */

const byMcmDescending = [...amm.mines].sort((a, b) => b.mcm - a.mcm);
const mineRank = (m: Mine): number => byMcmDescending.indexOf(m) + 1;

const mineTip = (m: Mine): SafeHtml =>
  html`<b>${m.name}${m.region ? ` · ${m.region}` : ''}</b>${m.country} ·
    ${m.closed !== null ? `closed ${m.closed}` : 'closure year not in the briefing'}<br />≈ ${m.mcm}
    MCM CH₄/yr · modelled, scenario-average<br />flooded status:
    ${m.status}${
      m.floodedDelta
        ? html`<br />if flooded: ${m.floodedDelta.flooded} vs ${m.floodedDelta.dry} MCM dry — the
            70% question`
        : ''
    }<br />opens the mine dossier`;

const mineAria = (m: Mine): string =>
  `${m.name}, ${m.country}, ` +
  (m.closed !== null ? `closed ${m.closed}` : 'closure year not stated in the briefing') +
  ` — approximately ${m.mcm} million cubic metres of methane a year, modelled, ` +
  `flooded status ${m.status}. Opens the mine dossier.`;

interface CountryRow {
  readonly name: string;
  readonly mcm: number;
  readonly note?: string;
  readonly derived?: boolean;
  readonly mines: readonly Mine[];
}

let onMineSelect: ((id: string, trigger: Element) => void) | null = null;
export const wireMineSelect = (handler: (id: string, trigger: Element) => void): void => {
  onMineSelect = handler;
};

export const buildSeamField = (): void => {
  const inv = amm.inventory;
  const svg = d3.select('#seamSvg');
  svg.selectAll('*').remove();

  const rows: CountryRow[] = inv.countries.map((c) => ({
    name: c.name,
    mcm: c.mcm,
    ...(c.note !== undefined ? { note: c.note } : {}),
    mines: amm.mines.filter((m) => m.country === c.name),
  }));

  // The remainder row is DERIVED and labelled as such — the briefing names only the
  // top three countries' totals.
  rows.push({
    name: 'rest of the EU',
    mcm: Math.round(inv.central.mcm - rows.reduce((n, r) => n + r.mcm, 0)),
    derived: true,
    mines: [],
  });

  const W = 900;
  const bandH = 66;
  const padTop = 34;
  const plotL = 158;
  const plotR = 860;
  const axisMax = 120;
  const plotBot = padTop + rows.length * bandH;
  const axisY = plotBot + 8;
  const tickY = axisY + 18;
  const titleY = axisY + 38;
  const H = titleY + 14;
  const x = d3.scaleLinear().domain([0, axisMax]).range([plotL, plotR]).clamp(true);

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr(
      'aria-label',
      'The seam field: modelled abandoned-mine methane by country. ' +
        rows.map((r) => `${r.name} approximately ${r.mcm} MCM per year`).join('; ') +
        '. The six named mines are placed at their own modelled rates on the same axis; ' +
        'each is a focusable control that opens its dossier. All figures are modelled.',
    );

  rows.forEach((_r, i) => {
    if (i % 2 === 0) return;
    svg
      .append('rect')
      .attr('class', 'fd-band')
      .attr('x', 6)
      .attr('y', padTop + i * bandH)
      .attr('width', W - 26)
      .attr('height', bandH);
  });

  const axis = svg.append('g').attr('class', 'fd-axis').attr('color', '#17130E');
  axis.append('line').attr('x1', plotL).attr('x2', plotR).attr('y1', axisY).attr('y2', axisY);
  for (let t = 0; t <= axisMax; t += 30) {
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
      .text(String(t));
  }
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotL)
    .attr('y', titleY)
    .text('modelled MCM CH₄ / yr · at closure · GEM 2024 →');

  rows.forEach((r, i) => {
    const cy = padTop + i * bandH + bandH / 2;

    svg
      .append('text')
      .attr('class', 'fd-name')
      .attr('x', 10)
      .attr('y', cy - 2)
      .style('font-weight', '600')
      .text(r.name);
    svg
      .append('text')
      .attr('class', 'fd-val')
      .attr('x', 10)
      .attr('y', cy + 12)
      .text(`≈ ${r.mcm} MCM${r.derived ? ' · derived' : ''}`);

    // The country bar — dashed end cap, because every total is hedged.
    const bar = svg
      .append('rect')
      .attr('x', x(0))
      .attr('y', cy - 9)
      .attr('width', Math.max(2, x(r.mcm) - x(0)))
      .attr('height', 18)
      .attr('fill', 'rgba(23,19,14,.10)')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 1);
    svg
      .append('line')
      .attr('x1', x(r.mcm))
      .attr('x2', x(r.mcm))
      .attr('y1', cy - 12)
      .attr('y2', cy + 12)
      .attr('stroke', '#17130E')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 2');

    if (r.note !== undefined) {
      const note = r.note;
      const tip = html`<b>${r.name}</b>${note}`;
      bar
        .on('mouseenter', (ev: MouseEvent) => {
          showTip(ev, tip);
        })
        .on('mousemove', (ev: MouseEvent) => {
          showTip(ev, tip);
        })
        .on('mouseleave', hideTip);
    }

    // The named mines, at their own modelled rate on the same axis.
    const mines = [...r.mines].sort((a, b) => a.mcm - b.mcm);
    mines.forEach((m, j) => {
      const cx = x(m.mcm);
      const rr = 10;

      const g = svg
        .append('g')
        .attr('class', 'fd-mk')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('data-mine', m.id)
        .attr('aria-label', mineAria(m));
      const hit = g.append('rect').attr('class', 'fd-hit');
      g.append('circle').attr('class', 'fd-disc').attr('cx', cx).attr('cy', cy).attr('r', rr);
      g.append('text')
        .attr('class', 'fd-num')
        .attr('x', cx)
        .attr('y', cy + 3.4)
        .attr('text-anchor', 'middle')
        .text(String(mineRank(m)));

      // Captions clear the bar entirely: name above it, value below it. The two discs
      // in a row diverge — inner disc's captions anchor away to the left, outer disc's
      // to the right — so close pairs never read as one run of text. Closure years live
      // in the tooltip and the dossier, not here.
      const right = j === mines.length - 1;
      const tx = right ? cx + 2 : cx - 2;
      const anchor = right ? 'start' : 'end';
      const name = m.name.replace(/^KWK /, '').replace(/ (Coal Mine|Colliery|Mine)$/, '');

      g.append('text')
        .attr('class', 'fd-name')
        .attr('x', tx)
        .attr('y', cy - 17)
        .attr('text-anchor', anchor)
        .text(name);
      g.append('text')
        .attr('class', 'fd-val')
        .attr('x', tx)
        .attr('y', cy + 25)
        .attr('text-anchor', anchor)
        .text(`≈ ${m.mcm} MCM`);

      const guessedWidth = Math.max(name.length, 10) * 6.4;
      const hx0 = right ? cx - rr - 4 : tx - guessedWidth;
      const hx1 = right ? tx + guessedWidth : cx + rr + 4;
      hit
        .attr('x', hx0)
        .attr('y', cy - 26)
        .attr('width', hx1 - hx0)
        .attr('height', 54);

      g.on('click', function () {
        onMineSelect?.(m.id, this);
      })
        .on('keydown', function (ev: KeyboardEvent) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            onMineSelect?.(m.id, this);
          }
        })
        .on('mouseenter', (ev: MouseEvent) => {
          showTip(ev, mineTip(m));
        })
        .on('mousemove', (ev: MouseEvent) => {
          showTip(ev, mineTip(m));
        })
        .on('mouseleave', hideTip)
        .on('focus', function () {
          showTipAt(this, mineTip(m));
        })
        .on('blur', hideTip);
    });
  });

  // The published six-mine total, not a re-sum of rounded per-mine figures (which
  // lands one MCM off GEM's own print).
  setText(
    byId('seamCallout'),
    `Six mines are half the problem — ≈${grouped(inv.sixMines.mcm)} of ` +
      `${grouped(inv.central.mcm)} MCM a year. And ${inv.status.unknown} of ` +
      `${inv.status.of} underground mines have an unknown flooded-or-dry status: ` +
      'the inventory the regulation now demands does not yet exist. That is the market.',
  );

  setHtml(
    byId('seamFoot'),
    html`<strong>Rows are countries;</strong> the bar runs to the country's ≈total and its end is
      dashed because every total is hedged. The fourth row is a derived remainder, and says so.
      <strong>The six discs</strong> are the six largest emitters, placed at their own modelled rate
      on the same axis — position and printed figure agree. The numeral is the mine's rank by size.
      <strong>Every figure is modelled</strong> (GEM 2024, adapted Kholod M2CM), scenario-averaged
      where the flooded status is unknown, and none has been measured at the mine. Click or press
      Enter on a disc for the mine's dossier: what is known, what is not, and what the flooding
      question does to the number.`,
  );
};
