/**
 * DOM access that fails loudly.
 *
 * These pages render every figure from data into an element identified by id. A
 * silently-missing element therefore means a silently-missing *number* — a blank
 * where a sourced figure should be, which is the one failure mode this site cannot
 * afford. So `byId` throws, and the boot sequence catches once and marks the
 * document, rather than each of seventy render functions checking for null.
 */

import type { SafeHtml } from './html';

/* These helpers exist to give the *call site* its element type — `byId<HTMLInputElement>`
   is the whole ergonomic point — so a single use of the parameter is correct here. */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

export const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id} — the page cannot render this figure.`);
  return el as T;
};

/** Same contract as {@link byId}, for elements addressed by selector. */
export const qs = <T extends Element = Element>(
  selector: string,
  root: ParentNode = document,
): T => {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element matching "${selector}".`);
  return el;
};

export const qsa = <T extends Element = Element>(
  selector: string,
  root: ParentNode = document,
): readonly T[] => [...root.querySelectorAll<T>(selector)];

/** Set an element's contents from a {@link SafeHtml} fragment. */
export const setHtml = (target: HTMLElement | string, content: SafeHtml): void => {
  const el = typeof target === 'string' ? byId(target) : target;
  el.innerHTML = content.value;
};

export const setText = (target: HTMLElement | string, text: string): void => {
  const el = typeof target === 'string' ? byId(target) : target;
  el.textContent = text;
};

/** True when the reader has asked for less motion. Honoured, not negotiated. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Run `handler` at most once per animation frame. Scroll and resize handlers on
 * these pages recompute layout, and doing that per event rather than per frame is
 * the difference between a smooth descent and a stuttering one.
 */
export const onAnimationFrame = (handler: () => void): (() => void) => {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      handler();
    });
  };
};

/**
 * Boot a page. Any failure marks the document rather than leaving a half-rendered
 * page that looks complete — `[data-nodata]` hides the figure slots in CSS.
 */
export const boot = (render: () => void): void => {
  try {
    render();
  } catch (error) {
    document.documentElement.setAttribute('data-nodata', '1');
    console.error('Collapse Earth failed to render:', error);
  }
};
