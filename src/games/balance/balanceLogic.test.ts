import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { BalanceGameConfig } from '../../domain/types';
import { balanceHint, balanceResult, createBalanceReducer, direction, initialBalanceState, sideTotal, tilt, type BalanceAction, type BalanceState, type Round } from './balanceLogic';

const config = getTopic('missing-equals-balance')!.play.game as BalanceGameConfig;
const reduce = createBalanceReducer(config);
const run = (state: BalanceState, ...actions: BalanceAction[]) => actions.reduce(reduce, state);
const solve = (state: BalanceState, value: number): BalanceState => run(state, { type: 'choose', value }, { type: 'check' }, { type: 'next' });

describe('balance scale model', () => {
  it('adds each side, counting every unknown', () => {
    expect(sideTotal([4, 5], null)).toBe(9);
    expect(sideTotal([3, 'unknown'], null)).toBeNull();
    expect(sideTotal([3, 'unknown'], 6)).toBe(9);
    expect(sideTotal(['unknown', 'unknown'], 8)).toBe(16);
  });

  it('tips towards the heavier side and is level only when both sides are equal', () => {
    const round = config.rounds[1]; // 4 + 5 = 3 + ?
    expect(tilt(round, null)).toBeNull();
    expect(tilt(round, 6)).toBe(0);
    expect(tilt(round, 9)).toBe(1); // 12 on the right: right side heavier
    expect(tilt(round, 5)).toBe(-1); // 8 on the right: left side heavier
  });

  it('knows whether the unknown needs to be smaller or bigger, wherever it sits', () => {
    const right = config.rounds[1]; // 4 + 5 = 3 + ?
    expect(direction(right, 9)).toBe('smaller');
    expect(direction(right, 5)).toBe('bigger');
    expect(direction(right, 6)).toBeNull();
    expect(direction(right, null)).toBeNull();
    const left = config.rounds[2]; // 2 + ? = 5 + 4
    expect(direction(left, 11)).toBe('smaller');
    expect(direction(left, 2)).toBe('bigger');
    const both: Round = { ...left, left: ['unknown', 'unknown'], right: [8], answer: 4 };
    expect(direction(both, 5)).toBe('smaller');
    const cancels: Round = { ...left, left: ['unknown', 1], right: ['unknown', 2] };
    expect(direction(cancels, 3)).toBeNull();
  });

  it('gives one hint line: a nudge after the first wrong check, then the round hint', () => {
    const round = config.rounds[1];
    expect(balanceHint(round, 9, 0)).toBeNull();
    expect(balanceHint(round, 6, 1)).toBeNull();
    expect(balanceHint(round, 9, 1)).toEqual({ level: 1, text: 'Too big. Try a smaller number.' });
    expect(balanceHint(round, 5, 1)).toEqual({ level: 1, text: 'Too small. Try a bigger number.' });
    expect(balanceHint(round, 5, 2)).toEqual({ level: 2, text: round.hint });
  });
});

describe('balance game flow', () => {
  it('needs a number before checking, and ignores numbers that are not offered', () => {
    expect(run(initialBalanceState, { type: 'check' })).toBe(initialBalanceState);
    expect(run(initialBalanceState, { type: 'choose', value: 999 })).toBe(initialBalanceState);
  });

  it('counts a wrong try as a mistake and lets the learner try again', () => {
    const wrong = run(initialBalanceState, { type: 'choose', value: 8 }, { type: 'check' });
    expect(wrong.phase).toBe('incorrect');
    expect(wrong.mistakes).toBe(1);
    const fixed = run(wrong, { type: 'choose', value: 9 }, { type: 'check' });
    expect(fixed.phase).toBe('correct');
  });

  it('completes all rounds with a perfect score when each answer is right first time', () => {
    const done = config.rounds.reduce((s, r) => solve(s, r.answer), initialBalanceState);
    expect(done.phase).toBe('complete');
    expect(balanceResult(config, done)).toMatchObject({ gameType: 'balance', completed: true, score: 1, perfect: true });
  });

  it('lowers the score for rounds with mistakes', () => {
    const [first, ...rest] = config.rounds;
    const wrongChoice = first.choices.find((c) => c !== first.answer)!;
    let s = run(initialBalanceState, { type: 'choose', value: wrongChoice }, { type: 'check' });
    s = solve(s, first.answer);
    s = rest.reduce((state, r) => solve(state, r.answer), s);
    const result = balanceResult(config, s);
    expect(result.completed).toBe(true);
    expect(result.mistakes).toBe(1);
    expect(result.score).toBeCloseTo((config.rounds.length - 1) / config.rounds.length);
  });
});
