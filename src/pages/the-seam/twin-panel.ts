/**
 * The bench — the twin's controls, its readouts, and the editorial economics beside them.
 *
 * The two segmented controls are the page's argument in miniature: flooded status and
 * seal quality are both *unread bits*, and both default to the honest answer rather
 * than to a convenient one.
 */

import { amm } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { grouped, megatonnes } from '@/lib/format';
import { attr, html } from '@/lib/html';
import { P } from './params';
import { formatCo2e } from './warming-lenses';
import { abatedRange, ECON, type Twin } from './twin-model';
import {
  currentTwin,
  playheadYear,
  shortMineName,
  specimens,
  twin,
  type FloodStatus,
  type SealQuality,
} from './twin-state';
import {
  drawCounters,
  drawDecline,
  drawRoute,
  paintNowLines,
  renderTwinReadout,
} from './twin-charts';
import { drawShaft, drawStaticGas, paintShaftModules, paintShaftWater } from './twin-shaft';
import { prefersReducedMotion } from '@/lib/dom';

const FLOOD_OPTIONS: readonly FloodStatus[] = ['dry', 'unknown', 'flooded'];
const SEAL_OPTIONS: readonly SealQuality[] = ['sealed', 'unsurveyed', 'leaky'];

let onAssumptions: (() => void) | null = null;
export const wireAssumptionsButton = (handler: () => void): void => {
  onAssumptions = handler;
};

const eurMillions = (v: number): string => `€${(v / 1e6).toFixed(1)}M`;

/**
 * The economics readout — every figure editorial, stamped, and linear in the
 * assumptions the pane exposes. Engine-era power revenue is deliberately omitted:
 * costs are stated at their worst.
 */
export const paintEconomics = (tw: Twin): void => {
  const { startYear, price } = twin.get();
  setText(byId('econStartVal'), String(startYear));
  setText(byId('econPriceVal'), String(price));

  const end = Math.min(startYear + P('project_life'), P('horizon'));
  const kt = abatedRange(tw, startYear, end);
  // Credits price on the 100-year lens; the 20-year figure is carried alongside.
  const t100 = kt * amm.gwp.gwp100 * 1000;
  const t20 = kt * amm.gwp.gwp20 * 1000;
  const cost = P('capex_unit') + P('opex_unit') * (end - startYear);
  const eurPerTonne = t100 > 0 ? cost / t100 : Infinity;
  const net = price > 0 ? cost - price * t100 : null;

  const forfeitedKt = abatedRange(tw, 2026, startYear);
  const forfeited20 = forfeitedKt * amm.gwp.gwp20;

  setHtml(
    byId('econOut'),
    html`<p class="bench-note" style="font-size:.75rem">
        One unit on this vent, ${startYear}–${Math.round(end)}, dry path: destroys
        ≈${kt < 100 ? kt.toFixed(1) : grouped(kt)} kt CH₄ ≈ ${formatCo2e(t20)} CO₂e (20-yr) ·
        ${formatCo2e(t100)} (100-yr). All-in ≈${eurMillions(cost)} →
        <b>≈€${eurPerTonne < 10 ? eurPerTonne.toFixed(1) : Math.round(eurPerTonne)} per t CO₂e</b>
        at the 100-yr
        lens${
          net === null
            ? ''
            : net < 0
              ? ` — carbon at €${price} covers it, ≈${eurMillions(Math.abs(net))} over`
              : ` — carbon at €${price} leaves ≈${eurMillions(net)} uncovered`
        }.
      </p>
      ${
        forfeitedKt > 0.05 &&
        html`<p class="bench-note" style="font-size:.75rem;color:var(--kraft-kill)">
          Starting in ${startYear} instead of 2026 forfeits ≈${forfeitedKt.toFixed(1)} kt CH₄
          (≈${megatonnes(forfeited20 / 1000)} Mt CO₂e at 20 yr) — hatched on the decline chart. The
          best years never come back.
        </p>`
      }
      <p class="bench-note" style="font-size:.6875rem">
        Editorial sandbox: capex, opex, capture share and destruction efficiency are all editable in
        the assumptions pane. Engine-era power revenue is deliberately omitted — costs are stated at
        their worst.
      </p>`,
  );
};

