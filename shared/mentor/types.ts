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

export interface MentorStatus {
  provider: MentorProviderName;
  model?: string;
}

export interface MentorErrorBody {
  error: 'invalid_request' | 'rate_limited' | 'mentor_unavailable' | 'timeout' | 'method_not_allowed' | 'payload_too_large';
  message: string;
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
