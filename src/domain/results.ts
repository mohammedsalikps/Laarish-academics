import type { GameType } from './types';

/** Outcome reported by any mini-game when it finishes (see games/framework.ts). */
export interface GameResult {
  gameType: GameType;
  /** 0-1 score. For exploratory games this is informational only. */
  score: number;
  correct: number;
  total: number;
  mistakes: number;
  completed: boolean;
  /** Completed with no mistakes. */
  perfect: boolean;
  summary: string;
}

export interface QuizQuestionOutcome {
  questionId: string;
  /** 1 = correct first try without hint, 0.5 = correct with help, 0 = revealed. */
  credit: number;
  attempts: number;
  usedHint: boolean;
}

export interface QuizResult {
  score: number;
  correctFirstTry: number;
  total: number;
  answers: QuizQuestionOutcome[];
}
