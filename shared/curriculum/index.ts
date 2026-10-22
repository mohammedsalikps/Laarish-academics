import { getLesson } from './catalog.js';
import { ENGLISH_TOPICS } from './topics/english.js';
import { LANGUAGE_TOPICS } from './topics/languages.js';
import { MATHEMATICS_TOPICS } from './topics/mathematics.js';
import { NUMBERS_AND_ALGEBRA_TOPICS } from './topics/numbersAndAlgebra.js';
import { SCIENCE_TOPICS } from './topics/science.js';
import { SENTENCE_TOPICS } from './topics/sentences.js';
import { SOCIAL_TOPICS } from './topics/social.js';
import { MATHS_1_3_TOPICS } from './topics/maths-1-3.js';
import { MATHS_4_5_TOPICS } from './topics/maths-4-5.js';
import { MATHS_6_8_TOPICS } from './topics/maths-6-8.js';
import { SCIENCE_1_5_TOPICS } from './topics/science-1-5.js';
import { SCIENCE_6_8_TOPICS } from './topics/science-6-8.js';
import { ENGLISH_1_8_TOPICS } from './topics/english-1-8.js';
import { HINDI_1_8_TOPICS } from './topics/hindi-1-8.js';
import { KANNADA_1_8_TOPICS } from './topics/kannada-1-8.js';
import { SOCIAL_1_8_TOPICS } from './topics/social-1-8.js';
import type { Lesson, Subject, SubjectId, Topic } from './types.js';

/**
 * The whole curriculum with full topic content, for the mentor server, scripts
 * and tests. It re-exports the catalog (catalog.ts), with getTopic and
 * getTopicsForLesson returning full topics. The browser app imports the catalog
 * only and loads topic content per subject (topicContent.ts), so it does not
 * download every subject's videos, games and quizzes on first load.
 */

export * from './catalog.js';

export const TOPICS: Topic[] = [
  ...SCIENCE_TOPICS,
  ...MATHEMATICS_TOPICS,
  ...NUMBERS_AND_ALGEBRA_TOPICS,
  ...ENGLISH_TOPICS,
  ...SENTENCE_TOPICS,
  ...LANGUAGE_TOPICS,
  ...SOCIAL_TOPICS,
  ...MATHS_1_3_TOPICS,
  ...MATHS_4_5_TOPICS,
  ...MATHS_6_8_TOPICS,
  ...SCIENCE_1_5_TOPICS,
  ...SCIENCE_6_8_TOPICS,
  ...ENGLISH_1_8_TOPICS,
  ...HINDI_1_8_TOPICS,
  ...KANNADA_1_8_TOPICS,
  ...SOCIAL_1_8_TOPICS,
];

const topicsById = new Map(TOPICS.map((t) => [t.id, t]));

/** A topic with its full content. */
export function getTopic(id: string | undefined | null): Topic | undefined {
  return id ? topicsById.get(id) : undefined;
}

/** Topics of a lesson in roadmap order, with their full content. */
export function getTopicsForLesson(lessonId: string): Topic[] {
  const lesson = getLesson(lessonId);
  return lesson ? lesson.topicIds.map((id) => topicsById.get(id)).filter((t): t is Topic => Boolean(t)) : [];
}

/** Topic ids whose official video has not been delivered yet. */
export function missingVideoAssets(): { topicId: string; videoId: string }[] {
  return TOPICS.filter((t) => t.watch.video.status === 'missing' && !t.watch.video.src).map((t) => ({ topicId: t.id, videoId: t.watch.video.id }));
}

/**
 * Readiness of each part of a topic, tracked separately:
 * - video: an official, checked video ('ready') or the temporary animated explainer ('explainer')
 * - game: an assessed mini-game that counts towards mastery, or an exploratory one
 * - quiz: the Practice quiz has at least 3 questions
 * - assessment: an end-of-lesson assessment (not built yet for any lesson: 'planned')
 */
export interface TopicReadiness {
  subjectId: SubjectId;
  lessonId: string;
  topicId: string;
  title: string;
  video: 'ready' | 'explainer';
  game: 'assessed' | 'exploratory';
  quiz: 'ready' | 'missing';
  assessment: 'planned';
}

export function topicReadiness(topic: Topic): TopicReadiness {
  return {
    subjectId: topic.subjectId,
    lessonId: topic.lessonId,
    topicId: topic.id,
    title: topic.title,
    video: topic.watch.video.status === 'available' ? 'ready' : 'explainer',
    game: topic.play.assessed ? 'assessed' : 'exploratory',
    quiz: topic.practice.questions.length >= 3 ? 'ready' : 'missing',
    assessment: 'planned',
  };
}

export interface SubjectReadiness {
  subjectId: SubjectId;
  lessons: number;
  lessonsReady: number;
  lessonsProposed: number;
  lessonsInDevelopment: number;
  topics: number;
  videosReady: number;
}

export function subjectReadiness(subject: Subject): SubjectReadiness {
  const lessons = subject.lessonIds.map((id) => getLesson(id)).filter((l): l is Lesson => Boolean(l));
  const topics = TOPICS.filter((t) => t.subjectId === subject.id);
  return {
    subjectId: subject.id,
    lessons: lessons.length,
    lessonsReady: lessons.filter((l) => l.status === 'ready').length,
    lessonsProposed: lessons.filter((l) => l.proposed).length,
    lessonsInDevelopment: lessons.filter((l) => l.status === 'in-development').length,
    topics: topics.length,
    videosReady: topics.filter((t) => t.watch.video.status === 'available').length,
  };
}

