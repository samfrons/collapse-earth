/**
 * Carbon — methods, sources, credits, and the calibration the rail is drawn from.
 *
 * Every count in these notes is the data's, including the spelled-out ones: the stamp
 * on the tags and the sentence describing it come from one field.
 */

import { companies, hypotheses, interventions, meta, tippingSystems } from '@/data';
import { byId, setHtml, setText } from '@/lib/dom';
import { capitalise, grouped, numberWord } from '@/lib/format';
import { attr, html } from '@/lib/html';
import type { MediaLedger } from '@/lib/media';
import { CORE_ANCHORS, CORE_LENGTH, depthToAge, segmentById } from './column';

const renderSources = (): void => {
  setText(
    byId('srcEyebrow'),
    `${meta.sources.length} citations, ` +
      `${String(meta.sources.filter((s) => s.verify).length)} still to confirm`,
  );

  setHtml(
    byId('srcs'),
    html`${meta.sources.map(
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
};

const renderNotes = (): void => {
  const milestones = hypotheses.filter((h) => h.investable === false).length;

  const notes: readonly [string, string][] = [
    [
      'thresholds',
      'Every threshold is a minimum, a central estimate and a maximum, with the confidence ' +
        `rating the paper itself gave it. The authority for all ${numberWord(tippingSystems.length)} ` +
        'is Armstrong McKay et al., Science (2022), Table 1. No threshold is rendered as a ' +
        'date, and nothing on the globe flips at a central value alone: elements render by ' +
        'where the dial sits inside their own range.',
    ],
    [
      'money',
      'Funding entries are not interchangeable and are never summed across kinds. Capital ' +
        'raised counts only entries the sources record as equity or debt actually closed, and ' +
        "excludes any entry that sits inside another entry's cumulative total. Capital being " +
        'sought, offtake and purchase commitments, prize awards, grants and sector-level ' +
        'roll-ups are reported as what they are. Every figure carries the badge and the as-of ' +
        'date its source gave it, and an announced round is never rendered as a delivered one.',
    ],
    [
      'absences',
      "A source being silent about a company's funding is not the same as a source reporting " +
        "that it has none. Where this page shows an absence of funding, the source's own words " +
        'are quoted alongside it.',
    ],
    [
      'gap assessment',
      "The one-to-five pips in Act II are an editorial read of how far an intervention's " +
        'potential runs ahead of its capital. They are an assessment, not a measurement, and ' +
        'are labelled that way everywhere they appear.',
    ],
    [
      'hypotheses',
      `Each of the ${numberWord(hypotheses.length)} claims in Act III states falsifiable kill ` +
        'criteria before its validation criteria, and an honest technology-readiness level. ' +
        capitalise(numberWord(milestones)) +
        (milestones === 1
          ? ' is a public-good research milestone rather than an investable proposition and is '
          : ' are public-good research milestones rather than investable propositions and are ') +
        'stamped as such.',
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
};

const renderCredits = (media: MediaLedger): void => {
  setText(byId('creditsN'), `${media.used.length} clips, credits and licences`);

  setHtml(
    byId('credits'),
    html`${media.used.map((slug) => {
        const m = media.clipFor(slug);
        return html`<li>
          <b>${slug.replace(/-/g, ' ')} · tags ${m.tags.join(', ')}</b>${m.credit}. ${m.license}.
          URL verified ${m.verifiedAt}; ${grouped(m.bytes / 1000)} kB.
        </li>`;
      })}
      <li>
        <b>treatment</b>The two rock clips are canyon and waterfall footage with visible layering,
        used as texture bands at the act contacts under a multiply blend. They are photographs of
        real strata, not diagrams of this core, and no measurement is drawn from them. The satellite
        ice record is shown in monochrome as a framed core photograph in the opening, then returns
        at the last contact under a screen blend — the same clip twice, by intent and to stay inside
        the page's payload budget. All video is loaded only on approach, pauses when it leaves the
        viewport, and is replaced by a still poster frame under a reduced-motion preference.
      </li>`,
  );
};

/** Eight rows out of the anchor table, enough to show the thinning without listing it all. */
const CALIBRATION_ROWS = [0, 3, 6, 9, 12, 15, 18, 20] as const;

const renderCalibration = (): void => {
  setText(
    byId('calibNote'),
    `The rail is a scale drawing of a core roughly ${grouped(CORE_LENGTH)} m long, reading to ` +
      `about ${grouped(depthToAge(CORE_LENGTH))} years before present. The depth–age ` +
      'relationship below is ILLUSTRATIVE, patterned on a deep Greenland ice core where annual ' +
      'layers thin under load, which is why age climbs steeply with depth. It is not measured ' +
      'data, no claim on this page rests on it, and it carries no source because it is a ' +
      'reading scale rather than a finding. Laminations in the rail are drawn at fixed age ' +
      'intervals, so they crowd together downward for the same physical reason.',
  );

  setHtml(
    byId('calibTable'),
    html`<thead>
        <tr>
          <th scope="col">Depth</th>
          <th scope="col">Age</th>
          <th scope="col">Mean layer thickness</th>
        </tr>
      </thead>
      <tbody>
        ${CALIBRATION_ROWS.map((i) => {
          const anchor = CORE_ANCHORS[i];
          const previous = i === 0 ? null : CORE_ANCHORS[i - 1];
          const thickness =
            previous && anchor[1] > previous[1]
              ? `${(((anchor[0] - previous[0]) / (anchor[1] - previous[1])) * 1000).toFixed(0)} mm/yr`
              : anchor[0] === 0
                ? 'surface'
                : '—';
          return html`<tr>
            <td>${grouped(anchor[0])} m</td>
            <td>${anchor[1] === 0 ? 'present' : `≈${grouped(anchor[1])} yr bp`}</td>
            <td>${thickness}</td>
          </tr>`;
        })}
      </tbody>`,
  );
};

export const renderMethods = (media: MediaLedger): void => {
  setText(byId('discData'), `${meta.disclaimer} Last updated ${meta.updated}.`);

  renderSources();
  renderNotes();
  renderCredits(media);
  renderCalibration();

  setHtml(
    byId('footRow'),
    html`${[
      'Collapse Earth',
      'variant · core sample',
      `updated ${meta.updated}`,
      `${tippingSystems.length} elements · ${meta.sources.length} sources`,
      'research and opinion',
      html`© 2026 Sam Frons · <a href="https://samfrons.xyz">samfrons.xyz</a>`,
    ].map((t) => html`<span>${t}</span>`)}`,
  );
};

/* -------------------------------------------------------------------------- */
/* Act eyebrows                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The structural device carries real information: the depth interval each act
 * occupies in the core log, read from the same segment table the gauge uses.
 */
const segmentEyebrow = (id: string, ordinal: string): string => {
  const s = segmentById(id);
  if (!s) return '';
  return (
    `stratum ${ordinal} · ${grouped(s.d0)}–${grouped(s.d1)} m · ` +
    `≈${grouped(depthToAge(s.d0))}–${grouped(depthToAge(s.d1))} yr bp`
  );
};

export const renderEyebrows = (): void => {
  const eyebrow = (id: string, segment: string, ordinal: string, tail: string): void => {
    setHtml(byId(id), html`${segmentEyebrow(segment, ordinal)}${tail ? ` · ${tail}` : ''}`);
  };

  eyebrow('act1Eyebrow', 'act1', 'ii', `${tippingSystems.length} elements`);
  eyebrow('act2Eyebrow', 'act2', 'iv', `${interventions.length} intervention categories`);
  eyebrow('act3Eyebrow', 'act3', 'vi', `${hypotheses.length} hypotheses`);
  eyebrow('methEyebrow', 'methods', 'viii', 'bedrock');

  setText(
    byId('fieldEyebrow'),
    `assay · ${interventions.length} categories · editorial leverage against ` +
      'disclosed capital',
  );
  setText(
    byId('bandsEyebrow'),
    `all ${tippingSystems.length} elements · Armstrong McKay et al. (2022), Table 1`,
  );
  setText(
    byId('atlasEyebrow'),
    `companies · ${companies.tier1.length + companies.tier2.length + companies.tier3.length} ` +
      'entries in three tiers',
  );
};
