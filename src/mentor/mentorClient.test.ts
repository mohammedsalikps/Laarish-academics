import { describe, expect, it, vi } from 'vitest';
import { demoMentorReply } from '../../shared/mentor/demoMentor';
import type { MentorRequest } from '../../shared/mentor/types';
import { askMentor, fetchMentorStatus, toMentorMessages } from './mentorClient';

const request: MentorRequest = { messages: [{ role: 'learner', text: 'Give me a hint' }], context: { subjectId: 'science', lessonId: 'friction', topicId: 'friction-rough-smooth', step: 'play' }, intent: 'hint' };

const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('mentor client', () => {
  it('returns server replies', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { reply: 'From the server', provider: 'claude' }));
    const r = await askMentor(request, { fetchImpl });
    expect(r).toEqual({ ok: true, source: 'server', reply: { reply: 'From the server', provider: 'claude' } });
    expect(fetchImpl).toHaveBeenCalledWith('/api/mentor', expect.objectContaining({ method: 'POST' }));
  });

  it('falls back to the local demo mentor when there is no backend', async () => {
    for (const fetchImpl of [
      vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })),
      vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })),
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    ]) {
      const r = await askMentor(request, { fetchImpl });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.source).toBe('local-demo');
        expect(r.reply.provider).toBe('demo');
        expect(r.reply.reply.length).toBeGreaterThan(10);
      }
    }
  });

  it("answers locally from the topic's own content, loaded for its subject, exactly as the server demo does", async () => {
    const noBackend = () => vi.fn().mockResolvedValue(new Response('Not found', { status: 404 }));
    const requests: MentorRequest[] = [
      request,
      { messages: [{ role: 'learner', text: 'Quiz me' }], context: { subjectId: 'english', lessonId: 'building-sentences', topicId: 'sentences-word-order', step: 'practice' }, intent: 'practice' },
      { messages: [{ role: 'learner', text: 'Can you give me an example?' }], context: { subjectId: 'kannada', lessonId: 'kannada-colours', step: 'none' }, intent: 'example' },
      { messages: [{ role: 'learner', text: 'How do I unlock topics?' }], context: { step: 'none' } },
    ];
    for (const req of requests) {
      const r = await askMentor(req, { fetchImpl: noBackend() });
      expect(r.ok && r.reply, JSON.stringify(req.context)).toEqual(demoMentorReply(req));
    }
  });

  it('reports retryable errors when the AI request fails', async () => {
    // The message speaks with the chosen mentor's name rather than repeating the server's text.
    const r = await askMentor(request, { mentorName: 'Ayra', fetchImpl: vi.fn().mockResolvedValue(jsonResponse(502, { error: 'mentor_unavailable', message: 'Server message.' })) });
    expect(r).toEqual({ ok: false, error: { kind: 'unavailable', message: "Ayra couldn't answer just now. Please try again in a moment.", retryable: true } });
  });

  it('reports rate limiting and invalid requests', async () => {
    const limited = await askMentor(request, { fetchImpl: vi.fn().mockResolvedValue(jsonResponse(429, { error: 'rate_limited', message: 'Break time' })) });
    expect(limited.ok === false && limited.error.kind).toBe('rate-limited');
    const invalid = await askMentor(request, { fetchImpl: vi.fn().mockResolvedValue(jsonResponse(400, { error: 'invalid_request', message: 'Too long' })) });
    expect(invalid.ok === false && invalid.error).toMatchObject({ kind: 'invalid', retryable: false });
  });

  it('times out instead of waiting forever', async () => {
    const hanging = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
    const r = await askMentor(request, { fetchImpl: hanging as unknown as typeof fetch, timeoutMs: 20 });
    expect(r.ok === false && r.error.kind).toBe('timeout');
  });

  it('reads mentor status and treats a missing backend as demo', async () => {
    expect(await fetchMentorStatus(vi.fn().mockResolvedValue(jsonResponse(200, { provider: 'claude', model: 'claude-opus-5-5' })))).toEqual({
      provider: 'claude',
      model: 'claude-opus-5-5',
      backend: true,
    });
    expect(await fetchMentorStatus(vi.fn().mockRejectedValue(new TypeError('offline')))).toEqual({ provider: 'demo', backend: false });
  });
});

describe('request messages', () => {
  it('never includes the on-screen greeting (with the nickname) or failed replies', () => {
    const messages = toMentorMessages([
      { role: 'mentor', text: "Hi Asha! It's Rishi.", localOnly: true },
      { role: 'learner', text: 'Why does ice feel slippery?' },
      { role: 'mentor', text: 'Rishi could not answer.', error: { kind: 'timeout' } },
      { role: 'learner', text: 'Give me a hint' },
    ]);
    expect(messages).toEqual([
      { role: 'learner', text: 'Why does ice feel slippery?' },
      { role: 'learner', text: 'Give me a hint' },
    ]);
    expect(JSON.stringify(messages)).not.toContain('Asha');
  });
});
