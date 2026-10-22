import type { GameResult } from '../../domain/results';
import type { PushBoxConfig } from '../../domain/types';

/**
 * Push the Box: a simple friction-as-a-force model.
 *
 * Each floor has a `grip`: the strongest push friction can match there. A push
 * of strength p moves the box only when p > grip, and then slides it
 * (p - grip) * STEPS_PER_LEVEL steps before friction brings it to a stop. This
 * is a deterministic teaching model, not a precise physical simulation.
 */
export const STEPS_PER_LEVEL = 1.5;

export interface PushOutcome {
  floorId: string;
  push: number;
  grip: number;
  moved: boolean;
  /** Distance slid, in floor steps. */
  distance: number;
}

export interface PushBoxState {
  floorId: string | null;
  push: number;
  phase: 'ready' | 'pushing' | 'result';
  last: PushOutcome | null;
  history: PushOutcome[];
}

export type PushBoxAction =
  | { type: 'select-floor'; floorId: string }
  | { type: 'set-push'; push: number }
  | { type: 'push' }
  | { type: 'finish' }
  | { type: 'again' }
  | { type: 'reset' };

export const initialPushBoxState: PushBoxState = { floorId: null, push: 1, phase: 'ready', last: null, history: [] };

export function pushOutcome(config: PushBoxConfig, floorId: string, push: number): PushOutcome | null {
  const floor = config.floors.find((f) => f.id === floorId);
  if (!floor || push < 1 || push > config.pushLabels.length) return null;
  const moved = push > floor.grip;
  return { floorId, push, grip: floor.grip, moved, distance: moved ? (push - floor.grip) * STEPS_PER_LEVEL : 0 };
}

/** How hard friction pushes back: just as hard as the push, up to the floor's grip. */
export function frictionPushBack(push: number, grip: number): number {
  return Math.max(0, Math.min(push, grip));
}

/** Longest slide any push can make in this config, in floor steps (sizes the scene's ruler). */
export function maxSlideSteps(config: PushBoxConfig): number {
  const levels = config.pushLabels.length;
  return Math.max(STEPS_PER_LEVEL, ...config.floors.map((f) => Math.max(0, levels - f.grip) * STEPS_PER_LEVEL));
}

/** How long the push animation runs before the result shows (ms). */
export function pushAnimationMs(outcome: PushOutcome, reducedMotion: boolean): number {
  if (reducedMotion) return 150;
  return outcome.moved ? 700 + outcome.distance * 220 : 900;
}

/* ----------------------------------------------------------- dragging */

/** Rounds a continuous push (e.g. 2.6 from a drag) to the nearest whole push level 1..levels. */
export function snapPushLevel(value: number, levels: number): number {
  if (!Number.isFinite(value) || levels < 1) return 1;
  return Math.min(levels, Math.max(1, Math.round(value)));
}

/** Push level for a position along a drag track: 0 is the gentlest end, 1 the strongest. */
export function pushLevelAt(fraction: number, levels: number): number {
  return snapPushLevel(1 + fraction * (levels - 1), levels);
}

/** Where a push level sits along a drag track (0..1); the inverse of pushLevelAt. */
export function pushLevelFraction(level: number, levels: number): number {
  return levels > 1 ? (snapPushLevel(level, levels) - 1) / (levels - 1) : 0;
}

/* -------------------------------------------------------------- hints */

/** Pushes in a row on this floor that left the box still (since it last moved there). */
export function stuckStreak(state: PushBoxState, floorId: string): PushOutcome[] {
  const streak: PushOutcome[] = [];
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.floorId !== floorId) continue;
    if (h.moved) break;
    streak.unshift(h);
  }
  return streak;
}

/**
 * A short hint once the box has stayed still on a floor several pushes in a
 * row: a nudge after two tries, then a concrete push to try from the third.
 */
export function pushHint(state: PushBoxState, config: PushBoxConfig, floorId: string): string | null {
  const stuck = stuckStreak(state, floorId);
  if (stuck.length < 2) return null;
  const levels = config.pushLabels.length;
  const biggest = Math.max(...stuck.map((h) => h.push));
  const name = (level: number) => config.pushLabels[level - 1].toLowerCase();
  if (stuck.length === 2 || biggest >= levels) {
    return `Make the push arrow longer: try a push bigger than ${name(biggest)}.`;
  }
  return `Try the ${name(biggest + 1)} push, one size bigger.`;
}

