import { describe, expect, it } from 'vitest';
import type { NumberLineConfig } from '../../domain/types';
import {
  createNumberLineReducer,
  formatJump,
  formatTick,
  formatValue,
  indexOf,
  initialNumberLineState,
  keyIndex,
  labelStride,
  labelWidth,
  LINE_X0,
  LINE_X1,
  MAX_LABELS,
  MINUS,
  nearestIndex,
  nudge,
  numberLineHint,
  numberLineResult,
  roundOutcomes,
  startIndex,
  targetIndex,
  tickCount,
  tickX,
  valueAt,
  type NumberLineAction,
  type NumberLineRound,
  type NumberLineState,
} from './numberLineLogic';

const base = { prompt: 'Find it.', hint: 'Count the steps.', explanation: 'Well found.' };
const integer: NumberLineRound = { ...base, id: 'seven', from: 0, to: 10, step: 1, mode: 'place', target: 7 };
const negative: NumberLineRound = { ...base, id: 'cold', from: -10, to: 10, step: 1, mode: 'place', target: -3 };
const tenths: NumberLineRound = { ...base, id: 'tenths', from: 0, to: 1, step: 0.1, format: { kind: 'decimal', places: 1 }, mode: 'place', target: 0.7 };
const quarters: NumberLineRound = { ...base, id: 'quarters', from: 0, to: 2, step: 0.25, format: { kind: 'fraction', denominator: 4 }, mode: 'place', target: 0.75 };
const jumpForward: NumberLineRound = { ...base, id: 'add', from: 0, to: 10, step: 1, mode: 'jump', start: 3, target: 7, prompt: 'Start at 3 and jump 4 forward.' };
const jumpBack: NumberLineRound = { ...base, id: 'sub', from: -5, to: 5, step: 1, mode: 'jump', start: 2, target: -1, prompt: 'Start at 2 and jump 3 back.' };

const config: NumberLineConfig = { type: 'number-line', rounds: [integer, jumpForward, tenths, quarters] };
const reduce = createNumberLineReducer(config);
const run = (state: NumberLineState, ...actions: NumberLineAction[]) => actions.reduce(reduce, state);
const solve = (state: NumberLineState, round: NumberLineRound): NumberLineState => run(state, { type: 'choose', index: targetIndex(round) }, { type: 'check' }, { type: 'next' });

