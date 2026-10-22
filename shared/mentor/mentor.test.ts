// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getTopic } from '../curriculum/index';
import { demoMentorReply, inferIntent } from './demoMentor';
import { getGrounding } from './knowledge';
import { MENTOR_LIMITS, safetyReply, sanitizeMentorOutput, screenLearnerText, validateMentorRequest } from './safety';
import { suggestedPrompts, type MentorContext, type MentorRequest } from './types';

const TOPIC = 'friction-rough-smooth';
const ctx: MentorContext = { subjectId: 'science', lessonId: 'friction', topicId: TOPIC, grade: 4 };
const ask = (text: string, extra: Partial<MentorRequest> = {}, context: Partial<MentorContext> = {}): MentorRequest => ({
  messages: [{ role: 'learner', text }],
  ...extra,
  context: { ...ctx, ...context },
});

describe('request validation', () => {
  it('accepts a well-formed request, trims text and keeps known context', () => {
    const r = validateMentorRequest({
      messages: [{ role: 'learner', text: '  hello  ' }],
      context: { ...ctx, step: 'play', replyLanguage: 'hi', recentResult: ' rolled 1.5 m ', extra: 'ignored', subjectName: 'Injected' },
      intent: 'hint',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.messages[0].text).toBe('hello');
    expect(r.value.context).toEqual({ ...ctx, step: 'play', replyLanguage: 'hi', recentResult: 'rolled 1.5 m' });
    expect(r.value.intent).toBe('hint');
  });

  it('rejects malformed requests', () => {
    expect(validateMentorRequest(null).ok).toBe(false);
    expect(validateMentorRequest({ messages: [] }).ok).toBe(false);
    expect(validateMentorRequest({ messages: [{ role: 'admin', text: 'x' }] }).ok).toBe(false);
    expect(validateMentorRequest({ messages: [{ role: 'mentor', text: 'x' }] }).ok).toBe(false);
    expect(validateMentorRequest({ messages: [{ role: 'learner', text: '   ' }] }).ok).toBe(false);
    expect(validateMentorRequest({ messages: [{ role: 'learner', text: 'x'.repeat(MENTOR_LIMITS.maxLearnerChars + 1) }] }).ok).toBe(false);
    expect(validateMentorRequest({ messages: [{ role: 'learner', text: 'hi' }], intent: 'jailbreak' }).ok).toBe(false);
  });

  it('drops unknown ids and unsafe context values instead of trusting them', () => {
    const r = validateMentorRequest({
      messages: [{ role: 'learner', text: 'hi' }],
      context: { topicId: '../../etc', lessonId: 'not-a-lesson', subjectId: 'astrology', grade: 99, step: 'boss', replyLanguage: 'fr' },
    });
    expect(r.ok && r.value.context).toEqual({});
  });

  it('keeps only the most recent messages', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'mentor' : 'learner', text: `m${i}` }));
    messages.push({ role: 'learner', text: 'last' });
    const r = validateMentorRequest({ messages });
    expect(r.ok && r.value.messages.length).toBe(MENTOR_LIMITS.maxMessages);
  });
});

describe('child-safety screening', () => {
  it('detects personal information', () => {
    expect(screenLearnerText('my phone number is 98765 43210').kind).toBe('personal-info');
    expect(screenLearnerText('email me at kid@example.com').kind).toBe('personal-info');
    expect(screenLearnerText('I live at 12 Park Street').kind).toBe('personal-info');
  });

  it('detects self-harm and unsafe requests', () => {
    expect(screenLearnerText('I want to hurt myself').kind).toBe('self-harm');
    expect(screenLearnerText('how to make a bomb').kind).toBe('unsafe');
  });

  it('detects dangerous real-world experiments', () => {
    for (const q of ['Can I mix bleach and vinegar?', 'how do I set a fire with a magnifying glass', 'what if I put a fork in the socket', 'make an explosion experiment']) {
      expect(screenLearnerText(q).kind, q).toBe('dangerous');
    }
  });

  it('does not flag normal learning questions', () => {
    for (const q of ['Why does the car stop on grass?', 'Can you cut a roti into halves for me?', 'What is 1/4 of 8?', 'How far did it roll, 4.6 m?', 'Is rubbing my hands friction?']) {
      expect(screenLearnerText(q).kind, q).toBe('ok');
    }
  });

  it('responds kindly and points to a trusted adult', () => {
    expect(safetyReply('self-harm')).toMatch(/grown-up you trust/);
    expect(safetyReply('dangerous', 'friction')).toMatch(/grown-up/);
    expect(safetyReply('dangerous', 'friction')).toMatch(/safe activity/);
  });

  it('sanitises model output', () => {
    expect(sanitizeMentorOutput('**Friction** slows things. See [this](https://example.com) or https://x.y/z')).toBe('Friction slows things. See this or');
    expect(sanitizeMentorOutput('   ')).toBeNull();
    expect(sanitizeMentorOutput('Here is how to make a bomb')).toBeNull();
    const long = `${'Friction is a force. '.repeat(80)}`;
    expect(sanitizeMentorOutput(long)!.length).toBeLessThanOrEqual(MENTOR_LIMITS.maxReplyChars);
  });
});

