/**
 * Progress rules across the whole expanded curriculum: every playable lesson
 * can be completed in order, topics unlock only after the one before is
 * mastered, rewards are paid once, and progress saved before the expansion
 * still counts.
 */
import { describe, expect, it } from 'vitest';
import { GRADES, LESSONS, SUBJECTS, getLesson, getTopic, getTopicsForLesson, lessonsForBranch } from '../content';
import { LocalProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { nextActivity, totalXp } from '../state/selectors';
import { learnerState, playTopic } from '../test/fixtures';
import { isLessonUnlocked, isTopicUnlocked, lessonView, levelView, subjectView } from './progression';

const playable = LESSONS.filter((l) => l.status === 'ready');

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('every playable lesson can be completed, one topic at a time', () => {
  it.each(playable.map((l) => [l.id, l] as const))('%s', (_, lesson) => {
    let state = learnerState({ grade: lesson.grades[0] });
    // Each class can be started directly: the first lesson of every class branch is open to a new learner.
    const first = lessonsForBranch(lesson.subjectId, lesson.levelId!, lesson.branchId!)[0];
    expect(isLessonUnlocked(first, state.topics), first.id).toBe(true);

    // Unlock the lesson itself by mastering the lessons before it in its branch.
    for (const before of lessonsForBranch(lesson.subjectId, lesson.levelId!, lesson.branchId!).filter((l) => l.order < lesson.order && l.status === 'ready')) {
      for (const t of getTopicsForLesson(before.id)) state = playTopic(state, t.id);
    }
    expect(isLessonUnlocked(lesson, state.topics)).toBe(true);

    const xpBefore = totalXp(state);
    const topics = getTopicsForLesson(lesson.id);
    topics.forEach((topic, i) => {
      expect(isTopicUnlocked(topic, state.topics), `${topic.id} open in turn`).toBe(true);
      if (topics[i + 1]) expect(isTopicUnlocked(topics[i + 1], state.topics), `${topics[i + 1].id} waits for ${topic.id}`).toBe(false);
      state = playTopic(state, topic.id);
      expect(state.topics[topic.id]?.status, topic.id).toBe('completed');
    });
    expect(lessonView(lesson, state.topics).state).toBe('completed');
    expect(totalXp(state)).toBeGreaterThan(xpBefore);

    // Replaying never pays the same reward twice.
    const keys = state.ledger.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    const replayed = playTopic(state, topics[0].id, { runId: 'replay' });
    expect(totalXp(replayed)).toBe(totalXp(state));
  });
});

describe('unlock rules', () => {
  it('keeps the next topic locked after a weak quiz, and opens it after a good one', () => {
    // Lessons a new learner can open straight away (the first in each class branch).
    for (const lesson of playable.filter((l) => isLessonUnlocked(l, {}))) {
      const [first, second] = getTopicsForLesson(lesson.id);
      let state = learnerState();
      state = playTopic(state, first.id, { credits: 0, playScore: 0 });
      expect(isTopicUnlocked(second, state.topics), `${lesson.id}: weak attempt`).toBe(false);
      state = playTopic(state, first.id, { runId: 'again' });
      expect(isTopicUnlocked(second, state.topics), `${lesson.id}: after mastering`).toBe(true);
    }
  });
});

describe('Continue learning', () => {
  it("suggests the learner's own class first, then carries on with the lesson they started", () => {
    const fresh = learnerState({ grade: 6 });
    const first = nextActivity(fresh)!;
    expect(first.lesson.grades[0]).toBe(6);
    const afterOne = playTopic(fresh, first.topic.id);
    const next = nextActivity(afterOne)!;
    expect(next.lesson.id).toBe(first.lesson.id);
    expect(next.topic.order).toBe(2);
  });
});

describe('progress saved before the curriculum expansion', () => {
  // The 24 topics that existed before Classes 1-8 were added.
  const ORIGINAL_TOPICS = [
    'friction-what-is', 'friction-rough-smooth', 'friction-helps-us', 'friction-reducing',
    'magnets-what-they-attract', 'magnets-poles',
    'adding-counting-on', 'adding-number-bonds', 'fractions-halves', 'fractions-quarters',
    'missing-equals-balance', 'missing-number-find', 'algebra-letters', 'algebra-one-step',
    'words-naming', 'words-doing', 'sentences-word-order', 'sentences-asking',
    'hindi-colours-bright', 'hindi-colours-more', 'kannada-colours-bright', 'kannada-colours-more',
    'maps-directions', 'maps-reading',
  ];

  it('never puts a new prerequisite in front of an original lesson (it stays open, as before)', () => {
    const original = new Set(ORIGINAL_TOPICS.map((id) => getTopic(id)!.lessonId));
    const fresh = learnerState().topics;
    for (const lessonId of original) {
      const lesson = getLesson(lessonId)!;
      // Letters for Numbers always needed Missing Numbers; every other original lesson opened straight away.
      if (lessonId === 'letters-for-numbers') continue;
      expect(isLessonUnlocked(lesson, fresh), lessonId).toBe(true);
    }
  });

  it('still finds every original topic, in the same lesson', () => {
    for (const id of ORIGINAL_TOPICS) {
      const topic = getTopic(id);
      expect(topic, id).toBeDefined();
      expect(getLesson(topic!.lessonId)?.topicIds, id).toContain(id);
    }
  });

  it('keeps completed lessons complete after saving and reloading', async () => {
    let state: ProgressState = learnerState({ grade: 4 });
    for (const id of ORIGINAL_TOPICS) state = playTopic(state, id);
    const storage = new MemoryStorage();
    await new LocalProgressRepository(storage).save(state);
    const loaded = await new LocalProgressRepository(storage).load();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;

    const before = new Set(ORIGINAL_TOPICS.map((id) => getTopic(id)!.lessonId));
    for (const lessonId of before) expect(lessonView(getLesson(lessonId)!, loaded.state.topics).state, lessonId).toBe('completed');
    expect(totalXp(loaded.state)).toBe(totalXp(state));
    // The completed lessons count towards their class and subject.
    for (const subject of SUBJECTS) {
      const done = subjectView(subject, loaded.state.topics);
      const expected = [...before].filter((id) => getLesson(id)!.subjectId === subject.id).length;
      expect(done.lessonsCompleted, subject.id).toBe(expected);
      for (const grade of GRADES) {
        const level = subject.levels!.find((l) => l.grades[0] === grade)!;
        const inClass = [...before].filter((id) => getLesson(id)!.subjectId === subject.id && getLesson(id)!.levelId === level.id).length;
        expect(levelView(subject, level, loaded.state.topics).lessonsCompleted, `${subject.id} class ${grade}`).toBe(inClass);
      }
    }
  });
});
