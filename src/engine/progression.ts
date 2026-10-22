import {
  branchesForLevel,
  getLesson,
  getLessonsForSubject,
  getTopic,
  getTopicsForLesson,
  lessonPrerequisites,
  lessonsForBranch,
  topicPrerequisites,
} from '../content';
import type { Grade, Lesson, Subject, SubjectBranch, SubjectId, SubjectLevel, TopicMeta, TopicStep } from '../domain/types';
import { TOPIC_STEPS } from '../domain/types';
import type { TopicProgress } from '../state/progressTypes';
import { REWARD_RULES, clamp01, starsForMastery } from './rules';

/**
 * Pure progression rules for Subject -> Lesson -> Topic -> steps.
 * They are enforced inside the progress reducer, not only in the UI.
 *
 * - A topic is COMPLETED when its Watch, Play and Practice steps are all done.
 * - A topic is MASTERED when it is completed with best mastery >= its pass mark.
 * - The next topic unlocks when the previous topic in the lesson is mastered.
 * - A lesson is COMPLETED when every topic in it is mastered.
 * - The next lesson unlocks when the previous lesson in the subject is completed.
 */

export type TopicRecords = Record<string, TopicProgress | undefined>;

export function passMastery(topic: TopicMeta): number {
  return topic.mastery?.passMastery ?? REWARD_RULES.unlock.minMastery;
}

/** Weighted average (0-1) of the best Play (if assessed) and Practice scores. */
export function computeTopicMastery(topic: TopicMeta, scores: TopicProgress['scores']): number {
  const parts: { score: number; weight: number }[] = [{ score: scores.practice ?? 0, weight: topic.practice.weight }];
  if (topic.play.assessed && topic.play.weight > 0) parts.push({ score: scores.play ?? 0, weight: topic.play.weight });
  const total = parts.reduce((s, p) => s + p.weight, 0);
  return total ? clamp01(parts.reduce((s, p) => s + clamp01(p.score) * p.weight, 0) / total) : 0;
}

export function isTopicCompleted(record: TopicProgress | undefined): boolean {
  return Boolean(record && record.status === 'completed');
}

export function isTopicMastered(topic: TopicMeta, topics: TopicRecords): boolean {
  const record = topics[topic.id];
  return isTopicCompleted(record) && (record?.bestMastery ?? 0) >= passMastery(topic);
}

export function isLessonComplete(lesson: Lesson, topics: TopicRecords): boolean {
  const list = getTopicsForLesson(lesson.id);
  return lesson.status === 'ready' && list.length > 0 && list.every((t) => isTopicMastered(t, topics));
}

export function missingLessonPrerequisites(lesson: Lesson, topics: TopicRecords): Lesson[] {
  return lessonPrerequisites(lesson)
    .map((id) => getLesson(id))
    .filter((l): l is Lesson => Boolean(l))
    .filter((l) => !isLessonComplete(l, topics));
}

export function isLessonUnlocked(lesson: Lesson, topics: TopicRecords): boolean {
  return lesson.status === 'ready' && missingLessonPrerequisites(lesson, topics).length === 0;
}

export function missingTopicPrerequisites(topic: TopicMeta, topics: TopicRecords): TopicMeta[] {
  return topicPrerequisites(topic)
    .map((id) => getTopic(id))
    .filter((t): t is TopicMeta => Boolean(t))
    .filter((t) => !isTopicMastered(t, topics));
}

export function isTopicUnlocked(topic: TopicMeta, topics: TopicRecords): boolean {
  const lesson = getLesson(topic.lessonId);
  return Boolean(lesson && isLessonUnlocked(lesson, topics) && missingTopicPrerequisites(topic, topics).length === 0);
}

/** Watch is always open; Play needs Watch; Practice needs Play. Completed topics stay open for replay. */
export function isStepAccessible(record: TopicProgress | undefined, step: TopicStep): boolean {
  const index = TOPIC_STEPS.indexOf(step);
  if (index < 0) return false;
  if (index === 0) return true;
  return Boolean(record && TOPIC_STEPS.slice(0, index).every((s) => record.completedSteps.includes(s)));
}

