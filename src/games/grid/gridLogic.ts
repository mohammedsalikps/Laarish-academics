import type { GameResult } from '../../domain/results';
import type { GridExplorerConfig } from '../../domain/types';

/**
 * Grid explorer: walk a character around a map with North/South/East/West
 * moves (or by tapping a square in a straight line) and press "I am here!"
 * at each task's landmark. North is row 0.
 */
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Cell = [col: number, row: number];

export const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west'];

export const DIRECTION_DELTA: Record<Direction, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

export const DIRECTION_NAMES: Record<Direction, string> = { north: 'North', south: 'South', east: 'East', west: 'West' };

/** How each direction looks on a map with North at the top (used after finding a stop). */
const DIRECTION_FACTS: Record<Direction, string> = {
  north: 'North is up',
  south: 'South is down',
  east: 'East is to the right',
  west: 'West is to the left',
};

/** Longest route kept for one stop (it is drawn as footprints). */
const MAX_TRAIL = 80;

export interface GridState {
  pos: Cell;
  task: number;
  /** Where the current stop began, so "Start again" can return there. */
  taskStart: Cell;
  /** The current stop's route, from taskStart to pos. */
  trail: Cell[];
  /** The route walked to each stop that was found, by task id. */
  routes: Record<string, Cell[]>;
  /** Steps walked in the whole game. */
  steps: number;
  /** Steps walked since the current stop began (or was started again). */
  stopSteps: number;
  mistakesByTask: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
}

export type GridAction =
  | { type: 'move'; direction: Direction }
  | { type: 'walk-to'; to: Cell }
  | { type: 'arrive' }
  | { type: 'next' }
  | { type: 'retry' }
  | { type: 'reset' };

export function createGridState(config: GridExplorerConfig): GridState {
  const start: Cell = [config.start[0], config.start[1]];
  return { pos: start, task: 0, taskStart: start, trail: [start], routes: {}, steps: 0, stopSteps: 0, mistakesByTask: {}, mistakes: 0, phase: 'playing' };
}

/* ----------------------------------------------------------- map geometry */

export const sameCell = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];
export const cellKey = ([col, row]: Cell) => `${col},${row}`;

export function onMap(config: GridExplorerConfig, [col, row]: Cell) {
  return col >= 0 && row >= 0 && col < config.size && row < config.size;
}

export function landmarkAt(config: GridExplorerConfig, pos: Cell) {
  return config.landmarks.find((l) => l.at[0] === pos[0] && l.at[1] === pos[1]);
}

export function stepFrom([col, row]: Cell, direction: Direction): Cell {
  const [dc, dr] = DIRECTION_DELTA[direction];
  return [col + dc, row + dr];
}

/** The direction of one step between neighbouring squares, or null if they are not neighbours. */
export function directionBetween(from: Cell, to: Cell): Direction | null {
  return DIRECTIONS.find((d) => sameCell(stepFrom(from, d), to)) ?? null;
}

/**
 * The steps of a straight walk (same row or column) from one square to another:
 * [] when already there, null when the squares are not in a straight line.
 */
export function straightPath(from: Cell, to: Cell): Direction[] | null {
  const dc = to[0] - from[0];
  const dr = to[1] - from[1];
  if (dc !== 0 && dr !== 0) return null;
  const direction: Direction = dr < 0 ? 'north' : dr > 0 ? 'south' : dc > 0 ? 'east' : 'west';
  return Array.from({ length: Math.abs(dc) + Math.abs(dr) }, () => direction);
}

/** Squares visited by following a list of steps (not including the start). */
export function pathCells(from: Cell, steps: Direction[]): Cell[] {
  const cells: Cell[] = [];
  let at = from;
  for (const d of steps) {
    at = stepFrom(at, d);
    cells.push(at);
  }
  return cells;
}

/** Every square a straight walk can reach: the explorer's row and column. */
export function reachableCells(config: GridExplorerConfig, from: Cell): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < config.size; i += 1) {
    if (i !== from[0]) cells.push([i, from[1]]);
    if (i !== from[1]) cells.push([from[0], i]);
  }
  return cells;
}

/* ------------------------------------------------------- direction words */

