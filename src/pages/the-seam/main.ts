/**
 * The Seam — boot.
 *
 * A field study beneath the lead page's §1: the inventory, one mine modelled, the
 * machine that would stop it, and the company that would run it. Every figure comes
 * from the atlas or from this page's own parameter block, and the block's guard refuses
 * an unsourced constant — so a data failure has to fail loudly rather than render a
 * page that looks complete.
 */

import { boot, byId, onAnimationFrame, prefersReducedMotion, qsa } from '@/lib/dom';
import { DepthGauge } from '@/lib/depth-gauge';
import { MediaLedger, observeLazyVideo } from '@/lib/media';
import { hideTip } from '@/lib/tooltip';

import { gaugeConfig } from './column';
import { renderActOneDrawers } from './drawers';
import { renderContacts, renderEyebrows, renderHero } from './hero';
import { buildClock, buildSeamField, wireMineSelect } from './inventory';
import { renderMethods, renderMethodsAssumptions } from './methods';
import { closeTray, openAssumptions, openMine, trapTrayFocus, wireAssumptionRepaint } from './tray';
import { runTwinSelfChecks } from './twin-model';
import { buildTwinPanel, paintTwin, wireAssumptionsButton } from './twin-panel';
import { wireParticleGate } from './twin-shaft';
import { currentTwin } from './twin-state';
import { buildUnit } from './unit';
import { buildVenture } from './venture';

const media = new MediaLedger();
const gauge = new DepthGauge(gaugeConfig);

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
    }, 140);
  });
};

const render = (): void => {
  // The model must agree with itself before it renders anything: the twin reproduces
  // its published anchor, and the page's Coward constants match the physics module's.
  runTwinSelfChecks();

  renderHero();
  buildClock();
  renderEyebrows();
  renderContacts(media);

  wireMineSelect(openMine);
  buildSeamField();
  renderActOneDrawers();

  wireAssumptionsButton(() => {
    openAssumptions(byId('assumpBtn'));
  });
  wireAssumptionRepaint(() => {
    paintTwin();
    renderMethodsAssumptions();
  });

  buildTwinPanel();
  paintTwin();
  wireParticleGate(currentTwin);

  buildUnit();
  buildVenture();
  renderMethodsAssumptions();
  renderMethods(media);

  byId('dosClose').addEventListener('click', closeTray);
  byId('dosScrim').addEventListener('click', closeTray);

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
      closeTray();
      hideTip();
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot(render);
  });
} else {
  boot(render);
}
