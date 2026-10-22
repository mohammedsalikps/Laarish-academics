import { describe, expect, it } from 'vitest';
import type { CircuitConfig } from '../../domain/types';
import {
  bulbLit,
  circuitFeedback,
  circuitHint,
  circuitResult,
  createCircuitReducer,
  initialCircuitState,
  isLit,
  testedGroups,
  theLabel,
  type CircuitAction,
  type CircuitState,
} from './circuitLogic';

const config: CircuitConfig = {
  type: 'circuit',
  items: [
    { id: 'nail', label: 'Iron nail', icon: 'nail', conducts: true, explanation: 'Iron is a metal, and metals conduct electricity.' },
    { id: 'eraser', label: 'Rubber eraser', icon: 'eraser', conducts: false, explanation: 'Rubber is an insulator.' },
    { id: 'ruler', label: 'Plastic ruler', icon: 'ruler', conducts: false, explanation: 'Plastic is an insulator.' },
  ],
  rounds: [
    { id: 'light', prompt: 'Make the bulb light up.', goal: 'light-bulb', hint: 'Metals let electricity through.', explanation: 'A metal closed the circuit.' },
    { id: 'all', prompt: 'Test every object.', goal: 'test-all', hint: 'Try each one.', explanation: 'Metals are conductors.' },
  ],
};
const reduce = createCircuitReducer(config);
const run = (...actions: CircuitAction[]) => actions.reduce(reduce, initialCircuitState);
const place = (itemId: string): CircuitAction => ({ type: 'place', itemId });
const ON: CircuitAction = { type: 'switch', on: true };
const OFF: CircuitAction = { type: 'switch', on: false };

describe('the bulb (honest physics)', () => {
  it('lights only for a conductor with the switch on', () => {
    expect(bulbLit({ conducts: true }, true)).toBe(true);
    expect(bulbLit({ conducts: false }, true)).toBe(false); // insulator
    expect(bulbLit({ conducts: true }, false)).toBe(false); // switch off
    expect(bulbLit(null, true)).toBe(false); // empty gap
    expect(bulbLit(undefined, false)).toBe(false);
  });

  it('follows the circuit state: switch, gap and object', () => {
    let s = run(place('nail'));
    expect(isLit(config, s)).toBe(false); // switch still off
    s = reduce(s, ON);
    expect(isLit(config, s)).toBe(true);
    s = reduce(s, OFF);
    expect(isLit(config, s)).toBe(false); // opening the switch breaks the circuit
    s = reduce(s, ON);
    s = reduce(s, { type: 'remove' });
    expect(isLit(config, s)).toBe(false); // a gap breaks the circuit
    s = reduce(s, place('eraser'));
    expect(isLit(config, s)).toBe(false); // an insulator stays off
  });

  it('tests the circuit when the switch is turned on with an object, or an object goes in while it is on', () => {
    let s = run(place('eraser'));
    expect(s.lastTest).toBeNull();
    s = reduce(s, ON);
    expect(s.lastTest).toMatchObject({ itemId: 'eraser', lit: false });
    const first = s.lastTest;
    s = reduce(s, OFF);
    expect(s.lastTest).toBe(first); // turning it off is not a test
    s = reduce(s, ON);
    expect(s.lastTest).not.toBe(first); // the same object tested again is a new test
    s = reduce(s, place('nail'));
    expect(s.lastTest).toMatchObject({ itemId: 'nail', lit: true });
    expect(run(ON).lastTest).toBeNull(); // nothing in the gap: nothing to test
  });

  it('toggles the switch, ignores unknown objects and putting the same object in twice', () => {
    expect(run({ type: 'switch' }).switchOn).toBe(true);
    expect(run({ type: 'switch' }, { type: 'switch' }).switchOn).toBe(false);
    const s = run(place('nail'));
    expect(reduce(s, place('nail'))).toBe(s);
    expect(reduce(s, place('nope'))).toBe(s);
    expect(reduce(initialCircuitState, { type: 'remove' })).toBe(initialCircuitState);
  });
});

describe('light-bulb round', () => {
  it('is correct as soon as the bulb lights', () => {
    const s = run(place('nail'), ON);
    expect(s.phase).toBe('correct');
    expect(s.lastTest).toMatchObject({ solved: true, mistake: false });
    expect(s.mistakes).toBe(0);
  });

  it('counts one mistake per different insulator, then nudges and then gives the round hint', () => {
    let s = run(ON, place('eraser'));
    expect(s).toMatchObject({ phase: 'playing', mistakes: 1, mistakesByRound: { light: 1 } });
    expect(s.lastTest).toMatchObject({ mistake: true, lit: false });
    expect(circuitHint(config, s)).toEqual({ level: 1, text: 'Rubber eraser is an insulator. Try something made of metal.' });

    // The same insulator again is not a new mistake.
    s = reduce(s, OFF);
    s = reduce(s, ON);
    expect(s.mistakes).toBe(1);
    expect(s.lastTest?.mistake).toBe(false);

    // The nudge is about that insulator, so it goes when it leaves the gap.
    s = reduce(s, { type: 'remove' });
    expect(circuitHint(config, s)).toBeNull();

    s = reduce(s, place('ruler'));
    expect(s.mistakes).toBe(2);
    expect(circuitHint(config, s)).toEqual({ level: 2, text: 'Metals let electricity through.' });
    s = reduce(s, { type: 'remove' });
    expect(circuitHint(config, s)?.level).toBe(2); // the round hint stays until the bulb lights

    s = reduce(s, place('nail'));
    expect(s.phase).toBe('correct');
    expect(circuitHint(config, s)).toBeNull();
  });

  it('does not count mistakes once the bulb has lit', () => {
    let s = run(place('nail'), ON);
    s = reduce(s, place('eraser'));
    expect(s.phase).toBe('correct');
    expect(s.mistakes).toBe(0);
  });

  it('needs the bulb lit before Next', () => {
    const s = run(place('eraser'), ON);
    expect(reduce(s, { type: 'next' })).toBe(s);
  });
});

