/**
 * Ochre — the misallocation. The funding ledger, and the company atlas beneath it.
 *
 * Funding arithmetic follows the data layer's own rule and calls its selectors:
 * capital raised counts only `capital` rows that are not inside another row's
 * cumulative total. Contracts, prizes, grants, targets and sector aggregates are
 * different kinds of money, reported separately and never added in.
 */

import {
  BADGE_WORD,
  companies,
  interventions,
  NON_CAPITAL_STREAMS,
  STREAM_WORD,
  totalCapitalRaised,
  totalForStream,
  undisclosedCapitalRows,
  type Company,
  type FundingEntry,
  type Intervention,
} from '@/data';
import { byId, prefersReducedMotion, setHtml } from '@/lib/dom';
import { citationList } from '@/lib/citations';
import { money, moneyQualified } from '@/lib/format';
import { attr, html, type SafeHtml } from '@/lib/html';
import { pips } from './thresholds';

/**
 * A collapsed total must keep its hedge. If any counted capital entry is hedged —
 * or if any carries no disclosed amount at all — the summary says so rather than
 * presenting a rounded exact figure as if it were complete.
 */
export const hedgedTotal = (iv: Intervention): string => {
  const rows = iv.funding.filter(
    (f) => f.stream === 'capital' && f.withinCumulative === undefined && f.amount !== null,
  );
  const total = rows.reduce((n, f) => n + (f.amount ?? 0), 0);
  const atLeast =
    rows.some((f) => 'qualifier' in f && f.qualifier === 'at-least') ||
    undisclosedCapitalRows(iv) > 0;
  const approx = rows.some((f) => 'qualifier' in f && f.qualifier === 'approximately');
  return `${atLeast ? '≥ ' : approx ? '≈ ' : ''}${money(total) ?? ''}`;
};

/** Every badge word this category's funding entries actually use, in first-seen order. */
const badgeSet = (iv: Intervention): readonly FundingEntry['badge'][] => [
  ...new Set(iv.funding.map((f) => f.badge)),
];

const chip = (f: FundingEntry): SafeHtml => {
  const amount = moneyQualified(f);
  return html`<span
    class="chip${f.assertedAbsence ? ' chip--absence' : ''}"
    data-badge="${attr(f.badge)}"
    data-stream="${attr(f.stream)}"
  >
    <span class="chip-amt">${amount ?? html`<em>no figure disclosed</em>`}</span>
    <span class="chip-meta">${f.stream} · ${BADGE_WORD[f.badge]} · as of ${f.asOf}</span>
    <span class="chip-meta chip-who">${f.holder}</span>
  </span>`;
};

const moneyNotes = (iv: Intervention): SafeHtml =>
  html`<ul class="src-list">
    ${iv.funding.map((f) => {
      const bits: SafeHtml[] = [html`<strong>${f.holder}</strong> — ${STREAM_WORD[f.stream]}`];
      bits.push(html`${f.kind}`);
      if (f.cumulative) bits.push(html`a cumulative total that supersedes its parts`);
      if (f.withinCumulative !== undefined) {
        bits.push(
          html`inside the cumulative total held by ${f.withinCumulative} — excluded from the capital
          sum`,
        );
      }
      if ('qualifier' in f) {
        bits.push(html`the source hedges this figure: “${f.qualifier}”`);
      }
      if (f.note !== undefined) bits.push(html`${f.note}`);
      if (f.assertedAbsence) {
        bits.push(
          html`<em>absence reported, not inferred</em> — the source says: “${f.sourceQuote}”`,
        );
      }
      return html`<li>${bits.map((b, i) => html`${b}${i < bits.length - 1 ? '. ' : '.'}`)}</li>`;
    })}
  </ul>`;

const otherStreams = (iv: Intervention): SafeHtml | '' => {
  const rows = NON_CAPITAL_STREAMS.map((s) => {
    const total = totalForStream(iv, s);
    const count = iv.funding.filter((f) => f.stream === s).length;
    if (count === 0) return null;
    return html`<li>
      <strong>${STREAM_WORD[s]}</strong> — ${total ? money(total) : 'no dollar figure disclosed'}
      across ${count}${count === 1 ? ' entry' : ' entries'}. Not added to capital raised.
    </li>`;
  }).filter((r): r is SafeHtml => r !== null);

  return rows.length > 0
    ? html`<ul class="src-list">
        ${rows}
      </ul>`
    : '';
};

