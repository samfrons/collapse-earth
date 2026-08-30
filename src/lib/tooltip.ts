/**
 * One tooltip element, shared by every chart on a page.
 *
 * Pointer and keyboard both raise it, which matters: the globe markers and the
 * band-chart rows are focusable, and a hover-only tooltip would hide half the
 * reading from anyone navigating by keyboard.
 */

import { byId } from './dom';
import type { SafeHtml } from './html';

let element: HTMLElement | null = null;

const host = (): HTMLElement => (element ??= byId('tip'));

/** Show at the pointer. */
export const showTip = (event: { clientX: number; clientY: number }, content: SafeHtml): void => {
  const el = host();
  el.innerHTML = content.value;
  el.style.left = `${event.clientX}px`;
  el.style.top = `${event.clientY}px`;
  el.classList.add('on');
};

/** Show beside an element — the keyboard-focus equivalent of a hover. */
export const showTipAt = (node: Element, content: SafeHtml): void => {
  const el = host();
  const r = node.getBoundingClientRect();
  el.innerHTML = content.value;
  el.style.left = `${String(r.left + Math.min(r.width / 2, 220))}px`;
  el.style.top = `${r.top + r.height / 2}px`;
  el.classList.add('on');
};

export const hideTip = (): void => {
  element?.classList.remove('on');
};