/* ----------------------------------------------------------- feedback */

/** The first sentence of a text: after a move the floor explanation is shown as one short sentence. */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  return /^.*?[.!?](?=\s|$)/.exec(trimmed)?.[0] ?? trimmed;
}

/**
 * The floor to try next: the first floor after the current one (in config
 * order, wrapping round) where the box has not moved yet, or simply the next
 * floor once it has moved everywhere.
 */
export function nextFloorId(state: PushBoxState, config: PushBoxConfig): string | null {
  const floors = config.floors;
  if (!floors.length) return null;
  const at = floors.findIndex((f) => f.id === state.floorId);
  const order = floors.map((_, i) => floors[(at + 1 + i) % floors.length]);
  return (order.find((f) => smallestMovingPush(state, f.id) === undefined) ?? order[0]).id;
}

/** How many pushes it took to move the box on every floor (0 while that has not happened). */
export function pushesToComplete(state: PushBoxState, config: PushBoxConfig): number {
  if (!config.floors.length) return 0;
  const moved = new Set<string>();
  for (let i = 0; i < state.history.length; i++) {
    if (state.history[i].moved) moved.add(state.history[i].floorId);
    if (config.floors.every((f) => moved.has(f.id))) return i + 1;
  }
  return 0;
}

export function createPushBoxReducer(config: PushBoxConfig) {
  return function pushBoxReducer(state: PushBoxState, action: PushBoxAction): PushBoxState {
    switch (action.type) {
      case 'select-floor':
        if (state.phase === 'pushing' || !config.floors.some((f) => f.id === action.floorId)) return state;
        return { ...state, floorId: action.floorId, phase: 'ready', last: null };
      case 'set-push':
        if (state.phase === 'pushing' || action.push < 1 || action.push > config.pushLabels.length) return state;
        return { ...state, push: action.push, phase: state.phase === 'result' ? 'ready' : state.phase, last: state.phase === 'result' ? null : state.last };
      case 'push': {
        if (state.phase !== 'ready' || !state.floorId) return state;
        const outcome = pushOutcome(config, state.floorId, state.push);
        return outcome ? { ...state, phase: 'pushing', last: outcome } : state;
      }
      case 'finish':
        if (state.phase !== 'pushing' || !state.last) return state;
        return { ...state, phase: 'result', history: [...state.history, state.last] };
      case 'again':
        return state.phase === 'result' ? { ...state, phase: 'ready', last: null } : state;
      case 'reset':
        return initialPushBoxState;
      default:
        return state;
    }
  };
}

/** Complete once the box has been moved at least once on every floor. */
export function isPushBoxComplete(state: PushBoxState, config: PushBoxConfig): boolean {
  return config.floors.every((f) => state.history.some((h) => h.floorId === f.id && h.moved));
}

/** Smallest push that moved the box on each floor (undefined until it has moved there). */
export function smallestMovingPush(state: PushBoxState, floorId: string): number | undefined {
  const pushes = state.history.filter((h) => h.floorId === floorId && h.moved).map((h) => h.push);
  return pushes.length ? Math.min(...pushes) : undefined;
}

/** Bonus: the box moved with the smallest push that works on this floor (grip + 1). */
export function foundSmallestPush(state: PushBoxState, config: PushBoxConfig, floorId: string): boolean {
  const floor = config.floors.find((f) => f.id === floorId);
  return Boolean(floor) && smallestMovingPush(state, floorId) === floor!.grip + 1;
}

export function pushBoxResult(state: PushBoxState, config: PushBoxConfig): GameResult {
  const moved = config.floors.filter((f) => smallestMovingPush(state, f.id) !== undefined).length;
  // "Found the friction limit": moved the box with the smallest push that works on that floor.
  const exact = config.floors.filter((f) => foundSmallestPush(state, config, f.id)).length;
  const completed = isPushBoxComplete(state, config);
  return {
    gameType: 'push-box',
    score: config.floors.length ? exact / config.floors.length : 0,
    correct: exact,
    total: config.floors.length,
    mistakes: 0,
    completed,
    perfect: completed && exact === config.floors.length,
    summary: `Moved the box on ${moved} of ${config.floors.length} floors in ${state.history.length} pushes`,
  };
}
