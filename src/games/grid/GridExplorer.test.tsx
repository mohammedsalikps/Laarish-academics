import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { GridExplorerConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import GridExplorer from './GridExplorer';

const config = getTopic('maps-directions')!.play.game as GridExplorerConfig;

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <GridExplorer config={config} topicId="maps-directions" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart };
}

const square = (name: RegExp) => within(screen.getByRole('grid', { name: 'Treasure map' })).getByRole('button', { name });
const explorer = () => square(/you are here/i);
const iAmHere = () => screen.getByRole('button', { name: /i am here/i });
const stopCard = (n: number) => screen.getByRole('region', { name: `Stop ${n} of ${config.tasks.length}` });

describe('Treasure Trail (played through the UI)', () => {
  it('guides the first move, walks to a tapped square and names the direction', async () => {
    const { user, onEvent } = setup();
    expect(onEvent).toHaveBeenCalledWith({ key: 'start' });
    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(within(stopCard(1)).getByRole('heading', { name: /walk 2 steps north to reach the well/i })).toBeInTheDocument();
    expect(stopCard(1)).toHaveTextContent('0 steps walked');
    expect(explorer()).toHaveAccessibleName('Row 5, column 3, you are here');
    // Secondary help stays hidden: no hint before a wrong stop, and the reset has nothing to undo yet.
    expect(screen.queryByText(config.tasks[0].hint)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start again/i })).toBeDisabled();

    await user.click(square(/row 3, column 3, well, walk 2 steps north/i));
    expect(screen.getByText('You walked 2 steps North. You are at the well.')).toBeInTheDocument();
    expect(screen.queryByText('Start here')).not.toBeInTheDocument();
    expect(explorer()).toHaveAccessibleName('Row 3, column 3, Well, you are here');
    expect(stopCard(1)).toHaveTextContent('2 steps walked');

    await user.click(iAmHere());
    expect(screen.getByText('You found the well! On a map, North is up.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next stop/i })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /i am here/i })).not.toBeInTheDocument();
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'task-correct' }));
  });

  it('keeps the map key behind a small toggle', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: /map key/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Map key' })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('list', { name: 'Map key' })).getAllByRole('listitem')).toHaveLength(config.landmarks.length);
  });

  it('explains how to walk when a tapped square is not in a straight line', async () => {
    const { user } = setup();
    await user.click(square(/treasure chest/i));
    expect(screen.getByText('Walk in a straight line: go North or West first.')).toBeInTheDocument();
    expect(explorer()).toHaveAccessibleName('Row 5, column 3, you are here');
    expect(screen.getByText('Start here')).toBeInTheDocument();
  });

  it('walks with the arrow keys and compass buttons, and checks with Enter', async () => {
    const { user } = setup();
    await user.tab();
    expect(explorer()).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText(/that's the edge of the map/i)).toBeInTheDocument();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByText('You walked 1 step North.')).toBeInTheDocument();
    expect(explorer()).toHaveAccessibleName('Row 4, column 3, you are here');
    expect(explorer()).toHaveFocus();

    // The map is a single tab stop: the next one is the "I am here!" button.
    await user.tab();
    expect(iAmHere()).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Walk one step North' }));
    expect(screen.getByText('You walked 1 step North. You are at the well.')).toBeInTheDocument();
    await user.click(explorer());
    await user.keyboard('{Enter}');
    expect(screen.getByText(/you found the well/i)).toBeInTheDocument();
  });

  it('gives a compass hint after a wrong stop and lets the child retry', async () => {
    const { user, onEvent } = setup();
    await user.click(square(/row 4, column 3/i));
    await user.click(iAmHere());
    expect(screen.getByText('Not the well yet. The well is 1 square North of you.')).toBeInTheDocument();
    expect(screen.getByText(config.tasks[0].hint)).toBeInTheDocument();
    expect(onEvent).toHaveBeenCalledWith({ key: 'task-incorrect', vars: { hint: 'The well is 1 square North of you.' } });

    // Pressing again without moving only reminds the child to walk.
    await user.click(iAmHere());
    expect(screen.getByText(/walk to a new square first/i)).toBeInTheDocument();
    expect(onEvent.mock.calls.filter(([e]) => e.key === 'task-incorrect')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /start again/i }));
    expect(explorer()).toHaveAccessibleName('Row 5, column 3, you are here');
    expect(explorer()).toHaveFocus();
    expect(stopCard(1)).toHaveTextContent('0 steps walked');
    // The hint stays for the rest of this stop.
    expect(screen.getByText(config.tasks[0].hint)).toBeInTheDocument();
  });

  it('plays the whole trail by tapping squares and completes once', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();
    await user.click(square(/row 4, column 3/i));
    await user.click(iAmHere());
    await user.click(square(/well/i));
    await user.click(iAmHere());
    await user.click(screen.getByRole('button', { name: /next stop/i }));

    expect(within(stopCard(2)).getByRole('heading', { name: /2 steps east to the mango tree/i })).toBeInTheDocument();
    expect(stopCard(2)).toHaveTextContent('0 steps walked');
    expect(explorer()).toHaveFocus();
    expect(screen.queryByText(config.tasks[1].hint)).not.toBeInTheDocument();

    for (const place of [/mango tree/i, /temple/i, /treasure chest/i]) {
      await user.click(square(place));
      await user.click(iAmHere());
      await user.click(screen.getByRole('button', { name: /next stop|finish/i }));
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'grid-explorer', completed: true, total: 4, correct: 3, mistakes: 1, perfect: false });
    expect(onEvent).toHaveBeenCalledWith({ key: 'complete' });
    expect(screen.getByRole('heading', { name: /treasure found/i })).toHaveFocus();
    expect(screen.getByText(/3 of 4 stops found on the first try\. You walked 10 steps\./)).toBeInTheDocument();

    // The stop-by-stop details wait behind a toggle.
    expect(screen.queryByRole('list', { name: /your treasure trail/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /your trail/i }));
    const trail = within(screen.getByRole('list', { name: /your treasure trail/i })).getAllByRole('listitem');
    expect(trail).toHaveLength(4);
    expect(trail[3]).toHaveTextContent(/treasure chest.*4 steps west/i);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('walks one square at a time when motion is allowed', async () => {
    const { user } = setup({ reducedMotion: false });
    await user.click(square(/well/i));
    // The first step is immediate; the feedback waits until the walk is over.
    expect(explorer()).toHaveAccessibleName('Row 4, column 3, you are here');
    expect(screen.queryByText(/you walked/i)).not.toBeInTheDocument();
    expect(await screen.findByText('You walked 2 steps North. You are at the well.')).toBeInTheDocument();
    expect(explorer()).toHaveAccessibleName('Row 3, column 3, Well, you are here');
  });
});
