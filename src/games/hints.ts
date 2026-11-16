import { useEffect } from 'react';
import type {
  AreaGridConfig,
  BalanceGameConfig,
  BalanceTerm,
  BarChartConfig,
  CircuitConfig,
  ClockConfig,
  ConceptMatchConfig,
  FractionBuilderConfig,
  FrictionChallenge,
  FrictionExperimentConfig,
  GridExplorerConfig,
  MagnetRound,
  NumberLineConfig,
  PushBoxConfig,
  SortGameConfig,
  WordOrderConfig,
} from '../domain/types';
import type { HintContext } from './framework';
import { BAND_TITLES } from './friction/simulation';
import { formatValue } from './numberline/numberLineLogic';

/*
 * "Need a hint?" in Play: each game reports the question the learner is on, with hints that go
 * from a gentle nudge (built from the question itself) to the round's own hint written with the
 * lesson. No step gives the answer, and asking never costs points. Everything here is on the
 * device, so hints work offline and without the AI mentor.
 */

const steps = (...lines: (string | null | undefined | false)[]): string[] => lines.filter((l): l is string => Boolean(l && l.trim()));

/** Sends the current question to Play whenever it changes (a new round, task or item). */
export function useHintContext(report: ((context: HintContext | null) => void) | undefined, context: HintContext | null): void {
  const serialized = context ? JSON.stringify(context) : null;
  useEffect(() => {
    report?.(serialized ? (JSON.parse(serialized) as HintContext) : null);
  }, [report, serialized]);
}

export function areaHints(round: AreaGridConfig['rounds'][number]): HintContext {
  const { area, perimeter } = round;
  const first =
    area !== undefined && perimeter !== undefined
      ? `You need an area of ${area} and a perimeter of ${perimeter}. Area counts the squares inside. Perimeter adds up all four sides.`
      : area !== undefined
        ? `Area counts the squares inside the rectangle. Can you make a rectangle with ${area} squares inside?`
        : `Perimeter is the distance all the way round. Add up all four sides: you need ${perimeter}.`;
  return { key: `area:${round.id}`, question: round.prompt, steps: steps(first, round.hint) };
}

const knownTotal = (terms: BalanceTerm[]): number | null => (terms.every((t) => t !== 'unknown') ? (terms as number[]).reduce((a, b) => a + b, 0) : null);

export function balanceHints(round: BalanceGameConfig['rounds'][number]): HintContext {
  const sides = [
    { name: 'left', terms: round.left, total: knownTotal(round.left) },
    { name: 'right', terms: round.right, total: knownTotal(round.right) },
  ];
  const known = sides.find((s) => s.total !== null);
  const other = sides.find((s) => s !== known && s.total === null);
  let first = 'Both sides must make the same total. Try a number and watch which way the scale tips.';
  if (known && other) {
    // When "?" stands alone, the known side's total would be the answer itself: ask for the sum instead.
    first =
      other.terms.length === 1
        ? `Add up the ${known.name} side: ${known.terms.join(' + ')}. The ${other.name} side must make the same.`
        : `The ${known.name} side makes ${known.total}. The ${other.name} side must make ${known.total} too.`;
  }
  return { key: `balance:${round.id}`, question: round.prompt, steps: steps(first, round.hint) };
}

export function fractionHints(round: FractionBuilderConfig['rounds'][number]): HintContext {
  const shape = round.shape === 'circle' ? 'circle' : 'bar';
  return {
    key: `fraction:${round.id}`,
    question: round.prompt,
    steps: steps(`In a fraction, the bottom number says how many equal pieces the whole ${shape} has. The top number says how many pieces to shade.`, round.hint),
  };
}

export function gridHints(task: GridExplorerConfig['tasks'][number]): HintContext {
  return {
    key: `grid:${task.id}`,
    question: task.prompt,
    steps: steps('Find yourself on the map first. North is the top of the map, South is the bottom, East is right and West is left.', task.hint),
  };
}

export function wordOrderHints(round: WordOrderConfig['rounds'][number]): HintContext {
  return {
    key: `words:${round.id}`,
    question: round.clue,
    steps: steps(`Look at the clue: ${round.clue} Who or what is the sentence about? A sentence starts with a capital letter.`, round.hint),
  };
}

export function numberLineHints(round: NumberLineConfig['rounds'][number]): HintContext {
  const f = (n: number) => formatValue(n, round.format);
  const first =
    round.mode === 'jump' && round.start !== undefined
      ? `You start at ${f(round.start)}. Read the task: do you jump forwards (to the right) or backwards (to the left)?`
      : `The line goes from ${f(round.from)} to ${f(round.to)}, and each mark is one step of ${f(round.step)}. Count the marks.`;
  return { key: `numberline:${round.id}`, question: round.prompt, steps: steps(first, round.hint) };
}