/** Repaint everything the specimen or an assumption change touches. */
export const paintTwin = (): void => {
  const tw = currentTwin();
  const m = tw.mine;

  setText(byId('twinMineName'), `${m.name} · ${m.country}`);
  setText(
    byId('twinMineSub'),
    (m.closed !== null ? `closed ${m.closed}` : `closure year assumed ${tw.closed} — editorial`) +
      ` · GEM figure ≈${tw.anchor} MCM/yr` +
      (m.floodedDelta ? ' (dry path)' : ' (scenario-average, treated as dry-path anchor)'),
  );
  setText(
    byId('declineK'),
    `modelled decline · ${m.name} · ${tw.closed}–${String(P('horizon'))} · ` +
      'adapted Kholod M2CM, parameters editorial',
  );

  drawDecline(tw);
  renderTwinReadout(tw);
  drawShaft();
  drawRoute();

  const playhead = byId<HTMLInputElement>('playhead');
  playhead.min = String(tw.closed);
  playhead.max = String(P('horizon'));
  playhead.step = '0.25';
  const year = playheadYear(tw);
  twin.set({ year });
  playhead.value = String(year);

  paintPlayhead();
  paintEconomics(tw);
};

export const paintPlayhead = (): void => {
  const tw = currentTwin();
  const year = playheadYear(tw);
  setText(byId('playheadVal'), String(Math.round(year)));

  paintShaftWater(tw);
  paintShaftModules(tw);
  if (prefersReducedMotion()) drawStaticGas(tw);
  drawCounters(tw);
  paintNowLines(year);
};

