// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readMentorConfig } from './config';
import { createMentorService } from './handler';
import { buildSystemPrompt } from './prompt';
import { ClaudeMentorProvider, DemoMentorProvider, toClaudeMessages, type MentorProvider } from './providers';
import { RateLimiter } from './rateLimit';
import type { MentorRequest } from '../../shared/mentor/types';

const baseConfig = { ...readMentorConfig({}), rateLimit: 100 };

function post(body: unknown, raw?: string) {
  return new Request('http://localhost/api/mentor', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });
}

const goodBody = {
  messages: [{ role: 'learner', text: 'Why does the car stop on grass?' }],
  context: { subjectId: 'science', lessonId: 'friction', topicId: 'friction-rough-smooth', grade: 4, step: 'play' },
};

describe('mentor configuration', () => {
  it('falls back to the demo provider without an API key', () => {
    expect(readMentorConfig({}).provider).toBe('demo');
    expect(readMentorConfig({ MENTOR_PROVIDER: 'claude' }).provider).toBe('demo');
  });

  it('uses Claude only when a key is configured and demo is not forced', () => {
    expect(readMentorConfig({ ANTHROPIC_API_KEY: 'sk-test' })).toMatchObject({ provider: 'claude', model: 'claude-opus-5-5', effort: 'low' });
    expect(readMentorConfig({ ANTHROPIC_API_KEY: 'sk-test', MENTOR_PROVIDER: 'demo' }).provider).toBe('demo');
    expect(readMentorConfig({ MENTOR_TIMEOUT_MS: '999999' }).timeoutMs).toBe(60_000);
  });

  it('creates a Claude provider (without calling the API) when configured', () => {
    const service = createMentorService(readMentorConfig({ ANTHROPIC_API_KEY: 'sk-test', MENTOR_MODEL: 'claude-opus-5-5' }));
    expect(service.provider).toBeInstanceOf(ClaudeMentorProvider);
  });
});

