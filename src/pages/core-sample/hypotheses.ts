/**
 * Rust — the hypothesis engine, tagged like core samples.
 *
 * Kill criteria are printed above validation criteria on every tag. A claim that
 * cannot be killed is not a hypothesis, and the ordering says so without a caption.
 */

import { hypotheses, interventions, sources, type Hypothesis } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { capitalise, numberWord } from '@/lib/format';
import { attr, html } from '@/lib/html';
import { wireJumps } from './opportunity';

/**
 * A one-line why-now for the card face. Cuts at a **clause** boundary, never mid
 * figure, so a range like "84–87×" cannot be split across the fold; the full
 * paragraph sits in the drawer one interaction away.
 *
 * The sentence boundary is "a full stop followed by space and a capital or an opening
 * bracket", which is why a decimal like 1.5 never splits the line. Written with
 * lookahead only — a lookbehind here is a parse-time SyntaxError on Safari ≤ 16.3.
 */
export const oneLine = (text: string): string => {
  const match = /^[\s\S]*?\.(?=\s+[A-Z(])/.exec(text);
  const first = (match ? match[0] : text).trim() || text;
  if (first.length <= 132) return first;

  const cut = first.slice(0, 128);
  let b = Math.max(cut.lastIndexOf(';'), cut.lastIndexOf(', '), cut.lastIndexOf(' — '));
  if (b < 60) b = cut.lastIndexOf(' ');
  return `${first.slice(0, b).replace(/[,;]$/, '')} …`;
};

/** The TRL token only — the full maturity string is a field in the drawer. */
export const trlOf = (maturity: string): string => {
  const match = /TRL\s*\d+(\s*[–/-]\s*\d+)?/i.exec(maturity);
  return match ? match[0].replace(/\s+/g, ' ') : (maturity.split(/[(;]/)[0]?.trim() ?? maturity);
};

const relatedTo = (h: Hypothesis) =>
  h.relatedInterventions
    .map((id) => interventions.find((iv) => iv.id === id))
    .filter((iv) => iv !== undefined);

export const renderHypotheses = (): void => {
  setText(byId('act3ClaimsN'), capitalise(numberWord(hypotheses.length)));

  setHtml(
    byId('tags'),
    html`${hypotheses.map((h) => {
      const related = relatedTo(h);
      const first = related[0];
      const flagged = h.investable === false;

      // Face: claim · one-line why-now · maturity token · falsifiability signal · the
      // non-investable flag. Drawer: all seven fields in full, kill criteria still
      // printed above validation. Nothing is dropped from the DOM.
      return html`<details class="tag rise" id="hyp-${attr(h.id)}">
        <summary>
          <span class="tag-punch" aria-hidden="true"></span>
          <span class="tag-wire" aria-hidden="true"></span>
          <div class="tag-hd">
            <span class="tag-id">${h.id}</span>
            ${
              first
                ? html`<span
                    class="tag-xlink"
                    data-jump="iv-${attr(first.id)}"
                    data-open-iv="${attr(first.id)}"
                    role="link"
                    tabindex="0"
                    ><em>acts on · act II</em>${first.section} ${first.name} ↑</span
                  >`
                : html`<span class="tag-none"
                    >no act II category<br />this claim is about the observing system</span
                  >`
            }
          </div>
          <h3 class="tag-claim">${h.claim}</h3>
          ${flagged && html`<span class="tag-stamp">research milestone — not investable</span>`}
          <p class="tag-oneline"><b>why now</b>${oneLine(h.whyNow)}</p>
          <p class="tag-sig">
            <span class="tag-sig-i"><b>${trlOf(h.maturity)}</b></span>
            <span class="tag-sig-i tag-sig-i--kill">falsifiable · kill criteria stated</span>
          </p>
          <span class="pull"
            ><i></i><span class="pull-shut">open the seven fields</span
            ><span class="pull-open">close</span></span
          >
        </summary>

        <div class="tag-body">
          <div class="tag-f">
            <p class="tag-k">mechanism</p>
            <p class="tag-v">${h.mechanism}</p>
          </div>
          <div class="tag-f">
            <p class="tag-k">why now — in full</p>
            <p class="tag-v">${h.whyNow}</p>
          </div>
          <div class="tag-f tag-f--kill">
            <p class="tag-k">kill criteria — what would end this</p>
            <p class="tag-v">${h.killCriteria}</p>
          </div>
          <div class="tag-f tag-f--val">
            <p class="tag-k">validation — what would carry it</p>
            <p class="tag-v">${h.validation}</p>
          </div>
          <div class="tag-f">
            <p class="tag-k">maturity</p>
            <p class="tag-v">${h.maturity}</p>
          </div>
          <div class="tag-f">
            <p class="tag-k">nearest actors</p>
            <ul class="tag-actors">
              ${h.nearestActors.map((a) => html`<li>${a}</li>`)}
            </ul>
          </div>
          <div class="tag-f">
            <p class="tag-k">claim — in full</p>
            <p class="tag-v">${h.claim}</p>
          </div>
          ${
            related.length > 1 &&
            html`<div class="tag-f">
              <p class="tag-k">also acts on</p>
              <p class="tag-v">
                ${related
                  .slice(1)
                  .map((iv) => `${iv.section} ${iv.name}`)
                  .join(' · ')}
              </p>
            </div>`
          }
          <div class="tag-f">
            <p class="tag-k">sources</p>
            <p class="tag-src">
              ${sources(h.sourceIds)
                .map((s) => `${s.label.split(',')[0] ?? s.label} (${s.date})`)
                .join(' · ')}
            </p>
          </div>
          ${
            h.fieldwork !== undefined &&
            html`<div class="tag-f">
              <p class="tag-k">fieldwork</p>
              <p class="tag-v"><a href="${attr(h.fieldwork.href)}">${h.fieldwork.label} →</a></p>
            </div>`
          }
          <p class="tag-order">
            kill criteria are printed above validation criteria — a claim that cannot be killed is
            not a hypothesis
          </p>
        </div>
      </details>`;
    })}`,
  );

  wireJumps(byId('tags'));
};
