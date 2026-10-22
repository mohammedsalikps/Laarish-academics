import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBJECTS, getLesson, getTopicsForLesson, lessonLabel, levelForGrade, lessonsForBranch } from '../content';
import { MemoryProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { learnerState, playLesson } from '../test/fixtures';
import { App } from './App';

/** Every subject opens the same way: overview → the learner's class roadmap → a lesson's topics → a topic. */

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location" hidden>{`${location.pathname}${location.search}`}</output>;
}
const currentLocation = () => screen.getByTestId('location').textContent;

function renderApp(path: string, state: ProgressState) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={new MemoryProgressRepository(state)} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
});

describe.each(SUBJECTS.map((s) => [s.name, s] as const))('%s', (_, subject) => {
  it('opens its overview at the learner’s class, then a lesson, then a topic', async () => {
    const user = userEvent.setup();
    const grade = 3;
    renderApp(`/subjects/${subject.id}`, learnerState({ grade }));
    expect(await screen.findByRole('heading', { level: 1, name: subject.name })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Showing' })).toHaveValue(levelForGrade(subject, grade)!.id);
    const path = screen.getByRole('list', { name: `${subject.name} Class ${grade} lessons in order` });

    // The first open lesson of the class opens its topic roadmap.
    const start = within(path).getAllByRole('button').find((b) => /ready to start/i.test(b.getAttribute('aria-label') ?? ''))!;
    const lessonTitle = /^Lesson \d+: (.+), \d+ topics · Ready to start/i.exec(start.getAttribute('aria-label')!)![1];
    await user.click(start);
    expect(await screen.findByRole('heading', { level: 1, name: lessonTitle })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^topic 1:/i })[0]);
    expect(await screen.findByRole('navigation', { name: /topic steps/i })).toBeInTheDocument();
    await waitFor(() => expect(currentLocation()).toMatch(new RegExp(`^/subjects/${subject.id}/[^/]+/[^/]+\\?step=watch$`)));
  }, 30_000);
});

describe('progress on the overview', () => {
  it('shows a completed lesson as completed, with the totals updated, when the learner comes back', async () => {
    const lesson = getLesson('friction')!;
    const state = playLesson(learnerState({ grade: 8 }), lesson.id);
    renderApp('/subjects/science', state);
    expect(await screen.findByRole('button', { name: new RegExp(`^${lessonLabel(lesson)}, all ${getTopicsForLesson(lesson.id).length} topics mastered`, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Science progress' })).toHaveTextContent(new RegExp(`Lessons\\s*1 of \\d+ done\\s*Topics\\s*${getTopicsForLesson(lesson.id).length} of \\d+ mastered`));
    // The next lesson in the same branch is now open.
    const nextInBranch = lessonsForBranch('science', lesson.levelId!, lesson.branchId!).find((l) => l.order === lesson.order + 1)!;
    expect(screen.getByRole('button', { name: new RegExp(`^${lessonLabel(nextInBranch)}, \\d+ topics · ready to start`, 'i') })).toBeInTheDocument();
  });
});
