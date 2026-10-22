// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../shared/curriculum/index';
import { checkMediaLibrary, mp4DurationS, vttProblems } from '../../shared/media/manifest';
import { getVideoSpec, narrationCues, specProblems, toWebVtt, VIDEO_SPECS } from '../../shared/media/videoSpecs';

const PUBLIC = join(process.cwd(), 'public');
const readPublic = (path: string) => (existsSync(join(PUBLIC, path)) ? new Uint8Array(readFileSync(join(PUBLIC, path))) : null);
const manifest = JSON.parse(readFileSync(join(PUBLIC, 'media', 'manifest.json'), 'utf8')) as { videos: Record<string, unknown> };
const curriculumVideos = TOPICS.map((t) => ({ topicId: t.id, videoId: t.watch.video.id }));

describe('media library (real files)', () => {
  it('passes the media check: every registered video, caption file and poster exists and is valid', () => {
    const report = checkMediaLibrary(manifest, curriculumVideos, VIDEO_SPECS, readPublic);
    expect(report.errors).toEqual([]);
    expect(report.available.map((v) => v.topicId)).toContain('friction-what-is');
  });

  it('keeps curriculum video status in step with the manifest', () => {
    for (const topic of TOPICS) {
      const registered = Boolean(manifest.videos[topic.watch.video.id]);
      expect(topic.watch.video.status === 'available', topic.id).toBe(registered);
    }
  });

  it('the Friction video is a real 62 s H.264 MP4 within the 45-120 s target', () => {
    const bytes = readPublic('media/videos/friction-what-is.mp4')!;
    expect(bytes.length).toBeGreaterThan(500_000);
    expect(mp4DurationS(bytes)).toBeCloseTo(62, 0);
  });
});

describe('video production specs', () => {
  it('are well formed: scenes are contiguous, captions readable, and the video ends with a question', () => {
    for (const spec of VIDEO_SPECS) {
      expect(specProblems(spec), spec.videoId).toEqual([]);
      expect(vttProblems(toWebVtt(spec)), spec.videoId).toEqual([]);
      expect(spec.objective.length).toBeGreaterThan(20);
      expect(spec.accuracyChecks.length).toBeGreaterThan(0);
      for (const scene of spec.scenes) {
        expect(scene.visuals && scene.animation && scene.purpose, `${spec.videoId}/${scene.id}`).toBeTruthy();
        expect(scene.onScreenText.length, `${spec.videoId}/${scene.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('matches the topic it belongs to', () => {
    for (const spec of VIDEO_SPECS) {
      const topic = TOPICS.find((t) => t.id === spec.topicId);
      expect(topic?.watch.video.id).toBe(spec.videoId);
    }
  });

  it('teaches what the curriculum says about friction', () => {
    const spec = getVideoSpec('video-friction-what-is')!;
    const words = narrationCues(spec)
      .map((c) => c.text)
      .join(' ')
      .toLowerCase();
    expect(words).toContain('force');
    expect(words).toContain('against the way things move');
    expect(words).toMatch(/farthest on ice/);
  });
});

describe('media check catches broken references', () => {
  const ok = (path: string) => readPublic(path);

  it('reports missing files, unknown ids, unsafe URLs and non-MP4 files', () => {
    const broken = {
      videos: {
        'video-friction-what-is': { src: '/media/videos/does-not-exist.mp4', captionsSrc: '/media/captions/nope.vtt' },
        'video-made-up': { src: '/media/videos/friction-what-is.mp4' },
        'video-friction-helps-us': { src: 'javascript:alert(1)' },
        'video-friction-reducing': { src: '/media/manifest.json' },
      },
    };
    const { errors } = checkMediaLibrary(broken, curriculumVideos, VIDEO_SPECS, ok);
    const text = errors.join('\n');
    expect(text).toMatch(/does-not-exist\.mp4 is missing/);
    expect(text).toMatch(/nope\.vtt is missing/);
    expect(text).toMatch(/video-made-up: not a video id in the curriculum/);
    expect(text).toMatch(/video-friction-helps-us: entry dropped/);
    expect(text).toMatch(/manifest\.json is not a readable MP4/);
  });

  it('reports a checked spec that is not registered', () => {
    const { errors } = checkMediaLibrary({ videos: {} }, curriculumVideos, VIDEO_SPECS, ok);
    expect(errors.join('\n')).toMatch(/video-friction-what-is: marked checked but not registered/);
  });

  it('reports captions that drifted from the spec', () => {
    const edited = (path: string) => (path.endsWith('.vtt') ? new TextEncoder().encode('WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nHello\n') : ok(path));
    const { errors } = checkMediaLibrary(manifest, curriculumVideos, VIDEO_SPECS, edited);
    expect(errors.join('\n')).toMatch(/captions are out of date/);
  });
});
