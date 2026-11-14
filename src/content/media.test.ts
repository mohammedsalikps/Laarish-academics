import { beforeEach, describe, expect, it, vi } from 'vitest';
// The full topic (the app's catalog only has the topic index).
import { getTopic } from '../../shared/curriculum';
import { isAllowedMediaUrl, parseManifest, resolveVideo } from './media';

// A topic whose official video has not been produced yet.
const video = getTopic('friction-rough-smooth')!.watch.video;

describe('media manifest', () => {
  it('only allows https and same-origin media URLs', () => {
    expect(isAllowedMediaUrl('https://cdn.example.org/v.mp4')).toBe(true);
    expect(isAllowedMediaUrl('/media/v.mp4')).toBe(true);
    for (const bad of ['http://cdn.example.org/v.mp4', 'javascript:alert(1)', '//evil.example/v.mp4', 'data:video/mp4;base64,AAAA', 42, null]) {
      expect(isAllowedMediaUrl(bad), String(bad)).toBe(false);
    }
  });

  it('drops invalid entries and unsafe optional fields', () => {
    const m = parseManifest({
      videos: {
        good: { src: '/media/a.mp4', captionsSrc: 'javascript:x', poster: 'https://cdn.example.org/p.jpg', captionsLang: 'en' },
        bad: { src: 'http://insecure.example/a.mp4' },
        empty: null,
      },
    });
    expect(m.videos).toEqual({ good: { src: '/media/a.mp4', poster: 'https://cdn.example.org/p.jpg', captionsLang: 'en' } });
    expect(parseManifest('nonsense')).toEqual({ videos: {} });
  });

  it('keeps topics on the labelled fallback until a real video is configured', () => {
    expect(video.status).toBe('missing');
    expect(resolveVideo(video, { videos: {} })).toEqual({ state: 'missing' });
    const resolved = resolveVideo(video, { videos: { [video.id]: { src: 'https://cdn.example.org/rough-smooth.mp4' } } });
    expect(resolved.state).toBe('available');
    if (resolved.state === 'available') expect(resolved.asset.src).toBe('https://cdn.example.org/rough-smooth.mp4');
  });
});

describe('loading the manifest', () => {
  // The manifest is loaded once per visit, so each test starts from a fresh copy of the module.
  let load: typeof import('./media').loadMediaManifest;
  beforeEach(async () => {
    vi.resetModules();
    load = (await import('./media')).loadMediaManifest;
  });
  const ok = (videos: object) => new Response(JSON.stringify({ videos }), { status: 200, headers: { 'content-type': 'application/json' } });
  const entry = { 'video-x': { src: '/media/x.mp4' } };

  it('loads once and keeps it for the visit', async () => {
    const fetchImpl = vi.fn(async () => ok(entry));
    expect((await load(fetchImpl)).videos).toEqual(entry);
    expect((await load(fetchImpl)).videos).toEqual(entry);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('gives up on a manifest that does not arrive, so the topic shows its explainer, and asks again next time', async () => {
    const hanging = vi.fn(() => new Promise<Response>(() => {}));
    expect(await load(hanging, 20)).toEqual({ videos: {} });
    const fetchImpl = vi.fn(async () => ok(entry));
    expect((await load(fetchImpl, 20)).videos).toEqual(entry);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('asks again after a network failure or a server error', async () => {
    expect(await load(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))).toEqual({ videos: {} });
    expect(await load(vi.fn(async () => new Response('busy', { status: 503 })))).toEqual({ videos: {} });
    expect((await load(vi.fn(async () => ok(entry)))).videos).toEqual(entry);
  });

  it('treats a missing manifest as "no official videos" for the rest of the visit', async () => {
    const missing = vi.fn(async () => new Response('not found', { status: 404 }));
    expect(await load(missing)).toEqual({ videos: {} });
    expect(await load(missing)).toEqual({ videos: {} });
    expect(missing).toHaveBeenCalledTimes(1);
  });
});
