import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { WordOrderConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import WordOrder from './WordOrder';

const config = getTopic('sentences-word-order')!.play.game as WordOrderConfig;

function setup(game: WordOrderConfig = config) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <WordOrder config={game} topicId="t" attempt={0} reducedMotion onEvent={onEvent} onComplete={onComplete} onRestart={() => {}} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete };
}

const tray = () => screen.getByRole('list', { name: /word tiles to use/i });
const addWord = (word: string) => within(tray()).getByRole('button', { name: `Add "${word}" to the sentence` });

describe('Sentence Builder (played through the UI)', () => {
  it('builds a sentence by tapping tiles, and lets a placed word go back', async () => {
    const { user, onEvent } = setup();
    expect(screen.getByText(/start here/i)).toBeInTheDocument();
    expect(screen.getByText('The sun is shining in the sky.')).toBeInTheDocument();

    await user.click(addWord('sun'));
    expect(onEvent).toHaveBeenCalledWith({ key: 'tile-placed' });
    await user.click(screen.getByRole('button', { name: /word 1: sun/i }));
    expect(screen.queryByRole('button', { name: /word 1: sun/i })).not.toBeInTheDocument();

    for (const w of ['The', 'sun', 'is', 'hot', '.']) await user.click(addWord(w));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('“The sun is hot.”')).toBeInTheDocument();
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith({ key: 'sentence-correct' }));
  });

  it('gives a nudge, then a hint, and moves words with the arrow keys', async () => {
    const { user, onEvent } = setup();
    for (const w of ['The', 'is', 'sun', 'hot', '.']) await user.click(addWord(w));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText(/look again at word 2/i)).toBeInTheDocument();

    // Move "sun" one place left with the keyboard.
    screen.getByRole('button', { name: /word 3: sun/i }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /word 2: sun/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('“The sun is hot.”')).toBeInTheDocument();
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith({ key: 'sentence-incorrect' }));
  });

  it('finishes after every sentence and reports the result once', async () => {
    const { user, onComplete } = setup();
    for (const [i, round] of config.rounds.entries()) {
      for (const w of round.words) await user.click(addWord(w));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(await screen.findByRole('button', { name: i === config.rounds.length - 1 ? /finish/i : /next sentence/i }));
    }
    expect(await screen.findByText(/every sentence is built/i)).toBeInTheDocument();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'word-order', correct: 5, total: 5, perfect: true });
  });
});
