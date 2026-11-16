// @vitest-environment node
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { readMentorConfig } from './config';
import { classifyFailure, failureDetail, redact } from './diagnose';
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
    expect(JSON.parse(text)).toEqual({ error: 'mentor_unavailable', message: "Your mentor couldn't answer just now. Please try again in a moment.", reason: 'auth', stage: 'message' });
    expect(text).not.toMatch(/sk-ant|x-api-key/);
  });

  it("logs Anthropic's status, error type, request id and stage, but never the key or the question", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = Anthropic.APIError.generate(401, { type: 'error', error: { type: 'authentication_error', message: `invalid x-api-key ${KEY}` } }, 'invalid x-api-key', new Headers({ 'request-id': 'req_011ABC' }));
    const wrapped: Error & { cause?: unknown } = new Error('Configured model is not available');
    wrapped.name = 'ModelUnavailableError';
    wrapped.cause = err;
    const provider: MentorProvider = { name: 'claude', model: 'claude-opus-5-5', reply: () => Promise.reject(wrapped) };
    const res = await createMentorService({ ...readMentorConfig({ ANTHROPIC_API_KEY: KEY }), rateLimit: 100 }, { provider }).handle(post(), 'ip');
    expect(await res.json()).toMatchObject({ reason: 'auth', stage: 'model_check' });
    const line = String(warn.mock.calls.at(-1)?.[0]);
    expect(line).toContain('stage=model_check http=401 type=authentication_error request_id=req_011ABC');
    expect(line).toContain('model=claude-opus-5-5 timeout_ms=20000');
    expect(line).not.toContain('sk-ant');
    expect(line).not.toContain('magnet');
    warn.mockRestore();
  });
});

describe('safe failure details', () => {
  it('report where it failed, the HTTP status, error type and request id, with secrets removed', () => {
    const err = Anthropic.APIError.generate(404, { type: 'error', error: { type: 'not_found_error', message: `model: claude-x (key ${KEY}, contact a@b.com)` } }, 'x', new Headers({ 'request-id': 'req_9' }));
    const d = failureDetail(err, 'message');
    expect(d).toMatchObject({ stage: 'message', httpStatus: 404, errorType: 'not_found_error', requestId: 'req_9' });
    expect(d.message).toContain('model: claude-x');
    expect(d.message).not.toMatch(/sk-ant|a@b\.com/);
  });

  it('describe connection failures, which have no HTTP status', () => {
    expect(failureDetail(new Anthropic.APIConnectionError({ message: 'socket hang up' }), 'message')).toMatchObject({ stage: 'message', errorType: 'connection_error' });
    expect(failureDetail(new Anthropic.APIConnectionError({ message: 'socket hang up' }), 'message').httpStatus).toBeUndefined();
  });

  it('redact long tokens and keep messages short', () => {
    expect(redact(`key ${'x'.repeat(40)} end`)).toBe('key [redacted] end');
    expect(redact('a'.repeat(10) + ' ' + 'b '.repeat(200)).length).toBeLessThanOrEqual(200);
  });

  it('come back from the configuration check, with the model and time limit', async () => {
    const config = readMentorConfig({ ANTHROPIC_API_KEY: KEY, VERCEL_ENV: 'preview' });
    const retrieve = vi.fn(() => Promise.reject(Anthropic.APIError.generate(403, { type: 'error', error: { type: 'permission_error', message: 'Your API key does not have permission to use the specified resource.' } }, 'x', new Headers())));
    const provider = new ClaudeMentorProvider(config, { beta: {} as never, models: { retrieve } as never });
    const text = await (await createMentorService(config, { provider }).handle(new Request('http://localhost/api/mentor?check=model'), 'ip')).text();
    expect(JSON.parse(text).check).toMatchObject({
      result: 'permission',
      environment: 'preview',
      model: 'claude-opus-5-5',
      timeoutMs: 20000,
      detail: { stage: 'model_check', httpStatus: 403, errorType: 'permission_error' },
    });
    expect(text).not.toContain('sk-ant');
  });
});
