/**
 * The opportunity board — what Act II leads with.
 *
 * Membership is derived: every category whose gap assessment reaches the board
 * threshold. Nothing is hardcoded, so the board follows the data if it changes.
 *
 * **Ordering rule, and it matters for honesty.** Within an equal gap assessment,
 * categories with a *disclosed* capital figure rank first, smallest first. Categories
 * with no disclosed figure come after and are marked unranked — a blank is not a
 * zero, so an undisclosed category cannot be presented as more starved of capital
 * than one whose small figure is actually known.
 */

import {
  hypotheses,
  interventions,
  isOpportunity,
  OPPORTUNITY_THRESHOLD,
  totalCapitalRaised,
  type Hypothesis,
  type Intervention,
} from '@/data';
import { byId, prefersReducedMotion, setHtml, setText } from '@/lib/dom';
import { money } from '@/lib/format';
import { attr, html } from '@/lib/html';
import { openIntervention } from './ledger';
import { pips } from './thresholds';

interface BoardEntry {
  readonly iv: Intervention;
  readonly capital: number;
  readonly known: boolean;
}

const board = (): readonly BoardEntry[] =>
  interventions
    .filter(isOpportunity)
    .map((iv) => {
      const capital = totalCapitalRaised(iv);
      return { iv, capital, known: capital > 0 };
    })
    .sort((a, b) => {
      if (b.iv.gapScore !== a.iv.gapScore) return b.iv.gapScore - a.iv.gapScore;
      if (a.known !== b.known) return a.known ? -1 : 1;
      return a.capital - b.capital;
    });

/** Hypotheses that name this category in `relatedInterventions`. */
const hypothesesFor = (id: string): readonly Hypothesis[] =>
  hypotheses.filter((h) => h.relatedInterventions.includes(id));

/**
 * Category names in the data are full and precise ("Direct ocean capture & ocean
 * alkalinity enhancement"). A headline needs the short form, so it is derived rather
 * than restated: drop anything after the first "&" or "(", and where a name is a
 * slash-pair keep the more specific half. The full name is printed unaltered on the
 * card itself.
 */
const shortName = (name: string): string => {
  let s = name.split(/[&(]/)[0]?.trim() ?? name;
  if (s.includes('/')) s = s.split('/').pop()?.trim() ?? s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};

/** A hypothesis claim is a paragraph; the cross-link needs a phrase. */
const shortClaim = (h: Hypothesis): string => {
  let s = h.claim.split(/[—:;]/)[0]?.trim() ?? h.claim;
  if (s.length > 74) s = `${s.slice(0, 72).replace(/\s+\S*$/, '')}…`;
  return s;
};

/**
 * Cross-links between acts. The target announces itself so the reader can see where
 * they landed after the jump.
 */
export const wireJumps = (root: ParentNode): void => {
  for (const el of root.querySelectorAll<HTMLElement>('[data-jump]')) {
    const go = (ev: Event): void => {
      // Some of these links sit INSIDE a <summary>; without this the click would also
      // toggle the drawer they happen to be printed on.
      ev.preventDefault();
      ev.stopPropagation();
      const ivId = el.getAttribute('data-open-iv');
      if (ivId) openIntervention(ivId, true);
      const target = el.getAttribute('data-jump');
      if (target) jumpTo(target, !ivId);
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') go(ev);
    });
  }
};

export const jumpTo = (id: string, scroll: boolean): void => {
  const el = document.getElementById(id);
  if (!el) return;

  // If the target is itself a drawer, open it: landing on a shut tag hides the thing
  // the link promised. Opened BEFORE scrolling so block:"center" measures the final
  // height.
  if (el instanceof HTMLDetailsElement) el.open = true;
  if (scroll) {
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }

  el.classList.remove('jumped');
  void el.offsetWidth; // reflow, so the animation restarts on a repeat jump
  el.classList.add('jumped');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
};

