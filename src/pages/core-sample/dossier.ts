/**
 * The dossier — a specimen tray pulled from the right edge.
 *
 * Modal: scrim, focus moved into the pane, Tab trapped inside it, Escape closes and
 * focus returns to whatever opened it. Closing keeps the **selection**, so the globe
 * stays annotated and the tray can be pulled out again without re-picking.
 */

import { tippingSystems, type TippingSystemId } from '@/data';
import { byId, prefersReducedMotion, setHtml, setText } from '@/lib/dom';
import { citationList } from '@/lib/citations';
import { degC } from '@/lib/format';
import { attr, html, type SafeHtml } from '@/lib/html';
import { hideTip } from '@/lib/tooltip';
import { actOne, confidencePips, crossing, STATE_WORD, systemById } from './thresholds';

let lastTrigger: Element | null = null;
let open = false;

const row = (key: string, value: SafeHtml): SafeHtml =>
  html`<div class="dl-row">
    <div class="dl-k">${key}</div>
    <div class="dl-v">${value}</div>
  </div>`;

export const openTray = (): void => {
  const pane = byId('dossier');
  const scrim = byId('dosScrim');

  // The hover tooltip would otherwise be stranded over the page: focus moves into
  // the tray, so the marker or row that raised it never receives a blur.
  hideTip();

  pane.hidden = false;
  scrim.hidden = false;
  // A frame's delay so the transform transition has a start state to run from.
  requestAnimationFrame(() => {
    pane.setAttribute('data-open', '1');
    scrim.setAttribute('data-open', '1');
  });
  document.documentElement.setAttribute('data-tray', '1');
  open = true;
  byId('dosClose').focus();
};

export const closeTray = (): void => {
  const pane = byId('dossier');
  const scrim = byId('dosScrim');

  hideTip();
  pane.setAttribute('data-open', '0');
  scrim.setAttribute('data-open', '0');
  document.documentElement.removeAttribute('data-tray');
  open = false;

  const finish = (): void => {
    pane.hidden = true;
    scrim.hidden = true;
  };
  if (prefersReducedMotion()) finish();
  else setTimeout(finish, 380);

  if (lastTrigger instanceof HTMLElement && document.contains(lastTrigger)) {
    lastTrigger.focus({ preventScroll: false });
    // AFTER the focus restore, not before: the trigger's own focus handler raises
    // the hover tooltip, which would otherwise be left stranded.
    hideTip();
  }
  updateTrayTab();
};

/** Select an element and pull the tray out for it. */
export const selectSystem = (id: TippingSystemId, trigger?: Element): void => {
  if (trigger) lastTrigger = trigger;
  actOne.set({ selected: id });
  updateTrayTab();
  if (!open) openTray();
};

/** The reading-panel control that pulls the tray back out. */
export const updateTrayTab = (): void => {
  const button = document.getElementById('dosOpenLast');
  if (!(button instanceof HTMLButtonElement)) return;

  const { selected } = actOne.get();
  if (!selected) {
    button.disabled = true;
    button.textContent = 'No element selected yet';
    return;
  }
  const s = systemById(selected);
  button.disabled = false;
  button.textContent = `Pull the dossier · ${s?.short ?? ''}`;
};

export const trapTrayFocus = (ev: KeyboardEvent): void => {
  if (ev.key !== 'Tab' || !open) return;
  const focusable = byId('dossier').querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input, [tabindex="0"]',
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;

  if (ev.shiftKey && document.activeElement === first) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && document.activeElement === last) {
    ev.preventDefault();
    first.focus();
  }
};

export const fillDossier = (id: TippingSystemId): void => {
  const s = systemById(id);
  if (!s) return;

  const { degreesC } = actOne.get();
  const th = s.threshold;
  const c = crossing(s, degreesC);

  setText(
    byId('dosTier'),
    `${s.tier === 'global-core' ? 'global core element' : 'regional-impact element'} · ` +
      s.category.replace(/-/g, ' '),
  );
  setText(byId('dosName'), s.name);

  // "0% of the way through" reads as a mistake; at the floor, say so in words.
  const progress =
    c.state === 'inside'
      ? Math.round(c.frac * 100) < 1
        ? ' — right at its lower estimate'
        : ` — ${String(Math.round(c.frac * 100))}% of the way through the band`
      : '';

  const flags = html`${s.contested && html`<span class="flag flag--contested">timing contested</span> `}
  ${s.directHandle && html`<span class="flag flag--handle">non-warming handle</span>`}`;

  const body = html`<div class="dl">
    ${row(
      'threshold · °C above pre-industrial',
      html`<div class="thr-line">
          <span class="c">${th.central.toFixed(1)}</span>
          <span class="r">central · range ${th.min.toFixed(1)}–${th.max.toFixed(1)}</span>
          <span class="conf">${confidencePips(th.confidence)}${th.confidence} confidence</span>
        </div>
        <p class="note" style="margin:7px 0 0;font-size:.75rem">
          At the dial's current setting of ${degC(degreesC)}:
          <strong>${STATE_WORD[c.state]}</strong>${progress}${
            c.state === 'inside' && c.pastCentral ? ', above the central estimate' : ''
          }.
        </p>`,
    )}
    ${row(
      'trigger to impact',
      html`<span class="num">${s.timescale.triggerToImpact}</span>
        ${
          s.timescale.note &&
          html`<p class="note" style="margin:5px 0 0;font-size:.75rem">${s.timescale.note}</p>`
        }
        <p class="note" style="margin:5px 0 0;font-size:.75rem">
          Crossing the threshold and feeling the impact are different events. This row is the gap
          between them.
        </p>`,
    )}
    ${row('what happens', html`${s.plain}`)} ${row('impacts', html`${s.impacts}`)}
    ${row('observed now', html`${s.observed}`)} ${row('what to watch', html`${s.signal}`)}
    ${row('reversibility', html`${s.reversibility}`)}
    ${s.contestedNote && row('why the timing is contested', html`${s.contestedNote}`)}
    ${s.directHandle && row('direct handle', html`${s.directHandle}`)}
    ${(s.contested === true || s.directHandle !== undefined) && row('flags', flags)}
    ${row(
      'destabilises',
      s.cascades.length > 0
        ? html`<div class="cascade-links">
            ${s.cascades.map((cid) => {
              const target = tippingSystems.find((x) => x.id === cid);
              return target
                ? html`<button type="button" data-goto="${attr(cid)}">${target.short} →</button>`
                : '';
            })}
          </div>`
        : html`<span class="note">No onward cascade recorded in this dataset.</span>`,
    )}
    ${row(
      'sources',
      html`<ul class="src-list">
        ${citationList(s.sourceIds)}
      </ul>`,
    )}
  </div>`;

  setHtml(byId('dosBody'), body);

  for (const button of byId('dosBody').querySelectorAll<HTMLElement>('[data-goto]')) {
    button.addEventListener('click', () => {
      const goto = button.getAttribute('data-goto');
      if (goto) selectSystem(goto as TippingSystemId, button);
    });
  }
};
