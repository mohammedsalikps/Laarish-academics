import { describe, expect, it } from 'vitest';
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
