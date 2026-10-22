import { getGrounding } from '../../shared/mentor/knowledge.js';
import { MENTOR_LIMITS, safetyReply, sanitizeMentorOutput, screenLearnerText, validateMentorRequest } from '../../shared/mentor/safety.js';
import type { MentorErrorBody, MentorReply, MentorStatus } from '../../shared/mentor/types.js';
import { readMentorConfig, type MentorServerConfig } from './config.js';
import { createProvider, type MentorProvider } from './providers.js';
import { RateLimiter } from './rateLimit.js';

/**
 * Framework-neutral API handler (Web Fetch Request -> Response).
 * Used by the Vite dev server, the standalone Node server and Vercel functions.
 *
 *   GET  /api/health  -> { ok: true }
 *   GET  /api/mentor  -> MentorStatus (which provider is active)
 *   POST /api/mentor  -> MentorReply
 *
 * Conversation content is never logged or stored.
 */

const FALLBACK_REPLY = "Hmm, I'm not sure how to answer that one. Could you ask it another way? You can also try one of the buttons below.";

export interface MentorService {
  readonly config: MentorServerConfig;
  readonly provider: MentorProvider;
  handle(request: Request, clientIp: string): Promise<Response>;
}

export interface MentorServiceDeps {
  provider?: MentorProvider;
  limiter?: RateLimiter;
}

/** Usage log line. Silent under tests unless MENTOR_LOG=1. */
function logInfo(line: string) {
  if (process.env.VITEST && process.env.MENTOR_LOG !== '1') return;
  console.info(line);
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

function error(status: number, code: MentorErrorBody['error'], message: string, extra?: Record<string, string>): Response {
  return json({ error: code, message } satisfies MentorErrorBody, status, extra);
}

export function createMentorService(config: MentorServerConfig, deps: MentorServiceDeps = {}): MentorService {
  const provider = deps.provider ?? createProvider(config);
  const limiter = deps.limiter ?? new RateLimiter(config.rateLimit, config.rateWindowMs);

  async function reply(request: Request, clientIp: string): Promise<Response> {
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (declared > MENTOR_LIMITS.maxBodyBytes) return error(413, 'payload_too_large', 'That message is too long.');
    const raw = await request.text();
    if (raw.length > MENTOR_LIMITS.maxBodyBytes) return error(413, 'payload_too_large', 'That message is too long.');

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return error(400, 'invalid_request', 'Request body must be valid JSON.');
    }
    const parsed = validateMentorRequest(body);
    if (!parsed.ok) return error(400, 'invalid_request', parsed.error);
    const req = parsed.value;

    const retryAfter = limiter.check(clientIp);
    if (retryAfter > 0) {
      return error(429, 'rate_limited', "You've asked lots of questions! Let's take a short break and try again in a minute.", {
        'retry-after': String(retryAfter),
      });
    }

    const { focus } = getGrounding(req.context);
    const screen = screenLearnerText(req.messages[req.messages.length - 1].text);
    if (screen.kind !== 'ok') {
      return json({ reply: safetyReply(screen.kind, focus), provider: provider.name, flagged: screen.kind } satisfies MentorReply);
    }

    const timeout = AbortSignal.timeout(config.timeoutMs);
    const started = Date.now();
    // Diagnostics only: which feature was used and what it cost. Never the conversation or the learner.
    const tags = `provider=${provider.name} intent=${req.intent ?? 'free'} step=${req.context.step ?? '-'} subject=${req.context.subjectId ?? '-'}`;
    try {
      const result = await provider.reply(req, timeout);
      const clean = result.text ? sanitizeMentorOutput(result.text) : null;
      const m = result.meta;
      if (m || !clean) {
        logInfo(
          `[mentor] ok ${tags} ms=${Date.now() - started}` +
            (m ? ` model=${m.model} stop=${m.stopReason} calls=${m.apiCalls} tools=${m.toolCalls} in=${m.inputTokens} out=${m.outputTokens} cache_read=${m.cacheReadTokens} cache_write=${m.cacheWriteTokens}` : '') +
            (clean ? '' : ' fallback_reply=1'),
        );
      }
      const body: MentorReply = {
        reply: clean ?? FALLBACK_REPLY,
        provider: provider.name,
        ...(result.followUps ? { followUps: result.followUps } : {}),
      };
      return json(body);
    } catch (err) {
      const timedOut = timeout.aborted || (err instanceof Error && /timed? ?out|abort/i.test(err.name + err.message));
      // Log only the error class and status, never the conversation.
      const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : undefined;
      console.warn(`[mentor] error ${tags} ms=${Date.now() - started} error=${(err as Error)?.name ?? 'unknown'}${status ? ` status=${status}` : ''}${timedOut ? ' timeout=1' : ''}`);
      if (timedOut) return error(504, 'timeout', 'Your mentor is taking too long to think. Please try again.');
      return error(502, 'mentor_unavailable', "Your mentor couldn't answer just now. Please try again in a moment.");
    }
  }

  return {
    config,
    provider,
    async handle(request: Request, clientIp: string): Promise<Response> {
      const path = new URL(request.url, 'http://localhost').pathname.replace(/\/+$/, '');
      if (path === '/api/health') {
        return request.method === 'GET' || request.method === 'HEAD'
          ? json({ ok: true })
          : error(405, 'method_not_allowed', 'Use GET.', { allow: 'GET' });
      }
      if (path === '/api/mentor') {
        if (request.method === 'GET') {
          return json({ provider: provider.name, ...(provider.model ? { model: provider.model } : {}) } satisfies MentorStatus);
        }
        if (request.method === 'POST') return reply(request, clientIp);
        return error(405, 'method_not_allowed', 'Use GET or POST.', { allow: 'GET, POST' });
      }
      return json({ error: 'not_found' }, 404);
    },
  };
}

let shared: MentorService | null = null;

/** Lazily created service bound to process environment variables. */
export function getMentorService(env: Record<string, string | undefined> = process.env): MentorService {
  if (!shared) shared = createMentorService(readMentorConfig(env));
  return shared;
}

export function clientIpFrom(request: Request, fallback: string, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
  }
  return fallback;
}
