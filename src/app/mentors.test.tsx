/**
 * Rishi and Ayra in the real app: choosing one, keeping the choice after a
 * refresh, seeing the same mentor everywhere, and switching without losing
 * progress. Also the Watch and Play controls the mentor shares the screen with.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENTOR_IDS, type MentorId } from '../../shared/mentor/personas';
import { LocalProgressRepository, MemoryProgressRepository, type ProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { FRICTION_TOPICS, NOW, apply, gameResult, learnerState, playTopic } from '../test/fixtures';
import { App } from './App';

const [T1, T2] = FRICTION_TOPICS;
const topicUrl = (topicId: string, step: string) => `/subjects/science/friction/${topicId}?step=${step}`;

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location" hidden>{location.pathname}</output>;
}

function renderApp(path: string, repository: ProgressRepository) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={repository} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

async function savedState(repository: ProgressRepository) {
  const saved = await repository.load();
  return saved.status === 'loaded' ? saved.state : null;
}

/** Every mentor picture on screen, as the mentor id in its file name. */
const mentorPictures = () =>
  [...document.querySelectorAll<HTMLImageElement>('img[src^="/mentors/"]')].map((img) => img.getAttribute('src')!.replace(/^\/mentors\/([a-z]+).*$/, '$1'));

const watchedAndPlayed = (mentor: MentorId) =>
  apply(
    learnerState({ mentor }),
    { type: 'complete-watch', topicId: T1, watched: true, now: NOW },
    { type: 'game-result', topicId: T1, result: gameResult('push-box', 1), id: 'g', now: NOW },
  );

beforeEach(() => {
  // No mentor backend or media manifest in unit tests.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('choosing a mentor', () => {
  it('offers exactly two mentors, Rishi and Ayra, and needs one to finish setup', async () => {
    const user = userEvent.setup();
    const repository = new MemoryProgressRepository(null);
    renderApp('/start', repository);

    await user.type(await screen.findByLabelText('Nickname'), 'Asha');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(within(screen.getByRole('radiogroup', { name: 'Class' })).getByRole('radio', { name: /class 3/i }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    const picker = screen.getByRole('radiogroup', { name: 'Choose your mentor' });
    const options = within(picker).getAllByRole('radio');
    expect(MENTOR_IDS).toEqual(['rishi', 'ayra']);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.textContent)).toEqual([expect.stringMatching(/^Rishi/), expect.stringMatching(/^Ayra/)]);
    // The official artwork, one picture per mentor.
    expect(mentorPictures()).toEqual(['rishi', 'ayra']);
    expect(screen.getByRole('button', { name: /choose a mentor/i })).toBeDisabled();

    await user.click(options[1]);
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: 'Start with Ayra' }));

    expect(await screen.findByRole('img', { name: 'Ayra' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
    await waitFor(async () => expect((await savedState(repository))?.learner).toMatchObject({ displayName: 'Asha', grade: 3, mentorId: 'ayra' }));
  });

  it('keeps the chosen mentor after a page refresh', async () => {
    const user = userEvent.setup();
    const first = renderApp('/start', new LocalProgressRepository(window.localStorage));
    await user.type(await screen.findByLabelText('Nickname'), 'Ravi');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(within(screen.getByRole('radiogroup', { name: 'Class' })).getByRole('radio', { name: /class 5/i }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('radio', { name: /^ayra/i }));
    await user.click(screen.getByRole('button', { name: 'Start with Ayra' }));
    await screen.findByRole('img', { name: 'Ayra' });
    await waitFor(() => expect(window.localStorage.getItem('laarish-academics:progress')).toContain('"mentorId":"ayra"'));

    // A refresh: everything in memory is gone; only the browser's storage remains.
    first.unmount();
    renderApp('/home', new LocalProgressRepository(window.localStorage));
    expect(await screen.findByRole('img', { name: 'Ayra' })).toBeInTheDocument();
    expect(mentorPictures().every((id) => id === 'ayra')).toBe(true);
  });

  it('asks a profile made before mentors existed to choose one, and keeps its progress', async () => {
    const user = userEvent.setup();
    const before = playTopic(learnerState(), T1);
    const { mentorId: _, ...oldLearner } = before.learner!;
    const repository = new MemoryProgressRepository({ ...before, learner: oldLearner });
    renderApp('/home', repository);

    expect(await screen.findByRole('heading', { name: /choose your mentor, asha/i })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^rishi/i }));
    await user.click(screen.getByRole('button', { name: 'Continue with Rishi' }));
    expect(await screen.findByRole('img', { name: 'Rishi' })).toBeInTheDocument();

    const saved = await savedState(repository);
    expect(saved?.learner?.mentorId).toBe('rishi');
    expect(saved?.topics).toEqual(before.topics);
    expect(saved?.ledger).toEqual(before.ledger);
  });
});

