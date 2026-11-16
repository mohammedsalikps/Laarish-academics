import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { getLesson, getTopicsForLesson } from '../content';
import { MemoryProgressRepository } from '../state/persistence';
import { learnerState } from '../test/fixtures';
import { App } from './App';

/** Classes 7-8 get the Mini Makers presentation (wireframe M1-M3) inside the same app. */
describe('Mini Makers', () => {
  it.each([
    [6, 'explorers'],
    [7, 'makers'],
    [8, 'makers'],
  ] as const)('Class %i uses the %s presentation', async (grade, group) => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <App repository={new MemoryProgressRepository(learnerState({ grade }))} />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(document.documentElement.dataset.agegroup).toBe(group));
  });

  it('numbers the chapter path nodes for Classes 7-8', async () => {
    // Any chapter works: the presentation follows the learner's class, not the lesson's.
    const lesson = getLesson('magnets')!;
    const topics = getTopicsForLesson(lesson.id);
    expect(topics.length).toBeGreaterThan(0);
    render(
      <MemoryRouter initialEntries={[`/world/${lesson.subjectId}/chapter/${lesson.id}`]}>
        <App repository={new MemoryProgressRepository(learnerState({ grade: 7 }))} />
      </MemoryRouter>,
    );
    const first = await screen.findByRole('button', { name: new RegExp(`^Topic 1, ${topics[0].title.replace(/[?.*+()[\]]/g, '\\$&')}`) });
    expect(first).toHaveTextContent('1');
  });
});
