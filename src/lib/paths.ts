import { getLevel, getSubject } from '../content';
import type { Lesson, TopicMeta, TopicStep } from '../domain/types';

/**
 * URL helpers for the learning hierarchy:
 *   /subjects/:subject?class=6                  subject overview: one class's lesson roadmap
 *   /subjects/:subject/:lesson                  topic roadmap of a lesson
 *   /subjects/:subject/:lesson/:topic?step=     topic player (Learn = step "watch", Play, Practice, Complete)
 * Older links still work: /subjects/:subject/levels/:level[/:branch] open the overview at
 * that class (and branch), and /levels/level-1 … level-3 open the matching class.
 */

/** "class-6" → "6": the value of the ?class= parameter. */
export function classParam(levelId: string): string {
  return levelId.replace(/^class-/, '');
}

/** The subject overview, optionally at a class (level id such as "class-6") and scrolled to a branch. */
export function subjectPath(subjectId: string, levelId?: string, branchId?: string): string {
  const query = levelId ? `?class=${classParam(levelId)}` : '';
  return `/subjects/${subjectId}${query}${branchId ? `#${branchId}` : ''}`;
}

/** @deprecated Old class pages: kept so saved links can be built and redirected. Use subjectPath. */
export function levelPath(subjectId: string, levelId: string): string {
  return `/subjects/${subjectId}/levels/${levelId}`;
}

/** @deprecated Old branch pages: kept so saved links can be built and redirected. Use subjectPath. */
export function branchPath(subjectId: string, levelId: string, branchId: string): string {
  return `/subjects/${subjectId}/levels/${levelId}/${branchId}`;
}

export function lessonPath(subjectId: string, lessonId: string): string {
  return `/subjects/${subjectId}/${lessonId}`;
}

export function topicPath(topic: Pick<TopicMeta, 'id' | 'subjectId' | 'lessonId'>, step?: TopicStep | 'complete'): string {
  const base = `/subjects/${topic.subjectId}/${topic.lessonId}/${topic.id}`;
  return step ? `${base}?step=${step}` : base;
}

/** The roadmap a lesson is listed on: its subject overview at the lesson's class, at its branch. */
export function lessonParentPath(lesson: Pick<Lesson, 'subjectId' | 'levelId' | 'branchId'>): string {
  return subjectPath(lesson.subjectId, lesson.levelId, lesson.branchId);
}

export interface CrumbData {
  label: string;
  to?: string;
}

/** Breadcrumbs down to (and linking) the subject overview a lesson is on. */
export function lessonParentCrumbs(lesson: Pick<Lesson, 'subjectId' | 'levelId' | 'branchId'>): CrumbData[] {
  const crumbs: CrumbData[] = [{ label: 'Home', to: '/home' }, { label: 'Subjects', to: '/subjects' }];
  if (getSubject(lesson.subjectId)) crumbs.push({ label: lessonParentName(lesson), to: lessonParentPath(lesson) });
  return crumbs;
}

/** Name of the roadmap a lesson sits on, for "Back to ..." links: "Science · Class 6". */
export function lessonParentName(lesson: Pick<Lesson, 'subjectId' | 'levelId'>): string {
  const subject = getSubject(lesson.subjectId);
  const level = getLevel(lesson.subjectId, lesson.levelId);
  if (!subject) return 'Subjects';
  return level ? `${subject.name} · ${level.title.split(':')[0]}` : subject.name;
}
