import type { GameResult } from '../../domain/results';
import { MAGNET_PULLS, type MagnetLabConfig, type MagnetMaterial, type MagnetPole, type MagnetRound } from '../../domain/types';

/**
 * Magnet Explorer, a simplified educational model with only these rules:
 *  - a magnet pulls objects made of iron or (iron-based) steel, from a short distance,
 *    before they touch; it does not pull copper, brass, aluminium, wood, plastic,
 *    rubber or glass (MAGNET_PULLS);
 *  - when two magnets meet, opposite poles attract and like poles repel.
 * Real magnets also get weaker with distance and differ in strength; the game does
 * not model that.
 *
 * Rounds:
 *  - test: bring each listed object to the magnet (an investigation, no mistakes);
 *  - sort: put each listed object in the Magnetic or Not magnetic tray;
 *  - poles: push a movable bar magnet towards a fixed one whose N pole faces it,
 *    turning it around as needed (explore / attract / repel / identify).
 */

export type MagnetObject = MagnetLabConfig['objects'][number];
export type Tray = 'magnetic' | 'not-magnetic';
export type PoleOutcome = 'attract' | 'repel';

/** The fixed magnet's pole that faces the magnet the learner moves. */
export const FIXED_FACING: MagnetPole = 'N';

/** Mistakes in a round before its hint shows by itself (the first gets a short nudge). */
export const HINT_AFTER = 2;

/** Does a magnet pull this material? */
export const isAttracted = (material: MagnetMaterial): boolean => MAGNET_PULLS[material];

/** The only rule for two magnets: opposite poles attract, like poles repel. */
export const poleOutcome = (a: MagnetPole, b: MagnetPole): PoleOutcome => (a === b ? 'repel' : 'attract');

export const otherPole = (p: MagnetPole): MagnetPole => (p === 'N' ? 'S' : 'N');

export const poleName = (p: MagnetPole): string => (p === 'N' ? 'north (N)' : 'south (S)');

/** What just happened, for feedback, sounds and mentor events. A new object every time. */
export type MagnetHappening =
  | { kind: 'tested'; objectId: string; pulled: boolean; solved: boolean }
  | { kind: 'sorted'; objectId: string; tray: Tray; correct: boolean; solved: boolean }
  | { kind: 'pushed'; facing: MagnetPole; outcome: PoleOutcome; mistake: boolean; solved: boolean }
  | { kind: 'turned'; facing: MagnetPole }
  | { kind: 'identified'; answer: MagnetPole; correct: boolean; solved: boolean }
  | { kind: 'hint' };

export interface MagnetState {
  round: number;
  /** Test rounds: the object at the magnet now. */
  atMagnet: string | null;
  /** Test rounds: objects tested, in order. */
  tested: string[];
  /** Sort rounds: objects placed in their (correct) tray. */
  sorted: Record<string, Tray>;
  /** Poles: the pole of the moving magnet that faces the fixed magnet's N pole. */
  facing: MagnetPole;
  /** Poles: outcomes seen this round. */
  seen: PoleOutcome[];
  /** Poles: pushed since the magnet was last turned (identify needs a test first). */
  pushedSinceTurn: boolean;
  /** Poles: the two magnets are stuck together (after attracting, until turned). */
  joined: boolean;
  /** Mistakes this round, and the hint state. */
  wrong: number;
  hintAsked: boolean;
  mistakesByRound: Record<string, number>;
  mistakes: number;
  hintsAsked: number;
  phase: 'playing' | 'correct' | 'complete';
  last: MagnetHappening | null;
}

export type MagnetAction =
  | { type: 'test'; objectId: string }
  | { type: 'release' }
  | { type: 'sort'; objectId: string; tray: Tray }
  | { type: 'turn' }
  | { type: 'push' }
  | { type: 'identify'; answer: MagnetPole }
  | { type: 'hint' }
  | { type: 'next' }
  | { type: 'reset' };

/**
 * The moving magnet's facing pole at the start of a round. Each challenge starts the
 * opposite way round (an attract challenge first repels, a repel challenge first
 * attracts), so pressing Push straight away never solves it; exploring starts with
 * like poles; identify starts with its hidden pole.
 */
