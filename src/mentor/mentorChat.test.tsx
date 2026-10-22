import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { MemoryProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { FRICTION_TOPICS, learnerState, playTopic } from '../test/fixtures';

/**
 * End-to-end tests of the mentor chat (Rishi or Ayra) in the real app UI: what the browser sends
 * to the mentor API, and how the reply is shown. The network is mocked; the
 * live-provider path is exercised separately with `npm run mentor:check` and a
 * real browser session.
 */

type Reply = { status?: number; body: unknown };
const json = ({ status = 200, body }: Reply) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function mockMentorApi(opts: { provider?: 'claude' | 'demo'; replies?: (Reply | 'network-error')[] } = {}) {
  const replies = [...(opts.replies ?? [])];
  const posts: { body: Record<string, unknown> }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes('/api/mentor')) return new Response('not found', { status: 404 });
    if (init?.method !== 'POST') return json({ body: { provider: opts.provider ?? 'claude', model: 'claude-opus-5-5' } });
    posts.push({ body: JSON.parse(String(init.body)) });
    const next = replies.shift() ?? { body: { reply: 'Default reply', provider: opts.provider ?? 'claude' } };
    if (next === 'network-error') throw new TypeError('Failed to fetch');
    return json(next);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, posts };
}

function renderMentorPage(state: ProgressState) {
  render(
    <MemoryRouter initialEntries={['/mentor']}>
      <App repository={new MemoryProgressRepository(state)} />
    </MemoryRouter>,
  );
}

async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
  const box = await screen.findByRole('textbox', { name: /ask rishi a question/i });
  await user.clear(box);
  await user.type(box, text);
  await user.click(screen.getByRole('button', { name: /send question/i }));
}