describe('test-all round', () => {
  const toTestAll = () => run(place('nail'), ON, { type: 'next' });

  it('starts with a fresh circuit', () => {
    expect(toTestAll()).toMatchObject({ round: 1, inGap: null, switchOn: false, tested: [], wrong: [], phase: 'playing', lastTest: null });
  });

  it('completes only after every object has been tested, with no mistakes for insulators', () => {
    let s = reduce(toTestAll(), place('eraser'));
    expect(s.tested).toEqual([]); // the switch is off: not tested yet
    s = reduce(s, ON);
    expect(s.tested).toEqual(['eraser']);
    s = reduce(s, place('nail'));
    s = reduce(s, place('eraser'));
    expect(s.tested).toEqual(['eraser', 'nail']);
    expect(s.phase).toBe('playing');
    expect(testedGroups(config, s)).toEqual({ conductors: [config.items[0]], insulators: [config.items[1]] });

    s = reduce(s, place('ruler'));
    expect(s.phase).toBe('correct');
    expect(s.lastTest).toMatchObject({ itemId: 'ruler', solved: true });
    expect(s.mistakes).toBe(0);
  });
});

describe('feedback line', () => {
  it('describes what the circuit really does', () => {
    expect(circuitFeedback(config, initialCircuitState)).toBeNull();
    expect(circuitFeedback(config, run(place('nail')))).toEqual({ tone: 'info', text: 'Now turn the switch on to test the iron nail.' });
    expect(circuitFeedback(config, run(ON))).toMatchObject({ tone: 'off', text: 'The bulb stays off: there is a gap in the circuit.' });

    // A lit bulb explains the object that lit it.
    expect(circuitFeedback(config, run(place('nail'), ON))).toEqual({
      tone: 'lit',
      text: 'The bulb lights: the iron nail lets electricity through.',
      detail: { kind: 'explanation', text: 'Iron is a metal, and metals conduct electricity.' },
    });
    // The test that finishes a test-all round shows the round's summary.
    expect(circuitFeedback(config, run(place('nail'), ON, { type: 'next' }, ON, place('ruler'), place('eraser'), place('nail')))).toEqual({
      tone: 'lit',
      text: 'The bulb lights: the iron nail lets electricity through.',
      detail: { kind: 'success', text: 'Metals are conductors.' },
    });
    // An insulator in a light-bulb round: the nudge is the second sentence.
    expect(circuitFeedback(config, run(ON, place('eraser')))).toEqual({
      tone: 'off',
      text: 'The bulb stays off: the rubber eraser does not let electricity through.',
      detail: { kind: 'hint', text: 'Rubber eraser is an insulator. Try something made of metal.' },
    });
    // In a test-all round the object's own explanation is the second sentence.
    const s = run(place('nail'), ON, { type: 'next' }, place('ruler'), ON);
    expect(circuitFeedback(config, s)).toEqual({
      tone: 'off',
      text: 'The bulb stays off: the plastic ruler does not let electricity through.',
      detail: { kind: 'explanation', text: 'Plastic is an insulator.' },
    });
    // Only a hint left on screen: the round hint after two insulators, with the gap empty and the switch off.
    expect(circuitFeedback(config, run(ON, place('eraser'), place('ruler'), OFF, { type: 'remove' }))).toEqual({ tone: 'hint', text: 'Metals let electricity through.' });
  });

  it('names objects naturally', () => {
    expect(theLabel('Iron nail')).toBe('the iron nail');
    expect(theLabel('DVD')).toBe('the DVD');
  });
});

describe('completion and result', () => {
  const finish = (s: CircuitState) => reduce(s, { type: 'next' });

  it('reports a perfect run', () => {
    let s = run(place('nail'), ON, { type: 'next' }, ON, place('nail'), place('eraser'), place('ruler'));
    expect(circuitResult(config, s).completed).toBe(false);
    s = finish(s);
    expect(s.phase).toBe('complete');
    expect(circuitResult(config, s)).toEqual({
      gameType: 'circuit',
      score: 1,
      correct: 2,
      total: 2,
      mistakes: 0,
      completed: true,
      perfect: true,
      summary: 'Finished 2 of 2 circuit rounds with 0 wrong tries',
    });
    // Nothing changes after the end, except a reset.
    expect(reduce(s, place('eraser'))).toBe(s);
    expect(reduce(s, { type: 'reset' })).toBe(initialCircuitState);
  });

  it('counts the test-all round as correct even after mistakes in a light-bulb round', () => {
    const s = finish(run(ON, place('eraser'), place('nail'), { type: 'next' }, ON, place('nail'), place('eraser'), place('ruler')));
    expect(circuitResult(config, s)).toMatchObject({ completed: true, perfect: false, correct: 1, total: 2, score: 0.5, mistakes: 1, summary: 'Finished 2 of 2 circuit rounds with 1 wrong try' });
  });

  it('is not complete part way', () => {
    expect(circuitResult(config, run(place('nail'), ON, { type: 'next' }))).toMatchObject({ completed: false, perfect: false, correct: 0, score: 0, summary: 'Finished 1 of 2 circuit rounds with 0 wrong tries' });
  });
});
