import type { MentorId } from './personas.js';
/**
 * Mentor API contract shared by the browser client and the server.
 * Shared modules use explicit .js import specifiers so they run unbundled on
 * Node/serverless runtimes as well as through Vite.
 */

export type MentorRole = 'learner' | 'mentor';

export interface MentorMessage {
  role: MentorRole;
  text: string;
}

export const MENTOR_INTENTS = ['simpler', 'example', 'why', 'hint', 'mistake', 'practice', 'language', 'progress', 'free'] as const;
export type MentorIntent = (typeof MENTOR_INTENTS)[number];

/** Where the learner is inside a topic. */
export const MENTOR_STEPS = ['watch', 'play', 'practice', 'complete', 'none'] as const;
export type MentorStep = (typeof MENTOR_STEPS)[number];

export const REPLY_LANGUAGES = ['en', 'hi', 'kn'] as const;
export type ReplyLanguage = (typeof REPLY_LANGUAGES)[number];

/**
 * Learning context sent with each question. Only curriculum ids and short
 * activity summaries are sent: never the child's nickname or other profile data.
 * The server looks up titles, objectives and facts from the curriculum by id.
 */
export interface MentorContext {
  subjectId?: string;
  lessonId?: string;
  topicId?: string;
  step?: MentorStep;
  grade?: number;
  /** Language for "Explain it in my language". */
  replyLanguage?: ReplyLanguage;
  /** Short description of the learner's latest game result, e.g. "On grass the car rolled 1.5 m". */
  recentResult?: string;
  /** Short description of the learner's latest quiz mistake. */
  lastMistake?: string;
  /** What the learner is doing right now in the game, e.g. "Friction Lab: predict how far the car rolls on grass". */
  activity?: string;
  /** The mentor character the learner chose. Only changes tone and name, never the facts. */
  mentor?: MentorId;
  /** Minimal progress summary, computed by the app. Only sent when the learner asks about progress. */
  progress?: ProgressSummary;
  /** The Practice question on screen, as curriculum ids only (the server reads the text and checks the answer). */
  quiz?: MentorQuizContext;
}

export interface MentorQuizContext {
  questionId: string;
  /** The learner's latest answer: an option id, or "true" / "false". */
  answer?: string;
  /** The app has already shown the correct answer (after the last try). */
  answerShown?: boolean;
}

export const PROGRESS_STEPS = ['watch', 'play', 'practice'] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];

/**
 * Counts and curriculum ids only, computed from the app's real progress state.
 * No names, dates or free text, so nothing personal leaves the device.
 */
export interface ProgressSummary {
  level: number;
  stars: number;
  streakDays: number;
  topicsCompleted: number;
  topicsTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  /** Topic that is started but not finished, and the step to resume at. */
  currentTopicId?: string;
  currentStep?: ProgressStep;
  /** The app's recommended next activity. */
  nextTopicId?: string;
  nextStep?: ProgressStep;
  /** Progress in the subject the learner is looking at. */
  subjectId?: string;
  subjectTopicsMastered?: number;
  subjectTopicsTotal?: number;
}

export interface MentorRequest {
  messages: MentorMessage[];
  context: MentorContext;
  intent?: MentorIntent;
}

export type MentorProviderName = 'claude' | 'demo';

export type MentorFlag = 'personal-info' | 'self-harm' | 'unsafe' | 'dangerous';

export interface MentorReply {
  reply: string;
  provider: MentorProviderName;
  /** Set when the learner's message was handled by a safety rule instead of the model. */
  flagged?: MentorFlag;
  followUps?: string[];
}

/**
 * Why the live AI could not answer. Safe to show grown-ups and to log: it never contains a key,
 * a prompt or a reply.
 * - auth: the API key was not accepted (wrong, revoked or expired)
 * - permission: the key may not use this model or feature
 * - credit: the Anthropic account has no credit left
 * - model: the configured model does not exist for this key
 * - rate_limited / overloaded: Anthropic asked us to slow down, or is busy
 * - timeout / unreachable: no answer in time, or no connection
 */
