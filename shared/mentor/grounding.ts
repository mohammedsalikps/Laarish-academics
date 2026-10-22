import { getLesson, getSubject, SUBJECTS } from '../curriculum/catalog.js';
import type { Lesson, Subject, Topic, TopicMentor } from '../curriculum/types.js';
import type { MentorContext } from './types.js';

/**
 * Mentor grounding. Lesson facts come from the curriculum (topic.mentor), looked
 * up on the server by id, so the browser cannot inject its own "facts" into the
 * AI prompt. The demo mentor answers from the same data. This module does not
 * import topic content itself: the server passes the full curriculum
 * (knowledge.ts) and the browser passes the subject it has loaded.
 */

export interface MentorGrounding {
  subject?: Subject;
  lesson?: Lesson;
  topic?: Topic;
  /** Short name of what is being learned, e.g. "rough and smooth surfaces". */
  focus: string;
  mentor: TopicMentor;
}

export const GENERAL_MENTOR: TopicMentor = {
  facts: [
    `Laarish Academics has subject worlds for ${SUBJECTS.map((s) => s.name).join(', ')}.`,
    'Each subject has lessons, each lesson has topics, and every topic has four steps: Learn (a short video or animation), Play, Practice and Complete.',
    'Completing topics earns XP, coins and stars. A topic is mastered at 60% or more, which unlocks the next topic.',
  ],
  simpler: 'Pick a subject, open a lesson, and choose a topic. Then watch, play and practise!',
  examples: ['You could start with the Friction lesson in Science, where you push boxes and race toy cars on different surfaces.'],
  hints: { default: 'Open a topic and I can give you hints that match exactly what you are learning.' },
  faq: [
    {
      keywords: ['xp', 'coin', 'star', 'level'],
      answer: 'You earn XP for learning and coins for finishing topics and achievements. Stars show how well you mastered a topic. Coins can unlock new avatars!',
    },
    { keywords: ['locked', 'unlock'], answer: 'Topics unlock when you master the one before with at least 60%. Lessons unlock when you finish every topic in the lesson before. If you are close, try the quiz again!' },
  ],
  practice: [],
};

export type GroundingContext = Pick<MentorContext, 'subjectId' | 'lessonId' | 'topicId'>;

/** Grounding for a context, with findTopic returning a topic's full content (or undefined when it is not available). */
export function groundingFor(context: GroundingContext, findTopic: (id: string | undefined) => Topic | undefined): MentorGrounding {
  const topic = findTopic(context.topicId);
  const lesson = topic ? getLesson(topic.lessonId) : getLesson(context.lessonId);
  const subject = getSubject(topic?.subjectId ?? lesson?.subjectId ?? context.subjectId);
  if (topic) return { subject, lesson, topic, focus: topic.title.toLowerCase(), mentor: topic.mentor };
  if (lesson) {
    const first = findTopic(lesson.topicIds[0]);
    return { subject, lesson, focus: lesson.title, mentor: first?.mentor ?? GENERAL_MENTOR };
  }
  return { subject, focus: subject ? subject.name : 'your learning adventure', mentor: GENERAL_MENTOR };
}
