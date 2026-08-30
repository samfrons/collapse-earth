/**
 * Rendering citations.
 *
 * Nothing on this site is cited by a bare id. These helpers resolve ids through
 * the atlas — which throws on a miss — so an unresolvable citation stops the page
 * rather than shipping as an empty parenthesis.
 */

import { sources } from '@/data';
import { html, raw, type SafeHtml } from './html';

/** A `<li>` per citation: label plus the date the source carries. */
export const citationList = (ids: readonly string[]): SafeHtml =>
  raw(
    sources(ids)
      .map((s) => html`<li>${s.label} <span class="mono">(${s.date})</span></li>`.value)
      .join(''),
  );

/** Dates only, for a running footnote where the labels are already nearby. */
export const citationDates = (ids: readonly string[]): string =>
  sources(ids)
    .map((s) => s.date)
    .join(' · ');
