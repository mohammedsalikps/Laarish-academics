// @vitest-environment node
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { readMentorConfig } from './config';
import { classifyFailure } from './diagnose';
import { createMentorService } from './handler';
import { ClaudeMentorProvider, type MentorProvider } from './providers';

const KEY = 'sk-ant-test-0000-do-not-print';

/** A real SDK error object, as the SDK itself builds it from an HTTP response. */
const apiError = (status: number, type: string, message: string) => Anthropic.APIError.generate(status, { type: 'error', error: { type, message } }, message, new Headers());

const post = () =>
  new Request('http://localhost/api/mentor', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'learner', text: 'Why does a magnet pull a nail?' }],
      context: { subjectId: 'science', lessonId: 'magnets', topicId: 'magnets-what-they-attract', grade: 6, step: 'watch' },
    }),
  });

describe('why the live AI failed', () => {
  it('names each Anthropic failure from the SDK error class', () => {
    expect(classifyFailure(apiError(401, 'authentication_error', 'invalid x-api-key'))).toBe('auth');
    expect(classifyFailure(apiError(403, 'permission_error', 'not allowed'))).toBe('permission');
    expect(classifyFailure(apiError(404, 'not_found_error', 'model: claude-x'))).toBe('model');
    expect(classifyFailure(apiError(429, 'rate_limit_error', 'slow down'))).toBe('rate_limited');
    expect(classifyFailure(apiError(529, 'overloaded_error', 'Overloaded'))).toBe('overloaded');
    expect(classifyFailure(apiError(400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API.'))).toBe('credit');
    expect(classifyFailure(apiError(400, 'invalid_request_error', 'messages: field required'))).toBe('unknown');
    expect(classifyFailure(new Anthropic.APIConnectionError({ message: 'socket hang up' }))).toBe('unreachable');
    expect(classifyFailure(new Anthropic.APIConnectionTimeoutError())).toBe('timeout');
  });

  it('looks through the model-check wrapper to the original error', () => {
    const wrapped: Error & { cause?: unknown } = new Error('Configured model is not available');
    wrapped.name = 'ModelUnavailableError';
    wrapped.cause = apiError(401, 'authentication_error', 'invalid x-api-key');
    expect(classifyFailure(wrapped)).toBe('auth');
  });
});

describe('the safe configuration check (GET /api/mentor?check=…)', () => {
  it('reports demo mode when no key is set, without calling anything', async () => {
    const res = await createMentorService(readMentorConfig({ VERCEL_ENV: 'preview' })).handle(new Request('http://localhost/api/mentor?check=model'), 'ip');
    const body = await res.json();
    expect(body).toMatchObject({ provider: 'demo', check: { keyConfigured: false, environment: 'preview', result: 'missing_key' } });
  });

  it('says when demo mode is forced although a key is set', async () => {
    const res = await createMentorService(readMentorConfig({ ANTHROPIC_API_KEY: KEY, MENTOR_PROVIDER: 'demo' })).handle(new Request('http://localhost/api/mentor?check=model'), 'ip');
    expect((await res.json()).check).toMatchObject({ keyConfigured: true, result: 'demo_forced' });
  });

  it('reports a rejected key as "auth" and never returns the key itself', async () => {
    const config = readMentorConfig({ ANTHROPIC_API_KEY: KEY, VERCEL_ENV: 'production' });
    const retrieve = vi.fn(() => Promise.reject(apiError(401, 'authentication_error', 'invalid x-api-key')));
    const provider = new ClaudeMentorProvider(config, { beta: {} as never, models: { retrieve } as never });
    const service = createMentorService(config, { provider });
    const res = await service.handle(new Request('http://localhost/api/mentor?check=model'), 'ip');
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ provider: 'claude', model: 'claude-opus-5-5', check: { keyConfigured: true, environment: 'production', result: 'auth', depth: 'model' } });
    expect(text).not.toContain(KEY);
    expect(text).not.toContain('sk-ant');
    // A second check within a minute is answered from the last result: no new request to Anthropic.
    await service.handle(new Request('http://localhost/api/mentor?check=model'), 'ip');
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it('the "message" check also sends one tiny request, which is where an empty credit balance shows', async () => {
    const config = readMentorConfig({ ANTHROPIC_API_KEY: KEY });
    const create = vi.fn(() => Promise.reject(apiError(400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API.')));
    const provider = new ClaudeMentorProvider(config, { beta: { messages: { create } } as never, models: { retrieve: vi.fn(() => Promise.resolve({})) } as never });
    const res = await createMentorService(config, { provider }).handle(new Request('http://localhost/api/mentor?check=message'), 'ip');
    expect((await res.json()).check).toMatchObject({ result: 'credit', depth: 'message' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ max_tokens: 64, output_config: { effort: 'low' } }));
  });
});

describe('a failed answer tells the app why', () => {
  it('returns 502 with the reason category, and no key or error text', async () => {
    const provider: MentorProvider = { name: 'claude', model: 'claude-opus-5-5', reply: () => Promise.reject(apiError(401, 'authentication_error', 'invalid x-api-key')) };
    const res = await createMentorService({ ...readMentorConfig({ ANTHROPIC_API_KEY: KEY }), rateLimit: 100 }, { provider }).handle(post(), 'ip');
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'mentor_unavailable', message: "Your mentor couldn't answer just now. Please try again in a moment.", reason: 'auth' });
    expect(text).not.toMatch(/sk-ant|x-api-key/);
  });
});