/**
 * Callers pass either bare text or their own block element. Wrapping a block that
 * already carries `.field-v` in another `.field-v` is dead markup, so only bare text
 * gets the wrapper.
 */
const field = (key: string, value: SafeHtml | '', className = ''): SafeHtml | '' => {
  if (value === '' || value.value.trim() === '') return '';
  const body = /^\s*</.test(value.value) ? value : html`<p class="field-v">${value}</p>`;
  return html`<div class="field${className ? ` ${className}` : ''}">
    <p class="field-k">${key}</p>
    ${body}
  </div>`;
};

const prose = (text: string): SafeHtml => html`<p class="field-v">${text}</p>`;

export const renderLedger = (): void => {
  setHtml(
    byId('ivList'),
    html`${interventions.map((iv) => {
      const capital = totalCapitalRaised(iv);
      const missing = undisclosedCapitalRows(iv);

      const capitalLine = capital
        ? html`<span class="num" style="font-size:1.35rem;font-weight:600">${money(capital)}</span>`
        : html`<span class="num">no dollar figure disclosed</span>`;

      const capitalNote =
        'Sum of entries the sources record as equity or debt actually raised, excluding any ' +
        "row that sits inside another row's cumulative total. " +
        (missing
          ? `${missing}${missing === 1 ? ' capital entry carries' : ' capital entries carry'}` +
            ' no disclosed amount, so the true figure is higher than this sum — a blank is not ' +
            'a zero. '
          : '') +
        'Offtakes, prizes, grants, capital being sought and sector roll-ups are listed ' +
        'separately below.';

      const left = html`${field('leverage', prose(iv.leverage))}
      ${field('maturity', prose(iv.maturity))}
      ${field('delivered — what actually exists', prose(iv.delivered))}
      ${
        iv.announcedNotDelivered !== undefined &&
        field('announced, not delivered', prose(iv.announcedNotDelivered), 'field--warn')
      }
      ${
        iv.unresolvedConflict !== undefined &&
        field('unresolved conflict in the sources', prose(iv.unresolvedConflict), 'field--warn')
      }
      ${iv.policyRisk !== undefined && field('policy risk', prose(iv.policyRisk), 'field--warn')}
      ${field('caveat', prose(iv.caveat), 'field--warn')}`;

      const right = html`${field(
        'capital raised',
        html`${capitalLine}
          <p class="note" style="margin:7px 0 0;font-size:.75rem;color:var(--ink-o2)">
            ${capitalNote}
          </p>`,
      )}
      ${field(
        'every money figure in this category, as its source labels it',
        html`<div class="chips">${iv.funding.map(chip)}</div>`,
      )}
      ${field('other kinds of money, kept separate', otherStreams(iv))}
      ${field('notes on the money', moneyNotes(iv))}
      ${field(
        'gap assessment',
        html`<div class="assess">
          ${pips(iv.gapScore, 5)}
          <span>${iv.gapScore} of 5 · editorial assessment, not a measurement</span>
        </div>`,
      )}
      ${
        iv.fieldwork !== undefined &&
        field(
          'fieldwork',
          html`<p class="field-v">
            <a href="${attr(iv.fieldwork.href)}">${iv.fieldwork.label} →</a>
          </p>`,
        )
      }
      ${field(
        'sources',
        html`<ul class="src-list">
          ${citationList(iv.sourceIds)}
        </ul>`,
      )}`;

      // The summary carries the whole rigor payload for this row: the hedged total
      // (≥/≈ preserved), every badge the category's funding entries use, and the gap
      // assessment with its label. Closing a row hides detail, never a qualifier.
      return html`<details class="iv" id="iv-${attr(iv.id)}">
        <summary>
          <span
            ><span class="iv-sec"
              >${iv.section}${
                iv.investable === false ? ` · ${iv.framing ?? 'not investable'}` : ''
              }</span
            ><br /><span class="iv-name">${iv.name}</span></span
          >
          <span class="iv-cap"
            >${capital ? hedgedTotal(iv) : '—'}
            <small>${capital ? 'capital raised' : 'no figure disclosed'}</small></span
          >
          <span class="iv-badges"
            >${badgeSet(iv).map(
              (b) => html`<span class="iv-badge" data-b="${attr(b)}">${BADGE_WORD[b]}</span>`,
            )}</span
          >
          <span class="iv-gap"
            >${pips(iv.gapScore, 5)}<span>gap ${iv.gapScore}/5<br />editorial</span></span
          >
          <span class="pull"
            ><i></i><span class="pull-shut">open entry</span
            ><span class="pull-open">close</span></span
          >
        </summary>
        <div class="iv-body">
          ${
            iv.investable === false &&
            html`<p class="co-stamp" style="margin-bottom:14px">
              ${iv.framing ?? 'research'} — not an investable category
            </p>`
          }
          <div class="iv-grid">
            <div>${left}</div>
            <div>${right}</div>
          </div>
        </div>
      </details>`;
    })}`,
  );
};

