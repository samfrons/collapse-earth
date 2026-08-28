/**
 * At depth — the Fermi ladder, the layers, the revenue, and the kills.
 *
 * The ladder's whole argument is that a single well-chosen vent already outweighs the
 * DAC industry's flagship plant. Both warming lenses are switchable and both appear in
 * every tooltip, because the ordering is the finding and the ordering does not change
 * between them — which is exactly why showing only one lens would be advocacy.
 */

import * as d3 from 'd3';

import { amm, mine, type Band, type FermiEstimate } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { grouped } from '@/lib/format';
import { attr, html, type SafeHtml } from '@/lib/html';
import { hideTip, showTip, showTipAt } from '@/lib/tooltip';
import { P } from './params';
import { abatedRange, mineTwin } from './twin-model';
import { formatCo2e } from './warming-lenses';

type Lens = 'gwp20' | 'gwp100';

const ladder = { lens: 'gwp20' as Lens };

const rungCo2 = (r: FermiEstimate, lens: Lens): Band => {
  const g = lens === 'gwp20' ? amm.gwp.gwp20 : amm.gwp.gwp100;
  return {
    min: r.ktCh4.min * g * 1000,
    central: r.ktCh4.central * g * 1000,
    max: r.ktCh4.max * g * 1000,
  };
};

const field = (key: string, value: SafeHtml, className = ''): SafeHtml =>
  html`<div class="field${className ? ` ${className}` : ''}">
    <p class="field-k">${key}</p>
    <p class="field-v">${value}</p>
  </div>`;

/**
 * The case, in three plates: the mandate and its payer; the impact priced against DAC;
 * the value streams before any credit. Every figure is derived from the data layer or
 * from the twin at its editorial defaults — none is typed.
 */
const renderCasePlates = (): void => {
  const tw = mineTwin(mine('auguste-victoria'));
  const kt = abatedRange(tw, 2026, 2026 + P('project_life'));
  const t100 = kt * amm.gwp.gwp100 * 1000;
  const t20 = kt * amm.gwp.gwp20 * 1000;
  const cost = P('capex_unit') + P('opex_unit') * P('project_life');
  const eurPerTonne = cost / t100;
  const dac = amm.dacContrast;
  // Recoverable energy: closure-year flow × lower heating value — thermal, before decline.
  const gwhPerYear = (tw.q0 * 1e6 * P('lhv_m3')) / 3600 / 1000;
  const reg = amm.regulation;
  const ban = reg.milestones[reg.milestones.length - 1];
  const banYear = ban?.date.slice(0, 4) ?? '';

  setHtml(
    byId('casePlates'),
    html`<div class="counter">
        <span class="readout-k">the mandate — and who pays</span>
        <b>${banYear}</b>
        <small
          >${reg.id}, Arts. 24–26: the inventory was due August 2025, measurement and yearly reports
          run now, and from ${banYear} venting and flaring are prohibited outright. Member states
          own abandoned mines — in Poland one state company, SRK, holds twelve and receives every
          closure. The buyer is named, budgeted, and on deadline.</small
        >
      </div>

      <div class="counter">
        <span class="readout-k">the impact, priced against DAC</span>
        <b>≈€${eurPerTonne < 10 ? eurPerTonne.toFixed(1) : Math.round(eurPerTonne)}/t</b>
        <small
          >Tracked DAC investment ≈$${(dac.sectorCapitalUsd / 1e9).toFixed(1)}B has delivered
          ≈${grouped(dac.deliveredT)} t at ${dac.costPerT}. One €${(cost / 1e6).toFixed(1)}M unit on
          this page's twin, modelled: ≈${formatCo2e(t100)} CO₂e (100-yr) over ${P('project_life')}
          years — ≈${formatCo2e(t20)} at 20-yr. Delivered tonnes against modelled tonnes is unfair
          in both directions, and stated — the gap is still orders of magnitude.</small
        >
      </div>

      <div class="counter">
        <span class="readout-k">the value before any credit</span>
        <b>≈${Math.round(gwhPerYear)} GWh/yr</b>
        <small
          >Compliance is bought first — the report and the plan someone now owes. Then the gas
          itself: this twin's closure-year flow carries ≈${Math.round(gwhPerYear)} GWh of thermal
          energy a year (modelled, before decline), and Germany already uses 99% of its
          abandoned-mine methane for power and heat. Carbon revenue rides on top. It never carries
          the case.</small
        >
      </div>`,
  );
};

