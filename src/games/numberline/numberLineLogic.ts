import type { GameResult } from '../../domain/results';
import type { NumberLineConfig } from '../../domain/types';

/**
 * Number Line: put a marker on the right point of a number line, either a
 * number to find ("place") or where a jump from a start point lands ("jump").
 *
 * Every tick is a choosable point. Internally a point is its whole-number tick
 * index (0 = `from`), so decimals and fractions are compared exactly and never
 * as floating-point values.
 */
export type NumberLineRound = NumberLineConfig['rounds'][number];
export type NumberFormat = NonNullable<NumberLineRound['format']>;

export interface NumberLineState {
  round: number;
  /** Tick index of the chosen point, or null until one is chosen. */
  chosen: number | null;
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
  /** Tick index at the latest wrong Check this round (drives the first nudge). */
  lastWrong: number | null;
}

export type NumberLineAction =
  | { type: 'choose'; index: number }
  /** A slider key (arrows, Page Up/Down, Home, End), applied to the latest marker position. */
  | { type: 'key'; key: string }
  | { type: 'check' }
  | { type: 'next' }
  | { type: 'reset' };

export const initialNumberLineState: NumberLineState = { round: 0, chosen: null, mistakesByRound: {}, mistakes: 0, phase: 'playing', lastWrong: null };

/* ------------------------------------------------------------- index maths */

/** Number of ticks on the line, both ends included. */
export const tickCount = (round: NumberLineRound): number => Math.max(2, Math.round((round.to - round.from) / round.step) + 1);

/** The tick index nearest to a value (index 0 is `from`). */
export const indexOf = (round: NumberLineRound, value: number): number => Math.round((value - round.from) / round.step);

/** The value at a tick, tidied so 0.1 * 7 reads 0.7 rather than 0.7000000000000001. */
export const valueAt = (round: NumberLineRound, index: number): number => tidy(round.from + index * round.step);

export const targetIndex = (round: NumberLineRound): number => indexOf(round, round.target);

/** Where a jump starts; null for "place" rounds. */
export const startIndex = (round: NumberLineRound): number | null => (round.mode === 'jump' ? indexOf(round, round.start ?? round.from) : null);

const clampIndex = (round: NumberLineRound, index: number) => Math.min(tickCount(round) - 1, Math.max(0, index));

function tidy(n: number): number {
  const t = Number(n.toPrecision(12));
  return Object.is(t, -0) ? 0 : t;
}

/* -------------------------------------------------------------- formatting */

/** A real minus sign, which reads better than a hyphen for young learners. */
export const MINUS = '−';

/** Writes a number the way the round asks: whole, decimal with fixed places, or k/denominator. */
export function formatValue(value: number, format: NumberFormat = { kind: 'integer' }): string {
  if (format.kind === 'fraction') {
    const d = Math.max(1, Math.round(format.denominator));
    const k = Math.round(value * d);
    if (k === 0) return '0';
    const sign = k < 0 ? MINUS : '';
    return k % d === 0 ? `${sign}${Math.abs(k / d)}` : `${sign}${Math.abs(k)}/${d}`;
  }
  if (format.kind === 'decimal') {
    const places = Math.max(0, Math.round(format.places));
    const rounded = Number(value.toFixed(places));
    return `${rounded < 0 ? MINUS : ''}${Math.abs(rounded).toFixed(places)}`;
  }
  const n = tidy(value);
  const abs = Math.abs(n);
  // Indian place-value commas for big numbers (10,000 and 1,00,000), as in the lesson text. Smaller numbers and years stay plain.
  return `${n < 0 ? MINUS : ''}${abs >= 10000 && Number.isInteger(abs) ? abs.toLocaleString('en-IN') : abs}`;
}

export const formatTick = (round: NumberLineRound, index: number): string => formatValue(valueAt(round, index), round.format);

/** The size of a jump between two ticks, signed: "+4", "−3", "+1/4". Empty for no jump. */
export function formatJump(round: NumberLineRound, fromIndex: number, toIndex: number): string {
  if (toIndex === fromIndex) return '';
  const diff = tidy((toIndex - fromIndex) * round.step);
  return `${diff > 0 ? '+' : MINUS}${formatValue(Math.abs(diff), round.format)}`;
}

/* ------------------------------------------------------------------ layout */

/** SVG geometry, in viewBox units. The line runs from X0 to X1. */
export const VIEW_W = 340;
export const LINE_X0 = 24;
export const LINE_X1 = VIEW_W - 24;
export const LABEL_FONT = 16;
/** Never more labels than this, so a phone-width line stays readable. */
export const MAX_LABELS = 11;

export const tickX = (round: NumberLineRound, index: number): number => LINE_X0 + (index / (tickCount(round) - 1)) * (LINE_X1 - LINE_X0);

/** The tick nearest to an x position (viewBox units), for tapping and dragging. */
export const nearestIndex = (round: NumberLineRound, x: number): number => clampIndex(round, Math.round(((x - LINE_X0) / (LINE_X1 - LINE_X0)) * (tickCount(round) - 1)));

/** Rough rendered width of a label in viewBox units (bold rounded digits). */
export function labelWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += ch === '.' ? 0.28 : ch === '/' ? 0.38 : 0.6;
  return em * LABEL_FONT;
}

/**
 * Which ticks get a printed label: every `stride`-th tick from `from`. Starts at
 * the round's `labelEvery` and labels fewer (a multiple of it) when the labels
 * would be more than MAX_LABELS or wider than the space between them. Prefers a
 * stride that also labels the far end and 0 (when 0 is on the line).
 */