const log = () => screen.getByRole('log', { name: /conversation with rishi/i });

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('Mentor chat in the browser', () => {
  it('calls the mentor API and shows the live reply, labelled as live AI', async () => {
    const { posts } = mockMentorApi({ replies: [{ body: { reply: 'The carpet is rough, so friction pushes back harder.', provider: 'claude' } }] });
    const user = userEvent.setup();
    renderMentorPage(learnerState({ grade: 8 }));

    expect(await screen.findByText('Live AI', { selector: 'span.chip *, span.chip' })).toBeInTheDocument();
    await ask(user, 'Why does the box stop on the carpet?');

    expect(await within(log()).findByText('The carpet is rough, so friction pushes back harder.')).toBeInTheDocument();
    expect(within(log()).getByText('Live AI')).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    const body = posts[0].body as { messages: unknown[]; context: Record<string, unknown> };
    // Default context: the learner's current topic, grade and language. No profile data.
    expect(body.context).toEqual({ subjectId: 'science', lessonId: 'friction', topicId: FRICTION_TOPICS[0], step: 'none', grade: 8, replyLanguage: 'en', mentor: 'rishi' });
    expect(body.messages).toEqual([{ role: 'learner', text: 'Why does the box stop on the carpet?' }]);
    expect(JSON.stringify(body)).not.toMatch(/asha/i);
  });

  it('answers "What is my name?" on the device without calling the API', async () => {
    const { posts } = mockMentorApi();
    const user = userEvent.setup();
    renderMentorPage(learnerState({ name: 'Asha' }));
    await ask(user, 'What is my name?');
    expect(await within(log()).findByText(/you're asha/i)).toBeInTheDocument();
    expect(within(log()).getByText('From the app')).toBeInTheDocument();
    expect(posts).toHaveLength(0);

    // Later questions do not carry the name either.
    await ask(user, 'What is friction?');
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(JSON.stringify(posts[0].body)).not.toMatch(/asha/i);
  });

  it('shows real progress from the app and sends only a minimal summary', async () => {
    const { posts } = mockMentorApi({ replies: [{ body: { reply: 'Great work! Next, try rough and smooth surfaces.', provider: 'claude' } }] });
    const user = userEvent.setup();
    renderMentorPage(playTopic(learnerState(), FRICTION_TOPICS[0]));
    await ask(user, 'What is my progress?');

    const facts = await within(log()).findByText('From your progress');
    const card = facts.closest('div')!;
    expect(within(card).getByText(/^1 of \d+ topics completed$/)).toBeInTheDocument();
    expect(within(card).getByText(/^0 of \d+ lessons completed$/)).toBeInTheDocument();
    expect(within(card).getByText(/next up: science topic 2: rough and smooth surfaces \(learn\)/i)).toBeInTheDocument();
    expect(await within(log()).findByText(/great work! next, try rough and smooth surfaces/i)).toBeInTheDocument();

    const body = posts[0].body as { intent: string; context: { progress: Record<string, unknown> } };
    expect(body.intent).toBe('progress');
    expect(body.context.progress).toMatchObject({ topicsCompleted: 1, lessonsCompleted: 0, nextTopicId: FRICTION_TOPICS[1], nextStep: 'watch', stars: 3 });
    expect(Object.keys(body.context.progress).every((k) => /^(level|stars|streakDays|topics|lessons|current|next|subject)/.test(k))).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/asha/i);
  });

  it('keeps earlier progress answers out of later requests', async () => {
    const { posts } = mockMentorApi({
      replies: [{ body: { reply: 'You have finished 1 topic. Great work!', provider: 'claude' } }, { body: { reply: 'Carpet is rough.', provider: 'claude' } }],
    });
    const user = userEvent.setup();
    renderMentorPage(playTopic(learnerState(), FRICTION_TOPICS[0]));
    await ask(user, 'How am I doing?');
    await within(log()).findByText('You have finished 1 topic. Great work!');
    await ask(user, 'Why does the box stop on the carpet?');
    await within(log()).findByText('Carpet is rough.');
    const second = posts[1].body as { messages: { text: string }[]; context: Record<string, unknown>; intent?: string };
    expect(second.messages).toEqual([{ role: 'learner', text: 'Why does the box stop on the carpet?' }]);
    expect(second.context.progress).toBeUndefined();
    expect(second.intent).toBeUndefined();
  });

  it('shows a friendly retryable error when the provider fails, and keeps the question', async () => {
    mockMentorApi({
      replies: [
        { status: 502, body: { error: 'mentor_unavailable', message: "Your mentor couldn't answer just now. Please try again in a moment." } },
        { body: { reply: 'Here is a hint: think about bumps.', provider: 'claude' } },
      ],
    });
    const user = userEvent.setup();
    renderMentorPage(learnerState());
    await ask(user, 'Give me a clue about friction');

    expect(await within(log()).findByRole('alert')).toHaveTextContent(/couldn't answer just now/i);
    expect(screen.getByRole('textbox', { name: /ask rishi a question/i })).toHaveValue('Give me a clue about friction');
    await user.click(within(log()).getByRole('button', { name: /try again/i }));
    expect(await within(log()).findByText('Here is a hint: think about bumps.')).toBeInTheDocument();
  });

  it('does not silently switch to demo answers when the live server drops the connection', async () => {
    mockMentorApi({ replies: ['network-error'] });
    const user = userEvent.setup();
    renderMentorPage(learnerState());
    await screen.findByText('Live AI', { selector: 'span.chip *, span.chip' });
    await ask(user, 'Why do shoes have grip?');
    expect(await within(log()).findByRole('alert')).toHaveTextContent(/couldn't connect/i);
    expect(within(log()).queryByText(/demo answer/i)).not.toBeInTheDocument();
  });

  it('labels demo answers honestly when the server has no API key', async () => {
    mockMentorApi({ provider: 'demo', replies: [{ body: { reply: 'Friction slows things down.', provider: 'demo' } }] });
    const user = userEvent.setup();
    renderMentorPage(learnerState());
    expect(await screen.findByText('Demo mode', { selector: 'span.chip *, span.chip' })).toBeInTheDocument();
    await ask(user, 'What is friction?');
    expect(await within(log()).findByText('Demo answer')).toBeInTheDocument();
    expect(within(log()).queryByText('Live AI')).not.toBeInTheDocument();
  });

  it('sends only the last few messages of a long conversation', async () => {
    const { posts } = mockMentorApi();
    const user = userEvent.setup();
    renderMentorPage(learnerState());
    for (const q of ['What is friction?', 'Why?', 'Show me an example please', 'And on ice?', 'What about sand?']) {
      await ask(user, q);
      await waitFor(() => expect(within(log()).getAllByText('Default reply').length).toBeGreaterThan(posts.length - 1));
    }
    const last = posts[posts.length - 1].body as { messages: { role: string; text: string }[] };
    expect(last.messages.length).toBeLessThanOrEqual(6);
    expect(last.messages[last.messages.length - 1]).toEqual({ role: 'learner', text: 'What about sand?' });
  });
});
