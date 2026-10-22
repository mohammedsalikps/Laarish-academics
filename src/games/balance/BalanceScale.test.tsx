import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { BalanceGameConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import BalanceScale from './BalanceScale';

const TOPIC = 'missing-equals-balance';
const config = getTopic(TOPIC)!.play.game as BalanceGameConfig;

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <BalanceScale config={config} topicId={TOPIC} attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount };
}

const choice = (value: number) => within(screen.getByRole('group', { name: /numbers to try/i })).getByRole('button', { name: String(value) });
const scale = () => screen.getByRole('img', { name: /balance scale/i });
const checkButton = () => screen.getByRole('button', { name: /^check$/i });
const nextButton = () => screen.getByRole('button', { name: /^(next|finish)$/i });
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);

describe('Balance scale (played through the UI)', () => {
  it('shows one scale, and tips it towards the heavier side as numbers are chosen', async () => {
    const { user, onEvent } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: `Round 1 of 4: ${config.rounds[0].prompt}` })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(4);
    expect(scale()).toHaveAccessibleName(/waiting for a number/);
    expect(screen.getByText('Try a number for ?.')).toBeInTheDocument();

    // Check does nothing until a number is chosen, but says why.
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkButton());
    expect(screen.getByText('Tap a number first.')).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start']);

    // 6 + 3 = ?
    await user.click(choice(10));
    expect(choice(10)).toHaveAttribute('aria-pressed', 'true');
    expect(scale()).toHaveAccessibleName(/Right side: 10\. The scale is tipped down on the right/);
    expect(screen.getByText('Left 9, right 10. The scale is tipped down on the right: the right side is heavier.')).toBeInTheDocument();
    expect(screen.queryByText('Tap a number first.')).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');

    await user.click(choice(8));
    expect(choice(8)).toHaveAttribute('aria-pressed', 'true');
    expect(choice(10)).toHaveAttribute('aria-pressed', 'false');
    expect(scale()).toHaveAccessibleName(/tipped down on the left/);

    await user.click(choice(9));
    expect(scale()).toHaveAccessibleName(/level: both sides are equal/);
    expect(screen.getByText('Left 9, right 9. The scale is level: both sides are equal.')).toBeInTheDocument();
  });

  it('nudges after a wrong check, then gives the round hint, and completes once', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();
    const [first] = config.rounds;

    await user.click(choice(10));
    await user.click(checkButton());
    expect(screen.getByText('Too big. Try a smaller number.')).toBeInTheDocument();
    expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: 'Too big. Try a smaller number.' } });

    // The nudge was about the checked number, so it goes when another is tried.
    await user.click(choice(8));
    expect(screen.queryByText('Too big. Try a smaller number.')).not.toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(first.hint)).toBeInTheDocument();
    await user.click(choice(10));
    expect(screen.getByText(first.hint)).toBeInTheDocument(); // the hint stays while the scale is not level

    await user.click(choice(9));
    await user.click(checkButton());
    expect(screen.getByText(first.explanation)).toBeInTheDocument();
    expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    expect(choice(8)).toBeDisabled();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: first.explanation } });

    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: `Round 2 of 4: ${config.rounds[1].prompt}` })).toHaveFocus();
    for (const round of config.rounds.slice(1)) {
      await user.click(choice(round.answer));
      await user.click(checkButton());
      expect(screen.getByText(round.explanation)).toBeInTheDocument();
      if (round !== config.rounds.at(-1)) await user.click(nextButton());
    }
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^finish$/i }));
    expect(screen.getByRole('heading', { name: /every scale is balanced/i })).toHaveFocus();
    expect(screen.getByText(/3 of 4 balanced on the first try\./i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'balance', completed: true, total: 4, correct: 3, mistakes: 2, perfect: false });
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(4);
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports a perfect run with the complete:perfect coach event', async () => {
    const { user, onEvent, onComplete } = setup();
    for (const round of config.rounds) {
      await user.click(choice(round.answer));
      await user.click(checkButton());
      await user.click(nextButton());
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: true, score: 1 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(screen.getByText(/4 of 4 balanced on the first try. Perfect!/i)).toBeInTheDocument();
  });

  it('swings the beam only when motion is allowed', async () => {
    const beam = (container: HTMLElement) => container.querySelector<SVGGElement>('svg g[style]')!;
    const still = setup();
    await still.user.click(choice(10));
    expect(beam(still.container).style.transition).toBe('none');
    still.unmount();

    const moving = setup({ reducedMotion: false });
    await moving.user.click(choice(10));
    expect(beam(moving.container).style.transition).toContain('transform');
  });
});
