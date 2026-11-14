import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { getTopic, topicLabel } from '../../content';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import { learnerState } from '../../test/fixtures';
import { SLOW_LOAD_MS, TopicContentLoading } from './TopicContentStatus';

/**
 * A topic's video, game and quiz download with its subject's content the first
 * time they are needed. Until then the player shows a loading state, and a
 * failed download can be tried again.
 */

const network = vi.hoisted(() => ({ hold: undefined as Promise<void> | undefined, failures: 0, calls: [] as string[] }));

vi.mock('../../../shared/curriculum/topicContent', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../shared/curriculum/topicContent')>();
  return {
    ...real,
    loadSubjectTopics: async (subjectId: Parameters<typeof real.loadSubjectTopics>[0]) => {
      network.calls.push(subjectId);
      await network.hold;
      if (network.failures > 0) {
        network.failures -= 1;
        throw new TypeError('Failed to fetch dynamically imported module');
      }
      return real.loadSubjectTopics(subjectId);
    },
  };
});

beforeEach(() => {
  network.hold = undefined;
  network.failures = 0;
  network.calls = [];
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderTopic(topicId: string) {
  const topic = getTopic(topicId)!;
  render(
    <MemoryRouter initialEntries={[topicPath(topic, 'watch')]}>
      <App repository={new MemoryProgressRepository(learnerState())} />
    </MemoryRouter>,
  );
  return topic;
}

describe('topic content on demand', () => {
  it('shows the topic title and a loading state until its subject content arrives, then the step', async () => {
    let arrive!: () => void;
    network.hold = new Promise((resolve) => (arrive = resolve));
    const topic = renderTopic('words-naming');

    expect(await screen.findByText(`Loading ${topicLabel(topic)}…`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: topicLabel(topic) })).toBeInTheDocument();
    expect(network.calls).toEqual(['english']);

    arrive();
    expect(await screen.findByRole('button', { name: /key ideas and transcript/i })).toBeInTheDocument();
    expect(screen.queryByText(`Loading ${topicLabel(topic)}…`)).not.toBeInTheDocument();
  });

  it('explains a failed download and loads the topic when the learner tries again', async () => {
    network.failures = 1;
    renderTopic('maps-directions');

    expect(await screen.findByRole('alert')).toHaveTextContent("This topic didn't load");
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('button', { name: /key ideas and transcript/i })).toBeInTheDocument();
    expect(network.calls).toEqual(['social-science', 'social-science']);
  });

  // Each test uses a subject no earlier test has loaded, because downloaded content is kept for the visit.
  it('offers a way back to the roadmap when the download fails', async () => {
    network.failures = 1;
    renderTopic('m1-ten-and-more');
    const card = await screen.findByRole('alert');
    expect(within(card).getByRole('link', { name: /back to the roadmap/i })).toHaveAttribute('href', '/subjects/mathematics/m1-numbers-to-20');
  });

  it('tells an offline learner so, and loads the topic by itself when the device is back online', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    network.failures = 1;
    renderTopic('hi1-swar-a-to-oo');

    expect(await screen.findByRole('alert')).toHaveTextContent("You're offline");
    expect(network.calls).toEqual(['hindi']);

    online.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByRole('button', { name: /key ideas and transcript/i })).toBeInTheDocument();
    expect(network.calls).toEqual(['hindi', 'hindi']);
  });
});

describe('a slow topic download', () => {
  it('explains the wait and offers a reload after a while', () => {
    vi.useFakeTimers();
    render(<TopicContentLoading label="Topic 1: North, south, east and west" />);
    expect(screen.getByText('Loading Topic 1: North, south, east and west…')).toBeInTheDocument();
    expect(screen.queryByText(/taking longer than usual/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(SLOW_LOAD_MS);
    });
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
