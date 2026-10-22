import type { GameResult } from '../../domain/results';
import type { ClockConfig } from '../../domain/types';

/**
 * Clock Setter: move the hands of an analogue clock to show a time.
 *
 * The learner's time is one number of minutes since 12:00. It is never wrapped
 * while playing, so the hands keep turning the same way (11:55 + 5 minutes is
 * 720, drawn as one more turn of the minute hand); `clockTime` reads it as a
 * 12-hour time. The minute hand points at `time * 6` degrees and the hour hand
 * at `time / 2` degrees, so the hour hand moves smoothly with the minutes:
 * at 3:30 it is halfway between 3 and 4.
 */

export type ClockRound = ClockConfig['rounds'][number];
export type MinuteStep = ClockConfig['minuteStep'];

/** Minutes on a 12-hour clock face. */
export const HALF_DAY = 12 * 60;

export interface ClockState {
  round: number;
  /** Minutes since 12:00, unwrapped (may be negative or past 720); always a multiple of minuteStep. */
  time: number;
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'incorrect' | 'complete';
  /** The time shown at the latest wrong Check this round (drives the nudge). */
  lastWrong: number | null;
  /** The hands have moved this round (Check needs a move first, and the "drag me" cue goes). */
  started: boolean;
}

export type ClockAction =
  /** Sets the time, e.g. from a drag; snapped to the minute step. */
  | { type: 'set'; time: number }
  /** Moves the time on (or back, when negative) by some minutes: the step buttons and keys. */
  | { type: 'shift'; minutes: number }
  | { type: 'check' }
  | { type: 'next' }
  | { type: 'reset' };

/* -------------------------------------------------------------- time maths */

/** The time on the clock face, 0 (12:00) to 719 (11:59). */
export const wrapTime = (time: number) => ((time % HALF_DAY) + HALF_DAY) % HALF_DAY;

/** Nearest multiple of the step (not wrapped). */
export const snapTime = (time: number, step: MinuteStep) => Math.round(time / step) * step || 0;

/** Reads minutes since 12:00 as a 12-hour time: hour 1-12, minute 0-59. */
export function clockTime(time: number): { hour: number; minute: number } {
  const t = wrapTime(Math.round(time));
  const hour = Math.floor(t / 60);
  return { hour: hour === 0 ? 12 : hour, minute: t % 60 };
}

/** Minutes since 12:00 for an hour (1-12) and minute. */
export const toTime = (hour: number, minute: number) => (hour % 12) * 60 + minute;

/** The time a round asks for. */
export const targetTime = (round: ClockRound) => toTime(round.hour, round.minute);

