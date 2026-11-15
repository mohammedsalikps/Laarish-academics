import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MemoryProgressRepository } from '../state/persistence';
import { learnerState, playTopic } from '../test/fixtures';
import { App } from './App';

/**
 * Every route still opens (summit regression check): old and new, with a
 * Class 6 learner who has finished Magnets topic 1. No screen may fall into
 * an error fallback.
 */
const ROUTES: [string, RegExp][] = [
  ['/home', /Good (morning|afternoon|evening)|Hello/],
  ['/subjects', /^Subjects$/],
  ['/subjects/science', /^Science$/],
  ['/subjects/science/magnets', /Magnets/],
  ['/subjects/science/levels/class-6', /^Science$/],
  ['/subjects/science/magnets/magnets-what-they-attract?step=watch', /What do magnets attract\?/],
  ['/subjects/science/magnets/magnets-poles?step=watch', /Poles: attract and repel/],
  ['/achievements', /Achievements|Awards/],
  ['/progress', /progress/i],
  ['/settings', /Settings/],
  ['/parents', /For grown-ups/],
  ['/mentor', /Rishi/],
  ['/world/science', /Science · Class 6/],
  ['/world/mathematics', /Mathematics · Class 6/],
  ['/world/science/chapter/magnets', /^Magnets$/],
  ['/world/science/chapter/magnets/topic/magnets-what-they-attract', /^Magnets$/],
];

describe('routes', () => {
  it.each(ROUTES)('%s opens without an error screen', async (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App repository={new MemoryProgressRepository(playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract'))} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.queryByText(/hit a snag|needs a restart|didn't load/i)).toBeNull();
  });

  it('shows the not-found page for unknown addresses', async () => {
    render(
      <MemoryRouter initialEntries={['/no-such-page']}>
        <App repository={new MemoryProgressRepository(learnerState({ grade: 6 }))} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
