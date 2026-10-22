import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { getTopic, topicLabel } from '../../content';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import { learnerState } from '../../test/fixtures';

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
});
