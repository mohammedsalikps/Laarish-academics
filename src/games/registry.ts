import { lazy } from 'react';
import type { GameConfig } from '../domain/types';
import type { GameRegistry } from './framework';

/** Code-split loaders, so a topic can start downloading its game while the learner watches. */
const LOADERS = {
  'magnet-lab': () => import('./magnet/MagnetLab'),
  'friction-experiment': () => import('./friction/FrictionExperiment'),
  'push-box': () => import('./pushbox/PushBox'),
  'concept-match': () => import('./match/ConceptMatch'),
  sort: () => import('./sort/SortGame'),
  'fraction-builder': () => import('./fraction/FractionBuilder'),
  'grid-explorer': () => import('./grid/GridExplorer'),
  balance: () => import('./balance/BalanceScale'),
  'word-order': () => import('./words/WordOrder'),
  'number-line': () => import('./numberline/NumberLineGame'),
  'area-grid': () => import('./area/AreaBuilder'),
  clock: () => import('./clock/ClockSetter'),
  'bar-chart': () => import('./barchart/BarChartBuilder'),
  circuit: () => import('./circuit/CircuitLab'),
} satisfies Record<GameConfig['type'], () => Promise<unknown>>;

export function preloadGame(type: GameConfig['type']): void {
  void LOADERS[type]().catch(() => {
    /* the Play step retries through React.lazy */
  });
}

/**
 * Registry of playable mini-game types. To add a new game type:
 * 1. add its config type to GameConfig in shared/curriculum/types.ts,
 * 2. write a pure state machine + a component implementing MiniGameProps,
 * 3. register it here. Topics then use it purely through curriculum data.
 */
