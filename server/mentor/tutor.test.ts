// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../shared/curriculum/index';
import type { FrictionExperimentConfig } from '../../shared/curriculum/types';
import { demoMentorReply } from '../../shared/mentor/demoMentor';
import { validateMentorRequest } from '../../shared/mentor/safety';
import { frictionLabDistance, modelFacts } from '../../shared/mentor/scienceModels';
import type { MentorRequest, ProgressSummary } from '../../shared/mentor/types';
import { stoppingDistance } from '../../src/games/friction/simulation';
import { readMentorConfig } from './config';
import { createMentorService } from './handler';
import { STATIC_PROMPT, buildSystemPrompt } from './prompt';
import { CALCULATOR_TOOL, ClaudeMentorProvider, MAX_TOOL_ROUNDS, runCalculatorTool } from './providers';

const progress: ProgressSummary = {
  level: 2,
  stars: 6,
  streakDays: 3,
  topicsCompleted: 2,
  topicsTotal: 22,
  lessonsCompleted: 0,
  lessonsTotal: 10,
  currentTopicId: 'friction-helps-us',
  currentStep: 'play',
  nextTopicId: 'friction-helps-us',
  nextStep: 'play',
  subjectId: 'science',
  subjectTopicsMastered: 2,
  subjectTopicsTotal: 6,
};

const ask = (text: string, context: MentorRequest['context'] = {}, intent?: MentorRequest['intent']): MentorRequest => ({
  messages: [{ role: 'learner', text }],
  context,
  ...(intent ? { intent } : {}),
});

