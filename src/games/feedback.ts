/**
 * Classifies a game's event so the shared Play layer shows feedback the same
 * way in every engine: green for a right answer, a calm orange "not yet"
 * (never red), gold when the mission is done, and neutral for instructions and
 * observations (what the learner saw happen before they answered).
 *
 * The map lists the real event keys the 14 engines send (audited 16 Nov 2026).
 * Unknown keys are neutral, so a new engine never shows a wrong colour.
 */
export type FeedbackTone = 'neutral' | 'correct' | 'not-yet' | 'complete';

const TONES: Record<string, FeedbackTone> = {
  // Right answers
  'round-correct': 'correct',
  'sort-correct': 'correct',
  'match-correct': 'correct',
  'task-correct': 'correct',
  'sentence-correct': 'correct',
  'check-correct': 'correct',
  'run-finished:correct': 'correct',
  'challenge-success': 'correct',
  // Not yet (a wrong try)
  'round-incorrect': 'not-yet',
  'sort-incorrect': 'not-yet',
  'match-incorrect': 'not-yet',
  'task-incorrect': 'not-yet',
  'sentence-incorrect': 'not-yet',
  'sentence-hint': 'not-yet',
  'check-incorrect': 'not-yet',
  'run-finished:incorrect': 'not-yet',
  'challenge-retry': 'not-yet',
  // Mission done
  complete: 'complete',
  'complete:perfect': 'complete',
  'all-challenges': 'complete',
};

export function feedbackTone(eventKey: string): FeedbackTone {
  return TONES[eventKey] ?? 'neutral';
}
