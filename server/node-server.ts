import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMentorService } from './mentor/handler.js';
import { handleNodeApiRequest } from './nodeAdapter.js';

/**
 * Standalone production server: serves the built SPA from ./dist and the
 * mentor API from /api. Build with `npm run build`, run with `npm start`.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '../dist');
const port = Number(process.env.PORT ?? 3000);
const service = getMentorService(process.env);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.vtt': 'text/vtt; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  // The microphone is allowed for this site only: quizzes can take spoken answers when a grown-up turns them on.
  'permissions-policy': 'camera=(), microphone=(self), geolocation=(), payment=()',
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
};

async function fileFor(urlPath: string): Promise<{ path: string; size: number } | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const resolved = path.resolve(distDir, `.${path.posix.normalize(decoded)}`);
  if (!resolved.startsWith(distDir)) return null; // path traversal guard
  try {
    const info = await stat(resolved);
    return info.isFile() ? { path: resolved, size: info.size } : null;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);

  if (url.pathname.startsWith('/api/')) {
    await handleNodeApiRequest(service, req, res);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }

  let file = await fileFor(url.pathname);
  // SPA fallback: unknown routes without a file extension serve index.html so deep links and refreshes work.
  if (!file && !path.extname(url.pathname)) file = await fileFor('/index.html');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  const ext = path.extname(file.path).toLowerCase();
  const immutable = url.pathname.startsWith('/assets/');
  const headers: Record<string, string | number> = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'accept-ranges': 'bytes',
  };

  // Byte ranges: browsers (Safari in particular) need them to play and seek lesson videos.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  let start = 0;
  let end = file.size - 1;
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, file.size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), file.size - 1) : file.size - 1;
    if (start > end || start >= file.size) {
      res.writeHead(416, { 'content-range': `bytes */${file.size}` }).end();
      return;
    }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${file.size}`, 'content-length': end - start + 1 });
  } else {
    res.writeHead(200, { ...headers, 'content-length': file.size });
  }
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file.path, { start, end }).on('error', () => res.end()).pipe(res);
});

server.listen(port, () => {
  const mentor = service.provider.name === 'claude' ? `Claude (${service.provider.model})` : 'demo mentor (no ANTHROPIC_API_KEY)';
  console.log(`Laarish Academics running at http://localhost:${port}  |  mentor: ${mentor}`);
});
