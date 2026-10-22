import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { FractionBuilderConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import FractionBuilder from './FractionBuilder';

const TOPIC = 'fractions-halves';
const config = getTopic(TOPIC)!.play.game as FractionBuilderConfig;

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <FractionBuilder config={config} topicId={TOPIC} attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount };
}

const part = (n: number, of: number) => screen.getByRole('button', { name: `Part ${n} of ${of}` });
const checkButton = () => screen.getByRole('button', { name: /^check$/i });
const nextButton = () => screen.getByRole('button', { name: /^(next|finish)$/i });
const readout = () => screen.getByText(/equal parts shaded$/);
const target = () => within(screen.getByRole('group', { name: 'Target' }));
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);

describe('Fair Share Kitchen (played through the UI)', () => {
  it('shows one task: the shape, the live fraction next to the target, and a Check button', async () => {
    const { user, onEvent } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: `Round 1 of 4: ${config.rounds[0].prompt}` })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Round 1, playing now')).toBeInTheDocument();
    expect(readout()).toHaveTextContent('0 of 2 equal parts shaded');
    expect(target().getByText('1/2, one half')).toBeInTheDocument();

    // Secondary help stays out of the way until it is asked for.
    expect(screen.queryByText(/same size/)).not.toBeInTheDocument();
    expect(screen.queryByText(config.rounds[0].hint)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear shading/i })).not.toBeInTheDocument();

    // Check does nothing until something is shaded, but says why.
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkButton());
    expect(screen.getByText('Shade some parts first.')).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start']);

    // Tap to shade: the readout follows every change.
    await user.click(part(1, 2));
    expect(part(1, 2)).toHaveAttribute('aria-pressed', 'true');
    expect(readout()).toHaveTextContent('1 of 2 equal parts shaded');
    expect(screen.queryByText('Shade some parts first.')).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');

    // The equal-parts view opens and closes with a small toggle.
    const equalParts = screen.getByRole('button', { name: /equal parts\?/i });
    await user.click(equalParts);
    expect(equalParts).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Yes! Both parts are the same size, so each is 1/2 of the roti.')).toBeInTheDocument();
    await user.click(equalParts);
    expect(screen.queryByText(/same size/)).not.toBeInTheDocument();

    // Tap again to un-shade.
    await user.click(part(1, 2));
    expect(part(1, 2)).toHaveAttribute('aria-pressed', 'false');
    expect(readout()).toHaveTextContent('0 of 2 equal parts shaded');
  });

  it('after a wrong check gives a short nudge first, then the specific hint', async () => {
    const { user, onEvent } = setup();

    await user.click(part(1, 2));
    await user.click(part(2, 2));
    await user.click(checkButton());
    const nudge = '2/2 is more than 1/2. Un-shade some parts.';
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(screen.queryByText(config.rounds[0].hint)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: nudge } });

    // The nudge was about the checked shading, so it goes when the shading changes.
    await user.click(part(2, 2));
    expect(screen.queryByText(nudge)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');

    // Second wrong check: the round's own hint, which stays while the child tries again.
    await user.click(part(2, 2));
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[0].hint)).toBeInTheDocument();
    await user.click(part(2, 2));
    expect(screen.getByText(config.rounds[0].hint)).toBeInTheDocument();

    // Third wrong check: exactly how many to shade.
    await user.click(part(2, 2));
    await user.click(checkButton());
    expect(screen.getByText('Shade exactly 1 of the 2 parts.')).toBeInTheDocument();
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(3);

    // Clear to retry, then shade with the keyboard.
    await user.click(screen.getByRole('button', { name: /clear shading/i }));
    expect(readout()).toHaveTextContent('0 of 2 equal parts shaded');
    expect(part(1, 2)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(readout()).toHaveTextContent('1 of 2 equal parts shaded');
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();
    expect(screen.queryByText(/^Shade exactly/)).not.toBeInTheDocument();
    expect(part(1, 2)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: /equal parts\?/i })).not.toBeInTheDocument();
    expect(screen.getByText('Round 1 done')).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: config.rounds[0].explanation } });
  });

  it('plays every round by tap, keyboard and drag, then completes once', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();

    // Round 1 (roti, 1/2): one wrong check, then fixed.
    await user.click(part(1, 2));
    await user.click(part(2, 2));
    await user.click(checkButton());
    await user.click(part(2, 2));
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();

    // Round 2 (chocolate bar, 1/2): keyboard only.
    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: `Round 2 of 4: ${config.rounds[1].prompt}` })).toHaveFocus();
    await user.tab();
    expect(part(1, 2)).toHaveFocus();
    await user.keyboard(' ');
    expect(part(1, 2)).toHaveAttribute('aria-pressed', 'true');
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[1].explanation)).toBeInTheDocument();

    // Round 3 (4-piece bar, half): paint across three parts with one drag.
    await user.click(nextButton());
    expect(target().getByText('1/2, one half')).toBeInTheDocument();
    await user.pointer([{ keys: '[MouseLeft>]', target: part(1, 4) }, { target: part(2, 4) }, { target: part(3, 4) }, { keys: '[/MouseLeft]' }]);
    expect(readout()).toHaveTextContent('3 of 4 equal parts shaded');
    expect([1, 2, 3, 4].map((n) => part(n, 4).getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true', 'false']);
    await user.click(checkButton());
    expect(screen.getByText('3/4 is more than 1/2. Un-shade some parts.')).toBeInTheDocument();

    // A stroke that starts on a shaded part erases, and leaves empty parts empty.
    await user.pointer([{ keys: '[MouseLeft>]', target: part(3, 4) }, { target: part(4, 4) }, { keys: '[/MouseLeft]' }]);
    expect(readout()).toHaveTextContent('2 of 4 equal parts shaded');
    expect(part(4, 4)).toHaveAttribute('aria-pressed', 'false');
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[2].explanation)).toBeInTheDocument();

    // Round 4 (whole roti, 2/2).
    await user.click(nextButton());
    expect(target().getByText('2/2, one whole')).toBeInTheDocument();
    await user.click(part(1, 2));
    await user.click(part(2, 2));
    await user.click(checkButton());
    expect(screen.getByRole('button', { name: /^finish$/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: /everything shared fairly/i })).toHaveFocus();
    expect(screen.getByText(/2 of 4 right on the first try/i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'fraction-builder', completed: true, total: 4, correct: 2, mistakes: 2, perfect: false });
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(4);
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(2);

    // The per-round table is behind a small toggle.
    expect(screen.queryByRole('list', { name: 'Your rounds' })).not.toBeInTheDocument();
    const rounds = screen.getByRole('button', { name: /your rounds/i });
    await user.click(rounds);
    expect(rounds).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('list', { name: 'Your rounds' })).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByText(/first try|tries/i).textContent)).toEqual(['2 tries', 'First try', '2 tries', 'First try']);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports a perfect run with the complete:perfect coach event', async () => {
    const { user, onEvent, onComplete } = setup();
    for (const round of config.rounds) {
      for (let n = 1; n <= round.numerator; n++) await user.click(part(n, round.parts));
      await user.click(checkButton());
      await user.click(nextButton());
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: true, score: 1 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(screen.getByText(/4 of 4 right on the first try. Perfect!/i)).toBeInTheDocument();
  });

  it('animates the live number only when motion is allowed', async () => {
    const still = setup();
    await still.user.click(part(1, 2));
    expect(still.container.querySelector('.animate-pop-in')).toBeNull();
    still.unmount();

    const moving = setup({ reducedMotion: false });
    await moving.user.click(part(1, 2));
    expect(moving.container.querySelector('.animate-pop-in')).toHaveTextContent('1');
  });
});