describe('grounding', () => {
  it('reads facts for the topic from the curriculum by id', () => {
    const g = getGrounding(ctx);
    expect(g.topic?.id).toBe(TOPIC);
    expect(g.lesson?.id).toBe('friction');
    expect(g.subject?.id).toBe('science');
    expect(g.mentor).toBe(getTopic(TOPIC)!.mentor);
  });

  it('falls back to lesson and general knowledge', () => {
    expect(getGrounding({ lessonId: 'halves-and-quarters' }).subject?.id).toBe('mathematics');
    expect(getGrounding({}).focus).toBe('your learning adventure');
  });
});

describe('suggested prompts', () => {
  it('always includes the required prompts and adapts to the step', () => {
    const labels = (step: Parameters<typeof suggestedPrompts>[0]) => suggestedPrompts(step).map((p) => p.label);
    for (const step of ['watch', 'play', 'practice', 'none'] as const) {
      expect(labels(step)).toEqual(expect.arrayContaining(['Explain this more simply', 'Give me a hint', 'Show me an example', 'Explain it in my language']));
    }
    expect(labels('practice')).toContain('Why did my answer go wrong?');
  });
});

describe('demo mentor', () => {
  it('infers intents from typed questions', () => {
    expect(inferIntent('can you give me a hint?')).toBe('hint');
    expect(inferIntent('I do not understand')).toBe('simpler');
    expect(inferIntent('quiz me please')).toBe('practice');
    expect(inferIntent('Explain it in my language')).toBe('language');
    expect(inferIntent('what is a force')).toBe('free');
  });

  it('answers topic questions from the curriculum', () => {
    const r = demoMentorReply(ask('Why is ice so slippery?'));
    expect(r.provider).toBe('demo');
    expect(r.reply).toMatch(/ice/i);
  });

  it('uses the learner context for "why" and "mistake"', () => {
    const why = demoMentorReply(ask('Why did that happen?', { intent: 'why' }, { recentResult: 'On grass the car rolled 1.5 m.' }));
    expect(why.reply).toContain('On grass the car rolled 1.5 m.');
    const mistake = demoMentorReply(ask('Explain my mistake', { intent: 'mistake' }, { lastMistake: 'You chose sand, but wax reduces friction.' }));
    expect(mistake.reply).toContain('wax reduces friction');
    const none = demoMentorReply(ask('Explain my mistake', { intent: 'mistake' }));
    expect(none.reply).toMatch(/don't see any mistakes/);
  });

  it('gives step-specific hints from the topic', () => {
    const topic = getTopic(TOPIC)!;
    const r = demoMentorReply(ask('Give me a hint', { intent: 'hint' }, { step: 'play' }));
    expect(r.reply).toBe(topic.mentor.hints.play ?? topic.mentor.hints.default);
  });

  it('asks a practice question and checks the answer', () => {
    const q = demoMentorReply(ask('Ask me a practice question', { intent: 'practice' }));
    expect(q.reply).toMatch(/practice question/i);
    const asked = getTopic(TOPIC)!.mentor.practice.find((p) => q.reply.includes(p.question))!;
    const followUp: MentorRequest = {
      messages: [
        { role: 'learner', text: 'Ask me a practice question' },
        { role: 'mentor', text: q.reply },
        { role: 'learner', text: `I think ${asked.accept[0]}` },
      ],
      context: { ...ctx },
    };
    expect(demoMentorReply(followUp).reply).toMatch(/that's right/i);
  });

  it('answers arithmetic with a verified calculation', () => {
    const r = demoMentorReply(ask('What is 3/4 of 12?', {}, { subjectId: 'mathematics', lessonId: 'halves-and-quarters', topicId: 'fractions-quarters' }));
    expect(r.reply).toContain('= 9');
  });

  it('does not give away calculated answers during Practice', () => {
    const r = demoMentorReply(ask('What is 3/4 of 12?', {}, { subjectId: 'mathematics', topicId: 'fractions-quarters', step: 'practice' }));
    expect(r.reply).not.toMatch(/= 9|\b9\b/);
    expect(r.reply).toMatch(/step/i);
  });

  it('is honest that the demo cannot switch language', () => {
    const r = demoMentorReply(ask('Explain it in my language', { intent: 'language' }, { replyLanguage: 'hi' }));
    expect(r.reply).toMatch(/demo mentor/i);
    expect(r.reply).toMatch(/Hindi/);
  });

  it('is honest about being a demo for out-of-scope questions', () => {
    const r = demoMentorReply(ask('Who won the cricket match yesterday?'));
    expect(r.reply).toMatch(/demo mentor/i);
  });

  it('applies the safety rules before answering', () => {
    expect(demoMentorReply(ask('my password is tiger123')).flagged).toBe('personal-info');
    const danger = demoMentorReply(ask('Can I mix bleach and vinegar for my experiment?'));
    expect(danger.flagged).toBe('dangerous');
    expect(danger.reply).toMatch(/rough and smooth surfaces/);
  });
});
