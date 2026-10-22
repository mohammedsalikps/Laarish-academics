import { describe, expect, it } from 'vitest';
import {
  barChartResult,
  buildNudge,
  canCheck,
  createBarChartReducer,
  firstWrongBar,
  initialBarChartState,
  isBuildRight,
  isReadRight,
  readNudge,
  roundHint,
  roundOutcomes,
  snapToStep,
  tickLabelEvery,
  ticks,
  topValue,
  valueAt,
  type BarChartAction,
  type BarChartState,
  type BarRound,
} from './barChartLogic';
import { barChartTestConfig as config } from './barChartTestConfig';

const reduce = createBarChartReducer(config);
const run = (state: BarChartState, ...actions: BarChartAction[]) => actions.reduce(reduce, state);
const start = initialBarChartState(config);
const [fruit, weather, pets, visitors] = config.rounds;

/** The moves that solve a round first time. */
const solveActions = (round: BarRound): BarChartAction[] =>
  round.mode === 'build' ? [...round.values.map((value, index) => ({ type: 'set' as const, index, value })), { type: 'check' }, { type: 'next' }] : [{ type: 'choose', id: round.answerId! }, { type: 'check' }, { type: 'next' }];

describe('bar chart scale', () => {
  it('snaps a value to the nearest step and keeps it on the scale', () => {
    expect(snapToStep(3.7, 2, 10)).toBe(4);
    expect(snapToStep(2.9, 2, 10)).toBe(2);
    expect(snapToStep(2.9, 1, 10)).toBe(3);
    expect(snapToStep(-3, 2, 10)).toBe(0);
    expect(snapToStep(14, 2, 10)).toBe(10);
    expect(snapToStep(Number.NaN, 2, 10)).toBe(0);
    expect(snapToStep(1.26, 0.5, 5)).toBe(1.5);
    expect(snapToStep(0.1 + 0.2, 0.1, 1)).toBe(0.3);
    // A max that is not a whole number of steps stops at the last step.
    expect(topValue(2, 11)).toBe(10);
    expect(snapToStep(11, 2, 11)).toBe(10);
  });

  it('turns a pointer height into a snapped bar value', () => {
    expect(valueAt(0, 2, 10)).toBe(0);
    expect(valueAt(0.37, 2, 10)).toBe(4);
    expect(valueAt(0.6, 2, 10)).toBe(6);
    expect(valueAt(1.3, 2, 10)).toBe(10);
    expect(valueAt(-0.2, 2, 10)).toBe(0);
  });

  it('draws a gridline at every step and labels a long scale more sparsely', () => {
    expect(ticks(2, 10)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(ticks(5, 20)).toEqual([0, 5, 10, 15, 20]);
    expect(tickLabelEvery(2, 10)).toBe(1);
    expect(tickLabelEvery(1, 10)).toBe(1);
    expect(tickLabelEvery(1, 20)).toBe(2);
  });
});

describe('checking a chart', () => {
  it('a build round is right only when every bar matches the table', () => {
    expect(isBuildRight(fruit, [6, 4, 2])).toBe(true);
    expect(isBuildRight(fruit, [6, 4, 0])).toBe(false);
    expect(isBuildRight(fruit, [0, 0, 0])).toBe(false);
    expect(firstWrongBar(fruit, [6, 2, 0])).toBe(1);
    expect(firstWrongBar(fruit, [6, 4, 2])).toBeNull();
    // A category whose value is 0 is already right while its bar is on the baseline.
    expect(firstWrongBar(pets, [2, 4, 0, 6, 2, 10])).toBeNull();
  });

  it('a read round is right only for the answer', () => {
    expect(isReadRight(weather, 'rain')).toBe(true);
    expect(isReadRight(weather, 'sun')).toBe(false);
    expect(isReadRight(weather, null)).toBe(false);
    expect(isReadRight({ ...weather, answerId: undefined }, 'rain')).toBe(false);
  });
});

describe('hints', () => {
  it('build: names the first wrong bar, from the data', () => {
    expect(buildNudge(fruit, [6, 2, 0])).toBe('The bar for Apple is 2, but the table says 4.');
    expect(buildNudge(fruit, [0, 4, 2])).toBe('The bar for Mango is 0, but the table says 6.');
    expect(buildNudge(fruit, [6, 4, 2])).toBeNull();
  });

  it('read: says what the chosen bar shows, and points at the tallest or shortest bar only when the question asks for it', () => {
    expect(readNudge(weather, 'sun')).toBe('The bar for Sun reaches 4. Look again: which bar is the tallest?');
    const fewest: BarRound = { ...weather, prompt: 'Which weather did we see the fewest times?', answerId: 'wind' };
    expect(readNudge(fewest, 'sun')).toBe('The bar for Sun reaches 4. Look again: which bar is the shortest?');
    // A question about a value, not the tallest bar, gets the neutral line.
    expect(readNudge(visitors, 'wed')).toBe('The bar for Wednesday reaches 10. Compare the bar heights carefully.');
    // "More" is not "most": no tallest-bar nudge for a comparison question.
    const comparison: BarRound = { ...weather, prompt: 'Which had 4 more days than Sun?', answerId: 'rain' };
    expect(readNudge(comparison, 'wind')).toBe('The bar for Wind reaches 2. Compare the bar heights carefully.');
    // A tie for the tallest bar cannot be "the tallest".
    const tie: BarRound = { ...weather, values: [8, 8, 2] };
    expect(readNudge(tie, 'wind')).toBe('The bar for Wind reaches 2. Compare the bar heights carefully.');
  });

  it('gives a data nudge after the first wrong check, then the round hint', () => {
    expect(roundHint(fruit, { bars: [6, 2, 0], chosen: null }, 0)).toBeNull();
    expect(roundHint(fruit, { bars: [6, 2, 0], chosen: null }, 1)).toEqual({ level: 1, text: 'The bar for Apple is 2, but the table says 4.' });
    expect(roundHint(fruit, { bars: [6, 2, 0], chosen: null }, 2)).toEqual({ level: 2, text: fruit.hint });
    expect(roundHint(fruit, { bars: [6, 4, 2], chosen: null }, 1)).toBeNull();
    expect(roundHint(weather, { bars: [], chosen: 'sun' }, 1)?.level).toBe(1);
    expect(roundHint(weather, { bars: [], chosen: 'sun' }, 3)).toEqual({ level: 2, text: weather.hint });
  });
});

describe('bar chart game flow', () => {
  it('starts every bar at 0 and needs a move (build) or a choice (read) before Check', () => {
    expect(start.bars).toEqual([0, 0, 0]);
    expect(canCheck(fruit, start)).toBe(false);
    expect(run(start, { type: 'check' })).toBe(start);
    const moved = run(start, { type: 'step', index: 0, steps: 1 });
    expect(moved.bars).toEqual([2, 0, 0]);
    expect(canCheck(fruit, moved)).toBe(true);
  });

  it('snaps and clamps bar moves, and ignores moves that do not fit the round', () => {
    expect(run(start, { type: 'set', index: 1, value: 3.2 }).bars).toEqual([0, 4, 0]);
    expect(run(start, { type: 'set', index: 2, value: 99 }).bars).toEqual([0, 0, 10]);
    expect(run(start, { type: 'step', index: 0, steps: -1 })).toBe(start);
    expect(run(start, { type: 'set', index: 7, value: 4 })).toBe(start);
    expect(run(start, { type: 'choose', id: 'mango' })).toBe(start); // no choosing in a build round
  });

  it('counts a wrong check, waits for a change, then accepts the fix', () => {
    const wrong = run(start, { type: 'set', index: 0, value: 6 }, { type: 'set', index: 1, value: 2 }, { type: 'check' });
    expect(wrong.phase).toBe('incorrect');
    expect(wrong.mistakes).toBe(1);
    expect(wrong.checked).toEqual({ bars: [6, 2, 0], chosen: null });
    expect(run(wrong, { type: 'check' })).toBe(wrong);
    const fixed = run(wrong, { type: 'set', index: 1, value: 4 }, { type: 'set', index: 2, value: 2 }, { type: 'check' });
    expect(fixed.phase).toBe('correct');
    expect(fixed.mistakes).toBe(1);
    // Bars are locked once the round is right.
    expect(run(fixed, { type: 'set', index: 0, value: 0 })).toBe(fixed);
  });

  it('read rounds: choose a bar, and only real categories count', () => {
    const atRead = run(start, ...solveActions(fruit));
    expect(atRead.round).toBe(1);
    expect(atRead.bars).toEqual([0, 0, 0]);
    expect(run(atRead, { type: 'choose', id: 'snow' })).toBe(atRead);
    expect(run(atRead, { type: 'set', index: 0, value: 4 })).toBe(atRead); // no bar moving in a read round
    const wrong = run(atRead, { type: 'choose', id: 'sun' }, { type: 'check' });
    expect(wrong.phase).toBe('incorrect');
    const right = run(wrong, { type: 'choose', id: 'rain' }, { type: 'check' });
    expect(right.phase).toBe('correct');
  });

  it('completes all rounds with a perfect score when each round is right first time', () => {
    const done = run(start, ...config.rounds.flatMap(solveActions));
    expect(done.phase).toBe('complete');
    expect(barChartResult(config, done)).toEqual({
      gameType: 'bar-chart',
      score: 1,
      correct: 4,
      total: 4,
      mistakes: 0,
      completed: true,
      perfect: true,
      summary: 'Finished 4 of 4 chart tasks with 0 mistakes',
    });
    expect(roundOutcomes(config, done).every((o) => o.firstTry)).toBe(true);
  });

  it('lowers the score for rounds with mistakes and is not complete until the end', () => {
    let s = run(start, { type: 'set', index: 0, value: 2 }, { type: 'check' }, { type: 'set', index: 0, value: 4 }, { type: 'check' });
    expect(barChartResult(config, s)).toMatchObject({ completed: false, perfect: false, score: 0 });
    s = run(s, ...solveActions(fruit), ...config.rounds.slice(1).flatMap(solveActions));
    const result = barChartResult(config, s);
    expect(result).toMatchObject({ completed: true, perfect: false, mistakes: 2, correct: 3, total: 4 });
    expect(result.score).toBeCloseTo(3 / 4);
    expect(roundOutcomes(config, s)[0]).toMatchObject({ id: 'fruit-build', mode: 'build', firstTry: false, wrong: 2 });
    expect(run(s, { type: 'reset' })).toEqual(start);
  });
});
