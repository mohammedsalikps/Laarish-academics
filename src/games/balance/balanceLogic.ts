import type { GameResult } from '../../domain/results';
import type { BalanceGameConfig, BalanceTerm } from '../../domain/types';

/**
 * Balance Scale: find the number that makes both sides equal.
 * The scale tips towards the heavier side, so every try gives feedback, and the
 * round is right only when both sides add up to the same total.
 */

export type Round = BalanceGameConfig['rounds'][number];

export interface BalanceState {
  round: number;
  chosen: number | null;
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
}

export type BalanceAction = { type: 'choose'; value: number } | { type: 'check' } | { type: 'next' } | { type: 'reset' };

export const initialBalanceState: BalanceState = { round: 0, chosen: null, mistakesByRound: {}, mistakes: 0, phase: 'playing' };

export function sideTotal(terms: BalanceTerm[], unknown: number | null): number | null {
  if (unknown === null && terms.includes('unknown')) return null;
  return terms.reduce<number>((sum, t) => sum + (t === 'unknown' ? (unknown ?? 0) : t), 0);
}

/** -1: left side lower (heavier), 0: balanced, 1: right side lower. Null until a number is tried. */
export function tilt(round: Round, unknown: number | null): -1 | 0 | 1 | null {
  const left = sideTotal(round.left, unknown);
  const right = sideTotal(round.right, unknown);
  if (left === null || right === null) return null;
  return left === right ? 0 : left > right ? -1 : 1;
}

/** Wrong Checks so far in this round; the second one unlocks the round's own hint. */
export const wrongTries = (state: BalanceState, round: Round) => state.mistakesByRound[round.id] ?? 0;

/**
 * Which way the unknown has to move to level the scale: "smaller" or "bigger".
 * Null when it is already level, nothing is chosen, or the unknown cancels out.
 */
export function direction(round: Round, unknown: number | null): 'smaller' | 'bigger' | null {
  const left = sideTotal(round.left, unknown);
  const right = sideTotal(round.right, unknown);
  if (left === null || right === null || left === right) return null;
  // How much the left side gains, compared with the right, for each 1 added to the unknown.
  const weight = round.left.filter((t) => t === 'unknown').length - round.right.filter((t) => t === 'unknown').length;
  if (weight === 0) return null;
  return (left - right) * weight > 0 ? 'smaller' : 'bigger';
}

export interface BalanceHint {
  /** 1 = short nudge (try a smaller or bigger number), 2 = the round's own hint. */
  level: 1 | 2;
  text: string;
}

/** One-line hint after a wrong Check: first a nudge in the right direction, then the round's hint. */
export function balanceHint(round: Round, tried: number | null, wrong: number): BalanceHint | null {
  if (wrong < 1 || tried === null || tilt(round, tried) === 0) return null;
  const way = direction(round, tried);
  if (wrong === 1 && way) return { level: 1, text: way === 'smaller' ? 'Too big. Try a smaller number.' : 'Too small. Try a bigger number.' };
  return { level: 2, text: round.hint };
}

export function createBalanceReducer(config: BalanceGameConfig) {
  return function balanceReducer(state: BalanceState, action: BalanceAction): BalanceState {
    const round = config.rounds[state.round];
    switch (action.type) {
      case 'choose':
        if (!round || (state.phase !== 'playing' && state.phase !== 'incorrect')) return state;
        if (!round.choices.includes(action.value)) return state;
        return { ...state, chosen: action.value, phase: 'playing' };
      case 'check': {
        if (!round || state.phase !== 'playing' || state.chosen === null) return state;
        if (tilt(round, state.chosen) === 0) return { ...state, phase: 'correct' };
        return {
          ...state,
          phase: 'incorrect',
          mistakes: state.mistakes + 1,
          mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        const last = state.round >= config.rounds.length - 1;
        return last ? { ...state, phase: 'complete' } : { ...state, round: state.round + 1, chosen: null, phase: 'playing' };
      }
      case 'reset':
        return initialBalanceState;
      default:
        return state;
    }
  };
}

export function balanceResult(config: BalanceGameConfig, state: BalanceState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'balance',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Balanced ${completed ? total : state.round} of ${total} scales with ${state.mistakes} wrong tr${state.mistakes === 1 ? 'y' : 'ies'}`,
  };
}
