import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOPICS } from '../../shared/curriculum/index.js';
import { checkMediaLibrary } from '../../shared/media/manifest.js';
import { toWebVtt, VIDEO_SPECS } from '../../shared/media/videoSpecs.js';

/**
 * Media check: `npm run media:check` (add `-- --write-captions` to regenerate
 * the WebVTT files from the video specs first).
 *
 * Validates public/media/manifest.json against the curriculum, the production
 * specs and the real files (MP4 header and length, captions, posters), then
 * prints which topics have an official video. Exits with code 1 on any error.
 */

const PUBLIC = join(process.cwd(), 'public');

if (process.argv.includes('--write-captions')) {
  for (const spec of VIDEO_SPECS) {
    const path = join(PUBLIC, 'media', spec.files.captions);
    writeFileSync(path, toWebVtt(spec));
    console.log(`wrote public/media/${spec.files.captions}`);
  }
}

const readPublic = (path: string) => {
  const full = join(PUBLIC, path);
  return existsSync(full) ? new Uint8Array(readFileSync(full)) : null;
};

let manifest: unknown = null;
try {
  manifest = JSON.parse(readFileSync(join(PUBLIC, 'media', 'manifest.json'), 'utf8'));
} catch (err) {
  console.error(`Could not read public/media/manifest.json: ${(err as Error).message}`);
  process.exit(1);
}

const report = checkMediaLibrary(
  manifest,
  TOPICS.map((t) => ({ topicId: t.id, videoId: t.watch.video.id })),
  VIDEO_SPECS,
  readPublic,
);

console.log(`\nOfficial videos: ${report.available.length} of ${report.available.length + report.missing.length} topics`);
for (const v of report.available) console.log(`  ✓ ${v.topicId} (${v.videoId})`);
console.log(`Topics using the temporary animated explainer: ${report.missing.length}`);
for (const w of report.warnings) console.log(`warning: ${w}`);
for (const e of report.errors) console.error(`error: ${e}`);

if (report.errors.length) {
  console.error(`\nMEDIA CHECK FAILED: ${report.errors.length} error(s).`);
  process.exit(1);
}
console.log('\nMEDIA CHECK PASSED.');
