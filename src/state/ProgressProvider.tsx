import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { GameResult, QuizResult } from '../domain/results';
import type { SubjectId, TopicStep } from '../domain/types';
import { createId } from '../lib/ids';
import type { ProgressRepository } from './persistence';
import { createInitialState, type AvatarId, type ProgressState, type Settings } from './progressTypes';
import { progressReducer, type LearnerChanges, type NewLearner } from './reducer';

export interface ProgressActions {
  createLearner(profile: NewLearner): void;
  updateLearner(changes: LearnerChanges): void;
  updateSettings(changes: Partial<Settings>): void;
  visitSubject(subjectId: SubjectId): void;
  openStep(topicId: string, step: TopicStep): void;
  completeWatch(topicId: string, watched: boolean): void;
  experimentRun(topicId: string, surfaceId: string, predictionCorrect: boolean): void;
  gameResult(topicId: string, result: GameResult): void;
  quizResult(topicId: string, result: QuizResult): void;
  mentorQuestion(): void;
  claimMission(): void;
  purchaseAvatar(avatarId: AvatarId): void;
  reset(): Promise<void>;
}

interface ProgressContextValue {
  state: ProgressState;
  actions: ProgressActions;
  ready: boolean;
  storageKind: ProgressRepository['kind'];
  notice: string | null;
  dismissNotice(): void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const nowIso = () => new Date().toISOString();

export function ProgressProvider({ repository, children }: { repository: ProgressRepository; children: ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, undefined, createInitialState);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Skip the save that would echo back state we just received from storage.
  const skipSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then((result) => {
        if (cancelled) return;
        if (result.status !== 'empty') {
          skipSave.current = true;
          dispatch({ type: 'hydrate', state: result.state });
        }
        if (result.status === 'recovered' || result.status === 'unavailable' || result.status === 'migrated') setNotice(result.message);
        // Save migrated data straight away in the new format.
        if (result.status === 'migrated') void repository.save(result.state).catch(() => {});
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNotice('Saved progress could not be loaded. You can keep learning, but progress may not be saved.');
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    if (!repository.subscribe) return;
    return repository.subscribe((external) => {
      skipSave.current = true;
      dispatch({ type: 'hydrate', state: external });
    });
  }, [repository]);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    repository.save(state).catch(() => {
      setNotice('Progress could not be saved on this device (storage may be full or blocked).');
    });
  }, [state, ready, repository]);

  const actions = useMemo<ProgressActions>(
    () => ({
      createLearner: (profile) => dispatch({ type: 'create-learner', profile, id: createId('learner'), now: nowIso() }),
      updateLearner: (changes) => dispatch({ type: 'update-learner', changes, now: nowIso() }),
      updateSettings: (changes) => dispatch({ type: 'update-settings', changes }),
      visitSubject: (subjectId) => dispatch({ type: 'visit-subject', subjectId, now: nowIso() }),
      openStep: (topicId, step) => dispatch({ type: 'open-step', topicId, step, now: nowIso() }),
      completeWatch: (topicId, watched) => dispatch({ type: 'complete-watch', topicId, watched, now: nowIso() }),
      experimentRun: (topicId, surfaceId, predictionCorrect) =>
        dispatch({ type: 'experiment-run', topicId, surfaceId, predictionCorrect, id: createId('run'), now: nowIso() }),
      gameResult: (topicId, result) => dispatch({ type: 'game-result', topicId, result, id: createId('game'), now: nowIso() }),
      quizResult: (topicId, result) => dispatch({ type: 'quiz-result', topicId, result, id: createId('quiz'), now: nowIso() }),
      mentorQuestion: () => dispatch({ type: 'mentor-question', now: nowIso() }),
      claimMission: () => dispatch({ type: 'claim-mission', now: nowIso() }),
      purchaseAvatar: (avatarId) => dispatch({ type: 'purchase-avatar', avatarId, now: nowIso() }),
      reset: async () => {
        await repository.clear();
        dispatch({ type: 'reset' });
      },
    }),
    [repository],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({ state, actions, ready, storageKind: repository.kind, notice, dismissNotice: () => setNotice(null) }),
    [state, actions, ready, repository.kind, notice],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}

/** Convenience hook for screens that require a learner profile. */
export function useLearner() {
  const { state } = useProgress();
  return state.learner;
}
