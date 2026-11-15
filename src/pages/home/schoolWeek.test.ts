import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, getPrefs, PREFS_KEY, resetPrefsCache, updatePrefs, weekKey } from '../../state/academicsPrefs';
import { STORAGE_KEY } from '../../state/persistence';
import { learnerState, playTopic } from '../../test/fixtures';
import { allClassWorlds } from '../world/worldData';
import { checkInDue, isValidTestDate, testEyebrow, weekPlan } from './schoolWeek';

// Monday 16 November 2026, local time.
const MONDAY = new Date(2026, 10, 16, 9, 0);
const THURSDAY = new Date(2026, 10, 19, 9, 0);

describe('school week preferences', () => {
  it('live under their own key, so saved progress (schema v2) is untouched', () => {
    expect(PREFS_KEY).not.toBe(STORAGE_KEY);
    updatePrefs({ schoolChapters: { science: 'magnets' }, liteMode: 'on' });
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!)).toMatchObject({ version: 1, liteMode: 'on', schoolChapters: { science: 'magnets' } });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    resetPrefsCache();
    expect(getPrefs().schoolChapters.science).toBe('magnets');
  });

  it('fall back to safe defaults for missing or broken data', () => {
    window.localStorage.setItem(PREFS_KEY, '{"liteMode":"sometimes","dailyGoalMinutes":45,"rishiChat":"no"}');
    resetPrefsCache();
    expect(getPrefs()).toMatchObject({ liteMode: 'auto', dailyGoalMinutes: 20, rishiChat: true, schoolChapters: {} });
    window.localStorage.setItem(PREFS_KEY, 'not json');
    resetPrefsCache();
    expect(getPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('use Monday as the start of the week', () => {
    expect(weekKey(MONDAY)).toBe('2026-11-16');
    expect(weekKey(new Date(2026, 10, 22))).toBe('2026-11-16'); // Sunday
  });
});

describe('test dates (H4)', () => {
  it('accept school days within the next two weeks only', () => {
    expect(isValidTestDate('2026-11-20', MONDAY)).toBe(true); // Friday
    expect(isValidTestDate('2026-11-16', MONDAY)).toBe(true); // today
    expect(isValidTestDate('2026-11-22', MONDAY)).toBe(false); // Sunday
    expect(isValidTestDate('2026-11-13', MONDAY)).toBe(false); // past
    expect(isValidTestDate('2026-12-01', MONDAY)).toBe(false); // over 14 days
  });

  it('turn the card into a calm 3-day revision plan ending on the test day', () => {
    const prefs = { ...DEFAULT_PREFS, schoolChapters: { science: 'magnets' }, testDates: { science: '2026-11-20' } };
    const state = { ...playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract', { now: '2026-11-18T10:00:00.000Z' }), activeDays: ['2026-11-18'] };
    const plan = weekPlan(state, allClassWorlds(state, prefs), prefs, THURSDAY)!;
    expect(plan.path.chapter.lesson.id).toBe('magnets');
    expect(plan.test).toBeDefined();
    expect(testEyebrow(plan.test!)).toBe('Test tomorrow');
    // Topic 1 is mastered; topic 2 still needs revising.
    expect(plan.test!.toRevise).toBe(1);
    expect(plan.test!.days.map((d) => [d.label, d.state])).toEqual([
      ['Thu', 'today'],
      ['Fri', 'later'],
    ]);

    const earlier = weekPlan(state, allClassWorlds(state, prefs), prefs, MONDAY)!;
    expect(testEyebrow(earlier.test!)).toBe('Test on Friday');
    expect(earlier.test!.days.map((d) => d.label)).toEqual(['Wed', 'Thu', 'Fri']);
  });
});

describe('Monday check-in (H3)', () => {
  it('asks on the first open on a Monday when a chapter is set, and not again that week', () => {
    const prefs = { ...DEFAULT_PREFS, schoolChapters: { science: 'magnets' } };
    const worlds = allClassWorlds(learnerState({ grade: 6 }), prefs);
    expect(checkInDue(MONDAY, undefined, worlds)).toBe(true);
    expect(checkInDue(MONDAY, '2026-11-16', worlds)).toBe(false);
    expect(checkInDue(THURSDAY, undefined, worlds)).toBe(false);
    // Nothing set yet: the first-visit card handles it instead.
    expect(checkInDue(MONDAY, undefined, allClassWorlds(learnerState({ grade: 6 }), DEFAULT_PREFS))).toBe(false);
  });
});
