import { describe, expect, it } from 'vitest';
import { SUBJECTS, getLesson, getTopic } from '../content';
import type { TopicProgress } from '../state/progressTypes';
import {
  computeTopicMastery,
  isLessonUnlocked,
  isStepAccessible,
  isTopicUnlocked,
  lessonView,
  resumeStep,
  subjectView,
  topicView,
  type TopicRecords,
} from './progression';

function record(topicId: string, partial: Partial<TopicProgress> = {}): TopicProgress {
  return {
    topicId,
    status: 'in-progress',
    currentStep: 'watch',
    completedSteps: [],
    scores: {},
    startedAt: '',
    lastPlayedAt: '',
    timesCompleted: 0,
    bestMastery: 0,
    stars: 0,
    ...partial,
  };
}

function mastered(topicId: string, bestMastery = 0.8): TopicProgress {
  return record(topicId, { status: 'completed', completedSteps: ['watch', 'play', 'practice'], bestMastery, stars: 2 });
}

const t1 = getTopic('friction-what-is')!;
const t2 = getTopic('friction-rough-smooth')!;
const friction = getLesson('friction')!;
const magnets = getLesson('magnets')!;
// Friction is lesson 1 of Class 8 physics; Exploring Forces comes after it.
const forces = getLesson('s8-forces')!;

describe('topic mastery', () => {
  it('weights Practice (3) and an assessed game (1)', () => {
    const assessed = getTopic('friction-helps-us')!;
    expect(assessed.play.assessed).toBe(true);
    // (0.9 * 3 + 0.5 * 1) / 4 = 0.8
    expect(computeTopicMastery(assessed, { practice: 0.9, play: 0.5 })).toBeCloseTo(0.8);
  });

  it('ignores exploratory games and counts a missing score as zero', () => {
    expect(t2.play.assessed).toBe(false);
    expect(computeTopicMastery(t2, { practice: 0.75, play: 0 })).toBeCloseTo(0.75);
    expect(computeTopicMastery(t2, {})).toBe(0);
  });
});

describe('step gating', () => {
  it('always opens Watch; Play needs Watch; Practice needs Play', () => {
    expect(isStepAccessible(undefined, 'watch')).toBe(true);
    expect(isStepAccessible(undefined, 'play')).toBe(false);
    expect(isStepAccessible(record(t1.id, { completedSteps: ['watch'] }), 'play')).toBe(true);
    expect(isStepAccessible(record(t1.id, { completedSteps: ['watch'] }), 'practice')).toBe(false);
    expect(isStepAccessible(record(t1.id, { completedSteps: ['watch', 'play'] }), 'practice')).toBe(true);
  });

  it('resumes where the learner left off, or at Watch for completed topics', () => {
    expect(resumeStep(undefined)).toBe('watch');
    expect(resumeStep(record(t1.id, { completedSteps: ['watch'], currentStep: 'play' }))).toBe('play');
    // A stale resume point that is not accessible falls back to the first unfinished step.
    expect(resumeStep(record(t1.id, { completedSteps: ['watch'], currentStep: 'practice' }))).toBe('play');
    expect(resumeStep(mastered(t1.id))).toBe('watch');
  });
});

describe('topic unlocking', () => {
  it('opens the first topic of the first lesson', () => {
    expect(isTopicUnlocked(t1, {})).toBe(true);
    expect(topicView(t1, {}).state).toBe('available');
  });

  it('opens the next topic only when the previous one reaches the pass mark', () => {
    expect(isTopicUnlocked(t2, {})).toBe(false);
    const low: TopicRecords = { [t1.id]: mastered(t1.id, 0.5) };
    expect(isTopicUnlocked(t2, low)).toBe(false);
    expect(topicView(t1, low).needsPractice).toBe(true);
    expect(topicView(t2, low).missing.map((t) => t.id)).toEqual([t1.id]);
    const good: TopicRecords = { [t1.id]: mastered(t1.id, 0.6) };
    expect(isTopicUnlocked(t2, good)).toBe(true);
    expect(topicView(t2, good).state).toBe('available');
  });

  it('does not count a high score unless all three steps are complete', () => {
    const partial: TopicRecords = { [t1.id]: record(t1.id, { completedSteps: ['watch', 'play'], bestMastery: 1 }) };
    expect(isTopicUnlocked(t2, partial)).toBe(false);
  });
});

describe('lesson unlocking', () => {
  it('opens the first ready lesson and locks the next one until every topic is mastered', () => {
    expect(isLessonUnlocked(friction, {})).toBe(true);
    expect(isLessonUnlocked(magnets, {})).toBe(true); // first lesson of its own class branch
    expect(isLessonUnlocked(forces, {})).toBe(false);
    const most: TopicRecords = Object.fromEntries(friction.topicIds.slice(0, -1).map((id) => [id, mastered(id)]));
    expect(isLessonUnlocked(forces, most)).toBe(false);
    expect(lessonView(friction, most).state).toBe('in-progress');
    const all: TopicRecords = Object.fromEntries(friction.topicIds.map((id) => [id, mastered(id)]));
    expect(lessonView(friction, all).state).toBe('completed');
    expect(isLessonUnlocked(forces, all)).toBe(true);
  });

  it('never unlocks lessons that are still in development', () => {
    const light = getLesson('s8-electricity-effects')!;
    expect(light.status).not.toBe('ready');
    expect(isLessonUnlocked(light, {})).toBe(false);
    expect(lessonView(light, {}).state).toBe('in-development');
  });

  it('reports the next topic to study', () => {
    expect(lessonView(friction, {}).nextTopic?.id).toBe(t1.id);
    expect(lessonView(friction, { [t1.id]: mastered(t1.id) }).nextTopic?.id).toBe(t2.id);
  });
});

describe('subject view', () => {
  it('counts lessons and topics from curriculum data', () => {
    const science = SUBJECTS.find((s) => s.id === 'science')!;
    const view = subjectView(science, {});
    expect(view.lessonsTotal).toBe(science.lessonIds.length);
    expect(view.lessonsReady).toBe(view.lessons.filter((l) => l.state !== 'in-development').length);
    expect(view.topicsTotal).toBe(view.lessons.reduce((s, l) => s + (l.state === 'in-development' ? 0 : l.topicsTotal), 0));
    expect(view.state).toBe('not-started');
    // Without a class: the first open lesson; for a Class 8 learner: the first open lesson of Class 8.
    expect(view.nextLesson?.id).toBe(science.lessonIds[0]);
    expect(subjectView(science, {}, 8).nextLesson?.id).toBe('friction');
    expect(subjectView(science, { [t1.id]: mastered(t1.id) }).state).toBe('in-progress');
  });
});