describe('number line index maths', () => {
  it('counts ticks and maps whole numbers to tick indexes', () => {
    expect(tickCount(integer)).toBe(11);
    expect(targetIndex(integer)).toBe(7);
    expect(valueAt(integer, 7)).toBe(7);
    expect(formatTick(integer, 7)).toBe('7');
  });

  it('handles negative numbers, with a proper minus sign', () => {
    expect(tickCount(negative)).toBe(21);
    expect(indexOf(negative, -10)).toBe(0);
    expect(targetIndex(negative)).toBe(7);
    expect(valueAt(negative, 7)).toBe(-3);
    expect(formatTick(negative, 7)).toBe(`${MINUS}3`);
    expect(formatTick(negative, 10)).toBe('0');
  });

  it('works in whole tick indexes for decimals, so 0.1 steps never drift', () => {
    expect(tickCount(tenths)).toBe(11);
    expect(targetIndex(tenths)).toBe(7);
    // 0.1 * 7 is 0.7000000000000001 in floating point; the index still lands on the tick.
    expect(0.1 * 7).not.toBe(0.7);
    expect(valueAt(tenths, 7)).toBe(0.7);
    expect(indexOf(tenths, 0.1 * 7)).toBe(7);
    expect(indexOf(tenths, 0.3)).toBe(3);
    expect(formatTick(tenths, 7)).toBe('0.7');
    expect(formatTick(tenths, 0)).toBe('0.0');
    expect(formatTick(tenths, 10)).toBe('1.0');
  });

  it('handles fraction lines, writing k/denominator without simplifying', () => {
    expect(tickCount(quarters)).toBe(9);
    expect(targetIndex(quarters)).toBe(3);
    expect([0, 1, 2, 3, 4, 5, 8].map((i) => formatTick(quarters, i))).toEqual(['0', '1/4', '2/4', '3/4', '1', '5/4', '2']);
    const thirds: NumberLineRound = { ...quarters, step: 1 / 3, target: 2 / 3, format: { kind: 'fraction', denominator: 3 } };
    expect(targetIndex(thirds)).toBe(2);
    expect(formatTick(thirds, 2)).toBe('2/3');
    expect(formatTick(thirds, 3)).toBe('1');
    expect(formatValue(-0.25, { kind: 'fraction', denominator: 4 })).toBe(`${MINUS}1/4`);
  });

  it('writes jump sizes with a sign', () => {
    expect(formatJump(jumpForward, 3, 7)).toBe('+4');
    expect(formatJump(jumpBack, startIndex(jumpBack)!, targetIndex(jumpBack))).toBe(`${MINUS}3`);
    expect(formatJump(tenths, 2, 5)).toBe('+0.3');
    expect(formatJump(quarters, 1, 0)).toBe(`${MINUS}1/4`);
    expect(formatJump(integer, 4, 4)).toBe('');
  });

  it('snaps an x position to the nearest tick and keeps it on the line', () => {
    expect(nearestIndex(integer, tickX(integer, 7))).toBe(7);
    expect(nearestIndex(integer, tickX(integer, 7) + 10)).toBe(7);
    expect(nearestIndex(integer, tickX(integer, 7) + 20)).toBe(8);
    expect(nearestIndex(integer, -50)).toBe(0);
    expect(nearestIndex(integer, 999)).toBe(10);
    expect(tickX(integer, 0)).toBe(LINE_X0);
    expect(tickX(integer, 10)).toBe(LINE_X1);
  });

  it('labels fewer ticks when labels would crowd a phone-width line', () => {
    expect(labelStride(integer)).toBe(1);
    expect(labelStride({ ...integer, labelEvery: 2 })).toBe(2);
    expect(labelStride(tenths)).toBe(1);
    // 0..20 has 21 ticks: every other one is labelled (11 labels).
    expect(labelStride({ ...integer, to: 20 })).toBe(2);
    // -10..10 with wide "−10" labels: every fifth tick, which also labels both ends.
    expect(labelStride(negative)).toBe(5);
    for (const round of [integer, negative, tenths, quarters, { ...integer, to: 100 }, { ...tenths, step: 0.05, format: { kind: 'decimal', places: 2 } } as NumberLineRound]) {
      const stride = labelStride(round);
      const last = tickCount(round) - 1;
      expect(Math.floor(last / stride) + 1).toBeLessThanOrEqual(MAX_LABELS);
      let widest = 0;
      for (let i = 0; i <= last; i += 1) widest = Math.max(widest, labelWidth(formatTick(round, i)));
      expect(tickX(round, stride) - tickX(round, 0)).toBeGreaterThan(widest);
    }
  });

  it('moves one tick per arrow key, and starts a jump from its start point', () => {
    expect(keyIndex(integer, null, 'ArrowRight')).toBe(0);
    expect(keyIndex(integer, null, 'ArrowLeft')).toBe(10);
    expect(keyIndex(integer, 4, 'ArrowRight')).toBe(5);
    expect(keyIndex(integer, 4, 'ArrowLeft')).toBe(3);
    expect(keyIndex(integer, 10, 'ArrowRight')).toBe(10);
    expect(keyIndex(integer, 0, 'ArrowLeft')).toBe(0);
    expect(keyIndex(integer, 4, 'Home')).toBe(0);
    expect(keyIndex(integer, 4, 'End')).toBe(10);
    expect(keyIndex(integer, 4, 'a')).toBeNull();
    expect(keyIndex(jumpForward, null, 'ArrowRight')).toBe(4);
    expect(keyIndex(jumpForward, null, 'ArrowLeft')).toBe(2);
  });
});

describe('number line hints', () => {
  it('nudges left or right in place rounds', () => {
    expect(nudge(integer, 9)).toBe('Too far right. Move left.');
    expect(nudge(integer, 2)).toBe('Too far left. Move right.');
    expect(nudge(integer, 7)).toBeNull();
    expect(nudge(tenths, 8)).toBe('Too far right. Move left.');
  });

  it('talks about the jump in jump rounds', () => {
    expect(nudge(jumpForward, 9)).toBe('You jumped too far.');
    expect(nudge(jumpForward, 5)).toBe('You did not jump far enough.');
    expect(nudge(jumpForward, 1)).toBe('Wrong way. Jump forward.');
    expect(nudge(jumpForward, 3)).toBe('You have not jumped yet. Jump forward.');
    const at = (v: number) => indexOf(jumpBack, v);
    expect(nudge(jumpBack, at(-3))).toBe('You jumped too far.');
    expect(nudge(jumpBack, at(0))).toBe('You did not jump far enough.');
    expect(nudge(jumpBack, at(4))).toBe('Wrong way. Jump back.');
  });

  it('gives the nudge after the first wrong check, then the round hint', () => {
    expect(numberLineHint(integer, null, 0)).toBeNull();
    expect(numberLineHint(integer, 9, 1)).toEqual({ level: 1, text: 'Too far right. Move left.' });
    expect(numberLineHint(integer, 2, 2)).toEqual({ level: 2, text: integer.hint });
  });
});

