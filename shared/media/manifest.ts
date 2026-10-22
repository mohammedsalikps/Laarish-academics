import { getVideoSpec, specProblems, toWebVtt, type VideoSpec } from './videoSpecs.js';

/**
 * Media manifest (public/media/manifest.json): which official lesson videos
 * exist and where their files are. Shared by the app (loading) and by
 * `npm run media:check` and the tests (validation against the real files).
 */

export interface MediaEntry {
  src: string;
  captionsSrc?: string;
  captionsLang?: string;
  poster?: string;
}

export interface MediaManifest {
  videos: Record<string, MediaEntry>;
}

export const EMPTY_MANIFEST: MediaManifest = { videos: {} };

export function isAllowedMediaUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 2000) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validates a parsed manifest, dropping any entry with an unsafe or missing URL. */
export function parseManifest(raw: unknown): MediaManifest {
  if (!raw || typeof raw !== 'object' || typeof (raw as { videos?: unknown }).videos !== 'object') return EMPTY_MANIFEST;
  const videos: Record<string, MediaEntry> = {};
  for (const [id, entry] of Object.entries((raw as { videos: Record<string, unknown> }).videos ?? {})) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (!isAllowedMediaUrl(e.src)) continue;
    videos[id] = {
      src: e.src,
      ...(isAllowedMediaUrl(e.captionsSrc) ? { captionsSrc: e.captionsSrc } : {}),
      ...(isAllowedMediaUrl(e.poster) ? { poster: e.poster } : {}),
      ...(typeof e.captionsLang === 'string' ? { captionsLang: e.captionsLang.slice(0, 10) } : {}),
    };
  }
  return { videos };
}

/** Duration in seconds from an MP4's movie header, or null if it is not a readable MP4. */
export function mp4DurationS(bytes: Uint8Array): number | null {
  const ascii = (at: number, len: number) => String.fromCharCode(...bytes.subarray(at, at + len));
  if (bytes.length < 16 || ascii(4, 4) !== 'ftyp') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Walk boxes: top level to 'moov', then its children to 'mvhd'.
  const find = (type: string, from: number, to: number): number | null => {
    let at = from;
    while (at + 8 <= to) {
      let size = view.getUint32(at);
      if (size === 1 && at + 16 <= to) size = Number(view.getBigUint64(at + 8));
      else if (size === 0) size = to - at;
      if (size < 8) return null;
      if (ascii(at + 4, 4) === type) return at;
      at += size;
    }
    return null;
  };
  const moov = find('moov', 0, bytes.length);
  if (moov === null) return null;
  const mvhd = find('mvhd', moov + 8, moov + view.getUint32(moov));
  if (mvhd === null) return null;
  const body = mvhd + 8;
  const version = bytes[body];
  const timescale = version === 1 ? view.getUint32(body + 20) : view.getUint32(body + 12);
  const duration = version === 1 ? Number(view.getBigUint64(body + 24)) : view.getUint32(body + 16);
  return timescale ? duration / timescale : null;
}

/** Problems in a WebVTT file: header, timing format and order. */
export function vttProblems(text: string): string[] {
  const problems: string[] = [];
  if (!text.startsWith('WEBVTT')) problems.push('does not start with WEBVTT');
  const time = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;
  let prevEnd = -1;
  let cues = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('-->')) continue;
    const m = time.exec(line.trim());
    if (!m) {
      problems.push(`bad cue timing "${line}"`);
      continue;
    }
    const n = m.slice(1).map(Number);
    const start = n[0] * 3600 + n[1] * 60 + n[2] + n[3] / 1000;
    const end = n[4] * 3600 + n[5] * 60 + n[6] + n[7] / 1000;
    if (end <= start) problems.push(`cue ends before it starts: "${line}"`);
    if (start < prevEnd) problems.push(`cue overlaps the previous one: "${line}"`);
    prevEnd = end;
    cues += 1;
  }
  if (!cues) problems.push('has no cues');
  return problems;
}

export interface CurriculumVideo {
  topicId: string;
  videoId: string;
}

export interface MediaReport {
  errors: string[];
  warnings: string[];
  available: CurriculumVideo[];
  missing: CurriculumVideo[];
}

