/**
 * Core Sample — boot.
 *
 * The page is a descent: firn, then the thresholds, then the misallocation, then the
 * hypothesis engine, then bedrock. This file does nothing but bring those up in an
 * order that respects their dependencies, and wire the three global listeners.
 *
 * Every figure it renders comes from the atlas. Nothing numeric is written into the
 * markup, which is why a data failure has to fail loudly rather than render a page
 * that looks complete and is silently empty.
 */

import { boot, byId, onAnimationFrame, prefersReducedMotion, qsa } from '@/lib/dom';
import { DepthGauge } from '@/lib/depth-gauge';
import { MediaLedger, observeLazyVideo } from '@/lib/media';
import { hideTip } from '@/lib/tooltip';

import { buildField, placeFieldCaptions } from './assay';
import { buildBands, onBandSelect, paintBands } from './bands';
import { gaugeConfig } from './column';
import { renderDial } from './dial';
import {
  closeTray,
  fillDossier,
  openTray,
  selectSystem,
  trapTrayFocus,
  updateTrayTab,
} from './dossier';
import { buildGlobe, layoutGlobe, onGlobeSelect, paintGlobe, wireGlobeInput } from './globe';
import { renderContactBands, renderHero } from './hero';
import { renderHypotheses } from './hypotheses';
import { renderCompanyAtlas, renderLedger } from './ledger';
import { renderEyebrows, renderMethods } from './methods';
import { renderOpportunity } from './opportunity';
import { actOne } from './thresholds';

const media = new MediaLedger();
const gauge = new DepthGauge(gaugeConfig);

/** Reveal-on-approach, or everything at once where motion is not wanted. */
const wireReveal = (): void => {
  const nodes = qsa<HTMLElement>('.rise');
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    for (const n of nodes) n.classList.add('in');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  for (const n of nodes) observer.observe(n);
};

const wireScroll = (): void => {
  const tick = onAnimationFrame(() => {
    gauge.update();
  });

  window.addEventListener(
    'scroll',
    () => {
      // A tooltip is anchored to a viewport position, so it is wrong the moment the
      // page moves under it — and nothing else would dismiss one raised by keyboard
      // focus rather than by the pointer.
      hideTip();
      tick();
    },
    { passive: true },
  );

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      gauge.draw();
      gauge.update();
      layoutGlobe();
      paintGlobe();
    }, 140);
  });
};

/**
 * An arriving hash that targets a closed `<details>` — or content inside one — would
 * land on nothing visible, so open it before the browser's own scroll.
 */
const openHashTarget = (): void => {
  if (!location.hash) return;
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return;
  if (target instanceof HTMLDetailsElement) target.open = true;
  target.closest('details')?.setAttribute('open', '');
  target.scrollIntoView({ block: 'center' });
};

const render = (): void => {
  renderEyebrows();
  renderHero(media);
  renderContactBands(media);

  // Act I. The globe, the bands and the dial all read one store, so each repaints
  // itself when the reader moves the dial or picks an element — nothing here has to
  // remember to call the others.
  buildGlobe();
  wireGlobeInput();
  renderDial();
  buildBands();

  actOne.subscribe(({ selected }) => {
    paintGlobe();
    paintBands();
    if (selected) fillDossier(selected);
  });
  onGlobeSelect(selectSystem);
  onBandSelect(selectSystem);

  byId('dosClose').addEventListener('click', closeTray);
  byId('dosScrim').addEventListener('click', closeTray);
  byId('dosOpenLast').addEventListener('click', () => {
    if (actOne.get().selected) openTray();
  });
  updateTrayTab();

  // Act II, then Act III, then bedrock.
  renderOpportunity();
  buildField();
  renderLedger();
  renderCompanyAtlas();
  renderHypotheses();
  renderMethods(media);

  gauge.draw();
  gauge.renderFoot();
  gauge.update();

  observeLazyVideo();
  wireReveal();
  wireScroll();

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Tab') {
      trapTrayFocus(ev);
      return;
    }
    if (ev.key === 'Escape') {
      // closeTray() is a no-op when nothing is open, so a stray Escape only dismisses
      // a tooltip rather than yanking focus back to the last-used marker.
      closeTray();
      hideTip();
    }
  });

  // Fonts load with display:swap, so every caption in the assay field gets wider once
  // the real faces arrive. Re-place them then, against real metrics. Nothing else on
  // the page depends on text measurement, so nothing else is redone.
  void document.fonts.ready.then(placeFieldCaptions);

  openHashTarget();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot(render);
  });
} else {
  boot(render);
}
