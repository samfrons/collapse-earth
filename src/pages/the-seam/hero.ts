/**
 * Surface works — the hero, the act eyebrows, and the contact bands between them.
 */

import { amm, meta } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { grouped, megatonnes } from '@/lib/format';
import { html } from '@/lib/html';
import type { MediaLedger } from '@/lib/media';
import { segmentById } from './column';
import { co2eBoth } from './warming-lenses';

export const renderHero = (): void => {
  const inv = amm.inventory;
  const both = co2eBoth(inv.central.kt);

  setHtml(
    byId('heroEyebrow'),
    html`<a href="/#iv-methane-removal"
        >Collapse Earth · beneath Core Sample §1 — methane removal</a
      >
      · field study · logged <b>${meta.updated}</b>`,
  );

  setHtml(
    byId('heroMeta'),
    html`${[
      'abandoned coal mines · european union',
      'read top to bottom — descent into one mine',
      'depths schematic · emissions modelled',
    ].map((t) => html`<span>${t}</span>`)}`,
  );

  setHtml(
    byId('heroLede'),
    html`Coal mines abandoned across the EU since 2015 still emit an estimated
      <b class="num">${grouped(inv.central.kt)} kt</b> of methane a year — ≈${megatonnes(both.mt20)}
      Mt CO₂e through the 20-year lens, ≈${megatonnes(both.mt100)} Mt through the 100-year lens. A
      2024 EU regulation has already forced the inventory, now forces the measurement, and from 2030
      prohibits venting and flaring outright. Nobody yet owns the closure.`,
  );

  setText(
    byId('heroNote'),
    'Read as a mine log: scroll is descent. Four levels — the inventory, one mine modelled, ' +
      'the machine that would stop it, and the company that would run it.',
  );

  setText(byId('heroStampLab'), 'modelled, not measured');
  setText(
    byId('heroStampNote'),
    'Every emissions figure on this page is a model estimate (GEM 2024, adapted Kholod M2CM) ' +
      '— the mines are largely uninstrumented. That gap between modelled and measured is not ' +
      'a caveat here. It is the opening.',
  );

  const readouts = [
    {
      k: `modelled emissions · ${inv.window}`,
      v: grouped(inv.central.kt),
      u: 'kt CH₄ / yr',
      n: `${inv.central.basis}.`,
    },
    {
      k: 'mines in the dataset',
      v: String(inv.counts.total),
      u: `${inv.counts.underground} underground · ${inv.counts.surface} surface`,
      n: null,
    },
    {
      k: 'the concentration',
      v: String(amm.mines.length),
      u: 'mines are half the problem',
      n:
        `${grouped(inv.sixMines.mcm)} MCM · ${grouped(inv.sixMines.kt)} kt of the ` +
        `${grouped(inv.central.mcm)} MCM total.`,
    },
  ];

  setHtml(
    byId('readouts'),
    html`${readouts.map(
      (r, i) =>
        html`<div class="readout">
          <p class="readout-k">${r.k}</p>
          <div class="readout-top">
            <span class="readout-val">${r.v}</span><span class="readout-unit">${r.u}</span>
          </div>
          ${r.n !== null && html`<p class="readout-note">${r.n}</p>`}
          ${
            i === 0 &&
            html`<p style="margin:10px 0 0">
              <span class="mod-stamp">modelled — not measured</span>
            </p>`
          }
        </div>`,
    )}`,
  );

  setText(
    byId('heroDisc'),
    `${meta.disclaimer} Anchor source: Global Energy Monitor briefing, June 2024 — listed in ` +
      'full at depth.',
  );
};

/** The structural device carries the depth interval each level occupies. */
const levelEyebrow = (id: string, ordinal: string): string => {
  const s = segmentById(id);
  if (!s) return '';
  return `level ${ordinal} · ${grouped(s.d0)}–${grouped(s.d1)} m below surface · schematic`;
};

export const renderEyebrows = (): void => {
  const inv = amm.inventory;

  setHtml(byId('act1Eyebrow'), html`${levelEyebrow('act1', 'i')} · ${inv.counts.total} mines`);
  setHtml(byId('act2Eyebrow'), html`${levelEyebrow('act2', 'ii')} · one mine, six on the bench`);
  setHtml(byId('act3Eyebrow'), html`${levelEyebrow('act3', 'iii')} · one containerized unit`);
  setHtml(byId('act4Eyebrow'), html`${levelEyebrow('act4', 'iv')} · the record`);

  setText(
    byId('act1Note'),
    'Seventy mines closed since 2015, and six of them are half the problem. Every figure is ' +
      'modelled, and says so where it stands.',
  );
  setText(
    byId('act2Note'),
    'One mine as the model sees it — the same class of model behind every number in the ' +
      'inventory. The first product of the company at depth is replacing this model with ' +
      'instruments.',
  );
  setText(
    byId('act3Note'),
    'The machine this thesis needs already exists as parts. What does not exist is the unit ' +
      'that routes a dying gas stream to the right destruction path as the mine ages.',
  );
  setText(
    byId('act4Note'),
    'The company, its revenue before any carbon credit, and the six conditions that would ' +
      'kill it. Kill criteria are printed before validation, as everywhere on this site.',
  );

  setText(
    byId('seamEyebrow'),
    `inventory · ${inv.counts.underground} underground mines · modelled MCM per year, by country`,
  );
};

const CONTACT_COPY: Record<string, { name: string; sub: string }> = {
  contactA: {
    name: 'overburden · into the seam',
    sub: 'Below this line the subject narrows: from seventy mines to one, read the way the model reads it.',
  },
  contactB: {
    name: 'the seam · to the working face',
    sub: 'Below this line the question changes — not what the mine emits, but what hardware would stop it.',
  },
  contactC: {
    name: 'working face · to depth',
    sub: 'The record: the company, the money, the sources, and what would end the idea.',
  },
};

export const renderContacts = (media: MediaLedger): void => {
  for (const [id, copy] of Object.entries(CONTACT_COPY)) {
    const section = document.getElementById(id);
    if (!section) continue;

    const slot = section.querySelector('.contact-media-slot');
    if (slot) {
      const tag = slot.getAttribute('data-tags');
      const index = slot.getAttribute('data-pick') === 'second' ? 1 : 0;
      const slug = tag ? media.pick(tag, index) : undefined;
      if (slug) {
        slot.outerHTML = media.markup(slug, 'contact-media').value;
        media.use(slug);
      }
    }

    const segment = segmentById(id);
    setText(
      byId(`${id}Chip`),
      segment ? `contact · ${grouped(segment.d0)} m · schematic` : 'contact',
    );
    setText(byId(`${id}Name`), copy.name);
    setText(byId(`${id}Sub`), copy.sub);
  }
};
