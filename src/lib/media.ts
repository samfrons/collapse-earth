/**
 * Footage: lazy, tag-selected, credited, and inside a payload budget.
 *
 * Clips are chosen by tag rather than by slug, so swapping footage is an edit in
 * the atlas and nowhere else. Under reduced motion no video element is created at
 * all — the poster still frame is the whole treatment, not a fallback that a
 * `<video>` sits behind waiting to play.
 */

import { clip, clipsTagged, type MediaSlug } from '@/data';
import { attr, html, type SafeHtml } from './html';
import { prefersReducedMotion } from './dom';

/**
 * Tracks which clips a page actually used, so the credits list can be rendered
 * from what shipped rather than from what exists. A licence printed for footage
 * that never appeared is as wrong as one that is missing.
 */
export class MediaLedger {
  readonly #used: MediaSlug[] = [];
  readonly #reduced = prefersReducedMotion();

  /** First clip carrying `tag`, at the given index into the matches. */
  pick(tag: string, index = 0): MediaSlug | undefined {
    return clipsTagged(tag)[index];
  }

  use(slug: MediaSlug): void {
    if (!this.#used.includes(slug)) this.#used.push(slug);
  }

  /** Slugs actually rendered, in first-use order. */
  get used(): readonly MediaSlug[] {
    return this.#used;
  }

  /** The clip's record — credit, licence, verification date. */
  clipFor(slug: MediaSlug) {
    return clip(slug);
  }

  /** Human-readable download weight, for a control that asks before fetching. */
  weight(slug: MediaSlug): string {
    const { bytes } = clip(slug);
    return bytes > 0 ? `${String(Math.round(bytes / 1e5) / 10)} MB` : '';
  }

  /**
   * Markup for one clip.
   *
   * `autoplay: false` opts a clip out of the intersection observer entirely, so it
   * is fetched only when the reader asks. That is what keeps the first viewport
   * inside its budget when the hero holds the largest clip on the page.
   */
  markup(slug: MediaSlug, className = '', options?: { readonly autoplay?: boolean }): SafeHtml {
    const m = clip(slug);
    if (this.#reduced) {
      return html`<img
        class="${className} contact-poster"
        src="${attr(m.poster)}"
        alt=""
        loading="lazy"
        decoding="async"
      />`;
    }
    const autoplay = options?.autoplay !== false;
    return html`<video
      class="${className}"
      muted
      loop
      playsinline
      preload="none"
      poster="${attr(m.poster)}"
      data-autoplay="${autoplay ? 'true' : 'false'}"
      aria-hidden="true"
    >
      <source src="${attr(m.mp4)}" type="video/mp4" />
    </video>`;
  }
}

/**
 * Play only while on screen; pause otherwise; never preload. Clips marked
 * `data-autoplay="false"` are excluded — those are fetched only on request.
 */
export const observeLazyVideo = (): void => {
  const videos = [...document.querySelectorAll('video')].filter(
    (v) => v.getAttribute('data-autoplay') !== 'false',
  );
  if (videos.length === 0 || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          if (video.preload === 'none') video.preload = 'auto';
          // Autoplay refusal is expected and fine: the poster stands in.
          void video.play().catch(() => undefined);
        } else if (!video.paused) {
          video.pause();
        }
      }
    },
    { rootMargin: '160px 0px', threshold: 0.05 },
  );

  for (const video of videos) observer.observe(video);
};
