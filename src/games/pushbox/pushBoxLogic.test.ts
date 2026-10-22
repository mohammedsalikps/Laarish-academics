import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { PushBoxConfig } from '../../domain/types';
import {
  STEPS_PER_LEVEL,
  createPushBoxReducer,
  firstSentence,
  foundSmallestPush,
  frictionPushBack,
  initialPushBoxState,
  isPushBoxComplete,
  maxSlideSteps,
  nextFloorId,
  pushAnimationMs,
  pushBoxResult,
  pushesToComplete,
  pushHint,
  pushLevelAt,
  pushLevelFraction,
  pushOutcome,
  snapPushLevel,
  stuckStreak,
  type PushBoxAction,
  type PushBoxState,
} from './pushBoxLogic';

const config = getTopic('friction-what-is')!.play.game as PushBoxConfig;
const reduce = createPushBoxReducer(config);
const run = (state: PushBoxState, ...actions: PushBoxAction[]) => actions.reduce(reduce, state);
const push = (floorId: string, strength: number): PushBoxAction[] => [
  { type: 'select-floor', floorId },
  { type: 'set-push', push: strength },
  { type: 'push' },
  { type: 'finish' },
];

describe('push the box model', () => {
  it('moves the box only when the push is stronger than the floor grip', () => {
    for (const floor of config.floors) {
      expect(pushOutcome(config, floor.id, floor.grip)?.moved).toBe(false);
      expect(pushOutcome(config, floor.id, floor.grip + 1)).toMatchObject({ moved: true, distance: STEPS_PER_LEVEL });
    }
  });

  it('slides further on low-grip floors for the same push', () => {
    const strong = config.pushLabels.length;
    const distances = [...config.floors].sort((a, b) => b.grip - a.grip).map((f) => pushOutcome(config, f.id, strong)!.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(new Set(distances).size).toBe(distances.length);
  });

  it('rejects unknown floors and out-of-range pushes', () => {
    expect(pushOutcome(config, 'lava', 3)).toBeNull();
    expect(pushOutcome(config, config.floors[0].id, 0)).toBeNull();
    expect(pushOutcome(config, config.floors[0].id, config.pushLabels.length + 1)).toBeNull();
  });
});

describe('push the box game flow', () => {
  it('needs a floor before pushing, and records each push', () => {
    expect(run(initialPushBoxState, { type: 'push' })).toBe(initialPushBoxState);
    const s = run(initialPushBoxState, ...push(config.floors[0].id, 1));
    expect(s.phase).toBe('result');
    expect(s.history).toHaveLength(1);
  });

  it('completes after moving the box on every floor, scoring exact friction limits', () => {
    const exact = config.floors.reduce((s, f) => run(s, ...push(f.id, f.grip + 1)), initialPushBoxState);
    expect(isPushBoxComplete(exact, config)).toBe(true);
    expect(pushBoxResult(exact, config)).toMatchObject({ completed: true, score: 1, perfect: true, gameType: 'push-box' });

    const strongest = config.pushLabels.length;
    const brute = config.floors.reduce((s, f) => run(s, ...push(f.id, strongest)), initialPushBoxState);
    const result = pushBoxResult(brute, config);
    expect(result.completed).toBe(true);
    expect(result.score).toBeLessThan(1);
  });

  it('is not complete while a floor has not moved', () => {
    const s = run(initialPushBoxState, ...push(config.floors[0].id, config.pushLabels.length));
    expect(isPushBoxComplete(s, config)).toBe(false);
    expect(pushBoxResult(s, config).completed).toBe(false);
  });

  it('ignores pushes and floor changes while the box is moving', () => {
    const pushing = run(initialPushBoxState, { type: 'select-floor', floorId: config.floors[0].id }, { type: 'push' });
    expect(pushing.phase).toBe('pushing');
    expect(run(pushing, { type: 'set-push', push: 3 })).toBe(pushing);
    expect(run(pushing, { type: 'select-floor', floorId: config.floors[1].id })).toBe(pushing);
    expect(run(pushing, { type: 'push' })).toBe(pushing);
  });

  it('starts a fresh try when the push changes after a result', () => {
    const s = run(initialPushBoxState, ...push(config.floors[0].id, 1), { type: 'set-push', push: 2 });
    expect(s).toMatchObject({ phase: 'ready', last: null, push: 2 });
    expect(s.history).toHaveLength(1);
  });
});

describe('push the box forces', () => {
  it('friction pushes back as hard as the push, up to the grip', () => {
    expect(frictionPushBack(1, 3)).toBe(1);
    expect(frictionPushBack(3, 3)).toBe(3);
    expect(frictionPushBack(5, 3)).toBe(3);
    expect(frictionPushBack(2, 0)).toBe(0);
  });

  it('sizes the ruler for the longest possible slide', () => {
    const levels = config.pushLabels.length;
    const minGrip = Math.min(...config.floors.map((f) => f.grip));
    expect(maxSlideSteps(config)).toBe((levels - minGrip) * STEPS_PER_LEVEL);
    for (const f of config.floors) expect(pushOutcome(config, f.id, levels)!.distance).toBeLessThanOrEqual(maxSlideSteps(config));
  });

  it('animates longer slides for longer, and barely at all with reduced motion', () => {
    const short = pushOutcome(config, 'wood', 3)!;
    const long = pushOutcome(config, 'ice', 5)!;
    expect(pushAnimationMs(long, false)).toBeGreaterThan(pushAnimationMs(short, false));
    expect(pushAnimationMs(long, true)).toBeLessThanOrEqual(150);
    expect(pushAnimationMs(pushOutcome(config, 'carpet', 1)!, true)).toBeLessThanOrEqual(150);
  });
});

describe('push the box dragging', () => {
  it('snaps a continuous push to the nearest whole level, clamped to the range', () => {
    expect(snapPushLevel(2.4, 5)).toBe(2);
    expect(snapPushLevel(2.6, 5)).toBe(3);
    expect(snapPushLevel(-3, 5)).toBe(1);
    expect(snapPushLevel(9, 5)).toBe(5);
    expect(snapPushLevel(Number.NaN, 5)).toBe(1);
  });

  it('maps a position along the drag track to a push level and back', () => {
    expect(pushLevelAt(0, 5)).toBe(1);
    expect(pushLevelAt(1, 5)).toBe(5);
    expect(pushLevelAt(0.5, 5)).toBe(3);
    expect(pushLevelAt(0.12, 5)).toBe(1);
    expect(pushLevelAt(0.13, 5)).toBe(2);
    expect(pushLevelAt(-0.4, 5)).toBe(1);
    expect(pushLevelAt(1.7, 5)).toBe(5);
    for (let level = 1; level <= 5; level++) expect(pushLevelAt(pushLevelFraction(level, 5), 5)).toBe(level);
    expect(pushLevelFraction(1, 1)).toBe(0);
  });
});

describe('push the box hints', () => {
  const carpet = config.floors.find((f) => f.id === 'carpet')!;
  const stuckTwice = run(initialPushBoxState, ...push('carpet', 1), ...push('carpet', 2));

  it('counts the pushes in a row that did not move the box on a floor', () => {
    expect(stuckStreak(stuckTwice, 'carpet').map((h) => h.push)).toEqual([1, 2]);
    // Other floors do not break the streak; a move does.
    const mixed = run(stuckTwice, ...push('ice', 1), ...push('carpet', 1));
    expect(stuckStreak(mixed, 'carpet')).toHaveLength(3);
    expect(stuckStreak(run(mixed, ...push('carpet', carpet.grip + 1)), 'carpet')).toHaveLength(0);
  });

  it('gives no hint for one stuck push, a nudge after two, then a concrete push to try', () => {
    expect(pushHint(run(initialPushBoxState, ...push('carpet', 1)), config, 'carpet')).toBeNull();
    expect(pushHint(stuckTwice, config, 'carpet')).toMatch(/bigger than small/i);
    // Suggests one size above the biggest push tried so far (here medium, the carpet's grip, so "big").
    const third = run(stuckTwice, ...push('carpet', carpet.grip));
    expect(pushHint(third, config, 'carpet')).toMatch(/try the big push/i);
  });

  it('keeps hints to one short sentence', () => {
    const third = run(stuckTwice, ...push('carpet', carpet.grip));
    for (const hint of [pushHint(stuckTwice, config, 'carpet')!, pushHint(third, config, 'carpet')!]) {
      expect(hint.match(/[.!?]/g)).toHaveLength(1);
    }
  });

  it('marks the bonus once the smallest moving push is found', () => {
    const tooBig = run(initialPushBoxState, ...push('wood', 5));
    expect(foundSmallestPush(tooBig, config, 'wood')).toBe(false);
    expect(foundSmallestPush(run(tooBig, ...push('wood', 3)), config, 'wood')).toBe(true);
    expect(foundSmallestPush(tooBig, config, 'lava')).toBe(false);
  });
});

describe('push the box feedback', () => {
  it('shortens a floor explanation to its first sentence', () => {
    expect(firstSentence('Carpet is rough, so friction can push back hard. You needed a big push to beat it.')).toBe('Carpet is rough, so friction can push back hard.');
    expect(firstSentence('  Wow! It slid.  ')).toBe('Wow!');
    expect(firstSentence('No full stop')).toBe('No full stop');
    for (const f of config.floors) expect(f.explanation.startsWith(firstSentence(f.explanation))).toBe(true);
  });

  it('suggests the next floor where the box has not moved yet, wrapping round', () => {
    const [a, b, c] = config.floors.map((f) => f.id);
    expect(nextFloorId(initialPushBoxState, config)).toBe(a);
    const movedA = run(initialPushBoxState, ...push(a, config.pushLabels.length));
    expect(nextFloorId(movedA, config)).toBe(b);
    // Skips floors that have already moved.
    const movedAC = run(initialPushBoxState, ...push(c, config.pushLabels.length), ...push(a, config.pushLabels.length));
    expect(nextFloorId(movedAC, config)).toBe(b);
    const movedCB = run(initialPushBoxState, ...push(b, config.pushLabels.length), ...push(c, config.pushLabels.length));
    expect(nextFloorId(movedCB, config)).toBe(a);
    // Once every floor has moved, it simply goes round to the next floor.
    const all = run(movedA, ...push(b, config.pushLabels.length), ...push(c, config.pushLabels.length));
    expect(nextFloorId(all, config)).toBe(a);
  });

  it('remembers which push finished the activity', () => {
    const strongest = config.pushLabels.length;
    const stuckFirst = run(initialPushBoxState, ...push('carpet', 1));
    expect(pushesToComplete(stuckFirst, config)).toBe(0);
    const done = config.floors.reduce((s, f) => run(s, ...push(f.id, strongest)), stuckFirst);
    expect(pushesToComplete(done, config)).toBe(config.floors.length + 1);
    // Pushing on afterwards does not change it.
    expect(pushesToComplete(run(done, ...push('ice', 1)), config)).toBe(config.floors.length + 1);
  });
});
