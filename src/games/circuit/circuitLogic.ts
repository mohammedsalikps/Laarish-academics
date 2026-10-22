import type { GameResult } from '../../domain/results';
import type { CircuitConfig } from '../../domain/types';

/**
 * Circuit Lab (on screen only): a cell, wires, a switch, a bulb and a gap.
 * Put an object in the gap and turn the switch on. The physics is kept honest:
 * the bulb lights only when the switch is on (the circuit is closed) AND the
 * object in the gap lets electricity through (a conductor). Nothing else lights it.
 *
 * Round goals:
 *  - "light-bulb": light the bulb. Each different insulator tried with the switch on
 *    is one mistake; the first gets a short nudge, the second the round's own hint.
 *  - "test-all": an investigation. Test every object; there are no mistakes.
 */

export type CircuitItem = CircuitConfig['items'][number];
export type CircuitRound = CircuitConfig['rounds'][number];

/** One test of the circuit: an object in the gap with the switch on. */
export interface CircuitTest {
  itemId: string;
  lit: boolean;
  /** A new insulator tried in a light-bulb round (counts as one mistake). */
  mistake: boolean;
  /** This test finished the round. */
  solved: boolean;
}

export interface CircuitState {
  round: number;
  /** The object in the gap, if any. */
  inGap: string | null;
  /** Switch on = closed. */
  switchOn: boolean;
  /** Objects tested this round, in the order they were first tested. */
  tested: string[];
  /** Different insulators tried this round in a light-bulb round. */
  wrong: string[];
  mistakesByRound: Record<string, number>;
  mistakes: number;
  phase: 'playing' | 'correct' | 'complete';
  /** The latest test. A new object every time the circuit is tested (even the same object again). */
  lastTest: CircuitTest | null;
}

export type CircuitAction =
  | { type: 'place'; itemId: string }
  | { type: 'remove' }
  /** Turns the switch on or off; toggles when `on` is left out. */
  | { type: 'switch'; on?: boolean }
  | { type: 'next' }
  | { type: 'reset' };

export const initialCircuitState: CircuitState = {
  round: 0,
  inGap: null,
  switchOn: false,
  tested: [],
  wrong: [],
  mistakesByRound: {},
  mistakes: 0,
  phase: 'playing',
  lastTest: null,
};

/** The only rule for the bulb: the switch is on and the object in the gap conducts. */
export function bulbLit(item: Pick<CircuitItem, 'conducts'> | null | undefined, switchOn: boolean): boolean {
  return switchOn && item != null && item.conducts === true;
}

export const findItem = (config: CircuitConfig, id: string | null): CircuitItem | undefined => (id === null ? undefined : config.items.find((i) => i.id === id));

export const currentRound = (config: CircuitConfig, state: CircuitState): CircuitRound | undefined => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** Is the bulb lit right now? */
export const isLit = (config: CircuitConfig, state: CircuitState): boolean => bulbLit(findItem(config, state.inGap), state.switchOn);

export const allTested = (config: CircuitConfig, tested: readonly string[]): boolean => config.items.every((i) => tested.includes(i.id));

/** "Iron nail" → "the iron nail" (keeps words like "DVD" as they are). */
export function theLabel(label: string): string {
  const word = /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
  return `the ${word}`;
}

/** The first nudge after an insulator is tried in a light-bulb round. */
export const insulatorNudge = (item: CircuitItem): string => `${item.label} is an insulator. Try something made of metal.`;

function runTest(config: CircuitConfig, state: CircuitState): CircuitState {
  const round = config.rounds[state.round];
  const item = findItem(config, state.inGap);
  if (!round || !item || !state.switchOn) return state;
  const lit = bulbLit(item, state.switchOn);
  const tested = state.tested.includes(item.id) ? state.tested : [...state.tested, item.id];
  const next: CircuitState = { ...state, tested };
  let mistake = false;
  let solved = false;
  if (state.phase === 'playing') {
    if (round.goal === 'light-bulb') {
      if (lit) {
        next.phase = 'correct';
        solved = true;
      } else if (!state.wrong.includes(item.id)) {
        mistake = true;
        next.wrong = [...state.wrong, item.id];
        next.mistakes = state.mistakes + 1;
        next.mistakesByRound = { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 };
      }
    } else if (allTested(config, tested)) {
      next.phase = 'correct';
      solved = true;
    }
  }
  next.lastTest = { itemId: item.id, lit, mistake, solved };
  return next;
}

