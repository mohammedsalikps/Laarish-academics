import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import BarChartBuilder from './BarChartBuilder';
import type { BarRound } from './barChartLogic';
import { barChartTestConfig as config } from './barChartTestConfig';

const TOPIC = 'bar-charts';
const [fruit, weather, pets, visitors] = config.rounds;

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <BarChartBuilder config={config} topicId={TOPIC} attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount };
}

type User = ReturnType<typeof userEvent.setup>;

const slider = (label: string) => screen.getByRole('slider', { name: `${label} bar` });
const add = (label: string) => screen.getByRole('button', { name: `Add 2 to ${label}` });
const take = (label: string) => screen.getByRole('button', { name: `Take 2 from ${label}` });
const bar = (label: string) => within(screen.getByRole('group', { name: 'Bars' })).getByRole('button', { name: new RegExp(`^${label}: `) });
const readout = () => screen.getByRole('status');
const checkButton = () => screen.getByRole('button', { name: /^check$/i });
const nextButton = () => screen.getByRole('button', { name: /^(next|finish)$/i });
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);
const label = (round: BarRound, id: string) => round.categories.find((c) => c.id === id)!.label;

/** Plays a round right: + up to every table value (build), or tap the answer (read); then Check. */
async function solve(user: User, round: BarRound) {
  if (round.mode === 'build') {
    for (const [i, c] of round.categories.entries()) {
      for (let k = 0; k < round.values[i] / config.step; k++) await user.click(add(c.label));
    }
  } else {
    await user.click(bar(label(round, round.answerId!)));
  }
  await user.click(checkButton());
  expect(screen.getByText(round.explanation)).toBeInTheDocument();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Bar Chart Builder (played through the UI)', () => {
  it('shows one build task: the table, empty bars on a labelled scale, and Check', async () => {
    const { user, onEvent } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: `Round 1 of 4: ${fruit.prompt}` })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(4);
    expect(within(screen.getByRole('list', { name: 'Table' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Mango 6', 'Apple 4', 'Banana 2']);
    expect(screen.getByRole('img', { name: 'Bar chart. The scale goes from 0 to 10 in steps of 2.' })).toBeInTheDocument();

    const sliders = screen.getAllByRole('slider');
    expect(sliders.map((s) => s.getAttribute('aria-label'))).toEqual(['Mango bar', 'Apple bar', 'Banana bar']);
    for (const s of sliders) {
      expect(s).toHaveAttribute('aria-valuenow', '0');
      expect(s).toHaveAttribute('aria-valuemin', '0');
      expect(s).toHaveAttribute('aria-valuemax', '10');
      expect(s).toHaveAttribute('aria-valuetext', '0');
    }
    expect(readout()).toHaveTextContent('Drag a bar up, or tap + and −.');
    expect(screen.queryByText(fruit.hint)).not.toBeInTheDocument();

    // Check does nothing until a bar has moved, but says why.
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkButton());
    expect(screen.getByText('Move a bar first: drag it up, or tap +.')).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start']);
  });

  it('moves a bar one step at a time with − and +, and with the keyboard', async () => {
    const { user } = setup();

    await user.click(add('Mango'));
    expect(slider('Mango')).toHaveAttribute('aria-valuenow', '2');
    expect(readout()).toHaveTextContent('Mango: 2');
    expect(screen.queryByText('Move a bar first: drag it up, or tap +.')).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');

    await user.click(add('Mango'));
    await user.click(take('Mango'));
    expect(slider('Mango')).toHaveAttribute('aria-valuenow', '2');
    await user.click(take('Mango'));
    expect(slider('Mango')).toHaveAttribute('aria-valuenow', '0');
    // At the bottom of the scale − stays focusable but does nothing.
    expect(take('Mango')).toHaveAttribute('aria-disabled', 'true');
    expect(take('Mango')).toHaveFocus();
    await user.click(take('Mango'));
    expect(slider('Mango')).toHaveAttribute('aria-valuenow', '0');

    // Keyboard: Up/Down (and Right/Left) by one step, Home and End to the ends of the scale.
    await user.click(slider('Apple'));
    expect(slider('Apple')).toHaveFocus();
    expect(readout()).toHaveTextContent('Apple: 0');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(slider('Apple')).toHaveAttribute('aria-valuenow', '4');
    expect(slider('Apple')).toHaveAttribute('aria-valuetext', '4');
    expect(readout()).toHaveTextContent('Apple: 4');
    await user.keyboard('{ArrowDown}');
    expect(slider('Apple')).toHaveAttribute('aria-valuenow', '2');
    await user.keyboard('{End}');
    expect(slider('Apple')).toHaveAttribute('aria-valuenow', '10');
    expect(add('Apple')).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{ArrowUp}');
    expect(slider('Apple')).toHaveAttribute('aria-valuenow', '10');
    await user.keyboard('{Home}{ArrowRight}{ArrowRight}{ArrowLeft}');
    expect(slider('Apple')).toHaveAttribute('aria-valuenow', '2');

    // Tab moves on to the next bar.
    await user.tab();
    expect(slider('Banana')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(slider('Banana')).toHaveAttribute('aria-valuenow', '2');
  });

  describe.each(['touch', 'mouse'] as const)('with a %s', (pointerType) => {
    it('drags the top of a bar, snapping to the scale', async () => {
      const { user } = setup();
      const mango = slider('Mango');
      // The column spans the plot: y = 0 is the top of the scale (10), y = 200 the baseline (0).
      vi.spyOn(mango, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 50, bottom: 200, width: 50, height: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);

      fireEvent.pointerDown(mango, { pointerType, pointerId: 7, button: 0, buttons: 1, clientX: 25, clientY: 126 });
      expect(mango).toHaveAttribute('aria-valuenow', '4'); // 3.7 snaps to 4
      expect(readout()).toHaveTextContent('Mango: 4');
      fireEvent.pointerMove(mango, { pointerType, pointerId: 7, buttons: 1, clientX: 25, clientY: 80 });
      expect(mango).toHaveAttribute('aria-valuenow', '6');
      fireEvent.pointerMove(mango, { pointerType, pointerId: 7, buttons: 1, clientX: 25, clientY: -60 });
      expect(mango).toHaveAttribute('aria-valuenow', '10'); // above the chart: the top of the scale
      fireEvent.pointerMove(mango, { pointerType, pointerId: 8, buttons: 1, clientX: 25, clientY: 200 });
      expect(mango).toHaveAttribute('aria-valuenow', '10'); // another finger does not move it
      fireEvent.pointerMove(mango, { pointerType, pointerId: 7, buttons: 1, clientX: 25, clientY: 84 });
      expect(mango).toHaveAttribute('aria-valuenow', '6');
      fireEvent.pointerUp(mango, { pointerType, pointerId: 7, clientX: 25, clientY: 84 });
      fireEvent.pointerMove(mango, { pointerType, pointerId: 7, buttons: 0, clientX: 25, clientY: 0 });
      expect(mango).toHaveAttribute('aria-valuenow', '6'); // released: moving on does nothing

      await user.click(add('Apple'));
      await user.click(add('Apple'));
      await user.click(add('Banana'));
      await user.click(checkButton());
      expect(screen.getByText(fruit.explanation)).toBeInTheDocument();
      expect(mango).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('build: a wrong check names the first wrong bar, then gives the round hint', async () => {
    const { user, onEvent } = setup();
    for (let k = 0; k < 3; k++) await user.click(add('Mango'));
    await user.click(add('Apple'));
    await user.click(checkButton());
    const nudge = 'The bar for Apple is 2, but the table says 4.';
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(screen.queryByText(fruit.hint)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: nudge } });

    // The nudge was about the checked chart, so it goes when a bar moves.
    await user.click(add('Apple'));
    expect(screen.queryByText(nudge)).not.toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(fruit.hint)).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: fruit.hint } });

    // The round hint stays while the child keeps trying.
    await user.click(add('Banana'));
    expect(screen.getByText(fruit.hint)).toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(fruit.explanation)).toBeInTheDocument();
    expect(screen.queryByText(fruit.hint)).not.toBeInTheDocument();
    expect(screen.getByText('Round 1 done')).toBeInTheDocument();
    expect(slider('Mango')).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: fruit.explanation } });
  });

  it('read: tap a bar to choose it; a wrong check nudges, then hints', async () => {
    const { user, onEvent } = setup();
    await solve(user, fruit);
    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: `Round 2 of 4: ${weather.prompt}` })).toHaveFocus();

    // The chart is drawn from the data; no table and no sliders in a read round.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Table' })).not.toBeInTheDocument();
    const bars = within(screen.getByRole('group', { name: 'Bars' })).getAllByRole('button');
    expect(bars.map((b) => b.getAttribute('aria-label'))).toEqual(['Rain: 8', 'Sun: 4', 'Wind: 2']);
    expect(bars.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(readout()).toHaveTextContent('Tap a bar to choose it.');

    await user.click(checkButton());
    expect(screen.getByText('Tap a bar first.')).toBeInTheDocument();

    await user.click(bar('Wind'));
    expect(bar('Wind')).toHaveAttribute('aria-pressed', 'true');
    expect(readout()).toHaveTextContent('Wind: 2');
    await user.click(bar('Sun'));
    expect(bar('Sun')).toHaveAttribute('aria-pressed', 'true');
    expect(bar('Wind')).toHaveAttribute('aria-pressed', 'false');
    expect(readout()).toHaveTextContent('Sun: 4');

    await user.click(checkButton());
    const nudge = 'The bar for Sun reaches 4. Look again: which bar is the tallest?';
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: nudge } });

    await user.click(bar('Wind'));
    expect(screen.queryByText(nudge)).not.toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(weather.hint)).toBeInTheDocument();

    await user.click(bar('Rain'));
    expect(screen.getByText(weather.hint)).toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(weather.explanation)).toBeInTheDocument();
    expect(bar('Rain')).toBeDisabled();
    expect(bar('Rain')).toHaveAttribute('aria-pressed', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: weather.explanation } });
  });

  it('plays every round, completes once, and keeps the round list behind a toggle', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();

    // Round 1 (build): one wrong check.
    await user.click(add('Mango'));
    await user.click(checkButton());
    expect(screen.getByText('The bar for Mango is 2, but the table says 6.')).toBeInTheDocument();
    await user.click(take('Mango'));
    await solve(user, fruit);
    // Three bars: − and + side by side.
    expect(add('Mango').parentElement).toHaveClass('flex-row');
    await user.click(nextButton());

    // Round 2 (read): first try.
    await solve(user, weather);
    await user.click(nextButton());

    // Round 3 (build, six bars): − sits under +, so six columns fit a phone. Fish stays at 0.
    expect(screen.getAllByRole('slider')).toHaveLength(6);
    expect(add('Cats').parentElement).toHaveClass('flex-col-reverse');
    await solve(user, pets);
    expect(slider('Fish')).toHaveAttribute('aria-valuenow', '0');
    await user.click(nextButton());

    // Round 4 (read, about a value): the neutral nudge, then right.
    await user.click(bar('Wednesday'));
    await user.click(checkButton());
    expect(screen.getByText('The bar for Wednesday reaches 10. Compare the bar heights carefully.')).toBeInTheDocument();
    await solve(user, visitors);
    expect(screen.getByRole('button', { name: /^finish$/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: /every chart is done/i })).toHaveFocus();
    expect(screen.getByText(/2 of 4 right on the first try\./i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'bar-chart', completed: true, total: 4, correct: 2, mistakes: 2, perfect: false, score: 0.5 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(4);
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(2);

    // The per-round list is closed until asked for.
    expect(screen.queryByRole('list', { name: 'Your rounds' })).not.toBeInTheDocument();
    const rounds = screen.getByRole('button', { name: /your rounds/i });
    expect(rounds).toHaveAttribute('aria-expanded', 'false');
    await user.click(rounds);
    expect(rounds).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('list', { name: 'Your rounds' })).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByText(/first try|tries/i).textContent)).toEqual(['2 tries', 'First try', 'First try', '2 tries']);
    expect(items[0]).toHaveTextContent(`Round 1: Build${fruit.prompt}`);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports a perfect run with the complete:perfect coach event', async () => {
    const { user, onEvent, onComplete } = setup();
    for (const round of config.rounds) {
      await solve(user, round);
      await user.click(nextButton());
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'bar-chart', completed: true, perfect: true, score: 1, correct: 4, mistakes: 0 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(eventKeys(onEvent).filter((k) => k.startsWith('complete'))).toHaveLength(1);
    expect(screen.getByText(/4 of 4 right on the first try. Perfect!/i)).toBeInTheDocument();
  });

  it('moves bars and pops the live value only when motion is allowed', async () => {
    const firstBar = (container: HTMLElement) => container.querySelector<SVGRectElement>('[data-bar="0"]')!;

    const still = setup();
    await still.user.click(add('Mango'));
    expect(firstBar(still.container).style.transform).toMatch(/translateY\(/);
    expect(firstBar(still.container).style.transition).toBe('none');
    expect(still.container.querySelector('.animate-pop-in')).toBeNull();
    expect(still.container.querySelector('.animate-pulse')).toBeNull();
    still.unmount();

    const moving = setup({ reducedMotion: false });
    expect(moving.container.querySelector('.animate-pulse')).not.toBeNull(); // the first handle invites a drag
    await moving.user.click(add('Mango'));
    expect(firstBar(moving.container).style.transition).toContain('transform');
    expect(moving.container.querySelector('.animate-pop-in')).toHaveTextContent('2');
    expect(moving.container.querySelector('.animate-pulse')).toBeNull();
  });
});
