import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { getPrefs, PREFS_KEY } from '../../state/academicsPrefs';
import { MemoryProgressRepository } from '../../state/persistence';
import { learnerState, playTopic } from '../../test/fixtures';

async function passGate(user: ReturnType<typeof userEvent.setup>) {
  const label = await screen.findByText(/^\d+ × \d+ = \?$/);
  const [a, b] = label.textContent!.match(/\d+/g)!.map(Number);
  await user.type(screen.getByRole('textbox'), String(a * b));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('Academics controls for grown-ups (G2, G3)', () => {
  it('are only behind the parental gate, and set Lite mode and school chapters', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/parents']}>
        <App repository={new MemoryProgressRepository(learnerState({ grade: 6 }))} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('heading', { name: 'School chapters and tests' })).toBeNull();
    await passGate(user);

    const controls = (await screen.findByRole('heading', { name: 'School chapters and tests' })).closest('section')!;
    expect(within(controls).getAllByText('Not set yet')).toHaveLength(6);

    const lite = within(controls).getByRole('radiogroup', { name: 'Lite mode (2D map and lists)' });
    expect(within(lite).getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(lite).getByRole('radio', { name: 'Always on' }));
    expect(getPrefs().liteMode).toBe('on');
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!).liteMode).toBe('on');

    await user.click(within(controls).getByRole('button', { name: /Discovery Valley · Science\s*Not set yet/ }));
    const sheet = await screen.findByRole('dialog', { name: 'What is your class learning?' });
    await user.click(within(sheet).getByRole('radio', { name: /^Magnets/ }));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(getPrefs()).toMatchObject({ schoolChapters: { science: 'magnets' }, chaptersChangedBy: 'grown-up' });
    expect(within(controls).getAllByText('Not set yet')).toHaveLength(5);
  });
});

describe('offline (X4)', () => {
  it('shows a calm banner while offline and removes it when back online', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <App repository={new MemoryProgressRepository(learnerState({ grade: 6 }))} />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1, name: /Kabir|Asha|!/ });
    const online = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(await screen.findByText(/^You're offline\. Your progress is saved on this device/)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/^You're offline/)).toBeNull();
    if (online) Object.defineProperty(Navigator.prototype, 'onLine', online);
    delete (navigator as unknown as Record<string, unknown>).onLine;
  });
});

describe('weekly school report (G1) and daily goal (G3)', () => {
  it('reports this week from real progress, honestly labelled, and sets the daily goal', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('laarish-academics:academics-prefs', JSON.stringify({ version: 1, liteMode: 'auto', schoolChapters: { science: 'magnets' }, testDates: {}, dailyGoalMinutes: 20, rishiChat: true }));
    const repository = new MemoryProgressRepository(playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract'));
    render(
      <MemoryRouter initialEntries={['/parents']}>
        <App repository={repository} />
      </MemoryRouter>,
    );
    await passGate(user);
    const report = (await screen.findByRole('heading', { name: 'Weekly school report' })).closest('section')!;
    expect(within(report).getByText('Science · Magnets')).toBeInTheDocument();
    expect(within(report).getByText('1 of 2 topics mastered')).toBeInTheDocument();
    expect(within(report).getByText(/These lessons are Laarish originals mapped to NCERT\. They have not yet been reviewed by teachers\./)).toBeInTheDocument();
    expect(within(report).getByText(/Conversations are not saved, only counted\./)).toBeInTheDocument();

    const goal = screen.getByRole('radiogroup', { name: 'Daily goal' });
    await user.click(within(goal).getByRole('radio', { name: '100 XP' }));
    expect(within(goal).getByRole('radio', { name: '100 XP' })).toHaveAttribute('aria-checked', 'true');
    await waitFor(async () => {
      const saved = (await repository.load()) as { state?: { learner?: { dailyGoalXp: number } } };
      expect(saved.state?.learner?.dailyGoalXp).toBe(100);
    });
  });
});
