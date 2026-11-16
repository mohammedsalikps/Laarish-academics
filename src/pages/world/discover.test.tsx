import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { MemoryProgressRepository } from '../../state/persistence';
import { learnerState } from '../../test/fixtures';

/** jsdom has no WebGL, so the world shows its Lite list, which carries the same discoveries. */
function renderWorld(path = '/world/science') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App repository={new MemoryProgressRepository(learnerState({ grade: 6 }))} />
    </MemoryRouter>,
  );
}

describe('Things to discover (world, Lite list)', () => {
  beforeEach(() => window.localStorage.clear());

  it('opens a fact card, counts the find and remembers it', async () => {
    const user = userEvent.setup();
    renderWorld();
    const section = await screen.findByRole('region', { name: /Things to discover/ });
    expect(within(section).getByText('0 of 3 found')).toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: 'Discover: Horseshoe magnet' }));
    const card = await screen.findByRole('dialog', { name: 'Horseshoe magnet' });
    expect(within(card).getByText(/north pole and a south pole/)).toBeInTheDocument();
    expect(within(card).getByText('You have found 1 of 3 things to discover in Discovery Valley.')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Got it' }));

    expect(within(section).getByText('1 of 3 found')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Horseshoe magnet, discovered. Read it again' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('laarish-academics:discoveries') ?? '[]')).toEqual(['science/magnet']);
  });

  it('shows the letter in the Hindi world', async () => {
    renderWorld('/world/hindi');
    const section = await screen.findByRole('region', { name: /Things to discover/ });
    expect(within(section).getByRole('button', { name: 'Discover: अ (a)' })).toBeInTheDocument();
  });

  it('flags a chapter that opened since the last visit, and only then', async () => {
    // Last visit: nothing open yet in Science, Class 6.
    window.localStorage.setItem('laarish-academics:open-chapters', JSON.stringify({ 'science:6': [] }));
    renderWorld();
    const links = await screen.findAllByRole('link', { name: /just opened/ });
    expect(links.length).toBeGreaterThan(0);
    expect(screen.getAllByText('New!').length).toBe(links.length);
    expect(screen.getByText(/just opened\. Tap it to start!/)).toBeInTheDocument();
  });

  it('celebrates nothing on the first visit', async () => {
    renderWorld();
    await screen.findByRole('region', { name: /Things to discover/ });
    expect(screen.queryByText('New!')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('laarish-academics:open-chapters') ?? '{}')['science:6'].length).toBeGreaterThan(0);
  });
});