describe('mentor API handler', () => {
  it('reports which provider is active', async () => {
    const res = await createMentorService(baseConfig).handle(new Request('http://localhost/api/mentor'), '1.1.1.1');
    expect(await res.json()).toEqual({ provider: 'demo' });
  });

  it('answers with the demo provider when no AI is configured', async () => {
    const res = await createMentorService(baseConfig).handle(post(goodBody), '1.1.1.1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('demo');
    expect(body.reply).toMatch(/grass/i);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('validates input', async () => {
    const service = createMentorService(baseConfig);
    expect((await service.handle(post(null, '{oops'), 'ip')).status).toBe(400);
    expect((await service.handle(post({ messages: [] }), 'ip')).status).toBe(400);
    expect((await service.handle(post(null, 'x'.repeat(20_000)), 'ip')).status).toBe(413);
    expect((await service.handle(new Request('http://localhost/api/mentor', { method: 'DELETE' }), 'ip')).status).toBe(405);
    expect((await service.handle(new Request('http://localhost/api/other'), 'ip')).status).toBe(404);
  });

  it('rate limits per client', async () => {
    const service = createMentorService(baseConfig, { limiter: new RateLimiter(2, 60_000) });
    expect((await service.handle(post(goodBody), 'a')).status).toBe(200);
    expect((await service.handle(post(goodBody), 'a')).status).toBe(200);
    const limited = await service.handle(post(goodBody), 'a');
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await service.handle(post(goodBody), 'b')).status).toBe(200);
  });

  it('never sends personal information to the AI provider', async () => {
    const provider: MentorProvider = { name: 'claude', reply: vi.fn() };
    const service = createMentorService(baseConfig, { provider });
    const res = await service.handle(post({ ...goodBody, messages: [{ role: 'learner', text: 'my phone number is 9876543210' }] }), 'ip');
    const body = await res.json();
    expect(body.flagged).toBe('personal-info');
    expect(provider.reply).not.toHaveBeenCalled();
  });

  it('returns a retryable error when the AI provider fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const provider: MentorProvider = { name: 'claude', reply: vi.fn().mockRejectedValue(Object.assign(new Error('boom'), { status: 500 })) };
    const res = await createMentorService(baseConfig, { provider }).handle(post(goodBody), 'ip');
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('mentor_unavailable');
    // Only the error type and status are logged, never the conversation.
    expect(warn.mock.calls[0][0]).not.toMatch(/grass/);
    warn.mockRestore();
  });

  it('times out slow providers', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const provider: MentorProvider = {
      name: 'claude',
      reply: (_req, signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    };
    const res = await createMentorService({ ...baseConfig, timeoutMs: 30 }, { provider }).handle(post(goodBody), 'ip');
    expect(res.status).toBe(504);
  });

  it('cleans provider output and replaces refusals with a friendly fallback', async () => {
    const markdown: MentorProvider = { name: 'claude', reply: async () => ({ text: '**Great** question! Read https://example.com' }) };
    const cleaned = await (await createMentorService(baseConfig, { provider: markdown }).handle(post(goodBody), 'ip')).json();
    expect(cleaned.reply).toBe('Great question! Read');
    const refusal: MentorProvider = { name: 'claude', reply: async () => ({ text: null }) };
    const fallback = await (await createMentorService(baseConfig, { provider: refusal }).handle(post(goodBody), 'ip')).json();
    expect(fallback.reply).toMatch(/ask it another way/);
  });

  it('serves a health check', async () => {
    const res = await createMentorService(baseConfig).handle(new Request('http://localhost/api/health'), 'ip');
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('prompt and message mapping', () => {
  const ask = (text: string, context: MentorRequest['context'], intent?: MentorRequest['intent']): MentorRequest => ({ messages: [{ role: 'learner', text }], context, ...(intent ? { intent } : {}) });

  it('builds an age-aware system prompt grounded in server-side curriculum facts', () => {
    const { system } = buildSystemPrompt(
      ask('help', { subjectId: 'science', lessonId: 'friction', topicId: 'friction-rough-smooth', grade: 3, step: 'practice', lastMistake: 'You chose sand.' }, 'hint'),
    );
    expect(system).toContain('Class 3');
    expect(system).toContain('Lesson 1: Friction');
    expect(system).toContain('Topic 2: Rough and smooth surfaces');
    expect(system).toContain('Rough surfaces make more friction.');
    expect(system).toContain('Current step: practice');
    expect(system).toContain('Do not reveal the answer');
    expect(system).toContain('You chose sand.');
    expect(system).toMatch(/never ask for them/);
    expect(system).toMatch(/Never give instructions for experiments with fire/);
  });

  it('adapts the template to the grade band', () => {
    const young = buildSystemPrompt(ask('hi', { grade: 1 })).system;
    const older = buildSystemPrompt(ask('hi', { grade: 6 })).system;
    expect(young).toMatch(/very short sentences/);
    expect(older).toMatch(/subject vocabulary/);
  });

  it('uses subject-specific instructions', () => {
    const maths = buildSystemPrompt(ask('hi', { subjectId: 'mathematics', lessonId: 'halves-and-quarters', topicId: 'fractions-halves' })).system;
    expect(maths).toMatch(/one small step at a time/);
    const hindi = buildSystemPrompt(ask('hi', { topicId: 'hindi-colours-bright' })).system;
    expect(hindi).toMatch(/Devanagari/);
    const kannada = buildSystemPrompt(ask('hi', { topicId: 'kannada-colours-bright' })).system;
    expect(kannada).toMatch(/Kannada script/);
    const social = buildSystemPrompt(ask('hi', { subjectId: 'social-science' })).system;
    expect(social).toMatch(/factual and neutral/);
  });

  it('adds verified calculations for arithmetic questions', () => {
    const { system, calculations } = buildSystemPrompt(ask('What is 3/4 of 12?', { subjectId: 'mathematics', topicId: 'fractions-quarters' }));
    expect(calculations).toEqual([{ expression: '3/4 of 12', result: '9' }]);
    expect(system).toContain('Verified calculations');
    expect(system).toContain('- 3/4 of 12 = 9');
  });

  it('tells the model not to reveal answers during Practice', () => {
    const { system } = buildSystemPrompt(ask('What is 3/4 of 12?', { topicId: 'fractions-quarters', step: 'practice' }));
    expect(system).toMatch(/Do not give final answers/);
    expect(buildSystemPrompt(ask('What is 3/4 of 12?', { topicId: 'fractions-quarters', step: 'play' })).system).not.toMatch(/Do not give final answers/);
  });

  it('describes the lesson video only during the Watch step of a topic that has one', () => {
    const watching = buildSystemPrompt(ask('What happened to the box?', { topicId: 'friction-what-is', step: 'watch' })).dynamicPart;
    expect(watching).toContain('What the lesson video "What is friction?" shows');
    expect(watching).toMatch(/Same push, different floors/);
    expect(buildSystemPrompt(ask('Why?', { topicId: 'friction-what-is', step: 'play' })).dynamicPart).not.toContain('lesson video');
    // No video produced yet: nothing to describe.
    expect(buildSystemPrompt(ask('Why?', { topicId: 'friction-rough-smooth', step: 'watch' })).dynamicPart).not.toContain('lesson video');
  });

  it('switches language only when the child asks for their language', () => {
    const ctx = { topicId: 'friction-what-is', replyLanguage: 'kn' } as const;
    expect(buildSystemPrompt(ask('Explain it in my language', ctx, 'language')).system).toMatch(/reply in Kannada/);
    expect(buildSystemPrompt(ask('Give me a hint', ctx, 'hint')).system).toMatch(/reply in simple English/);
  });

  it('never puts the learner nickname into the prompt', () => {
    const { system } = buildSystemPrompt(ask('hi', { topicId: 'friction-what-is', grade: 4 }));
    expect(system).not.toMatch(/Asha|displayName|nickname/i);
  });

  it('starts the Claude conversation with the learner', () => {
    expect(
      toClaudeMessages([
        { role: 'mentor', text: 'Hi!' },
        { role: 'learner', text: 'Question' },
        { role: 'mentor', text: 'Answer' },
        { role: 'learner', text: 'More' },
      ]).map((m) => m.role),
    ).toEqual(['user', 'assistant', 'user']);
  });

  it('demo provider returns follow-up suggestions', async () => {
    const r = await new DemoMentorProvider().reply({ messages: [{ role: 'learner', text: 'hint please' }], context: { topicId: 'friction-what-is', step: 'play' } });
    expect(r.text).toBeTruthy();
    expect(r.followUps?.length).toBeGreaterThan(0);
  });
});