const drawLadder = (): void => {
  const svg = d3.select('#ladderSvg');
  svg.selectAll('*').remove();

  const lens = ladder.lens;
  const lensWord = lens === 'gwp20' ? '20-year' : '100-year';
  setText(byId('ladderK'), `the fermi ladder · t CO₂e per year · ${lensWord} lens · modelled`);

  const W = 900;
  const bandH = 62;
  const padTop = 30;
  const rungs = amm.fermi;
  const plotL = 210;
  const plotR = 800;
  const plotBot = padTop + rungs.length * bandH;
  const axisY = plotBot + 8;
  const tickY = axisY + 18;
  const titleY = axisY + 40;
  const H = titleY + 16;

  const x = d3.scaleLog().domain([1e4, 1e9]).range([plotL, plotR]).clamp(true);

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr(
      'aria-label',
      `Fermi ladder on a logarithmic CO2-equivalent axis, ${lensWord} lens: ` +
        rungs
          .map((r) => `${r.label} approximately ${formatCo2e(rungCo2(r, lens).central)} per year`)
          .join('; ') +
        ". Climeworks Mammoth's DAC nameplate is marked for scale. All rungs are modelled or " +
        'derived; both lenses in every tooltip.',
    );

  rungs.forEach((_r, i) => {
    if (i % 2 === 0) return;
    svg
      .append('rect')
      .attr('class', 'fd-band')
      .attr('x', 6)
      .attr('y', padTop + i * bandH)
      .attr('width', W - 26)
      .attr('height', bandH);
  });

  const axis = svg.append('g').attr('class', 'fd-axis').attr('color', '#F4EFE6');
  axis.append('line').attr('x1', plotL).attr('x2', plotR).attr('y1', axisY).attr('y2', axisY);
  for (const t of [1e4, 1e5, 1e6, 1e7, 1e8, 1e9]) {
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
      .text(formatCo2e(t));
  }
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', plotL)
    .attr('y', titleY)
    .text(`t CO₂e / yr · log scale · ${lensWord} lens · modelled →`);

  // Mammoth reference — the DAC industry's flagship, on the same axis.
  const mx = x(P('mammoth') * 1000);
  svg
    .append('line')
    .attr('x1', mx)
    .attr('x2', mx)
    .attr('y1', padTop - 4)
    .attr('y2', plotBot + 4)
    .attr('stroke', '#8FB8C7')
    .attr('stroke-width', 1.2)
    .attr('stroke-dasharray', '4 3');
  svg
    .append('text')
    .attr('class', 'fd-hd')
    .attr('x', mx)
    .attr('y', padTop - 10)
    .attr('text-anchor', 'middle')
    .style('fill', '#8FB8C7')
    .text('MAMMOTH · DAC NAMEPLATE');

  rungs.forEach((r, i) => {
    const cy = padTop + i * bandH + bandH / 2;
    const c = rungCo2(r, lens);
    const other = rungCo2(r, lens === 'gwp20' ? 'gwp100' : 'gwp20');

    svg
      .append('text')
      .attr('class', 'fd-name')
      .attr('x', 10)
      .attr('y', cy - 2)
      .style('font-weight', '600')
      .style('fill', '#F4EFE6')
      .text(r.label);
    svg
      .append('text')
      .attr('class', 'fd-val')
      .attr('x', 10)
      .attr('y', cy + 12)
      .style('fill', '#EADDC9')
      .text(`${r.modelled ? 'modelled · ' : 'GEM print · '}≈${formatCo2e(c.central)}/yr`);

    const g = svg
      .append('g')
      .attr('class', 'fd-mk')
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr(
        'aria-label',
        `${r.label}: ${formatCo2e(c.min)} to ${formatCo2e(c.max)} CO2e per year at the ` +
          `${lensWord} lens, central ${formatCo2e(c.central)}; at the other lens central ` +
          `${formatCo2e(other.central)}. ${r.basis}.`,
      );

    const x0 = x(c.min);
    const x1 = Math.max(x(c.max), x0 + 2);
    g.append('rect')
      .attr('class', 'fd-hit')
      .attr('x', x0 - 8)
      .attr('y', cy - 16)
      .attr('width', x1 - x0 + 16)
      .attr('height', 32);
    g.append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', cy)
      .attr('y2', cy)
      .attr('stroke', '#F4EFE6')
      .attr('stroke-width', 6)
      .attr('opacity', 0.35);
    for (const bx of [x0, x1]) {
      g.append('line')
        .attr('x1', bx)
        .attr('x2', bx)
        .attr('y1', cy - 7)
        .attr('y2', cy + 7)
        .attr('stroke', '#F4EFE6')
        .attr('stroke-width', 1.6);
    }
    g.append('circle')
      .attr('cx', x(c.central))
      .attr('cy', cy)
      .attr('r', 5)
      .attr('fill', '#D2653C')
      .attr('stroke', '#17130E')
      .attr('stroke-width', 1);

    const tip = html`<b>${r.label}</b>CH₄
      ≈${r.ktCh4.min}${r.ktCh4.min === r.ktCh4.max ? '' : `–${r.ktCh4.max}`} kt/yr<br />20-yr lens:
      ≈${formatCo2e(rungCo2(r, 'gwp20').central)} CO₂e/yr<br />100-yr lens:
      ≈${formatCo2e(rungCo2(r, 'gwp100').central)} CO₂e/yr<br />${r.basis}`;
    g.on('mouseenter', (ev: MouseEvent) => {
      showTip(ev, tip);
    })
      .on('mousemove', (ev: MouseEvent) => {
        showTip(ev, tip);
      })
      .on('mouseleave', hideTip)
      .on('focus', function () {
        showTipAt(this, tip);
      })
      .on('blur', hideTip);
  });

  setHtml(
    byId('ladderFoot'),
    html`<strong>Four rungs, one axis.</strong> A single well-chosen vent already outweighs the DAC
      industry's flagship plant at the ${lensWord} lens — that is the mispricing the thesis rests
      on. The axis is logarithmic: read the printed figures, not the distances. Every rung is
      modelled or derived (the six-mine rung is GEM's own print); the CH₄ tonnages come from the
      inventory above and the CO₂-equivalents are computed from one pair of AR6 fossil-methane
      factors, never typed. Switching the lens moves every rung and the axis together — the ordering
      never changes, which is the point of showing both.`,
  );
};

