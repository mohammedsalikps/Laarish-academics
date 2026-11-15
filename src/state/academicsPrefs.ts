import { useSyncExternalStore } from 'react';
import type { SubjectId } from '../domain/types';

/**
 * Academics preferences that sit beside the learner's progress: the chapters
 * the child's class is on this week, test dates, Lite mode and the Monday
 * check-in. They are kept under their own storage key so the saved-progress
 * format (schema v2) is untouched and older saves load exactly as before.
 */

export type LiteModeSetting = 'auto' | 'on' | 'off';

export interface AcademicsPrefs {
  version: 1;
  liteMode: LiteModeSetting;
  /** Lesson id of the chapter each subject's class is on this week. */
  schoolChapters: Partial<Record<SubjectId, string>>;
  /** Test dates (YYYY-MM-DD) per subject. */
  testDates: Partial<Record<SubjectId, string>>;
  /** Week key (Monday's date) of the last answered Monday check-in. */
  checkInWeek?: string;
  /** Who last changed the school chapters (for the grown-ups' conflict note). */
  chaptersChangedBy?: 'child' | 'grown-up';
  dailyGoalMinutes: 10 | 20 | 30;
  /** Rishi's AI chat; off = prepared hints only. */
  rishiChat: boolean;
}

export const PREFS_KEY = 'laarish-academics:academics-prefs';

export const DEFAULT_PREFS: AcademicsPrefs = {
  version: 1,
  liteMode: 'auto',
  schoolChapters: {},
  testDates: {},
  dailyGoalMinutes: 20,
  rishiChat: true,
};

let current: AcademicsPrefs | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function sanitize(raw: unknown): AcademicsPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS };
  const r = raw as Partial<AcademicsPrefs>;
  return {
    version: 1,
    liteMode: r.liteMode === 'on' || r.liteMode === 'off' ? r.liteMode : 'auto',
    schoolChapters: r.schoolChapters && typeof r.schoolChapters === 'object' ? { ...r.schoolChapters } : {},
    testDates: r.testDates && typeof r.testDates === 'object' ? { ...r.testDates } : {},
    checkInWeek: typeof r.checkInWeek === 'string' ? r.checkInWeek : undefined,
    chaptersChangedBy: r.chaptersChangedBy === 'grown-up' || r.chaptersChangedBy === 'child' ? r.chaptersChangedBy : undefined,
    dailyGoalMinutes: r.dailyGoalMinutes === 10 || r.dailyGoalMinutes === 30 ? r.dailyGoalMinutes : 20,
    rishiChat: r.rishiChat !== false,
  };
}

export function getPrefs(): AcademicsPrefs {
  if (current) return current;
  try {
    const text = storage()?.getItem(PREFS_KEY);
    current = sanitize(text ? JSON.parse(text) : null);
  } catch {
    current = { ...DEFAULT_PREFS };
  }
  return current;
}

export function updatePrefs(patch: Partial<AcademicsPrefs> | ((prefs: AcademicsPrefs) => Partial<AcademicsPrefs>)) {
  const prev = getPrefs();
  current = sanitize({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) });
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(current));
  } catch {
    // Storage full or blocked: keep the change for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PREFS_KEY) {
      current = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useAcademicsPrefs(): AcademicsPrefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}

/** For tests: forget the cached copy so the next read comes from storage. */
export function resetPrefsCache() {
  current = null;
}

/** Monday of the week containing `date`, as YYYY-MM-DD (local time). */
export function weekKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
