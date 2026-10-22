import { describe, expect, it } from 'vitest';
import { REWARD_RULES, clamp01, levelFromXp, starsForMastery, xpForLevel } from './rules';

describe('levels', () => {
  it('uses growing XP thresholds', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });

  it('computes level and progress from total XP', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: 100, progress: 0 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNext: 200 });
    expect(levelFromXp(250)).toMatchObject({ level: 2, xpIntoLevel: 150, progress: 0.75 });
    expect(levelFromXp(1000).level).toBe(5);
  });

  it('never reports impossible values for negative or fractional XP', () => {
    expect(levelFromXp(-50)).toMatchObject({ level: 1, xpIntoLevel: 0, progress: 0 });
    expect(levelFromXp(150.7).xpIntoLevel).toBe(50);
  });
});

describe('stars', () => {
  it('awards 0 stars for incomplete lessons and at least 1 for completed ones', () => {
    expect(starsForMastery(1, false)).toBe(0);
    expect(starsForMastery(0, true)).toBe(1);
  });

  it('uses the configured thresholds', () => {
    expect(starsForMastery(REWARD_RULES.stars.two - 0.01, true)).toBe(1);
    expect(starsForMastery(REWARD_RULES.stars.two, true)).toBe(2);
    expect(starsForMastery(REWARD_RULES.stars.three, true)).toBe(3);
  });
});

describe('clamp01', () => {
  it('keeps scores within 0-1 and handles NaN', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});
