import type { GameResult } from '../../domain/results';
import type { AreaGridConfig } from '../../domain/types';

/**
 * Area Builder: make a rectangle on a square grid, anchored at the top-left
 * corner, with the area and/or perimeter a round asks for. Any rectangle with
 * the right measurements is accepted (for area 12: 3 × 4, 4 × 3, 2 × 6, ...).
 */

export type AreaRound = AreaGridConfig['rounds'][number];

/** Width and height in whole squares. 0 × 0 means nothing is drawn yet. */
export interface Size {
  width: number;
  height: number;
}

export interface AreaState extends Size {
  round: number;
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
  /** The rectangle at the latest wrong Check this round (drives the first nudge). */
  lastWrong: Size | null;
  /** The rectangle that solved each round, for the "Your rounds" list. */
  solved: Record<string, Size>;
}

export type AreaAction =
  /** Sets the opposite corner of the rectangle (drag, tap). Clamped to the grid. */
  | { type: 'set'; width: number; height: number }
  /** One step of the Width or Height stepper. */
  | { type: 'step'; side: keyof Size; by: 1 | -1 }
  | { type: 'check' }
  | { type: 'next' }
  | { type: 'reset' };

export const initialAreaState: AreaState = { round: 0, width: 0, height: 0, mistakesByRound: {}, mistakes: 0, phase: 'playing', lastWrong: null, solved: {} };

/* ------------------------------------------------------------------ maths */

export const areaOf = ({ width, height }: Size) => width * height;
export const perimeterOf = ({ width, height }: Size) => (width > 0 && height > 0 ? 2 * (width + height) : 0);
export const hasRectangle = ({ width, height }: Size) => width > 0 && height > 0;

