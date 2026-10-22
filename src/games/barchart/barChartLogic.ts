import type { GameResult } from '../../domain/results';
import type { BarChartConfig } from '../../domain/types';

/**
 * Bar Chart Builder: two kinds of round on one value scale (0..max in steps of `step`).
 *  - build: every bar starts at 0; set each bar to the value in the table.
 *  - read: the bars are drawn from the data; tap the category that answers the question.
 * A round is right when every bar matches the table (build) or the chosen bar is the answer (read).
 */

export type BarRound = BarChartConfig['rounds'][number];
export type BarCategory = BarRound['categories'][number];

/** What the learner had at a Check: the bar heights (build) and the chosen category (read). */
export interface BarAttempt {
  bars: number[];
  chosen: string | null;
}

export interface BarChartState {
  round: number;
  /** Build rounds: the learner's bar heights, one per category (all 0 at the start of a round). */
  bars: number[];
  /** Read rounds: the category the learner picked. */
  chosen: string | null;
  /** A bar was moved this round, so Check has something to look at. */
  touched: boolean;
  /** The attempt at the latest wrong Check this round (drives the data nudge). */
  checked: BarAttempt | null;
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
}

export type BarChartAction =
  /** Sets one bar; the value is snapped to the scale. */
  | { type: 'set'; index: number; value: number }
  /** Moves one bar up (+) or down (−) by whole steps of the scale. */
  | { type: 'step'; index: number; steps: number }
  | { type: 'choose'; id: string }
  | { type: 'check' }
  | { type: 'next' }
  | { type: 'reset' };

/* ------------------------------------------------------------------ the scale */

const tidy = (n: number) => Math.round(n * 1e6) / 1e6;

/** The highest value the scale can show: max, or the last whole step below it. */
export const topValue = (step: number, max: number) => (step > 0 ? tidy(Math.floor(tidy(max / step)) * step) : max);

/** Rounds a raw value to the nearest step of the scale and keeps it between 0 and the top. */
export function snapToStep(raw: number, step: number, max: number): number {
  if (!Number.isFinite(raw) || step <= 0) return 0;
  const snapped = tidy(Math.round(raw / step) * step);
  return Math.min(Math.max(snapped, 0), topValue(step, max));
}

/** Bar value for a pointer at `fraction` of the plot height (0 = baseline, 1 = top of the scale). */
export const valueAt = (fraction: number, step: number, max: number) => snapToStep(fraction * max, step, max);

/** Every gridline value: 0, step, 2·step … up to the top of the scale. */
export function ticks(step: number, max: number): number[] {
  const top = topValue(step, max);
  if (step <= 0 || top <= 0) return [0];
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => tidy(i * step));
}

/** Label every n-th gridline so a long scale (e.g. 0..20 in ones) keeps readable numbers. */
export const tickLabelEvery = (step: number, max: number) => Math.max(1, Math.ceil((ticks(step, max).length - 1) / 10));

export const formatValue = (n: number) => String(tidy(n));

/* ------------------------------------------------------------------ rounds */

export const zeroBars = (round: BarRound | undefined) => (round ? round.categories.map(() => 0) : []);

/** The table value for a category (missing data counts as 0). */
export const tableValue = (round: BarRound, index: number) => round.values[index] ?? 0;

export const currentRound = (config: BarChartConfig, state: BarChartState): BarRound => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** Build: the first bar that does not match the table, or null when every bar is right. */
export function firstWrongBar(round: BarRound, bars: number[]): number | null {
  const i = round.categories.findIndex((_, k) => (bars[k] ?? 0) !== tableValue(round, k));
  return i === -1 ? null : i;
}

export const isBuildRight = (round: BarRound, bars: number[]) => firstWrongBar(round, bars) === null;

export const isReadRight = (round: BarRound, chosen: string | null) => chosen !== null && round.answerId !== undefined && chosen === round.answerId;

export const isRight = (round: BarRound, attempt: BarAttempt) => (round.mode === 'build' ? isBuildRight(round, attempt.bars) : isReadRight(round, attempt.chosen));

/** Bars and choices can change while playing and straight after a wrong Check. */
export const canEdit = (state: BarChartState) => state.phase === 'playing' || state.phase === 'incorrect';

/** Check needs a move (build) or a choice (read), made since the last wrong Check. */
export const canCheck = (round: BarRound, state: BarChartState) => state.phase === 'playing' && (round.mode === 'build' ? state.touched : state.chosen !== null);

/** Wrong Checks so far in this round; the second one unlocks the round's own hint. */
export const wrongChecks = (state: BarChartState, round: BarRound) => state.mistakesByRound[round.id] ?? 0;

/* ------------------------------------------------------------------ hints */

// Superlatives only: "2 more than Apple" is not a question about the tallest bar.
const ASKS_MOST = /\b(most|tallest|highest|biggest|largest|greatest|longest|favou?rite|popular)\b/i;
const ASKS_LEAST = /\b(least|fewest|shortest|lowest|smallest)\b/i;

