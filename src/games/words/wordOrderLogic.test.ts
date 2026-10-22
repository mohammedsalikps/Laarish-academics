import { describe, expect, it } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { WordOrderConfig } from '../../domain/types';
import { createWordOrder, firstWrongIndex, insertIndex, isCorrectOrder, roundTiles, sentenceText, wordOrderResult, type WordOrderState } from './wordOrderLogic';

const config = getTopic('sentences-word-order')!.play.game as WordOrderConfig;
const asking = getTopic('sentences-asking')!.play.game as WordOrderConfig;

/** Places the tiles whose text matches `words`, in order. */
function build(reduce: ReturnType<typeof createWordOrder>['reducer'], state: WordOrderState, words: string[]): WordOrderState {
  let s = reduce(state, { type: 'clear' });
  for (const w of words) {
    const tile = s.tiles.find((t) => t.text === w && !s.placed.includes(t.id));
    if (!tile) throw new Error(`no tile "${w}"`);
    s = reduce(s, { type: 'place', tileId: tile.id });
  }
  return s;
}

describe('sentence helpers', () => {
  it('joins words without a space before punctuation', () => {
    expect(sentenceText(['Can', 'you', 'swim', '?'])).toBe('Can you swim?');
    expect(sentenceText(['The', 'sun', 'is', 'hot', '.'])).toBe('The sun is hot.');
  });

  it('accepts only the right order, with capital letters and the right end mark', () => {
    const round = config.rounds[0];
    expect(isCorrectOrder(round, ['The', 'sun', 'is', 'hot', '.'])).toBe(true);
    expect(isCorrectOrder(round, ['sun', 'The', 'is', 'hot', '.'])).toBe(false);
    expect(isCorrectOrder(round, ['The', 'sun', 'is', 'hot'])).toBe(false);
    expect(firstWrongIndex(round, ['The', 'is', 'sun', 'hot', '.'])).toBe(1);
  });

  it('shuffles reproducibly and never deals the tiles in the right order', () => {
    for (const round of [...config.rounds, ...asking.rounds]) {
      for (let seed = 0; seed < 40; seed++) {
        const tiles = roundTiles(round, seed);
        expect(tiles.map((t) => t.text).sort()).toEqual([...round.words, ...(round.distractors ?? [])].sort());
        expect(isCorrectOrder(round, tiles.slice(0, round.words.length).map((t) => t.text))).toBe(false);
      }
      expect(roundTiles(round, 3)).toEqual(roundTiles(round, 3));
    }
  });

  it('finds where a dragged tile lands, line by line', () => {
    const row = (top: number, lefts: number[]) => lefts.map((left) => ({ left, right: left + 60, top, bottom: top + 50 }));
    const rects = [...row(0, [0, 70, 140]), ...row(60, [0, 70])];
    expect(insertIndex(rects, -10, 20)).toBe(0);
    expect(insertIndex(rects, 110, 20)).toBe(2);
    expect(insertIndex(rects, 500, 20)).toBe(3);
    expect(insertIndex(rects, 50, 80)).toBe(4);
    expect(insertIndex(rects, 500, 200)).toBe(5);
  });
});

describe('sentence builder state machine', () => {
  it('builds every sentence and reports a perfect result', () => {
    const { initial, reducer } = createWordOrder(config, 0);
    let s = initial;
    for (const round of config.rounds) {
      s = build(reducer, s, round.words);
      s = reducer(s, { type: 'check' });
      expect(s.status).toBe('correct');
      s = reducer(s, { type: 'next' });
    }
    expect(s.status).toBe('finished');
    expect(wordOrderResult(config, s)).toMatchObject({ gameType: 'word-order', correct: 5, total: 5, mistakes: 0, perfect: true, completed: true });
  });

  it('marks the first wrong word, then keeps the right beginning on the second try', () => {
    const { initial, reducer } = createWordOrder(config, 1);
    let s = build(reducer, initial, ['The', 'is', 'sun', 'hot', '.']);
    s = reducer(s, { type: 'check' });
    expect(s).toMatchObject({ status: 'wrong', wrongChecks: 1, firstWrong: 1 });
    expect(s.placed).toHaveLength(5);
    s = reducer(s, { type: 'check' });
    expect(s).toMatchObject({ status: 'wrong', wrongChecks: 2 });
    expect(s.placed.map((id) => s.tiles.find((t) => t.id === id)!.text)).toEqual(['The']);
    s = build(reducer, s, ['The', 'sun', 'is', 'hot', '.']);
    s = reducer(s, { type: 'check' });
    expect(s.status).toBe('correct');
    expect(s.results[0]).toEqual({ roundId: 'sun-hot', firstTry: false, wrongChecks: 2 });
  });

  it('needs the capital "The", not the lowercase distractor', () => {
    const { initial, reducer } = createWordOrder(config, 0);
    let s = initial;
    for (const round of config.rounds.slice(0, 3)) s = reducer(reducer(build(reducer, s, round.words), { type: 'check' }), { type: 'next' });
    expect(config.rounds[s.roundIndex].id).toBe('plant-water');
    s = reducer(build(reducer, s, ['the', 'plant', 'needs', 'water', '.']), { type: 'check' });
    expect(s.status).toBe('wrong');
  });

  it('chooses the end mark in the asking topic', () => {
    const { initial, reducer } = createWordOrder(asking, 0);
    const wrong = reducer(build(reducer, initial, ['Can', 'you', 'swim', '.']), { type: 'check' });
    expect(wrong).toMatchObject({ status: 'wrong', firstWrong: 3 });
    const right = reducer(build(reducer, initial, ['Can', 'you', 'swim', '?']), { type: 'check' });
    expect(right.status).toBe('correct');
  });

  it('ignores edits after a correct answer and out-of-order actions', () => {
    const { initial, reducer } = createWordOrder(config, 0);
    expect(reducer(initial, { type: 'check' })).toBe(initial);
    expect(reducer(initial, { type: 'next' })).toBe(initial);
    const done = reducer(build(reducer, initial, config.rounds[0].words), { type: 'check' });
    expect(reducer(done, { type: 'remove', tileId: done.placed[0] })).toBe(done);
    expect(reducer(done, { type: 'clear' })).toBe(done);
  });
});
