/**
 * The reference drawers: what is wrong with the inventory, and what the regulation
 * actually says.
 *
 * Both are progressive disclosure — reference depth rather than spine — but the summary
 * on each carries its own hedge, because the page's disclosure rule allows shortening
 * prose and never a hedge or a badge.
 */

import { amm } from '@/data';
import { byId, setHtml } from '@/lib/dom';
import { citationList } from '@/lib/citations';
import { capitalise } from '@/lib/format';
import { html, type SafeHtml } from '@/lib/html';

export const field = (key: string, value: SafeHtml, className = ''): SafeHtml =>
  html`<div class="field${className ? ` ${className}` : ''}">
    <p class="field-k">${key}</p>
    ${/^\s*</.test(value.value) ? value : html`<p class="field-v">${value}</p>`}
  </div>`;

export const renderActOneDrawers = (): void => {
  const inv = amm.inventory;
  const st = inv.status;
  const worked = amm.mines.find((m) => m.floodedDelta);

  setHtml(
    byId('dzQualityBody'),
    html`${field(
      'the flooding wedge',
      html`${st.unknown} of ${st.of} underground mines: status unknown (${st.dry} known dry,
      ${st.flooded} known flooded). ${st.note}.`,
    )}
    ${
      worked?.floodedDelta &&
      field(
        `the worked example — ${worked.name}`,
        html`GEM's own pair for this mine: ≈${worked.floodedDelta.dry} MCM/yr if dry,
        ≈${worked.floodedDelta.flooded} MCM/yr if flooded — a ≈70% swing on one status bit.
        ${worked.floodedDelta.note}`,
      )
    }
    ${field(
      'the three scenarios',
      html`<ul class="src-list">
          ${inv.scenarios.map(
            (s) =>
              html`<li>${s.label} — ≈${s.mcm} MCM/yr${s.kt !== null ? ` (≈${s.kt} kt)` : ''}</li>`,
          )}
        </ul>
        <p class="field-v" style="margin-top:8px">${inv.central.basis}.</p>`,
    )}
    ${field('conflicting totals', html`${inv.inventoryConflict.note}`, 'field--warn')}
    ${field(
      'sources',
      html`<ul class="src-list">
        ${citationList(inv.sourceIds)}
      </ul>`,
    )}`,
  );

  const reg = amm.regulation;
  setHtml(
    byId('dzRegulationBody'),
    html`${field(
      'who is responsible',
      html`${capitalise(reg.responsibility.abandoned)} are responsible for abandoned mines;
      ${reg.responsibility.closed} for closed ones. ${reg.responsibility.note}`,
    )}
    ${field(
      'the dates — verified against the official text',
      html`<ul class="src-list">
          ${reg.milestones.map(
            (m) =>
              html`<li>
                <span class="mono">${m.date}</span> — ${m.what}
                <span class="mono">(${m.art})</span>
              </li>`,
          )}
        </ul>
        <p class="field-v" style="margin-top:8px">
          Scope throughout: underground coal mines where operations ceased after 3 August 1954 — a
          fixed statutory date, not a rolling window. The first reports are estimates; required
          measurement begins only three months before they are due, on elements above 0.5 t CH₄/yr.
        </p>`,
    )}
    ${field("the regulation's own physics", html`${reg.recital128.note} (Recital 128).`)}
    ${field(
      'the concentrated counterparty',
      html`Poland's state-owned SRK already manages twelve abandoned underground mines and is slated
      to receive every future closure — the single most identifiable buyer in the EU. Germany, at a
      reported 99% utilisation of its abandoned-mine methane, is the existence proof that the gas
      can be captured at portfolio scale.`,
    )}
    ${field(
      'sources',
      html`<ul class="src-list">
        ${citationList([...reg.sourceIds, 'gem2024amm'])}
      </ul>`,
    )}`,
  );
};

/**
 * What a real twin would have to know, set beside what this one actually does. The
 * number in the first row is the whole reason the drawer exists.
 */
export const renderTwinGaps = (
  gaps: readonly { k: string; need: string; test: string; ours: string }[],
  modelMw: number,
  actualMw: number,
  suitableShare: number,
): void => {
  const host = document.getElementById('twinGaps');
  if (!host) return;

  setHtml(
    host,
    html`${field(
      'the number to keep in mind',
      html`A UK developer modelled an abandoned-mine reserve extensively and made it worth a
        <b>${modelMw} MW</b> power station. Boreholes into the same workings found enough gas for
        <b>${actualMw} MWe</b>. Same class of tool as the one on this plate, used by people whose
        money depended on the answer — off by a factor of three. UNECE's own conclusion: the need to
        combine modelling and physical testing is graphically illustrated.`,
      'field--warn',
    )}
    ${gaps.map((g) =>
      field(
        g.k,
        html`${g.need}<br /><br /><span class="readout-k">how it is tested</span> ${g.test}<br />
          <span class="readout-k">what this twin does</span> ${g.ours}`,
      ),
    )}
    ${field(
      'and how few mines are worth it at all',
      html`UNECE expects no more than <b>${Math.round(suitableShare * 100)}%</b> of any group of
        mines to suit an AMM project — gassy, drained while working, and not quick to flood. Act I's
        inventory is a population, not a pipeline.`,
    )}`,
  );
};
