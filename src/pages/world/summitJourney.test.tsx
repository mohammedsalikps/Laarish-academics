import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { getTopic } from '../../content';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import type { ProgressState } from '../../state/progressTypes';
import { learnerState, playTopic } from '../../test/fixtures';

/**
 * The Tech Summit slice end to end: Class 6 → Science → Discovery Valley →
 * Magnets. jsdom has no WebGL, so this runs in Lite mode, which must offer the
 * whole journey (same routes, same data) without the 3D scenes.
 */

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

function renderAt(path: string, state: ProgressState) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={new MemoryProgressRepository(state)} />
      <Location />
    </MemoryRouter>,
  );
}

describe('Home → this week → chapter path → topic (Lite mode)', () => {
  it('asks what the class is learning, then plans the week around it', async () => {
    const user = userEvent.setup();
    renderAt('/home', learnerState({ grade: 6 }));

    // H5: chapters not set yet. The worlds still work, as a 2D map with real (0 %) mastery.
    expect(await screen.findByText("Tell Rishi what your class is learning, and he'll plan your week.")).toBeInTheDocument();
    const map = screen.getByRole('group', { name: 'Your worlds, 2D map' });
    expect(within(map).getAllByRole('button')).toHaveLength(6);
    expect(within(map).getByRole('button', { name: 'Discovery Valley, Science: 0% mastery. Open world' })).toBeInTheDocument();
    expect(screen.getByText(/Lite mode: no 3D/)).toBeInTheDocument();

    // H2: the chapter picker, chapters in textbook order, coming-soon ones not selectable.
    await user.click(screen.getByRole('button', { name: 'Set my chapters' }));
    const sheet = await screen.findByRole('dialog', { name: 'What is your class learning?' });
    expect(within(sheet).getByRole('tab', { name: /Science/, selected: true })).toBeInTheDocument();
    expect(within(sheet).getByRole('radio', { name: /^Diversity in the Living World.*coming soon/ })).toBeDisabled();
    await user.click(within(sheet).getByRole('radio', { name: /^Magnets/ }));
    expect(within(sheet).getByText("We're on this")).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    // H1: the card leads with this week's chapter and one gold action.
    expect(await screen.findByRole('heading', { name: 'Science · Magnets' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: "Today's steps in What do magnets attract?" })).toBeInTheDocument();
    const plan = screen.getByRole('link', { name: "Start today's plan" });
    expect(plan).toHaveAttribute('href', '/world/science/chapter/magnets');
    // The island holding this week's chapter is marked.
    expect(within(map).getByRole('button', { name: /^Discovery Valley, Science: 0% mastery, this week in school/ })).toBeInTheDocument();

    // S3 in Lite mode: the same topic nodes as a list, ending at the chapter trophy.
    await user.click(plan);
    expect(await screen.findByRole('heading', { level: 1, name: 'Magnets' })).toBeInTheDocument();
    expect(screen.getByText('Topic 1 of 2 · 0%')).toBeInTheDocument();
    // The compass topic is an "Explore more" topic after the chapter trophy.
    expect(screen.getByRole('button', { name: 'Topic 3, Finding directions with a magnet, locked, explore more' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Topic 2, Poles: attract and repel, locked' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make with your kit, or try it at home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Magnets champion, master every topic to earn it' })).toBeInTheDocument();

    // S4: the topic sheet, with the 60 % mastery meter and one Start.
    await user.click(screen.getByRole('button', { name: 'Topic 1, What do magnets attract?, up next' }));
    const topicSheet = await screen.findByRole('dialog', { name: 'Topic 1' });
    expect(within(topicSheet).getByRole('meter', { name: 'Mastery 0 percent; 60 percent unlocks the next topic' })).toBeInTheDocument();
    expect(within(topicSheet).getByText('Practice · 6 questions')).toBeInTheDocument();
    expect(within(topicSheet).getByText('Explainer · official video coming')).toBeInTheDocument();
    expect(within(topicSheet).getByRole('link', { name: 'Start' })).toHaveAttribute('href', topicPath(getTopic('magnets-what-they-attract')!, 'watch'));
    expect(screen.getByTestId('location')).toHaveTextContent('/world/science/chapter/magnets/topic/magnets-what-they-attract');
  });

  it('keeps the next topic locked below 60 % and points back to the topic that opens it', async () => {
    const user = userEvent.setup();
    const below = playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract', { credits: 0, playScore: 0.3 });
    renderAt('/world/science/chapter/magnets/topic/magnets-poles', below);
    const sheet = await screen.findByRole('dialog', { name: 'Topic 2' });
    expect(within(sheet).getByText('Reach 60% in Topic 1 to open this.')).toBeInTheDocument();
    expect(within(sheet).queryByRole('link', { name: 'Start' })).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Back to Topic 1' }));
    const first = await screen.findByRole('dialog', { name: 'Topic 1' });
    expect(within(first).getByRole('link', { name: 'Practise again' })).toBeInTheDocument();
  });

  it('opens Topic 2 once Topic 1 is mastered, and the chapter shows real progress', async () => {
    renderAt('/world/science/chapter/magnets', playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract'));
    expect(await screen.findByText('Topic 2 of 2 · 50%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Topic 1, What do magnets attract\?, done, 3 stars$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Topic 2, Poles: attract and repel, up next' })).toBeInTheDocument();
  });
});

describe('Subject world (S2 / X3 Lite list)', () => {
  it('lists every chapter of the class with its state, reachable without the 3D scene', async () => {
    renderAt('/world/science', playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Science · Class 6' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Science Class 6 chapters' });
    expect(within(list).getByRole('link', { name: /^Magnets, in progress, 50 percent$/ })).toHaveAttribute('href', '/world/science/chapter/magnets');
    expect(within(list).getAllByText('Coming soon').length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar', { name: 'Science Class 6 mastery' })).toBeInTheDocument();
  });

  it('sends an unknown world back home', async () => {
    renderAt('/world/astronomy', learnerState({ grade: 6 }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/home'));
  });
});
