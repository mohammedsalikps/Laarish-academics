import type { GameResult } from '../../domain/results';
import type { FractionBuilderConfig } from '../../domain/types';

/**
 * Fraction builder: tap (or paint across) equal pieces of a shape to shade a
 * target fraction. Any pieces may be shaded; the answer is right when the
 * number of shaded pieces equals the round's numerator.
 */
export type FractionRound = FractionBuilderConfig['rounds'][number];

export interface FractionState {
  round: number;
  shaded: number[];
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
  /** Pieces that were shaded at the latest wrong Check this round (drives the comparison nudge). */
  lastWrong: number | null;
  /** The learner has shaded a piece at least once (hides the "Start here" cue). */
  started: boolean;
}

export type FractionAction =
  | { type: 'toggle'; piece: number }
  /** Sets one piece on or off; used while painting across pieces. */
  | { type: 'paint'; piece: number; on: boolean }
  | { type: 'clear' }
  | { type: 'check' }
  | { type: 'next' }
  | { type: 'reset' };

export const initialFractionState: FractionState = { round: 0, shaded: [], mistakesByRound: {}, mistakes: 0, phase: 'playing', lastWrong: null, started: false };

/** Shading can change while playing and straight after a wrong Check. */
export const canShade = (state: FractionState) => state.phase === 'playing' || state.phase === 'incorrect';

/** Check needs something shaded, and a change since the last wrong Check. */
export const canCheck = (state: FractionState) => state.phase === 'playing' && state.shaded.length > 0;

export const currentRound = (config: FractionBuilderConfig, state: FractionState): FractionRound => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** Wrong Checks so far in this round; each one unlocks a more specific hint. */
export const wrongChecks = (state: FractionState, round: FractionRound) => state.mistakesByRound[round.id] ?? 0;

function setPiece(state: FractionState, round: FractionRound | undefined, piece: number, on: boolean): FractionState {
  if (!round || !canShade(state) || !Number.isInteger(piece) || piece < 0 || piece >= round.parts) return state;
  if (state.shaded.includes(piece) === on) return state;
  const shaded = on ? [...state.shaded, piece].sort((a, b) => a - b) : state.shaded.filter((p) => p !== piece);
  return { ...state, shaded, phase: 'playing', started: true };
}

