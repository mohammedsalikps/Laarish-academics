import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ClockConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import ClockSetter from './ClockSetter';

const config: ClockConfig = {
  type: 'clock',
  minuteStep: 15,
  rounds: [
    { id: 'three', hour: 3, minute: 0, prompt: "Show 3 o'clock.", hint: "At 3 o'clock the long hand points at 12.", explanation: "The long hand is on 12 and the short hand is on 3: 3 o'clock." },
    { id: 'half-three', hour: 3, minute: 30, prompt: 'Show half past 3.', hint: 'Half past means the long hand has gone halfway round, to 6.', explanation: 'Half past 3: the long hand is on 6, the short hand halfway between 3 and 4.' },
    { id: 'quarter-to-nine', hour: 8, minute: 45, prompt: 'Show quarter to 9.', hint: 'Quarter to 9 is 15 minutes before 9 o’clock.', explanation: 'Quarter to 9: the long hand is on 9, the short hand nearly at 9.' },
  ],
};

function setup({ reducedMotion = true, game = config } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <ClockSetter config={game} topicId="telling-time" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount };
}

const slider = () => screen.getByRole('slider', { name: 'Minute hand' });
const readout = () => screen.getByRole('status');
const button = (name: string) => screen.getByRole('button', { name });
const checkButton = () => screen.getByRole('button', { name: /^check$/i });
const nextButton = () => screen.getByRole('button', { name: /^(next|finish)$/i });
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);
const shows = (time: string) => expect(slider()).toHaveAttribute('aria-valuetext', time);