export function clockHints(round: ClockConfig['rounds'][number]): HintContext {
  return {
    key: `clock:${round.id}`,
    question: round.prompt,
    steps: steps('The short hand shows the hour. The long hand shows the minutes: each number on the clock is 5 minutes.', round.hint),
  };
}

export function barChartHints(round: BarChartConfig['rounds'][number]): HintContext {
  const first =
    round.mode === 'build'
      ? 'Read the table one row at a time. Make that bar reach its number on the scale, then move to the next one.'
      : 'Read the question again. Are you looking for the tallest bar, the shortest bar, or a bar with a certain number?';
  return { key: `barchart:${round.id}`, question: round.prompt, steps: steps(first, round.hint) };
}

export function circuitHints(round: CircuitConfig['rounds'][number]): HintContext {
  const first =
    round.goal === 'light-bulb'
      ? 'Electricity needs a full loop: from the cell, through the bulb and back to the cell, with no gaps.'
      : 'Put each object in the gap, close the switch, and watch the bulb.';
  return { key: `circuit:${round.id}`, question: round.prompt, steps: steps(first, round.hint) };
}

const MAGNET_FIRST: Record<MagnetRound['kind'], string> = {
  test: 'Start with one object: drag it to the magnet, or tap it. Then try the next one until you have tested them all.',
  sort: 'Think back to your tests. Which objects did the magnet pull? What are they made of?',
  poles: 'Look at the two ends that face each other. Are they the same pole or different poles?',
};

export function magnetHints(round: MagnetRound): HintContext {
  const first =
    round.kind === 'poles' && round.goal === 'identify'
      ? 'Push the magnets together and watch: do they pull together or push apart?'
      : round.kind === 'poles' && round.goal === 'explore'
        ? 'Push them together, then turn one magnet around and push again. What changes?'
        : MAGNET_FIRST[round.kind];
  return { key: `magnet:${round.id}`, question: round.prompt, steps: steps(first, round.hint) };
}

export function frictionHints(config: FrictionExperimentConfig, at: { challenge?: FrictionChallenge; check: boolean }): HintContext {
  if (at.check && config.check) {
    return {
      key: 'friction:check',
      question: config.check.prompt,
      steps: steps('Think back to your tests. Where did the car roll furthest, and where did it stop soonest?', config.check.hint),
    };
  }
  const c = at.challenge;
  if (c) {
    const can = c.surfaceId ? 'You can change only the push.' : c.height ? 'You can change only the surface.' : 'You can change the surface and the push.';
    return { key: `friction:${c.id}`, question: c.prompt, steps: steps(`The goal is the ${BAND_TITLES[c.target]} zone. ${can}`, c.hint) };
  }
  return {
    key: 'friction:explore',
    question: 'Test different surfaces and predict how far the toy car rolls.',
    steps: steps(
      'Pick a surface you have not tested yet. Guess how far the car will roll, then press Start and see.',
      'Smooth surfaces rub less, so the car rolls further. Rough, bumpy surfaces rub more and stop it sooner.',
    ),
  };
}

export function matchHints(config: ConceptMatchConfig, activeLeftId: string | null, matchedIds: string[]): HintContext | null {
  const open = config.pairs.filter((p) => !matchedIds.includes(p.id));
  if (open.length === 0) return null;
  const pair = open.find((p) => p.id === activeLeftId);
  if (pair) {
    return { key: `match:${pair.id}`, question: `${config.prompt} (${pair.left})`, steps: steps(`Read “${pair.left}” again. Which card on the right goes with it?`, pair.hint) };
  }
  const first = open[0];
  return {
    key: 'match:any',
    question: config.prompt,
    steps: steps(`Pick one card in “${config.leftLabel}” first, then look for its partner in “${config.rightLabel}”.`, `Start with “${first.left}”: ${first.hint}`),
  };
}

export function sortHints(config: SortGameConfig, itemId: string | null): HintContext | null {
  const item = config.items.find((i) => i.id === itemId);
  if (!item) return null;
  return {
    key: `sort:${item.id}`,
    question: `${config.prompt} (${item.label})`,
    steps: steps(
      `Think about what “${item.label}” is, or what it is made of. Then read the names of the boxes.`,
      `What each box means: ${config.bins.map((b) => `“${b.label}”: ${b.description}`).join(' ')}`,
    ),
  };
}

export function pushBoxHints(config: PushBoxConfig, floorId: string | null): HintContext {
  const floor = config.floors.find((f) => f.id === floorId);
  return {
    key: `pushbox:${floor?.id ?? 'choose'}`,
    question: floor ? `Move the box on the ${floor.name.toLowerCase()} floor.` : 'Move the box on every floor.',
    steps: steps(
      'Friction pushes back against your push. The box moves only when your push is stronger than the friction.',
      floor ? `${floor.name}: ${floor.description} A floor that grips more needs a bigger push.` : 'Rough floors grip the box more, so they need a bigger push than smooth ones.',
    ),
  };
}
