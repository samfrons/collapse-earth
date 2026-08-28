/**
 * Bedrock — methods and sources. Only the sources this page actually cites.
 *
 * The list below is every source the page renders a figure from. Both the Sources
 * drawer and the "still to confirm" count derive from it, so an omission does not just
 * thin the drawer — it silently hides a `verify: true` citation from the gate that
 * exists to surface it.
 */

import { amm, meta, sources } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { grouped } from '@/lib/format';
import { attr, html } from '@/lib/html';
import type { MediaLedger } from '@/lib/media';
import { assumptionsTable } from './tray';
import { parameters, type ParamKey } from './params';

/**
 * `rosso1993` belongs here because the M-004 bed profile is shaped by its
 * cardinal-temperature model — a figure rendered from a source is a figure cited.
 */
const PAGE_SOURCE_IDS = [
  'gem2024amm',
  'kholod2020',
  'eumr2024',
  'iea-amm',
  'unece-bpg',
  'unece-amm',
  'epa-vam',
  'acm0008',
  'ipccar6',
  'ipcc2006',
  'coward1952',
  'limbri2014',
  'rosso1993',
  'iea-methane',
  'research-doc',
];

/** The parameter block, read-only, mirroring the pane the bench edits. */
export const renderMethodsAssumptions = (): void => {
  const host = document.getElementById('methAssump');
  if (!host) return;

  const keys = Object.keys(parameters) as ParamKey[];
  const pending = keys.filter((k) => !parameters[k].verified).length;
  const editorial = keys.filter((k) => parameters[k].src === 'editorial').length;

  setText(
    byId('methAssumpN'),
    `${keys.length} constants · ${pending} pending · ${editorial} editorial`,
  );
  setHtml(
    host,
    html`<p class="note" style="margin-bottom:12px">
        Auto-rendered from the twin's parameter block — the same table the bench's assumptions pane
        edits. Current values shown, including any the reader has changed this session.
      </p>
      ${assumptionsTable(false)}`,
  );
};

export const renderMethods = (media: MediaLedger): void => {
  const cited = sources(PAGE_SOURCE_IDS);

  setText(byId('discData'), `${meta.disclaimer} Last updated ${meta.updated}.`);
  setText(
    byId('srcEyebrow'),
    `${cited.length} citations, ${cited.filter((s) => s.verify).length} still to confirm`,
  );

  setHtml(
    byId('srcs'),
    html`${cited.map(
      (s) =>
        html`<li>
          <span class="src-id">${s.id}</span>
          <span class="src-body">
            ${
              s.url !== null
                ? html`<a href="${attr(s.url)}" rel="noopener noreferrer" target="_blank"
                    >${s.label}</a
                  >`
                : html`${s.label}<em
                      >No stable link recorded. The citation is real and dated; a fabricated URL
                      would be worse than none.</em
                    >`
            }<em>${s.date}</em>
            ${s.verify && html`<span class="src-verify">still to confirm before print</span>`}
          </span>
        </li>`,
    )}`,
  );

  const g = amm.gwp;
  const notes: readonly [string, string][] = [
    [
      'modelled vs measured',
      'Every emissions figure on this page is a model estimate. The inventory figures are ' +
        "Global Energy Monitor's, built on the adapted Kholod et al. (2020) M2CM model; the " +
        "digital twin in level ii is this page's own re-implementation of that model class, " +
        'parameterised in the open and labelled at every readout. Nothing here has been ' +
        'measured at a mine, and the page never pretends otherwise.',
    ],
    [
      'units',
      'MCM is million cubic metres of methane per year, as GEM publishes it. Where this page ' +
        `converts to tonnes it uses ${amm.conversion.kgPerM3} kg/m³ — the IPCC 2006 ` +
        "coal-mining Tier-1 convention (20 °C, 1 atm), which the briefing's own printed MCM↔kt " +
        'pairs match exactly. Three official density conventions differ by ≈7%; naming one is ' +
        'the only honest way to convert.',
    ],
    [
      'the two lenses',
      `Methane's warming effect depends on the horizon: the same tonne is ≈${g.gwp20}× CO₂ ` +
        `over 20 years and ≈${g.gwp100}× over 100 (${g.basis}). Both lenses are always shown ` +
        'together — choosing one silently is how methane numbers lie.',
    ],
    [
      'hedges',
      'Where a source hedges (approximately, nearly, at least), the hedge is carried through ' +
        'to every rendering. A scenario average is labelled a modelling convention. An unknown ' +
        'flooded status is rendered as the uncertainty it is, never resolved by assumption.',
    ],
  ];

  setHtml(
    byId('methNotes'),
    html`${notes.map(
      ([key, body]) =>
        html`<div class="field">
          <p class="field-k">${key}</p>
          <p class="field-v">${body}</p>
        </div>`,
    )}`,
  );

  setText(byId('creditsN'), `${media.used.length} clips, reused from the lead's verified set`);
  setHtml(
    byId('credits'),
    html`${media.used.map((slug) => {
      const m = media.clipFor(slug);
      return html`<li>
        ${slug.replace(/-/g, ' ')} — ${m.credit}. ${m.license}. URL verified ${m.verifiedAt};
        ${grouped(m.bytes / 1000)} kB. Photographs of real strata used as texture bands at the
        contacts; no measurement is drawn from them.
      </li>`;
    })}`,
  );

  setHtml(
    byId('footRow'),
    html`<span>Collapse Earth — the seam</span><span>field study · beneath §1</span
      ><span>updated ${meta.updated}</span
      ><span>${amm.inventory.counts.total} mines · ${cited.length} sources</span
      ><span>research and opinion</span><span><a href="/">← core sample</a></span>`,
  );
};