describe.each(MENTOR_IDS)('the same mentor on every screen (%s)', (mentor) => {
  const name = mentor === 'rishi' ? 'Rishi' : 'Ayra';
  const onlyThisMentor = () => {
    const pictures = mentorPictures();
    expect(pictures.length).toBeGreaterThan(0);
    expect(new Set(pictures)).toEqual(new Set([mentor]));
  };

  it('Home', async () => {
    renderApp('/home', new MemoryProgressRepository(learnerState({ mentor })));
    expect(await screen.findByRole('img', { name })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0); // the mentor tab in the navigation
    onlyThisMentor();
  });

  it('Watch, and the chat panel', async () => {
    const user = userEvent.setup();
    renderApp(topicUrl(T1, 'watch'), new MemoryProgressRepository(learnerState({ mentor })));
    await user.click(await screen.findByRole('button', { name: `Ask ${name} for help` }));
    const panel = await screen.findByRole('dialog', { name: `Ask ${name}` });
    expect(within(panel).getByRole('log', { name: `Conversation with ${name}` })).toHaveTextContent(`It's ${name}.`);
    expect(within(panel).getByPlaceholderText(`Ask ${name} a question...`)).toBeInTheDocument();
    onlyThisMentor();
  });

  it('Play', async () => {
    const state = apply(learnerState({ mentor }), { type: 'complete-watch', topicId: T1, watched: true, now: NOW });
    renderApp(topicUrl(T1, 'play'), new MemoryProgressRepository(state));
    expect(await screen.findByRole('radiogroup', { name: 'Floor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Ask ${name} for help` })).toBeInTheDocument();
    onlyThisMentor();
  });

  it('Practice, including its answer feedback', async () => {
    const user = userEvent.setup();
    renderApp(topicUrl(T1, 'practice'), new MemoryProgressRepository(watchedAndPlayed(mentor)));
    expect(await screen.findByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Ask ${name} for help` })).toBeInTheDocument();
    // The welcome comes from the chosen mentor too.
    onlyThisMentor();
    await user.click(screen.getByRole('button', { name: /let's start/i }));
    // Answer the first question (right or wrong): the feedback comes from the same mentor.
    const firstChoice = screen.getAllByRole('radio')[0];
    await user.click(firstChoice);
    const check = screen.queryByRole('button', { name: /^check/i });
    if (check) await user.click(check);
    await waitFor(() => expect(mentorPictures().length).toBeGreaterThan(0));
    onlyThisMentor();
  });

  it('Complete', async () => {
    renderApp(topicUrl(T1, 'complete'), new MemoryProgressRepository(playTopic(learnerState({ mentor }), T1)));
    expect(await screen.findByText(/unlocked: topic 2/i)).toBeInTheDocument();
    onlyThisMentor();
  });
});

describe('changing the mentor in Settings', () => {
  it('switches the mentor everywhere and keeps every bit of progress', async () => {
    const user = userEvent.setup();
    const before = playTopic(playTopic(learnerState({ mentor: 'rishi' }), T1), T2);
    const repository = new MemoryProgressRepository(before);
    renderApp('/settings', repository);

    const picker = await screen.findByRole('radiogroup', { name: 'Choose your mentor' });
    expect(within(picker).getByRole('radio', { name: /^rishi/i })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(picker).getByRole('radio', { name: /^ayra/i }));
    expect(within(picker).getByRole('radio', { name: /^ayra/i })).toHaveAttribute('aria-checked', 'true');

    await waitFor(async () => expect((await savedState(repository))?.learner?.mentorId).toBe('ayra'));
    const after = (await savedState(repository))!;
    expect(after.topics).toEqual(before.topics);
    expect(after.ledger).toEqual(before.ledger);
    expect(after.ownedAvatars).toEqual(before.ownedAvatars);
    expect({ ...after.learner, mentorId: 'rishi' }).toEqual(before.learner);

    await user.click(screen.getAllByRole('link', { name: 'Home' })[0]);
    expect(await screen.findByRole('img', { name: 'Ayra' })).toBeInTheDocument();
    expect(new Set(mentorPictures())).toEqual(new Set(['ayra']));
  });
});

describe('Watch: the mentor stays out of the way', () => {
  it('keeps the mentor button in the step footer, beside Continue, not over the video', async () => {
    renderApp(topicUrl(T1, 'watch'), new MemoryProgressRepository(learnerState({ mentor: 'ayra' })));
    const ask = await screen.findByRole('button', { name: 'Ask Ayra for help' });
    const next = screen.getByRole('button', { name: /continue to play/i });
    expect(ask.parentElement).toBe(next.parentElement);
    // Nothing between the button and the page floats over other content.
    for (let el: HTMLElement | null = ask; el && el.tagName !== 'MAIN'; el = el.parentElement) {
      expect(el.className).not.toMatch(/(^|\s)(fixed|absolute)(\s|$)/);
    }
    const player = screen.getByText(/temporary animated explainer/i).closest('section, figure, div')!;
    expect(player.contains(ask)).toBe(false);
  });

  it('opens and closes the mentor panel with the close button or Escape', async () => {
    const user = userEvent.setup();
    renderApp(topicUrl(T1, 'watch'), new MemoryProgressRepository(learnerState({ mentor: 'ayra' })));
    const ask = await screen.findByRole('button', { name: 'Ask Ayra for help' });

    await user.click(ask);
    const panel = await screen.findByRole('dialog', { name: 'Ask Ayra' });
    await user.click(within(panel).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(ask).toHaveFocus());

    await user.click(ask);
    expect(await screen.findByRole('dialog', { name: 'Ask Ayra' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The lesson is still where the child left it.
    expect(screen.getByRole('button', { name: /continue to play/i })).toBeInTheDocument();
  });
});

describe('Play: help on request, and Practice only after playing', () => {
  const afterWatch = (): ProgressState => apply(learnerState(), { type: 'complete-watch', topicId: T1, watched: true, now: NOW });

  it('keeps "How to play" closed until asked, and remembers it was opened', async () => {
    const user = userEvent.setup();
    const view = renderApp(topicUrl(T1, 'play'), new MemoryProgressRepository(afterWatch()));
    const toggle = await screen.findByRole('button', { name: 'How to play' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'How to play' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('region', { name: 'How to play' });
    expect(within(panel).getAllByRole('listitem').length).toBeGreaterThan(0);
    await user.click(within(panel).getByRole('button', { name: 'Close how to play' }));
    expect(screen.queryByRole('region', { name: 'How to play' })).not.toBeInTheDocument();

    // Opened again, it is still open when the child comes back to this game.
    await user.click(toggle);
    view.unmount();
    renderApp(topicUrl(T1, 'play'), new MemoryProgressRepository(afterWatch()));
    expect(await screen.findByRole('region', { name: 'How to play' })).toBeInTheDocument();
  });

  it('locks Continue to Practice until the game is finished', async () => {
    renderApp(topicUrl(T1, 'play'), new MemoryProgressRepository(afterWatch()));
    const next = await screen.findByRole('button', { name: /continue to practice/i });
    expect(next).toBeDisabled();
    expect(screen.getByText(/finish the activity to unlock practice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /step 3: practice, locked/i })).toBeInTheDocument();
  });

  it('opens Continue to Practice once the game was finished', async () => {
    renderApp(topicUrl(T1, 'play'), new MemoryProgressRepository(watchedAndPlayed('rishi')));
    expect(await screen.findByRole('button', { name: /continue to practice/i })).toBeEnabled();
  });
});
