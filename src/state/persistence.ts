import { isMentorId } from '../../shared/mentor/personas';
import { PROGRESS_SCHEMA_VERSION, createInitialState, type ProgressState } from './progressTypes';

/**
 * Persistence abstraction for learner progress.
 *
 * The demo uses LocalProgressRepository (browser localStorage, this device
 * only). localStorage is NOT secure storage for children's data: it is readable
 * by anyone using the device and is not backed up. A production deployment
 * should implement ProgressRepository against an authenticated backend that
 * enforces authorisation server-side (see README > Production integration).
 */
export interface ProgressRepository {
  readonly kind: 'local-demo' | 'memory' | 'remote';
  load(): Promise<LoadResult>;
  save(state: ProgressState): Promise<void>;
  clear(): Promise<void>;
  /** Notifies when progress changes outside this tab (e.g. another browser tab). */
  subscribe?(listener: (state: ProgressState) => void): () => void;
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; state: ProgressState }
  | { status: 'migrated'; state: ProgressState; message: string }
  | { status: 'recovered'; state: ProgressState; message: string }
  | { status: 'unavailable'; state: ProgressState; message: string };

export const STORAGE_KEY = 'laarish-academics:progress';

interface Envelope {
  schemaVersion: number;
  savedAt: string;
  state: unknown;
}

export class LocalProgressRepository implements ProgressRepository {
  readonly kind = 'local-demo' as const;

  constructor(
    private readonly storage: Storage | null = safeLocalStorage(),
    private readonly key: string = STORAGE_KEY,
  ) {}

  async load(): Promise<LoadResult> {
    if (!this.storage) {
      return {
        status: 'unavailable',
        state: createInitialState(),
        message: 'This browser is not allowing us to save progress, so it will be lost when you close the page.',
      };
    }
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return { status: 'unavailable', state: createInitialState(), message: 'Saved progress could not be read on this device.' };
    }
    if (!raw) return { status: 'empty' };
    try {
      const envelope = JSON.parse(raw) as Envelope;
      const migrated = migrate(envelope);
      if (!migrated) throw new Error('Unrecognised progress format');
      if (envelope.schemaVersion < PROGRESS_SCHEMA_VERSION) {
        return {
          status: 'migrated',
          state: migrated,
          message: 'Lessons are now organised into topics. Your XP, coins, achievements and avatars are safe; lesson progress starts fresh.',
        };
      }
      return { status: 'loaded', state: migrated };
    } catch {
      // Keep the unreadable data for support/debugging instead of silently deleting it.
      try {
        this.storage.setItem(`${this.key}:unreadable:${Date.now()}`, raw);
        this.storage.removeItem(this.key);
      } catch {
        /* storage full or blocked: nothing more we can do */
      }
      return {
        status: 'recovered',
        state: createInitialState(),
        message: 'We could not read the saved progress on this device, so we started fresh.',
      };
    }
  }

  async save(state: ProgressState): Promise<void> {
    if (!this.storage) return;
    const envelope: Envelope = { schemaVersion: PROGRESS_SCHEMA_VERSION, savedAt: new Date().toISOString(), state };
    this.storage.setItem(this.key, JSON.stringify(envelope));
  }

  async clear(): Promise<void> {
    this.storage?.removeItem(this.key);
  }

  subscribe(listener: (state: ProgressState) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const onStorage = (event: StorageEvent) => {
      if (event.key !== this.key || !event.newValue) return;
      try {
        const migrated = migrate(JSON.parse(event.newValue) as Envelope);
        if (migrated) listener(migrated);
      } catch {
        /* ignore malformed writes from other tabs */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }
}

/** In-memory repository for tests and for browsers without storage. */
export class MemoryProgressRepository implements ProgressRepository {
  readonly kind = 'memory' as const;
  private value: ProgressState | null;
  constructor(initial: ProgressState | null = null) {
    this.value = initial;
  }
  async load(): Promise<LoadResult> {
    return this.value ? { status: 'loaded', state: this.value } : { status: 'empty' };
  }
  async save(state: ProgressState): Promise<void> {
    this.value = state;
  }
  async clear(): Promise<void> {
    this.value = null;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__laarish_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Upgrades stored data to the current schema, filling in fields added later.
 * Returns null when the data is not recognisable progress.
 *
 * v1 -> v2: lessons were restructured into Subject -> Lesson -> Topic. Old
 * stage-based lesson progress cannot be mapped onto the new topics, so it is
 * dropped, while the learner, ledger (XP and coins), achievements, stats,
 * avatars and settings are kept. Old ledger keys never collide with new ones.
 */
export function migrate(envelope: Envelope): ProgressState | null {
  if (!envelope || typeof envelope !== 'object' || typeof envelope.schemaVersion !== 'number') return null;
  if (envelope.schemaVersion < 1 || envelope.schemaVersion > PROGRESS_SCHEMA_VERSION) return null;
  const s = envelope.state as (Partial<ProgressState> & { lessons?: unknown }) | null;
  if (!s || typeof s !== 'object' || !Array.isArray(s.ledger)) return null;
  const isV1 = envelope.schemaVersion === 1;
  if (!isV1 && (typeof s.topics !== 'object' || s.topics === null)) return null;
  const base = createInitialState();
  return {
    ...base,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    learner: normalizeLearner(s.learner),
    ledger: s.ledger.filter(isLedgerEntry),
    topics: isV1 ? {} : (s.topics ?? {}),
    quizAttempts: !isV1 && Array.isArray(s.quizAttempts) ? s.quizAttempts : [],
    gameAttempts: !isV1 && Array.isArray(s.gameAttempts) ? s.gameAttempts : [],
    achievements: s.achievements && typeof s.achievements === 'object' ? s.achievements : {},
    activity: Array.isArray(s.activity) ? s.activity.map((a) => ((a.kind as string) === 'stage' ? { ...a, kind: 'step' as const } : a)) : [],
    activeDays: Array.isArray(s.activeDays) ? s.activeDays.filter((d) => typeof d === 'string') : [],
    ownedAvatars: Array.isArray(s.ownedAvatars) && s.ownedAvatars.length ? s.ownedAvatars : base.ownedAvatars,
    stats: { ...base.stats, ...(s.stats ?? {}) },
    settings: { ...base.settings, ...(s.settings ?? {}) },
  };
}

/** Keeps the stored profile, dropping a mentor id that is not one of the two mentors (the learner is asked to choose again). */
function normalizeLearner(learner: ProgressState['learner'] | undefined): ProgressState['learner'] {
  if (!learner) return null;
  if (learner.mentorId === undefined || isMentorId(learner.mentorId)) return learner;
  const { mentorId: _invalid, ...rest } = learner;
  return rest;
}

function isLedgerEntry(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const entry = e as Record<string, unknown>;
  return typeof entry.key === 'string' && typeof entry.xp === 'number' && typeof entry.coins === 'number' && typeof entry.at === 'string';
}
