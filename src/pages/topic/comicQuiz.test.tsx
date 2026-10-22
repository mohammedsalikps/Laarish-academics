import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { getTopic } from '../../content';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import type { ProgressState } from '../../state/progressTypes';
import { NOW, apply, gameResult, learnerState } from '../../test/fixtures';

/**
 * Practice as a comic conversation with the chosen mentor, played through the
 * real app: one question at a time, reactions, the finish, saved progress,
 * read-aloud controls, optional voice answers and what the mentor is sent.
 * Speech synthesis and recognition are browser features, so they are replaced
 * here by small stand-ins that behave like the Web Speech API.
 */

const MAGNETS = 'magnets-what-they-attract';
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function readyForPractice(topicId: string, opts: { mentor?: 'rishi' | 'ayra'; voiceAnswers?: boolean } = {}): ProgressState {
  const topic = getTopic(topicId)!;
  let state = apply(
    learnerState({ grade: 6, mentor: opts.mentor ?? 'ayra' }),
    { type: 'complete-watch', topicId, watched: true, now: NOW },
    { type: 'game-result', topicId, result: gameResult(topic.play.game.type, 1), id: 'g', now: NOW },
  );
  if (opts.voiceAnswers) state = apply(state, { type: 'update-settings', changes: { voiceAnswers: true } });
  return state;
}

function renderPractice(topicId: string, state: ProgressState) {
  const repository = new MemoryProgressRepository(state);
  render(
    <MemoryRouter initialEntries={[topicPath(getTopic(topicId)!, 'practice')]}>
      <App repository={repository} />
    </MemoryRouter>,
  );
  return repository;
}

const choice = (name: RegExp | string) => within(screen.getByRole('radiogroup', { name: /answer choices|true or false/i })).getByRole('radio', { name });
const check = () => screen.getByRole('button', { name: /^check answer$/i });
const start = async (user: ReturnType<typeof userEvent.setup>) => user.click(await screen.findByRole('button', { name: /let's start/i }));

/* ------------------------------------------------ Web Speech API stand-ins */
class FakeUtterance {
  lang = '';
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
let voices: { name: string; lang: string; voiceURI: string }[] = [];
const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => voices, addEventListener: vi.fn(), removeEventListener: vi.fn() };
const spokenTexts = () => synth.speak.mock.calls.map(([u]) => (u as FakeUtterance).text);

class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    FakeRecognition.last = this;
  });
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  hear(alternatives: string[]) {
    const result = Object.assign(alternatives.map((transcript) => ({ transcript })), { isFinal: true });
    this.onresult?.({ resultIndex: 0, results: [result] });
    this.onend?.();
  }
  fail(error: string) {
    this.onerror?.({ error });
  }
}

beforeEach(() => {
  voices = [{ name: 'Test English (India)', lang: 'en-IN', voiceURI: 'en-in' }];
  synth.speak.mockClear();
  synth.cancel.mockClear();
  Object.assign(window, { speechSynthesis: synth, SpeechSynthesisUtterance: FakeUtterance });
  // No mentor server in these tests: the mentor answers on the device (demo).
  vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
});

afterEach(() => {
  for (const key of ['speechSynthesis', 'SpeechSynthesisUtterance', 'webkitSpeechRecognition']) delete (window as unknown as Record<string, unknown>)[key];
  FakeRecognition.last = null;
  vi.unstubAllGlobals();
});

