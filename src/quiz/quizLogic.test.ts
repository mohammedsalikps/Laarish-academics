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

describe('wireframe practice types (L3a–L3c)', () => {
  const picture: QuizQuestion = {
    id: 'pc',
    type: 'picture-choice',
    prompt: 'p',
    hint: 'h',
    explanation: 'e',
    options: [
      { id: 'spoon', text: 'Steel spoon', art: 'steel-spoon' },
      { id: 'comb', text: 'Plastic comb', art: 'plastic-comb' },
    ],
    correctOptionId: 'spoon',
  };
  const sort: QuizQuestion = {
    id: 'so',
    type: 'sort',
    prompt: 'p',
    hint: 'h',
    explanation: 'e',
    bins: [
      { id: 'yes', text: 'Magnetic' },
      { id: 'no', text: 'Not magnetic' },
    ],
    items: [
      { id: 'nail', text: 'Iron nail', binId: 'yes' },
      { id: 'ruler', text: 'Plastic ruler', binId: 'no' },
      { id: 'pin', text: 'Safety pin', binId: 'yes' },
    ],
  };
  const reason: QuizQuestion = {
    id: 'tr',
    type: 'true-false-reason',
    prompt: 'A magnet pulls a wooden block.',
    hint: 'h',
    explanation: 'e',
    correct: false,
    reasons: [
      { id: 'iron', text: 'Wood is not made of iron' },
      { id: 'heavy', text: 'The block is too heavy' },
    ],
    correctReasonId: 'iron',
  };

  it('picture choice is right only for the right picture', () => {
    expect(isAnswerCorrect(picture, { type: 'picture-choice', optionId: 'spoon' })).toBe(true);
    expect(isAnswerCorrect(picture, { type: 'picture-choice', optionId: 'comb' })).toBe(false);
  });

  it('sorting can be checked only when every object is in a tray, and is right only when all are right', () => {
    expect(isAnswerComplete(sort, { type: 'sort', placement: { nail: 'yes', ruler: 'no' } })).toBe(false);
    const all = { nail: 'yes', ruler: 'no', pin: 'yes' };
    expect(isAnswerComplete(sort, { type: 'sort', placement: all })).toBe(true);
    expect(isAnswerCorrect(sort, { type: 'sort', placement: all })).toBe(true);
    expect(isAnswerCorrect(sort, { type: 'sort', placement: { ...all, pin: 'no' } })).toBe(false);
  });

  it('true/false with a reason needs both parts, and both right', () => {
    expect(isAnswerComplete(reason, { type: 'true-false-reason', value: false })).toBe(false);
    expect(isAnswerComplete(reason, { type: 'true-false-reason', reasonId: 'iron' })).toBe(false);
    expect(isAnswerCorrect(reason, { type: 'true-false-reason', value: false, reasonId: 'iron' })).toBe(true);
    expect(isAnswerCorrect(reason, { type: 'true-false-reason', value: false, reasonId: 'heavy' })).toBe(false);
    expect(isAnswerCorrect(reason, { type: 'true-false-reason', value: true, reasonId: 'iron' })).toBe(false);
  });

  it('score like every other question: wrong answers never cost points, a later right answer earns half', () => {
    const qs = [picture, sort, reason];
    const run = createQuizReducer(qs);
    let s = createQuizState(qs);
    s = run(s, { type: 'submit', answer: { type: 'picture-choice', optionId: 'comb' } });
    expect(s.feedback).toBe('retry');
    s = run(s, { type: 'submit', answer: { type: 'picture-choice', optionId: 'spoon' } });
    s = run(s, { type: 'next' });
    s = run(s, { type: 'submit', answer: { type: 'sort', placement: { nail: 'yes', ruler: 'no', pin: 'yes' } } });
    s = run(s, { type: 'next' });
    s = run(s, { type: 'submit', answer: { type: 'true-false-reason', value: false, reasonId: 'iron' } });
    s = run(s, { type: 'next' });
    expect(s.phase).toBe('summary');
    expect(quizSummary(qs, s)).toMatchObject({ score: 2.5 / 3, correctFirstTry: 2, total: 3 });
  });
});