export function createFractionReducer(config: FractionBuilderConfig) {
  return function fractionReducer(state: FractionState, action: FractionAction): FractionState {
    const round = config.rounds[state.round];
    switch (action.type) {
      case 'toggle':
        return setPiece(state, round, action.piece, !state.shaded.includes(action.piece));
      case 'paint':
        return setPiece(state, round, action.piece, action.on);
      case 'clear':
        if (!canShade(state) || state.shaded.length === 0) return state;
        return { ...state, shaded: [], phase: 'playing' };
      case 'check': {
        if (!round || !canCheck(state)) return state;
        if (state.shaded.length === round.numerator) return { ...state, phase: 'correct', lastWrong: null };
        return {
          ...state,
          phase: 'incorrect',
          lastWrong: state.shaded.length,
          mistakes: state.mistakes + 1,
          mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        const last = state.round >= config.rounds.length - 1;
        return last ? { ...state, phase: 'complete' } : { ...state, round: state.round + 1, shaded: [], phase: 'playing', lastWrong: null };
      }
      case 'reset':
        return initialFractionState;
      default:
        return state;
    }
  };
}

export function fractionResult(config: FractionBuilderConfig, state: FractionState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'fraction-builder',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Shaded ${completed ? total : state.round} of ${total} fractions with ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}`,
  };
}

/* ------------------------------------------------------------ fraction maths */

export interface Fraction {
  numerator: number;
  denominator: number;
}

const frac = (numerator: number, denominator: number): Fraction => ({ numerator, denominator });

export function gcd(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function simplify({ numerator, denominator }: Fraction): Fraction {
  const g = gcd(numerator, denominator);
  return frac(numerator / g, denominator / g);
}

export const formatFraction = (f: Fraction) => `${f.numerator}/${f.denominator}`;

/** -1, 0 or 1 as a is less than, equal to or more than b. */
export function compareFractions(a: Fraction, b: Fraction): -1 | 0 | 1 {
  const d = a.numerator * b.denominator - b.numerator * a.denominator;
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const PART_NAMES: Record<number, [one: string, many: string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['quarter', 'quarters'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'],
  11: ['eleventh', 'elevenths'],
  12: ['twelfth', 'twelfths'],
};

/** Reads a fraction in its simplest form: 2/4 is "one half", 2/2 is "one whole". */
export function fractionName(f: Fraction): string {
  const { numerator: n, denominator: d } = simplify(f);
  const count = NUMBER_WORDS[n] ?? String(n);
  if (n === 0) return 'zero';
  if (d === 1) return n === 1 ? 'one whole' : `${count} wholes`;
  const names = PART_NAMES[d];
  return names ? `${count} ${n === 1 ? names[0] : names[1]}` : formatFraction(f);
}

/**
 * The fraction a round asks for, written the way the child should read it: the
 * prompt's own "n/d" when it has one (e.g. "Shade the whole roti (2/2)"),
 * otherwise the simplest form, so "shade half of 4 pieces" targets 1/2 and the
 * child has to see that 2/4 is the same amount.
 */
export function targetFraction(round: FractionRound): Fraction {
  const asked = frac(round.numerator, round.parts);
  if (round.prompt.includes(formatFraction(asked))) return asked;
  const simplest = simplify(asked);
  return simplest.denominator === 1 ? asked : simplest;
}

/** Live readout words: "2 of 4 equal parts shaded". */
export const shadedWords = (shaded: number, parts: number) => `${shaded} of ${parts} ${parts === 1 ? 'part' : 'equal parts'} shaded`;

export const SHAPE_NOUN: Record<FractionRound['shape'], string> = { circle: 'roti', bar: 'chocolate bar' };

/** The "Equal parts?" answer, in one sentence: every part is the same unit fraction of the whole. */
export function equalPartsNote(round: FractionRound): string {
  const same = round.parts === 2 ? 'Both parts are the same size' : `All ${round.parts} parts are the same size`;
  return `Yes! ${same}, so each is ${formatFraction(frac(1, round.parts))} of the ${SHAPE_NOUN[round.shape]}.`;
}

export interface RoundHint {
  /** 1 = short nudge (more or less than the target), 2 = the round's own hint, 3 = exactly how many to shade. */
  level: 1 | 2 | 3;
  relation: 'more' | 'less';
  /** The one line shown to the child. */
  text: string;
}

/**
 * Hint after a wrong Check, one line at a time. `made` is how many pieces were
 * shaded at that Check; `wrong` is how many wrong Checks this round so far.
 */
export function roundHint(round: FractionRound, made: number | null, wrong: number): RoundHint | null {
  if (made === null || wrong < 1 || made === round.numerator) return null;
  const level = Math.min(wrong, 3) as RoundHint['level'];
  const relation = made > round.numerator ? 'more' : 'less';
  const text =
    level === 1
      ? `${formatFraction(frac(made, round.parts))} is ${relation} than ${formatFraction(targetFraction(round))}. ${relation === 'more' ? 'Un-shade some parts.' : 'Shade more parts.'}`
      : level === 2
        ? round.hint
        : `Shade exactly ${round.numerator} of the ${round.parts} parts.`;
  return { level, relation, text };
}

export interface RoundOutcome {
  id: string;
  target: Fraction;
  firstTry: boolean;
  wrong: number;
}

/** Per-round summary for the completion card. */
export const roundOutcomes = (config: FractionBuilderConfig, state: FractionState): RoundOutcome[] =>
  config.rounds.map((r) => ({ id: r.id, target: targetFraction(r), firstTry: !state.mistakesByRound[r.id], wrong: state.mistakesByRound[r.id] ?? 0 }));