export function startFacing(round: MagnetRound | undefined): MagnetPole {
  if (round?.kind !== 'poles') return FIXED_FACING;
  if (round.goal === 'identify') return round.hiddenFacing ?? FIXED_FACING;
  return round.goal === 'repel' ? otherPole(FIXED_FACING) : FIXED_FACING;
}

/** The mystery magnet's poles stay hidden until its round is solved. */
export const polesHidden = (round: MagnetRound, state: Pick<MagnetState, 'phase'>): boolean => round.kind === 'poles' && round.goal === 'identify' && state.phase === 'playing';

export function initialMagnetState(config: MagnetLabConfig): MagnetState {
  return {
    round: 0,
    atMagnet: null,
    tested: [],
    sorted: {},
    facing: startFacing(config.rounds[0]),
    seen: [],
    pushedSinceTurn: false,
    joined: false,
    wrong: 0,
    hintAsked: false,
    mistakesByRound: {},
    mistakes: 0,
    hintsAsked: 0,
    phase: 'playing',
    last: null,
  };
}

export const findObject = (config: MagnetLabConfig, id: string | null | undefined): MagnetObject | undefined => (id ? config.objects.find((o) => o.id === id) : undefined);

export const currentRound = (config: MagnetLabConfig, state: MagnetState): MagnetRound => config.rounds[Math.min(state.round, config.rounds.length - 1)];

/** Objects a round uses, in config order of the round's list. */
export function roundObjects(config: MagnetLabConfig, round: MagnetRound): MagnetObject[] {
  if (round.kind === 'poles') return [];
  return round.objectIds.map((id) => findObject(config, id)).filter((o): o is MagnetObject => Boolean(o));
}

/** The tray an object belongs in. */
export const trayFor = (object: MagnetObject): Tray => (isAttracted(object.material) ? 'magnetic' : 'not-magnetic');

function mistake(state: MagnetState, round: MagnetRound): Pick<MagnetState, 'wrong' | 'mistakes' | 'mistakesByRound'> {
  return { wrong: state.wrong + 1, mistakes: state.mistakes + 1, mistakesByRound: { ...state.mistakesByRound, [round.id]: (state.mistakesByRound[round.id] ?? 0) + 1 } };
}

export function createMagnetReducer(config: MagnetLabConfig) {
  return function magnetReducer(state: MagnetState, action: MagnetAction): MagnetState {
    if (action.type === 'reset') return initialMagnetState(config);
    if (state.phase === 'complete') return state;
    const round = currentRound(config, state);
    const playing = state.phase === 'playing';

    switch (action.type) {
      case 'test': {
        if (round.kind !== 'test' || !round.objectIds.includes(action.objectId)) return state;
        const object = findObject(config, action.objectId);
        if (!object || state.atMagnet === object.id) return state;
        const tested = state.tested.includes(object.id) ? state.tested : [...state.tested, object.id];
        const solved = playing && round.objectIds.every((id) => tested.includes(id));
        return { ...state, atMagnet: object.id, tested, phase: solved ? 'correct' : state.phase, last: { kind: 'tested', objectId: object.id, pulled: isAttracted(object.material), solved } };
      }
      case 'release':
        return state.atMagnet === null ? state : { ...state, atMagnet: null };
      case 'sort': {
        if (round.kind !== 'sort' || !playing || !round.objectIds.includes(action.objectId) || state.sorted[action.objectId]) return state;
        const object = findObject(config, action.objectId);
        if (!object) return state;
        const correct = trayFor(object) === action.tray;
        if (!correct) return { ...state, ...mistake(state, round), last: { kind: 'sorted', objectId: object.id, tray: action.tray, correct, solved: false } };
        const sorted = { ...state.sorted, [object.id]: action.tray };
        const solved = round.objectIds.every((id) => sorted[id]);
        return { ...state, sorted, phase: solved ? 'correct' : state.phase, last: { kind: 'sorted', objectId: object.id, tray: action.tray, correct, solved } };
      }
      case 'turn':
        if (round.kind !== 'poles') return state;
        return { ...state, facing: otherPole(state.facing), pushedSinceTurn: false, joined: false, last: { kind: 'turned', facing: otherPole(state.facing) } };
      case 'push': {
        if (round.kind !== 'poles') return state;
        const outcome = poleOutcome(FIXED_FACING, state.facing);
        const seen = state.seen.includes(outcome) ? state.seen : [...state.seen, outcome];
        let solved = false;
        let wrong = false;
        if (playing) {
          if (round.goal === 'explore') solved = seen.length === 2;
          else if (round.goal === 'attract' || round.goal === 'repel') {
            solved = outcome === round.goal;
            wrong = !solved;
          }
        }
        const next: MagnetState = { ...state, seen, pushedSinceTurn: true, joined: outcome === 'attract', last: { kind: 'pushed', facing: state.facing, outcome, mistake: wrong, solved } };
        if (solved) next.phase = 'correct';
        return wrong ? { ...next, ...mistake(state, round) } : next;
      }
      case 'identify': {
        if (round.kind !== 'poles' || round.goal !== 'identify' || !playing || !state.pushedSinceTurn) return state;
        const correct = action.answer === state.facing;
        const last: MagnetHappening = { kind: 'identified', answer: action.answer, correct, solved: correct };
        return correct ? { ...state, phase: 'correct', last } : { ...state, ...mistake(state, round), last };
      }
      case 'hint':
        if (!playing || state.hintAsked) return state;
        return { ...state, hintAsked: true, hintsAsked: state.hintsAsked + 1, last: { kind: 'hint' } };
      case 'next': {
        if (state.phase !== 'correct') return state;
        if (state.round >= config.rounds.length - 1) return { ...state, phase: 'complete', last: null };
        const nextRound = config.rounds[state.round + 1];
        return { ...state, round: state.round + 1, atMagnet: null, tested: [], sorted: {}, facing: startFacing(nextRound), seen: [], pushedSinceTurn: false, joined: false, wrong: 0, hintAsked: false, phase: 'playing', last: null };
      }
      default:
        return state;
    }
  };
}

