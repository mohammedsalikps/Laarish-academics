import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { put } from '@vercel/blob';
import { LESSONS, SUBJECTS, TOPICS } from '../../shared/curriculum/index.js';
import { buildVideoQueue, captionsVtt } from '../../shared/media/videoQueue.js';

/**
 * `npm run videos:ingest -- results.json`: brings finished clips into the app.
 *
 * results.json lists clips that a generator (Moda, Higgsfield, Weave, ...) actually produced:
 *   [{ "videoId": "video-magnets-what-they-attract", "sourceUrl": "https://...", "provider": "moda", "model": "..." }]
 *
 * For each clip: download (https only) → check with ffprobe (a real video, 5-25 s) → re-encode for
 * phones (720p H.264, fast start, no audio) → thumbnail at 1 s → captions from the topic's key ideas →
 * upload all three to Vercel Blob (BLOB_READ_WRITE_TOKEN, server-side only) → point
 * public/media/manifest.json at the Blob URLs → record the result in content/video-log.json.
 *
 * `--local` stores the files in public/media (videos/, posters/, captions/) instead, served with
 * the app like the first imported video; use it for a few clips before Blob is set up.
 *
 * Without BLOB_READ_WRITE_TOKEN (and without --local) it is a dry run: files are prepared in a temp
 * folder and nothing is published or marked completed. No URL is ever written that does not point
 * at a stored file.
 */

interface Result {
  videoId: string;
  sourceUrl: string;
  provider: string;
  model?: string;
}
type LogEntry = { status: 'completed' | 'failed'; provider?: string; model?: string; error?: string; at: string };

const root = process.cwd();
const args = process.argv.slice(2);
const local = args.includes('--local');
const inputPath = args.find((a) => !a.startsWith('--'));
if (!inputPath) {
  console.error('Usage: npm run videos:ingest -- <results.json> [--local]');
  process.exit(1);
}
const results = JSON.parse(readFileSync(inputPath, 'utf8')) as Result[];
const token = process.env.BLOB_READ_WRITE_TOKEN;
const dryRun = !token && !local;
const jobs = new Map(buildVideoQueue(TOPICS, LESSONS, SUBJECTS).map((j) => [j.videoId, j]));
const topicLanguage = new Map(TOPICS.map((t) => [t.watch.video.id, t.language]));

const manifestPath = join(root, 'public/media/manifest.json');
const logPath = join(root, 'content/video-log.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { videos: Record<string, unknown> };
const log = (existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { entries: {} }) as { entries: Record<string, LogEntry> };
const work = join(tmpdir(), 'laarish-video-ingest');
mkdirSync(work, { recursive: true });

const ffprobeDuration = (file: string): number => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { encoding: 'utf8' });
  const info = JSON.parse(out) as { streams?: { codec_type?: string }[]; format?: { duration?: string } };
  if (!info.streams?.some((s) => s.codec_type === 'video')) throw new Error('no video stream');
  return Number(info.format?.duration ?? NaN);
};

async function ingest(r: Result): Promise<void> {
  const job = jobs.get(r.videoId);
  if (!job) throw new Error(`unknown videoId ${r.videoId}`);
  if (!/^https:\/\//.test(r.sourceUrl)) throw new Error('sourceUrl must be https');
  const res = await fetch(r.sourceUrl);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const raw = join(work, `${r.videoId}.source`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));

  const sourceDuration = ffprobeDuration(raw);
  if (!(sourceDuration >= 5 && sourceDuration <= 25)) throw new Error(`length ${sourceDuration.toFixed(1)} s is outside 5-25 s`);

  const mp4 = join(work, `${r.videoId}.mp4`);
  const poster = join(work, `${r.videoId}.jpg`);
  const vtt = join(work, `${r.videoId}.vtt`);
  // 720p H.264 with fast start plays on ordinary phones; the clips are silent (captions carry the words).
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', mp4]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '1', '-i', mp4, '-frames:v', '1', '-vf', 'scale=-2:720', '-q:v', '4', poster]);
  const duration = ffprobeDuration(mp4);
  writeFileSync(vtt, captionsVtt(job.captions, duration));

  if (dryRun) {
    console.log(`dry run ${r.videoId}: ${duration.toFixed(1)} s, files in ${work} (set BLOB_READ_WRITE_TOKEN to publish)`);
    return;
  }
  const LOCAL_DIR: Record<string, string> = { 'video/mp4': 'videos', 'image/jpeg': 'posters', 'text/vtt': 'captions' };
  const upload = async (file: string, name: string, contentType: string): Promise<string> => {
    if (local) {
      const dir = join(root, 'public/media', LOCAL_DIR[contentType]);
      mkdirSync(dir, { recursive: true });
      copyFileSync(file, join(dir, name));
      return `/media/${LOCAL_DIR[contentType]}/${name}`;
    }
    return (await put(`lesson-videos/${name}`, readFileSync(file), { access: 'public', token, contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31_536_000 })).url;
  };
  const lang = topicLanguage.get(r.videoId) ?? 'en';
  const base = r.videoId.replace(/^video-/, '');
  manifest.videos[r.videoId] = {
    src: await upload(mp4, `${base}.mp4`, 'video/mp4'),
    poster: await upload(poster, `${base}.jpg`, 'image/jpeg'),
    captionsSrc: await upload(vtt, `${base}.${lang}.vtt`, 'text/vtt'),
    captionsLang: lang,
  };
  log.entries[r.videoId] = { status: 'completed', provider: r.provider, model: r.model, at: new Date().toISOString() };
  console.log(`published ${r.videoId} (${duration.toFixed(1)} s) to ${local ? 'public/media' : 'Vercel Blob'}`);
}

for (const r of results) {
  try {
    await ingest(r);
  } catch (err) {
    const error = (err as Error).message.slice(0, 200);
    log.entries[r.videoId] = { status: 'failed', provider: r.provider, model: r.model, error, at: new Date().toISOString() };
    console.error(`failed ${r.videoId}: ${error}`);
  }
}
if (!dryRun) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const published = results.filter((r) => log.entries[r.videoId]?.status === 'completed').map((r) => r.videoId);
  // The curriculum labels each topic's video; tests keep it in step with the manifest.
  if (published.length) console.log(`Next: mark ${published.join(', ')} as officialVideo(...) in shared/curriculum/topics, then run npm run curriculum:index and npm test.`);
}
mkdirSync(join(root, 'content'), { recursive: true });
writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');
