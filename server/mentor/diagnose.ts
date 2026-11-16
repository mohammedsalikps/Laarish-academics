import Anthropic from '@anthropic-ai/sdk';
import type { MentorFailure, MentorFailureDetail } from '../../shared/mentor/types.js';

/**
 * Turns an error from the Anthropic SDK (or our own wrapper around it) into a reason category.
 * Typed SDK error classes come first; the HTTP status is the fallback for wrapped or foreign
 * errors. The result is safe to log and to show grown-ups: it never contains the key or a prompt.
 */
export function classifyFailure(err: unknown): MentorFailure {
  // ensureModel() wraps the SDK error; the cause keeps the original class.
  const e = (err as { name?: string; cause?: unknown })?.name === 'ModelUnavailableError' ? ((err as { cause?: unknown }).cause ?? err) : err;

  if (e instanceof Anthropic.APIConnectionTimeoutError) return 'timeout';
  if (e instanceof Anthropic.APIConnectionError) return 'unreachable';
  if (e instanceof Anthropic.AuthenticationError) return 'auth';
  if (e instanceof Anthropic.PermissionDeniedError) return 'permission';
  if (e instanceof Anthropic.NotFoundError) return 'model';
  if (e instanceof Anthropic.RateLimitError) return 'rate_limited';
  // An empty credit balance is reported as a 400 invalid_request_error; the message is the only marker.
  if (e instanceof Anthropic.BadRequestError) return /credit balance/i.test(e.message) ? 'credit' : 'unknown';
  if (e instanceof Anthropic.InternalServerError) return 'overloaded';

  const status = (e as { status?: unknown })?.status;
  if (typeof status === 'number') {
    if (status === 401) return 'auth';
    if (status === 402) return 'credit';
    if (status === 403) return 'permission';
    if (status === 404) return 'model';
    if (status === 429) return 'rate_limited';
    if (status >= 500) return 'overloaded';
  }
  const name = (e as { name?: string })?.name ?? '';
  if (/timeout|abort/i.test(name)) return 'timeout';
  return 'unknown';
}

/** Removes anything that could be a secret or personal data from a provider message and keeps it short. */
export function redact(text: string): string {
  return text
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Safe details of a failure: where it happened, Anthropic's HTTP status, error type, request id
 * and a redacted message. Never includes the key, the prompt or the learner's words.
 */
export function failureDetail(err: unknown, stage: MentorFailureDetail['stage']): MentorFailureDetail {
  const wrapped = (err as { name?: string })?.name === 'ModelUnavailableError';
  const e = (wrapped ? ((err as { cause?: unknown }).cause ?? err) : err) as {
    status?: unknown;
    name?: string;
    message?: string;
    requestID?: string | null;
    error?: { type?: string; message?: string; error?: { type?: string; message?: string } };
  };
  const body = e?.error;
  // Anthropic's own error type when it answered; otherwise what kind of failure it was (the SDK names its errors just "Error").
  const errorType =
    body?.error?.type ??
    (typeof body?.type === 'string' && body.type !== 'error' ? body.type : undefined) ??
    (e instanceof Anthropic.APIConnectionTimeoutError ? 'connection_timeout' : e instanceof Anthropic.APIConnectionError ? 'connection_error' : undefined) ??
    (e?.name && e.name !== 'Error' ? e.name : (e as object)?.constructor?.name);
  const message = body?.error?.message ?? body?.message ?? e?.message;
  return {
    stage: wrapped ? 'model_check' : stage,
    ...(typeof e?.status === 'number' ? { httpStatus: e.status } : {}),
    ...(errorType ? { errorType } : {}),
    ...(e?.requestID ? { requestId: e.requestID } : {}),
    ...(message ? { message: redact(String(message)) } : {}),
  };
}

/** One log fragment for a failure detail (safe to log). */
export function detailLog(d: MentorFailureDetail): string {
  return (
    ` stage=${d.stage}` +
    (d.httpStatus ? ` http=${d.httpStatus}` : '') +
    (d.errorType ? ` type=${d.errorType}` : '') +
    (d.requestId ? ` request_id=${d.requestId}` : '') +
    (d.message ? ` msg="${d.message.replace(/"/g, "'")}"` : '')
  );
}
