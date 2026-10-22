import { describe, expect, it } from 'vitest';
import type { AreaGridConfig } from '../../domain/types';
import {
  areaHint,
  areaOf,
  areaResult,
  areaUnit,
  canCheck,
  cellAt,
  clampSize,
  createAreaReducer,
  goalText,
  initialAreaState,
  isCorrect,
  lengthUnit,
  nudge,
  perimeterOf,
  readout,
  roundOutcomes,
  steppedSize,
  type AreaAction,
  type AreaState,
} from './areaLogic';

const config: AreaGridConfig = {
  type: 'area-grid',
  cols: 8,
  rows: 6,
  rounds: [
    { id: 'area-12', area: 12, unit: 'square cm', prompt: 'Make a rectangle with an area of 12 square cm.', hint: 'Area is width times height.', explanation: '12 squares fill your rectangle.' },
    { id: 'perimeter-14', perimeter: 14, prompt: 'Make a rectangle with a perimeter of 14 units.', hint: 'Width plus height must be 7.', explanation: 'All four sides add up to 14.' },
    { id: 'both', area: 12, perimeter: 14, unit: 'square m', prompt: 'Area 12 square m and perimeter 14 m.', hint: 'Try 3 by 4.', explanation: '3 × 4 = 12 and 3 + 4 + 3 + 4 = 14.' },
  ],
};
const [areaRound, perimeterRound, bothRound] = config.rounds;
const reduce = createAreaReducer(config);
const run = (state: AreaState, ...actions: AreaAction[]) => actions.reduce(reduce, state);
const set = (width: number, height: number): AreaAction => ({ type: 'set', width, height });
const solve = (state: AreaState, width: number, height: number) => run(state, set(width, height), { type: 'check' }, { type: 'next' });

describe('area and perimeter maths', () => {
  it('measures a rectangle in squares and sides', () => {
    expect(areaOf({ width: 3, height: 4 })).toBe(12);
    expect(perimeterOf({ width: 3, height: 4 })).toBe(14);
    expect(areaOf({ width: 1, height: 1 })).toBe(1);
    expect(perimeterOf({ width: 1, height: 1 })).toBe(4);
    expect(areaOf({ width: 0, height: 0 })).toBe(0);
    expect(perimeterOf({ width: 0, height: 0 })).toBe(0);
  });

  it('accepts any rectangle with the right measurements', () => {
    for (const [w, h] of [
      [3, 4],
      [4, 3],
      [2, 6],
      [6, 2],
      [1, 12],
      [12, 1],
    ]) {
      expect(isCorrect(areaRound, { width: w, height: h })).toBe(true);
    }
    expect(isCorrect(areaRound, { width: 3, height: 3 })).toBe(false);
    expect(isCorrect(areaRound, { width: 0, height: 0 })).toBe(false);

    // Perimeter 14: width + height = 7.
    expect([1, 2, 3, 4, 5, 6].every((w) => isCorrect(perimeterRound, { width: w, height: 7 - w }))).toBe(true);
    expect(isCorrect(perimeterRound, { width: 4, height: 4 })).toBe(false);

    // Both: only 3 × 4 and 4 × 3.
    expect(isCorrect(bothRound, { width: 3, height: 4 })).toBe(true);
    expect(isCorrect(bothRound, { width: 4, height: 3 })).toBe(true);
    expect(isCorrect(bothRound, { width: 2, height: 6 })).toBe(false); // area right, perimeter 16
    expect(isCorrect(bothRound, { width: 2, height: 5 })).toBe(false); // perimeter right, area 10
  });

  it('names the units: area in squares by default, sides without "square"', () => {
    expect(areaUnit(areaRound)).toBe('square cm');
    expect(lengthUnit(areaRound)).toBe('cm');
    expect(areaUnit(perimeterRound)).toBe('squares');
    expect(areaUnit(perimeterRound, 1)).toBe('square');
    expect(lengthUnit(perimeterRound)).toBe('units');
    expect(lengthUnit({ ...areaRound, unit: 'tiles' })).toBe('units');
    expect(readout(areaRound, { width: 3, height: 4 })).toBe('Area: 12 square cm · Perimeter: 14 cm');
    expect(readout(perimeterRound, { width: 2, height: 3 })).toBe('Area: 6 squares · Perimeter: 10 units');
    expect(goalText(areaRound)).toBe('Area 12 square cm');
    expect(goalText(perimeterRound)).toBe('Perimeter 14 units');
    expect(goalText(bothRound)).toBe('Area 12 square m and perimeter 14 m');
  });

  it('snaps sizes and points to whole squares on the grid', () => {
    expect(clampSize(config, 0, 0)).toEqual({ width: 1, height: 1 });
    expect(clampSize(config, 20, 20)).toEqual({ width: 8, height: 6 });
    expect(clampSize(config, 2.6, 3.2)).toEqual({ width: 3, height: 3 });
    expect(cellAt(2.9, 0.1, config)).toEqual({ col: 2, row: 0 });
    expect(cellAt(-1, -5, config)).toEqual({ col: 0, row: 0 });
    expect(cellAt(99, 99, config)).toEqual({ col: 7, row: 5 });
  });

  it('steps the width and height one square at a time, starting from 1 × 1', () => {
    const empty = { width: 0, height: 0 };
    expect(steppedSize(config, empty, 'width', 1)).toEqual({ width: 1, height: 1 });
    expect(steppedSize(config, empty, 'height', -1)).toBeNull();
    expect(steppedSize(config, { width: 3, height: 4 }, 'width', 1)).toEqual({ width: 4, height: 4 });
    expect(steppedSize(config, { width: 3, height: 4 }, 'height', -1)).toEqual({ width: 3, height: 3 });
    expect(steppedSize(config, { width: 1, height: 4 }, 'width', -1)).toBeNull();
    expect(steppedSize(config, { width: 8, height: 4 }, 'width', 1)).toBeNull();
  });
});

