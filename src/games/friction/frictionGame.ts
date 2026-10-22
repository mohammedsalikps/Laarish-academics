import type { DistanceBand, FrictionChallenge, FrictionExperimentConfig, RampHeight } from '../../domain/types';
import { simulateRun, type RunOutcome } from './simulation';

/**
 * Friction Lab state machine.
 *
 * Explore:   choose-surface -> predict -> ready -> running -> result -> ...
 *            (the ramp height can be changed before each run)
 * Challenge: after enough surfaces are tested, goals such as "make the car
 *            roll Far" follow, from easiest to hardest. Some fix the surface or
 *            the ramp height so only one thing changes (a fair test).
 *
 * Check:     after the challenges, one short question checks the idea itself.
 *
 * Invalid actions for the current phase are ignored, so double-clicks and
 * stray events cannot corrupt the experiment.
 */
export type FrictionPhase = 'choose-surface' | 'predict' | 'ready' | 'running' | 'result';
export type FrictionMode = 'explore' | 'challenge' | 'done';

export interface RunRecord extends RunOutcome {
  runNumber: number;
  mode: 'explore' | 'challenge';
  /** The learner's prediction (explore runs) or the challenge target (challenge runs). */
  prediction: DistanceBand;
  /** Prediction right, or challenge goal reached. */
  predictionCorrect: boolean;
  challengeId?: string;
}

export interface FrictionGameState {
  phase: FrictionPhase;
  mode: FrictionMode;
  surfaceId: string | null;
  height: RampHeight;
  prediction: DistanceBand | null;
  current: RunRecord | null;
  runs: RunRecord[];
  challengeIndex: number;
  /** Tries on the current challenge. */
  attempts: number;
  solved: string[];
  solvedFirstTry: string[];
  /** Answers given to the final concept question. */
  checkAttempts: number;
  checkCorrect: boolean;
}

export type FrictionGameAction =
  | { type: 'select-surface'; surfaceId: string }
  | { type: 'set-height'; height: RampHeight }
  | { type: 'predict'; prediction: DistanceBand }
  | { type: 'start' }
  | { type: 'finish-run' }
  | { type: 'next-run' }
  | { type: 'start-challenges' }
  | { type: 'answer-check'; optionId: string }
  | { type: 'reset' };

export const initialFrictionState: FrictionGameState = {
  phase: 'choose-surface',
  mode: 'explore',
  surfaceId: null,
  height: 'top',
  prediction: null,
  current: null,
  runs: [],
  challengeIndex: 0,
  attempts: 0,
  solved: [],
  solvedFirstTry: [],
  checkAttempts: 0,
  checkCorrect: false,
};

export function currentChallenge(state: FrictionGameState, config: FrictionExperimentConfig): FrictionChallenge | undefined {
  return state.mode === 'challenge' ? config.challenges?.[state.challengeIndex] : undefined;
}

/** Settings for the start of a challenge: fixed values applied, the rest left for the learner. */
function setUpChallenge(state: FrictionGameState, challenge: FrictionChallenge): FrictionGameState {
  const surfaceId = challenge.surfaceId ?? null;
  return {
    ...state,
    phase: surfaceId ? 'ready' : 'choose-surface',
    surfaceId,
    height: challenge.height ?? state.height,
    prediction: null,
    current: null,
    attempts: 0,
  };
}