export const renderOpportunity = (): void => {
  const entries = board();
  if (entries.length === 0) return;

  // The reference point for the contrast: the best-capitalised category on the page.
  const reference = interventions.reduce((best, iv) =>
    totalCapitalRaised(iv) > totalCapitalRaised(best) ? iv : best,
  );
  const referenceCapital = totalCapitalRaised(reference);

  const named = entries
    .filter((b) => b.known)
    .slice(0, 2)
    .map((b) => shortName(b.iv.name));

  setText(
    byId('oppEyebrow'),
    `opportunity · ${entries.length} of ${interventions.length} categories ` +
      `at gap ${OPPORTUNITY_THRESHOLD} or above`,
  );
  setText(
    byId('oppLede'),
    named.length > 0
      ? `Where capital is most missing relative to leverage: ${named.join(', and ')}.`
      : 'Where capital is most missing relative to leverage.',
  );
  setText(
    byId('oppSub'),
    'Most underfunded against their potential. The gap is an editorial assessment; the money ' +
      'figures beside it are not.',
  );

  setHtml(
    byId('oppGrid'),
    html`${entries.map((b) => {
      const related = hypothesesFor(b.iv.id);
      const pct =
        b.known && referenceCapital ? Math.max(0.4, (b.capital / referenceCapital) * 100) : 100;

      return html`<article class="opp-card${b.known ? '' : ' opp-card--unranked'}">
        <div class="opp-rank">
          <b>${b.iv.section}</b>
          <span
            >${b.known ? 'ranked on disclosed capital' : 'unranked · capital not disclosed'}</span
          >
        </div>
        <h4 class="opp-name">${b.iv.name}</h4>
        <div class="opp-gap">
          ${pips(b.iv.gapScore, 5)}
          <em>gap ${b.iv.gapScore} of 5 · editorial assessment, not a measurement</em>
        </div>

        <!-- The contrast sits directly under the name so the bar pairs line up as a
             row and can be compared at a glance; the leverage argument reads
             underneath as the supporting prose. -->
        <div class="opp-bars">
          <div class="opp-bar">
            <div class="opp-bar-k">
              <span>raised here</span><b>${b.known ? money(b.capital) : 'no figure disclosed'}</b>
            </div>
            <div class="opp-bar-t">
              <div
                class="opp-bar-f${b.known ? '' : ' opp-bar-f--none'}"
                style="width:${pct.toFixed(2)}%"
              ></div>
            </div>
          </div>
          <div class="opp-bar opp-bar--ref">
            <div class="opp-bar-k">
              <span
                >best-capitalised category here ·
                ${reference.name.split(/[(&]/)[0]?.trim().toLowerCase() ?? ''}</span
              ><b>${money(referenceCapital)}</b>
            </div>
            <div class="opp-bar-t"><div class="opp-bar-f" style="width:100%"></div></div>
          </div>
        </div>

        <p class="opp-lev">${b.iv.leverage}</p>
        <div class="opp-hyp">
          <p class="opp-hyp-k">
            ${
              related.length > 0
                ? 'hypotheses that would test this · act III'
                : 'no hypothesis in act III addresses this category directly'
            }
          </p>
          ${
            related.length > 0 &&
            html`<div class="xlinks">
              ${related.map(
                (h) =>
                  html`<button class="xlink" type="button" data-jump="hyp-${attr(h.id)}">
                    <b>${h.id}</b> ${shortClaim(h)}
                  </button>`,
              )}
            </div>`
          }
          <div class="xlinks" style="margin-top:6px">
            <button
              class="xlink"
              type="button"
              data-jump="iv-${attr(b.iv.id)}"
              data-open-iv="${attr(b.iv.id)}"
            >
              Full ledger entry ↓
            </button>
          </div>
        </div>
      </article>`;
    })}`,
  );

  setText(
    byId('oppFoot'),
    'Ordering: by gap assessment, then — among equal assessments — by disclosed capital, ' +
      'smallest first. Categories whose sources disclose no capital figure are placed after ' +
      'those that do and marked unranked, because a blank is not a zero and cannot be read as ' +
      'the smallest number.',
  );

  wireJumps(byId('oppGrid'));
};
