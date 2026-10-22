import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { FrictionExperimentConfig } from '../../domain/types';
import {
  challengeSolutions,
  comparison,
  createFrictionReducer,
  currentChallenge,
  initialFrictionState,
  isExperimentComplete,
  isFairComparison,
  isLabComplete,
  testedSurfaceIds,
  type FrictionGameState,
} from './frictionGame';
import { distanceBand, positionAt, simulateRun, speedAt, stoppingDistance, stoppingTime } from './simulation';

const config = getTopic('friction-rough-smooth')!.play.game as FrictionExperimentConfig;
const reduce = createFrictionReducer(config);

const run = (state: FrictionGameState, surfaceId: string, prediction: 'short' | 'medium' | 'far') =>
  [
    { type: 'select-surface', surfaceId },
    { type: 'predict', prediction },
    { type: 'start' },
    { type: 'finish-run' },
  ].reduce((s, a) => reduce(s, a as Parameters<typeof reduce>[1]), state);

describe('friction simulation model', () => {
  it('uses d = v0^2 / (2 * mu * g)', () => {
    expect(stoppingDistance(3, 0.1)).toBeCloseTo(4.592, 3);
    expect(stoppingDistance(3, 0.3)).toBeCloseTo(1.531, 3);
    expect(stoppingDistance(3, 0.6)).toBeCloseTo(0.765, 3);
  });

  it('more friction always means a shorter distance and a quicker stop', () => {
    expect(stoppingDistance(3, 0.6)).toBeLessThan(stoppingDistance(3, 0.3));
    expect(stoppingTime(3, 0.6)).toBeLessThan(stoppingTime(3, 0.3));
  });

  it('moves forward, slows down and stops exactly at the stopping distance', () => {
    const mu = 0.3;
    const t = stoppingTime(3, mu);
    expect(positionAt(0, 3, mu)).toBe(0);
    expect(positionAt(t / 2, 3, mu)).toBeGreaterThan(0);
    expect(positionAt(t / 2, 3, mu)).toBeLessThan(stoppingDistance(3, mu));
    expect(positionAt(t * 2, 3, mu)).toBeCloseTo(stoppingDistance(3, mu));
    expect(speedAt(t / 2, 3, mu)).toBeCloseTo(1.5);
    expect(speedAt(t * 2, 3, mu)).toBe(0);
  });

  it('classifies distances into the prediction bands', () => {
    expect(distanceBand(0.5, config.bands)).toBe('short');
    expect(distanceBand(1, config.bands)).toBe('medium');
    expect(distanceBand(2.5, config.bands)).toBe('far');
  });

  it('gives each sample surface a different band so comparisons are meaningful', () => {
    const bands = config.surfaces.map((s) => simulateRun(config, s.id)!.band);
    expect(bands).toEqual(['far', 'medium', 'short']);
    expect(simulateRun(config, 'lava')).toBeNull();
  });
});

describe('friction experiment state machine', () => {

  it('starts by asking for a surface', () => {
    expect(initialFrictionState.phase).toBe('choose-surface');
  });

  it('ignores Start until a surface and a prediction are chosen', () => {
    expect(reduce(initialFrictionState, { type: 'start' })).toBe(initialFrictionState);
    const chosen = reduce(initialFrictionState, { type: 'select-surface', surfaceId: 'grass' });
    expect(chosen.phase).toBe('predict');
    expect(reduce(chosen, { type: 'start' })).toBe(chosen);
  });

  it('ignores unknown surfaces and out-of-order actions', () => {
    expect(reduce(initialFrictionState, { type: 'select-surface', surfaceId: 'lava' })).toBe(initialFrictionState);
    expect(reduce(initialFrictionState, { type: 'finish-run' })).toBe(initialFrictionState);
    expect(reduce(initialFrictionState, { type: 'next-run' })).toBe(initialFrictionState);
  });

  it('runs a full predict -> test -> result cycle', () => {
    let s = reduce(initialFrictionState, { type: 'select-surface', surfaceId: 'grass' });
    s = reduce(s, { type: 'predict', prediction: 'far' });
    expect(s.phase).toBe('ready');
    s = reduce(s, { type: 'start' });
    expect(s.phase).toBe('running');
    expect(s.current).toMatchObject({ surfaceId: 'grass', band: 'medium', predictionCorrect: false, runNumber: 1 });
    // Selecting another surface mid-run is ignored.
    expect(reduce(s, { type: 'select-surface', surfaceId: 'wood' })).toBe(s);
    s = reduce(s, { type: 'finish-run' });
    expect(s.phase).toBe('result');
    expect(s.runs).toHaveLength(1);
    s = reduce(s, { type: 'next-run' });
    expect(s).toMatchObject({ phase: 'choose-surface', surfaceId: null, prediction: null, current: null });
    expect(s.runs).toHaveLength(1);
  });

  it('is complete after the minimum number of different surfaces', () => {
    let s = run(initialFrictionState, 'wood', 'far');
    s = reduce(s, { type: 'next-run' });
    s = run(s, 'wood', 'far');
    expect(isExperimentComplete(s, config)).toBe(false); // same surface twice
    s = reduce(s, { type: 'next-run' });
    s = run(s, 'gravel', 'short');
    expect(testedSurfaceIds(s)).toEqual(['wood', 'gravel']);
    expect(isExperimentComplete(s, config)).toBe(true);
    expect(comparison(s).map((r) => r.surfaceId)).toEqual(['wood', 'gravel']);
    expect(s.runs.every((r) => r.predictionCorrect)).toBe(true);
  });

  it('resets the notebook', () => {
    const s = run(initialFrictionState, 'wood', 'far');
    expect(reduce(s, { type: 'reset' })).toEqual(initialFrictionState);
  });
});

