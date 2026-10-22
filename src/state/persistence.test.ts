import { describe, expect, it } from 'vitest';
import { FRICTION_TOPICS, learnerState, playTopic } from '../test/fixtures';
import { LocalProgressRepository, MemoryProgressRepository, STORAGE_KEY, migrate } from './persistence';
import { PROGRESS_SCHEMA_VERSION } from './progressTypes';
import { totalXp } from './selectors';

class FakeStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  keys() {
    return [...this.data.keys()];
  }
}

describe('LocalProgressRepository', () => {
  it('reports empty storage', async () => {
    expect(await new LocalProgressRepository(new FakeStorage()).load()).toEqual({ status: 'empty' });
  });

  it('round-trips progress so it survives a page refresh', async () => {
    const storage = new FakeStorage();
    const state = playTopic(learnerState(), FRICTION_TOPICS[0]);
    await new LocalProgressRepository(storage).save(state);
    // A new repository instance simulates a fresh page load.
    const loaded = await new LocalProgressRepository(storage).load();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.state.learner?.displayName).toBe('Asha');
    expect(loaded.state.learner?.mentorId).toBe('rishi');
    expect(loaded.state.topics[FRICTION_TOPICS[0]]?.status).toBe('completed');
    expect(totalXp(loaded.state)).toBe(totalXp(state));
  });

  it('recovers from corrupted data and keeps a backup copy', async () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{not valid json');
    const result = await new LocalProgressRepository(storage).load();
    expect(result.status).toBe('recovered');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.keys().some((k) => k.startsWith(`${STORAGE_KEY}:unreadable:`))).toBe(true);
  });

  it('rejects data from a newer, unknown schema version', async () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: PROGRESS_SCHEMA_VERSION + 1, savedAt: '', state: {} }));
    expect((await new LocalProgressRepository(storage).load()).status).toBe('recovered');
  });

  it('works without storage (private mode) and says so', async () => {
    const result = await new LocalProgressRepository(null).load();
    expect(result.status).toBe('unavailable');
  });

  it('clears saved progress', async () => {
    const storage = new FakeStorage();
    const repo = new LocalProgressRepository(storage);
    await repo.save(learnerState());
    await repo.clear();
    expect(await repo.load()).toEqual({ status: 'empty' });
  });
});

describe('migrate', () => {
  it('fills in fields that older saves did not have', () => {
    const old = learnerState();
    const partial = { ...old } as Record<string, unknown>;
    delete partial.stats;
    delete partial.ownedAvatars;
    delete partial.activity;
    const migrated = migrate({ schemaVersion: 2, savedAt: '', state: partial });
    expect(migrated?.stats.mentorQuestions).toBe(0);
    expect(migrated?.ownedAvatars).toEqual(['fox', 'panda', 'bunny']);
    expect(migrated?.activity).toEqual([]);
  });

  it('keeps saved results and settings from before voice answers existed, with voice answers off', () => {
    const before = playTopic(learnerState(), FRICTION_TOPICS[0]);
    const { voiceAnswers: _absent, ...oldSettings } = { ...before.settings, readAloud: true };
    const migrated = migrate({ schemaVersion: PROGRESS_SCHEMA_VERSION, savedAt: '', state: { ...before, settings: oldSettings } });
    expect(migrated?.settings).toEqual({ ...oldSettings, voiceAnswers: false });
    expect(migrated?.topics).toEqual(before.topics);
    expect(migrated?.quizAttempts).toEqual(before.quizAttempts);
    expect(totalXp(migrated!)).toBe(totalXp(before));
  });

  it('drops malformed ledger entries', () => {
    const s = learnerState();
    const migrated = migrate({ schemaVersion: 2, savedAt: '', state: { ...s, ledger: [{ key: 'ok', kind: 'reward', xp: 5, coins: 0, reason: '', at: '' }, { bad: true }] } });
    expect(migrated?.ledger).toHaveLength(1);
  });

  it('moves v1 (lesson-based) saves to topics, keeping rewards but resetting lesson progress', () => {
    const v2 = playTopic(learnerState(), FRICTION_TOPICS[0]);
    const { topics, quizAttempts, gameAttempts, ...rest } = v2;
    void topics;
    void quizAttempts;
    void gameAttempts;
    const v1 = {
      ...rest,
      lessons: { 'friction-basics': { lessonId: 'friction-basics', status: 'completed', completedStages: ['intro'] } },
      quizAttempts: [{ id: 'q', lessonId: 'friction-basics', stageId: 'quiz' }],
      activity: [{ id: 'a1', at: '', kind: 'stage', title: 'Old stage' }],
    };
    const migrated = migrate({ schemaVersion: 1, savedAt: '', state: v1 });
    expect(migrated).not.toBeNull();
    expect(migrated?.topics).toEqual({});
    expect(migrated?.quizAttempts).toEqual([]);
    expect(migrated?.ledger).toEqual(v2.ledger);
    expect(totalXp(migrated!)).toBe(totalXp(v2));
    expect(migrated?.achievements).toEqual(v2.achievements);
    expect(migrated?.activity[0].kind).toBe('step');
    expect(migrated && 'lessons' in migrated).toBe(false);
  });

  it('reports a v1 save as migrated so the app can explain the change', async () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, savedAt: '', state: { ...learnerState(), lessons: {} } }));
    const result = await new LocalProgressRepository(storage).load();
    expect(result.status).toBe('migrated');
    if (result.status === 'migrated') expect(result.message).toMatch(/topics/i);
  });

  it('returns null for things that are not progress', () => {
    expect(migrate({ schemaVersion: 1, savedAt: '', state: 'nope' })).toBeNull();
  });
});

describe('MemoryProgressRepository', () => {
  it('stores state in memory', async () => {
    const repo = new MemoryProgressRepository();
    await repo.save(learnerState());
    const loaded = await repo.load();
    expect(loaded.status).toBe('loaded');
  });
});
