import { LESSONS, SAMPLE_CURRICULUM_NOTICE, SUBJECTS } from './subjects.js';
import { TOPIC_INDEX } from './topicIndex.js';
import type { Grade, Lesson, Subject, SubjectBranch, SubjectId, SubjectLevel, TopicMeta } from './types.js';

/**
 * Curriculum catalog: subjects, classes, branches, lessons and the topic index.
 * Every screen reads curriculum through these helpers, so the data can later be
 * replaced by a CMS or database query without touching UI code.
 *
 * Topics here are TopicMeta (titles, order, rules), small enough to ship with
 * the app. A topic's full content is loaded per subject with loadSubjectTopics
 * (topicContent.ts); the mentor server imports everything from index.ts.
 */

export { LESSONS, SAMPLE_CURRICULUM_NOTICE, SUBJECTS, TOPIC_INDEX };

const subjectsById = new Map(SUBJECTS.map((s) => [s.id, s]));
const lessonsById = new Map(LESSONS.map((l) => [l.id, l]));
const topicsById = new Map(TOPIC_INDEX.map((t) => [t.id, t]));

export function getSubject(id: string | undefined | null): Subject | undefined {
  return id ? subjectsById.get(id as SubjectId) : undefined;
}

export function getLesson(id: string | undefined | null): Lesson | undefined {
  return id ? lessonsById.get(id) : undefined;
}

export function getTopic(id: string | undefined | null): TopicMeta | undefined {
  return id ? topicsById.get(id) : undefined;
}

/** Lessons of a subject in roadmap order. */
export function getLessonsForSubject(subjectId: SubjectId): Lesson[] {
  const subject = subjectsById.get(subjectId);
  return subject ? subject.lessonIds.map((id) => lessonsById.get(id)).filter((l): l is Lesson => Boolean(l)) : [];
}

/** Topics of a lesson in roadmap order. */
export function getTopicsForLesson(lessonId: string): TopicMeta[] {
  const lesson = lessonsById.get(lessonId);
  return lesson ? lesson.topicIds.map((id) => topicsById.get(id)).filter((t): t is TopicMeta => Boolean(t)) : [];
}

/**
 * The ordered roadmap a lesson belongs to: its branch within its level (for
 * subjects with levels, e.g. Mathematics), otherwise the whole subject.
 */
export function lessonRoadmap(lesson: Lesson): Lesson[] {
  if (lesson.levelId && lesson.branchId) return lessonsForBranch(lesson.subjectId, lesson.levelId, lesson.branchId);
  return getLessonsForSubject(lesson.subjectId);
}

/** Prerequisite lesson ids: explicit, or the previous lesson in the same roadmap. */
export function lessonPrerequisites(lesson: Lesson): string[] {
  if (lesson.prerequisites) return lesson.prerequisites;
  const roadmap = lessonRoadmap(lesson);
  const index = roadmap.findIndex((l) => l.id === lesson.id);
  return index > 0 ? [roadmap[index - 1].id] : [];
}

/* ------------------------------------------------------ levels and branches */

export function getLevel(subjectId: string | undefined, levelId: string | undefined): SubjectLevel | undefined {
  return subjectsById.get(subjectId as SubjectId)?.levels?.find((l) => l.id === levelId);
}

export function getBranch(subjectId: string | undefined, branchId: string | undefined): SubjectBranch | undefined {
  return subjectsById.get(subjectId as SubjectId)?.branches?.find((b) => b.id === branchId);
}

/** Lessons of one branch within one level, in roadmap order. */
export function lessonsForBranch(subjectId: SubjectId, levelId: string, branchId: string): Lesson[] {
  return getLessonsForSubject(subjectId)
    .filter((l) => l.levelId === levelId && l.branchId === branchId)
    .sort((a, b) => a.order - b.order);
}

/** Branches that have at least one lesson in the level, in the subject's branch order. */
export function branchesForLevel(subject: Subject, levelId: string): SubjectBranch[] {
  return (subject.branches ?? []).filter((b) => lessonsForBranch(subject.id, levelId, b.id).length > 0);
}

/** Grade bands used as levels before levels became classes (links to them may still be saved). */
const LEGACY_LEVELS: Record<string, readonly [Grade, Grade]> = { 'level-1': [1, 2], 'level-2': [3, 4], 'level-3': [5, 7] };

/** The class level an old grade-band level id now points to: the learner's class if it is in the band, else the band's first class. */
export function legacyLevelToClass(levelId: string | undefined, grade?: Grade): string | undefined {
  const band = levelId ? LEGACY_LEVELS[levelId] : undefined;
  if (!band) return undefined;
  return `class-${grade !== undefined && grade >= band[0] && grade <= band[1] ? grade : band[0]}`;
}

/** The level recommended for a grade (the first level whose grade band contains it). */
export function levelForGrade(subject: Subject, grade: Grade): SubjectLevel | undefined {
  return subject.levels?.find((l) => grade >= l.grades[0] && grade <= l.grades[1]);
}

/** Prerequisite topic ids: explicit, or the previous topic in the lesson. */
export function topicPrerequisites(topic: TopicMeta): string[] {
  if (topic.prerequisites) return topic.prerequisites;
  const lesson = lessonsById.get(topic.lessonId);
  const index = lesson?.topicIds.indexOf(topic.id) ?? -1;
  return index > 0 ? [lesson!.topicIds[index - 1]] : [];
}

export function nextTopicInLesson(topic: TopicMeta): TopicMeta | undefined {
  const lesson = lessonsById.get(topic.lessonId);
  const index = lesson?.topicIds.indexOf(topic.id) ?? -1;
  return index >= 0 ? topicsById.get(lesson!.topicIds[index + 1] ?? '') : undefined;
}

/** The next lesson in the same roadmap (branch, or subject). */
export function nextLessonInSubject(lesson: Lesson): Lesson | undefined {
  const roadmap = lessonRoadmap(lesson);
  const index = roadmap.findIndex((l) => l.id === lesson.id);
  return index >= 0 ? roadmap[index + 1] : undefined;
}

export function isLessonForGrade(lesson: Lesson, grade: Grade): boolean {
  return grade >= lesson.grades[0] && grade <= lesson.grades[1];
}

export function gradeLabel(grades: readonly [Grade, Grade]): string {
  return grades[0] === grades[1] ? `Class ${grades[0]}` : `Classes ${grades[0]}-${grades[1]}`;
}

/** Display label such as "Lesson 1: Friction". */
export function lessonLabel(lesson: Lesson): string {
  return `Lesson ${lesson.order}: ${lesson.title}`;
}

/** Display label such as "Topic 2: Rough and smooth surfaces". */
export function topicLabel(topic: Pick<TopicMeta, 'order' | 'title'>): string {
  return `Topic ${topic.order}: ${topic.title}`;
}

export * from './types.js';
