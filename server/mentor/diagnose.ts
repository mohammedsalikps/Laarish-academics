import Anthropic from '@anthropic-ai/sdk';
import type { MentorFailure } from '../../shared/mentor/types.js';

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