describe('progress context', () => {
  it('accepts a valid summary and drops anything that is not counts or known ids', () => {
    const ok = validateMentorRequest({ messages: [{ role: 'learner', text: 'How am I doing?' }], context: { progress } });
    expect(ok.ok && ok.value.context.progress).toEqual(progress);

    const bad = validateMentorRequest({
      messages: [{ role: 'learner', text: 'How am I doing?' }],
      context: { progress: { ...progress, currentTopicId: 'not-a-topic', nextStep: 'sleep', displayName: 'Asha', subjectId: 'astrology' } },
    });
    expect(bad.ok && bad.value.context.progress).toEqual({ level: 2, stars: 6, streakDays: 3, topicsCompleted: 2, topicsTotal: 22, lessonsCompleted: 0, lessonsTotal: 10, nextTopicId: 'friction-helps-us' });

    const notNumbers = validateMentorRequest({ messages: [{ role: 'learner', text: 'hi' }], context: { progress: { ...progress, stars: -1 } } });
    expect(notNumbers.ok && notNumbers.value.context.progress).toBeUndefined();
  });

  it('puts the app-computed numbers in the prompt only when they are sent', () => {
    const withProgress = buildSystemPrompt(ask('How am I doing?', { progress }, 'progress')).system;
    expect(withProgress).toContain('Learner progress (from the app):');
    expect(withProgress).toContain('Topics completed: 2 of 22. Lessons completed: 0 of 10.');
    expect(withProgress).toContain('Started but not finished: Science Topic 3: Friction helps us (next step: Play).');
    expect(withProgress).toContain('In Science: 2 of 6 topics mastered.');
    expect(withProgress).toMatch(/Do not list every number again/);
    expect(buildSystemPrompt(ask('Hi')).dynamicPart).not.toContain('Learner progress');
  });

  it('demo mode explains progress from the summary and is honest without one', () => {
    expect(demoMentorReply(ask('How am I doing?', { progress })).reply).toMatch(/carry on with Science Topic 3: Friction helps us at Play/);
    expect(demoMentorReply(ask('What is my progress?')).reply).toMatch(/can't see your progress/);
    expect(demoMentorReply(ask('What is my name?')).reply).toMatch(/on your profile/);
  });
});

describe('prompt caching layout', () => {
  it('keeps one fixed block for every request and puts the per-request context after it', () => {
    const a = buildSystemPrompt(ask('Why does the box stop?', { topicId: 'friction-what-is', step: 'play', grade: 2 }));
    const b = buildSystemPrompt(ask('What is 3/4 of 12?', { topicId: 'fractions-quarters', grade: 6 }));
    expect(a.staticPart).toBe(STATIC_PROMPT);
    expect(b.staticPart).toBe(STATIC_PROMPT);
    expect(a.dynamicPart).not.toBe(b.dynamicPart);
    // Nothing that varies may leak into the cached block.
    expect(STATIC_PROMPT).not.toMatch(/Grade \d|friction|fraction/i);
  });
});

describe('app model facts', () => {
  it('quotes the same Friction Lab distances the game simulates', () => {
    const config = getTopic('friction-rough-smooth')!.play.game as FrictionExperimentConfig;
    for (const s of config.surfaces) {
      expect(frictionLabDistance(config.launchSpeed, s.frictionCoefficient)).toBeCloseTo(stoppingDistance(config.launchSpeed, s.frictionCoefficient), 10);
    }
    const facts = modelFacts(getTopic('friction-rough-smooth')).join(' ');
    expect(facts).toMatch(/polished wood 4\.6 m, grass 1\.5 m, gravel track 0\.8 m/);
    expect(buildSystemPrompt(ask('How far on grass?', { topicId: 'friction-rough-smooth' })).system).toContain('App model facts (computed by the app):');
  });

  it('explains Push the Box with its real grip levels', () => {
    expect(modelFacts(getTopic('friction-what-is')).join(' ')).toMatch(/carpet grip 3, wooden floor grip 2, ice grip 1/);
  });
});

describe('calculate tool', () => {
  it('runs on the exact calculator and reports bad input as an error', () => {
    expect(runCalculatorTool({ expression: '3/4 of 12' })).toEqual({ content: '3/4 of 12 = 9', isError: false });
    expect(runCalculatorTool({ expression: '(18 - 4) / 2' })).toEqual({ content: '(18 - 4) / 2 = 7', isError: false });
    expect(runCalculatorTool({ expression: '5 / 0' }).isError).toBe(true);
    expect(runCalculatorTool({ expression: 'rm -rf /' }).isError).toBe(true);
    expect(runCalculatorTool({}).isError).toBe(true);
  });

  type CreateParams = Anthropic.Beta.MessageCreateParamsNonStreaming;

  function fakeClient(responses: Partial<Anthropic.Beta.BetaMessage>[]) {
    const calls: CreateParams[] = [];
    const create = vi.fn(async (params: CreateParams) => {
      // Snapshot the params: the provider keeps appending to the same messages array.
      calls.push(structuredClone(params));
      const next = responses.shift();
      if (!next) throw new Error('no more responses');
      return { model: 'claude-opus-5-5', usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 600, cache_creation_input_tokens: 0 }, ...next };
    });
    return { client: { beta: { messages: { create } } } as unknown as Anthropic, calls };
  }

  const config = { ...readMentorConfig({ ANTHROPIC_API_KEY: 'sk-test' }) };

  it('lets the model call the calculator, feeds back the exact result, and caches the fixed prefix', async () => {
    const { client, calls } = fakeClient([
      { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_1', name: 'calculate', input: { expression: '3/4 of 12' } } as Anthropic.Beta.BetaToolUseBlock] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'One quarter of 12 is 3, so three quarters is 9.', citations: null } as Anthropic.Beta.BetaTextBlock] },
    ]);
    const provider = new ClaudeMentorProvider(config, client);
    const out = await provider.reply(ask('How do I find 3/4 of 12?', { topicId: 'fractions-quarters', grade: 3 }), AbortSignal.timeout(5000));

    expect(out.text).toBe('One quarter of 12 is 3, so three quarters is 9.');
    expect(out.meta).toMatchObject({ apiCalls: 2, toolCalls: 1, inputTokens: 200, outputTokens: 40, cacheReadTokens: 1200 });
    const [first, second] = calls;
    expect(first.tools).toEqual([CALCULATOR_TOOL]);
    const system = first.system as Anthropic.Beta.BetaTextBlockParam[];
    expect(system[0]).toMatchObject({ text: STATIC_PROMPT, cache_control: { type: 'ephemeral' } });
    expect(system[1].cache_control).toBeUndefined();
    expect(first.fallbacks).toBe('default');
    // Second request: the assistant turn is passed back, followed by the exact tool result.
    const toolTurn = second.messages[second.messages.length - 1];
    expect(toolTurn.role).toBe('user');
    expect(toolTurn.content).toEqual([{ type: 'tool_result', tool_use_id: 'tu_1', content: '3/4 of 12 = 9' }]);
  });

  it('stops calling tools after the allowed rounds and makes the model answer', async () => {
    const toolTurn = { stop_reason: 'tool_use' as const, content: [{ type: 'tool_use', id: 'tu', name: 'calculate', input: { expression: '1 + 1' } } as Anthropic.Beta.BetaToolUseBlock] };
    const { client, calls } = fakeClient([toolTurn, toolTurn, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done.', citations: null } as Anthropic.Beta.BetaTextBlock] }]);
    const out = await new ClaudeMentorProvider(config, client).reply(ask('Add some numbers'), AbortSignal.timeout(5000));
    expect(out.text).toBe('Done.');
    expect(calls).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(calls[MAX_TOOL_ROUNDS].tool_choice).toEqual({ type: 'none' });
    expect(calls[0].tool_choice).toBeUndefined();
  });

  it('returns no text on a refusal so the handler shows its friendly fallback', async () => {
    const { client } = fakeClient([{ stop_reason: 'refusal', content: [] }]);
    const service = createMentorService({ ...config, rateLimit: 100 }, { provider: new ClaudeMentorProvider(config, client) });
    const res = await service.handle(
      new Request('http://localhost/api/mentor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ask('Tell me about friction')) }),
      'ip',
    );
    expect((await res.json()).reply).toMatch(/ask it another way/);
  });
});
