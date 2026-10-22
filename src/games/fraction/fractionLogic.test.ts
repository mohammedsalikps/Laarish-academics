import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { FractionBuilderConfig } from '../../domain/types';
import {
  canCheck,
  compareFractions,
  createFractionReducer,
  equalPartsNote,
  fractionName,
  fractionResult,
  initialFractionState,
  roundHint,
  roundOutcomes,
  shadedWords,
  simplify,
  targetFraction,
  type FractionAction,
  type FractionRound,
  type FractionState,
} from './fractionLogic';

const config = getTopic('fractions-halves')!.play.game as FractionBuilderConfig;
const reduce = createFractionReducer(config);
const run = (state: FractionState, ...actions: FractionAction[]) => actions.reduce(reduce, state);
const shade = (n: number): FractionAction[] => Array.from({ length: n }, (_, i) => ({ type: 'toggle', piece: i }) as const);
const roundById = (id: string) => config.rounds.find((r) => r.id === id)!;
const fr = (numerator: number, denominator: number) => ({ numerator, denominator });

describe('fraction builder', () => {
  it('has valid rounds', () => {
    for (const r of config.rounds) {
      expect(r.numerator).toBeGreaterThan(0);
      expect(r.numerator).toBeLessThanOrEqual(r.parts);
    }
  });

  it('accepts any pieces as long as the count matches the numerator', () => {
    const round = config.rounds[0];
    const pieces: FractionAction[] = Array.from({ length: round.numerator }, (_, i) => ({ type: 'toggle', piece: round.parts - 1 - i }));
    expect(run(initialFractionState, ...pieces, { type: 'check' }).phase).toBe('correct');
  });

  it('counts a mistake, lets the learner fix it, and ignores invalid pieces', () => {
    const round = config.rounds[0];
    const wrong = run(initialFractionState, ...shade(round.numerator + 1 > round.parts ? round.numerator - 1 : round.numerator + 1), { type: 'check' });
    expect(wrong.phase).toBe('incorrect');
    expect(wrong.mistakes).toBe(1);
    expect(run(wrong, { type: 'toggle', piece: round.parts + 5 })).toBe(wrong);
    const fixed = run(initialFractionState, ...shade(round.numerator), { type: 'check' });
    expect(fixed.phase).toBe('correct');
  });

  it('toggling a piece twice un-shades it', () => {
    expect(run(initialFractionState, { type: 'toggle', piece: 0 }, { type: 'toggle', piece: 0 }).shaded).toEqual([]);
  });

  it('completes after the last round with a perfect score when there were no mistakes', () => {
    const done = config.rounds.reduce((s, r) => run(s, ...shade(r.numerator), { type: 'check' }, { type: 'next' }), initialFractionState);
    expect(done.phase).toBe('complete');
    expect(fractionResult(config, done)).toMatchObject({ completed: true, score: 1, perfect: true, gameType: 'fraction-builder' });
  });

  it('lowers the score for rounds with mistakes', () => {
    const [first, ...rest] = config.rounds;
    const wrongCount = first.numerator === 1 ? 2 : 1;
    // Wrong answer, then un-shade those pieces and answer correctly.
    let s = run(initialFractionState, ...shade(wrongCount), { type: 'check' }, ...shade(wrongCount));
    s = run(s, ...shade(first.numerator), { type: 'check' }, { type: 'next' });
    s = rest.reduce((state, r) => run(state, ...shade(r.numerator), { type: 'check' }, { type: 'next' }), s);
    const result = fractionResult(config, s);
    expect(result.completed).toBe(true);
    expect(result.mistakes).toBe(1);
    expect(result.score).toBeCloseTo((config.rounds.length - 1) / config.rounds.length);
  });
});

describe('painting, clearing and checking', () => {
  // Round 3 is the 4-piece bar, so a drag can sweep across several pieces.
  const atBar = run(initialFractionState, ...config.rounds.slice(0, 2).flatMap((r) => [...shade(r.numerator), { type: 'check' } as const, { type: 'next' } as const]));

  it('paints pieces on or off and ignores strokes that change nothing', () => {
    expect(config.rounds[atBar.round].parts).toBe(4);
    const painted = run(atBar, { type: 'paint', piece: 2, on: true }, { type: 'paint', piece: 0, on: true }, { type: 'paint', piece: 1, on: true });
    expect(painted.shaded).toEqual([0, 1, 2]);
    expect(run(painted, { type: 'paint', piece: 1, on: true })).toBe(painted);
    expect(run(painted, { type: 'paint', piece: 3, on: false })).toBe(painted);
    expect(run(painted, { type: 'paint', piece: 1, on: false }).shaded).toEqual([0, 2]);
    expect(run(painted, { type: 'paint', piece: 9, on: true })).toBe(painted);
  });

  it('remembers the first shade so the "Start here" cue can go away', () => {
    expect(initialFractionState.started).toBe(false);
    const s = run(initialFractionState, { type: 'toggle', piece: 0 }, { type: 'toggle', piece: 0 });
    expect(s.started).toBe(true);
  });

  it('needs something shaded, and a change after a wrong check, before checking', () => {
    expect(canCheck(initialFractionState)).toBe(false);
    expect(run(initialFractionState, { type: 'check' })).toBe(initialFractionState);
    const wrong = run(atBar, ...shade(3), { type: 'check' });
    expect(wrong).toMatchObject({ phase: 'incorrect', lastWrong: 3 });
    expect(canCheck(wrong)).toBe(false);
    expect(run(wrong, { type: 'check' })).toBe(wrong);
    const changed = run(wrong, { type: 'toggle', piece: 2 });
    expect(changed.phase).toBe('playing');
    expect(canCheck(changed)).toBe(true);
  });

  it('clears the shading to retry a round without counting a mistake', () => {
    const wrong = run(atBar, ...shade(3), { type: 'check' });
    const cleared = run(wrong, { type: 'clear' });
    expect(cleared).toMatchObject({ shaded: [], phase: 'playing', mistakes: wrong.mistakes });
    expect(run(cleared, { type: 'clear' })).toBe(cleared);
    const solved = run(cleared, ...shade(2), { type: 'check' });
    expect(solved).toMatchObject({ phase: 'correct', lastWrong: null });
    expect(run(solved, { type: 'clear' })).toBe(solved);
    expect(run(solved, { type: 'next' })).toMatchObject({ shaded: [], lastWrong: null, phase: 'playing' });
  });
});

