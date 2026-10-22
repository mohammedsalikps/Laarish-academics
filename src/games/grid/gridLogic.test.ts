import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { GridExplorerConfig } from '../../domain/types';
import {
  cellLabel,
  createGridReducer,
  createGridState,
  describeLegs,
  describeWalk,
  foundMessage,
  gridResult,
  landmarkAt,
  legsOf,
  notYetMessage,
  offsetLegs,
  pathCells,
  reachableCells,
  straightLineTip,
  straightPath,
  trailSteps,
  whereIs,
  type Cell,
  type Direction,
  type GridAction,
  type GridState,
} from './gridLogic';

const config = getTopic('maps-directions')!.play.game as GridExplorerConfig;
const reduce = createGridReducer(config);
const run = (state: GridState, ...actions: GridAction[]) => actions.reduce(reduce, state);
const at = (id: string) => config.landmarks.find((l) => l.id === id)!.at as Cell;

/** Moves from the current position to a target cell, column first. */
function walkTo(state: GridState, [col, row]: [number, number]): GridAction[] {
  const moves: GridAction[] = [];
  const [c0, r0] = state.pos;
  const h: Direction = col > c0 ? 'east' : 'west';
  const v: Direction = row > r0 ? 'south' : 'north';
  for (let i = 0; i < Math.abs(col - c0); i += 1) moves.push({ type: 'move', direction: h });
  for (let i = 0; i < Math.abs(row - r0); i += 1) moves.push({ type: 'move', direction: v });
  return moves;
}

describe('grid explorer', () => {
  it('has tasks whose targets are real landmarks on the map', () => {
    for (const t of config.tasks) expect(config.landmarks.some((l) => l.id === t.targetId)).toBe(true);
    for (const l of config.landmarks) {
      expect(l.at[0]).toBeLessThan(config.size);
      expect(l.at[1]).toBeLessThan(config.size);
    }
  });

  it('treats north as up (row 0) and stays on the map', () => {
    const start = createGridState(config);
    expect(run(start, { type: 'move', direction: 'north' }).pos).toEqual([start.pos[0], start.pos[1] - 1]);
    let s = start;
    for (let i = 0; i < config.size + 2; i += 1) s = run(s, { type: 'move', direction: 'south' });
    expect(s.pos[1]).toBe(config.size - 1);
  });

  it('counts a wrong stop as a mistake', () => {
    const start = createGridState(config);
    const target = config.landmarks.find((l) => l.id === config.tasks[0].targetId)!;
    const offTarget = landmarkAt(config, start.pos)?.id === target.id ? run(start, { type: 'move', direction: 'east' }) : start;
    const wrong = run(offTarget, { type: 'arrive' });
    expect(wrong.phase).toBe('incorrect');
    expect(wrong.mistakes).toBe(1);
  });

  it('completes every task with a perfect score when walking straight to each target', () => {
    let s = createGridState(config);
    for (const task of config.tasks) {
      const target = config.landmarks.find((l) => l.id === task.targetId)!;
      s = run(s, ...walkTo(s, target.at), { type: 'arrive' });
      expect(s.phase).toBe('correct');
      s = run(s, { type: 'next' });
    }
    expect(s.phase).toBe('complete');
    expect(gridResult(config, s)).toMatchObject({ completed: true, score: 1, perfect: true, gameType: 'grid-explorer' });
  });
});

