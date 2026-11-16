import { describe, expect, it } from 'vitest';
import { feedbackTone } from './feedback';

describe('shared game feedback tones', () => {
  it('marks right answers, wrong tries and finishing, across engines', () => {
    for (const key of ['round-correct', 'sort-correct', 'match-correct', 'task-correct', 'sentence-correct', 'check-correct', 'run-finished:correct', 'challenge-success'])
      expect(feedbackTone(key), key).toBe('correct');
    for (const key of ['round-incorrect', 'sort-incorrect', 'match-incorrect', 'task-incorrect', 'sentence-incorrect', 'sentence-hint', 'check-incorrect', 'run-finished:incorrect', 'challenge-retry'])
      expect(feedbackTone(key), key).toBe('not-yet');
    for (const key of ['complete', 'complete:perfect', 'all-challenges']) expect(feedbackTone(key), key).toBe('complete');
  });

  it('keeps observations and instructions neutral (they are not answers)', () => {
    for (const key of ['start', 'pulled', 'not-pulled', 'attract', 'repel', 'attract:mystery', 'tile-placed', 'push-moved', 'push-stuck', 'bulb-on', 'bulb-off', 'walk:north', 'surface-selected:grass', 'hint', 'turned', 'an-unknown-key'])
      expect(feedbackTone(key), key).toBe('neutral');
  });
});
