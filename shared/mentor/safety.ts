import { getLesson, getSubject, getTopic } from '../curriculum/catalog.js';
import { isMentorId } from './personas.js';
import {
  MENTOR_INTENTS,
  MENTOR_STEPS,
  PROGRESS_STEPS,
  REPLY_LANGUAGES,
  type MentorContext,
  type ProgressSummary,
  type MentorIntent,
  type MentorMessage,
  type MentorRequest,
  type MentorStep,
  type MentorQuizContext,
  type ReplyLanguage,
} from './types.js';

/**
 * Input validation and child-safety screening for the mentor.
 *
 * These rules are a first line of defence that runs before any AI provider is
 * called. They are deliberately conservative and are NOT a complete content
 * moderation system; production use should add provider-side moderation,
 * logging policies approved by the organisation, and human review processes.
 */

export const MENTOR_LIMITS = {
  maxLearnerChars: 400,
  maxMentorChars: 1200,
  /** Server-side cap. The browser sends fewer (see CLIENT_HISTORY in mentorClient.ts). */
  maxMessages: 8,
  maxContextChars: 160,
  maxDetailChars: 400,
  maxBodyBytes: 16_000,
  maxReplyChars: 900,
} as const;

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanString(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  // Strip control characters (except newlines/tabs) and trim.
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return s ? s.slice(0, max) : undefined;
}

export function validateMentorRequest(body: unknown): Validation<MentorRequest> {
  if (!isObj(body)) return { ok: false, error: 'Request body must be a JSON object.' };
  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) return { ok: false, error: 'messages must be a non-empty array.' };

  const messages: MentorMessage[] = [];
  for (const m of rawMessages.slice(-MENTOR_LIMITS.maxMessages)) {
    if (!isObj(m) || (m.role !== 'learner' && m.role !== 'mentor')) return { ok: false, error: 'Each message needs a role of learner or mentor.' };
    const limit = m.role === 'learner' ? MENTOR_LIMITS.maxLearnerChars : MENTOR_LIMITS.maxMentorChars;
    if (typeof m.text !== 'string') return { ok: false, error: 'Each message needs text.' };
    if (m.role === 'learner' && m.text.trim().length > limit) {
      return { ok: false, error: `Questions can be up to ${limit} characters.` };
    }
    const text = cleanString(m.text, limit);
    if (!text) return { ok: false, error: 'Messages cannot be empty.' };
    messages.push({ role: m.role, text });
  }
  if (messages[messages.length - 1].role !== 'learner') return { ok: false, error: 'The last message must be from the learner.' };

  const ctxIn = isObj(body.context) ? body.context : {};
  const context: MentorContext = {};
  // Curriculum ids are only kept when they exist; the server reads titles and facts from them.
  const topicId = cleanString(ctxIn.topicId, 64);
  if (topicId && getTopic(topicId)) context.topicId = topicId;
  const lessonId = cleanString(ctxIn.lessonId, 64);
  if (lessonId && getLesson(lessonId)) context.lessonId = lessonId;
  const subjectId = cleanString(ctxIn.subjectId, 32);
  if (subjectId && getSubject(subjectId)) context.subjectId = subjectId;
  for (const key of ['recentResult', 'lastMistake', 'activity'] as const) {
    const v = cleanString(ctxIn[key], MENTOR_LIMITS.maxDetailChars);
    if (v) context[key] = v;
  }
  if (typeof ctxIn.step === 'string' && (MENTOR_STEPS as readonly string[]).includes(ctxIn.step)) context.step = ctxIn.step as MentorStep;
  if (typeof ctxIn.replyLanguage === 'string' && (REPLY_LANGUAGES as readonly string[]).includes(ctxIn.replyLanguage)) {
    context.replyLanguage = ctxIn.replyLanguage as ReplyLanguage;
  }
  if (typeof ctxIn.grade === 'number' && Number.isInteger(ctxIn.grade) && ctxIn.grade >= 1 && ctxIn.grade <= 8) {
    context.grade = ctxIn.grade;
  }
  if (isMentorId(ctxIn.mentor)) context.mentor = ctxIn.mentor;
  const progress = validateProgress(ctxIn.progress);
  if (progress) context.progress = progress;
  const quiz = validateQuiz(ctxIn.quiz, context.topicId);
  if (quiz) context.quiz = quiz;

  let intent: MentorIntent | undefined;
  if (body.intent !== undefined) {
    if (typeof body.intent !== 'string' || !(MENTOR_INTENTS as readonly string[]).includes(body.intent)) {
      return { ok: false, error: 'Unknown intent.' };
    }
    intent = body.intent as MentorIntent;
  }
  return { ok: true, value: { messages, context, ...(intent ? { intent } : {}) } };
}

/** Keeps a quiz reference only when the question belongs to the topic; answers are short ids. */
function validateQuiz(raw: unknown, topicId: string | undefined): MentorQuizContext | undefined {
  if (!isObj(raw) || !topicId) return undefined;
  const questionId = cleanString(raw.questionId, 64);
  if (!questionId || !getTopic(topicId)?.practice.questions.some((q) => q.id === questionId)) return undefined;
  const out: MentorQuizContext = { questionId };
  if (typeof raw.answer === 'string' && /^[\w-]{1,64}$/.test(raw.answer)) out.answer = raw.answer;
  if (raw.answerShown === true) out.answerShown = true;
  return out;
}

const count = (v: unknown, max = 100_000): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined;