/** Sets the time with the keyboard from 12:00: Up for each hour, Right for each quarter. */
const keysFor = (hour: number, minute: number) => '{ArrowUp}'.repeat(hour % 12) + '{ArrowRight}'.repeat(minute / config.minuteStep);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Clock Setter (played through the UI)', () => {
  it('shows one task: the clock at 12:00, its time in digits and words, step buttons and Check', async () => {
    const { user, onEvent } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: `Round 1 of 3: ${config.rounds[0].prompt}` })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Round 1, playing now')).toBeInTheDocument();
    shows('12:00');
    expect(slider()).toHaveAttribute('aria-valuenow', '0');
    expect(readout()).toHaveTextContent("12:00");
    expect(readout()).toHaveTextContent("12 o'clock");
    expect(screen.queryByText(config.rounds[0].hint)).not.toBeInTheDocument();

    // Check does nothing until the hands have moved, but says why.
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkButton());
    expect(screen.getByText('Move the clock hands first.')).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start']);

    // The step buttons move the minutes and the hour; the hour follows the minutes past 12.
    await user.click(button('+ 15 min'));
    shows('12:15');
    expect(readout()).toHaveTextContent('quarter past 12');
    expect(screen.queryByText('Move the clock hands first.')).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');
    await user.click(button('+ 1 hour'));
    shows('1:15');
    await user.click(button('− 15 min'));
    shows('1:00');
    await user.click(button('− 1 hour'));
    shows('12:00');
    await user.click(button('− 15 min'));
    shows('11:45');
    expect(slider()).toHaveAttribute('aria-valuenow', String(11 * 60 + 45));
    expect(readout()).toHaveTextContent('quarter to 12');
    await user.click(button('+ 15 min'));
    await user.click(button('+ 15 min'));
    expect(readout()).toHaveTextContent('12:15');
  });

  it('works from the keyboard: arrows move the hands and Enter checks', async () => {
    const { user, onEvent } = setup();
    await user.tab();
    expect(slider()).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    shows('3:00');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    shows('3:30');
    await user.keyboard('{ArrowLeft}');
    shows('3:15');
    await user.keyboard('{ArrowDown}');
    shows('2:15');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    shows('1:45');
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowUp}');
    shows('3:30');

    // Enter checks (3:30 is wrong for 3 o'clock), then Enter on the right time moves on.
    await user.keyboard('{Enter}');
    expect(screen.getByText('Look at the long hand: it should point at 12 for o\'clock.')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}{ArrowLeft}{Enter}');
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start', 'round-incorrect', 'round-correct']);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: `Round 2 of 3: ${config.rounds[1].prompt}` })).toHaveFocus();
    shows('12:00');
  });

  it('after a wrong check gives a nudge from the numbers first, then the round hint', async () => {
    const { user, onEvent } = setup();
    const [three] = config.rounds;

    for (let i = 0; i < 5; i++) await user.click(button('+ 1 hour'));
    await user.click(checkButton());
    const nudge = 'The long hand is right, but the short hand should point at 3.';
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(screen.queryByText(three.hint)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: nudge } });

    // The nudge was about the checked time, so it goes when the hands move.
    await user.click(button('− 1 hour'));
    expect(screen.queryByText(nudge)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');

    // Second wrong check: the round's own hint, which stays while the child tries again.
    await user.click(checkButton());
    expect(screen.getByText(three.hint)).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: three.hint } });
    await user.click(button('+ 15 min'));
    expect(screen.getByText(three.hint)).toBeInTheDocument();

    await user.click(button('− 15 min'));
    await user.click(button('− 1 hour'));
    await user.click(checkButton());
    expect(screen.getByText(three.explanation)).toBeInTheDocument();
    expect(screen.queryByText(three.hint)).not.toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: three.explanation } });
    expect(screen.getByText('Round 1 done')).toBeInTheDocument();
    // The clock is locked until Next.
    expect(slider()).toHaveAttribute('aria-disabled', 'true');
    expect(button('+ 15 min')).toBeDisabled();
    expect(button('+ 1 hour')).toBeDisabled();
    expect(nextButton()).toHaveTextContent('Next');
  });

  it('plays every round, completes once, and keeps the round list behind a toggle', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();

    // Round 1 (3 o'clock): one wrong check, then fixed.
    await user.click(button('+ 1 hour'));
    await user.click(checkButton());
    await user.click(button('+ 1 hour'));
    await user.click(button('+ 1 hour'));
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();

    // Round 2 (half past 3): keyboard.
    await user.click(nextButton());
    await user.tab();
    await user.keyboard(keysFor(3, 30));
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[1].explanation)).toBeInTheDocument();

    // Round 3 (quarter to 9): backwards past 12 with the buttons.
    await user.click(nextButton());
    await user.click(button('− 15 min'));
    shows('11:45');
    for (let i = 0; i < 3; i++) await user.click(button('− 1 hour'));
    shows('8:45');
    await user.click(checkButton());
    expect(screen.getByRole('button', { name: /^finish$/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: /every clock is set/i })).toHaveFocus();
    expect(screen.getByText(/2 of 3 right on the first try\.$/i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'clock', completed: true, total: 3, correct: 2, mistakes: 1, perfect: false });
    expect(onComplete.mock.calls[0][0].score).toBeCloseTo(2 / 3);
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(3);
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(1);

    expect(screen.queryByRole('list', { name: 'Your rounds' })).not.toBeInTheDocument();
    const rounds = screen.getByRole('button', { name: /your rounds/i });
    await user.click(rounds);
    expect(rounds).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('list', { name: 'Your rounds' })).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(["3:00Round 1: 3 o'clock2 tries", '3:30Round 2: half past 3First try', '8:45Round 3: quarter to 9First try']);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports a perfect run with the complete:perfect coach event', async () => {
    const { user, onEvent, onComplete } = setup();
    for (const round of config.rounds) {
      await user.tab();
      expect(slider()).toHaveFocus();
      await user.keyboard(keysFor(round.hour, round.minute) + '{Enter}');
      expect(screen.getByText(round.explanation)).toBeInTheDocument();
      await user.keyboard('{Enter}');
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'clock', completed: true, perfect: true, score: 1, correct: 3, mistakes: 0 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(screen.getByText(/3 of 3 right on the first try. Perfect!/i)).toBeInTheDocument();
  });

  it('only animates when motion is allowed', async () => {
    const still = setup();
    expect(still.container.querySelector('.animate-pulse')).toBeNull();
    await still.user.click(button('+ 1 hour'));
    await still.user.click(checkButton());
    expect(still.container.querySelector('.animate-shake')).toBeNull();
    expect(still.container.querySelector('.animate-fade-up')).toBeNull();
    still.unmount();

    const moving = setup({ reducedMotion: false });
    // The "drag me" ring on the long hand pulses until the first move.
    expect(moving.container.querySelector('.animate-pulse')).not.toBeNull();
    await moving.user.click(button('+ 1 hour'));
    expect(moving.container.querySelector('.animate-pulse')).toBeNull();
    await moving.user.click(checkButton());
    expect(moving.container.querySelector('.animate-shake')).not.toBeNull();
    expect(moving.container.querySelector('.animate-fade-up')).not.toBeNull();
  });

  it('fits the step: o’clock-only clocks have hour buttons only, 5-minute clocks show no words', async () => {
    const oclock = setup({ game: { ...config, minuteStep: 60, rounds: [config.rounds[0]] } });
    expect(screen.queryByRole('button', { name: /min$/ })).not.toBeInTheDocument();
    await oclock.user.tab();
    await oclock.user.keyboard('{ArrowRight}');
    shows('1:00');
    expect(readout()).toHaveTextContent("1 o'clock");
    oclock.unmount();

    setup({ game: { ...config, minuteStep: 5, rounds: [{ ...config.rounds[0], hour: 4, minute: 20 }] } });
    await userEvent.click(button('+ 5 min'));
    shows('12:05');
    expect(readout()).toHaveTextContent(/^12:05$/);
  });
});