export interface Leg {
  direction: Direction;
  steps: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const the = (label: string) => `the ${label.toLowerCase()}`;
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "2 steps East". */
export const stepsPhrase = ({ direction, steps }: Leg) => `${plural(steps, 'step')} ${DIRECTION_NAMES[direction]}`;

/** Groups repeated steps into legs: [north, north, east] -> 2 North, 1 East. */
export function legsOf(steps: Direction[]): Leg[] {
  const legs: Leg[] = [];
  for (const direction of steps) {
    const last = legs[legs.length - 1];
    if (last?.direction === direction) last.steps += 1;
    else legs.push({ direction, steps: 1 });
  }
  return legs;
}

/** The steps taken along a route of neighbouring squares. */
export function trailSteps(trail: Cell[]): Direction[] {
  const steps: Direction[] = [];
  for (let i = 1; i < trail.length; i += 1) {
    const d = directionBetween(trail[i - 1], trail[i]);
    if (d) steps.push(d);
  }
  return steps;
}

/** "2 steps North, then 1 step East". */
export function describeLegs(legs: Leg[]): string {
  return legs.length ? legs.map(stepsPhrase).join(', then ') : 'no steps';
}

/** The shortest way between two squares: up/down first, then across. */
export function offsetLegs(from: Cell, to: Cell): Leg[] {
  const legs: Leg[] = [];
  const dr = to[1] - from[1];
  const dc = to[0] - from[0];
  if (dr) legs.push({ direction: dr < 0 ? 'north' : 'south', steps: Math.abs(dr) });
  if (dc) legs.push({ direction: dc > 0 ? 'east' : 'west', steps: Math.abs(dc) });
  return legs;
}

const squaresAway = (legs: Leg[]) => legs.map((l) => `${plural(l.steps, 'square')} ${DIRECTION_NAMES[l.direction]}`).join(' and ');

/** Feedback after a walk: "You walked 2 steps East. You are at the well." */
export function describeWalk(steps: Direction[], landmarkLabel?: string): string {
  const walked = `You walked ${describeLegs(legsOf(steps))}.`;
  return landmarkLabel ? `${walked} You are at ${the(landmarkLabel)}.` : walked;
}

/** Hint after a wrong stop: "The well is 2 squares North of you." */
export function whereIs(label: string, from: Cell, to: Cell): string {
  const legs = offsetLegs(from, to);
  if (!legs.length) return `You are at ${the(label)}.`;
  return `${capitalise(the(label))} is ${squaresAway(legs)} of you.`;
}

/** Feedback after a wrong "I am here!": "Not the well yet. The well is 1 square North of you." */
export function notYetMessage(label: string, from: Cell, to: Cell): string {
  return `Not ${the(label)} yet. ${whereIs(label, from, to)}`;
}

/**
 * One short line after finding a stop: the shortest way when the route was
 * longer, otherwise how the directions walked look on a map.
 */
export function foundMessage(label: string, from: Cell, to: Cell, stepsWalked: number): string {
  const found = `You found ${the(label)}!`;
  const shortest = offsetLegs(from, to);
  if (!shortest.length) return found;
  if (stepsWalked > shortest.reduce((n, l) => n + l.steps, 0)) return `${found} The shortest way is ${describeLegs(shortest)}.`;
  return `${found} On a map, ${shortest.map((l) => DIRECTION_FACTS[l.direction]).join(' and ')}.`;
}

/**
 * Tip for a tap on a square that is not in a straight line, plus the two
 * corner squares the explorer could walk to first.
 */
export function straightLineTip(from: Cell, to: Cell): { text: string; via: Cell[] } {
  const [first, second] = offsetLegs(from, to);
  if (!second) return { text: 'Tap a glowing square to walk there in a straight line.', via: [] };
  return {
    text: `Walk in a straight line: go ${DIRECTION_NAMES[first.direction]} or ${DIRECTION_NAMES[second.direction]} first.`,
    via: [
      [from[0], to[1]],
      [to[0], from[1]],
    ],
  };
}

export const edgeMessage = (direction: Direction) => `That's the edge of the map. You can't walk any further ${DIRECTION_NAMES[direction]}.`;

/** Screen-reader name for a map square, e.g. "Row 3, column 3, Well, walk 2 steps North". */
export function cellLabel(config: GridExplorerConfig, cell: Cell, explorer: Cell): string {
  const landmark = landmarkAt(config, cell);
  const name = `Row ${cell[1] + 1}, column ${cell[0] + 1}${landmark ? `, ${landmark.label}` : ''}`;
  const path = straightPath(explorer, cell);
  if (!path) return `${name}, not in a straight line`;
  if (!path.length) return `${name}, you are here`;
  return `${name}, walk ${stepsPhrase({ direction: path[0], steps: path.length })}`;
}

/* ---------------------------------------------------------------- reducer */

function step(config: GridExplorerConfig, state: GridState, direction: Direction): GridState {
  const next = stepFrom(state.pos, direction);
  // Stay on the map: moves off the edge are ignored.
  if (!onMap(config, next)) return state;
  return { ...state, pos: next, trail: [...state.trail, next].slice(-MAX_TRAIL), steps: state.steps + 1, stopSteps: state.stopSteps + 1, phase: 'playing' };
}

export function createGridReducer(config: GridExplorerConfig) {
  return function gridReducer(state: GridState, action: GridAction): GridState {
    const task = config.tasks[state.task];
    const canWalk = Boolean(task) && (state.phase === 'playing' || state.phase === 'incorrect');
    switch (action.type) {
      case 'move':
        return canWalk ? step(config, state, action.direction) : state;
      case 'walk-to': {
        const path = straightPath(state.pos, action.to);
        if (!canWalk || !path || !onMap(config, action.to)) return state;
        return path.reduce((s, d) => step(config, s, d), state);
      }
      case 'arrive': {
        if (!task || state.phase !== 'playing') return state;
        if (landmarkAt(config, state.pos)?.id === task.targetId) return { ...state, phase: 'correct', routes: { ...state.routes, [task.id]: state.trail } };
        return {
          ...state,
          phase: 'incorrect',
          mistakes: state.mistakes + 1,
          mistakesByTask: { ...state.mistakesByTask, [task.id]: (state.mistakesByTask[task.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        const last = state.task >= config.tasks.length - 1;
        // Tasks continue from wherever the explorer is standing, with a fresh route.
        return last ? { ...state, phase: 'complete' } : { ...state, task: state.task + 1, taskStart: state.pos, trail: [state.pos], stopSteps: 0, phase: 'playing' };
      }
      case 'retry':
        return canWalk ? { ...state, pos: state.taskStart, trail: [state.taskStart], stopSteps: 0, phase: 'playing' } : state;
      case 'reset':
        return createGridState(config);
      default:
        return state;
    }
  };
}

export function gridResult(config: GridExplorerConfig, state: GridState): GameResult {
  const total = config.tasks.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.tasks.filter((t) => !state.mistakesByTask[t.id]).length : 0;
  return {
    gameType: 'grid-explorer',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Found ${completed ? total : state.task} of ${total} places with ${state.mistakes} wrong stop${state.mistakes === 1 ? '' : 's'}`,
  };
}
