import { getSubject, getTopic, topicLabel } from '../curriculum/catalog.js';
import type { ProgressStep, ProgressSummary } from './types.js';

/**
 * Plain-language progress lines built from the app's progress summary. Used in
 * the AI prompt and by the demo mentor; every number comes from the app.
 */

export const PROGRESS_STEP_NAMES: Record<ProgressStep, string> = { watch: 'Learn', play: 'Play', practice: 'Practice' };

export function topicName(id: string | undefined): string | undefined {
  const topic = getTopic(id);
  return topic ? `${getSubject(topic.subjectId)?.name ?? ''} ${topicLabel(topic)}`.trim() : undefined;
}

export function progressLines(p: ProgressSummary): string[] {
  const lines = [
    `Topics completed: ${p.topicsCompleted} of ${p.topicsTotal}. Lessons completed: ${p.lessonsCompleted} of ${p.lessonsTotal}.`,
    `Level ${p.level}, ${p.stars} star${p.stars === 1 ? '' : 's'}, ${p.streakDays}-day learning streak.`,
  ];
  const current = topicName(p.currentTopicId);
  if (current) lines.push(`Started but not finished: ${current}${p.currentStep ? ` (next step: ${PROGRESS_STEP_NAMES[p.currentStep]})` : ''}.`);
  const next = topicName(p.nextTopicId);
  if (next && p.nextTopicId !== p.currentTopicId) lines.push(`Recommended next: ${next}${p.nextStep ? ` (${PROGRESS_STEP_NAMES[p.nextStep]})` : ''}.`);
  const subject = getSubject(p.subjectId);
  if (subject && p.subjectTopicsTotal !== undefined) lines.push(`In ${subject.name}: ${p.subjectTopicsMastered} of ${p.subjectTopicsTotal} topics mastered.`);
  return lines;
}

/** Deterministic encouragement used by the demo mentor (no AI). */
export function progressEncouragement(p: ProgressSummary): string {
  const current = topicName(p.currentTopicId);
  const next = topicName(p.nextTopicId);
  const nextStep = current
    ? `Your next step is to carry on with ${current}${p.currentStep ? ` at ${PROGRESS_STEP_NAMES[p.currentStep]}` : ''}.`
    : next
      ? `A great next step is ${next}.`
      : 'You can replay any topic to earn more stars.';
  if (p.topicsCompleted === 0) return `You're just getting started, and that's exciting! ${nextStep}`;
  const praise =
    p.topicsTotal > 0 && p.topicsCompleted >= p.topicsTotal
      ? 'Wow, you have finished every topic that is ready so far!'
      : `Great work! Every topic you finish makes your brain stronger.${p.streakDays > 1 ? ` Keep your ${p.streakDays}-day streak going!` : ''}`;
  return `${praise} ${nextStep}`;
}
