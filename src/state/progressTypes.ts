import type { MentorId } from '../../shared/mentor/personas';
import type { ContentLanguage, Grade, SubjectId, TopicStep } from '../domain/types';

/**
 * Learner progress model (schema v2: Subject -> Lesson -> Topic -> steps).
 * Persisted via a ProgressRepository (see persistence.ts). Lesson and subject
 * progress are always derived from topic progress, never stored separately.
 */

export const PROGRESS_SCHEMA_VERSION = 2;

export type AvatarId = 'fox' | 'panda' | 'bunny' | 'cat' | 'robot' | 'dino';

export interface LearnerProfile {
  id: string;
  /** Nickname chosen by the child. No real names, emails or birthdays are collected. */
  displayName: string;
  grade: Grade;
  language: 'en';
  avatarId: AvatarId;
  /** The mentor character the child chose (Rishi or Ayra). Missing for profiles made before mentors existed. */
  mentorId?: MentorId;
  interests: SubjectId[];
  dailyGoalXp: number;
  createdAt: string;
  /** Demo learners are stored on this device only. */
  mode: 'demo';
}

/**
 * A reward (positive amounts) or a spend (negative coins). The `key` makes
 * claims idempotent: a key is never applied twice. XP and coin balances are
 * always derived from the ledger, so they cannot drift out of sync.
 */
export interface LedgerEntry {
  key: string;
  kind: 'reward' | 'spend';
  xp: number;
  coins: number;
  reason: string;
  at: string;
  topicId?: string;
  lessonId?: string;
}

export interface TopicProgress {
  topicId: string;
  status: 'in-progress' | 'completed';
  /** Step to resume at. */
  currentStep: TopicStep;
  /** Steps completed at least once (unlocks free navigation on replay). */
  completedSteps: TopicStep[];
  /** Best score (0-1) for the Play and Practice steps. */
  scores: Partial<Record<'play' | 'practice', number>>;
  startedAt: string;
  lastPlayedAt: string;
  completedAt?: string;
  timesCompleted: number;
  bestMastery: number;
  stars: 0 | 1 | 2 | 3;
}

export interface QuizAnswerRecord {
  questionId: string;
  credit: number;
  attempts: number;
  usedHint: boolean;
}

export interface QuizAttemptRecord {
  id: string;
  topicId: string;
  at: string;
  score: number;
  correctFirstTry: number;
  total: number;
  mode: 'first' | 'practice';
  answers: QuizAnswerRecord[];
}

export interface GameAttemptRecord {
  id: string;
  topicId: string;
  gameType: string;
  at: string;
  score: number;
  completed: boolean;
  mode: 'first' | 'practice';
  summary: string;
}

export type ActivityKind = 'step' | 'topic' | 'lesson' | 'achievement' | 'mission' | 'purchase';

export interface ActivityEntry {
  id: string;
  at: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  topicId?: string;
  lessonId?: string;
  /** For achievements: the achievement id. */
  ref?: string;
}

export interface Settings {
  motion: 'system' | 'reduce' | 'full';
  textSize: 'standard' | 'large';
  sound: boolean;
  readAloud: boolean;
  /** Language the mentor uses for "Explain it in my language". */
  mentorLanguage: ContentLanguage;
  /**
   * Answer quiz questions by speaking (browser speech recognition). Off until a
   * grown-up turns it on, because some browsers send the audio to their own
   * speech service. Saved progress without it reads as off.
   */
  voiceAnswers: boolean;
}

export interface LearnerStats {
  mentorQuestions: number;
  /** Mentor questions per local day (YYYY-MM-DD), trimmed to recent days. */
  mentorQuestionsByDay: Record<string, number>;
  /** Unique "topicId:surfaceId" pairs tested in experiments. */
  surfacesTested: string[];
  correctPredictions: number;
  experimentRuns: number;
  perfectGames: number;
  perfectQuizzes: number;
  subjectsVisited: SubjectId[];
}

export interface ProgressState {
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  learner: LearnerProfile | null;
  ledger: LedgerEntry[];
  topics: Record<string, TopicProgress>;
  quizAttempts: QuizAttemptRecord[];
  gameAttempts: GameAttemptRecord[];
  achievements: Record<string, { unlockedAt: string }>;
  activity: ActivityEntry[];
  /** Local dates (YYYY-MM-DD) with learning activity, ascending. */
  activeDays: string[];
  ownedAvatars: AvatarId[];
  stats: LearnerStats;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  motion: 'system',
  textSize: 'standard',
  sound: true,
  readAloud: false,
  mentorLanguage: 'en',
  voiceAnswers: false,
};

export const STARTER_AVATARS: AvatarId[] = ['fox', 'panda', 'bunny'];

export function createInitialState(): ProgressState {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    learner: null,
    ledger: [],
    topics: {},
    quizAttempts: [],
    gameAttempts: [],
    achievements: {},
    activity: [],
    activeDays: [],
    ownedAvatars: [...STARTER_AVATARS],
    stats: {
      mentorQuestions: 0,
      mentorQuestionsByDay: {},
      surfacesTested: [],
      correctPredictions: 0,
      experimentRuns: 0,
      perfectGames: 0,
      perfectQuizzes: 0,
      subjectsVisited: [],
    },
    settings: { ...DEFAULT_SETTINGS },
  };
}
