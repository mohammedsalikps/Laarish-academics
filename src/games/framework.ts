import type { ComponentType, LazyExoticComponent } from 'react';
import type { GameResult } from '../domain/results';
import type { CoachScript, GameConfig, GameType } from '../domain/types';

/**
 * Mini-game framework.
 *
 * Every game is a component implementing MiniGameProps plus a pure state
 * machine (see the *Logic.ts files). Games report:
 *  - onEvent:    things the mentor can react to (AI-guided discovery),
 *  - onRecord:   individual attempts that the progress store records,
 *  - onComplete: the final GameResult, which decides reward eligibility.
 * Rewards themselves are always computed by the progress reducer, never by games.
 */

export interface GameEvent {
  /** e.g. "surface-selected:grass", "run-finished:correct", "complete:perfect". */
  key: string;
  vars?: Record<string, string>;
}

export type GameRecord =
  | {
      kind: 'experiment-run';
      surfaceId: string;
      /** Explore runs: the prediction was right. Challenge runs: the goal was reached. */
      predictionCorrect: boolean;
      mode?: 'explore' | 'challenge';
      distance?: number;
      height?: 'low' | 'middle' | 'top';
    }
  /** What the learner just saw happen, in one sentence built from the game's real state, so the mentor can talk about it. */
  | { kind: 'observation'; text: string };

export interface MiniGameProps<C extends GameConfig = GameConfig> {
  config: C;
  topicId: string;
  /** Increments on every replay; used to seed shuffles so replays differ. */
  attempt: number;
  reducedMotion: boolean;
  onEvent(event: GameEvent): void;
  onRecord?(record: GameRecord): void;
  onComplete(result: GameResult): void;
  /** Starts the game again from scratch (new attempt). */
  onRestart(): void;
}

export interface MiniGameDefinition<C extends GameConfig = GameConfig> {
  type: C['type'];
  name: string;
  /** Learning skill the game practises, shown in the instructions card. */
  skill: string;
  /** One-sentence mission shown above the game. */
  goal(config: C): string;
  instructions(config: C): string[];
  Component: ComponentType<MiniGameProps<C>> | LazyExoticComponent<ComponentType<MiniGameProps<C>>>;
}

export type GameRegistry = { [T in GameType]: MiniGameDefinition<Extract<GameConfig, { type: T }>> };

/**
 * Starts a pointer drag safely: stops the browser from selecting text or
 * starting its own drag-and-drop of an existing selection (which would cancel
 * the pointer mid-drag), and captures the pointer when supported.
 */
export function beginPointerDrag(e: { pointerType: string; pointerId: number; preventDefault(): void; currentTarget: Element }): void {
  if (e.pointerType === 'mouse') e.preventDefault();
  window.getSelection?.()?.removeAllRanges();
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId);
  } catch {
    // Capture is optional: drags still work by hit-testing each move.
  }
}

/** Resolves the coach line for an event: exact key first, then the key before ":". */
export function coachLine(script: CoachScript, event: GameEvent): string | null {
  const template = script[event.key] ?? script[event.key.split(':')[0]];
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => event.vars?.[name] ?? '');
}
