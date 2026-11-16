import { describe, expect, it } from 'vitest';
import { LESSONS, SUBJECTS, TOPICS } from '../curriculum/index.js';
import { vttProblems } from './manifest.js';
import { buildVideoQueue, captionsVtt, VIDEO_GUARDRAILS } from './videoQueue.js';

const jobs = buildVideoQueue(TOPICS, LESSONS, SUBJECTS);

describe('lesson video queue', () => {
  it('has one job per topic, each tied to that topic’s own video id', () => {
    expect(jobs).toHaveLength(TOPICS.length);
    expect(new Set(jobs.map((j) => j.videoId)).size).toBe(TOPICS.length);
    for (const j of jobs) expect(TOPICS.find((t) => t.id === j.topicId)!.watch.video.id).toBe(j.videoId);
  });

  it('puts Class 6 Science and Mathematics first, then the demonstration lessons', () => {
    const firstOther = jobs.findIndex((j) => j.priority !== 1);
    expect(jobs.slice(0, firstOther).every((j) => ['science', 'mathematics'].includes(j.subjectId) && j.grades[0] <= 6 && j.grades[1] >= 6)).toBe(true);
    expect(jobs.find((j) => j.topicId === 'magnets-what-they-attract')!.priority).toBe(1);
    expect(jobs.find((j) => j.lessonId === 'friction')!.priority).toBe(2);
  });

  it('builds every prompt from the topic itself, with the same style and the no-text rule', () => {
    for (const j of jobs) {
      const topic = TOPICS.find((t) => t.id === j.topicId)!;
      expect(j.prompt).toContain(`"${topic.title}"`);
      expect(j.prompt).toContain(VIDEO_GUARDRAILS);
      expect(j.prompt.length).toBeLessThan(1600);
      expect(j.captions.length).toBeGreaterThan(0);
      expect(j.captions.length).toBeLessThanOrEqual(3);
    }
  });

  it('writes valid WebVTT captions spread over the clip', () => {
    const vtt = captionsVtt(['One.', 'Two.', 'Three.'], 12);
    expect(vttProblems(vtt)).toEqual([]);
    expect(vtt).toContain('00:00:08.000 --> 00:00:12.000');
  });
});