export const buildTwinPanel = (): void => {
  const state = twin.get();

  setHtml(
    byId('twinHost'),
    html`<p class="inst-eyebrow rise">instrument <b>01</b> · two futures, one unknown bit</p>
      <div class="twin-grid rise">
        <div>
          <div class="bench">
            <div>
              <p class="bench-k">specimen mine</p>
              <p
                style="margin:0;font-family:var(--disp);font-weight:600;font-size:1.05rem"
                id="twinMineName"
              ></p>
              <p class="bench-note" id="twinMineSub" style="margin-top:4px"></p>
            </div>

            <div>
              <p class="bench-k">flooded status — the dice the inventory cannot read</p>
              <div class="seg" role="radiogroup" aria-label="Assumed flooded status" id="floodSeg">
                ${FLOOD_OPTIONS.map(
                  (s) =>
                    html`<label
                      ><input
                        type="radio"
                        name="flood"
                        value="${s}"
                        ${s === state.status ? 'checked' : ''}
                      />${s === 'unknown' ? 'unknown · default' : s}</label
                    >`,
                )}
              </div>
              <p class="bench-note" style="margin-top:7px">
                Unknown is the honest default: the reader lands on two futures and the gap between
                them.
              </p>
            </div>

            <div>
              <p class="bench-k">seal quality — the second unread dice</p>
              <div class="seg" role="radiogroup" aria-label="Assumed seal quality" id="sealSeg">
                ${SEAL_OPTIONS.map(
                  (s) =>
                    html`<label
                      ><input
                        type="radio"
                        name="seal"
                        value="${s}"
                        ${s === state.seal ? 'checked' : ''}
                      />${s === 'unsurveyed' ? 'unsurveyed · default' : s}</label
                    >`,
                )}
              </div>
              <p class="bench-note" style="margin-top:7px">
                Purity is not a clock — it is a seal (UNECE №64). A seal survey costs thousands;
                betting without one costs millions.
              </p>
            </div>

            <div>
              <p class="bench-k">the bench — swap the specimen</p>
              <div class="unit-chips" id="mineTags" style="margin:0">
                ${specimens.map(
                  (m) =>
                    html`<button
                      type="button"
                      class="uchip"
                      data-mine="${attr(m.id)}"
                      aria-pressed="${m.id === state.mineId ? 'true' : 'false'}"
                    >
                      <b>${shortMineName(m)}</b>≈${m.mcm} MCM
                    </button>`,
                )}
              </div>
            </div>

            <p style="margin:0">
              <span class="mod-stamp">specimen model — modelled, not measured</span>
            </p>
          </div>
          <div class="twin-readout" aria-live="polite" id="twinReadout"></div>
        </div>

        <div>
          <div class="twin-plot">
            <p class="readout-k" id="declineK"></p>
            <svg id="declineSvg" role="img"></svg>
          </div>
          <details class="fn">
            <summary>
              <span class="pull-shut">how to read the decline chart</span
              ><span class="pull-open">close</span>
            </summary>
            <div class="fn-body"><p class="note" id="declineFoot" style="margin:0"></p></div>
          </details>
        </div>
      </div>

      <p class="inst-eyebrow rise">instrument <b>02</b> · the living mine — and the money</p>
      <div class="twin-grid rise">
        <div>
          <div class="twin-plot">
            <p class="readout-k" id="shaftK"></p>
            <svg id="shaftSvg" role="img"></svg>
          </div>
        </div>

        <div>
          <div class="twin-plot">
            <p class="readout-k" id="routeK"></p>
            <svg id="routeSvg" role="img"></svg>
            <div class="playrow">
              <label class="bench-k" for="playhead" style="margin:0;color:var(--fg-2)">year</label>
              <input type="range" id="playhead" />
              <span class="mono" id="playheadVal"></span>
            </div>
          </div>

          <div class="counters" id="twinCounters" aria-live="polite"></div>

          <div class="bench" style="margin-top:14px">
            <div>
              <p class="bench-k">
                unit start year · <span id="econStartVal" class="mono"></span> — every year of delay
                burns the best years
              </p>
              <div class="playrow" style="margin-top:6px">
                <input
                  type="range"
                  id="econStart"
                  min="2026"
                  max="2040"
                  step="1"
                  aria-label="Unit start year"
                />
              </div>
            </div>
            <div>
              <p class="bench-k">
                carbon price · €<span id="econPriceVal" class="mono"></span>/t — upside, never the
                base case
              </p>
              <div class="playrow" style="margin-top:6px">
                <input
                  type="range"
                  id="econPrice"
                  min="0"
                  max="150"
                  step="5"
                  aria-label="Carbon price in euros per tonne"
                />
              </div>
            </div>
            <div id="econOut" aria-live="polite"></div>
            <button
              class="dos-tab"
              id="assumpBtn"
              type="button"
              style="color:var(--kraft-ink);border-color:var(--kraft-ink)"
            >
              model assumptions — read them, edit them
            </button>
          </div>

          <details class="fn">
            <summary>
              <span class="pull-shut">what the routing chart claims — and does not</span
              ><span class="pull-open">close</span>
            </summary>
            <div class="fn-body"><p class="note" id="routeFoot" style="margin:0"></p></div>
          </details>
        </div>
      </div>`,
  );

  const host = byId('twinHost');

  byId<HTMLInputElement>('playhead').addEventListener('input', function () {
    twin.set({ year: Number(this.value) });
    paintPlayhead();
  });

  const chips = [...host.querySelectorAll<HTMLButtonElement>('#mineTags .uchip')];
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      twin.set({ mineId: chip.getAttribute('data-mine') ?? '', year: null });
      for (const other of chips) {
        other.setAttribute('aria-pressed', other === chip ? 'true' : 'false');
      }
      paintTwin();
    });
  }

  const start = byId<HTMLInputElement>('econStart');
  const price = byId<HTMLInputElement>('econPrice');
  start.value = String(ECON.startYear);
  price.value = String(ECON.price);

  start.addEventListener('input', function () {
    twin.set({ startYear: Number(this.value) });
    const tw = currentTwin();
    drawDecline(tw);
    drawRoute();
    paintPlayhead();
    paintEconomics(tw);
  });
  price.addEventListener('input', function () {
    twin.set({ price: Number(this.value) });
    paintEconomics(currentTwin());
  });

  byId('assumpBtn').addEventListener('click', () => {
    onAssumptions?.();
  });

  for (const input of host.querySelectorAll<HTMLInputElement>('#floodSeg input')) {
    input.addEventListener('change', function () {
      twin.set({ status: this.value as FloodStatus });
      paintTwin();
    });
  }
  for (const input of host.querySelectorAll<HTMLInputElement>('#sealSeg input')) {
    input.addEventListener('change', function () {
      twin.set({ seal: this.value as SealQuality });
      paintTwin();
    });
  }
};
