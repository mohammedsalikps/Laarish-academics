import { SUBJECTS, getLesson, getSubject, getTopic, isLessonForGrade } from '../content';
import type { Lesson, Subject, TopicMeta, TopicStep } from '../domain/types';
import { resumeStep, subjectView, type SubjectView, type TopicView } from '../engine/progression';
import { REWARD_RULES, levelFromXp } from '../engine/rules';
import { localDateKey, shiftDateKey } from '../lib/dates';
import type { ActivityEntry, ProgressState } from './progressTypes';

/** Derived, read-only views of progress state. Balances always come from the ledger. */

export function totalXp(state: ProgressState): number {
  return state.ledger.reduce((sum, e) => sum + Math.max(0, e.xp), 0);
}

export function coinBalance(state: ProgressState): number {
  return Math.max(
    0,
    state.ledger.reduce((sum, e) => sum + e.coins, 0),
  );
}

export function levelInfo(state: ProgressState) {
  return levelFromXp(totalXp(state));
}

export function xpOnDay(state: ProgressState, dayKey: string): number {
  return state.ledger.filter((e) => e.xp > 0 && localDateKey(e.at) === dayKey).reduce((sum, e) => sum + e.xp, 0);
}

export function dailyGoal(state: ProgressState): number {
  return state.learner?.dailyGoalXp ?? REWARD_RULES.dailyGoal.default;
}

/** Current streak in days. A streak stays alive until a full day passes with no activity. */
export function currentStreak(state: ProgressState, today: string): number {
  const days = new Set(state.activeDays);
  let cursor = days.has(today) ? today : shiftDateKey(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function longestStreak(state: ProgressState): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of state.activeDays) {
    run = prev && shiftDateKey(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function totalStars(state: ProgressState): number {
  return Object.values(state.topics).reduce((sum, t) => sum + (t?.stars ?? 0), 0);
}

export function completedTopicCount(state: ProgressState): number {
  return Object.values(state.topics).filter((t) => t?.status === 'completed').length;
}

export function subjectViews(state: ProgressState): SubjectView[] {
  return SUBJECTS.map((s) => subjectView(s, state.topics, state.learner?.grade));
}

export function subjectProgress(state: ProgressState, subject: Subject): SubjectView {
  return subjectView(subject, state.topics, state.learner?.grade);
}

export interface OverallProgress {
  lessonsCompleted: number;
  lessonsReady: number;
  topicsMastered: number;
  topicsTotal: number;
  progress: number;
}

export function overallProgress(state: ProgressState): OverallProgress {
  const views = subjectViews(state);
  const topicsTotal = views.reduce((s, v) => s + v.topicsTotal, 0);
  const topicsMastered = views.reduce((s, v) => s + v.topicsMastered, 0);
  return {
    lessonsCompleted: views.reduce((s, v) => s + v.lessonsCompleted, 0),
    lessonsReady: views.reduce((s, v) => s + v.lessonsReady, 0),
    topicsMastered,
    topicsTotal,
    progress: topicsTotal ? topicsMastered / topicsTotal : 0,
  };
}

export interface NextActivity {
  kind: 'resume' | 'start' | 'improve' | 'replay';
  subject: Subject;
  lesson: Lesson;
  topic: TopicMeta;
  step: TopicStep;
}

function activityFor(kind: NextActivity['kind'], topic: TopicMeta, step: TopicStep): NextActivity | null {
  const lesson = getLesson(topic.lessonId);
  const subject = getSubject(topic.subjectId);
  return lesson && subject ? { kind, subject, lesson, topic, step } : null;
}

/**
 * The single best "Continue learning" target:
 * 1. resume the most recently played unfinished topic,
 * 2. otherwise start the next unlocked topic (preferring the learner's grade and interests),
 * 3. otherwise practise a completed topic that is below its pass mark,
 * 4. otherwise replay the most recent topic.
 */
export function nextActivity(state: ProgressState): NextActivity | null {
  const all: TopicView[] = subjectViews(state).flatMap((s) => s.lessons.flatMap((l) => l.topics));
  const recent = (a: TopicView, b: TopicView) => (b.record?.lastPlayedAt ?? '').localeCompare(a.record?.lastPlayedAt ?? '');

  const resume = all.filter((v) => v.state === 'in-progress').sort(recent)[0];
  if (resume) return activityFor('resume', resume.topic, resumeStep(resume.record));

  const grade = state.learner?.grade;
  const interests = state.learner?.interests ?? [];
  // Lessons the learner has already started come first, so "Continue" carries on with the same lesson.
  const started = new Set(all.filter((v) => v.state === 'completed').map((v) => v.topic.lessonId));
  const score = (v: TopicView) => {
    const lesson = getLesson(v.topic.lessonId)!;
    return (
      (started.has(lesson.id) ? 0 : 200) +
      (grade && !isLessonForGrade(lesson, grade) ? 100 : 0) +
      (interests.includes(v.topic.subjectId) ? 0 : 50) +
      (v.topic.subjectId === 'science' ? 0 : 10) +
      lesson.order * 2 +
      v.topic.order
    );
  };
  const start = all.filter((v) => v.state === 'available').sort((a, b) => score(a) - score(b))[0];
  if (start) return activityFor('start', start.topic, 'watch');

  const improve = all.filter((v) => v.needsPractice).sort(recent)[0];
  if (improve) return activityFor('improve', improve.topic, 'practice');

  const replay = all.filter((v) => v.state === 'completed').sort(recent)[0];
  return replay ? activityFor('replay', replay.topic, 'watch') : null;
}

/** XP per day for the last `days` days (oldest first). */
export function xpHistory(state: ProgressState, today: string, days = 7): { day: string; xp: number }[] {
  return Array.from({ length: days }, (_, i) => {
    const day = shiftDateKey(today, i - (days - 1));
    return { day, xp: xpOnDay(state, day) };
  });
}

export interface ActivityWithRewards extends ActivityEntry {
  xp: number;
  coins: number;
}

/** Recent activity entries with the XP and coins earned by the same action. */
export function recentActivityWithRewards(state: ProgressState, limit = 6): ActivityWithRewards[] {
  return state.activity.slice(0, limit).map((a) => {
    const entries =
      a.kind === 'achievement'
        ? state.ledger.filter((e) => e.key === `achievement:${a.ref}`)
        : a.kind === 'lesson'
          ? state.ledger.filter((e) => e.key === `lesson:${a.lessonId}:complete`)
          : state.ledger.filter((e) => e.at === a.at && e.kind === 'reward' && !e.key.startsWith('achievement:') && !e.key.startsWith('lesson:'));
    return { ...a, xp: entries.reduce((s, e) => s + e.xp, 0), coins: entries.reduce((s, e) => s + e.coins, 0) };
  });
}

export function lessonForTopicId(topicId: string): Lesson | undefined {
  const topic = getTopic(topicId);
  return topic ? getLesson(topic.lessonId) : undefined;
}
