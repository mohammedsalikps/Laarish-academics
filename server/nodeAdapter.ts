import type { IncomingMessage, ServerResponse } from 'node:http';
import { MENTOR_LIMITS } from '../shared/mentor/safety.js';
import { clientIpFrom, type MentorService } from './mentor/handler.js';

/** Bridges Node's http request/response objects to the Web Fetch API handler. */

export class BodyTooLargeError extends Error {}

async function readBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
    size += buf.length;
    if (size > maxBytes) throw new BodyTooLargeError('Body too large');
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export async function handleNodeApiRequest(service: MentorService, req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const host = req.headers.host ?? 'localhost';
    const url = new URL(req.url ?? '/', `http://${host}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else if (value !== undefined) headers.set(key, value);
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? await readBody(req, MENTOR_LIMITS.maxBodyBytes) : undefined;
    const request = new Request(url, { method: req.method, headers, body: body ? new Uint8Array(body) : undefined });
    const ip = clientIpFrom(request, req.socket.remoteAddress ?? 'unknown', service.config.trustProxy);
    const response = await service.handle(request, ip);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const tooLarge = err instanceof BodyTooLargeError;
    res.statusCode = tooLarge ? 413 : 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: tooLarge ? 'payload_too_large' : 'server_error', message: tooLarge ? 'That message is too long.' : 'Something went wrong.' }));
  }
}