describe('area hints', () => {
  it('nudges from the numbers: too small, too big, or the perimeter is off', () => {
    expect(nudge(areaRound, { width: 2, height: 5 })).toBe('Your area is 10. You need 12: make it bigger.');
    expect(nudge(areaRound, { width: 4, height: 4 })).toBe('Your area is 16. You need 12: make it smaller.');
    expect(nudge(areaRound, { width: 3, height: 4 })).toBeNull();
    expect(nudge(perimeterRound, { width: 2, height: 3 })).toBe('Your perimeter is 10. You need 14: make the sides longer.');
    expect(nudge(perimeterRound, { width: 4, height: 4 })).toBe('Your perimeter is 16. You need 14: make the sides shorter.');
    expect(nudge(bothRound, { width: 2, height: 6 })).toBe('Area is right, but the perimeter is 16, not 14.');
    expect(nudge(bothRound, { width: 2, height: 5 })).toBe('Perimeter is right, but the area is 10, not 12.');
    expect(nudge(bothRound, { width: 2, height: 2 })).toBe('Your area is 4. You need 12: make it bigger.');
  });

  it('gives the nudge after the first wrong check, then the round hint', () => {
    const tried = { width: 2, height: 5 };
    expect(areaHint(areaRound, tried, 0)).toBeNull();
    expect(areaHint(areaRound, null, 1)).toBeNull();
    expect(areaHint(areaRound, tried, 1)).toEqual({ level: 1, text: 'Your area is 10. You need 12: make it bigger.' });
    expect(areaHint(areaRound, tried, 2)).toEqual({ level: 2, text: areaRound.hint });
    expect(areaHint(areaRound, tried, 5)).toEqual({ level: 2, text: areaRound.hint });
  });
});

describe('area game flow', () => {
  it('needs a rectangle before checking', () => {
    expect(canCheck(initialAreaState)).toBe(false);
    expect(run(initialAreaState, { type: 'check' })).toBe(initialAreaState);
    const drawn = run(initialAreaState, set(3, 4));
    expect(drawn).toMatchObject({ width: 3, height: 4, phase: 'playing' });
    expect(canCheck(drawn)).toBe(true);
  });

  it('clamps drawn rectangles to the grid and ignores no-op changes', () => {
    expect(run(initialAreaState, set(40, 40))).toMatchObject({ width: 8, height: 6 });
    expect(run(initialAreaState, set(Number.NaN, 2))).toBe(initialAreaState);
    const drawn = run(initialAreaState, set(3, 4));
    expect(run(drawn, set(3, 4))).toBe(drawn);
    expect(run(initialAreaState, { type: 'step', side: 'height', by: 1 }, { type: 'step', side: 'height', by: 1 })).toMatchObject({ width: 1, height: 2 });
  });

  it('counts a wrong check as a mistake, and needs a change before checking again', () => {
    const wrong = run(initialAreaState, set(2, 5), { type: 'check' });
    expect(wrong).toMatchObject({ phase: 'incorrect', mistakes: 1, lastWrong: { width: 2, height: 5 }, mistakesByRound: { 'area-12': 1 } });
    expect(canCheck(wrong)).toBe(false);
    expect(run(wrong, { type: 'check' })).toBe(wrong);
    expect(run(wrong, { type: 'next' })).toBe(wrong);

    const fixed = run(wrong, set(6, 2), { type: 'check' });
    expect(fixed).toMatchObject({ phase: 'correct', lastWrong: null, solved: { 'area-12': { width: 6, height: 2 } } });
    // A solved round is locked.
    expect(run(fixed, set(1, 1))).toBe(fixed);
    expect(run(fixed, { type: 'next' })).toMatchObject({ round: 1, width: 0, height: 0, phase: 'playing' });
  });

  it('completes after the last round and reports first-try rounds', () => {
    let state = run(initialAreaState, set(2, 2), { type: 'check' });
    state = solve(state, 3, 4);
    state = solve(state, 5, 2);
    expect(areaResult(config, state).completed).toBe(false);
    state = solve(state, 4, 3);
    expect(state.phase).toBe('complete');
    expect(areaResult(config, state)).toEqual({
      gameType: 'area-grid',
      score: 2 / 3,
      correct: 2,
      total: 3,
      mistakes: 1,
      completed: true,
      perfect: false,
      summary: 'Built 3 of 3 rectangles with 1 wrong try',
    });
    expect(roundOutcomes(config, state).map((o) => [o.firstTry, o.wrong, o.built])).toEqual([
      [false, 1, { width: 3, height: 4 }],
      [true, 0, { width: 5, height: 2 }],
      [true, 0, { width: 4, height: 3 }],
    ]);
    expect(run(state, { type: 'reset' })).toBe(initialAreaState);
  });

  it('is perfect only with no wrong checks', () => {
    const state = solve(solve(solve(initialAreaState, 3, 4), 1, 6), 3, 4);
    expect(areaResult(config, state)).toMatchObject({ completed: true, perfect: true, score: 1, correct: 3, mistakes: 0 });
  });

  it('reports partial progress before the end', () => {
    const state = solve(initialAreaState, 3, 4);
    expect(areaResult(config, state)).toMatchObject({ completed: false, perfect: false, score: 0, summary: 'Built 1 of 3 rectangles with 0 wrong tries' });
  });
});
