import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { MemoryProgressRepository } from '../state/persistence';
import { learnerState, playTopic } from '../test/fixtures';

/** Wireframe P1: the streak this week and the six worlds, from real progress. */
describe('My progress', () => {
  it('shows this week as a streak bar and the six worlds with real mastery, each opening its world', async () => {
    render(
      <MemoryRouter initialEntries={['/progress']}>
        <App repository={new MemoryProgressRepository(playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract'))} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'My progress' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'This week' }).children).toHaveLength(7);

    const worlds = screen.getByRole('heading', { name: 'Your worlds' }).closest('section')!;
    const links = within(worlds).getAllByRole('link');
    expect(links).toHaveLength(6);
    const science = within(worlds).getByRole('link', { name: /^Discovery Valley, Science: \d+% mastery, best 3 of 3 stars\. Open world$/ });
    expect(science).toHaveAttribute('href', '/world/science');
    expect(within(worlds).getByRole('link', { name: /^Number Kingdom, Mathematics: 0% mastery/ })).toHaveAttribute('href', '/world/mathematics');

    expect(screen.getByRole('link', { name: /guide and avatar/i })).toHaveAttribute('href', '/settings');
  });
});