export type MentorFailure = 'auth' | 'permission' | 'credit' | 'model' | 'rate_limited' | 'overloaded' | 'timeout' | 'unreachable' | 'unknown';

/** Failures that retrying will not fix: a grown-up has to change the configuration. */
export const CONFIG_FAILURES: readonly MentorFailure[] = ['auth', 'permission', 'credit', 'model'];

/**
 * Safe details of a failed AI call, for grown-ups and logs: never the key, the prompt or the
 * learner's words. Anthropic's own message is shortened and anything key-like is removed.
 */
export interface MentorFailureDetail {
  /** model_check: failed while confirming the key and model, before any message was sent. message: failed on the message itself. */
  stage: 'model_check' | 'message';
  /** HTTP status Anthropic answered with (absent when there was no answer, e.g. a timeout). */
  httpStatus?: number;
  /** Anthropic's error type, e.g. authentication_error, permission_error, not_found_error. */
  errorType?: string;
  /** Anthropic's request id, to quote to Anthropic support. */
  requestId?: string;
  /** Anthropic's error message, redacted and shortened. */
  message?: string;
}

/** Result of the safe configuration check (`GET /api/mentor?check=1`). Never includes the key. */
export interface MentorCheck {
  /** Whether a server-side key is set. The key itself is never returned. */
  keyConfigured: boolean;
  /** production, preview or development (from the hosting platform). */
  environment: string;
  /** ok, missing_key (demo mode), demo_forced (MENTOR_PROVIDER=demo), or why the key does not work. */
  result: 'ok' | 'missing_key' | 'demo_forced' | MentorFailure;
  /** "model" checks the key and model only (free); "message" also sends one tiny request (checks credit). */
  depth: 'model' | 'message';
  checkedAt: string;
  /** The model the server is configured to use. */
  model?: string;
  /** The server's time limit for one answer, in milliseconds. */
  timeoutMs?: number;
  /** When the result is a failure: what Anthropic said, safely. */
  detail?: MentorFailureDetail;
}

export interface MentorStatus {
  provider: MentorProviderName;
  model?: string;
  check?: MentorCheck;
}

export interface MentorErrorBody {
  error: 'invalid_request' | 'rate_limited' | 'mentor_unavailable' | 'timeout' | 'method_not_allowed' | 'payload_too_large';
  message: string;
  /** Only on mentor_unavailable and timeout: the reason category (see MentorFailure). */
  reason?: MentorFailure;
  /** Only on mentor_unavailable: whether it failed before any message was sent (model_check) or on the message. */
  stage?: MentorFailureDetail['stage'];
}

export const LANGUAGE_NAMES: Record<ReplyLanguage, string> = { en: 'English', hi: 'Hindi', kn: 'Kannada' };

/** Suggested prompts, tailored to the step the learner is on. */
export function suggestedPrompts(step: MentorStep = 'none'): { intent: MentorIntent; label: string }[] {
  const all: Record<Exclude<MentorIntent, 'free'>, string> = {
    simpler: 'Explain this more simply',
    hint: 'Give me a hint',
    example: 'Show me an example',
    mistake: 'Why did my answer go wrong?',
    why: 'Why did that happen?',
    language: 'Explain it in my language',
    practice: 'Ask me a practice question',
    progress: 'How am I doing?',
  };
  const order: Record<MentorStep, Exclude<MentorIntent, 'free'>[]> = {
    watch: ['simpler', 'example', 'language', 'practice', 'hint'],
    play: ['hint', 'why', 'simpler', 'example', 'language'],
    practice: ['hint', 'mistake', 'simpler', 'example', 'language'],
    complete: ['progress', 'practice', 'example', 'simpler', 'language'],
    none: ['progress', 'simpler', 'hint', 'example', 'mistake', 'language', 'practice'],
  };
  return order[step].map((intent) => ({ intent, label: all[intent] }));
}
