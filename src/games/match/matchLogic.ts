import type { ConceptMatchConfig } from '../../domain/types';
import type { GameResult } from '../../domain/results';
import { seededShuffle } from '../../lib/ids';

/**
 * Concept Match: the learner pairs each example (left) with the matching
 * concept (right). A pair is tried by dragging an example onto a concept, or by
 * tapping a card on each side (in either order), so it is fully usable by
 * pointer, touch and keyboard. Every try is checked immediately.
 */
export interface MatchFeedback {
  kind: 'correct' | 'incorrect';
  leftId: string;
  rightId: string;
}

export interface MatchState {
  leftOrder: string[];
  rightOrder: string[];
  selectedLeft: string | null;
  selectedRight: string | null;
  matched: string[];
  mistakes: number;
  mistakesByPair: Record<string, number>;
  feedback: MatchFeedback | null;
  phase: 'playing' | 'complete';
}

export type MatchAction =
  | { type: 'select-left'; id: string }
  | { type: 'select-right'; id: string }
  /** A direct try, e.g. dropping a dragged example onto a concept. */
  | { type: 'try-pair'; leftId: string; rightId: string }
  | { type: 'clear-selection' }
  | { type: 'clear-feedback' }
  | { type: 'reset'; seed: number };

/** Mistakes on one example before its hint is shown. */
export const HINT_AFTER_MISTAKES = 1;
/** Mistakes on one example before its matching concept is gently highlighted. */
export const REVEAL_AFTER_MISTAKES = 2;

export function createMatchState(config: ConceptMatchConfig, seed: number): MatchState {
  const ids = config.pairs.map((p) => p.id);
  let rightOrder = seededShuffle(ids, seed * 7 + 3);
  // Avoid a layout where every row already lines up.
  if (ids.length > 1 && rightOrder.every((id, i) => id === ids[i])) rightOrder = [...rightOrder.slice(1), rightOrder[0]];
  return {
    leftOrder: seededShuffle(ids, seed),
    rightOrder,
    selectedLeft: null,
    selectedRight: null,
    matched: [],
    mistakes: 0,
    mistakesByPair: {},
    feedback: null,
    phase: 'playing',
  };
}

export function createMatchReducer(config: ConceptMatchConfig) {
  const valid = new Set(config.pairs.map((p) => p.id));
  const open = (state: MatchState, id: string) => state.phase === 'playing' && valid.has(id) && !state.matched.includes(id);
  return function matchReducer(state: MatchState, action: MatchAction): MatchState {
    switch (action.type) {
      case 'reset':
        return createMatchState(config, action.seed);
      case 'clear-feedback':
        return state.feedback ? { ...state, feedback: null } : state;
      case 'clear-selection':
        return state.selectedLeft || state.selectedRight || state.feedback ? { ...state, selectedLeft: null, selectedRight: null, feedback: null } : state;
      case 'try-pair':
        if (!open(state, action.leftId) || !open(state, action.rightId)) return state;
        return evaluate(state, action.leftId, action.rightId, config.pairs.length);
      case 'select-left':
      case 'select-right': {
        if (!open(state, action.id)) return state;
        const side = action.type === 'select-left' ? 'selectedLeft' : 'selectedRight';
        // Tapping the selected card again deselects it.
        const next: MatchState = { ...state, [side]: state[side] === action.id ? null : action.id, feedback: null };
        if (!next.selectedLeft || !next.selectedRight) return next;
        return evaluate(next, next.selectedLeft, next.selectedRight, config.pairs.length);
      }
      default:
        return state;
    }
  };
}

function evaluate(state: MatchState, leftId: string, rightId: string, total: number): MatchState {
  if (leftId === rightId) {
    const matched = [...state.matched, leftId];
    return {
      ...state,
      matched,
      selectedLeft: null,
      selectedRight: null,
      feedback: { kind: 'correct', leftId, rightId },
      phase: matched.length === total ? 'complete' : 'playing',
    };
  }
  return {
    ...state,
    selectedLeft: null,
    selectedRight: null,
    mistakes: state.mistakes + 1,
    mistakesByPair: { ...state.mistakesByPair, [leftId]: (state.mistakesByPair[leftId] ?? 0) + 1 },
    feedback: { kind: 'incorrect', leftId, rightId },
  };
}

/**
 * How much help an example has earned: 0 = none, 1 = show its hint,
 * 2 = also highlight its matching concept. Help grows only with mistakes.
 */
export function hintLevel(state: MatchState, leftId: string): 0 | 1 | 2 {
  const n = state.mistakesByPair[leftId] ?? 0;
  if (n >= REVEAL_AFTER_MISTAKES) return 2;
  return n >= HINT_AFTER_MISTAKES ? 1 : 0;
}

/** Next unmatched id moving `delta` rows from row `from` (no wrap), or null at the end of the column. */
export function stepUnmatched(order: readonly string[], matched: readonly string[], from: number, delta: 1 | -1): string | null {
  for (let i = from + delta; i >= 0 && i < order.length; i += delta) {
    if (!matched.includes(order[i])) return order[i];
  }
  return null;
}

/** The unmatched id closest to row `row` (ties go to the row above), or null when all are matched. */
export function nearestUnmatched(order: readonly string[], matched: readonly string[], row: number): string | null {
  for (let d = 0; d < order.length; d += 1) {
    for (const i of [row - d, row + d]) {
      if (i >= 0 && i < order.length && !matched.includes(order[i])) return order[i];
    }
  }
  return null;
}

/** Score = share of pairs matched without any mistake on that example. */
export function matchResult(config: ConceptMatchConfig, state: MatchState): GameResult {
  const total = config.pairs.length;
  const clean = config.pairs.filter((p) => state.matched.includes(p.id) && !state.mistakesByPair[p.id]).length;
  const completed = state.phase === 'complete';
  const plural = state.mistakes === 1 ? '' : 's';
  return {
    gameType: 'concept-match',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Matched ${state.matched.length} of ${total} pairs with ${state.mistakes} mistake${plural}`,
  };
}
