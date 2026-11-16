import type { GameConfig, GameType } from '../domain/types';

/**
 * "How to play" as pictures: two or three steps per game, each a small drawing
 * of the move (a hand dragging, a finger tapping, a hand turning) with a caption
 * of at most eight words. The drawings live in HowToGuide.tsx; the full written
 * instructions (registry.ts) stay one tap away under the pictures, so nothing
 * is lost for children (or grown-ups) who want every detail.
 *
 * Steps follow the topic's real config: a magnet topic with only pole rounds
 * shows the magnets, a bar-chart topic with only "read" rounds shows tapping.
 */

export type HowToScene =
  | 'magnet-drag'
  | 'magnet-watch'
  | 'magnet-sort'
  | 'poles-push'
  | 'poles-turn'
  | 'surface-pick'
  | 'predict'
  | 'roll'
  | 'push-drag'
  | 'push-go'
  | 'match-drag'
  | 'match-tap'
  | 'match-done'
  | 'sort-drag'
  | 'sort-tap'
  | 'fraction-shade'
  | 'fraction-count'
  | 'map-walk'
  | 'map-compass'
  | 'map-arrive'
  | 'balance-try'
  | 'balance-tip'
  | 'balance-level'
  | 'words-tap'
  | 'words-back'
  | 'line-tap'
  | 'line-drag'
  | 'area-drag'
  | 'area-count'
  | 'clock-turn'
  | 'clock-hands'
  | 'bar-drag'
  | 'bar-tap'
  | 'circuit-drag'
  | 'circuit-switch'
  | 'circuit-bulb'
  | 'press-check';

export interface HowToStep {
  scene: HowToScene;
  /** The caption: at most eight words, read aloud with the other steps on request. */
  text: string;
  /** Drawing detail for scenes that depend on the config: the fraction shape, or what an area round measures. */
  variant?: 'circle' | 'bar' | 'area' | 'perimeter' | 'both';
}

/** The longest caption allowed (in words); a test checks every topic. */
export const MAX_CAPTION_WORDS = 8;

const step = (scene: HowToScene, text: string, variant?: HowToStep['variant']): HowToStep => (variant ? { scene, text, variant } : { scene, text });
const CHECK = step('press-check', 'Press Check.');

type HowToTable = { [T in GameType]: (config: Extract<GameConfig, { type: T }>) => HowToStep[] };

export const HOW_TO: HowToTable = {
  'magnet-lab': (c) => {
    const kinds = new Set(c.rounds.map((r) => r.kind));
    const steps: HowToStep[] = [];
    if (kinds.has('test')) steps.push(step('magnet-drag', 'Drag an object to the magnet.'));
    if (kinds.has('sort')) steps.push(step('magnet-sort', 'Sort each object into a tray.'));
    if (kinds.has('poles')) steps.push(step('poles-push', 'Push the two magnets together.'), step('poles-turn', 'Turn one magnet around, then push.'));
    // Room left: show what to look for after a test.
    if (kinds.has('test') && steps.length < 3) steps.splice(1, 0, step('magnet-watch', 'Watch: does the magnet pull it?'));
    return steps.slice(0, 3);
  },
  'friction-experiment': () => [
    step('surface-pick', 'Choose a surface for the car.'),
    step('predict', 'Guess how far it will roll.'),
    step('roll', 'Press Start and watch it roll.'),
  ],
  'push-box': () => [step('surface-pick', 'Choose a floor.'), step('push-drag', 'Drag the hand to push harder.'), step('push-go', 'Press Push! and watch the box.')],
  'concept-match': () => [step('match-drag', 'Drag a card onto its match.'), step('match-tap', 'Or tap a card, then its match.'), step('match-done', 'Match every pair to finish.')],
  sort: () => [step('sort-drag', 'Drag the card into its box.'), step('sort-tap', 'Or tap the box it belongs in.')],
  'fraction-builder': (c) => {
    const shape = c.rounds[0]?.shape === 'bar' ? 'bar' : 'circle';
    return [step('fraction-shade', 'Tap or drag to shade pieces.', shape), step('fraction-count', 'Shade as many as the top number.', shape), CHECK];
  },
  'grid-explorer': () => [step('map-walk', 'Tap a square to walk there.'), step('map-compass', 'Or use the N, S, E, W buttons.'), step('map-arrive', 'Press I am here! when you arrive.')],
  balance: () => [step('balance-try', 'Tap a number to try it.'), step('balance-tip', 'The heavier side goes down.'), step('balance-level', 'Make it level, then press Check.')],
  'word-order': () => [step('words-tap', 'Tap the words in order.'), step('words-back', 'Tap a word to send it back.'), step('press-check', 'Press Check when it reads right.')],
  'number-line': () => [step('line-tap', 'Tap a mark on the number line.'), step('line-drag', 'Or drag the marker along.'), CHECK],
  'area-grid': (c) => {
    const area = c.rounds.some((r) => r.area !== undefined);
    const perimeter = c.rounds.some((r) => r.perimeter !== undefined);
    const measure = area && perimeter ? 'both' : perimeter ? 'perimeter' : 'area';
    const text = { both: 'Area counts squares. Perimeter adds sides.', perimeter: 'Add up all four sides for perimeter.', area: 'Count the squares inside for area.' }[measure];
    return [step('area-drag', 'Drag across the grid to build.'), step('area-count', text, measure), CHECK];
  },
  clock: () => [step('clock-turn', 'Drag the long hand around.'), step('clock-hands', 'The short hand follows by itself.'), CHECK],
  'bar-chart': (c) => {
    const build = c.rounds.some((r) => r.mode === 'build');
    const read = c.rounds.some((r) => r.mode === 'read');
    return [...(build ? [step('bar-drag', 'Drag each bar to match the table.')] : []), ...(read ? [step('bar-tap', 'Read the bars, then tap the answer.')] : []), CHECK];
  },
  circuit: () => [step('circuit-drag', 'Drag an object into the gap.'), step('circuit-switch', 'Turn the switch on.'), step('circuit-bulb', 'Does the bulb light up?')],
};

/** Something the child must always see with the steps (a safety rule), shown under the pictures. */
export const HOW_TO_NOTE: Partial<Record<GameType, string>> = {
  circuit: 'On-screen only. Never touch wall sockets.',
};

export function howToSteps(config: GameConfig): HowToStep[] {
  return (HOW_TO[config.type] as (c: GameConfig) => HowToStep[])(config);
}

export const captionWords = (text: string): number => text.trim().split(/\s+/).length;
