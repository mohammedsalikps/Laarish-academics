import type { QuizAnswer, QuizQuestion } from '../domain/types';

/** Human-readable versions of answers, used for feedback and mentor context. */
export function answerText(question: QuizQuestion, answer: QuizAnswer | undefined): string {
  if (!answer) return '';
  if (question.type === 'single-choice' && answer.type === 'single-choice') return question.options.find((o) => o.id === answer.optionId)?.text ?? '';
  if (answer.type === 'true-false') return answer.value ? 'True' : 'False';
  if (question.type === 'match-pairs' && answer.type === 'match-pairs') {
    return question.pairs.map((p) => `${p.left} → ${question.pairs.find((q) => q.id === answer.mapping[p.id])?.right ?? '?'}`).join('; ');
  }
  return '';
}

export function correctAnswerText(question: QuizQuestion): string {
  switch (question.type) {
    case 'single-choice':
      return question.options.find((o) => o.id === question.correctOptionId)?.text ?? '';
    case 'true-false':
      return question.correct ? 'True' : 'False';
    case 'match-pairs':
      return question.pairs.map((p) => `${p.left} → ${p.right}`).join('; ');
  }
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Keyboard shortcuts: A–F or 1–6 pick a choice, T and F answer true/false. */
export function answerForKey(question: QuizQuestion, key: string): QuizAnswer | null {
  const k = key.toLowerCase();
  if (question.type === 'true-false') {
    if (k === 't') return { type: 'true-false', value: true };
    if (k === 'f') return { type: 'true-false', value: false };
    return null;
  }
  if (question.type !== 'single-choice') return null;
  const i = /^[1-6]$/.test(k) ? Number(k) - 1 : LETTERS.map((l) => l.toLowerCase()).indexOf(k);
  return i >= 0 && i < question.options.length ? { type: 'single-choice', optionId: question.options[i].id } : null;
}

/** "B: An iron nail", "True", for confirming a spoken answer. */
export function describeAnswer(question: QuizQuestion, answer: QuizAnswer): string {
  if (question.type === 'single-choice' && answer.type === 'single-choice') {
    const i = question.options.findIndex((o) => o.id === answer.optionId);
    return i >= 0 ? `${LETTERS[i]}: ${question.options[i].text}` : '';
  }
  if (answer.type === 'true-false') return answer.value ? 'True' : 'False';
  return '';
}