export const buildVenture = (): void => {
  const v = amm.venture;

  setHtml(
    byId('ventureHost'),
    html`<div class="unit-chips" role="group" aria-label="Warming lens" id="gwpChips">
        ${(
          [
            ['gwp20', `20-yr lens · ×${amm.gwp.gwp20}`],
            ['gwp100', `100-yr lens · ×${amm.gwp.gwp100}`],
          ] as const
        ).map(
          ([id, label]) =>
            html`<button
              type="button"
              class="uchip"
              data-lens="${id}"
              aria-pressed="${id === ladder.lens ? 'true' : 'false'}"
            >
              <b>${label}</b>both lenses in every tooltip
            </button>`,
        )}
      </div>

      <div class="twin-plot rise">
        <p class="readout-k" id="ladderK"></p>
        <svg id="ladderSvg" role="group"></svg>
      </div>
      <details class="fn">
        <summary>
          <span class="pull-shut">how to read the ladder</span><span class="pull-open">close</span>
        </summary>
        <div class="fn-body"><p class="note" id="ladderFoot" style="margin:0"></p></div>
      </details>

      <h3 style="margin:clamp(34px,5vh,54px) 0 4px">The case, in three plates</h3>
      <div class="counters rise" id="casePlates"></div>

      <h3 style="margin:clamp(34px,5vh,54px) 0 4px">The company, in six layers</h3>
      <div class="unit-chips" id="layerStrip" role="list" style="margin-top:12px"></div>

      <div class="twin-grid" style="margin-top:clamp(22px,3.2vh,34px)">
        <div>
          <h4 style="margin-bottom:4px">The revenue, before any credit</h4>
          <div id="revStack"></div>
        </div>
        <div>
          <h4 style="margin-bottom:4px">The counterparty</h4>
          <div id="buyerNote"></div>
        </div>
      </div>

      <h3 style="margin:clamp(34px,5vh,54px) 0 0">Six ways this dies</h3>
      <p class="note" style="margin-top:8px">
        Pre-written. If any of these holds, the company should not be built — and the second-best
        wedge (methane abatement for industrial wastewater lagoons) takes its place.
      </p>
      <div class="tags rise" id="killTags"></div>`,
  );

  const host = byId('ventureHost');
  const chips = [...host.querySelectorAll<HTMLButtonElement>('#gwpChips .uchip')];
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      ladder.lens = (chip.getAttribute('data-lens') ?? 'gwp20') as Lens;
      for (const other of chips) {
        other.setAttribute('aria-pressed', other === chip ? 'true' : 'false');
      }
      drawLadder();
    });
  }

  setHtml(
    byId('layerStrip'),
    html`${v.layers.map(
      (l) =>
        html`<button
          type="button"
          class="uchip"
          role="listitem"
          aria-label="${attr(`${l.label}: ${l.what}`)}"
          data-tip="${attr(l.what)}"
        >
          <b>${l.label}</b>
        </button>`,
    )}`,
  );
  for (const chip of byId('layerStrip').querySelectorAll<HTMLElement>('.uchip')) {
    const tip = html`<b>${chip.querySelector('b')?.textContent ?? ''}</b>${
        chip.getAttribute('data-tip') ?? ''
      }`;
    chip.addEventListener('mouseenter', (ev) => {
      showTip(ev, tip);
    });
    chip.addEventListener('mousemove', (ev) => {
      showTip(ev, tip);
    });
    chip.addEventListener('mouseleave', hideTip);
    chip.addEventListener('focus', () => {
      showTipAt(chip, tip);
    });
    chip.addEventListener('blur', hideTip);
  }

  // Revenue lines, explicitly not the atlas's funding streams.
  setHtml(
    byId('revStack'),
    html`${v.revenue.map((r) => field(r.label, html`${r.kind}.`, r.warn ? 'field--warn' : ''))}
      <p class="note" style="margin-top:12px;font-size:.75rem">
        Revenue lines, not funding streams — nothing here is capital raised, and nothing is
        summable. The order is the wedge order: paid assessment first, because a customer who pays
        for the study is the cheapest possible test of the whole thesis.
      </p>`,
  );

  setHtml(
    byId('buyerNote'),
    html`${field(
      'who has the budget and the deadline',
      html`Member states own abandoned mines outright; closed mines fall to their operators or the
      state (Art. 25(7) — and a mine is 'abandoned' precisely when nobody else can be held
      responsible). Poland's state SRK, holder of twelve abandoned underground mines and every
      future closure, is the single most concentrated counterparty in the EU. Germany's reported 99%
      utilisation is the proof the gas can be captured at portfolio scale — and the reason the
      frontier is the second-tier sites the regulation is about to force onto someone's balance
      sheet.`,
    )}
    ${field(
      'what to sell first',
      html`Not hardware. A paid site assessment against the August 2026 reporting deadline, then the
      monitoring subscription the regulation makes recurring. The unit at level iii earns its keep
      only after the measurement layer exists.`,
    )}`,
  );

  renderCasePlates();

  setHtml(
    byId('killTags'),
    html`${v.killCriteria.map(
      (k) =>
        html`<div class="tag">
          <span class="tag-punch" aria-hidden="true"></span>
          <span class="tag-wire" aria-hidden="true"></span>
          <div class="tag-hd">
            <span class="tag-id">${k.id}</span>
            <span
              class="fd-hd"
              style="font-family:var(--mono);font-size:.4375rem;letter-spacing:.14em;color:var(--kraft-ink-2)"
              >PRE-WRITTEN KILL CRITERION</span
            >
          </div>
          <div class="tag-f tag-f--kill" style="border-top:0">
            <p class="tag-v">${k.clause}</p>
          </div>
        </div>`,
    )}`,
  );

  drawLadder();
};
