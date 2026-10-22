import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import { MAGNET_PULLS, type MagnetLabConfig } from '../../domain/types';
import {
  FIXED_FACING,
  createMagnetReducer,
  hintVisible,
  initialMagnetState,
  isAttracted,
  magnetFeedback,
  magnetResult,
  observationText,
  poleOutcome,
  startFacing,
  type MagnetAction,
  type MagnetState,
} from './magnetLogic';

const objectsConfig = getTopic('magnets-what-they-attract')!.play.game as MagnetLabConfig;
const polesConfig = getTopic('magnets-poles')!.play.game as MagnetLabConfig;

function run(config: MagnetLabConfig, actions: MagnetAction[], from?: MagnetState): MagnetState {
  const reducer = createMagnetReducer(config);
  return actions.reduce(reducer, from ?? initialMagnetState(config));
}

describe('the physics rules', () => {
  it('pulls iron and steel only; other metals and non-metals are not pulled', () => {
    expect(isAttracted('iron')).toBe(true);
    expect(isAttracted('steel')).toBe(true);
    for (const m of ['copper', 'aluminium', 'brass', 'wood', 'plastic', 'rubber', 'glass'] as const) expect(isAttracted(m), m).toBe(false);
  });

  it('opposite poles attract and like poles repel', () => {
    expect(poleOutcome('N', 'S')).toBe('attract');
    expect(poleOutcome('S', 'N')).toBe('attract');
    expect(poleOutcome('N', 'N')).toBe('repel');
    expect(poleOutcome('S', 'S')).toBe('repel');
  });

  it('every magnet object in the curriculum is labelled by what its material really does', () => {
    for (const o of objectsConfig.objects) expect(o.magnetic, o.id).toBe(MAGNET_PULLS[o.material]);
    // "Not every metal is magnetic" is taught with real non-magnetic metals.
    const metals = objectsConfig.objects.filter((o) => ['copper', 'aluminium', 'brass'].includes(o.material));
    expect(metals.length).toBeGreaterThanOrEqual(2);
    expect(metals.every((o) => !o.magnetic)).toBe(true);
  });
});

describe('test rounds', () => {
  it('reports pulled or not pulled for each object, and finishes once every listed object is tested', () => {
    const [everyday] = objectsConfig.rounds;
    if (everyday.kind !== 'test') throw new Error('expected a test round');
    let s = run(objectsConfig, [{ type: 'test', objectId: 'nail' }]);
    expect(s.last).toMatchObject({ kind: 'tested', objectId: 'nail', pulled: true });
    expect(magnetFeedback(objectsConfig, s)).toMatchObject({ tone: 'pulled', text: expect.stringMatching(/before they even touched/) });
    s = run(objectsConfig, [{ type: 'test', objectId: 'block' }], s);
    expect(s.last).toMatchObject({ kind: 'tested', pulled: false });
    expect(magnetFeedback(objectsConfig, s)).toMatchObject({ tone: 'not-pulled', detail: 'Wood is not magnetic.' });
    expect(s.phase).toBe('playing');
    s = run(objectsConfig, everyday.objectIds.map((objectId) => ({ type: 'test' as const, objectId })), s);
    expect(s.phase).toBe('correct');
    expect(s.mistakes).toBe(0);
  });

  it('ignores objects that are not part of the round', () => {
    const s = run(objectsConfig, [{ type: 'test', objectId: 'marble' }]);
    expect(s.last).toBeNull();
    expect(s.tested).toEqual([]);
  });

  it('takes an object off the magnet', () => {
    let s = run(objectsConfig, [{ type: 'test', objectId: 'clip' }]);
    expect(s.atMagnet).toBe('clip');
    s = run(objectsConfig, [{ type: 'release' }], s);
    expect(s.atMagnet).toBeNull();
    expect(magnetFeedback(objectsConfig, s)).toBeNull();
  });
});

