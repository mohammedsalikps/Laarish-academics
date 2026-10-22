import { NAME_QUESTION, PROGRESS_QUESTION } from '../../shared/mentor/demoReply';
import { PROGRESS_STEP_NAMES, topicName } from '../../shared/mentor/progress';
import type { ProgressSummary } from '../../shared/mentor/types';
import { resumeStep } from '../engine/progression';
import { localDateKey } from '../lib/dates';
import type { ProgressState } from '../state/progressTypes';
import { completedTopicCount, currentStreak, levelInfo, nextActivity, overallProgress, subjectViews, totalStars } from '../state/selectors';

/**
 * Questions the app can answer from its own state, on the device:
 * - "What is my name?" is answered locally and never sent anywhere.
 * - "How am I doing?" uses real progress numbers computed here; only a minimal
 *   summary (counts and curriculum ids) is sent so the mentor can explain it.
 */

export type LocalQuestion = 'name' | 'progress';

export function detectLocalQuestion(text: string): LocalQuestion | null {
  if (NAME_QUESTION.test(text)) return 'name';
  if (PROGRESS_QUESTION.test(text)) return 'progress';
  return null;
}

export function nameReply(name: string | undefined): string {
  return name
    ? `You're ${name}! That's the nickname on your Laarish profile. What would you like to learn next?`
    : "I don't know your name yet. You can add a nickname in Settings.";
}

/** Counts and ids only: nothing personal. */
export function buildProgressSummary(state: ProgressState, subjectId?: string, today = localDateKey(new Date())): ProgressSummary {
  const views = subjectViews(state);
  const overall = overallProgress(state);
  const started = views
    .flatMap((s) => s.lessons.flatMap((l) => l.topics))
    .filter((v) => v.state === 'in-progress')
    .sort((a, b) => (b.record?.lastPlayedAt ?? '').localeCompare(a.record?.lastPlayedAt ?? ''))[0];
  const next = nextActivity(state);
  const subject = subjectId ? views.find((v) => v.subject.id === subjectId) : undefined;
  return {
    level: levelInfo(state).level,
    stars: totalStars(state),
    streakDays: currentStreak(state, today),
    topicsCompleted: completedTopicCount(state),
    topicsTotal: overall.topicsTotal,
    lessonsCompleted: overall.lessonsCompleted,
    lessonsTotal: overall.lessonsReady,
    ...(started ? { currentTopicId: started.topic.id, currentStep: resumeStep(started.record) } : {}),
    ...(next ? { nextTopicId: next.topic.id, nextStep: next.step } : {}),
    ...(subject ? { subjectId: subject.subject.id, subjectTopicsMastered: subject.topicsMastered, subjectTopicsTotal: subject.topicsTotal } : {}),
  };
}

/** Short fact lines shown in the chat, straight from the app's numbers. */
export function progressFacts(p: ProgressSummary, subjectName?: string): string[] {
  const facts = [
    `${p.topicsCompleted} of ${p.topicsTotal} topics completed`,
    `${p.lessonsCompleted} of ${p.lessonsTotal} lessons completed`,
    `Level ${p.level} · ${p.stars} star${p.stars === 1 ? '' : 's'} · ${p.streakDays}-day streak`,
  ];
  if (subjectName && p.subjectTopicsTotal !== undefined) facts.push(`${subjectName}: ${p.subjectTopicsMastered} of ${p.subjectTopicsTotal} topics mastered`);
  const current = topicName(p.currentTopicId);
  if (current) facts.push(`Now learning: ${current}${p.currentStep ? ` (${PROGRESS_STEP_NAMES[p.currentStep]})` : ''}`);
  const next = topicName(p.nextTopicId);
  if (next && p.nextTopicId !== p.currentTopicId) facts.push(`Next up: ${next}${p.nextStep ? ` (${PROGRESS_STEP_NAMES[p.nextStep]})` : ''}`);
  return facts;
}
