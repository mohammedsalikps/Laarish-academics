import { describe, expect, it } from 'vitest';
import type { ConceptMatchConfig } from '../../domain/types';
import {
  HINT_AFTER_MISTAKES,
  REVEAL_AFTER_MISTAKES,
  createMatchReducer,
  createMatchState,
  hintLevel,
  matchResult,
  nearestUnmatched,
  stepUnmatched,
} from './matchLogic';

const config: ConceptMatchConfig = {
  type: 'concept-match',
  prompt: 'Match',
  leftLabel: 'Example',
  rightLabel: 'Concept',
  pairs: [
    { id: 'shoes', left: 'Shoes', right: 'Grip', hint: 'h1' },
    { id: 'brakes', left: 'Brakes', right: 'Stopping', hint: 'h2' },
    { id: 'oil', left: 'Oil', right: 'Less friction', hint: 'h3' },
  ],
};
const reduce = createMatchReducer(config);

describe('concept match logic', () => {
  it('shuffles deterministically by seed and contains every pair', () => {
    const a = createMatchState(config, 4);
    const b = createMatchState(config, 4);
    expect(a.leftOrder).toEqual(b.leftOrder);
    expect([...a.leftOrder].sort()).toEqual(['brakes', 'oil', 'shoes']);
    expect([...a.rightOrder].sort()).toEqual(['brakes', 'oil', 'shoes']);
  });

  it('matches a correct pair in either selection order', () => {
    let s = createMatchState(config, 1);
    s = reduce(s, { type: 'select-right', id: 'shoes' });
    s = reduce(s, { type: 'select-left', id: 'shoes' });
    expect(s.matched).toEqual(['shoes']);
    expect(s.feedback).toEqual({ kind: 'correct', leftId: 'shoes', rightId: 'shoes' });
    expect(s.selectedLeft).toBeNull();
  });

  it('counts mistakes against the example and keeps it playable', () => {
    let s = createMatchState(config, 1);
    s = reduce(s, { type: 'select-left', id: 'oil' });
    s = reduce(s, { type: 'select-right', id: 'brakes' });
    expect(s.matched).toEqual([]);
    expect(s.mistakes).toBe(1);
    expect(s.mistakesByPair).toEqual({ oil: 1 });
    expect(s.feedback?.kind).toBe('incorrect');
  });

  it('toggles a selection off when tapped twice and ignores matched cards', () => {
    let s = createMatchState(config, 1);
    s = reduce(s, { type: 'select-left', id: 'oil' });
    s = reduce(s, { type: 'select-left', id: 'oil' });
    expect(s.selectedLeft).toBeNull();
    s = reduce(s, { type: 'select-left', id: 'oil' });
    s = reduce(s, { type: 'select-right', id: 'oil' });
    expect(reduce(s, { type: 'select-left', id: 'oil' })).toBe(s);
  });

  it('completes and scores first-try matches', () => {
    let s = createMatchState(config, 1);
    for (const [l, r] of [
      ['oil', 'brakes'],
      ['oil', 'oil'],
      ['shoes', 'shoes'],
      ['brakes', 'brakes'],
    ]) {
      s = reduce(s, { type: 'select-left', id: l });
      s = reduce(s, { type: 'select-right', id: r });
    }
    expect(s.phase).toBe('complete');
    const result = matchResult(config, s);
    expect(result).toMatchObject({ completed: true, perfect: false, mistakes: 1, correct: 2, total: 3 });
    expect(result.score).toBeCloseTo(2 / 3);
    expect(reduce(s, { type: 'select-left', id: 'shoes' })).toBe(s);
  });

  it('reports a perfect game', () => {
    let s = createMatchState(config, 2);
    for (const id of ['shoes', 'brakes', 'oil']) {
      s = reduce(s, { type: 'select-left', id });
      s = reduce(s, { type: 'select-right', id });
    }
    expect(matchResult(config, s)).toMatchObject({ perfect: true, score: 1 });
  });

  it('is not complete (and not perfect) part way through', () => {
    const s = reduce(reduce(createMatchState(config, 2), { type: 'select-left', id: 'shoes' }), { type: 'select-right', id: 'shoes' });
    expect(matchResult(config, s)).toMatchObject({ completed: false, perfect: false });
  });

  it('checks a dropped pair directly and clears any tap selection', () => {
    let s = reduce(createMatchState(config, 1), { type: 'select-right', id: 'oil' });
    s = reduce(s, { type: 'try-pair', leftId: 'brakes', rightId: 'oil' });
    expect(s).toMatchObject({ mistakes: 1, mistakesByPair: { brakes: 1 }, selectedLeft: null, selectedRight: null });
    expect(s.feedback).toEqual({ kind: 'incorrect', leftId: 'brakes', rightId: 'oil' });
    s = reduce(s, { type: 'try-pair', leftId: 'brakes', rightId: 'brakes' });
    expect(s.matched).toEqual(['brakes']);
    expect(s.feedback?.kind).toBe('correct');
  });

  it('ignores dropped pairs on matched or unknown cards', () => {
    const s = reduce(createMatchState(config, 1), { type: 'try-pair', leftId: 'oil', rightId: 'oil' });
    expect(reduce(s, { type: 'try-pair', leftId: 'shoes', rightId: 'oil' })).toBe(s);
    expect(reduce(s, { type: 'try-pair', leftId: 'oil', rightId: 'shoes' })).toBe(s);
    expect(reduce(s, { type: 'try-pair', leftId: 'nope', rightId: 'shoes' })).toBe(s);
  });

  it('clears selections and feedback, and is a no-op when there is nothing to clear', () => {
    const fresh = createMatchState(config, 1);
    expect(reduce(fresh, { type: 'clear-selection' })).toBe(fresh);
    const s = reduce(reduce(fresh, { type: 'select-left', id: 'oil' }), { type: 'clear-selection' });
    expect(s).toMatchObject({ selectedLeft: null, selectedRight: null, feedback: null });
  });

  it('gives more help with each mistake on the same example', () => {
    let s = createMatchState(config, 1);
    expect(hintLevel(s, 'oil')).toBe(0);
    s = reduce(s, { type: 'try-pair', leftId: 'oil', rightId: 'shoes' });
    expect(hintLevel(s, 'oil')).toBe(1);
    s = reduce(s, { type: 'try-pair', leftId: 'oil', rightId: 'brakes' });
    expect(hintLevel(s, 'oil')).toBe(2);
    expect(REVEAL_AFTER_MISTAKES).toBeGreaterThan(HINT_AFTER_MISTAKES);
    // Help is per example: the others are untouched.
    expect(hintLevel(s, 'shoes')).toBe(0);
  });

  it('steps through a column skipping matched cards (keyboard navigation)', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(stepUnmatched(order, ['b'], 0, 1)).toBe('c');
    expect(stepUnmatched(order, ['b'], 2, -1)).toBe('a');
    expect(stepUnmatched(order, ['d'], 2, 1)).toBeNull();
    expect(stepUnmatched(order, [], 0, -1)).toBeNull();
  });

  it('finds the open card nearest a row (preferring the row above on ties)', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    expect(nearestUnmatched(order, [], 2)).toBe('c');
    expect(nearestUnmatched(order, ['c'], 2)).toBe('b');
    expect(nearestUnmatched(order, ['b', 'c'], 2)).toBe('d');
    expect(nearestUnmatched(order, ['a', 'b', 'c'], 0)).toBe('d');
    expect(nearestUnmatched(order, order, 2)).toBeNull();
  });
});