describe('Practice as a comic conversation', () => {
  it('welcomes, asks one question at a time, reacts kindly, explains, and finishes with the score and what to remember', async () => {
    const user = userEvent.setup();
    const repository = renderPractice(MAGNETS, readyForPractice(MAGNETS));

    // Step 1: Ayra (the chosen mentor) welcomes the learner with the topic's own opening.
    expect(await screen.findByText(/^Ready for a magnet challenge\? .* I'll ask you 3 questions, one at a time\. Let's look closely!$/)).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Ayra' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: 'Rishi' })).toBeNull();
    await start(user);

    // Step 2: one question in a speech bubble, with four clear choices.
    expect(screen.getByRole('region', { name: 'Question 1 of 3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Which of these will a magnet attract?' })).toBeInTheDocument();
    expect(within(screen.getByRole('radiogroup', { name: 'Answer choices' })).getAllByRole('radio')).toHaveLength(4);
    expect(check()).toBeDisabled();

    // Steps 3-5: a wrong answer gets a kind "think again" with the lesson's hint, never a harsh screen.
    await user.click(choice(/plastic spoon/i));
    await user.click(check());
    expect(screen.getByText("Good try! Let's think about it again.")).toBeInTheDocument();
    expect(screen.getByText('Hint: Magnets pull things made of iron or steel.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Ayra for another hint' })).toBeInTheDocument();
    await user.click(choice(/iron nail/i));
    await user.click(check());
    expect(screen.getByText('Well done for sticking with it!')).toBeInTheDocument();
    expect(screen.getByText('The iron nail is made of iron, so the magnet attracts it.')).toBeInTheDocument();

    // Step 6: the next question comes only when the learner continues.
    expect(screen.getByRole('region', { name: 'Question 1 of 3' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByRole('heading', { name: 'All metals stick to magnets.' })).toHaveFocus();

    // Keyboard: F picks False, Enter checks.
    await user.keyboard('f');
    expect(choice('False')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByText('Brilliant observing!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Two wrong tries: the answer is shown and explained, with more help on offer.
    await user.click(choice(/sticky/i));
    await user.click(check());
    await user.click(choice(/cold/i));
    await user.click(check());
    expect(screen.getByText("That's okay, this one was tricky. The answer is: The door has steel in it.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Ayra to explain more' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^finish/i }));

    // Step 7: the celebration, the score, the key idea, and retry or back to the lesson.
    expect(screen.getByText('Practice complete!')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Practice results' })).toHaveTextContent('You scored 50%, with 1 of 3 right on the first try.');
    expect(screen.getByText('Remember')).toBeInTheDocument();
    expect(screen.getByText('Magnets attract things made of iron and steel.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the lesson' })).toHaveAttribute('href', '/subjects/science/magnets');
    await waitFor(async () => {
      const saved = (await repository.load()) as { status: string; state?: ProgressState };
      expect(saved.state?.quizAttempts).toHaveLength(1);
      expect(saved.state?.quizAttempts[0]).toMatchObject({ topicId: MAGNETS, score: 0.5, correctFirstTry: 1, total: 3 });
      expect(saved.state?.topics[MAGNETS].completedSteps).toContain('practice');
    });

    // Try again starts at question 1 straight away.
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('region', { name: 'Question 1 of 3' })).toBeInTheDocument();
  });

  it('speaks with Rishi for a learner who chose Rishi', async () => {
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS, { mentor: 'rishi' }));
    expect(await screen.findByText(/Let's test it!$/)).toBeInTheDocument();
    await start(user);
    await user.click(choice(/iron nail/i));
    await user.click(check());
    expect(screen.getByText('Great discovery!')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Rishi' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: 'Ayra' })).toBeNull();
  });
});

describe('read aloud', () => {
  it('speaks each new line once when turned on, replays on request, and stops when turned off', async () => {
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS));
    const toggle = await screen.findByRole('button', { name: 'Read aloud' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(synth.speak).not.toHaveBeenCalled();

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Read aloud' })).toHaveAttribute('aria-pressed', 'true');
    // Lines already on screen are not re-read just because Read aloud was turned on.
    expect(synth.speak).not.toHaveBeenCalled();
    await start(user);
    await waitFor(() => expect(spokenTexts().at(-1)).toBe('Which of these will a magnet attract? A: A plastic spoon. B: An iron nail. C: A wooden block. D: A glass marble.'));
    expect((synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance).lang).toBe('en-IN');
    const count = synth.speak.mock.calls.length;
    // While a line is being read its button stops it; when it ends, the button replays it.
    const question = () => screen.getByRole('region', { name: 'Question 1 of 3' });
    expect(within(question()).getAllByRole('button', { name: 'Stop reading aloud' }).length).toBeGreaterThan(0);
    act(() => (synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance).onend?.());

    // Replay on request.
    await user.click(within(screen.getByRole('region', { name: 'Question 1 of 3' })).getAllByRole('button', { name: 'Hear Ayra say this' })[0]);
    expect(synth.speak.mock.calls.length).toBe(count + 1);

    // Off: speech stops and new lines are not spoken by themselves.
    await user.click(screen.getByRole('button', { name: 'Read aloud' }));
    expect(synth.cancel).toHaveBeenCalled();
    const after = synth.speak.mock.calls.length;
    await user.click(choice(/iron nail/i));
    await user.click(check());
    expect(screen.getByText('Great discovery!')).toBeInTheDocument();
    expect(synth.speak.mock.calls.length).toBe(after);
  });

  it('shows Kannada lines without reading them when the device has no Kannada voice', async () => {
    const user = userEvent.setup();
    const topicId = 'kannada-colours-bright';
    renderPractice(topicId, readyForPractice(topicId));
    await start(user);
    const question = screen.getByRole('region', { name: /^Question 1 of/ });
    expect(within(question).getByRole('img', { name: 'No Kannada voice on this device, so read the words on screen' })).toBeInTheDocument();
  });
});

describe('voice answers', () => {
  const sayButton = () => screen.queryByRole('button', { name: /say your answer/i });

  it('are off until a grown-up turns them on, even where the browser supports them', async () => {
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS));
    await start(user);
    expect(sayButton()).toBeNull();
  });

  it('are not offered where the browser cannot listen', async () => {
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS, { voiceAnswers: true }));
    await start(user);
    expect(sayButton()).toBeNull();
    expect(within(screen.getByRole('radiogroup', { name: 'Answer choices' })).getAllByRole('radio')).toHaveLength(4);
  });

  it('listen only after the microphone button, show what was heard, and pick the answer only when the learner confirms', async () => {
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS, { voiceAnswers: true }));
    await start(user);
    expect(FakeRecognition.last).toBeNull();

    await user.click(sayButton()!);
    expect(screen.getByText('Listening… say your answer.')).toBeInTheDocument();
    expect(FakeRecognition.last?.lang).toBe('en-IN');
    FakeRecognition.last!.hear(['an iron nail', 'and iron nail']);
    expect(await screen.findByText('I heard: “an iron nail”')).toBeInTheDocument();
    expect(screen.getByText('That matches B: An iron nail.')).toBeInTheDocument();
    // Nothing is answered yet.
    expect(choice(/iron nail/i)).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: /choose it/i }));
    expect(choice(/iron nail/i)).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText(/great discovery|brilliant/i)).toBeNull();
    await user.click(check());
    expect(screen.getByText('Great discovery!')).toBeInTheDocument();
  });

  it('handles a blocked microphone, silence and cancelling, and tapping always still works', async () => {
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS, { voiceAnswers: true }));
    await start(user);

    await user.click(sayButton()!);
    FakeRecognition.last!.fail('not-allowed');
    expect(await screen.findByText(/The microphone is not allowed in this browser/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /say it again/i }));
    await user.click(screen.getByRole('button', { name: /^done$/i }));
    expect(await screen.findByText("I didn't hear anything. Try again, or tap your answer.")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /say it again/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(sayButton()).toBeInTheDocument();

    await user.click(choice(/wooden block/i));
    expect(check()).toBeEnabled();
  });

  it('says so when it is not sure which answer was meant', async () => {
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS, { voiceAnswers: true }));
    await start(user);
    await user.click(sayButton()!);
    FakeRecognition.last!.hear(['banana']);
    expect(await screen.findByText("I'm not sure which answer that is. Try again, or tap your answer.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /choose it/i })).toBeNull();
  });
});