/** What to try after a mistake: a short nudge first, the round's own hint from the second mistake. */
export function mistakeNudge(config: MagnetLabConfig, state: MagnetState): string {
  const round = currentRound(config, state);
  if (state.wrong >= HINT_AFTER) return round.hint;
  const last = state.last;
  if (last?.kind === 'sorted') {
    const object = findObject(config, last.objectId);
    return object ? `Think about what ${theLabel(object.label)} is made of.` : round.hint;
  }
  if (last?.kind === 'identified') return 'Did they attract or repel? Opposite poles attract, like poles repel.';
  return 'Try turning the magnet around.';
}

/** The round's hint shows when asked for, or by itself after HINT_AFTER mistakes. */
export const hintVisible = (state: MagnetState): boolean => state.phase === 'playing' && (state.hintAsked || state.wrong >= HINT_AFTER);

/** "Iron nail" → "the iron nail". */
export function theLabel(label: string): string {
  return `the ${/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label}`;
}

export interface MagnetFeedback {
  tone: 'pulled' | 'not-pulled' | 'attract' | 'repel' | 'right' | 'wrong' | 'info';
  text: string;
  /** Why: the object's own explanation, the round's explanation or the hint. */
  detail?: string;
}

/** The one feedback line, always describing what the model really does. */
export function magnetFeedback(config: MagnetLabConfig, state: MagnetState): MagnetFeedback | null {
  const round = currentRound(config, state);
  const last = state.last;
  const solvedNow = state.phase === 'correct' && last && 'solved' in last && last.solved;
  if (!last || last.kind === 'hint') return null;
  switch (last.kind) {
    case 'tested': {
      const object = findObject(config, last.objectId);
      if (!object || state.atMagnet !== object.id) return null;
      return last.pulled
        ? { tone: 'pulled', text: `The magnet pulled ${theLabel(object.label)} across the gap, before they even touched!`, detail: solvedNow ? round.explanation : object.explanation }
        : { tone: 'not-pulled', text: `Nothing happened: the magnet does not pull ${theLabel(object.label)}.`, detail: solvedNow ? round.explanation : object.explanation };
    }
    case 'sorted': {
      const object = findObject(config, last.objectId);
      if (!object) return null;
      if (!last.correct) return { tone: 'wrong', text: `Not that tray. ${mistakeNudge(config, state)}` };
      return { tone: 'right', text: `Yes! ${object.label}: ${last.tray === 'magnetic' ? 'magnetic' : 'not magnetic'}.`, detail: solvedNow ? round.explanation : object.explanation };
    }
    case 'pushed': {
      const pair = `${last.facing === FIXED_FACING ? 'Two N poles' : 'An N pole and an S pole'}`;
      const result = last.outcome === 'attract' ? `${pair} met: they attract and snap together.` : `${pair} met: they repel and push apart, without even touching.`;
      if (round.kind !== 'poles') return null;
      if (last.mistake) return { tone: last.outcome, text: result, detail: mistakeNudge(config, state) };
      if (round.goal === 'identify') return { tone: last.outcome, text: last.outcome === 'attract' ? 'They attract and snap together.' : 'They repel and push apart.', detail: 'Which pole of the mystery magnet is facing the N pole?' };
      return { tone: last.outcome, text: result, detail: solvedNow ? round.explanation : undefined };
    }
    case 'turned':
      if (round.kind !== 'poles') return null;
      return { tone: 'info', text: round.goal === 'identify' ? 'You turned the mystery magnet around. Push it to test it again.' : `You turned the magnet around: now its ${last.facing} pole faces the N pole.` };
    case 'identified':
      return last.correct
        ? { tone: 'right', text: `Yes! The ${poleName(last.answer)} pole was facing the N pole.`, detail: round.explanation }
        : { tone: 'wrong', text: `Not quite. ${mistakeNudge(config, state)}` };
  }
}

