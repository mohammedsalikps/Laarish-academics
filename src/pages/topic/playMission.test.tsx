import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { getTopic } from '../../content';
import type { MiniGameProps } from '../../games/framework';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import type { ProgressState } from '../../state/progressTypes';
import { NOW, apply, learnerState, playTopic } from '../../test/fixtures';

/**
 * The Play step's mission card (goal, skill, scoring, completion) and what
 * happens when a game breaks or fails to download, played through the real app.
 * The first friction topic's game is replaced by a small stand-in that can
 * finish, crash, or fail like a missing download.
 */

const game = vi.hoisted(() => ({ mode: 'ok' as 'ok' | 'crash' | 'chunk', renders: 0 }));
const reload = vi.hoisted(() => vi.fn());

vi.mock('../../lib/errors', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/errors')>()), reloadPage: reload }));

vi.mock('../../games/pushbox/PushBox', () => ({
  default: function StandInGame({ onComplete }: MiniGameProps) {
    game.renders += 1;
    if (game.mode === 'crash') throw new Error('The stand-in game broke');
    if (game.mode === 'chunk') throw new TypeError('Failed to fetch dynamically imported module: /assets/PushBox.js');
    return (
      <button
        type="button"
        onClick={() => onComplete({ gameType: 'push-box', score: 1, correct: 3, total: 3, mistakes: 0, completed: true, perfect: true, summary: 'Moved the box on all 3 floors' })}
      >
        Finish the stand-in game
      </button>
    );
  },
}));

const FIRST = 'friction-what-is'; // Push the Box: an exploratory simulation, not scored
const MATCH = 'friction-helps-us'; // a scored matching game

beforeEach(() => {
  game.mode = 'ok';
  game.renders = 0;
  reload.mockClear();
});

afterEach(() => vi.restoreAllMocks());

function renderPlay(topicId: string, state: ProgressState) {
  const repository = new MemoryProgressRepository(state);
  render(
    <MemoryRouter initialEntries={[topicPath(getTopic(topicId)!, 'play')]}>
      <App repository={repository} />
    </MemoryRouter>,
  );
  return repository;
}

const afterWatch = (topicId: string, base = learnerState()) => apply(base, { type: 'complete-watch', topicId, watched: true, now: NOW });
const mission = () => screen.getByRole('region', { name: 'Push the Box' });

describe('the mission card', () => {
  it('shows the mission, the skill and that this game is not scored, with How to play still optional', async () => {
    renderPlay(FIRST, afterWatch(FIRST));
    expect(await screen.findByRole('heading', { level: 2, name: 'Push the Box' })).toBeInTheDocument();
    const card = mission();
    expect(within(card).getByText(/Your mission · Push, observe and explain/)).toBeInTheDocument();
    expect(within(card).getByText('Move the box on every floor and find out how hard each one pushes back.')).toBeInTheDocument();
    expect(within(card).getByText('Explore and test: not scored')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'How to play' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'How to play' })).not.toBeInTheDocument();
  });

  it('says when a game counts towards mastery', async () => {
    const ready = afterWatch(MATCH, playTopic(playTopic(learnerState(), FIRST), 'friction-rough-smooth'));
    renderPlay(MATCH, ready);
    const heading = await screen.findByRole('heading', { level: 2, name: getTopic(MATCH)!.play.title });
    expect(heading.closest('section')).toHaveTextContent('Counts towards your mastery');
  });

  it('turns into "Mission complete" with the game summary, and opens Practice', async () => {
    const user = userEvent.setup();
    renderPlay(FIRST, afterWatch(FIRST));
    const next = await screen.findByRole('button', { name: /continue to practice/i });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Finish the stand-in game' }));
    expect(within(mission()).getByText(/Mission complete · /)).toBeInTheDocument();
    expect(within(mission()).getByText('Moved the box on all 3 floors')).toBeInTheDocument();
    expect(next).toBeEnabled();
  });

  it('tells a learner replaying a finished game that they have done it before', async () => {
    renderPlay(FIRST, playTopic(learnerState(), FIRST));
    expect(await screen.findByText('Done before: play again for fun')).toBeInTheDocument();
  });
});

describe('when a game breaks', () => {
  it('shows a restart card inside the topic, and a restart plays a fresh game without touching saved progress', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    game.mode = 'crash';
    const before = afterWatch(FIRST);
    const repository = renderPlay(FIRST, before);

    const card = await screen.findByRole('alert');
    expect(card).toHaveTextContent('The game stopped working');
    expect(card).toHaveTextContent('Your progress is saved.');
    // The topic around the game keeps working.
    expect(screen.getByRole('navigation', { name: 'Topic steps' })).toBeInTheDocument();
    expect(mission()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exit topic/i })).toBeInTheDocument();

    game.mode = 'ok';
    await user.click(within(card).getByRole('button', { name: 'Restart the game' }));
    expect(await screen.findByRole('button', { name: 'Finish the stand-in game' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const saved = await repository.load();
    expect(saved.status).toBe('loaded');
    if (saved.status === 'loaded') {
      expect(saved.state.topics[FIRST]).toEqual(before.topics[FIRST]);
      expect(saved.state.ledger).toEqual(before.ledger);
    }
  });

  it('offers a reload when the game could not be downloaded', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    game.mode = 'chunk';
    renderPlay(FIRST, afterWatch(FIRST));

    const card = await screen.findByRole('alert');
    expect(card).toHaveTextContent("The game didn't download");
    await user.click(within(card).getByRole('button', { name: 'Reload page' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
