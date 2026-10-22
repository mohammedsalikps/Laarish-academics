// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { LESSONS } from '../../shared/curriculum/index';
import { MENTORS } from '../../shared/mentor/personas';
import { validateMentorRequest } from '../../shared/mentor/safety';
import type { MentorRequest } from '../../shared/mentor/types';
import { readMentorConfig } from './config';
import { STATIC_PROMPT, buildSystemPrompt } from './prompt';
import { ClaudeMentorProvider } from './providers';

const PLAY_CONTEXT: MentorRequest['context'] = {
  subjectId: 'science',
  lessonId: 'friction',
  topicId: 'friction-rough-smooth',
  grade: 4,
  step: 'play',
  activity: 'Friction Lab (Friction experiment). Current instruction: Pick a surface for the car.',
};

const ask = (context: MentorRequest['context'], text = 'Why did the car stop so soon?'): MentorRequest => ({ messages: [{ role: 'learner', text }], context });

describe('one model, two mentor personas', () => {
  it('puts the chosen persona, subject, topic, grade and current activity into the per-request prompt', () => {
    const { staticPart, dynamicPart } = buildSystemPrompt(ask({ ...PLAY_CONTEXT, mentor: 'ayra' }));
    expect(dynamicPart).toContain(`You are Ayra. ${MENTORS.ayra.personality}`);
    expect(dynamicPart).toContain('Class 4');
    expect(dynamicPart).toContain('Topic 2: Rough and smooth surfaces');
    expect(dynamicPart).toContain('Current step: play');
    expect(dynamicPart).toContain('- What the child is trying to do in the game right now: Friction Lab (Friction experiment). Current instruction: Pick a surface for the car.');
    // The cached block is shared by both mentors and never names either one.
    expect(staticPart).toBe(STATIC_PROMPT);
    expect(STATIC_PROMPT).not.toMatch(/Rishi|Ayra/);
  });

  it('changes only who is speaking: the facts and teaching rules are identical for Rishi and Ayra', () => {
    const rishi = buildSystemPrompt(ask({ ...PLAY_CONTEXT, mentor: 'rishi' })).dynamicPart;
    const ayra = buildSystemPrompt(ask({ ...PLAY_CONTEXT, mentor: 'ayra' })).dynamicPart;
    expect(rishi).toContain('You are Rishi.');
    expect(rishi).not.toContain('Ayra');
    const withoutPersona = (prompt: string) => prompt.split('\n').filter((line) => !line.startsWith('You are ')).join('\n');
    expect(withoutPersona(rishi)).toBe(withoutPersona(ayra));
    expect(rishi).toContain('App model facts (computed by the app):');
  });

  it('falls back to a neutral mentor when no persona is sent', () => {
    expect(buildSystemPrompt(ask(PLAY_CONTEXT)).dynamicPart).toContain('You are the Laarish learning mentor');
  });

  it('accepts only the two known mentor ids from the browser and bounds the activity text', () => {
    const ok = validateMentorRequest(ask({ ...PLAY_CONTEXT, mentor: 'ayra' }));
    expect(ok.ok && ok.value.context).toMatchObject({ mentor: 'ayra', activity: PLAY_CONTEXT.activity });

    const unknown = validateMentorRequest({ ...ask(PLAY_CONTEXT), context: { ...PLAY_CONTEXT, mentor: 'lumi', activity: 'x'.repeat(5000) } });
    expect(unknown.ok).toBe(true);
    if (!unknown.ok) return;
    expect(unknown.value.context.mentor).toBeUndefined();
    expect(unknown.value.context.activity!.length).toBeLessThanOrEqual(400);
  });
});

describe('model availability', () => {
  const config = readMentorConfig({ ANTHROPIC_API_KEY: 'sk-test' });
  const answer = { model: config.model, stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'text', text: 'Gravel has more bumps.', citations: null }] };

  function client(retrieve: () => Promise<unknown>) {
    const create = vi.fn().mockResolvedValue(answer);
    const models = { retrieve: vi.fn(retrieve) };
    return { create, models, client: { beta: { messages: { create } }, models } as unknown as Anthropic };
  }

  it('checks once that the configured model is available to this key before answering', async () => {
    const c = client(() => Promise.resolve({ id: config.model }));
    const provider = new ClaudeMentorProvider(config, c.client);
    await provider.reply(ask({ ...PLAY_CONTEXT, mentor: 'rishi' }), AbortSignal.timeout(5000));
    await provider.reply(ask({ ...PLAY_CONTEXT, mentor: 'ayra' }), AbortSignal.timeout(5000));
    expect(c.models.retrieve).toHaveBeenCalledTimes(1);
    expect(c.models.retrieve).toHaveBeenCalledWith(config.model);
    expect(c.create).toHaveBeenCalledTimes(2);
    expect(c.create.mock.calls[0][0].model).toBe(config.model);
  });

  it('does not call the model when it is not available, and checks again next time', async () => {
    const c = client(() => Promise.reject(Object.assign(new Error('not found'), { status: 404 })));
    const provider = new ClaudeMentorProvider(config, c.client);
    await expect(provider.reply(ask(PLAY_CONTEXT), AbortSignal.timeout(5000))).rejects.toMatchObject({ name: 'ModelUnavailableError', message: expect.stringContaining('(HTTP 404)') });
    expect(c.create).not.toHaveBeenCalled();
    await expect(provider.reply(ask(PLAY_CONTEXT), AbortSignal.timeout(5000))).rejects.toThrow();
    expect(c.models.retrieve).toHaveBeenCalledTimes(2);
  });
});

describe('curriculum-aware tutor', () => {
  const promptFor = (lessonId: string) => {
    const lesson = LESSONS.find((l) => l.id === lessonId)!;
    return buildSystemPrompt(ask({ subjectId: lesson.subjectId, lessonId, topicId: lesson.topicIds[0], grade: lesson.grades[0], step: 'watch' })).dynamicPart;
  };

  it('tells the tutor exactly how the lesson relates to the official syllabus', () => {
    for (const lesson of LESSONS.filter((l) => l.status === 'ready')) {
      const prompt = promptFor(lesson.id);
      const s = lesson.source!;
      if (s.status === 'aligned') expect(prompt, lesson.id).toContain(`- Curriculum: mapped to ${s.framework} ${s.document}`);
      else if (s.status === 'curriculum-inspired') expect(prompt, lesson.id).toContain('but is not tied to one chapter');
      else expect(prompt, lesson.id).toContain('a proposed Laarish lesson, not part of an official syllabus');
      expect(prompt, lesson.id).toContain('teachers have not reviewed them yet');
    }
  });

  it('forbids claiming syllabus or exam status beyond that line', () => {
    expect(STATIC_PROMPT).toMatch(/never call proposed content officially approved/);
    expect(STATIC_PROMPT).toMatch(/Classes 1 to 8/);
  });
});