/**
 * Checks the manifest against the curriculum, the production specs and the
 * real files. `readPublic(path)` returns a file under public/ (e.g.
 * "media/videos/x.mp4") or null when it does not exist.
 */
export function checkMediaLibrary(
  rawManifest: unknown,
  curriculumVideos: CurriculumVideo[],
  specs: VideoSpec[],
  readPublic: (path: string) => Uint8Array | null,
): MediaReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const known = new Map(curriculumVideos.map((v) => [v.videoId, v]));
  const rawVideos = (rawManifest as { videos?: Record<string, unknown> } | null)?.videos;
  if (!rawVideos || typeof rawVideos !== 'object') errors.push('manifest has no "videos" object');
  const manifest = parseManifest(rawManifest);
  for (const id of Object.keys(rawVideos ?? {})) if (!manifest.videos[id]) errors.push(`${id}: entry dropped (missing or unsafe src URL)`);

  const decoder = new TextDecoder();
  const localPath = (url: string) => (url.startsWith('/') ? url.slice(1) : null);

  for (const [id, entry] of Object.entries(manifest.videos)) {
    if (!known.has(id)) errors.push(`${id}: not a video id in the curriculum`);
    const spec = getVideoSpec(id) ?? specs.find((s) => s.videoId === id);

    const videoPath = localPath(entry.src);
    if (videoPath) {
      const bytes = readPublic(videoPath);
      if (!bytes) errors.push(`${id}: video file public/${videoPath} is missing`);
      else {
        const duration = mp4DurationS(bytes);
        if (duration === null) errors.push(`${id}: public/${videoPath} is not a readable MP4`);
        else if (spec) {
          const [min, max] = spec.targetDurationS;
          if (duration < min - 1 || duration > max + 1) errors.push(`${id}: video is ${duration.toFixed(1)}s, outside ${min}-${max}s`);
          const scriptEnd = spec.scenes[spec.scenes.length - 1]?.endS ?? 0;
          if (Math.abs(duration - scriptEnd) > 1.5) errors.push(`${id}: video is ${duration.toFixed(1)}s but the script runs ${scriptEnd}s`);
        }
      }
      if (spec && videoPath !== `media/${spec.files.video}`) errors.push(`${id}: src ${entry.src} does not match the spec file media/${spec.files.video}`);
    } else warnings.push(`${id}: remote video ${entry.src} was not checked`);

    if (!entry.captionsSrc) warnings.push(`${id}: no captions`);
    else {
      const capPath = localPath(entry.captionsSrc);
      const bytes = capPath ? readPublic(capPath) : null;
      if (capPath && !bytes) errors.push(`${id}: captions file public/${capPath} is missing`);
      if (bytes) {
        const text = decoder.decode(bytes);
        for (const p of vttProblems(text)) errors.push(`${id}: captions ${p}`);
        if (spec && text.replace(/\r\n/g, '\n') !== toWebVtt(spec)) errors.push(`${id}: captions are out of date with the spec (run npm run media:check -- --write-captions)`);
      }
    }

    if (entry.poster) {
      const posterPath = localPath(entry.poster);
      if (posterPath && !readPublic(posterPath)) errors.push(`${id}: poster public/${posterPath} is missing`);
    }
  }

  for (const spec of specs) {
    for (const p of specProblems(spec)) errors.push(p);
    const video = known.get(spec.videoId);
    if (!video) errors.push(`${spec.videoId}: spec does not match any curriculum video`);
    else if (video.topicId !== spec.topicId) errors.push(`${spec.videoId}: spec topic ${spec.topicId} does not match curriculum topic ${video.topicId}`);
    const registered = Boolean(manifest.videos[spec.videoId]);
    if (spec.production.status === 'checked' && !registered) errors.push(`${spec.videoId}: marked checked but not registered in the manifest`);
    if (spec.production.status !== 'checked' && registered) errors.push(`${spec.videoId}: registered in the manifest but the spec is not marked checked`);
  }

  const available = curriculumVideos.filter((v) => manifest.videos[v.videoId]);
  const missing = curriculumVideos.filter((v) => !manifest.videos[v.videoId]);
  return { errors, warnings, available, missing };
}
