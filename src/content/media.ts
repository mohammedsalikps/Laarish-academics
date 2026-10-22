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

export function loadMediaManifest(fetchImpl: typeof fetch = globalThis.fetch?.bind(globalThis)): Promise<MediaManifest> {
  if (!manifestPromise) {
    const url = import.meta.env.VITE_MEDIA_MANIFEST_URL || '/media/manifest.json';
    manifestPromise = (async () => {
      try {
        const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
        if (!res.ok) return EMPTY;
        return parseManifest(await res.json());
      } catch {
        return EMPTY;
      }
    })();
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