describe('fraction maths for the readout and hints', () => {
  it('simplifies, compares and names fractions', () => {
    expect(simplify(fr(2, 4))).toEqual(fr(1, 2));
    expect(simplify(fr(0, 4))).toEqual(fr(0, 1));
    expect(compareFractions(fr(2, 4), fr(1, 2))).toBe(0);
    expect(compareFractions(fr(3, 4), fr(1, 2))).toBe(1);
    expect(compareFractions(fr(1, 4), fr(1, 2))).toBe(-1);
    expect(fractionName(fr(1, 2))).toBe('one half');
    expect(fractionName(fr(2, 4))).toBe('one half');
    expect(fractionName(fr(1, 4))).toBe('one quarter');
    expect(fractionName(fr(3, 4))).toBe('three quarters');
    expect(fractionName(fr(2, 3))).toBe('two thirds');
    expect(fractionName(fr(2, 2))).toBe('one whole');
    expect(fractionName(fr(0, 4))).toBe('zero');
    expect(fractionName(fr(1, 16))).toBe('1/16');
  });

  it('reads the target the way the prompt asks for it', () => {
    expect(targetFraction(roundById('roti-half'))).toEqual(fr(1, 2));
    // "Shade half of the bar" with 4 pieces: the target is 1/2, so the child must see that 2/4 is the same.
    expect(targetFraction(roundById('bar-two-quarters'))).toEqual(fr(1, 2));
    // The prompt says 2/2, and a whole is never shown as 1/1.
    expect(targetFraction(roundById('roti-whole'))).toEqual(fr(2, 2));
    const wholeBar: FractionRound = { ...roundById('roti-whole'), shape: 'bar', parts: 4, numerator: 4, prompt: 'Shade the whole bar.' };
    expect(targetFraction(wholeBar)).toEqual(fr(4, 4));
  });

  it('describes the live readout and the equal parts', () => {
    expect(shadedWords(0, 2)).toBe('0 of 2 equal parts shaded');
    expect(shadedWords(3, 4)).toBe('3 of 4 equal parts shaded');
    expect(equalPartsNote(roundById('roti-half'))).toBe('Yes! Both parts are the same size, so each is 1/2 of the roti.');
    expect(equalPartsNote(roundById('bar-two-quarters'))).toBe('Yes! All 4 parts are the same size, so each is 1/4 of the chocolate bar.');
  });

  it('gives one hint line at a time: a short nudge first, then more specific help', () => {
    const bar = roundById('bar-two-quarters');
    expect(roundHint(bar, null, 0)).toBeNull();
    expect(roundHint(bar, 2, 1)).toBeNull();

    expect(roundHint(bar, 3, 1)).toEqual({ level: 1, relation: 'more', text: '3/4 is more than 1/2. Un-shade some parts.' });
    expect(roundHint(bar, 1, 1)).toEqual({ level: 1, relation: 'less', text: '1/4 is less than 1/2. Shade more parts.' });
    expect(roundHint(bar, 1, 2)).toEqual({ level: 2, relation: 'less', text: bar.hint });
    expect(roundHint(bar, 3, 5)).toEqual({ level: 3, relation: 'more', text: 'Shade exactly 2 of the 4 parts.' });

    expect(roundHint(roundById('roti-whole'), 1, 1)!.text).toBe('1/2 is less than 2/2. Shade more parts.');
  });

  it('summarises each round for the completion card', () => {
    const [first, ...rest] = config.rounds;
    let s = run(initialFractionState, ...shade(first.numerator === 1 ? 2 : 1), { type: 'check' }, { type: 'clear' }, ...shade(first.numerator), { type: 'check' }, { type: 'next' });
    s = rest.reduce((state, r) => run(state, ...shade(r.numerator), { type: 'check' }, { type: 'next' }), s);
    const outcomes = roundOutcomes(config, s);
    expect(outcomes.map((o) => o.firstTry)).toEqual(config.rounds.map((_, i) => i !== 0));
    expect(outcomes[0]).toMatchObject({ id: first.id, wrong: 1 });
    expect(outcomes.map((o) => o.target)).toEqual(config.rounds.map(targetFraction));
  });
});
