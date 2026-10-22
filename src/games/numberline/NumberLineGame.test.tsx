import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { NumberLineConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import NumberLineGame from './NumberLineGame';
import { MINUS, tickX, VIEW_W } from './numberLineLogic';

const config: NumberLineConfig = {
  type: 'number-line',
  rounds: [
    { id: 'seven', from: 0, to: 10, step: 1, mode: 'place', target: 7, prompt: 'Put 7 on the number line.', hint: '7 is 3 less than 10.', explanation: '7 is three steps before 10.' },
    { id: 'add', from: 0, to: 10, step: 1, mode: 'jump', start: 3, target: 7, prompt: 'Start at 3 and jump 4 forward.', hint: 'Count 4 jumps from 3: 4, 5, 6, 7.', explanation: '3 + 4 = 7.' },
    { id: 'back', from: -5, to: 5, step: 1, mode: 'jump', start: 2, target: -1, prompt: 'Start at 2 and jump 3 back.', hint: 'Count back 3 from 2: 1, 0, then one more.', explanation: '2 take away 3 is -1.' },
    {
      id: 'tenths',
      from: 0,
      to: 1,
      step: 0.1,
      format: { kind: 'decimal', places: 1 },
      mode: 'place',
      target: 0.7,
      prompt: 'Put 0.7 on the number line.',
      hint: '0.7 is 7 tenths.',
      explanation: '0.7 is 7 steps of 0.1.',
    },
  ],
};
/** Tick index of each round's answer. */
const ANSWERS = [7, 7, 4, 7];

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <NumberLineGame config={config} topicId="number-line-test" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  const tick = (index: number) => view.container.querySelector<SVGRectElement>(`[data-tick="${index}"]`)!;
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount, tick };
}

