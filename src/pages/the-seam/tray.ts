/**
 * The dossier tray — a right-sliding pane, carried from the lead page.
 *
 * One tray, three kinds of content: a mine's dossier, and the model's assumptions.
 * Focus is trapped while it is open, Escape closes it, and focus returns to whatever
 * opened it.
 */

import { amm, mine } from '@/data';
import { byId, prefersReducedMotion, setHtml, setText } from '@/lib/dom';
import { citationList } from '@/lib/citations';
import { megatonnes } from '@/lib/format';
import { attr, html, type SafeHtml } from '@/lib/html';
import { hideTip } from '@/lib/tooltip';
import { co2eBoth } from './warming-lenses';
import {
  defaultValue,
  override,
  parameters,
  resetOverrides,
  P,
  type Parameter,
  type ParamKey,
} from './params';

let lastTrigger: Element | null = null;
let open = false;

/** See the lead page's dossier: a reopen inside the 380 ms close transition would
 *  otherwise be hidden by the pending timer, with focus left inside it. */
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** Repaint hook, so the tray does not have to import the twin panel. */
let onAssumptionChange: (() => void) | null = null;
export const wireAssumptionRepaint = (handler: () => void): void => {
  onAssumptionChange = handler;
};

export const openTray = (): void => {
  const pane = byId('dossier');
  const scrim = byId('dosScrim');
  clearTimeout(hideTimer);
  hideTip();
  pane.hidden = false;
  scrim.hidden = false;
  requestAnimationFrame(() => {
    pane.setAttribute('data-open', '1');
    scrim.setAttribute('data-open', '1');
  });
  document.documentElement.setAttribute('data-tray', '1');
  open = true;
  byId('dosClose').focus();
};

export const closeTray = (): void => {
  if (!open) return;

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
  clearTimeout(hideTimer);
  if (prefersReducedMotion()) finish();
  else hideTimer = setTimeout(finish, 380);

  if (lastTrigger instanceof HTMLElement && document.contains(lastTrigger)) {
    lastTrigger.focus({ preventScroll: false });
    hideTip();
  }
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

const row = (key: string, value: SafeHtml): SafeHtml =>
  html`<div class="dl-row">
    <div class="dl-k">${key}</div>
    <div class="dl-v">${value}</div>
  </div>`;

/* -------------------------------------------------------------------------- */
/* The assumptions pane                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Stamp inks are chosen for the carbon tray they render in — bare ember measured 4.4:1
 * there, which is under AA for small text.
 */
const stampFor = (p: Parameter): readonly [string, string] => {
  if (p.src === 'editorial') return ['ESTIMATE', '#E3D5B8'];
  return p.verified ? ['CITED', '#8FB8C7'] : ['PENDING', '#F6A97F'];
};

const stepFor = (value: number): string =>
  Math.abs(value) >= 1000 ? '1000' : Math.abs(value) >= 1 ? '1' : '0.01';

/**
 * The parameter block rendered as a table, editable where a constant is editorial. One
 * interactive surface; the methods section shows the same table read-only.
 */
export const assumptionsTable = (editable: boolean): SafeHtml =>
  html`<div class="dl">
    ${(Object.keys(parameters) as ParamKey[]).map((k) => {
      const p = parameters[k];
      const [stamp, ink] = stampFor(p);
      const value = P(k);
      return html`<div class="dl-row">
        <div class="dl-k">
          ${k} · ${p.unit} · <span style="color:${ink}">${stamp}</span> · ${p.src}
        </div>
        <div class="dl-v" style="font-size:.8125rem">
          ${
            editable && p.editable
              ? html`<input
                  type="number"
                  value="${attr(value)}"
                  data-param="${attr(k)}"
                  step="${stepFor(value)}"
                  style="width:9ch;font-family:var(--mono);background:transparent;color:inherit;border:1px solid var(--rule-hi);padding:3px 5px"
                />`
              : html`<span class="num">${value}</span>`
          }
          — ${p.note}
        </div>
      </div>`;
    })}
  </div>`;

export const openAssumptions = (trigger?: Element): void => {
  if (trigger) lastTrigger = trigger;

  setText(byId('dosTier'), 'the parameter block · every constant, sourced and stamped');
  setText(byId('dosName'), 'Model assumptions');
  setHtml(
    byId('dosBody'),
    html`<p class="note" style="margin-bottom:12px">
        The model reads constants only through a guard that refuses an unsourced key. CITED —
        verified against its source. PENDING — provisional until the verification pass; zero may
        remain at publication. ESTIMATE — editorial judgment, stated: change it and the whole page
        recomputes.
      </p>
      ${assumptionsTable(true)}
      <p style="margin-top:14px">
        <button class="dos-tab" id="assumpReset" type="button">reset to editorial defaults</button>
      </p>`,
  );

  for (const input of byId('dosBody').querySelectorAll<HTMLInputElement>('input[data-param]')) {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-param') as ParamKey | null;
      if (!key) return;
      const v = Number.parseFloat(input.value);
      if (!Number.isFinite(v)) {
        input.value = String(P(key));
        return;
      }
      override(key, v);
      onAssumptionChange?.();
    });
  }

  byId('assumpReset').addEventListener('click', () => {
    resetOverrides();
    onAssumptionChange?.();
    openAssumptions();
  });

  if (!open) openTray();
};