export function createCircuitReducer(config: CircuitConfig) {
  return function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState {
    if (action.type === 'reset') return initialCircuitState;
    if (state.phase === 'complete') return state;
    switch (action.type) {
      case 'place':
        if (!findItem(config, action.itemId) || state.inGap === action.itemId) return state;
        return runTest(config, { ...state, inGap: action.itemId });
      case 'remove':
        return state.inGap === null ? state : { ...state, inGap: null };
      case 'switch': {
        const on = action.on ?? !state.switchOn;
        if (on === state.switchOn) return state;
        return runTest(config, { ...state, switchOn: on });
      }
      case 'next': {
        if (state.phase !== 'correct') return state;
        if (state.round >= config.rounds.length - 1) return { ...state, phase: 'complete' };
        // A fresh circuit for the next round: empty gap, switch off.
        return { ...state, round: state.round + 1, inGap: null, switchOn: false, tested: [], wrong: [], phase: 'playing', lastTest: null };
      }
      default:
        return state;
    }
  };
}

export interface CircuitHint {
  /** 1 = short nudge about the insulator just tried, 2 = the round's own hint. */
  level: 1 | 2;
  text: string;
}

/**
 * The hint for a light-bulb round after wrong tries. The nudge is about the insulator
 * just tried, so it shows while that object is still in the gap; the round's hint
 * (after a second insulator) stays until the bulb is lit.
 */
export function circuitHint(config: CircuitConfig, state: CircuitState): CircuitHint | null {
  const round = config.rounds[state.round];
  if (!round || round.goal !== 'light-bulb' || state.phase !== 'playing' || state.wrong.length === 0) return null;
  if (state.wrong.length >= 2) return { level: 2, text: round.hint };
  const tried = findItem(config, state.wrong[0]);
  return tried && state.inGap === tried.id ? { level: 1, text: insulatorNudge(tried) } : null;
}

export interface CircuitFeedback {
  /** lit: the bulb is on; off: the circuit is tested and the bulb stays off; info: what to do next; hint: only a hint. */
  tone: 'lit' | 'off' | 'info' | 'hint';
  text: string;
  /** A second sentence: why (the object's explanation), the round's explanation, or a hint. */
  detail?: { kind: 'explanation' | 'success' | 'hint'; text: string };
}

/** The one feedback line under the circuit, always describing what the circuit really does. */
export function circuitFeedback(config: CircuitConfig, state: CircuitState): CircuitFeedback | null {
  if (state.phase === 'complete') return null;
  const round = config.rounds[state.round];
  const hint = circuitHint(config, state);
  const hintDetail = hint ? { kind: 'hint' as const, text: hint.text } : undefined;
  const item = findItem(config, state.inGap);

  if (item && state.switchOn) {
    const lit = bulbLit(item, state.switchOn);
    const text = lit ? `The bulb lights: ${theLabel(item.label)} lets electricity through.` : `The bulb stays off: ${theLabel(item.label)} does not let electricity through.`;
    // Each test explains the object itself (always true for that object). The test that finishes a
    // test-all investigation shows the round's summary instead.
    const summaryNow = round?.goal === 'test-all' && state.phase === 'correct' && state.lastTest?.solved === true && state.lastTest.itemId === item.id;
    const detail = hintDetail ?? (summaryNow ? { kind: 'success' as const, text: round.explanation } : { kind: 'explanation' as const, text: item.explanation });
    return { tone: lit ? 'lit' : 'off', text, detail };
  }
  if (item) return { tone: 'info', text: `Now turn the switch on to test ${theLabel(item.label)}.`, detail: hintDetail };
  if (state.switchOn) return { tone: 'off', text: 'The bulb stays off: there is a gap in the circuit.', detail: hintDetail ?? { kind: 'explanation', text: 'Put an object in the gap.' } };
  return hint ? { tone: 'hint', text: hint.text } : null;
}

/** Objects tested this round, split by what the bulb showed. */
export function testedGroups(config: CircuitConfig, state: CircuitState): { conductors: CircuitItem[]; insulators: CircuitItem[] } {
  const items = state.tested.map((id) => findItem(config, id)).filter((i): i is CircuitItem => Boolean(i));
  return { conductors: items.filter((i) => i.conducts), insulators: items.filter((i) => !i.conducts) };
}

export function circuitResult(config: CircuitConfig, state: CircuitState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  // A "test-all" round is an investigation, so it always counts as correct.
  const clean = completed ? config.rounds.filter((r) => r.goal === 'test-all' || !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'circuit',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Finished ${completed ? total : state.round} of ${total} circuit rounds with ${state.mistakes} wrong tr${state.mistakes === 1 ? 'y' : 'ies'}`,
  };
}