export function resumeStep(record: TopicProgress | undefined): TopicStep {
  if (!record) return 'watch';
  if (record.status !== 'completed' && isStepAccessible(record, record.currentStep)) return record.currentStep;
  return TOPIC_STEPS.find((s) => !record.completedSteps.includes(s)) ?? 'watch';
}

/* ------------------------------------------------------------------- views */

export type TopicState = 'locked' | 'available' | 'in-progress' | 'completed';

export interface TopicView {
  topic: TopicMeta;
  state: TopicState;
  mastery: number;
  stars: 0 | 1 | 2 | 3;
  /** Completed but below the pass mark, so the next topic is still locked. */
  needsPractice: boolean;
  stepsDone: TopicStep[];
  missing: TopicMeta[];
  record?: TopicProgress;
}

export function topicView(topic: TopicMeta, topics: TopicRecords): TopicView {
  const record = topics[topic.id];
  const unlocked = isTopicUnlocked(topic, topics);
  const state: TopicState = !unlocked ? 'locked' : isTopicCompleted(record) ? 'completed' : record ? 'in-progress' : 'available';
  return {
    topic,
    state,
    mastery: clamp01(record?.bestMastery ?? 0),
    stars: record?.stars ?? 0,
    needsPractice: state === 'completed' && !isTopicMastered(topic, topics),
    stepsDone: record?.completedSteps ?? [],
    missing: missingTopicPrerequisites(topic, topics),
    record,
  };
}

export type LessonState = 'in-development' | 'locked' | 'available' | 'in-progress' | 'completed';

export interface LessonView {
  lesson: Lesson;
  state: LessonState;
  topics: TopicView[];
  topicsMastered: number;
  topicsTotal: number;
  stars: number;
  maxStars: number;
  /** 0-1 share of topics mastered. */
  progress: number;
  missing: Lesson[];
  /** Topic to open from "Continue learning". */
  nextTopic?: TopicMeta;
}

export function lessonView(lesson: Lesson, topics: TopicRecords): LessonView {
  const views = getTopicsForLesson(lesson.id).map((t) => topicView(t, topics));
  const mastered = views.filter((v) => isTopicMastered(v.topic, topics)).length;
  const started = views.some((v) => v.record);
  let state: LessonState;
  if (lesson.status !== 'ready' || views.length === 0) state = 'in-development';
  else if (!isLessonUnlocked(lesson, topics)) state = 'locked';
  else if (isLessonComplete(lesson, topics)) state = 'completed';
  else if (started) state = 'in-progress';
  else state = 'available';
  const next =
    views.find((v) => v.state === 'in-progress') ??
    views.find((v) => v.state === 'available') ??
    views.find((v) => v.needsPractice);
  return {
    lesson,
    state,
    topics: views,
    topicsMastered: mastered,
    topicsTotal: views.length,
    stars: views.reduce((s, v) => s + v.stars, 0),
    maxStars: views.length * 3,
    progress: views.length ? mastered / views.length : 0,
    missing: missingLessonPrerequisites(lesson, topics),
    nextTopic: state === 'locked' || state === 'in-development' ? undefined : next?.topic,
  };
}

export type SubjectState = 'not-started' | 'in-progress' | 'completed';

export interface SubjectView {
  subject: Subject;
  state: SubjectState;
  lessons: LessonView[];
  lessonsTotal: number;
  lessonsReady: number;
  lessonsCompleted: number;
  topicsTotal: number;
  topicsMastered: number;
  stars: number;
  maxStars: number;
  /** 0-1 share of playable topics mastered. */
  progress: number;
  /** Lesson to open from "Continue". */
  nextLesson?: Lesson;
}

