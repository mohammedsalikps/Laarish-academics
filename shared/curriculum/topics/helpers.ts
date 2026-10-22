import type { ExplainerScene, IllustrationSpec, VideoAsset } from '../types.js';

/** Official video not delivered yet: tracked in content so the gap is visible. */
export function missingVideo(id: string, title: string): VideoAsset {
  return { id, title, status: 'missing', captionsLang: 'en' };
}

/**
 * Official video that has been produced, checked and registered in
 * public/media/manifest.json (which supplies its file URLs). See
 * shared/media/videoSpecs.ts and `npm run media:check`.
 */
export function officialVideo(id: string, title: string): VideoAsset {
  return { id, title, status: 'available', captionsLang: 'en' };
}

let sceneCounter = 0;

/** Explainer scene with a reading-time based duration. */
export function scene(caption: string, illustration: IllustrationSpec): ExplainerScene {
  sceneCounter += 1;
  const words = caption.split(/\s+/).length;
  return { id: `s${sceneCounter}`, caption, illustration, durationMs: Math.max(5000, Math.min(9000, words * 380)) };
}
