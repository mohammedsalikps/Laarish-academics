import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { getTopic as getFullTopic } from '../../../shared/curriculum';
import { App } from '../../app/App';
import { getTopic } from '../../content';
import type { MagnetLabConfig } from '../../domain/types';
import { magnetHints } from '../../games/hints';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import type { ProgressState } from '../../state/progressTypes';
import { NOW, apply, learnerState } from '../../test/fixtures';

/** "Need a hint?" in Play, on the summit's Magnets game, played through the real app. */
const TOPIC = 'magnets-what-they-attract';

async function openPlay() {
  const state = apply(learnerState({ grade: 6 }), { type: 'complete-watch', topicId: TOPIC, watched: true, now: NOW });
  const repository = new MemoryProgressRepository(state);
  render(
    <MemoryRouter initialEntries={[topicPath(getTopic(TOPIC)!, 'play')]}>
      <App repository={repository} />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'Need a hint?' });
  return repository;
}

const saved = async (repository: MemoryProgressRepository) => ((await repository.load()) as { state: ProgressState }).state;

describe('"Need a hint?" in Play', () => {
  it('shows one hint at a time for the question on screen, then offers the mentor', async () => {
    const user = userEvent.setup();
    const repository = await openPlay();
    const round = (getFullTopic(TOPIC)!.play.game as MagnetLabConfig).rounds[0];
    const [nudge, roundHint] = magnetHints(round).steps;
    await screen.findByText(round.prompt); // the game has loaded and reported its first question
    // One hint button on screen: the game's own button gives way to Play's.
    expect(screen.getAllByRole('button', { name: /need a hint/i })).toHaveLength(1);
    const before = await saved(repository);

    await user.click(screen.getByRole('button', { name: 'Need a hint?' }));
    const panel = screen.getByTestId('play-hint');
    expect(within(panel).getByText('Hint 1 of 2')).toBeInTheDocument();
    expect(panel).toHaveTextContent(nudge);
    expect(panel).not.toHaveTextContent(roundHint);
    expect(within(panel).getByText('Hints are free. They never take away stars.')).toBeInTheDocument();
    // Keyboard users land on the next action.
    expect(within(panel).getByRole('button', { name: 'Another hint' })).toHaveFocus();

    await user.click(within(panel).getByRole('button', { name: 'Another hint' }));
    expect(within(panel).getByText('Hint 2 of 2')).toBeInTheDocument();
    expect(panel).toHaveTextContent(roundHint);
    const ask = within(panel).getByRole('button', { name: /^Ask (Rishi|Ayra)$/ });
    expect(ask).toHaveFocus();

    // Closing keeps the place: the button now shows the same hint again.
    await user.click(within(panel).getByRole('button', { name: 'Close the hint' }));
    expect(screen.queryByTestId('play-hint')).toBeNull();
    const again = screen.getByRole('button', { name: 'Show my hint' });
    expect(again).toHaveFocus();
    await user.click(again);
    expect(within(screen.getByTestId('play-hint')).getByText('Hint 2 of 2')).toBeInTheDocument();

    // Asking for hints changed nothing in the game or in saved progress.
    expect(screen.getByText(round.prompt)).toBeInTheDocument();
    const after = await saved(repository);
    expect(after.topics[TOPIC]).toEqual(before.topics[TOPIC]);
    expect(after.gameAttempts).toEqual(before.gameAttempts);
    expect(after.ledger).toEqual(before.ledger);

    await user.click(within(screen.getByTestId('play-hint')).getByRole('button', { name: /^Ask (Rishi|Ayra)$/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
