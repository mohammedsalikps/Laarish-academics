import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../shared/curriculum';
import type { BalanceGameConfig, BarChartConfig, CircuitConfig, FrictionExperimentConfig, MagnetLabConfig, NumberLineConfig, WordOrderConfig } from '../domain/types';
import { MemoryProgressRepository } from '../state/persistence';
import { ProgressProvider } from '../state/ProgressProvider';
import { learnerState } from '../test/fixtures';
import { CUE_RING, firstMoveCue, PULSE_ONCE, RAISED } from './affordance';
import BalanceScale from './balance/BalanceScale';
import BarChartBuilder from './barchart/BarChartBuilder';
import CircuitLab from './circuit/CircuitLab';
import FrictionExperiment from './friction/FrictionExperiment';
import MagnetLab from './magnet/MagnetLab';
import NumberLineGame from './numberline/NumberLineGame';
import WordOrder from './words/WordOrder';

/**
 * Game upgrade (Nov 2026): every tappable or draggable thing looks raised, the first move is shown by a
 * cue that pulses once (a still ring with reduced motion), and only one instruction line shows at a time.
 */

const game = <C,>(id: string) => getTopic(id)!.play.game as C;
const props = (reducedMotion: boolean) => ({ topicId: 't', attempt: 0, reducedMotion, onEvent: vi.fn(), onComplete: vi.fn(), onRestart: vi.fn() });
function play(ui: ReactElement) {
  render(<ProgressProvider repository={new MemoryProgressRepository(learnerState({ grade: 6 }))}>{ui}</ProgressProvider>);
  return userEvent.setup();
}
const cues = () => document.querySelectorAll('[data-cue="first-move"]');

describe('the shared first-move cue', () => {
  it('pulses once when motion is allowed, shows a still ring with reduced motion, and is absent once the child has started', () => {
    expect(PULSE_ONCE).toMatch(/_1\]$/);
    expect(firstMoveCue(true, false)).toContain(PULSE_ONCE);
    expect(firstMoveCue(true, true)).toBe(CUE_RING);
    expect(firstMoveCue(true, true)).not.toMatch(/animate/);
    expect(firstMoveCue(false, false)).toBe('');
  });
});

describe('Sentence Builder', () => {
  const config = game<WordOrderConfig>('sentences-word-order');
  const instructions = () => document.querySelectorAll('[data-instruction]');
  const addWord = (w: string) => within(screen.getByRole('list', { name: /word tiles to use/i })).getByRole('button', { name: `Add "${w}" to the sentence` });

  it('shows one short instruction at a time, from "start here" to "press Check"', async () => {
    const user = play(<WordOrder config={config} {...props(true)} />);
    expect(instructions()).toHaveLength(1);
    expect(instructions()[0]).toHaveTextContent('Start here: tap or drag the first word');
    await user.click(addWord('The'));
    expect(instructions()).toHaveLength(1);
    expect(instructions()[0]).toHaveTextContent('Tap a placed word to send it back');
    expect(screen.queryByText(/start here/i)).toBeNull();
    for (const w of config.rounds[0].words.slice(1)) await user.click(addWord(w));
    for (const w of config.rounds[0].distractors ?? []) await user.click(addWord(w));
    expect(instructions()).toHaveLength(1);
    expect(instructions()[0]).toHaveTextContent('All tiles used. Press Check!');
  });

  it('gives the word tiles a raised edge and a still first-move ring with reduced motion', () => {
    play(<WordOrder config={config} {...props(true)} />);
    expect(addWord('The').className).toContain(RAISED);
    expect(cues()).toHaveLength(1);
    expect(cues()[0].className).toContain(CUE_RING);
    expect(cues()[0].className).not.toMatch(/animate-/);
  });
});