/** Test rounds: the objects tested, split by what happened. */
export function testedGroups(config: MagnetLabConfig, state: MagnetState): { pulled: MagnetObject[]; notPulled: MagnetObject[] } {
  const items = state.tested.map((id) => findObject(config, id)).filter((o): o is MagnetObject => Boolean(o));
  return { pulled: items.filter((o) => isAttracted(o.material)), notPulled: items.filter((o) => !isAttracted(o.material)) };
}

/**
 * A short sentence about the latest observation, for the mentor (real game state only).
 * `hidden`: the mystery magnet's poles are not named, so the mentor cannot give the answer away.
 */
export function observationText(config: MagnetLabConfig, happening: MagnetHappening, hidden = false): string | null {
  switch (happening.kind) {
    case 'tested': {
      const object = findObject(config, happening.objectId);
      return object ? `Magnet Explorer: the magnet ${happening.pulled ? 'pulled' : 'did not pull'} the ${object.label.toLowerCase()} (made of ${object.material}).` : null;
    }
    case 'sorted': {
      const object = findObject(config, happening.objectId);
      return object ? `Magnet Explorer: put the ${object.label.toLowerCase()} (${object.material}) in the ${happening.tray === 'magnetic' ? 'Magnetic' : 'Not magnetic'} tray, which was ${happening.correct ? 'right' : 'not right'}.` : null;
    }
    case 'pushed':
      return hidden
        ? `Magnet Explorer: pushed a mystery magnet (poles hidden) towards an N pole; they ${happening.outcome === 'attract' ? 'attracted' : 'repelled'}. The child is working out which pole is hidden.`
        : `Magnet Explorer: pushed the ${happening.facing} pole of a magnet towards an N pole; they ${happening.outcome === 'attract' ? 'attracted' : 'repelled'}.`;
    case 'identified':
      return happening.correct ? `Magnet Explorer: worked out that the hidden pole was ${happening.answer}.` : 'Magnet Explorer: guessed the hidden pole, but not correctly yet.';
    default:
      return null;
  }
}

export function magnetResult(config: MagnetLabConfig, state: MagnetState): GameResult {
  const total = config.rounds.length;
  const completed = state.phase === 'complete';
  // Test rounds and pole exploring are investigations, so they always count as correct.
  const clean = completed ? config.rounds.filter((r) => !state.mistakesByRound[r.id]).length : 0;
  return {
    gameType: 'magnet-lab',
    score: total ? clean / total : 0,
    correct: clean,
    total,
    mistakes: state.mistakes,
    completed,
    perfect: completed && state.mistakes === 0,
    summary: `Finished ${completed ? total : state.round} of ${total} magnet rounds with ${state.mistakes} wrong tr${state.mistakes === 1 ? 'y' : 'ies'}`,
  };
}