/** Index of the single tallest (or shortest) bar, or null when two bars tie. */
function onlyExtreme(values: number[], kind: 'max' | 'min'): number | null {
  if (values.length === 0) return null;
  const target = kind === 'max' ? Math.max(...values) : Math.min(...values);
  const hits = values.flatMap((v, i) => (v === target ? [i] : []));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Read rounds: say what the chosen bar shows, then point at the bar to look for, but
 * only when the data proves the question is about the tallest or shortest bar.
 */
export function readNudge(round: BarRound, chosen: string): string {
  const index = round.categories.findIndex((c) => c.id === chosen);
  const values = round.categories.map((_, i) => tableValue(round, i));
  const answer = round.categories.findIndex((c) => c.id === round.answerId);
  const said = index >= 0 ? `The bar for ${round.categories[index].label} reaches ${formatValue(values[index])}. ` : '';
  const least = ASKS_LEAST.test(round.prompt);
  if (answer >= 0 && least && onlyExtreme(values, 'min') === answer) return `${said}Look again: which bar is the shortest?`;
  if (answer >= 0 && !least && ASKS_MOST.test(round.prompt) && onlyExtreme(values, 'max') === answer) return `${said}Look again: which bar is the tallest?`;
  return `${said}Compare the bar heights carefully.`;
}

/** Build rounds: name the first bar that does not match the table. */
export function buildNudge(round: BarRound, bars: number[]): string | null {
  const i = firstWrongBar(round, bars);
  if (i === null) return null;
  return `The bar for ${round.categories[i].label} is ${formatValue(bars[i] ?? 0)}, but the table says ${formatValue(tableValue(round, i))}.`;
}

export interface BarHint {
  /** 1 = a nudge from the data, 2 = the round's own hint. */
  level: 1 | 2;
  text: string;
}

/** One-line hint after a wrong Check: first a nudge from the data, then the round's hint. */
export function roundHint(round: BarRound, checked: BarAttempt | null, wrong: number): BarHint | null {
  if (wrong < 1 || !checked || isRight(round, checked)) return null;
  if (wrong === 1) {
    const nudge = round.mode === 'build' ? buildNudge(round, checked.bars) : checked.chosen !== null ? readNudge(round, checked.chosen) : null;
    if (nudge) return { level: 1, text: nudge };
  }
  return { level: 2, text: round.hint };
}

/* ------------------------------------------------------------------ the game */

export function initialBarChartState(config: BarChartConfig): BarChartState {
  return { round: 0, bars: zeroBars(config.rounds[0]), chosen: null, touched: false, checked: null, mistakesByRound: {}, mistakes: 0, phase: 'playing' };
}

function setBar(state: BarChartState, round: BarRound | undefined, config: BarChartConfig, index: number, value: number): BarChartState {
  if (!round || round.mode !== 'build' || !canEdit(state) || !Number.isInteger(index) || index < 0 || index >= round.categories.length) return state;
  const next = snapToStep(value, config.step, config.max);
  if ((state.bars[index] ?? 0) === next) return state;
  const bars = round.categories.map((_, i) => (i === index ? next : (state.bars[i] ?? 0)));
  return { ...state, bars, touched: true, phase: 'playing' };
}

export function createBarChartReducer(config: BarChartConfig) {
  return function barChartReducer(state: BarChartState, action: BarChartAction): BarChartState {
    const round = config.rounds[state.round];
    switch (action.type) {
      case 'set':
        return setBar(state, round, config, action.index, action.value);
      case 'step':
        return setBar(state, round, config, action.index, (state.bars[action.index] ?? 0) + action.steps * config.step);
      case 'choose':
        if (!round || round.mode !== 'read' || !canEdit(state)) return state;
        if (!round.categories.some((c) => c.id === action.id)) return state;
        return { ...state, chosen: action.id, phase: 'playing' };
      case 'check': {
        if (!round || !canCheck(round, state)) return state;
        const attempt: BarAttempt = { bars: state.bars, chosen: state.chosen };
        if (isRight(round, attempt)) return { ...state, phase: 'correct', checked: null };
        return {
          ...state,
          phase: 'incorrect',
          checked: attempt,
          mistakes: state.mistakes + 1,
          mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        if (state.round >= config.rounds.length - 1) return { ...state, phase: 'complete' };
        const nextRound = state.round + 1;
        return { ...state, round: nextRound, bars: zeroBars(config.rounds[nextRound]), chosen: null, touched: false, checked: null, phase: 'playing' };
      }
      case 'reset':
        return initialBarChartState(config);
      default:
        return state;
    }
  };
}

export function barChartResult(config: BarChartConfig, state: BarChartState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'bar-chart',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Finished ${completed ? total : state.round} of ${total} chart tasks with ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}`,
  };
}

export interface RoundOutcome {
  id: string;
  mode: BarRound['mode'];
  prompt: string;
  firstTry: boolean;
  wrong: number;
}

/** Per-round summary for the completion card. */
export const roundOutcomes = (config: BarChartConfig, state: BarChartState): RoundOutcome[] =>
  config.rounds.map((r) => ({ id: r.id, mode: r.mode, prompt: r.prompt, firstTry: !state.mistakesByRound[r.id], wrong: state.mistakesByRound[r.id] ?? 0 }));