describe.each(['touch', 'mouse'] as const)('Clock Setter with a %s', (pointerType) => {
  // The face is 240 px square at the top left of the screen: its centre is (120, 120).
  const at = { 12: [120, 0], 3: [240, 120], 6: [120, 240], 9: [0, 120] } as const;
  const face = () => {
    const el = slider();
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 240, height: 240, right: 240, bottom: 240, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    return el;
  };
  const down = (el: HTMLElement, [clientX, clientY]: readonly [number, number]) => fireEvent.pointerDown(el, { pointerType, pointerId: 7, button: 0, buttons: 1, clientX, clientY });
  const move = (el: HTMLElement, [clientX, clientY]: readonly [number, number]) => fireEvent.pointerMove(el, { pointerType, pointerId: 7, buttons: 1, clientX, clientY });
  const up = (el: HTMLElement, [clientX, clientY]: readonly [number, number]) => fireEvent.pointerUp(el, { pointerType, pointerId: 7, clientX, clientY });

  it('drags the long hand round the face; the hour moves on each time it passes 12', async () => {
    const { user, onEvent } = setup();
    const el = face();

    // The hand jumps to the finger, then follows it.
    down(el, at[3]);
    shows('12:15');
    move(el, at[6]);
    shows('12:30');
    move(el, at[9]);
    shows('12:45');
    move(el, at[12]);
    shows('1:00');
    // Two more turns to 3 o'clock; the snapping ignores small wobbles in between.
    for (let turn = 0; turn < 2; turn++) {
      for (const point of [at[3], at[6], at[9], at[12]]) {
        move(el, [point[0] + 4, point[1] + 4]);
        move(el, point);
      }
    }
    shows('3:00');
    expect(readout()).toHaveTextContent("3 o'clock");
    up(el, at[12]);

    // Moves after letting go do nothing.
    move(el, at[6]);
    shows('3:00');

    await user.click(checkButton());
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start', 'round-correct']);

    // Once right, the clock cannot be dragged.
    down(el, at[6]);
    shows('3:00');
  });

  it('turns the hour back when the hand is dragged backwards past 12', () => {
    setup();
    const el = face();
    down(el, at[9]);
    shows('11:45');
    move(el, at[6]);
    shows('11:30');
    move(el, at[3]);
    move(el, at[12]);
    shows('11:00');
    move(el, at[3]);
    shows('11:15');
    // A press in the very middle cannot tell which way the hand points: nothing moves.
    up(el, at[3]);
    down(el, [121, 121]);
    shows('11:15');
    up(el, [121, 121]);
  });
});
