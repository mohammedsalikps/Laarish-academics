import { getTopic, getTopicsForLesson } from '../content';
import type { GameResult, QuizResult } from '../domain/results';
import { progressReducer, type ProgressAction } from '../state/reducer';
import { createInitialState, type ProgressState } from '../state/progressTypes';

export const NOW = '2026-10-20T10:00:00.000Z';
export const FRICTION_LESSON = 'friction';
export const FRICTION_TOPICS = getTopicsForLesson(FRICTION_LESSON).map((t) => t.id);

export function apply(state: ProgressState, ...actions: ProgressAction[]): ProgressState {
  return actions.reduce(progressReducer, state);
}

export function learnerState(overrides: Partial<{ grade: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; name: string; mentor: 'rishi' | 'ayra' }> = {}): ProgressState {
  return progressReducer(createInitialState(), {
    type: 'create-learner',
    profile: { displayName: overrides.name ?? 'Asha', grade: overrides.grade ?? 4, avatarId: 'fox', mentorId: overrides.mentor ?? 'rishi', interests: ['science'], dailyGoalXp: 50 },
    id: 'learner-1',
    now: NOW,
  });
}

export function gameResult(gameType: GameResult['gameType'], score: number, perfect = score === 1): GameResult {
  return { gameType, score, correct: Math.round(score * 5), total: 5, mistakes: perfect ? 0 : 1, completed: true, perfect, summary: 'test' };
}

/** A complete quiz result for a topic, with one credit per question (default: all right first time). */
export function quizResultFor(topicId: string, credits?: number | number[]): QuizResult {
  const questions = getTopic(topicId)!.practice.questions;
  const list = questions.map((_, i) => (Array.isArray(credits) ? (credits[i] ?? 1) : (credits ?? 1)));
  return {
    score: list.reduce((a, b) => a + b, 0) / list.length,
    correctFirstTry: list.filter((c) => c >= 1).length,
    total: list.length,
    answers: questions.map((q, i) => ({ questionId: q.id, credit: list[i], attempts: list[i] >= 1 ? 1 : 2, usedHint: false })),
  };
}

/** Plays Watch → Play → Practice for one topic through the reducer. */
export function playTopic(
  state: ProgressState,
  topicId: string,
  opts: { credits?: number | number[]; playScore?: number; watched?: boolean; now?: string; runId?: string } = {},
): ProgressState {
  const topic = getTopic(topicId)!;
  const now = opts.now ?? NOW;
  const id = opts.runId ?? 'a';
  const game = topic.play.game;
  const actions: ProgressAction[] = [{ type: 'complete-watch', topicId, watched: opts.watched ?? true, now }];
  if (game.type === 'friction-experiment') {
    actions.push({ type: 'experiment-run', topicId, surfaceId: game.surfaces[0].id, predictionCorrect: true, id: `run-${topicId}-${id}`, now });
  }
  actions.push(
    { type: 'game-result', topicId, result: gameResult(game.type, opts.playScore ?? 1), id: `game-${topicId}-${id}`, now },
    { type: 'quiz-result', topicId, result: quizResultFor(topicId, opts.credits), id: `quiz-${topicId}-${id}`, now },
  );
  return apply(state, ...actions);
}

/** Masters every topic of a lesson in order. */
export function playLesson(state: ProgressState, lessonId: string, opts: { now?: string } = {}): ProgressState {
  return getTopicsForLesson(lessonId).reduce((s, t) => playTopic(s, t.id, opts), state);
}
