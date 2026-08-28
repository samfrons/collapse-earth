/**
 * The working face — the unit, as four technical sheets.
 *
 * A concentration-flexible methane router drawn in the page's own hand: a general
 * arrangement, a P&ID whose logic responds to the gas you pick, a 3-D model, and the
 * biological route. Stamped CONCEPT throughout — the parts exist, the unit does not.
 */

import { amm } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { attr, html } from '@/lib/html';
import { EQUIPMENT } from './equipment';
import { field, renderTwinGaps } from './drawers';
import { bootExplorer, STATIONS } from './explorer';
import { P } from './params';
import { drawCoward, GAS_CASES, wireCoward } from './sheet-coward';
import { drawGeneralArrangement } from './sheet-ga';
import { drawPid, paintPid, unit } from './sheet-pid';
import { TWIN_GAPS } from './twin-gaps';

/** The M-004 drawer: what the sheet does and does not claim. */
const cowardCaveats = () =>
  html`${field(
    'the leakier the mine, the longer it spends in the band',
    html`Oxygen here is not assumed — it follows from Act II's own purity model, because air ingress
      is what UNECE says drives an unsealed working's purity down. Run the three cases to 1% and the
      envelope stretches: a sealed working spends <b>8%</b> of its blend inside it, an unsealed one
      <b>17%</b>, and the same working a decade on <b>27%</b>. The weaker gas is the more dangerous
      gas to dilute, because the oxygen that weakened it is already in the pipe. Ingress also steals
      the suction you can apply — that half is not modelled here.`,
    'field--warn',
  )}
  ${field(
    'the geometry is sourced',
    html`The flammable envelope is Coward &amp; Jones 1952 and nothing in it is fitted. Its limits
    are for ambient temperature and pressure — both widen the envelope when raised, which is the
    non-conservative direction for a hot bed. Screening layer, not a hazard study.`,
  )}
  ${field(
    'the bed is a shape, not a score',
    html`Shading is a modelled axial profile normalised to its own inlet. This page states no
    removal efficiency and no elimination capacity for it, because the kinetics behind it are
    uncalibrated against any installation and carry no channelling term — which would make them
    over-predict at high biomass.`,
    'field--warn',
  )}
  ${field(
    'the one measured number',
    html`27.2 g CH₄ m⁻³ h⁻¹ at a 1% inlet, and ≈7,200 m³ of bed for a 50 m³ s⁻¹ flow, are Limbri et
    al. 2014's measurement and their own scale-up from it — not this model's output. They are on the
    plate because they are the strongest argument against the thing it draws.`,
  )}
  ${field(
    'the band nothing else serves',
    html`This is the whole case for the bed, and it is a gap in a ladder rather than a claim of
      superiority. Flares need roughly <b>20%</b> methane; lean-burn engines around <b>25%</b>;
      regenerative thermal oxidation reaches down to about <b>0.2%</b> but pays for it in energy.
      Biological oxidation runs at ambient temperature on blower power alone, and at these loadings
      its greenhouse benefit exceeds its own emissions by orders of magnitude. Above the flammable
      band the gas is a fuel; below it, biology is the only route that wants it.`,
  )}
  ${field(
    'what the vessel is',
    html`A vertical cylinder: inlet plenum, support grid, 0.5–2 m of irrigated porous packing
    carrying the methanotroph biofilm, a top distributor, sampling ports at several bed heights, a
    drainage layer over a leachate reservoir, and an outlet plenum to a monitored stack. Gas is
    drawn from boreholes through a sealed low-pressure header and a conditioning skid — knockout,
    particulate filter, flame arrestor, blower — and enters below the bed, oxidising as it rises on
    oxygen carried in the same stream. Reaction heat goes mostly into evaporation, so the bed sits
    only modestly above inlet temperature. The collection system is sealed and physically separate
    from the reactor.`,
  )}
  ${field(
    'where it would be pointed',
    html`Ventilation air from active shafts · low-concentration drainage gas from sealed or
      abandoned workings · post-closure methane management at legacy sites · polishing the lean tail
      of a gas-utilisation scheme. Operating window 0.1–1.5% v/v inlet — which must stay under the
      5% lower flammable limit — at a 2–10 min empty-bed residence time, on 0.02–0.5 kW of blower at
      pilot scale. <b>TRL 5–7:</b> landfill-cover and mine-vent biofilters are demonstrated in the
      field; this reactor is not, and this model of it is fitted to nothing.`,
    'field--warn',
  )}`;

