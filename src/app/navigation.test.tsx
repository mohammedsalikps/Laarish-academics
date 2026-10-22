import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { FRICTION_TOPICS, NOW, apply, gameResult, learnerState, playTopic } from '../test/fixtures';
import { App } from './App';

const [T1, T2] = FRICTION_TOPICS;

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location" hidden>{`${location.pathname}${location.search}`}</output>;
}

const currentLocation = () => screen.getByTestId('location').textContent;

/** Steps through the temporary explainer to its end, like a child pressing "next" on each scene. */
async function watchToTheEnd(user: ReturnType<typeof userEvent.setup>) {
  while (screen.queryByRole('button', { name: 'Next scene' })) await user.click(screen.getByRole('button', { name: 'Next scene' }));
  await user.click(screen.getByRole('button', { name: /finish the explainer/i }));
}

function renderApp(path: string, state: ProgressState | null) {
  const repository = new MemoryProgressRepository(state);
  render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={repository} />
      <LocationProbe />
    </MemoryRouter>,
  );
  return repository;
}

async function savedState(repository: MemoryProgressRepository) {
  const saved = await repository.load();
  return saved.status === 'loaded' ? saved.state : null;
}

beforeEach(() => {
  // No mentor backend or media manifest in unit tests.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
});

describe('learning hierarchy', () => {
  it('sends visitors without a learner profile to the welcome screen', async () => {
    renderApp('/home', null);
    expect(await screen.findByRole('heading', { level: 1, name: /learn by doing/i })).toBeInTheDocument();
  });

  it('goes Home → Subjects → Science (Class 8 roadmap) → Lesson 1 → Topic 1 and completes Learn', async () => {
    const user = userEvent.setup();
    const repository = renderApp('/home', learnerState({ grade: 8 }));

    // Home: the mentor's greeting and one Continue action; the full catalogue is under Subjects.
    expect(await screen.findByRole('link', { name: /^start/i })).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: 'Subjects' })[0]);

    // Subjects: one card per subject, each opening its roadmap.
    expect(await screen.findByRole('heading', { level: 1, name: 'Subjects' })).toBeInTheDocument();
    for (const name of ['Science', 'Mathematics', 'English', 'Hindi', 'Kannada', 'Social Science']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('link', { name: /start exploring science/i }));

    // Subject overview: totals, the learner's class already selected, and that class's lessons as one path
    // (no grid of class cards to choose from first).
    expect(await screen.findByRole('heading', { level: 1, name: 'Science' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/subjects/science');
    expect(screen.getByRole('region', { name: 'Science progress' })).toHaveTextContent(/Lessons\s*0 of \d+ done\s*Topics\s*0 of \d+ mastered/);
    expect(screen.queryByRole('list', { name: 'Science levels' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Showing' })).toHaveValue('class-8');
    const path = screen.getByRole('list', { name: 'Science Class 8 lessons in order' });
    expect(within(path).getByRole('heading', { name: /^forces and energy/i })).toBeInTheDocument();
    expect(within(path).getByRole('heading', { name: /^earth, space and environment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lesson 2: exploring forces, locked/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lesson 3: magnetic and heating effects of electricity, coming soon/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /lesson 1: friction, 4 topics · ready to start/i }));

    // Lesson roadmap: ordered topics, only the first one open.
    expect(await screen.findByRole('heading', { level: 1, name: 'Friction' })).toBeInTheDocument();
    expect(currentLocation()).toBe('/subjects/science/friction');
    expect(screen.getByRole('button', { name: /topic 2: rough and smooth surfaces, locked/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /topic 1: what is friction\?/i }));

    // Topic: Learn → Play → Practice → Complete, starting at Learn.
    expect(await screen.findByRole('heading', { level: 1, name: 'Topic 1: What is friction?' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /topic steps/i })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(`/subjects/science/friction/${T1}?step=watch`));
    expect(screen.getByRole('button', { name: /step 1: learn, current step/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /step 3: practice, locked/i })).toBeDisabled();
    expect(await screen.findByText(/temporary animated explainer/i)).toBeInTheDocument();

    // Opening Learn is not enough: Play unlocks only after reaching the end.
    expect(screen.getByRole('button', { name: /continue to play/i })).toBeDisabled();
    await watchToTheEnd(user);
    await user.click(screen.getByRole('button', { name: /continue to play/i }));
    expect(await screen.findByRole('radiogroup', { name: 'Floor' })).toBeInTheDocument();
    expect(currentLocation()).toBe(`/subjects/science/friction/${T1}?step=play`);
    await waitFor(async () => expect((await savedState(repository))?.topics[T1]?.completedSteps).toEqual(['watch']));
    // A long journey through seven screens: allow extra time when the whole suite runs in parallel.
  }, 60_000);

  it('opens Practice once Play is done', async () => {
    const state = apply(
      learnerState(),
      { type: 'complete-watch', topicId: T1, watched: true, now: NOW },
      { type: 'game-result', topicId: T1, result: gameResult('push-box', 1), id: 'g', now: NOW },
    );
    renderApp(`/subjects/science/friction/${T1}?step=practice`, state);
    expect(await screen.findByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    // The mentor welcomes the learner first, then asks one question at a time.
    await userEvent.setup().click(screen.getByRole('button', { name: /let's start/i }));
    expect(screen.getByText(/question 1 of/i)).toBeInTheDocument();
  });

  it('shows rewards on Complete and moves to the unlocked next topic', async () => {
    const user = userEvent.setup();
    renderApp(`/subjects/science/friction/${T1}?step=complete`, playTopic(learnerState(), T1));
    expect(await screen.findByText(/unlocked: topic 2: rough and smooth surfaces/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to lesson roadmap/i })).toHaveAttribute('href', '/subjects/science/friction');
    await user.click(screen.getByRole('link', { name: /next topic/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Topic 2: Rough and smooth surfaces' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(`/subjects/science/friction/${T2}?step=watch`));
  });

  it('sends a deep link to a step that is not open yet back to the furthest open step', async () => {
    renderApp(`/subjects/science/friction/${T1}?step=practice`, learnerState());
    expect(await screen.findByRole('button', { name: /step 1: learn, current step/i })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(`/subjects/science/friction/${T1}?step=watch`));
  });

  it('does not open a locked topic from a deep link', async () => {
    renderApp(`/subjects/science/friction/${T2}`, learnerState());
    expect(await screen.findByRole('heading', { name: /topic 2: rough and smooth surfaces is locked/i })).toBeInTheDocument();
    expect(screen.getByText(/reach 60% mastery in topic 1: what is friction\?/i)).toBeInTheDocument();
  });

  it('does not open a locked lesson from a deep link', async () => {
    renderApp('/subjects/science/s8-forces', learnerState());
    expect(await screen.findByRole('heading', { name: /this lesson is locked/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to friction/i })).toBeInTheDocument();
  });

  it('sends the mentor only curriculum ids, the chosen mentor and the question, never the nickname', async () => {
    const user = userEvent.setup();
    renderApp(`/subjects/science/friction/${T1}?step=watch`, learnerState());
    await user.click(await screen.findByRole('button', { name: /ask rishi for help/i }));
    const panel = await screen.findByRole('dialog', { name: /ask rishi/i });
    expect(within(panel).getByText(/hi asha/i)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Explain this more simply' }));
    await within(panel).findByText(/demo answer/i);
    const fetchMock = vi.mocked(globalThis.fetch);
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(posts.length).toBeGreaterThan(0);
    const body = JSON.parse(String(posts[0][1]?.body));
    expect(body.context).toMatchObject({ subjectId: 'science', lessonId: 'friction', topicId: T1, step: 'watch', grade: 4, mentor: 'rishi' });
    expect(body.messages).toEqual([{ role: 'learner', text: 'Explain this more simply' }]);
    expect(body.intent).toBe('simpler');
    expect(JSON.stringify(body)).not.toMatch(/asha/i);
  });

  it('rejects topic links whose subject or lesson do not match', async () => {
    renderApp(`/subjects/mathematics/friction/${T1}`, learnerState());
    expect(await screen.findByRole('heading', { name: /couldn't find that topic/i })).toBeInTheDocument();
  });

  it('redirects old /learn links to the matching roadmap', async () => {
    renderApp('/learn/friction', learnerState());
    expect(await screen.findByRole('heading', { level: 1, name: 'Friction' })).toBeInTheDocument();
  });

  it('shows a friendly page for unknown routes', async () => {
    renderApp('/nowhere', learnerState());
    expect(await screen.findByRole('heading', { name: /this path is empty/i })).toBeInTheDocument();
  });
});