export function labelStride(round: NumberLineRound): number {
  const last = tickCount(round) - 1;
  const base = Math.max(1, Math.round(round.labelEvery ?? 1));
  const spacing = (LINE_X1 - LINE_X0) / last;
  const zero = indexOf(round, 0);
  const zeroOnLine = zero > 0 && zero < last && Math.abs(valueAt(round, zero)) < round.step / 2;
  let widest = 0;
  for (let i = 0; i <= last; i += 1) widest = Math.max(widest, labelWidth(formatTick(round, i)));
  const fits = (s: number) => Math.floor(last / s) + 1 <= MAX_LABELS && s * spacing >= widest + 4;
  let endsOnly: number | null = null;
  let any: number | null = null;
  for (let s = base; s <= Math.max(base, last); s += base) {
    if (!fits(s)) continue;
    any ??= s;
    if (last % s !== 0) continue;
    if (!zeroOnLine || zero % s === 0) return s;
    endsOnly ??= s;
  }
  return endsOnly ?? any ?? Math.max(base, last);
}

export const isLabelled = (index: number, stride: number) => index % stride === 0;

/* -------------------------------------------------------------- game rules */

/** The marker can move while playing and straight after a wrong Check. */
export const canChoose = (state: NumberLineState) => state.phase === 'playing' || state.phase === 'incorrect';

/** Check needs a chosen point, and a move since the last wrong Check. */
export const canCheck = (state: NumberLineState) => state.phase === 'playing' && state.chosen !== null;

export const currentRound = (config: NumberLineConfig, state: NumberLineState): NumberLineRound => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** Wrong Checks so far in this round; the second one unlocks the round's own hint. */
export const wrongChecks = (state: NumberLineState, round: NumberLineRound) => state.mistakesByRound[round.id] ?? 0;

/**
 * Where the arrow keys take the marker. Left/Right (and Down/Up) move one tick,
 * PageUp/PageDown one labelled step, Home/End to the ends. With nothing chosen
 * a jump starts from its start point; a "place" line enters from the near end.
 */
export function keyIndex(round: NumberLineRound, chosen: number | null, key: string): number | null {
  const last = tickCount(round) - 1;
  const base = chosen ?? startIndex(round);
  const page = labelStride(round);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return base === null ? 0 : clampIndex(round, base + 1);
    case 'ArrowLeft':
    case 'ArrowDown':
      return base === null ? last : clampIndex(round, base - 1);
    case 'PageUp':
      return base === null ? 0 : clampIndex(round, base + page);
    case 'PageDown':
      return base === null ? last : clampIndex(round, base - page);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}

/** A short nudge about a wrong point: which way to move, or how the jump went wrong. */
export function nudge(round: NumberLineRound, tried: number): string | null {
  const target = targetIndex(round);
  if (tried === target) return null;
  const start = startIndex(round);
  if (start !== null && start !== target) {
    const want = target - start;
    const made = tried - start;
    const way = want > 0 ? 'forward' : 'back';
    if (made === 0) return `You have not jumped yet. Jump ${way}.`;
    if (Math.sign(made) !== Math.sign(want)) return `Wrong way. Jump ${way}.`;
    return Math.abs(made) > Math.abs(want) ? 'You jumped too far.' : 'You did not jump far enough.';
  }
  return tried > target ? 'Too far right. Move left.' : 'Too far left. Move right.';
}

export interface NumberLineHint {
  /** 1 = short nudge about the point just checked, 2 = the round's own hint. */
  level: 1 | 2;
  text: string;
}

/**
 * One hint line after a wrong Check: first a nudge about the point that was
 * checked, then the round's own hint. It never depends on where the marker is
 * now, so it cannot give the answer away.
 */
export function numberLineHint(round: NumberLineRound, lastWrong: number | null, wrong: number): NumberLineHint | null {
  if (wrong < 1) return null;
  const text = wrong === 1 && lastWrong !== null ? nudge(round, lastWrong) : null;
  return text ? { level: 1, text } : { level: 2, text: round.hint };
}

export function createNumberLineReducer(config: NumberLineConfig) {
  return function numberLineReducer(state: NumberLineState, action: NumberLineAction): NumberLineState {
    const round = config.rounds[state.round];
    const choose = (index: number | null): NumberLineState => {
      if (!round || !canChoose(state) || index === null) return state;
      if (!Number.isInteger(index) || index < 0 || index >= tickCount(round) || index === state.chosen) return state;
      return { ...state, chosen: index, phase: 'playing' };
    };
    switch (action.type) {
      case 'choose':
        return choose(action.index);
      case 'key':
        return round ? choose(keyIndex(round, state.chosen, action.key)) : state;
      case 'check': {
        if (!round || !canCheck(state)) return state;
        if (state.chosen === targetIndex(round)) return { ...state, phase: 'correct', lastWrong: null };
        return {
          ...state,
          phase: 'incorrect',
          lastWrong: state.chosen,
          mistakes: state.mistakes + 1,
          mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        const last = state.round >= config.rounds.length - 1;
        return last ? { ...state, phase: 'complete' } : { ...state, round: state.round + 1, chosen: null, phase: 'playing', lastWrong: null };
      }
      case 'reset':
        return initialNumberLineState;
      default:
        return state;
    }
  };
}

export function numberLineResult(config: NumberLineConfig, state: NumberLineState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'number-line',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Found ${completed ? total : state.round} of ${total} points on the number line with ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}`,
  };
}

export interface RoundOutcome {
  id: string;
  prompt: string;
  /** The answer, written in the round's format. */
  answer: string;
  firstTry: boolean;
  wrong: number;
}

/** Per-round summary for the completion card. */
export const roundOutcomes = (config: NumberLineConfig, state: NumberLineState): RoundOutcome[] =>
  config.rounds.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    answer: formatValue(r.target, r.format),
    firstTry: !state.mistakesByRound[r.id],
    wrong: state.mistakesByRound[r.id] ?? 0,
  }));
