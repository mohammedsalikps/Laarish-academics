import { describe, expect, it } from 'vitest';
import { TOPIC_INDEX } from '../../shared/curriculum/topicIndex';
import { GAMES } from './registry';

/** Every game engine stays registered, loadable, and used by real content (summit regression check). */
const ENGINES = [
  'magnet-lab',
  'friction-experiment',
  'push-box',
  'concept-match',
  'sort',
  'fraction-builder',
  'grid-explorer',
  'balance',
  'word-order',
  'number-line',
  'area-grid',
  'clock',
  'bar-chart',
  'circuit',
] as const;

describe('the 14 game engines', () => {
  it('are all registered with a name, skill, goal and instructions', () => {
    expect(Object.keys(GAMES).sort()).toEqual([...ENGINES].sort());
    for (const type of ENGINES) {
      const def = GAMES[type];
      expect(def.type).toBe(type);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.skill.length).toBeGreaterThan(0);
      expect(typeof def.goal).toBe('function');
      expect(typeof def.instructions).toBe('function');
      expect(def.Component).toBeDefined();
    }
  });

  const MODULES: Record<(typeof ENGINES)[number], () => Promise<{ default: unknown }>> = {
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
  };

  it.each(ENGINES)('%s loads its component', async (type) => {
    expect(typeof (await MODULES[type]()).default).toBe('function');
  }, 30_000);

  it('are each used by at least one topic, and every topic uses a registered engine', () => {
    const used = new Set(TOPIC_INDEX.map((t) => t.play.game.type));
    for (const type of ENGINES) expect(used.has(type)).toBe(true);
    for (const type of used) expect(ENGINES).toContain(type);
  });
});
