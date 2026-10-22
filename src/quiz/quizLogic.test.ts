import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from '../domain/types';
import { createQuizReducer, createQuizState, creditFor, isAnswerComplete, isAnswerCorrect, quizSummary } from './quizLogic';

const questions: QuizQuestion[] = [
  { id: 'mc', type: 'single-choice', prompt: 'p', hint: 'h', explanation: 'e', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'b' },
  { id: 'tf', type: 'true-false', prompt: 'p', hint: 'h', explanation: 'e', correct: false },
  {
    id: 'mp',
    type: 'match-pairs',
    prompt: 'p',
    hint: 'h',
    explanation: 'e',
    pairs: [
      { id: 'x', left: 'X', right: '1' },
      { id: 'y', left: 'Y', right: '2' },
    ],
  },
];
const reduce = createQuizReducer(questions);

describe('answer checking', () => {
  it('checks each question type', () => {
    expect(isAnswerCorrect(questions[0], { type: 'single-choice', optionId: 'b' })).toBe(true);
    expect(isAnswerCorrect(questions[0], { type: 'single-choice', optionId: 'a' })).toBe(false);
    expect(isAnswerCorrect(questions[1], { type: 'true-false', value: false })).toBe(true);
    expect(isAnswerCorrect(questions[2], { type: 'match-pairs', mapping: { x: 'x', y: 'y' } })).toBe(true);
    expect(isAnswerCorrect(questions[2], { type: 'match-pairs', mapping: { x: 'y', y: 'x' } })).toBe(false);
  });

  it('treats incomplete or mismatched answers as not ready', () => {
    expect(isAnswerComplete(questions[2], { type: 'match-pairs', mapping: { x: 'x' } })).toBe(false);
    expect(isAnswerComplete(questions[0], { type: 'true-false', value: true })).toBe(false);
    expect(isAnswerComplete(questions[0], null)).toBe(false);
  });
});

describe('quiz flow and scoring', () => {
  it('gives full credit for a correct first try', () => {
    let s = createQuizState(questions);
    s = reduce(s, { type: 'submit', answer: { type: 'single-choice', optionId: 'b' } });
    expect(s.feedback).toBe('correct');
    expect(creditFor(s.progress.mc)).toBe(1);
  });

  it('gives half credit after a hint or a second try, and none when revealed', () => {
    let s = createQuizState(questions);
    s = reduce(s, { type: 'use-hint' });
    s = reduce(s, { type: 'submit', answer: { type: 'single-choice', optionId: 'b' } });
    expect(creditFor(s.progress.mc)).toBe(0.5);
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'submit', answer: { type: 'true-false', value: true } });
    expect(s.feedback).toBe('retry');
    expect(s.phase).toBe('answering');
    s = reduce(s, { type: 'submit', answer: { type: 'true-false', value: true } });
    expect(s.feedback).toBe('revealed');
    expect(creditFor(s.progress.tf)).toBe(0);
  });

  it('ignores incomplete answers and actions in the wrong phase', () => {
    const s = createQuizState(questions);
    expect(reduce(s, { type: 'next' })).toBe(s);
    const atMatch = { ...s, index: 2 };
    expect(reduce(atMatch, { type: 'submit', answer: { type: 'match-pairs', mapping: { x: 'x' } } })).toBe(atMatch);
  });

  it('reaches a summary with the correct score', () => {
    let s = createQuizState(questions);
    s = reduce(s, { type: 'submit', answer: { type: 'single-choice', optionId: 'b' } }); // 1
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'submit', answer: { type: 'true-false', value: true } });
    s = reduce(s, { type: 'submit', answer: { type: 'true-false', value: false } }); // 0.5
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'submit', answer: { type: 'match-pairs', mapping: { x: 'y', y: 'x' } } });
    s = reduce(s, { type: 'submit', answer: { type: 'match-pairs', mapping: { x: 'y', y: 'x' } } }); // 0
    s = reduce(s, { type: 'next' });
    expect(s.phase).toBe('summary');
    const summary = quizSummary(questions, s);
    expect(summary.score).toBeCloseTo(0.5);
    expect(summary.correctFirstTry).toBe(1);
    expect(summary.answers.map((a) => a.credit)).toEqual([1, 0.5, 0]);
    expect(reduce(s, { type: 'restart' }).phase).toBe('answering');
  });
});
