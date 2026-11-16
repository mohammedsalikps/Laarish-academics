import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import { HOW_TO_NOTE, howToSteps } from '../../games/howTo';
import { GAMES } from '../../games/registry';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import type { ProgressState } from '../../state/progressTypes';
import { learnerState } from '../../test/fixtures';
import { MissionCard } from './MissionCard';

/** "How to play" in the mission card: picture steps first, every written instruction one tap away. */

function renderMission(topicId: string, motion: ProgressState['settings']['motion'] = 'full', showHow = true) {
  const topic = getTopic(topicId)!;
  const base = learnerState();
  const state: ProgressState = { ...base, settings: { ...base.settings, motion } };
  const onToggleHow = vi.fn();
  render(
    <ProgressProvider repository={new MemoryProgressRepository(state)}>
      <MissionCard play={topic.play} def={GAMES[topic.play.game.type]} status="playing" showHow={showHow} onToggleHow={onToggleHow} objective={topic.objectives?.[0]} />
    </ProgressProvider>,
  );
  return { topic, onToggleHow };
}

const panel = () => screen.getByRole('region', { name: 'How to play' });

describe('How to play in the mission card', () => {
  it('shows the game’s picture steps, each with its short caption', async () => {
    const { topic } = renderMission('magnets-poles');
    const steps = howToSteps(topic.play.game);
    const list = await within(panel()).findByRole('list', { name: 'How to play in pictures' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(steps.length);
    steps.forEach((s, i) => expect(items[i]).toHaveTextContent(s.text));
    expect(items[0].querySelector('svg[data-scene="poles-push"]')).not.toBeNull();
  });

  it('keeps every written instruction under "All the steps in words"', async () => {
    const user = userEvent.setup();
    const { topic } = renderMission('friction-what-is');
    const details = within(panel()).getByText('All the steps in words').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(within(details).getByText('All the steps in words'));
    expect(details).toHaveAttribute('open');
    const written = within(details).getByRole('list', { name: 'All the steps in words' });
    for (const line of GAMES['push-box'].instructions(topic.play.game as never)) expect(written).toHaveTextContent(line);
  });

  it('shows the circuit safety rule with the pictures', () => {
    renderMission('s7-electricity-circuits');
    expect(within(panel()).getByText(HOW_TO_NOTE.circuit!)).toBeVisible();
  });

  it('animates the pictures only when motion is allowed', async () => {
    renderMission('m3-oclock-and-half-past', 'full');
    await waitFor(() => expect(within(panel()).getByRole('list', { name: 'How to play in pictures' })).toHaveAttribute('data-animated', 'true'));
    expect(panel().className).toMatch(/animate-fade-up/);
  });

  it('keeps the pictures (and the panel) still with reduced motion', async () => {
    renderMission('m3-oclock-and-half-past', 'reduce');
    // The saved setting arrives when the progress store has loaded.
    await waitFor(() => expect(within(panel()).getByRole('list', { name: 'How to play in pictures' })).toHaveAttribute('data-animated', 'false'));
    expect(panel().querySelectorAll('.howto-anim')).toHaveLength(0);
    expect(panel().querySelector('style')).toBeNull();
    expect(panel().className).not.toMatch(/animate-/);
  });

  it('stays closed until asked, and the close button asks to close it', async () => {
    const user = userEvent.setup();
    const { onToggleHow } = renderMission('magnets-poles');
    await user.click(within(panel()).getByRole('button', { name: 'Close how to play' }));
    expect(onToggleHow).toHaveBeenCalledTimes(1);
  });

  it('is not shown while closed', () => {
    renderMission('magnets-poles', 'full', false);
    expect(screen.queryByRole('region', { name: 'How to play' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How to play' })).toHaveAttribute('aria-expanded', 'false');
  });
});
