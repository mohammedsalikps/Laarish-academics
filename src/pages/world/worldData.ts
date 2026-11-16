import { getSubject, getTopicsForLesson, levelForGrade } from '../../content';
import type { Grade, Lesson, Subject, SubjectId, SubjectLevel, TopicMeta } from '../../domain/types';
import { isTopicMastered, lessonView, levelView, topicView, type LessonView, type TopicView } from '../../engine/progression';
import type { AcademicsPrefs } from '../../state/academicsPrefs';
import type { ProgressState } from '../../state/progressTypes';
import { WORLDS, worldFor, type WorldTheme } from '../../world3d/worlds';

/**
 * What the world hub, subject worlds and chapter paths show, computed from the
 * real catalog and the learner's saved progress (never sample numbers).
 * In the wireframe a "chapter" is what the app calls a lesson.
 */

export type ChapterState = 'not-started' | 'in-progress' | 'mastered' | 'coming-soon' | 'locked';

export interface ChapterInfo {
  lesson: Lesson;
  view: LessonView;
  state: ChapterState;
  /** 0–1 average best mastery over the chapter's topics. */
  mastery: number;
  thisWeek: boolean;
  /** The chapter Rishi would suggest for this week. */
  suggested: boolean;
}

export interface ClassWorld {
  subject: Subject;
  theme: WorldTheme;
  grade: Grade;
  level: SubjectLevel | undefined;
  chapters: ChapterInfo[];
  /** 0–1 average best mastery over the class's playable topics. */
  mastery: number;
  thisWeek?: ChapterInfo;
}

function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

/**
 * Chapters in textbook order: the chapter number recorded with the lesson's
 * verified source ("Chapter 4 title verified…"), else the roadmap order.
 */
export function textbookOrder(lesson: Lesson): number {
  const m = lesson.source?.verification.match(/\bChapter (\d+)\b/);
  return m ? Number(m[1]) : 100 + lesson.order;
}

export function chapterState(view: LessonView): ChapterState {
  switch (view.state) {
    case 'in-development':
      return 'coming-soon';
    case 'locked':
      return 'locked';
    case 'completed':
      return 'mastered';
    case 'in-progress':
      return 'in-progress';
    default:
      return view.topics.some((t) => t.record) ? 'in-progress' : 'not-started';
  }
}

/** The chapter to suggest when nobody has said what the class is on: the first unfinished, open chapter. */
function suggestion(chapters: ChapterInfo[]): ChapterInfo | undefined {
  return (
    chapters.find((c) => c.state === 'in-progress') ??
    chapters.find((c) => c.state === 'not-started') ??
    chapters.find((c) => c.state === 'mastered')
  );
}

export function classWorld(state: ProgressState, subjectId: SubjectId, prefs: AcademicsPrefs, gradeOverride?: Grade): ClassWorld | undefined {
  const subject = getSubject(subjectId);
  const grade = gradeOverride ?? state.learner?.grade ?? 6;
  if (!subject) return undefined;
  const level = levelForGrade(subject, grade);
  const lessons = level ? levelView(subject, level, state.topics).lessons : [];
  const chosen = prefs.schoolChapters[subjectId];
  const chapters: ChapterInfo[] = lessons
    .slice()
    .sort((a, b) => textbookOrder(a.lesson) - textbookOrder(b.lesson))
    .map((view) => ({
      lesson: view.lesson,
      view,
      state: chapterState(view),
      mastery: average(view.topics.filter((t) => !t.topic.extension).map((t) => t.mastery)),
      thisWeek: view.lesson.id === chosen,
      suggested: false,
    }));
  const suggested = suggestion(chapters);
  if (suggested) suggested.suggested = true;
  const playable = chapters.filter((c) => c.state !== 'coming-soon').flatMap((c) => c.view.topics.filter((t) => !t.topic.extension).map((t) => t.mastery));
  return {
    subject,
    theme: worldFor(subjectId),
    grade,
    level,
    chapters,
    mastery: average(playable),
    thisWeek: chapters.find((c) => c.thisWeek),
  };
}

export function allClassWorlds(state: ProgressState, prefs: AcademicsPrefs): ClassWorld[] {
  return WORLDS.map((w) => classWorld(state, w.subjectId, prefs)).filter((w): w is ClassWorld => !!w);
}

export interface ChapterPath {
  world: ClassWorld;
  chapter: ChapterInfo;
  topics: TopicView[];
  /** The topic to focus: in progress, else the next open one, else the last. */
  current?: TopicView;
  mastered: number;
}

export function chapterPath(state: ProgressState, lesson: Lesson, prefs: AcademicsPrefs): ChapterPath | undefined {
  const world = classWorld(state, lesson.subjectId as SubjectId, prefs, lesson.grades[0] as Grade);
  const chapter = world?.chapters.find((c) => c.lesson.id === lesson.id) ?? (world && {
    lesson,
    view: lessonView(lesson, state.topics),
    state: chapterState(lessonView(lesson, state.topics)),
    mastery: 0,
    thisWeek: false,
    suggested: false,
  });
  if (!world || !chapter) return undefined;
  const topics = getTopicsForLesson(lesson.id).map((t) => topicView(t, state.topics));
  const current =
    topics.find((t) => t.state === 'in-progress') ?? topics.find((t) => t.state === 'available') ?? topics.find((t) => t.needsPractice) ?? topics[topics.length - 1];
  // Mastered counts the topics that decide the chapter ("Explore more" topics are extra).
  return { world, chapter, topics, current, mastered: topics.filter((t) => !t.topic.extension && isTopicMastered(t.topic, state.topics)).length };
}

export function percent(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

/** Minutes for the steps of a topic that are still to do. */
export function minutesLeft(topic: TopicMeta, view: TopicView): number {
  const done = view.stepsDone.length;
  const total = topic.estimatedMinutes ?? 12;
  return Math.max(3, Math.round((total * (3 - Math.min(3, done))) / 3));
}

const STATE_WORDS: Record<ChapterInfo['state'], string> = {
  'not-started': 'not started',
  'in-progress': 'in progress',
  mastered: 'mastered',
  'coming-soon': 'coming soon',
  locked: 'locked',
};

/** Accessible name for a chapter pin or row ("Magnets, in progress, 40 percent, this week"). */
export function chapterLabel(c: ChapterInfo): string {
  const parts = [c.lesson.title, STATE_WORDS[c.state]];
  if (c.state === 'in-progress') parts.push(`${percent(c.mastery)} percent`);
  if (c.state === 'mastered') parts.push(`${c.view.stars} of ${c.view.maxStars} stars`);
  if (c.thisWeek) parts.push('this week');
  return parts.join(', ');
}

/**
 * The chapters pinned on the 3D island: every ready chapter plus one "coming
 * soon" (wireframe: 4–6 landmarks per world, one dashed "soon" pin). List view
 * still shows all of them.
 */
export function pinnedChapters(world: ClassWorld): ChapterInfo[] {
  const ready = world.chapters.filter((c) => c.state !== 'coming-soon');
  const soon = world.chapters.find((c) => c.state === 'coming-soon');
  return soon ? [...ready, soon] : ready;
}
