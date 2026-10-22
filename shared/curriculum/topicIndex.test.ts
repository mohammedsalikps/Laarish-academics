/**
 * The browser ships the topic index and loads full topics per subject. These
 * tests keep both in step with the full curriculum the server uses.
 */
import { describe, expect, it } from 'vitest';
import * as catalog from './catalog';
import { LESSONS, SUBJECTS, TOPICS, getTopicsForLesson } from './index';
import { TOPIC_INDEX } from './topicIndex';
import { loadSubjectTopics, toTopicMeta } from './topicContent';

describe('topic index', () => {
  it('matches the topic files (run `npm run curriculum:index` after changing topics)', () => {
    expect(TOPIC_INDEX).toEqual(TOPICS.map(toTopicMeta));
  });

  it('gives every lesson the same topics, in the same order, as the full curriculum', () => {
    for (const lesson of LESSONS) {
      expect(catalog.getTopicsForLesson(lesson.id).map((t) => t.id), lesson.id).toEqual(getTopicsForLesson(lesson.id).map((t) => t.id));
    }
  });

  it('keeps only the small fields (no video, game, quiz or mentor content)', () => {
    const meta = catalog.getTopic('friction-rough-smooth')!;
    expect(Object.keys(meta.watch)).toEqual(['video']);
    expect(Object.keys(meta.watch.video).sort()).toEqual(['id', 'status']);
    expect(meta.play.game).toEqual({ type: 'friction-experiment', surfaces: expect.any(Array) });
    expect(meta).not.toHaveProperty('mentor');
    expect(meta.practice.questions.every((q) => Object.keys(q).join() === 'id')).toBe(true);
  });
});

describe('topic content per subject', () => {
  it.each(SUBJECTS.map((s) => [s.id] as const))('%s loads exactly its own topics', async (subjectId) => {
    const loaded = await loadSubjectTopics(subjectId);
    const expected = TOPICS.filter((t) => t.subjectId === subjectId);
    expect(loaded.map((t) => t.id).sort()).toEqual(expected.map((t) => t.id).sort());
    // The same topic objects the server uses, unchanged.
    const byId = new Map(TOPICS.map((t) => [t.id, t]));
    for (const topic of loaded) expect(topic, topic.id).toBe(byId.get(topic.id));
  });
});