/** A subject's lessons and progress. With a grade, the next lesson prefers that class (after anything already started). */
export function subjectView(subject: Subject, topics: TopicRecords, grade?: Grade): SubjectView {
  const lessons = getLessonsForSubject(subject.id as SubjectId).map((l) => lessonView(l, topics));
  const ready = lessons.filter((l) => l.state !== 'in-development');
  const completed = ready.filter((l) => l.state === 'completed');
  const topicsTotal = ready.reduce((s, l) => s + l.topicsTotal, 0);
  const topicsMastered = ready.reduce((s, l) => s + l.topicsMastered, 0);
  const started = ready.some((l) => l.state === 'in-progress' || l.state === 'completed');
  const next =
    ready.find((l) => l.state === 'in-progress') ??
    (grade !== undefined ? ready.find((l) => l.state === 'available' && l.lesson.grades[0] <= grade && grade <= l.lesson.grades[1]) : undefined) ??
    ready.find((l) => l.state === 'available');
  return {
    subject,
    state: ready.length > 0 && completed.length === ready.length ? 'completed' : started ? 'in-progress' : 'not-started',
    lessons,
    lessonsTotal: lessons.length,
    lessonsReady: ready.length,
    lessonsCompleted: completed.length,
    topicsTotal,
    topicsMastered,
    stars: ready.reduce((s, l) => s + l.stars, 0),
    maxStars: ready.reduce((s, l) => s + l.maxStars, 0),
    progress: topicsTotal ? topicsMastered / topicsTotal : 0,
    nextLesson: next?.lesson ?? completed[completed.length - 1]?.lesson,
  };
}

export { starsForMastery };

/* ------------------------------------------------- levels and branches */

export type BranchState = 'coming-soon' | 'locked' | 'not-started' | 'in-progress' | 'completed';

/** Shared roll-up for a group of lessons (a branch, or a whole level). */
interface LessonGroupStats {
  lessons: LessonView[];
  lessonsTotal: number;
  lessonsReady: number;
  lessonsCompleted: number;
  lessonsLocked: number;
  topicsTotal: number;
  topicsMastered: number;
  /** 0-1 share of playable topics mastered. */
  progress: number;
  state: BranchState;
  /** Lesson to open from "Continue". */
  nextLesson?: LessonView;
}

function groupStats(lessons: LessonView[]): LessonGroupStats {
  const ready = lessons.filter((l) => l.state !== 'in-development');
  const playable = ready.filter((l) => l.state !== 'locked');
  const completed = ready.filter((l) => l.state === 'completed');
  const topicsTotal = ready.reduce((s, l) => s + l.topicsTotal, 0);
  const topicsMastered = ready.reduce((s, l) => s + l.topicsMastered, 0);
  const started = ready.some((l) => l.state === 'in-progress' || l.state === 'completed');
  const state: BranchState =
    ready.length === 0
      ? 'coming-soon'
      : completed.length === ready.length
        ? 'completed'
        : started
          ? 'in-progress'
          : playable.length === 0
            ? 'locked'
            : 'not-started';
  return {
    lessons,
    lessonsTotal: lessons.length,
    lessonsReady: ready.length,
    lessonsCompleted: completed.length,
    lessonsLocked: ready.length - playable.length,
    topicsTotal,
    topicsMastered,
    progress: topicsTotal ? topicsMastered / topicsTotal : 0,
    state,
    nextLesson: lessons.find((l) => l.state === 'in-progress') ?? lessons.find((l) => l.state === 'available'),
  };
}

export interface BranchView extends LessonGroupStats {
  subject: Subject;
  level: SubjectLevel;
  branch: SubjectBranch;
}

export function branchView(subject: Subject, level: SubjectLevel, branch: SubjectBranch, topics: TopicRecords): BranchView {
  const lessons = lessonsForBranch(subject.id, level.id, branch.id).map((l) => lessonView(l, topics));
  return { subject, level, branch, ...groupStats(lessons) };
}

export interface LevelView extends LessonGroupStats {
  subject: Subject;
  level: SubjectLevel;
  branches: BranchView[];
}

export function levelView(subject: Subject, level: SubjectLevel, topics: TopicRecords): LevelView {
  const branches = branchesForLevel(subject, level.id).map((b) => branchView(subject, level, b, topics));
  return { subject, level, branches, ...groupStats(branches.flatMap((b) => b.lessons)) };
}