/** Accepts only bounded counts, known curriculum ids and step names. Anything else is dropped. */
function validateProgress(raw: unknown): ProgressSummary | undefined {
  if (!isObj(raw)) return undefined;
  const required = {
    level: count(raw.level, 1000),
    stars: count(raw.stars),
    streakDays: count(raw.streakDays, 10_000),
    topicsCompleted: count(raw.topicsCompleted),
    topicsTotal: count(raw.topicsTotal),
    lessonsCompleted: count(raw.lessonsCompleted),
    lessonsTotal: count(raw.lessonsTotal),
  };
  if (Object.values(required).some((v) => v === undefined)) return undefined;
  const out = required as ProgressSummary;
  const step = (v: unknown) => (typeof v === 'string' && (PROGRESS_STEPS as readonly string[]).includes(v) ? (v as ProgressSummary['currentStep']) : undefined);
  const topic = (v: unknown) => (typeof v === 'string' && getTopic(v) ? v : undefined);
  const current = topic(raw.currentTopicId);
  if (current) {
    out.currentTopicId = current;
    const s = step(raw.currentStep);
    if (s) out.currentStep = s;
  }
  const next = topic(raw.nextTopicId);
  if (next) {
    out.nextTopicId = next;
    const s = step(raw.nextStep);
    if (s) out.nextStep = s;
  }
  if (typeof raw.subjectId === 'string' && getSubject(raw.subjectId)) {
    const mastered = count(raw.subjectTopicsMastered);
    const total = count(raw.subjectTopicsTotal);
    if (mastered !== undefined && total !== undefined) {
      out.subjectId = raw.subjectId;
      out.subjectTopicsMastered = mastered;
      out.subjectTopicsTotal = total;
    }
  }
  return out;
}

/* ------------------------------------------------------------- screening */

export type ScreenResult = { kind: 'ok' } | { kind: 'personal-info' } | { kind: 'self-harm' } | { kind: 'unsafe' } | { kind: 'dangerous' };

const PERSONAL_INFO = [
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // email
  /(?:\+?\d[\s-]?){8,}/, // phone-like digit runs
  /\b(?:my|our)\s+(?:home\s+)?address\b/i,
  /\bi\s+live\s+(?:at|on)\b/i,
  /\b(?:my|our)\s+(?:phone|mobile|cell)\s*(?:number|no)?\b/i,
  /\bmy\s+password\b/i,
  /\bpin\s?code\b/i,
];

const SELF_HARM = [/\b(?:kill|hurt|harm)\s+myself\b/i, /\bsuicid/i, /\bwant\s+to\s+die\b/i, /\bself[-\s]?harm/i];

const UNSAFE = [
  /\b(?:sex|sexy|porn\w*|nude|naked)\b/i,
  /\b(?:make|build|buy)\s+(?:a\s+)?(?:bomb|gun|weapon|explosive)s?\b/i,
  /\bhow\s+(?:do\s+i|to)\s+(?:kill|poison|stab|shoot)\b/i,
];

/** Requests for risky real-world experiments (fire, chemicals, mains electricity). */
const DANGEROUS = [
  /\bmix(?:ing)?\b.{0,40}\b(?:bleach|chemicals?|acids?|ammonia|cleaners?|detergents?)\b/i,
  /\b(?:bleach|acids?|ammonia)\b.{0,40}\bmix(?:ing)?\b/i,
  /\b(?:set|light|start|make)\s+(?:a\s+|something\s+on\s+)?fire\b/i,
  /\b(?:explosion|explode|firework)s?\b/i,
  /\b(?:plug|socket|power\s+outlet|mains)\b.{0,40}\b(?:wire|metal|fork|finger|touch)\b/i,
  /\b(?:wire|metal|fork|finger)\b.{0,40}\b(?:socket|power\s+outlet|plug\s+point)\b/i,
];

export function screenLearnerText(text: string): ScreenResult {
  if (SELF_HARM.some((r) => r.test(text))) return { kind: 'self-harm' };
  if (UNSAFE.some((r) => r.test(text))) return { kind: 'unsafe' };
  if (DANGEROUS.some((r) => r.test(text))) return { kind: 'dangerous' };
  if (PERSONAL_INFO.some((r) => r.test(text))) return { kind: 'personal-info' };
  return { kind: 'ok' };
}

export function safetyReply(kind: Exclude<ScreenResult['kind'], 'ok'>, topic?: string): string {
  const back = topic ? `Shall we get back to ${topic}?` : 'What would you like to learn about?';
  switch (kind) {
    case 'personal-info':
      return `Let's keep personal things like phone numbers, addresses and passwords private, even with me. You never need to share them to learn! ${back}`;
    case 'dangerous':
      return `That could be really dangerous, so let's not try it. Experiments with fire, chemicals or electricity always need a grown-up, and many are never safe at home. ${topic ? `Let's explore ${topic} with a safe activity instead!` : "Let's pick a safe activity from your lesson instead!"}`;
    case 'self-harm':
      return "I'm really glad you told me. What you're feeling matters, and you deserve help from a real person. Please talk to a grown-up you trust, like a parent, teacher or school counsellor, as soon as you can. If you are in India, you can also call 1098, the free children's helpline, any time.";
    case 'unsafe':
    default:
      return `That's not something I can help with. I'm here to help you learn and explore! ${back}`;
  }
}

/**
 * Cleans model output before it reaches a child: removes links and markdown,
 * limits length, and rejects replies that trip the unsafe filters.
 * Returns null when the reply should be replaced with a safe fallback.
 */
export function sanitizeMentorOutput(text: string): string | null {
  let out = text
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/[*_`#>]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!out) return null;
  if (UNSAFE.some((r) => r.test(out))) return null;
  if (out.length > MENTOR_LIMITS.maxReplyChars) {
    const cut = out.slice(0, MENTOR_LIMITS.maxReplyChars);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    out = lastStop > 200 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}...`;
  }
  return out;
}
