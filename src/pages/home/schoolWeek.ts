import type { SubjectId } from '../../domain/types';
import { isTopicMastered } from '../../engine/progression';
import { weekKey, type AcademicsPrefs } from '../../state/academicsPrefs';
import type { ProgressState } from '../../state/progressTypes';
import { chapterPath, type ChapterPath, type ClassWorld } from '../world/worldData';

/** Dates as local YYYY-MM-DD strings. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDay(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A valid test date: Monday–Saturday, today or within the next 14 days (H4). */
export function isValidTestDate(key: string, today: Date): boolean {
  const d = parseDay(key);
  if (!d || d.getDay() === 0) return false;
  const days = daysBetween(today, d);
  return days >= 0 && days <= 14;
}

export interface TestWeek {
  date: Date;
  daysLeft: number;
  /** Topics under the 60 % mark. */
  toRevise: number;
  /** The plan's days, ending on the test day. */
  days: { date: Date; label: string; state: 'done' | 'today' | 'later' | 'missed' }[];
}

export interface WeekPlan {
  world: ClassWorld;
  path: ChapterPath;
  test?: TestWeek;
  /** Every topic in the chapter is mastered. */
  allDone: boolean;
}

/**
 * The chapter the ThisWeekCard leads with: a subject with a test coming up
 * first, otherwise the first subject (syllabus order) whose chapter still has
 * work to do, otherwise the first one set.
 */
export function weekPlan(state: ProgressState, worlds: ClassWorld[], prefs: AcademicsPrefs, today: Date): WeekPlan | null {
  const plans: WeekPlan[] = [];
  for (const world of worlds) {
    if (!world.thisWeek) continue;
    const path = chapterPath(state, world.thisWeek.lesson, prefs);
    if (!path) continue;
    const allDone = path.topics.length > 0 && path.topics.every((t) => isTopicMastered(t.topic, state.topics));
    plans.push({ world, path, allDone, test: testWeek(state, path, prefs.testDates[world.subject.id as SubjectId], today) });
  }
  return plans.find((p) => p.test) ?? plans.find((p) => !p.allDone) ?? plans[0] ?? null;
}

function testWeek(state: ProgressState, path: ChapterPath, testDate: string | undefined, today: Date): TestWeek | undefined {
  if (!testDate || !isValidTestDate(testDate, today)) return undefined;
  const date = parseDay(testDate)!;
  const daysLeft = daysBetween(today, date);
  const active = new Set(state.activeDays ?? []);
  const days = [2, 1, 0]
    .map((back) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - back))
    // A test tomorrow is a one-day plan; never plan on a Sunday.
    .filter((d) => (daysLeft <= 1 ? daysBetween(today, d) >= 0 : true) && d.getDay() !== 0)
    .map((d) => {
      const offset = daysBetween(today, d);
      const state: TestWeek['days'][number]['state'] = offset === 0 ? 'today' : offset > 0 ? 'later' : active.has(dayKey(d)) ? 'done' : 'missed';
      return { date: d, label: WEEKDAYS[d.getDay()].slice(0, 3), state };
    });
  return { date, daysLeft, toRevise: path.topics.filter((t) => !isTopicMastered(t.topic, state.topics)).length, days };
}

export function testEyebrow(test: TestWeek): string {
  if (test.daysLeft === 0) return 'Test today';
  if (test.daysLeft === 1) return 'Test tomorrow';
  return `Test on ${WEEKDAYS[test.date.getDay()]}`;
}

/** Whether to ask "Is your class still on …?" today (wireframe H3). `?checkin` forces it for demos. */
export function checkInDue(today: Date, lastWeek: string | undefined, worlds: ClassWorld[]): boolean {
  const forced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('checkin');
  return worlds.some((w) => w.thisWeek) && (forced || (today.getDay() === 1 && lastWeek !== weekKey(today)));
}
