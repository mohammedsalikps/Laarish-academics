import type { Lesson, Subject, Topic } from '../curriculum/types.js';

/**
 * The lesson-video production queue: one short clip per topic (the Watch step), built only from
 * the topic's own content, so every prompt matches what the lesson teaches. Nothing here calls a
 * generator; `npm run videos:queue` writes the queue and the coverage report, and
 * `npm run videos:ingest` brings finished clips in (see docs/VIDEO-CONTENT-STATUS.md).
 */

/** One look for every subject, so the six worlds' videos feel like one series. */
export const VIDEO_STYLE =
  'Short 3D animated clip for school children, in the style of a gentle primary-school educational cartoon: ' +
  'soft rounded clay-like 3D models, bright warm daylight, clean simple background, slow smooth camera, ' +
  'friendly Indian children and everyday Indian settings where people appear. One clear idea, shown with actions, not talk.';

/** Rules for every prompt. Video models draw text badly, so words come from our own captions instead. */
export const VIDEO_GUARDRAILS =
  'No on-screen text, letters, numbers, subtitles, logos or brand names. No scary, violent or unsafe actions. ' +
  'Nothing flashing quickly.';

/** Lessons used in demonstrations, filmed right after Class 6 Science and Mathematics. */
export const DEMO_LESSONS = ['magnets', 'friction', 'halves-and-quarters', 'adding-within-20', 'building-sentences', 'directions-and-maps'];

export type VideoPriority = 1 | 2 | 3;

export interface VideoJob {
  videoId: string;
  topicId: string;
  lessonId: string;
  subjectId: string;
  subjectName: string;
  lessonTitle: string;
  topicTitle: string;
  grades: readonly [number, number];
  /** 1: Class 6 Science and Mathematics; 2: demonstration lessons; 3: everything else. */
  priority: VideoPriority;
  /** Target length in seconds (the brief asks for about 10-20). */
  durationS: number;
  aspectRatio: '16:9';
  prompt: string;
  /** Up to three short lines shown as captions (WebVTT), taken from the topic's key ideas. */
  captions: string[];
}

const LANGUAGE_SUBJECTS = new Set(['english', 'hindi', 'kannada']);
const sentence = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/[.!?]?$/, '.');

export function videoPriority(lesson: Pick<Lesson, 'id' | 'subjectId' | 'grades'>): VideoPriority {
  const [from, to] = lesson.grades;
  if ((lesson.subjectId === 'science' || lesson.subjectId === 'mathematics') && from <= 6 && to >= 6) return 1;
  if (DEMO_LESSONS.includes(lesson.id)) return 2;
  return 3;
}

export function videoJob(topic: Topic, lesson: Lesson, subject: Pick<Subject, 'name'>): VideoJob {
  // What the clip shows: the topic's own explainer scenes (written for this topic), in order.
  const beats = topic.watch.explainer.slice(0, 3).map((s) => sentence(s.caption));
  const shows = beats.length ? beats.join(' Then: ') : sentence(topic.summary);
  const language = LANGUAGE_SUBJECTS.has(lesson.subjectId)
    ? ' Show the idea with objects, people and actions only; the words themselves appear later in captions.'
    : '';
  const age = `${lesson.grades[0] + 5} to ${lesson.grades[1] + 6} year olds`;
  const prompt = [
    VIDEO_STYLE,
    `For ${age} (Class ${lesson.grades[0]}${lesson.grades[1] !== lesson.grades[0] ? `-${lesson.grades[1]}` : ''}), ${subject.name}: "${topic.title}".`,
    `Show, in one continuous scene of about 12 seconds: ${shows}${language}`,
    VIDEO_GUARDRAILS,
  ].join(' ');
  return {
    videoId: topic.watch.video.id,
    topicId: topic.id,
    lessonId: lesson.id,
    subjectId: lesson.subjectId,
    subjectName: subject.name,
    lessonTitle: lesson.title,
    topicTitle: topic.title,
    grades: lesson.grades,
    priority: videoPriority(lesson),
    durationS: 12,
    aspectRatio: '16:9',
    prompt,
    captions: topic.watch.keyIdeas.slice(0, 3).map(sentence),
  };
}

/** Every topic's job, in production order: priority, then subject, lesson and topic order. */
export function buildVideoQueue(topics: Topic[], lessons: Lesson[], subjects: Subject[]): VideoJob[] {
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const subjectOrder = new Map(subjects.map((s, i) => [s.id, i]));
  const jobs: { job: VideoJob; lesson: Lesson; topic: Topic }[] = [];
  for (const topic of topics) {
    const lesson = lessonById.get(topic.lessonId);
    const subject = lesson && subjectById.get(lesson.subjectId);
    if (!lesson || !subject) continue;
    jobs.push({ job: videoJob(topic, lesson, subject), lesson, topic });
  }
  return jobs
    .sort(
      (a, b) =>
        a.job.priority - b.job.priority ||
        (subjectOrder.get(a.lesson.subjectId) ?? 0) - (subjectOrder.get(b.lesson.subjectId) ?? 0) ||
        a.lesson.grades[0] - b.lesson.grades[0] ||
        a.lesson.order - b.lesson.order ||
        a.topic.order - b.topic.order,
    )
    .map((j) => j.job);
}

/** WebVTT captions spreading the lines evenly over the clip. */
export function captionsVtt(lines: string[], durationS: number): string {
  const slot = durationS / Math.max(1, lines.length);
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
  };
  return ['WEBVTT', '', ...lines.flatMap((line, i) => [`${i + 1}`, `${ts(i * slot)} --> ${ts((i + 1) * slot)}`, line, ''])].join('\n');
}