export function createFrictionReducer(config: FrictionExperimentConfig) {
  const challenges = config.challenges ?? [];
  return function frictionReducer(state: FrictionGameState, action: FrictionGameAction): FrictionGameState {
    const challenge = currentChallenge(state, config);
    const choosing = state.phase === 'choose-surface' || state.phase === 'predict' || state.phase === 'ready';
    switch (action.type) {
      case 'select-surface': {
        if (!choosing || !config.surfaces.some((s) => s.id === action.surfaceId)) return state;
        if (challenge) {
          if (challenge.surfaceId && challenge.surfaceId !== action.surfaceId) return state;
          return { ...state, phase: 'ready', surfaceId: action.surfaceId };
        }
        return { ...state, phase: 'predict', surfaceId: action.surfaceId, prediction: null };
      }
      case 'set-height': {
        if (!choosing || (challenge?.height && challenge.height !== action.height)) return state;
        return { ...state, height: action.height };
      }
      case 'predict': {
        if (challenge || (state.phase !== 'predict' && state.phase !== 'ready') || !state.surfaceId) return state;
        return { ...state, phase: 'ready', prediction: action.prediction };
      }
      case 'start': {
        if (state.phase !== 'ready' || !state.surfaceId) return state;
        const target = challenge ? challenge.target : state.prediction;
        if (!target) return state;
        const outcome = simulateRun(config, state.surfaceId, state.height);
        if (!outcome) return state;
        const current: RunRecord = {
          ...outcome,
          runNumber: state.runs.length + 1,
          mode: challenge ? 'challenge' : 'explore',
          prediction: target,
          predictionCorrect: outcome.band === target,
          ...(challenge ? { challengeId: challenge.id } : {}),
        };
        return { ...state, phase: 'running', current };
      }
      case 'finish-run': {
        if (state.phase !== 'running' || !state.current) return state;
        const next: FrictionGameState = { ...state, phase: 'result', runs: [...state.runs, state.current] };
        if (!challenge) return next;
        const success = state.current.predictionCorrect;
        return {
          ...next,
          attempts: state.attempts + 1,
          solved: success ? [...state.solved, challenge.id] : state.solved,
          solvedFirstTry: success && state.attempts === 0 ? [...state.solvedFirstTry, challenge.id] : state.solvedFirstTry,
        };
      }
      case 'next-run': {
        if (state.phase !== 'result') return state;
        if (challenge) {
          if (!state.current?.predictionCorrect) {
            // Try again: keep the settings so the learner changes one thing.
            return { ...state, phase: 'ready', current: null };
          }
          const nextChallenge = challenges[state.challengeIndex + 1];
          if (nextChallenge) return setUpChallenge({ ...state, challengeIndex: state.challengeIndex + 1 }, nextChallenge);
          return { ...state, mode: 'done', phase: 'choose-surface', surfaceId: null, prediction: null, current: null };
        }
        return { ...state, phase: 'choose-surface', surfaceId: null, prediction: null, current: null };
      }
      case 'start-challenges': {
        if (state.mode !== 'explore' || state.phase === 'running' || !challenges.length || !isExperimentComplete(state, config)) return state;
        return setUpChallenge({ ...state, mode: 'challenge', challengeIndex: 0 }, challenges[0]);
      }
      case 'answer-check': {
        if (!config.check || state.checkCorrect || !allChallengesSolved(state, config)) return state;
        if (!config.check.options.some((o) => o.id === action.optionId)) return state;
        return { ...state, checkAttempts: state.checkAttempts + 1, checkCorrect: action.optionId === config.check.correctOptionId };
      }
      case 'reset':
        return initialFrictionState;
      default:
        return state;
    }
  };
}

export function testedSurfaceIds(state: FrictionGameState): string[] {
  return [...new Set(state.runs.map((r) => r.surfaceId))];
}

/** Enough surfaces explored (the challenges, if any, open after this). */
export function isExperimentComplete(state: FrictionGameState, config: FrictionExperimentConfig): boolean {
  return testedSurfaceIds(state).length >= Math.min(config.minSurfacesToComplete, config.surfaces.length);
}

/** Every challenge is solved (true when there are none and the exploration is done). */
export function allChallengesSolved(state: FrictionGameState, config: FrictionExperimentConfig): boolean {
  const challenges = config.challenges ?? [];
  if (!challenges.length) return isExperimentComplete(state, config);
  return challenges.every((c) => state.solved.includes(c.id));
}

/** The whole activity is finished: exploration, every challenge, then the concept question when there is one. */
export function isLabComplete(state: FrictionGameState, config: FrictionExperimentConfig): boolean {
  return allChallengesSolved(state, config) && (!config.check || state.checkCorrect);
}

/** Latest run on each tested surface, sorted from longest to shortest distance. */
export function comparison(state: FrictionGameState): RunRecord[] {
  const latest = new Map<string, RunRecord>();
  for (const run of state.runs) latest.set(run.surfaceId, run);
  return [...latest.values()].sort((a, b) => b.distance - a.distance);
}

/** True when the compared runs all used the same ramp height, so only the surface changed. */
export function isFairComparison(runs: RunRecord[]): boolean {
  return runs.length < 2 || runs.every((r) => r.height === runs[0].height);
}

/** Surface/height combinations that reach a challenge's goal (used to check challenges are solvable). */
export function challengeSolutions(config: FrictionExperimentConfig, challenge: FrictionChallenge): { surfaceId: string; height: RampHeight }[] {
  const heights: RampHeight[] = challenge.height ? [challenge.height] : ['low', 'middle', 'top'];
  const surfaces = challenge.surfaceId ? [challenge.surfaceId] : config.surfaces.map((s) => s.id);
  return surfaces.flatMap((surfaceId) => heights.filter((height) => simulateRun(config, surfaceId, height)?.band === challenge.target).map((height) => ({ surfaceId, height })));
}