/** Right when the area matches (if the round asks for one) and the perimeter matches (if it asks for one). */
export function isCorrect(round: AreaRound, size: Size): boolean {
  if (!hasRectangle(size)) return false;
  if (round.area !== undefined && areaOf(size) !== round.area) return false;
  if (round.perimeter !== undefined && perimeterOf(size) !== round.perimeter) return false;
  return round.area !== undefined || round.perimeter !== undefined;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Keeps a rectangle on the grid: at least 1 × 1, at most cols × rows, whole squares only. */
export function clampSize(config: Pick<AreaGridConfig, 'cols' | 'rows'>, width: number, height: number): Size {
  return { width: clamp(Math.round(width), 1, config.cols), height: clamp(Math.round(height), 1, config.rows) };
}

/** The size after one stepper press. The first "+" on an empty grid makes a 1 × 1 square. Null when nothing changes. */
export function steppedSize(config: Pick<AreaGridConfig, 'cols' | 'rows'>, size: Size, side: keyof Size, by: 1 | -1): Size | null {
  let next: Size;
  if (!hasRectangle(size)) {
    if (by < 0) return null;
    next = { width: 1, height: 1 };
  } else {
    next = clampSize(config, side === 'width' ? size.width + by : size.width, side === 'height' ? size.height + by : size.height);
  }
  return sameSize(next, size) ? null : next;
}

export const sameSize = (a: Size, b: Size) => a.width === b.width && a.height === b.height;

/** The grid square (0-based) under a point given in squares from the grid's top-left corner, clamped to the grid. */
export function cellAt(x: number, y: number, config: Pick<AreaGridConfig, 'cols' | 'rows'>): { col: number; row: number } {
  return { col: clamp(Math.floor(x), 0, config.cols - 1), row: clamp(Math.floor(y), 0, config.rows - 1) };
}

/* ------------------------------------------------------------------ units */

/** Area unit: the round's unit, or "squares" ("1 square"). */
export function areaUnit(round: AreaRound, n?: number): string {
  const unit = round.unit?.trim() || 'squares';
  return n === 1 && unit === 'squares' ? 'square' : unit;
}

/** Length unit for sides and perimeter: "square cm" → "cm"; anything else → "units". */
export function lengthUnit(round: AreaRound, n?: number): string {
  const unit = round.unit?.trim().match(/^square\s+(.+)$/i)?.[1] ?? 'units';
  return n === 1 && unit === 'units' ? 'unit' : unit;
}

/** The live readout: "Area: 12 square cm · Perimeter: 14 cm". */
export function readout(round: AreaRound, size: Size): string {
  const a = areaOf(size);
  const p = perimeterOf(size);
  return `Area: ${a} ${areaUnit(round, a)} · Perimeter: ${p} ${lengthUnit(round, p)}`;
}

/** What a round asks for, in words: "Area 12 square cm and perimeter 14 cm". */
export function goalText(round: AreaRound): string {
  const parts: string[] = [];
  if (round.area !== undefined) parts.push(`area ${round.area} ${areaUnit(round, round.area)}`);
  if (round.perimeter !== undefined) parts.push(`perimeter ${round.perimeter} ${lengthUnit(round, round.perimeter)}`);
  const text = parts.join(' and ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ hints */

export interface AreaHint {
  /** 1 = short nudge from the numbers, 2 = the round's own hint. */
  level: 1 | 2;
  text: string;
}

/** The first nudge, computed from the rectangle that was checked. */
export function nudge(round: AreaRound, tried: Size): string | null {
  if (!hasRectangle(tried) || isCorrect(round, tried)) return null;
  const a = areaOf(tried);
  const p = perimeterOf(tried);
  const areaOk = round.area === undefined || a === round.area;
  const perimeterOk = round.perimeter === undefined || p === round.perimeter;
  if (round.area !== undefined && round.perimeter !== undefined) {
    if (areaOk) return `Area is right, but the perimeter is ${p}, not ${round.perimeter}.`;
    if (perimeterOk) return `Perimeter is right, but the area is ${a}, not ${round.area}.`;
  }
  if (!areaOk && round.area !== undefined) return `Your area is ${a}. You need ${round.area}: make it ${a < round.area ? 'bigger' : 'smaller'}.`;
  if (round.perimeter !== undefined) return `Your perimeter is ${p}. You need ${round.perimeter}: make the sides ${p < round.perimeter ? 'longer' : 'shorter'}.`;
  return null;
}

/** One hint line after a wrong Check: first a nudge from the numbers, then the round's own hint. */
export function areaHint(round: AreaRound, tried: Size | null, wrong: number): AreaHint | null {
  if (wrong < 1 || !tried) return null;
  const text = wrong === 1 ? nudge(round, tried) : null;
  return text ? { level: 1, text } : { level: 2, text: round.hint };
}

/* ------------------------------------------------------------------ state */

export const currentRound = (config: AreaGridConfig, state: AreaState): AreaRound => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** Wrong Checks so far in this round; the second one unlocks the round's own hint. */
export const wrongChecks = (state: AreaState, round: AreaRound) => state.mistakesByRound[round.id] ?? 0;

/** The rectangle can change while playing and straight after a wrong Check. */
export const canEdit = (state: AreaState) => state.phase === 'playing' || state.phase === 'incorrect';

/** Check needs a rectangle, and a change since the last wrong Check. */
export const canCheck = (state: AreaState) => state.phase === 'playing' && hasRectangle(state);

export function createAreaReducer(config: AreaGridConfig) {
  const resize = (state: AreaState, next: Size | null): AreaState => {
    if (!next || !canEdit(state) || sameSize(next, state)) return state;
    return { ...state, width: next.width, height: next.height, phase: 'playing' };
  };
  return function areaReducer(state: AreaState, action: AreaAction): AreaState {
    const round = config.rounds[state.round];
    switch (action.type) {
      case 'set':
        if (!Number.isFinite(action.width) || !Number.isFinite(action.height)) return state;
        return resize(state, clampSize(config, action.width, action.height));
      case 'step':
        return resize(state, steppedSize(config, state, action.side, action.by));
      case 'check': {
        if (!round || !canCheck(state)) return state;
        const size = { width: state.width, height: state.height };
        if (isCorrect(round, size)) return { ...state, phase: 'correct', lastWrong: null, solved: { ...state.solved, [round.id]: size } };
        return {
          ...state,
          phase: 'incorrect',
          lastWrong: size,
          mistakes: state.mistakes + 1,
          mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        const last = state.round >= config.rounds.length - 1;
        return last ? { ...state, phase: 'complete' } : { ...state, round: state.round + 1, width: 0, height: 0, phase: 'playing', lastWrong: null };
      }
      case 'reset':
        return initialAreaState;
      default:
        return state;
    }
  };
}

export function areaResult(config: AreaGridConfig, state: AreaState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'area-grid',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Built ${completed ? total : state.round} of ${total} rectangles with ${state.mistakes} wrong tr${state.mistakes === 1 ? 'y' : 'ies'}`,
  };
}

export interface RoundOutcome {
  id: string;
  goal: string;
  built: Size | null;
  firstTry: boolean;
  wrong: number;
}

/** Per-round summary for the completion card. */
export const roundOutcomes = (config: AreaGridConfig, state: AreaState): RoundOutcome[] =>
  config.rounds.map((r) => ({ id: r.id, goal: goalText(r), built: state.solved[r.id] ?? null, firstTry: !state.mistakesByRound[r.id], wrong: state.mistakesByRound[r.id] ?? 0 }));
