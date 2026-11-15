import { useEffect, useState } from 'react';
import { EMPTY_MANIFEST, isAllowedMediaUrl, parseManifest, type MediaManifest } from '../../shared/media/manifest';
import type { VideoAsset } from '../domain/types';

/**
 * Lesson media manifest.
 *
 * Official videos are configured in public/media/manifest.json (or the URL in
 * VITE_MEDIA_MANIFEST_URL), keyed by the video id in the curriculum:
 *
 *   { "videos": { "video-friction-what-is": { "src": "/media/videos/friction-what-is.mp4",
 *                                              "captionsSrc": "/media/captions/friction-what-is.en.vtt" } } }
 *
 * Only https:// URLs and same-origin paths are accepted. Missing or invalid
 * entries leave the topic on its clearly labelled temporary explainer.
 * `npm run media:check` validates every entry against the real files.
 */

export { isAllowedMediaUrl, parseManifest, type MediaEntry, type MediaManifest } from '../../shared/media/manifest';

const EMPTY: MediaManifest = EMPTY_MANIFEST;

let manifestPromise: Promise<MediaManifest> | null = null;

/** A manifest that has not arrived by then is given up on, so the Watch step shows the explainer instead of waiting. */
export const MANIFEST_TIMEOUT_MS = 8_000;

/**
 * Loads the media manifest once per visit. A missing manifest (4xx) means "no
 * official videos" for the whole visit. A network failure, server error or
 * slow response leaves the current topic on its explainer, and the next topic
 * asks again, so videos come back once the connection does.
 */
export function loadMediaManifest(fetchImpl: typeof fetch = globalThis.fetch?.bind(globalThis), timeoutMs = MANIFEST_TIMEOUT_MS): Promise<MediaManifest> {
  if (!manifestPromise) {
    const url = import.meta.env.VITE_MEDIA_MANIFEST_URL || '/media/manifest.json';
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller?.abort();
        reject(new Error('Media manifest timed out'));
      }, timeoutMs);
    });
    const request = (async () => {
      const res = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: controller?.signal });
      if (res.status >= 400 && res.status < 500) return EMPTY;
      if (!res.ok) throw new Error(`Media manifest failed with ${res.status}`);
      return parseManifest(await res.json());
    })();
    manifestPromise = Promise.race([request, timeout])
      .catch(() => {
        manifestPromise = null;
        return EMPTY;
      })
      .finally(() => clearTimeout(timer));
  }
  return manifestPromise;
}

export type ResolvedVideo = { state: 'loading' } | { state: 'missing' } | { state: 'available'; asset: VideoAsset & { src: string } };

/** Resolves a curriculum video against the manifest. */
export function resolveVideo(video: VideoAsset, manifest: MediaManifest): ResolvedVideo {
  const entry = manifest.videos[video.id];
  if (entry) return { state: 'available', asset: { ...video, ...entry, status: 'available' } };
  if (video.src && isAllowedMediaUrl(video.src)) return { state: 'available', asset: { ...video, src: video.src } };
  return { state: 'missing' };
}

export function useVideo(video: VideoAsset): ResolvedVideo {
  const [manifest, setManifest] = useState<MediaManifest | null>(null);
  useEffect(() => {
    let alive = true;
    void loadMediaManifest().then((m) => alive && setManifest(m));
    return () => {
      alive = false;
    };
  }, []);
  if (!manifest) return { state: 'loading' };
  return resolveVideo(video, manifest);
}
