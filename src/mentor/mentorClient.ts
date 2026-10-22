import { getLesson, getTopic, loadTopicContent } from '../content';
import { demoReply } from '../../shared/mentor/demoReply';
import { groundingFor, type GroundingContext, type MentorGrounding } from '../../shared/mentor/grounding';
import { MENTOR_LIMITS } from '../../shared/mentor/safety';
import type { MentorErrorBody, MentorReply, MentorRequest, MentorStatus } from '../../shared/mentor/types';

/**
 * Browser client for the mentor API.
 *
 * - Server reachable: returns the server's reply (Claude or the server demo).
 * - No backend (static hosting, 404/405, non-JSON) or offline: answers locally
 *   with the demo mentor and marks the reply source as 'local-demo'.
 * - Server errors (429, 5xx, timeout): returns a typed, retryable error.
 */

export type MentorClientError = {
  kind: 'rate-limited' | 'timeout' | 'unavailable' | 'invalid';
  message: string;
  retryable: boolean;
};

export type MentorClientResult =
  | { ok: true; reply: MentorReply; source: 'server' | 'local-demo' }
  | { ok: false; error: MentorClientError };

export const MENTOR_ENDPOINT = '/api/mentor';

/**
 * Turns the on-screen conversation into request messages. Messages marked
 * localOnly (the greeting, which contains the nickname) and failed replies
 * are dropped, so no nickname leaves the device.
 */
export function toMentorMessages(
  history: { role: 'learner' | 'mentor'; text: string; error?: unknown; localOnly?: boolean }[],
): MentorRequest['messages'] {
  return history
    .filter((m) => !m.error && !m.localOnly)
    .slice(-CLIENT_HISTORY)
    .map((m) => ({ role: m.role, text: m.role === 'mentor' ? m.text.slice(0, MENTOR_HISTORY_CHARS) : m.text }));
}

/** Only the last few turns are sent: enough for follow-up questions, small enough to stay cheap. */
export const CLIENT_HISTORY = Math.min(6, MENTOR_LIMITS.maxMessages);
const MENTOR_HISTORY_CHARS = 600;
const DEFAULT_TIMEOUT_MS = 25_000;

/** Grounding for the local demo, from the topic content of the subject being learned (downloaded if needed). */
export async function loadGrounding(context: GroundingContext): Promise<MentorGrounding> {
  const subjectId = getTopic(context.topicId)?.subjectId ?? getLesson(context.lessonId)?.subjectId;
  const topics = subjectId ? await loadTopicContent(subjectId).catch(() => undefined) : undefined;
  return groundingFor(context, (id) => (id ? topics?.get(id) : undefined));
}

async function localDemo(request: MentorRequest): Promise<MentorClientResult> {
  return { ok: true, reply: demoReply(request, await loadGrounding(request.context)), source: 'local-demo' };
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export async function askMentor(
  request: MentorRequest,
  /**
   * liveBackend: the mentor API answered the status check. A network failure is
   * then reported as a retryable error rather than silently answered by the demo.
   */
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; liveBackend?: boolean; mentorName?: string } = {},
): Promise<MentorClientResult> {
  // Messages speak with the chosen mentor's name (Rishi or Ayra).
  const who = opts.mentorName ?? 'Your mentor';
  if (isOffline()) {
    return opts.liveBackend
      ? { ok: false, error: { kind: 'unavailable', message: "You're offline. Connect to the internet and try again.", retryable: true } }
      : localDemo(request);
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetchImpl(MENTOR_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    // No mentor backend deployed (e.g. static hosting): use the local demo.
    if (res.status === 404 || res.status === 405) return localDemo(request);
    const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
    if (!isJson) return res.ok ? localDemo(request) : unavailable(who);
    const data = (await res.json().catch(() => null)) as (MentorReply & Partial<MentorErrorBody>) | null;

    if (res.ok && data && typeof data.reply === 'string') return { ok: true, reply: data, source: 'server' };
    if (res.status === 429) {
      return { ok: false, error: { kind: 'rate-limited', message: data?.message ?? "Let's take a short break and try again in a minute.", retryable: true } };
    }
    if (res.status === 504) return { ok: false, error: { kind: 'timeout', message: `${who} took too long to answer. Please try again.`, retryable: true } };
    if (res.status === 400 || res.status === 413) {
      return { ok: false, error: { kind: 'invalid', message: data?.message ?? `${who} could not understand that message.`, retryable: false } };
    }
    return unavailable(who);
  } catch {
    if (timedOut) return { ok: false, error: { kind: 'timeout', message: `${who} took too long to answer. Please try again.`, retryable: true } };
    // The live mentor was reachable before: say so honestly instead of switching to demo answers.
    if (opts.liveBackend) return { ok: false, error: { kind: 'unavailable', message: `${who} couldn't connect just now. Please try again.`, retryable: true } };
    // No mentor API at all (e.g. static hosting): answer locally, labelled as a demo.
    return localDemo(request);
  } finally {
    clearTimeout(timer);
  }
}

function unavailable(who: string): MentorClientResult {
  return { ok: false, error: { kind: 'unavailable', message: `${who} couldn't answer just now. Please try again in a moment.`, retryable: true } };
}

export interface MentorStatusView extends MentorStatus {
  /** False when no mentor backend answered (local demo only). */
  backend: boolean;
}

export async function fetchMentorStatus(fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<MentorStatusView> {
  try {
    const res = await fetchImpl(MENTOR_ENDPOINT, { method: 'GET', headers: { accept: 'application/json' } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return { provider: 'demo', backend: false };
    const data = (await res.json()) as MentorStatus;
    return { provider: data.provider === 'claude' ? 'claude' : 'demo', model: data.model, backend: true };
  } catch {
    return { provider: 'demo', backend: false };
  }
}