export const buildUnit = (): void => {
  const states = amm.venture.productStates;

  setHtml(
    byId('unitHost'),
    html`<div class="twin-plot blueprint rise">
        <p class="readout-k" id="gaK"></p>
        <svg id="gaSvg" role="group"></svg>
      </div>

      <p class="inst-eyebrow rise">
        sheet <b>2</b> · process &amp; instrumentation — pick the gas, the router picks the path
      </p>
      <div class="unit-chips rise" role="group" aria-label="Gas-state presets" id="unitChips">
        ${states.map(
          (s) =>
            html`<button
              type="button"
              class="uchip${s.id === 'unsafe' ? ' uchip--unsafe' : ''}"
              data-state="${attr(s.id)}"
              aria-pressed="${s.id === unit.state ? 'true' : 'false'}"
            >
              <b>${s.label} · ${s.band}</b>${s.route}
            </button>`,
        )}
      </div>
      <div class="twin-plot blueprint rise">
        <p class="readout-k" id="pidK"></p>
        <svg id="pidSvg" role="group"></svg>
      </div>

      <p class="inst-eyebrow rise">sheet <b>3</b> · the model — orbit it, run it</p>
      <div class="twin-plot blueprint rise" id="xpPlate">
        <p class="readout-k">
          model M-003 · digital twin walkthrough · drag to orbit · arrow keys · + / −
        </p>
        <div
          id="xpWrap"
          tabindex="0"
          role="application"
          aria-roledescription="3-D model viewer"
          aria-label="Three-dimensional cutaway model of the specimen mine and abatement unit — loads on approach"
        >
          <div id="xpLabels" aria-hidden="true"></div>
        </div>
        <p class="xp-cap" id="xpCap">
          The model loads when you arrive — a cutaway of the mine with the unit on the surface.
        </p>
        <div class="xp-hud">
          <div class="xp-stations" id="xpStations" role="group" aria-label="Tour stations">
            ${STATIONS.map(
              (st, i) =>
                html`<button
                  type="button"
                  class="uchip"
                  aria-pressed="${i === 0 ? 'true' : 'false'}"
                >
                  <b>${st.label}</b>
                </button>`,
            )}
          </div>
          <span style="flex:1 1 auto"></span>
          <button type="button" class="uchip" id="xpPrev" aria-label="Previous station">
            <b>◀</b>
          </button>
          <button type="button" class="uchip" id="xpNext" aria-label="Next station">
            <b>▶</b>
          </button>
          <button type="button" class="uchip" id="xpZoomIn" aria-label="Zoom in"><b>+</b></button>
          <button type="button" class="uchip" id="xpZoomOut" aria-label="Zoom out">
            <b>−</b>
          </button>
          <button type="button" class="uchip" id="xpReset"><b>reset view</b></button>
        </div>
        <div class="xp-hud">
          <div
            class="seg"
            role="radiogroup"
            aria-label="Flooding scenario"
            id="xpFlood"
            style="flex:0 0 auto"
          >
            ${(['dry', 'flooded'] as const).map(
              (v) =>
                html`<label style="padding:8px 14px"
                  ><input
                    type="radio"
                    name="xpflood"
                    value="${v}"
                    ${v === 'dry' ? 'checked' : ''}
                  />${v}</label
                >`,
            )}
          </div>
          <div
            class="seg"
            role="radiogroup"
            aria-label="Seal quality"
            id="xpSeal"
            style="flex:0 0 auto"
          >
            ${(['sealed', 'leaky'] as const).map(
              (v) =>
                html`<label style="padding:8px 14px"
                  ><input
                    type="radio"
                    name="xpseal"
                    value="${v}"
                    ${v === 'leaky' ? 'checked' : ''}
                  />${v}</label
                >`,
            )}
          </div>
          <button type="button" class="uchip" id="xpUnit" aria-pressed="true">
            <b>unit on</b>
          </button>
          <div class="playrow" style="flex:1 1 200px;margin-top:0">
            <input
              type="range"
              id="xpYear"
              min="2015"
              max="2050"
              step="1"
              value="2026"
              aria-label="Scenario year"
            />
            <span class="mono" id="xpYearVal">2026</span>
          </div>
        </div>
        <p class="bench-note" style="color:#A9C6D8;margin-top:10px" id="xpScenarioNote">
          scenario controls come alive with the model
        </p>
        <p class="bench-note" style="color:#A9C6D8">
          geometry illustrative — a model of the model; behaviour from this page's own decline
          equations · the mine cannot tell you dry or flooded; that is Act I's point · the 3-D
          library loads only when you scroll here
        </p>
      </div>

      <!-- The twin's own epistemics belong to the model, not to the unit, so they sit
           directly under M-003 — in a drawer, because six rows are reference material
           rather than spine. The summary carries the hedge, per the disclosure rule. -->
      <details class="fn">
        <summary>
          <span class="pull-shut"
            >what a real twin would have to know — and the ${P('gt_model_mw')} MW that turned out to
            be ${P('gt_actual_mw')}</span
          ><span class="pull-open">close</span>
        </summary>
        <div class="fn-body" id="twinGaps"></div>
      </details>

      <p class="inst-eyebrow rise">sheet <b>4</b> · the biological route</p>
      <div class="twin-plot blueprint rise" id="cowPlate">
        <p class="readout-k">model M-004 · dilution path · Coward 1952</p>
        <svg id="cowSvg" role="group"></svg>
        <div class="xp-hud">
          <div
            class="seg"
            role="radiogroup"
            aria-label="Source gas"
            id="cowGas"
            style="flex:0 0 auto"
          >
            ${GAS_CASES.map(
              (g, i) =>
                html`<label style="padding:8px 12px"
                  ><input
                    type="radio"
                    name="cowgas"
                    value="${attr(g.id)}"
                    ${i === 0 ? 'checked' : ''}
                  />${g.chip}</label
                >`,
            )}
          </div>
          <div class="playrow" style="flex:1 1 220px;margin-top:0">
            <input
              type="range"
              id="cowTgt"
              min="0.2"
              max="5"
              step="0.1"
              value="1"
              aria-label="Dilute to target methane concentration, percent by volume"
            />
            <span class="mono" id="cowTgtVal">1.0%</span>
          </div>
        </div>
        <p class="bench-note" id="cowNote" style="color:#A9C6D8;margin-top:10px"></p>
        <details class="fn">
          <summary>
            <span class="pull-shut"
              >modelled shape, not measured performance — what this sheet does and does not
              claim</span
            ><span class="pull-open">close</span>
          </summary>
          <div class="fn-body">${cowardCaveats()}</div>
        </details>
      </div>

      <details class="fn">
        <summary>
          <span class="pull-shut">the module bill — what exists, what is the invention</span
          ><span class="pull-open">close</span>
        </summary>
        <div class="fn-body" id="unitBill"></div>
      </details>`,
  );

  setText(
    byId('gaK'),
    'sheet 1 · general arrangement · containerized adaptive abatement unit · concept',
  );

  const chips = [...byId('unitHost').querySelectorAll<HTMLButtonElement>('#unitChips .uchip')];
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      unit.state = chip.getAttribute('data-state') ?? 'rich';
      for (const other of chips) {
        other.setAttribute('aria-pressed', other === chip ? 'true' : 'false');
      }
      paintPid();
    });
  }

  setHtml(
    byId('unitBill'),
    html`${EQUIPMENT.map((e) => field(`(${e.n}) ${e.name.toLowerCase()}`, html`${e.tip}`))}
    ${field(
      'the claim, precisely',
      html`Nothing in this container needs inventing except the container: every ballooned item is
      commercial hardware. The first-of-a-kind claim is the integration — one sealed unit that
      meters, conditions and routes a declining gas stream to the right destruction path for a
      decade without a crew. Deliberately unheroic, and deliberately buildable.`,
      'field--warn',
    )}
    ${field(
      'the name',
      html`<b>${amm.venture.name}</b> — the work needs something to be called. It is not a company:
        no entity, no raise, nothing on offer. Also considered:
        ${amm.venture.namesConsidered.join(' · ')}.`,
    )}`,
  );

  renderTwinGaps(TWIN_GAPS, P('gt_model_mw'), P('gt_actual_mw'), P('amm_suitable_hi'));
  drawGeneralArrangement();
  drawPid();
  paintPid();
  bootExplorer();
  wireCoward();
  drawCoward();
};