describe('sort rounds', () => {
  const toSort = (): MagnetState => {
    let s = initialMagnetState(objectsConfig);
    for (const round of objectsConfig.rounds.slice(0, 2)) {
      if (round.kind !== 'test') throw new Error('expected test rounds first');
      s = run(objectsConfig, [...round.objectIds.map((objectId) => ({ type: 'test' as const, objectId })), { type: 'next' }], s);
    }
    return s;
  };

  it('counts a wrong tray as a mistake, nudges first and shows the round hint after the second', () => {
    let s = toSort();
    expect(objectsConfig.rounds[s.round].kind).toBe('sort');
    s = run(objectsConfig, [{ type: 'sort', objectId: 'marble', tray: 'magnetic' }], s);
    expect(s.mistakes).toBe(1);
    expect(s.sorted.marble).toBeUndefined();
    expect(magnetFeedback(objectsConfig, s)?.text).toBe('Not that tray. Think about what the glass marble is made of.');
    expect(hintVisible(s)).toBe(false);
    s = run(objectsConfig, [{ type: 'sort', objectId: 'key', tray: 'magnetic' }], s);
    expect(hintVisible(s)).toBe(true);
    expect(magnetFeedback(objectsConfig, s)?.text).toContain('iron or steel');
  });

  it('finishes when every object is in its tray', () => {
    let s = toSort();
    const round = objectsConfig.rounds[s.round];
    if (round.kind !== 'sort') throw new Error('expected a sort round');
    for (const id of round.objectIds) {
      const o = objectsConfig.objects.find((x) => x.id === id)!;
      s = run(objectsConfig, [{ type: 'sort', objectId: id, tray: o.magnetic ? 'magnetic' : 'not-magnetic' }], s);
    }
    expect(s.phase).toBe('correct');
    s = run(objectsConfig, [{ type: 'next' }], s);
    expect(s.phase).toBe('complete');
    expect(magnetResult(objectsConfig, s)).toMatchObject({ gameType: 'magnet-lab', completed: true, perfect: true, score: 1 });
  });
});

describe('pole rounds', () => {
  it('starts each challenge the opposite way round, so pushing at once never solves it', () => {
    for (const round of polesConfig.rounds) {
      if (round.kind !== 'poles' || (round.goal !== 'attract' && round.goal !== 'repel')) continue;
      expect(poleOutcome(FIXED_FACING, startFacing(round))).not.toBe(round.goal);
    }
  });

  it('explore: needs both attraction and repulsion', () => {
    let s = run(polesConfig, [{ type: 'push' }]);
    expect(s.last).toMatchObject({ kind: 'pushed', facing: 'N', outcome: 'repel', mistake: false });
    expect(magnetFeedback(polesConfig, s)?.text).toBe('Two N poles met: they repel and push apart, without even touching.');
    expect(s.phase).toBe('playing');
    s = run(polesConfig, [{ type: 'turn' }, { type: 'push' }], s);
    expect(s.last).toMatchObject({ outcome: 'attract' });
    expect(s.joined).toBe(true);
    expect(s.phase).toBe('correct');
  });

  it('attract challenge: a repulsion is a mistake; turning around and pushing solves it', () => {
    let s = run(polesConfig, [{ type: 'push' }, { type: 'turn' }, { type: 'push' }, { type: 'next' }]);
    expect(polesConfig.rounds[s.round]).toMatchObject({ goal: 'attract' });
    s = run(polesConfig, [{ type: 'push' }], s);
    expect(s.mistakes).toBe(1);
    expect(magnetFeedback(polesConfig, s)?.detail).toBe('Try turning the magnet around.');
    s = run(polesConfig, [{ type: 'turn' }, { type: 'push' }], s);
    expect(s.phase).toBe('correct');
    expect(magnetResult(polesConfig, { ...s, phase: 'complete' }).correct).toBe(polesConfig.rounds.length - 1);
  });

  it('identify: needs a push first, hides the pole from the mentor, and checks the answer against the real pole', () => {
    const reducer = createMagnetReducer(polesConfig);
    let s = initialMagnetState(polesConfig);
    // Jump to the mystery round.
    s = { ...s, round: 3, facing: startFacing(polesConfig.rounds[3]) };
    expect(s.facing).toBe('S');
    expect(reducer(s, { type: 'identify', answer: 'S' })).toBe(s);
    s = reducer(s, { type: 'push' });
    expect(s.last).toMatchObject({ outcome: 'attract' });
    expect(observationText(polesConfig, s.last!, true)).not.toMatch(/\bS pole\b/);
    expect(magnetFeedback(polesConfig, s)?.text).toBe('They attract and snap together.');
    s = reducer(s, { type: 'identify', answer: 'N' });
    expect(s.mistakes).toBe(1);
    s = reducer(s, { type: 'identify', answer: 'S' });
    expect(s.phase).toBe('correct');
  });

  it('a requested hint is not a mistake', () => {
    const s = run(polesConfig, [{ type: 'hint' }]);
    expect(hintVisible(s)).toBe(true);
    expect(s.mistakes).toBe(0);
    expect(s.hintsAsked).toBe(1);
  });

  it('reset starts again from the first round', () => {
    const s = run(polesConfig, [{ type: 'push' }, { type: 'turn' }, { type: 'push' }, { type: 'next' }, { type: 'reset' }]);
    expect(s).toEqual(initialMagnetState(polesConfig));
  });
});