describe('help from the mentor during Practice', () => {
  it('sends the question and answer as ids only; the hint comes from the lesson, not from grading by the mentor', async () => {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (!String(input).includes('/api/mentor')) return new Response('not found', { status: 404 });
        if (init?.method !== 'POST') return json({ provider: 'claude', model: 'claude-opus-5-5' });
        posts.push(JSON.parse(String(init.body)));
        return json({ reply: 'Think about what each thing is made of.', provider: 'claude' });
      }),
    );
    const user = userEvent.setup();
    renderPractice(MAGNETS, readyForPractice(MAGNETS));
    await start(user);
    await user.click(choice(/plastic spoon/i));
    await user.click(check());
    await user.click(screen.getByRole('button', { name: 'Ask Ayra for another hint' }));
    await waitFor(() => expect(posts).toHaveLength(1));
    const context = posts[0].context as Record<string, unknown>;
    expect(posts[0].intent).toBe('hint');
    expect(context).toMatchObject({ topicId: MAGNETS, step: 'practice', mentor: 'ayra', quiz: { questionId: 'q-attract', answer: 'spoon' } });
    expect(context.quiz).not.toHaveProperty('answerShown');
    expect(context).not.toHaveProperty('lastMistake');
    expect(JSON.stringify(posts[0])).not.toContain('Magnets pull things made of iron or steel');
  });
});
