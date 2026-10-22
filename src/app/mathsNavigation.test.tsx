import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { learnerState, playLesson } from '../test/fixtures';
import { App } from './App';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location" hidden>{`${location.pathname}${location.search}${location.hash}`}</output>;
}
const currentLocation = () => screen.getByTestId('location').textContent;

function renderApp(path: string, state: ProgressState) {
  const repository = new MemoryProgressRepository(state);
  render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={repository} />
      <LocationProbe />
    </MemoryRouter>,
  );
  return repository;
}

const classPicker = () => screen.getByRole('combobox', { name: 'Showing' });
const sections = (classLabel: string) =>
  within(screen.getByRole('list', { name: `Mathematics ${classLabel} lessons in order` }))
    .getAllByRole('heading')
    .map((h) => h.textContent ?? '');

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
});

describe('mathematics: subject overview → class roadmap → lesson → topic', () => {
  it("opens on the learner's class roadmap and goes on to a lesson and a topic", async () => {
    const user = userEvent.setup();
    renderApp('/subjects/mathematics', learnerState({ grade: 4 }));

    // Overview: the Class 4 roadmap straight away, no grid of class cards.
    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /mathematics levels/i })).toBeNull();
    expect(classPicker()).toHaveValue('class-4');
    expect(within(classPicker()).getByRole('option', { name: 'Class 4 (my class)' })).toBeInTheDocument();
    expect(within(classPicker()).getAllByRole('option')).toHaveLength(8);
    // Only branches with lessons in Class 4: Algebra starts in Class 7.
    expect(sections('Class 4').some((s) => s.startsWith('Algebra'))).toBe(false);
    expect(sections('Class 4').some((s) => s.startsWith('Patterns and Early Algebra'))).toBe(true);
    await user.click(screen.getByRole('button', { name: /lesson 1: missing numbers, 2 topics · ready to start/i }));

    // Lesson roadmap: the breadcrumb goes back to the Class 4 roadmap, at this lesson's branch.
    expect(await screen.findByRole('heading', { level: 1, name: 'Missing Numbers' })).toBeInTheDocument();
    const crumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
    for (const link of within(crumbs).getAllByRole('link', { name: 'Mathematics · Class 4' })) {
      expect(link).toHaveAttribute('href', '/subjects/mathematics?class=4#patterns');
    }
    await user.click(screen.getByRole('button', { name: /topic 1: the equals sign means balanced/i }));

    // Topic: Learn → Play → Practice → Complete.
    expect(await screen.findByRole('heading', { level: 1, name: 'Topic 1: The equals sign means balanced' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe('/subjects/mathematics/missing-numbers/missing-equals-balance?step=watch'));
    expect(screen.getByRole('button', { name: /step 1: learn, current step/i })).toBeInTheDocument();
  });

  it("switches class with the small selector, without changing the learner's class or progress", async () => {
    const user = userEvent.setup();
    const before = playLesson(learnerState({ grade: 4 }), 'missing-numbers');
    const repository = renderApp('/subjects/mathematics', before);
    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument();

    await user.selectOptions(classPicker(), 'class-7');
    await waitFor(() => expect(currentLocation()).toBe('/subjects/mathematics?class=7'));
    expect(sections('Class 7').some((s) => s.startsWith('Algebra'))).toBe(true);
    expect(within(classPicker()).getByRole('option', { name: 'Class 4 (my class)' })).toBeInTheDocument();

    const saved = await repository.load();
    expect(saved.status === 'loaded' && saved.state.learner?.grade).toBe(4);
    expect(saved.status === 'loaded' && saved.state.topics).toEqual(before.topics);
  });

  it('shows only the branches that have lessons in Class 1, in branch order', async () => {
    renderApp('/subjects/mathematics?class=1', learnerState({ grade: 1 }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument();
    const names = sections('Class 1');
    expect(names).toHaveLength(4);
    ['Numbers and Arithmetic', 'Shapes and Geometry', 'Measurement, Time and Money', 'Patterns and Early Algebra'].forEach((name, i) => expect(names[i].startsWith(name), names[i]).toBe(true));
  });

  it('locks a lesson until the lesson before it in the same class branch is mastered', async () => {
    renderApp('/subjects/mathematics?class=8', learnerState({ grade: 8 }));
    expect(await screen.findByRole('button', { name: /lesson 2: percentages, locked · finish proportional reasoning first/i })).toBeInTheDocument();
  });

  it('opens that lesson once the lesson before it is complete', async () => {
    renderApp('/subjects/mathematics?class=8', playLesson(learnerState({ grade: 8 }), 'm8-proportional-reasoning'));
    expect(await screen.findByRole('button', { name: /lesson 2: percentages, 2 topics · ready to start/i })).toBeInTheDocument();
  });

  it('ignores an unknown class in the address and shows the learner’s class', async () => {
    renderApp('/subjects/mathematics?class=12', learnerState({ grade: 5 }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument();
    expect(classPicker()).toHaveValue('class-5');
  });
});

describe('links saved before the overview showed the roadmap', () => {
  it.each([
    ['/subjects/mathematics/levels/level-2', 4, '/subjects/mathematics?class=4'],
    ['/subjects/mathematics/levels/class-4', 2, '/subjects/mathematics?class=4'],
    ['/subjects/mathematics/levels/class-8/fractions', 8, '/subjects/mathematics?class=8#fractions'],
  ] as const)('%s opens the matching class roadmap', async (from, grade, to) => {
    renderApp(from, learnerState({ grade }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toBe(to));
  });

  it('rejects unknown classes and branches', async () => {
    renderApp('/subjects/mathematics/levels/level-9', learnerState());
    expect(await screen.findByRole('heading', { name: /this path is empty/i })).toBeInTheDocument();
  });

  it('rejects an unknown branch', async () => {
    renderApp('/subjects/mathematics/levels/class-4/not-a-branch', learnerState());
    expect(await screen.findByRole('heading', { name: /this path is empty/i })).toBeInTheDocument();
  });
});