const line = () => screen.getByRole('slider');
const readout = () => screen.getByText(/^You chose:/);
const checkButton = () => screen.getByRole('button', { name: /^check$/i });
const nextButton = () => screen.getByRole('button', { name: /^(next|finish)$/i });
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);
const jumpArc = (container: HTMLElement) => container.querySelector('[data-jump-arc]');
const marker = (container: HTMLElement) => container.querySelector<SVGGElement>('[data-marker]')!;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Number line (played through the UI)', () => {
  it('shows one task: the line, what is chosen, and a Check button that says why it waits', async () => {
    const { user, onEvent, tick, container } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: 'Round 1 of 4: Put 7 on the number line.' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(4);
    expect(line()).toHaveAccessibleName('Number line from 0 to 10');
    expect(line()).toHaveAttribute('aria-valuemin', '0');
    expect(line()).toHaveAttribute('aria-valuemax', '10');
    expect(line()).toHaveAttribute('aria-valuetext', 'No point chosen yet');
    expect([...container.querySelectorAll('svg text')].map((t) => t.textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(readout()).toHaveTextContent('You chose: ?');
    expect(marker(container)).toBeNull();

    // Check does nothing until a point is chosen, but says why.
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkButton());
    expect(screen.getByText('Tap a point first.')).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start']);

    // Tap a mark: the pin and the readout follow.
    await user.click(tick(9));
    expect(readout()).toHaveTextContent('You chose: 9');
    expect(line()).toHaveAttribute('aria-valuenow', '9');
    expect(line()).toHaveAttribute('aria-valuetext', '9');
    expect(marker(container)).not.toBeNull();
    expect(screen.queryByText('Tap a point first.')).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');
  });

  it('after a wrong check gives a nudge, then the round hint, without giving the answer away', async () => {
    const { user, onEvent, tick } = setup();
    const [first] = config.rounds;

    await user.click(tick(9));
    await user.click(checkButton());
    const nudge = 'Too far right. Move left.';
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: nudge } });

    // The nudge was about the checked point, so it goes when the marker moves.
    await user.click(tick(5));
    expect(screen.queryByText(nudge)).not.toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(first.hint)).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: first.hint } });

    // The round hint stays put wherever the marker goes, even onto the answer.
    await user.click(tick(8));
    expect(screen.getByText(first.hint)).toBeInTheDocument();
    await user.click(tick(7));
    expect(screen.getByText(first.hint)).toBeInTheDocument();

    await user.click(checkButton());
    expect(screen.getByText(first.explanation)).toBeInTheDocument();
    expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    expect(screen.getByText('Round 1 done')).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: first.explanation } });

    // The line is locked once the round is right.
    expect(line()).toHaveAttribute('aria-disabled', 'true');
    await user.click(tick(3));
    expect(readout()).toHaveTextContent('You chose: 7');
  });

  it('plays with the keyboard: arrow keys, Home and End move the marker, Enter checks', async () => {
    const { user, onEvent } = setup();

    await user.tab();
    expect(line()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Tap a point first.')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(line()).toHaveAttribute('aria-valuetext', '0');
    await user.keyboard('{End}');
    expect(line()).toHaveAttribute('aria-valuetext', '10');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(readout()).toHaveTextContent('You chose: 8');
    await user.keyboard('{Enter}');
    expect(screen.getByText('Too far right. Move left.')).toBeInTheDocument();
    await user.keyboard('{Home}');
    expect(line()).toHaveAttribute('aria-valuenow', '0');
    await user.keyboard('{End}{ArrowLeft}{ArrowLeft}{ArrowLeft}{Enter}');
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();

    // Jump round: the arrows start from the flag.
    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: 'Round 2 of 4: Start at 3 and jump 4 forward.' })).toHaveFocus();
    await user.tab();
    expect(line()).toHaveFocus();
    expect(line()).toHaveAttribute('aria-valuetext', 'No jump yet. Start at 3');
    await user.keyboard('{ArrowRight}');
    expect(line()).toHaveAttribute('aria-valuetext', '4, a jump of +1 from 3');
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{Enter}');
    expect(screen.getByText(config.rounds[1].explanation)).toBeInTheDocument();
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(2);
  });

  it('draws the jump from the start flag as an arc labelled with its size', async () => {
    const { user, tick, container } = setup();
    await user.click(tick(7));
    await user.click(checkButton());
    await user.click(nextButton());

    // Round 2: start at 3 and jump 4 forward.
    expect(container.querySelector('[data-start-flag]')).not.toBeNull();
    expect(jumpArc(container)).toBeNull();
    expect(line()).toHaveAccessibleName('Number line from 0 to 10. The jump starts at 3');

    await user.click(checkButton());
    expect(screen.getByText('Tap where the jump lands first.')).toBeInTheDocument();

    await user.click(tick(9));
    expect(jumpArc(container)).toHaveTextContent('+6');
    await user.click(checkButton());
    expect(screen.getByText('You jumped too far.')).toBeInTheDocument();

    await user.click(tick(1));
    expect(jumpArc(container)).toHaveTextContent(`${MINUS}2`);
    expect(line()).toHaveAttribute('aria-valuetext', `1, a jump of ${MINUS}2 from 3`);

    // Back on the start there is no jump to draw.
    await user.click(tick(3));
    expect(jumpArc(container)).toBeNull();
    expect(line()).toHaveAttribute('aria-valuetext', '3, the start');

    await user.click(tick(7));
    expect(jumpArc(container)).toHaveTextContent('+4');
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[1].explanation)).toBeInTheDocument();

    // Round 3: start at 2 and jump 3 back, on a line with negative numbers.
    await user.click(nextButton());
    expect([...container.querySelectorAll('svg text')].map((t) => t.textContent)).toContain(`${MINUS}5`);
    await user.click(tick(9)); // 4
    await user.click(checkButton());
    expect(screen.getByText('Wrong way. Jump back.')).toBeInTheDocument();
    await user.click(tick(4)); // -1
    expect(jumpArc(container)).toHaveTextContent(`${MINUS}3`);
    expect(readout()).toHaveTextContent(`You chose: ${MINUS}1`);
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[2].explanation)).toBeInTheDocument();
  });

  it('reports completion exactly once, with the rounds behind a toggle', async () => {
    const { user, tick, onEvent, onComplete, onRestart } = setup();

    // Round 1: one wrong check first.
    await user.click(tick(2));
    await user.click(checkButton());
    expect(screen.getByText('Too far left. Move right.')).toBeInTheDocument();
    for (const [i, answer] of ANSWERS.entries()) {
      await user.click(tick(answer));
      await user.click(checkButton());
      expect(screen.getByText(config.rounds[i].explanation)).toBeInTheDocument();
      if (i < ANSWERS.length - 1) await user.click(nextButton());
    }
    expect(readout()).toHaveTextContent('You chose: 0.7');
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^finish$/i }));
    expect(screen.getByRole('heading', { name: 'Every point found!' })).toHaveFocus();
    expect(screen.getByText('3 of 4 right on the first try.')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'number-line', completed: true, total: 4, correct: 3, mistakes: 1, perfect: false, score: 0.75 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(eventKeys(onEvent)).not.toContain('complete:perfect');
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(4);
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(1);

    // The per-round list is closed until asked for.
    expect(screen.queryByRole('list', { name: 'Your rounds' })).not.toBeInTheDocument();
    const rounds = screen.getByRole('button', { name: /your rounds/i });
    expect(rounds).toHaveAttribute('aria-expanded', 'false');
    await user.click(rounds);
    expect(rounds).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('list', { name: 'Your rounds' })).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByText(/first try|tries/i).textContent)).toEqual(['2 tries', 'First try', 'First try', 'First try']);
    expect(items[2]).toHaveTextContent(`Answer: ${MINUS}1.`);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports a perfect run with the complete:perfect coach event', async () => {
    const { user, tick, onEvent, onComplete } = setup();
    for (const answer of ANSWERS) {
      await user.click(tick(answer));
      await user.click(checkButton());
      await user.click(nextButton());
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: true, score: 1, mistakes: 0 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(screen.getByText('4 of 4 right on the first try. Perfect!')).toBeInTheDocument();
  });

  it('moves without animation when reduced motion is on', async () => {
    const still = setup();
    await still.user.click(still.tick(9));
    expect(marker(still.container).style.transition).toBe('none');
    await still.user.click(checkButton());
    expect(still.container.querySelector('[class*="animate-"]')).toBeNull();
    still.unmount();

    const moving = setup({ reducedMotion: false });
    await moving.user.click(moving.tick(9));
    expect(marker(moving.container).style.transition).toContain('transform');
    await moving.user.click(checkButton());
    expect(moving.container.querySelector('.animate-shake')).not.toBeNull();
  });
});