describe('ramp height (push strength)', () => {
  it('halves the distance for each step down the ramp (d is proportional to height)', () => {
    const top = simulateRun(config, 'wood', 'top')!;
    const middle = simulateRun(config, 'wood', 'middle')!;
    const low = simulateRun(config, 'wood', 'low')!;
    expect(middle.distance).toBeCloseTo(top.distance / 2, 6);
    expect(low.distance).toBeCloseTo(top.distance / 4, 6);
    expect(middle.launchSpeed).toBeCloseTo(3 * Math.sqrt(0.5), 6);
    expect([top.band, middle.band, low.band]).toEqual(['far', 'medium', 'medium']);
  });

  it('keeps the chosen height between runs and records it', () => {
    let s = reduce(initialFrictionState, { type: 'set-height', height: 'middle' });
    s = run(s, 'grass', 'short');
    expect(s.runs[0]).toMatchObject({ height: 'middle', band: 'short', predictionCorrect: true });
    s = reduce(s, { type: 'next-run' });
    expect(s.height).toBe('middle');
  });

  it('spots an unfair comparison when the push changed between surfaces', () => {
    let s = run(initialFrictionState, 'wood', 'far');
    s = reduce(reduce(s, { type: 'next-run' }), { type: 'set-height', height: 'low' });
    s = run(s, 'grass', 'short');
    expect(isFairComparison(comparison(s))).toBe(false);
    s = reduce(reduce(s, { type: 'next-run' }), { type: 'set-height', height: 'top' });
    s = run(s, 'grass', 'medium');
    expect(isFairComparison(comparison(s))).toBe(true);
  });
});

describe('Lab challenges', () => {
  const challenges = config.challenges!;
  const explored = () => {
    let s = run(initialFrictionState, 'wood', 'far');
    s = reduce(s, { type: 'next-run' });
    return reduce(run(s, 'gravel', 'short'), { type: 'next-run' });
  };
  const attempt = (s: FrictionGameState, surfaceId: string, height: 'low' | 'middle' | 'top') =>
    [{ type: 'select-surface', surfaceId }, { type: 'set-height', height }, { type: 'start' }, { type: 'finish-run' }].reduce(
      (st, a) => reduce(st, a as Parameters<typeof reduce>[1]),
      s,
    );

  it('go from easiest to hardest, and every one can be solved with the lab settings', () => {
    expect(challenges.map((c) => c.id)).toEqual(['roll-far', 'wood-medium', 'top-medium']);
    for (const c of challenges) expect(challengeSolutions(config, c).length, c.id).toBeGreaterThan(0);
    // The later challenges change only one thing.
    expect(challenges[1].surfaceId).toBe('wood');
    expect(challenges[2].height).toBe('top');
  });

  it('open only after enough surfaces are tested', () => {
    expect(reduce(initialFrictionState, { type: 'start-challenges' })).toBe(initialFrictionState);
    const s = reduce(explored(), { type: 'start-challenges' });
    expect(s.mode).toBe('challenge');
    expect(currentChallenge(s, config)?.id).toBe('roll-far');
  });

  it('lock the fixed setting, allow retries and finish the lab', () => {
    let s = reduce(explored(), { type: 'start-challenges' });
    // 1. Free choice: gravel cannot roll far; wood from the top can.
    s = attempt(s, 'gravel', 'top');
    expect(s).toMatchObject({ phase: 'result', attempts: 1, solved: [] });
    s = reduce(s, { type: 'next-run' }); // try again keeps the challenge
    expect(currentChallenge(s, config)?.id).toBe('roll-far');
    s = attempt(s, 'wood', 'top');
    expect(s.solved).toEqual(['roll-far']);
    expect(s.solvedFirstTry).toEqual([]);

    // 2. Surface fixed to wood: other surfaces are ignored, a lower start works.
    s = reduce(s, { type: 'next-run' });
    expect(s).toMatchObject({ surfaceId: 'wood', phase: 'ready' });
    expect(reduce(s, { type: 'select-surface', surfaceId: 'grass' })).toBe(s);
    s = attempt(s, 'wood', 'middle');
    expect(s.solvedFirstTry).toEqual(['wood-medium']);

    // 3. Height fixed to top: changing the height is ignored, grass works.
    s = reduce(s, { type: 'next-run' });
    expect(s.height).toBe('top');
    expect(reduce(s, { type: 'set-height', height: 'low' })).toBe(s);
    s = attempt(s, 'grass', 'top');
    // The challenges are done, but the lab also needs the final concept question.
    expect(isLabComplete(s, config)).toBe(false);
    s = reduce(s, { type: 'next-run' });
    expect(s.mode).toBe('done');
    s = reduce(s, { type: 'answer-check', optionId: 'heavier' });
    expect(s).toMatchObject({ checkAttempts: 1, checkCorrect: false });
    expect(isLabComplete(s, config)).toBe(false);
    s = reduce(s, { type: 'answer-check', optionId: 'less-friction' });
    expect(s).toMatchObject({ checkAttempts: 2, checkCorrect: true });
    expect(isLabComplete(s, config)).toBe(true);
    // Answers after the right one are ignored.
    expect(reduce(s, { type: 'answer-check', optionId: 'heavier' })).toBe(s);
  });

  it('only accepts the concept question after every challenge', () => {
    expect(reduce(explored(), { type: 'answer-check', optionId: 'less-friction' }).checkCorrect).toBe(false);
  });
});
