import type { SortGameConfig } from '../../domain/types';
import type { GameResult } from '../../domain/results';
import { seededShuffle } from '../../lib/ids';

/**
 * Sort game: items come one at a time; the learner puts each into the bin it
 * belongs in, by dragging it there or by tapping the bin (optionally tapping
 * the item first to pick it up). Wrong choices are counted and the item stays
 * to try again.
 */
export interface SortFeedback {
  kind: 'correct' | 'incorrect';
  itemId: string;
  binId: string;
}

export interface SortState {
  order: string[];
  selectedItem: string | null;
  placed: Record<string, string>;
  mistakes: number;
  mistakesByItem: Record<string, number>;
  feedback: SortFeedback | null;
  phase: 'playing' | 'complete';
}

export type SortAction =
  | { type: 'select-item'; id: string }
  /** Places the selected item. */
  | { type: 'place'; binId: string }
  /** A direct try with a given item, e.g. dropping a dragged item on a bin. */
  | { type: 'drop'; itemId: string; binId: string }
  | { type: 'reset'; seed: number };

export function createSortState(config: SortGameConfig, seed: number): SortState {
  return {
    order: seededShuffle(
      config.items.map((i) => i.id),
      seed,
    ),
    selectedItem: null,
    placed: {},
    mistakes: 0,
    mistakesByItem: {},
    feedback: null,
    phase: 'playing',
  };
}

/** The item to sort now: the first one in play order that is not placed yet (null when all are sorted). */
export function currentItem(state: SortState): string | null {
  return state.order.find((id) => !state.placed[id]) ?? null;
}

export function createSortReducer(config: SortGameConfig) {
  const items = new Map(config.items.map((i) => [i.id, i]));
  const bins = new Set(config.bins.map((b) => b.id));
  const open = (state: SortState, itemId: string) => state.phase === 'playing' && items.has(itemId) && !state.placed[itemId];

  function tryBin(state: SortState, itemId: string, binId: string): SortState {
    const item = items.get(itemId)!;
    if (item.binId === binId) {
      const placed = { ...state.placed, [item.id]: binId };
      return {
        ...state,
        placed,
        selectedItem: null,
        feedback: { kind: 'correct', itemId: item.id, binId },
        phase: Object.keys(placed).length === config.items.length ? 'complete' : 'playing',
      };
    }
    return {
      ...state,
      selectedItem: null,
      mistakes: state.mistakes + 1,
      mistakesByItem: { ...state.mistakesByItem, [item.id]: (state.mistakesByItem[item.id] ?? 0) + 1 },
      feedback: { kind: 'incorrect', itemId: item.id, binId },
    };
  }

  return function sortReducer(state: SortState, action: SortAction): SortState {
    switch (action.type) {
      case 'reset':
        return createSortState(config, action.seed);
      case 'select-item': {
        if (!open(state, action.id)) return state;
        return { ...state, selectedItem: state.selectedItem === action.id ? null : action.id, feedback: null };
      }
      case 'place': {
        if (!state.selectedItem || !open(state, state.selectedItem) || !bins.has(action.binId)) return state;
        return tryBin(state, state.selectedItem, action.binId);
      }
      case 'drop': {
        if (!open(state, action.itemId) || !bins.has(action.binId)) return state;
        return tryBin(state, action.itemId, action.binId);
      }
      default:
        return state;
    }
  };
}

export function sortResult(config: SortGameConfig, state: SortState): GameResult {
  const total = config.items.length;
  const clean = config.items.filter((i) => state.placed[i.id] && !state.mistakesByItem[i.id]).length;
  const completed = state.phase === 'complete';
  const plural = state.mistakes === 1 ? '' : 's';
  return {
    gameType: 'sort',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Sorted ${Object.keys(state.placed).length} of ${total} items with ${state.mistakes} mistake${plural}`,
  };
}
