import type { GameResult } from '../../domain/results';
import type { WordOrderConfig } from '../../domain/types';

/**
 * Sentence Builder state machine.
 *
 *   building -> (check) -> correct -> (next) -> building ... -> finished
 *                       -> wrong   -> (edit) -> building
 *
 * Each round shows the sentence's words (and any distractor tiles) shuffled in
 * a tray. The learner places tiles into the sentence strip, then checks.
 * Hints get stronger: the first wrong check marks the first wrong word; from
 * the second, the correct beginning stays and the rest goes back to the tray.
 */

export type WordOrderRound = WordOrderConfig['rounds'][number];

export interface Tile {
  id: string;
  text: string;
}

export interface RoundResult {
  roundId: string;
  firstTry: boolean;
  wrongChecks: number;
}

export interface WordOrderState {
  roundIndex: number;
  tiles: Tile[];
  /** Tile ids in the sentence strip, in order. */
  placed: string[];
  status: 'building' | 'wrong' | 'correct' | 'finished';
  wrongChecks: number;
  /** Index of the first wrong word after a wrong check (for highlighting). */
  firstWrong: number | null;
  results: RoundResult[];
}

export type WordOrderAction =
  | { type: 'place'; tileId: string; at?: number }
  | { type: 'remove'; tileId: string }
  | { type: 'clear' }
  | { type: 'check' }
  | { type: 'next' };

const PUNCTUATION = /^[.?!,]$/;

/** Joins tiles into readable text: no space before punctuation. */
export function sentenceText(words: string[]): string {
  return words.reduce((out, w, i) => (i === 0 ? w : PUNCTUATION.test(w) ? out + w : `${out} ${w}`), '');
}

/** Small deterministic PRNG so a replay gets a different, reproducible shuffle. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tiles for a round, shuffled so they never start in the right order. */
export function roundTiles(round: WordOrderRound, seed: number): Tile[] {
  const tiles: Tile[] = [...round.words.map((text, i) => ({ id: `${round.id}-w${i}`, text })), ...(round.distractors ?? []).map((text, i) => ({ id: `${round.id}-d${i}`, text }))];
  const rand = mulberry32(seed);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const inOrder = round.words.every((w, i) => tiles[i]?.text === w);
  return inOrder ? [...tiles.slice(1), tiles[0]] : tiles;
}

/** True when the words form the sentence (or one of its accepted alternatives). Capital letters and punctuation count. */
export function isCorrectOrder(round: WordOrderRound, words: string[]): boolean {
  return [round.words, ...(round.alsoAccept ?? [])].some((answer) => answer.length === words.length && answer.every((w, i) => w === words[i]));
}

/** Index of the first word that differs from the main answer (or the first missing position). */
export function firstWrongIndex(round: WordOrderRound, words: string[]): number {
  const i = round.words.findIndex((w, k) => words[k] !== w);
  return i === -1 ? words.length : i;
}

/**
 * Where a dragged tile lands in the sentence strip: the number of placed tiles
 * that come before the pointer, reading the (possibly wrapped) strip line by line.
 */
export function insertIndex(rects: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>[], x: number, y: number): number {
  return rects.filter((r) => r.bottom < y || (y >= r.top && y <= r.bottom && (r.left + r.right) / 2 < x)).length;
}

export function wordOrderResult(config: WordOrderConfig, state: WordOrderState): GameResult {
  const correct = state.results.filter((r) => r.firstTry).length;
  const total = config.rounds.length;
  const mistakes = state.results.reduce((n, r) => n + r.wrongChecks, 0);
  return {
    gameType: 'word-order',
    score: total ? correct / total : 1,
    correct,
    total,
    mistakes,
    completed: true,
    perfect: mistakes === 0,
    summary: `Built ${total} sentences, ${correct} right on the first try`,
  };
}

export function createWordOrder(config: WordOrderConfig, attempt: number) {
  const seedFor = (roundIndex: number) => attempt * 7919 + roundIndex * 104729 + 17;
  const initial: WordOrderState = {
    roundIndex: 0,
    tiles: roundTiles(config.rounds[0], seedFor(0)),
    placed: [],
    status: 'building',
    wrongChecks: 0,
    firstWrong: null,
    results: [],
  };

  function reducer(state: WordOrderState, action: WordOrderAction): WordOrderState {
    const round = config.rounds[state.roundIndex];
    const editable = state.status === 'building' || state.status === 'wrong';
    const textOf = (id: string) => state.tiles.find((t) => t.id === id)?.text ?? '';
    switch (action.type) {
      case 'place': {
        if (!editable || state.placed.includes(action.tileId) || !state.tiles.some((t) => t.id === action.tileId)) return state;
        const at = Math.max(0, Math.min(action.at ?? state.placed.length, state.placed.length));
        const placed = [...state.placed.slice(0, at), action.tileId, ...state.placed.slice(at)];
        return { ...state, placed, status: 'building', firstWrong: null };
      }
      case 'remove': {
        if (!editable || !state.placed.includes(action.tileId)) return state;
        return { ...state, placed: state.placed.filter((id) => id !== action.tileId), status: 'building', firstWrong: null };
      }
      case 'clear':
        if (!editable) return state;
        return { ...state, placed: [], status: 'building', firstWrong: null };
      case 'check': {
        if (!editable || state.placed.length === 0) return state;
        const words = state.placed.map(textOf);
        if (isCorrectOrder(round, words)) {
          return {
            ...state,
            status: 'correct',
            firstWrong: null,
            results: [...state.results, { roundId: round.id, firstTry: state.wrongChecks === 0, wrongChecks: state.wrongChecks }],
          };
        }
        const wrongChecks = state.wrongChecks + 1;
        const firstWrong = firstWrongIndex(round, words);
        // From the second wrong check, keep the correct beginning and send the rest back.
        const placed = wrongChecks >= 2 ? state.placed.slice(0, firstWrong) : state.placed;
        return { ...state, status: 'wrong', wrongChecks, firstWrong, placed };
      }
      case 'next': {
        if (state.status !== 'correct') return state;
        const roundIndex = state.roundIndex + 1;
        if (roundIndex >= config.rounds.length) return { ...state, status: 'finished' };
        return { ...state, roundIndex, tiles: roundTiles(config.rounds[roundIndex], seedFor(roundIndex)), placed: [], status: 'building', wrongChecks: 0, firstWrong: null };
      }
      default:
        return state;
    }
  }

  return { initial, reducer };
}