/** Kept for the reset button's copy: the shipped value, whatever the reader has done. */
export const shippedDefault = defaultValue;

/* -------------------------------------------------------------------------- */
/* The mine dossier                                                           */
/* -------------------------------------------------------------------------- */

const byMcmDescending = [...amm.mines].sort((a, b) => b.mcm - a.mcm);

/**
 * Every figure hedged; the unknown status rendered as the uncertainty it is, never
 * resolved by assumption.
 */
export const openMine = (id: string, trigger?: Element): void => {
  const m = mine(id);
  if (trigger) lastTrigger = trigger;

  const rank = byMcmDescending.indexOf(m) + 1;
  // The flagged MCM→kt conversion, labelled where it renders.
  const kt = m.mcm * amm.conversion.kgPerM3;
  const both = co2eBoth(kt);
  const g = amm.gwp;

  setText(byId('dosTier'), `mine dossier · ${m.country}${m.region ? ` · ${m.region}` : ''}`);
  setText(byId('dosName'), m.name);

  setHtml(
    byId('dosBody'),
    html`<div class="dl">
      ${row(
        'modelled emissions',
        html`<div class="thr-line">
            <span class="c">≈${m.mcm}</span>
            <span class="r"
              >MCM CH₄ / yr · rank ${rank} of ${amm.mines.length} in the EU dataset</span
            >
          </div>
          <p class="note" style="margin:7px 0 0;font-size:.75rem">
            Modelled (GEM 2024, adapted Kholod M2CM), scenario-averaged where status is unknown.
            Nothing at this mine is measured — which is the point of the thesis.
          </p>`,
      )}
      ${row(
        'in both warming lenses',
        html`<span class="num">≈${megatonnes(both.mt20)} Mt CO₂e/yr</span> at 20 years ·
          <span class="num">≈${megatonnes(both.mt100)} Mt</span> at 100 years
          <p class="note" style="margin:7px 0 0;font-size:.75rem">
            Tonnage at ${amm.conversion.kgPerM3} kg/m³ — the IPCC 2006 coal-mining convention, which
            the briefing's own MCM↔kt pairs match exactly. GWP ${g.gwp20}× / ${g.gwp100}×
            (${g.basis}).
          </p>`,
      )}
      ${row(
        'closed',
        m.closed !== null
          ? html`<span class="num">${m.closed}</span>`
          : html`not stated in the briefing — itself a data point about the inventory`,
      )}
      ${row(
        'flooded status',
        html`<span class="flag flag--contested">${m.status}</span> ${
            m.floodedDelta
              ? html`<p class="note" style="margin:7px 0 0;font-size:.75rem">
                  GEM's own pair: ≈${m.floodedDelta.dry} MCM/yr dry vs ≈${m.floodedDelta.flooded}
                  MCM/yr flooded. ${m.floodedDelta.note}
                </p>`
              : html`<p class="note" style="margin:7px 0 0;font-size:.75rem">
                  Flooded mines mostly stop emitting within about a decade; a dry, sealed mine keeps
                  leaking. One unknown bit, and it is the biggest error bar in the number above.
                </p>`
          }`,
      )}
      ${m.note ? row('notes', html`${m.note}`) : ''}
      ${row(
        'sources',
        html`<ul class="src-list">
          ${citationList(m.sourceIds)}
        </ul>`,
      )}
    </div>`,
  );

  if (!open) openTray();
};