describe('straight walks', () => {
  it('finds the steps between squares in the same row or column', () => {
    expect(straightPath([2, 4], [2, 2])).toEqual(['north', 'north']);
    expect(straightPath([2, 2], [4, 2])).toEqual(['east', 'east']);
    expect(straightPath([4, 0], [0, 0])).toEqual(['west', 'west', 'west', 'west']);
    expect(straightPath([1, 1], [1, 3])).toEqual(['south', 'south']);
    expect(straightPath([1, 1], [1, 1])).toEqual([]);
    expect(straightPath([2, 4], [0, 0])).toBeNull();
    expect(pathCells([2, 4], ['north', 'north'])).toEqual([
      [2, 3],
      [2, 2],
    ]);
  });

  it('can reach exactly the squares in the row and column of the explorer', () => {
    const cells = reachableCells(config, [2, 4]);
    expect(cells).toHaveLength((config.size - 1) * 2);
    expect(cells.every(([c, r]) => (c === 2) !== (r === 4))).toBe(true);
  });

  it('walks to a tapped square in one action, but only in a straight line', () => {
    const start = createGridState(config);
    const walked = run(start, { type: 'walk-to', to: at('well') });
    expect(walked.pos).toEqual(at('well'));
    expect(walked.steps).toBe(2);
    expect(walked.stopSteps).toBe(2);
    expect(walked.trail).toEqual([[2, 4], [2, 3], [2, 2]]);
    expect(run(start, { type: 'walk-to', to: at('chest') })).toBe(start);
    expect(run(start, { type: 'walk-to', to: [2, 9] })).toBe(start);
  });

  it('starts each stop with a fresh route and can retry a stop from its beginning', () => {
    let s = run(createGridState(config), { type: 'walk-to', to: at('well') }, { type: 'arrive' });
    expect(s.routes.t1).toEqual([[2, 4], [2, 3], [2, 2]]);
    s = run(s, { type: 'next' });
    expect(s.taskStart).toEqual(at('well'));
    expect(s.trail).toEqual([at('well')]);
    expect(s.stopSteps).toBe(0);

    s = run(s, { type: 'move', direction: 'west' }, { type: 'arrive' });
    expect(s.phase).toBe('incorrect');
    expect(s.stopSteps).toBe(1);
    s = run(s, { type: 'retry' });
    expect(s).toMatchObject({ pos: at('well'), trail: [at('well')], stopSteps: 0, phase: 'playing', mistakes: 1 });
    expect(s.steps).toBe(3);
  });

  it('does not walk while a found stop is waiting for "Next"', () => {
    const found = run(createGridState(config), { type: 'walk-to', to: at('well') }, { type: 'arrive' });
    expect(run(found, { type: 'move', direction: 'east' })).toBe(found);
    expect(run(found, { type: 'walk-to', to: at('tree') })).toBe(found);
    expect(run(found, { type: 'retry' })).toBe(found);
  });
});

describe('direction words', () => {
  it('groups steps into legs and describes them', () => {
    const legs = legsOf(['north', 'north', 'east']);
    expect(legs).toEqual([
      { direction: 'north', steps: 2 },
      { direction: 'east', steps: 1 },
    ]);
    expect(describeLegs(legs)).toBe('2 steps North, then 1 step East');
    expect(describeLegs([])).toBe('no steps');
    expect(trailSteps([[2, 4], [2, 3], [3, 3]])).toEqual(['north', 'east']);
  });

  it('says how far and which way the explorer walked', () => {
    expect(describeWalk(['east', 'east'])).toBe('You walked 2 steps East.');
    expect(describeWalk(['north', 'north'], 'Well')).toBe('You walked 2 steps North. You are at the well.');
  });

  it('gives a compass hint towards the target after a wrong stop', () => {
    expect(whereIs('Well', [2, 4], [2, 2])).toBe('The well is 2 squares North of you.');
    expect(whereIs('Mango tree', [3, 3], [4, 2])).toBe('The mango tree is 1 square North and 1 square East of you.');
    expect(whereIs('Well', [2, 2], [2, 2])).toBe('You are at the well.');
    expect(offsetLegs([4, 2], [0, 0])).toEqual([
      { direction: 'north', steps: 2 },
      { direction: 'west', steps: 4 },
    ]);
  });

  it('says where the target is after a wrong stop', () => {
    expect(notYetMessage('Well', [2, 3], [2, 2])).toBe('Not the well yet. The well is 1 square North of you.');
  });

  it('praises a found stop in one short line: a map fact, or the shortest way after a long route', () => {
    expect(foundMessage('Treasure chest', [4, 0], [0, 0], 4)).toBe('You found the treasure chest! On a map, West is to the left.');
    expect(foundMessage('Mango tree', [2, 3], [4, 2], 2)).toBe('You found the mango tree! On a map, North is up and East is to the right.');
    expect(foundMessage('Well', [2, 4], [2, 2], 4)).toBe('You found the well! The shortest way is 2 steps North.');
    expect(foundMessage('Well', [2, 2], [2, 2], 0)).toBe('You found the well!');
  });

  it('suggests the corner squares when a tap is not in a straight line', () => {
    expect(straightLineTip([2, 4], [4, 2])).toEqual({
      text: 'Walk in a straight line: go North or East first.',
      via: [
        [2, 2],
        [4, 4],
      ],
    });
  });

  it('labels each square for screen readers', () => {
    expect(cellLabel(config, [2, 2], [2, 4])).toBe('Row 3, column 3, Well, walk 2 steps North');
    expect(cellLabel(config, [2, 4], [2, 4])).toBe('Row 5, column 3, you are here');
    expect(cellLabel(config, [0, 0], [2, 4])).toBe('Row 1, column 1, Treasure chest, not in a straight line');
  });
});
