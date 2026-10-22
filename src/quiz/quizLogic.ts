import type { QuizResult } from '../domain/results';
import type { QuizAnswer, QuizQuestion } from '../domain/types';
import { REWARD_RULES } from '../engine/rules';

/**
 * Quiz engine. Each question allows REWARD_RULES.quiz.maxAttempts tries.
 * Credit: 1 for correct on the first try without a hint, 0.5 for correct
 * with a hint or on a later try, 0 when the answer had to be revealed.
 */

export interface QuestionProgress {
  questionId: string;
  attempts: number;
  usedHint: boolean;
  status: 'unanswered' | 'correct' | 'revealed';
  lastAnswer?: QuizAnswer;
}

export type QuizFeedback = 'correct' | 'retry' | 'revealed' | null;

export interface QuizRunState {
  index: number;
  phase: 'answering' | 'feedback' | 'summary';
  feedback: QuizFeedback;
  progress: Record<string, QuestionProgress>;
}

export type QuizRunAction = { type: 'use-hint' } | { type: 'submit'; answer: QuizAnswer } | { type: 'next' } | { type: 'restart' };

export function isAnswerComplete(question: QuizQuestion, answer: QuizAnswer | null | undefined): answer is QuizAnswer {
  if (!answer || answer.type !== question.type) return false;
  if (answer.type === 'match-pairs' && question.type === 'match-pairs') {
    return question.pairs.every((p) => Boolean(answer.mapping[p.id]));
  }
  return true;
}

export function isAnswerCorrect(question: QuizQuestion, answer: QuizAnswer): boolean {
  switch (question.type) {
    case 'single-choice':
      return answer.type === 'single-choice' && answer.optionId === question.correctOptionId;
    case 'true-false':
      return answer.type === 'true-false' && answer.value === question.correct;
    case 'match-pairs':
      // Each left item (keyed by pair id) must map to its own pair id on the right.
      return answer.type === 'match-pairs' && question.pairs.every((p) => answer.mapping[p.id] === p.id);
    default:
      return false;
  }
}

export function creditFor(p: QuestionProgress | undefined): number {
  if (!p || p.status === 'unanswered' || p.status === 'revealed') return 0;
  return p.attempts === 1 && !p.usedHint ? REWARD_RULES.quiz.creditFirstTry : REWARD_RULES.quiz.creditAssisted;
}

export function createQuizState(questions: QuizQuestion[]): QuizRunState {
  return {
    index: 0,
    phase: questions.length ? 'answering' : 'summary',
    feedback: null,
    progress: Object.fromEntries(
      questions.map((q) => [q.id, { questionId: q.id, attempts: 0, usedHint: false, status: 'unanswered' } satisfies QuestionProgress]),
    ),
  };
}

export function createQuizReducer(questions: QuizQuestion[]) {
  return function quizReducer(state: QuizRunState, action: QuizRunAction): QuizRunState {
    const question = questions[state.index];
    switch (action.type) {
      case 'restart':
        return createQuizState(questions);
      case 'use-hint': {
        if (state.phase !== 'answering' || !question) return state;
        const p = state.progress[question.id];
        if (p.usedHint) return state;
        return { ...state, progress: { ...state.progress, [question.id]: { ...p, usedHint: true } } };
      }
      case 'submit': {
        if (state.phase !== 'answering' || !question || !isAnswerComplete(question, action.answer)) return state;
        const p = state.progress[question.id];
        const attempts = p.attempts + 1;
        const correct = isAnswerCorrect(question, action.answer);
        const revealed = !correct && attempts >= REWARD_RULES.quiz.maxAttempts;
        const status: QuestionProgress['status'] = correct ? 'correct' : revealed ? 'revealed' : 'unanswered';
        return {
          ...state,
          phase: correct || revealed ? 'feedback' : 'answering',
          feedback: correct ? 'correct' : revealed ? 'revealed' : 'retry',
          progress: { ...state.progress, [question.id]: { ...p, attempts, status, lastAnswer: action.answer } },
        };
      }
      case 'next': {
        if (state.phase !== 'feedback') return state;
        const last = state.index >= questions.length - 1;
        return { ...state, index: last ? state.index : state.index + 1, phase: last ? 'summary' : 'answering', feedback: null };
      }
      default:
        return state;
    }
  };
}

export function quizSummary(questions: QuizQuestion[], state: QuizRunState): QuizResult {
  const answers = questions.map((q) => {
    const p = state.progress[q.id];
    return { questionId: q.id, credit: creditFor(p), attempts: p?.attempts ?? 0, usedHint: p?.usedHint ?? false };
  });
  const total = questions.length;
  return {
    score: total ? answers.reduce((s, a) => s + a.credit, 0) / total : 0,
    correctFirstTry: answers.filter((a) => a.credit >= 1).length,
    total,
    answers,
  };
}
