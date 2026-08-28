/**
 * Markup construction with escaping that cannot be forgotten.
 *
 * Both pages build HTML as strings, because both render long dossier panes from
 * data and string assembly stays readable where imperative DOM calls do not. The
 * risk with that approach is a single interpolation someone forgot to escape, so
 * the tagged template below escapes *by default* and makes the exception explicit
 * and greppable: `raw(...)`.
 */

/** A fragment already known to be safe. The only way past automatic escaping. */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

/** Mark a string as pre-escaped markup. Every call site is a thing to justify. */
export const raw = (value: string): SafeHtml => new SafeHtml(value);

/** Escape text for an HTML text node or a double-quoted attribute. */
export const esc = (s: unknown): string =>
  // Callers pass primitives; an object reaching here should render visibly wrong rather
  // than silently empty, which is what String() gives us.
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Escape for a single-quoted attribute, where `esc` alone is not enough. */
export const attr = (s: unknown): string => esc(s).replace(/'/g, '&#x27;');

type Interpolated = SafeHtml | string | number | boolean | null | undefined | readonly unknown[];

const render = (value: Interpolated): string => {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map((v: Interpolated) => render(v)).join('');
  return esc(value);
};

/**
 * Tagged template for markup. Interpolations are escaped unless wrapped in
 * {@link raw}; arrays are joined; `null`, `undefined` and `false` render as
 * nothing, so conditional fragments read as `${cond && html`…`}`.
 */
export const html = (strings: TemplateStringsArray, ...values: Interpolated[]): SafeHtml => {
  let out = strings[0] ?? '';
  for (const [i, value] of values.entries()) out += render(value) + (strings[i + 1] ?? '');
  return new SafeHtml(out);
};
