import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTopic } from '../content';
import { topicPath } from '../lib/paths';
import type { StepViewProps } from '../pages/topic/shared';
import { MemoryProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { learnerState, playTopic } from '../test/fixtures';
import { App } from './App';

/**
 * A screen, a topic step or the mentor panel that breaks shows a calm recovery
 * card (or, for the mentor, simply steps aside) instead of a blank page, the
 * rest of the app keeps working, and saved progress is never touched.
 */

const broken = vi.hoisted(() => ({ achievements: false, practice: false, mentorPanel: false }));

vi.mock('../pages/Achievements', async (importOriginal) => {
  const real = await importOriginal<typeof import('../pages/Achievements')>();
  return {
    default: function MaybeBrokenAchievements() {
      if (broken.achievements) throw new Error('Achievements broke');
      return <real.default />;
    },
  };
});

vi.mock('../pages/topic/PracticeStep', async (importOriginal) => {
  const real = await importOriginal<typeof import('../pages/topic/PracticeStep')>();
  return {
    ...real,
    PracticeStep: function MaybeBrokenPractice(props: StepViewProps) {
      if (broken.practice) throw new Error('Practice broke');
      return <real.PracticeStep {...props} />;
    },
  };
});

vi.mock('../components/mentor/MentorPanel', async (importOriginal) => {
  const real = await importOriginal<typeof import('../components/mentor/MentorPanel')>();
  return {
    ...real,
    MentorPanel: function MaybeBrokenMentorPanel() {
      if (broken.mentorPanel) throw new Error('Mentor panel broke');
      return <real.MentorPanel />;
    },
  };
});

beforeEach(() => {
  broken.achievements = false;
  broken.practice = false;
  broken.mentorPanel = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

function renderApp(path: string, state: ProgressState) {
  const repository = new MemoryProgressRepository(state);
  render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={repository} />
    </MemoryRouter>,
  );
  return repository;
}

describe('a screen that breaks', () => {
  it('shows a recovery card with the navigation still working, and clears when the learner moves on', async () => {
    const user = userEvent.setup();
    broken.achievements = true;
    renderApp('/achievements', learnerState());

    const card = await screen.findByRole('alert');
    expect(within(card).getByRole('heading', { level: 1, name: 'This page hit a snag' })).toBeInTheDocument();
    expect(card).toHaveTextContent('Your progress is saved.');

    // Try again while it is still broken keeps the card; once fixed, Try again shows the page.
    await user.click(within(card).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This page hit a snag');
    broken.achievements = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: /achievements/i })).toBeInTheDocument();

    // Broken again, the app's own navigation leads away and the next page shows normally.
    broken.achievements = true;
    await user.click(screen.getAllByRole('link', { name: /progress/i })[0]);
    expect(await screen.findByRole('heading', { level: 1, name: /progress/i })).toBeInTheDocument();
    expect(screen.queryByText('This page hit a snag')).not.toBeInTheDocument();
  });
});

describe('a topic step that breaks', () => {
  const T1 = 'friction-what-is';
  const ready = (): ProgressState => playTopic(learnerState(), T1);

  it('keeps the topic header and steps usable, and other steps still open', async () => {
    const user = userEvent.setup();
    broken.practice = true;
    const before = ready();
    const repository = renderApp(topicPath(getTopic(T1)!, 'practice'), before);

    const card = await screen.findByRole('alert');
    expect(card).toHaveTextContent('The Practice step hit a snag');
    expect(within(card).getByRole('link', { name: /back to the roadmap/i })).toHaveAttribute('href', '/subjects/science/friction');

    // The step buttons still work: Learn opens normally.
    await user.click(screen.getByRole('button', { name: /step 1: learn/i }));
    expect(await screen.findByRole('button', { name: /continue to play/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Nothing saved was lost or rewritten by the crash.
    const saved = await repository.load();
    if (saved.status !== 'loaded') throw new Error('expected saved progress');
    expect(saved.state.topics[T1].completedSteps).toEqual(before.topics[T1].completedSteps);
    expect(saved.state.topics[T1].bestMastery).toBe(before.topics[T1].bestMastery);
    expect(saved.state.ledger).toEqual(before.ledger);
  });

  it('opens the step again with Try again once it works', async () => {
    const user = userEvent.setup();
    broken.practice = true;
    renderApp(topicPath(getTopic(T1)!, 'practice'), ready());
    const card = await screen.findByRole('alert');
    broken.practice = false;
    await user.click(within(card).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /let's start/i })).toBeInTheDocument();
  });
});

describe('a broken mentor panel', () => {
  it('does not take the lesson down with it', async () => {
    broken.mentorPanel = true;
    renderApp('/home', learnerState());
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/hit a snag|needs a restart/i)).not.toBeInTheDocument();
  });
});