describe('number line game flow', () => {
  it('needs a point before checking, and ignores points off the line', () => {
    expect(run(initialNumberLineState, { type: 'check' })).toBe(initialNumberLineState);
    expect(run(initialNumberLineState, { type: 'choose', index: 11 })).toBe(initialNumberLineState);
    expect(run(initialNumberLineState, { type: 'choose', index: -1 })).toBe(initialNumberLineState);
    expect(run(initialNumberLineState, { type: 'choose', index: 1.5 })).toBe(initialNumberLineState);
  });

  it('applies slider keys to the latest marker position, so quick presses all count', () => {
    const twice = run(initialNumberLineState, { type: 'choose', index: 4 }, { type: 'key', key: 'ArrowRight' }, { type: 'key', key: 'ArrowRight' });
    expect(twice.chosen).toBe(6);
    expect(run(twice, { type: 'key', key: 'End' }, { type: 'key', key: 'ArrowRight' }).chosen).toBe(10);
    expect(run(twice, { type: 'key', key: 'Tab' })).toBe(twice);
    const jumping = run({ ...initialNumberLineState, round: 1 }, { type: 'key', key: 'ArrowRight' }, { type: 'key', key: 'ArrowRight' });
    expect(jumping.chosen).toBe(5); // from the start flag at 3
    const locked = run(initialNumberLineState, { type: 'choose', index: 7 }, { type: 'check' });
    expect(run(locked, { type: 'key', key: 'ArrowLeft' })).toBe(locked);
  });

  it('counts a wrong check as a mistake, and needs a move before checking again', () => {
    const wrong = run(initialNumberLineState, { type: 'choose', index: 9 }, { type: 'check' });
    expect(wrong).toMatchObject({ phase: 'incorrect', mistakes: 1, lastWrong: 9, mistakesByRound: { seven: 1 } });
    expect(run(wrong, { type: 'check' })).toBe(wrong);
    expect(run(wrong, { type: 'choose', index: 9 })).toBe(wrong);
    const moved = run(wrong, { type: 'choose', index: 7 });
    expect(moved.phase).toBe('playing');
    const fixed = run(moved, { type: 'check' });
    expect(fixed).toMatchObject({ phase: 'correct', lastWrong: null, mistakes: 1 });
    // The marker is locked once the round is right.
    expect(run(fixed, { type: 'choose', index: 3 })).toBe(fixed);
    const next = run(fixed, { type: 'next' });
    expect(next).toMatchObject({ round: 1, chosen: null, phase: 'playing' });
  });

  it('checks decimal and fraction rounds by tick index', () => {
    const atTenths = run({ ...initialNumberLineState, round: 2 }, { type: 'choose', index: 7 }, { type: 'check' });
    expect(atTenths.phase).toBe('correct');
    const atQuarters = run({ ...initialNumberLineState, round: 3 }, { type: 'choose', index: 3 }, { type: 'check' });
    expect(atQuarters.phase).toBe('correct');
    const offQuarters = run({ ...initialNumberLineState, round: 3 }, { type: 'choose', index: 6 }, { type: 'check' });
    expect(offQuarters.phase).toBe('incorrect');
  });

  it('completes all rounds with a perfect score when each point is right first time', () => {
    const done = config.rounds.reduce(solve, initialNumberLineState);
    expect(done.phase).toBe('complete');
    expect(numberLineResult(config, done)).toMatchObject({ gameType: 'number-line', completed: true, score: 1, correct: 4, total: 4, mistakes: 0, perfect: true });
    expect(run(done, { type: 'next' })).toBe(done);
  });

  it('lowers the score for rounds with mistakes, and lists each round', () => {
    const [first, ...rest] = config.rounds;
    let s = run(initialNumberLineState, { type: 'choose', index: 2 }, { type: 'check' }, { type: 'choose', index: 9 }, { type: 'check' });
    s = solve(s, first);
    s = rest.reduce(solve, s);
    const result = numberLineResult(config, s);
    expect(result).toMatchObject({ completed: true, perfect: false, mistakes: 2, correct: 3, total: 4 });
    expect(result.score).toBeCloseTo(3 / 4);
    expect(result.summary).toBe('Found 4 of 4 points on the number line with 2 mistakes');
    expect(roundOutcomes(config, s).map((o) => [o.answer, o.firstTry, o.wrong])).toEqual([
      ['7', false, 2],
      ['7', true, 0],
      ['0.7', true, 0],
      ['3/4', true, 0],
    ]);
  });

  it('reports an unfinished game as not completed', () => {
    const result = numberLineResult(config, solve(initialNumberLineState, integer));
    expect(result).toMatchObject({ completed: false, perfect: false, score: 0, correct: 0 });
  });
});