describe('Balance puzzle', () => {
  it('pulses the numbers once before the first try, then the cue goes', async () => {
    const config = game<BalanceGameConfig>('adding-number-bonds');
    const user = play(<BalanceScale config={config} {...props(false)} />);
    const group = screen.getByRole('group', { name: /numbers to try/i });
    expect(group).toHaveAttribute('data-cue', 'first-move');
    expect(group.className).toContain(PULSE_ONCE);
    const choices = within(group).getAllByRole('button');
    expect(choices[0].className).toContain(RAISED);
    await user.click(choices[0]);
    expect(cues()).toHaveLength(0);
  });
});

describe('Number line', () => {
  it('glows the line once before the first point is chosen (still with reduced motion), and raises the step buttons', async () => {
    const config = game<NumberLineConfig>('m1-before-and-after');
    const user = play(<NumberLineGame config={config} {...props(true)} />);
    expect(cues()).toHaveLength(1);
    expect(cues()[0].getAttribute('class')).not.toMatch(/animate-/);
    const right = screen.getByRole('button', { name: 'One mark to the right' });
    expect(right.className).toContain(RAISED);
    screen.getByRole('slider').focus();
    await user.keyboard('{ArrowRight}');
    expect(cues()).toHaveLength(0);
  });

  it('pulses the glow only when motion is allowed', () => {
    play(<NumberLineGame config={game<NumberLineConfig>('m1-before-and-after')} {...props(false)} />);
    expect(cues()[0].getAttribute('class')).toMatch(/animate-\[pulse_.*_1\]/);
  });
});

describe('Bar chart (read rounds)', () => {
  it('pulses the bars once in the first read round, until one is chosen', async () => {
    const config = game<BarChartConfig>('m2-read-a-chart');
    const user = play(<BarChartBuilder config={config} {...props(false)} />);
    const bars = within(screen.getByRole('group', { name: 'Bars' })).getAllByRole('button');
    expect(bars.every((b) => b.getAttribute('data-cue') === 'first-move')).toBe(true);
    expect(bars[0].className).toContain(PULSE_ONCE);
    await user.click(bars[1]);
    expect(cues()).toHaveLength(0);
  });
});

describe('Circuit lab and Magnet explorer', () => {
  it('Circuit: the first object is raised and pulses once until something goes in the gap', async () => {
    const config = game<CircuitConfig>('s7-electricity-circuits');
    const user = play(<CircuitLab config={config} {...props(false)} />);
    const cards = within(screen.getByRole('group', { name: 'Objects' })).getAllByRole('button');
    expect(cards[0]).toHaveAttribute('data-cue', 'first-move');
    expect(cards[0].className).toContain(PULSE_ONCE);
    expect(cards[1].className).toContain(RAISED);
    expect(cues()).toHaveLength(1);
    await user.click(cards[1]);
    expect(cues()).toHaveLength(0);
  });

  it('Magnet: the first object card carries the cue (a still ring with reduced motion) until an object is tested', async () => {
    const config = game<MagnetLabConfig>('magnets-what-they-attract');
    const user = play(<MagnetLab config={config} {...props(true)} />);
    const cards = within(screen.getByRole('group', { name: 'Objects' })).getAllByRole('button');
    expect(cards[0]).toHaveAttribute('data-cue', 'first-move');
    expect(cards[0].className).toContain(CUE_RING);
    expect(cards[1].className).toContain(RAISED);
    await user.click(cards[0]);
    expect(cues()).toHaveLength(0);
  });
});

describe('Friction lab', () => {
  it('cues the surfaces first, then the predictions, then nothing', async () => {
    const config = game<FrictionExperimentConfig>('friction-rough-smooth');
    const user = play(<FrictionExperiment config={config} {...props(true)} />);
    const surfaces = screen.getByRole('radiogroup', { name: 'Surface' });
    expect(surfaces).toHaveAttribute('data-cue', 'first-move');
    expect(within(surfaces).getAllByRole('radio')[1].className).toContain(RAISED);
    await user.click(within(surfaces).getAllByRole('radio')[0]);
    expect(screen.getByRole('radiogroup', { name: 'Prediction' })).toHaveAttribute('data-cue', 'first-move');
    expect(cues()).toHaveLength(1);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Prediction' })).getAllByRole('radio')[0]);
    expect(cues()).toHaveLength(0);
  });
});