/** Digital readout: "3:30", "12:05". */
export function formatTime(time: number): string {
  const { hour, minute } = clockTime(time);
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

const nextHour = (hour: number) => (hour % 12) + 1;

/** The time in words for o'clock, quarter past, half past and quarter to; null for other minutes. */
export function timeWords(time: number): string | null {
  const { hour, minute } = clockTime(time);
  switch (minute) {
    case 0:
      return `${hour} o'clock`;
    case 15:
      return `quarter past ${hour}`;
    case 30:
      return `half past ${hour}`;
    case 45:
      return `quarter to ${nextHour(hour)}`;
    default:
      return null;
  }
}

/** Each round starts at 12:00, or at 6:00 when the answer is 12 o'clock, so the start is never the answer. */
export const startTime = (round: ClockRound | undefined) => (round && targetTime(round) === 0 ? 6 * 60 : 0);

/* ------------------------------------------------------------- hand angles */

/** Degrees clockwise from 12 o'clock, 0-359, for a point relative to the clock's centre (screen y grows downwards). */
export function pointAngle(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** The minute a hand at this angle points to, snapped to the nearest step (0-59). With step 60 it is always 0. */
export const angleToMinute = (angle: number, step: MinuteStep) => snapTime(angle / 6, step) % 60;

/** Degrees clockwise from 12 o'clock for a minute hand showing this minute. */
export const minuteToAngle = (minute: number) => (((minute % 60) + 60) % 60) * 6;

/** Unwrapped hand rotations for drawing, so a hand never spins backwards when the time passes 12. */
export const handTurns = (time: number) => ({ minute: time * 6, hour: time / 2 });

export const minuteHandAngle = (time: number) => minuteToAngle(wrapTime(time) % 60);

/** The hour hand moves with the minutes: 3:00 is 90 degrees, 3:30 is 105 degrees. */
export const hourHandAngle = (time: number) => wrapTime(time) / 2;

/**
 * Follows a finger dragging the minute hand: moves `time` (unsnapped minutes)
 * the short way round to the minute under the finger. Passing 12 clockwise
 * moves the hour on; passing it anticlockwise moves the hour back.
 */
export function followFinger(time: number, angle: number): number {
  const finger = angle / 6;
  const now = ((time % 60) + 60) % 60;
  let delta = finger - now;
  if (delta > 30) delta -= 60;
  if (delta <= -30) delta += 60;
  return time + delta;
}

/* ------------------------------------------------------------------- hints */

/** The number on the face the minute hand points at: 0 minutes is 12, 30 minutes is 6. */
export const minuteMark = (minute: number) => (minute === 0 ? 12 : Math.round(minute / 5));

function minutePhrase(minute: number): string {
  switch (minute) {
    case 0:
      return "o'clock";
    case 15:
      return 'quarter past';
    case 30:
      return 'half past';
    case 45:
      return 'quarter to';
    default:
      return `${minute} minutes past`;
  }
}

/**
 * A short nudge from the numbers after a wrong Check: the minute hand first
 * (the hour hand's place depends on it), then the hour hand. Null when right.
 */
export function clockNudge(round: ClockRound, tried: number): string | null {
  const got = clockTime(tried);
  const { hour, minute } = round;
  if (got.minute !== minute) return `Look at the long hand: it should point at ${minuteMark(minute)} for ${minutePhrase(minute)}.`;
  if (got.hour !== hour) {
    const place = minute === 0 ? `point at ${hour}` : minute === 30 ? `be halfway between ${hour} and ${nextHour(hour)}` : `be between ${hour} and ${nextHour(hour)}`;
    return `The long hand is right, but the short hand should ${place}.`;
  }
  return null;
}

export interface ClockHint {
  /** 1 = nudge from the numbers, 2 = the round's own hint. */
  level: 1 | 2;
  text: string;
}

/** One hint line after a wrong Check: the nudge after the first, the round's hint after that. */
export function roundHint(round: ClockRound, tried: number | null, wrong: number): ClockHint | null {
  if (wrong < 1 || tried === null || isRight(round, tried)) return null;
  const nudge = wrong === 1 ? clockNudge(round, tried) : null;
  return nudge ? { level: 1, text: nudge } : { level: 2, text: round.hint };
}

/* -------------------------------------------------------------- game flow */

/** Right when hour and minute both match on a 12-hour clock. */
export const isRight = (round: ClockRound, time: number) => wrapTime(time) === targetTime(round);

export const initialClockState = (config: ClockConfig): ClockState => ({
  round: 0,
  time: startTime(config.rounds[0]),
  mistakesByRound: {},
  mistakes: 0,
  phase: 'playing',
  lastWrong: null,
  started: false,
});

export const currentRound = (config: ClockConfig, state: ClockState): ClockRound => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** The hands can move while playing and straight after a wrong Check. */
export const canMove = (state: ClockState) => state.phase === 'playing' || state.phase === 'incorrect';

/** Check needs a move this round, and a change since the last wrong Check. */
export const canCheck = (state: ClockState) => state.phase === 'playing' && state.started;

/** Wrong Checks so far in this round; the second one unlocks the round's own hint. */
export const wrongChecks = (state: ClockState, round: ClockRound) => state.mistakesByRound[round.id] ?? 0;

function setTime(state: ClockState, config: ClockConfig, time: number): ClockState {
  if (!config.rounds[state.round] || !canMove(state) || !Number.isFinite(time)) return state;
  const snapped = snapTime(time, config.minuteStep);
  if (snapped === state.time) return state;
  return { ...state, time: snapped, phase: 'playing', started: true };
}

export function createClockReducer(config: ClockConfig) {
  return function clockReducer(state: ClockState, action: ClockAction): ClockState {
    const round = config.rounds[state.round];
    switch (action.type) {
      case 'set':
        return setTime(state, config, action.time);
      case 'shift':
        return setTime(state, config, state.time + action.minutes);
      case 'check': {
        if (!round || !canCheck(state)) return state;
        if (isRight(round, state.time)) return { ...state, phase: 'correct', lastWrong: null };
        return {
          ...state,
          phase: 'incorrect',
          lastWrong: state.time,
          mistakes: state.mistakes + 1,
          mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 },
        };
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        const last = state.round >= config.rounds.length - 1;
        if (last) return { ...state, phase: 'complete' };
        const next = state.round + 1;
        return { ...state, round: next, time: startTime(config.rounds[next]), phase: 'playing', lastWrong: null, started: false };
      }
      case 'reset':
        return initialClockState(config);
      default:
        return state;
    }
  };
}

export function clockResult(config: ClockConfig, state: ClockState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'clock',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Set ${completed ? total : state.round} of ${total} clocks with ${state.mistakes} wrong tr${state.mistakes === 1 ? 'y' : 'ies'}`,
  };
}

export interface RoundOutcome {
  id: string;
  /** The time asked for, e.g. "3:30". */
  time: string;
  words: string | null;
  firstTry: boolean;
  wrong: number;
}

/** Per-round summary for the completion card. */
export const roundOutcomes = (config: ClockConfig, state: ClockState): RoundOutcome[] =>
  config.rounds.map((r) => ({
    id: r.id,
    time: formatTime(targetTime(r)),
    words: timeWords(targetTime(r)),
    firstTry: !state.mistakesByRound[r.id],
    wrong: state.mistakesByRound[r.id] ?? 0,
  }));