describe.each(['touch', 'mouse'] as const)('Number line with a %s', (pointerType) => {
  const at = (index: number) => tickX(config.rounds[0], index);
  const mockRect = () => {
    // The line is drawn exactly VIEW_W pixels wide, so client x equals the drawing's x.
    vi.spyOn(line(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: VIEW_W, height: 92, right: VIEW_W, bottom: 92, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  };

  it('drags the marker along the line, snapping to the nearest mark', async () => {
    const { user, container } = setup();
    mockRect();

    fireEvent.pointerDown(line(), { pointerType, pointerId: 7, button: 0, buttons: 1, clientX: at(2), clientY: 40 });
    // A mouse press chooses at once; a finger waits to see whether it is a tap, a drag or a scroll.
    expect(readout()).toHaveTextContent(pointerType === 'mouse' ? 'You chose: 2' : 'You chose: ?');
    fireEvent.pointerMove(line(), { pointerType, pointerId: 7, buttons: 1, clientX: at(5) + 4, clientY: 44 });
    expect(readout()).toHaveTextContent('You chose: 5');
    // While dragging, the pin follows the pointer without easing.
    expect(marker(container).style.transition).toBe('none');
    fireEvent.pointerMove(line(), { pointerType, pointerId: 7, buttons: 1, clientX: at(7) - 6, clientY: 44 });
    expect(line()).toHaveAttribute('aria-valuenow', '7');
    fireEvent.pointerUp(line(), { pointerType, pointerId: 7, clientX: at(7) - 6, clientY: 44 });
    expect(readout()).toHaveTextContent('You chose: 7');

    await user.click(checkButton());
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();
  });

  it('chooses a mark with a tap, and keeps the line still for a page scroll', () => {
    setup();
    mockRect();

    fireEvent.pointerDown(line(), { pointerType, pointerId: 8, button: 0, buttons: 1, clientX: at(4), clientY: 40 });
    fireEvent.pointerUp(line(), { pointerType, pointerId: 8, clientX: at(4), clientY: 40 });
    expect(readout()).toHaveTextContent('You chose: 4');

    // The browser takes over a vertical swipe and cancels the pointer: a finger never moves the marker.
    fireEvent.pointerDown(line(), { pointerType, pointerId: 9, button: 0, buttons: 1, clientX: at(8), clientY: 40 });
    fireEvent.pointerCancel(line(), { pointerType, pointerId: 9, clientX: at(8), clientY: 90 });
    expect(readout()).toHaveTextContent(pointerType === 'mouse' ? 'You chose: 8' : 'You chose: 4');
  });
});