export const GAMES: GameRegistry = {
  'magnet-lab': {
    type: 'magnet-lab',
    name: 'Magnet experiment',
    skill: 'Test, observe and explain',
    goal: (c) => {
      const kinds = new Set(c.rounds.map((r) => r.kind));
      return kinds.has('poles') && !kinds.has('test') ? 'Push two magnets together and find out when they attract and when they repel.' : 'Find out which objects a magnet pulls, then sort them.';
    },
    instructions: (c) => [
      ...(c.rounds.some((r) => r.kind === 'test') ? ['Drag an object close to the magnet, or tap it, and watch what happens.', 'Test every object, then compare your results.'] : []),
      ...(c.rounds.some((r) => r.kind === 'sort') ? ['Sorting: drag each object into the Magnetic or Not magnetic tray, or tap the object and then the tray.'] : []),
      ...(c.rounds.some((r) => r.kind === 'poles') ? ['Magnets: drag the right magnet towards the left one, or press Push together.', 'Press Turn it around to change which pole faces the other magnet.'] : []),
      'Stuck? Press Need a hint.',
    ],
    Component: lazy(LOADERS['magnet-lab']),
  },
  'friction-experiment': {
    type: 'friction-experiment',
    name: 'Virtual experiment',
    skill: 'Predict, test and compare',
    goal: (c) =>
      c.challenges?.length
        ? `Test ${c.minSurfacesToComplete} surfaces, then solve ${c.challenges.length} Lab challenges.`
        : `Test ${c.minSurfacesToComplete} different surfaces and compare how far the car rolls.`,
    instructions: (c) => [
      'Choose a surface for the toy car.',
      'Drag the car up the ramp, or tap Low, Middle or Top, to choose the push.',
      'Predict how far it will roll, then press Start.',
      c.challenges?.length ? `Test ${c.minSurfacesToComplete} surfaces, then solve the Lab challenges.` : `Test at least ${c.minSurfacesToComplete} different surfaces and compare your results.`,
    ],
    Component: lazy(LOADERS['friction-experiment']),
  },
  'push-box': {
    type: 'push-box',
    name: 'Force simulation',
    skill: 'Push, observe and explain',
    goal: () => 'Move the box on every floor and find out how hard each one pushes back.',
    instructions: () => ['Choose a floor.', 'Drag the hand or the slider to pick how hard to push.', 'Press Push! and watch the box.', 'Move the box on every floor to finish.'],
    Component: lazy(LOADERS['push-box']),
  },
  'concept-match': {
    type: 'concept-match',
    name: 'Matching challenge',
    skill: 'Connect ideas to real life',
    // The game itself shows only the cards, so its task sentence lives here.
    goal: (c) => c.prompt,
    instructions: (c) => [`Drag a card from “${c.leftLabel}” onto its match in “${c.rightLabel}”.`, 'Or tap a card, then tap the card it matches.', 'Match every pair to finish.'],
    Component: lazy(LOADERS['concept-match']),
  },
  sort: {
    type: 'sort',
    name: 'Sorting challenge',
    skill: 'Sort and classify',
    goal: (c) => c.prompt,
    instructions: () => ['Drag the card into the box where it belongs.', 'Or tap the box.', 'Sort every item to finish.'],
    Component: lazy(LOADERS.sort),
  },
  'fraction-builder': {
    type: 'fraction-builder',
    name: 'Shape puzzle',
    skill: 'Make fractions with equal parts',
    goal: (c) => `Build the right fraction in all ${c.rounds.length} rounds.`,
    instructions: (c) => ['Read the fraction you need to shade.', 'Tap or drag across pieces to shade them. Tap a shaded piece to un-shade it.', 'Press Check.', `Finish all ${c.rounds.length} rounds.`],
    Component: lazy(LOADERS['fraction-builder']),
  },
  'grid-explorer': {
    type: 'grid-explorer',
    name: 'Map adventure',
    skill: 'Follow directions on a map',
    goal: (c) => `Find all ${c.tasks.length} places on the map.`,
    instructions: (c) => ['Read where to go.', 'Tap a glowing square to walk there, or use the North, South, East and West buttons (or arrow keys).', 'Press "I am here!" when you arrive.', `Find all ${c.tasks.length} places.`],
    Component: lazy(LOADERS['grid-explorer']),
  },
  balance: {
    type: 'balance',
    name: 'Balance puzzle',
    skill: 'Find the missing number',
    goal: (c) => `Balance all ${c.rounds.length} scales by finding ${c.unknownLabel}.`,
    instructions: (c) => [
      'Look at both sides of the scale.',
      `Tap a number to try it for ${c.unknownLabel}. The scale tips to the heavier side.`,
      'When the scale is level, press Check.',
      `Balance all ${c.rounds.length} scales.`,
    ],
    Component: lazy(LOADERS.balance),
  },
  'word-order': {
    type: 'word-order',
    name: 'Sentence builder',
    skill: 'Put words in order',
    goal: (c) => `Build all ${c.rounds.length} sentences with the word tiles.`,
    instructions: () => [
      'Look at the picture clue.',
      'Tap the word tiles in order, or drag them into the sentence.',
      'Tap a word in your sentence to send it back.',
      'Press Check. A sentence starts with a capital letter and ends with a full stop or a question mark.',
    ],
    Component: lazy(LOADERS['word-order']),
  },
  'number-line': {
    type: 'number-line',
    name: 'Number line',
    skill: 'Place and move along a number line',
    goal: (c) => `Find the right point in all ${c.rounds.length} rounds.`,
    instructions: () => ['Read the task.', 'Tap a mark on the number line, or drag the marker, to choose a point.', 'Press Check.', 'A wrong point gives a hint: try again.'],
    Component: lazy(LOADERS['number-line']),
  },
  'area-grid': {
    type: 'area-grid',
    name: 'Area builder',
    skill: 'Measure area and perimeter',
    goal: (c) => `Build the right rectangle in all ${c.rounds.length} rounds.`,
    instructions: () => ['Read the area or perimeter you need.', 'Drag across the grid, or use the + and − buttons, to set the width and height.', 'Watch the area and perimeter change, then press Check.'],
    Component: lazy(LOADERS['area-grid']),
  },
  clock: {
    type: 'clock',
    name: 'Clock setter',
    skill: 'Read and show the time',
    goal: (c) => `Show the right time on the clock in all ${c.rounds.length} rounds.`,
    instructions: (c) => [
      'Read the time you need to show.',
      `Drag the long hand, or use the buttons, to move the minutes${c.minuteStep < 60 ? ` in steps of ${c.minuteStep}` : ''}. The short hand follows.`,
      'Press Check.',
    ],
    Component: lazy(LOADERS.clock),
  },
  'bar-chart': {
    type: 'bar-chart',
    name: 'Bar chart builder',
    skill: 'Show and read data',
    goal: (c) => `Finish all ${c.rounds.length} chart tasks.`,
    instructions: () => ['Build: drag each bar, or tap + and −, until it matches the table.', 'Read: look at the bars and tap the answer.', 'Press Check.'],
    Component: lazy(LOADERS['bar-chart']),
  },
  circuit: {
    type: 'circuit',
    name: 'Circuit lab',
    skill: 'Test which materials let electricity through',
    goal: (c) => (c.rounds.some((r) => r.goal === 'test-all') ? `Test all ${c.items.length} objects in the circuit.` : 'Light the bulb.'),
    instructions: () => ['Drag an object into the gap in the circuit, or tap it.', 'Close the switch and watch the bulb.', 'The bulb lights only if electricity can pass through the object.', 'This is an on-screen circuit. Never experiment with mains electricity or wall sockets.'],
    Component: lazy(LOADERS.circuit),
  },
};