/** Cross-links open a native `<details>`; there is no aria state to maintain. */
export const openIntervention = (id: string, scrollTo: boolean): void => {
  const host = document.getElementById(`iv-${id}`);
  if (!(host instanceof HTMLDetailsElement)) return;
  host.open = true;
  if (!scrollTo) return;
  host.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
  host.querySelector('summary')?.focus({ preventScroll: true });
};

/* -------------------------------------------------------------------------- */
/* Company atlas                                                              */
/* -------------------------------------------------------------------------- */

const TIER_NUMERALS = ['I', 'II', 'III'] as const;

/**
 * Face: name · category and country · the key fact with its badge and as-of date ·
 * the not-investable flag. Drawer: the one-line description, and where a source
 * reports an **absence** of funding, its exact words.
 */
const companyCard = (c: Company): SafeHtml => {
  const flagged = c.investable === false;
  return html`<details class="co${flagged ? ' co--flag' : ''}">
    <summary>
      <span class="co-top"
        ><h4 class="co-name">${c.name}</h4>
        <span class="co-geo">${c.country}<br />${c.category.replace(/-/g, ' ')}</span></span
      >
      <span class="co-fact"
        ><span class="badge">${BADGE_WORD[c.keyFact.badge]} · as of ${c.keyFact.asOf}</span
        ><span style="display:block;margin-top:7px">${c.keyFact.text}</span></span
      >
      ${flagged && html`<span class="co-stamp">${c.framing ?? 'research'} — not investable</span>`}
      <span class="pull"
        ><i></i><span class="pull-shut">more</span><span class="pull-open">less</span></span
      >
    </summary>
    <div class="co-body">
      <p class="co-one" style="margin:0">${c.oneLiner}</p>
      ${
        c.keyFact.assertedAbsence &&
        html`<p class="co-quote">
          Absence reported, not inferred. The source says: “${c.keyFact.sourceQuote}”
        </p>`
      }
    </div>
  </details>`;
};

/**
 * All three tiers are drawers. Act II's scannable layer is the opportunity board; the
 * atlas is reference depth, and nineteen key facts on the default scroll is precisely
 * the wall that progressive disclosure exists to remove. Every card still carries
 * name, category and key fact on its own face once opened.
 */
export const renderCompanyAtlas = (): void => {
  const tiers = [
    { key: 'tier1', label: companies.tier1Label, list: companies.tier1 },
    { key: 'tier2', label: companies.tier2Label, list: companies.tier2 },
    { key: 'tier3', label: companies.tier3Label, list: companies.tier3 },
  ] as const;

  setHtml(
    byId('tiers'),
    html`${tiers.map(
      (t, i) =>
        html`<details class="tier">
          <summary class="tier-hd">
            <span class="tier-n">${TIER_NUMERALS[i]}</span
            ><span class="tier-lab"
              >${t.label} · ${t.list.length}${t.list.length === 1 ? ' company' : ' entries'}</span
            >
            <span class="pull"
              ><i></i><span class="pull-shut">show tier</span
              ><span class="pull-open">hide tier</span></span
            >
          </summary>
          <div class="co-grid">${t.list.map(companyCard)}</div>
        </details>`,
    )}`,
  );
};
