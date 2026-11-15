import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
// The full topics (the app's catalog only has the topic index).
import { getTopic as getFullTopic } from '../../../shared/curriculum';
import { App } from '../../app/App';
import { getLesson, getTopic, getTopicsForLesson, lessonLabel, nextLessonInSubject, topicLabel } from '../../content';
import { topicPath } from '../../lib/paths';
import { MemoryProgressRepository } from '../../state/persistence';
import type { ProgressState } from '../../state/progressTypes';
import { FRICTION_LESSON, FRICTION_TOPICS, learnerState, playLesson, playTopic } from '../../test/fixtures';

/**
 * The Complete step's recap (key ideas, a real-life example, how each step
 * went), its "Up next" card, the lesson recap after the last topic, and the
 * topic header's position and step announcements.
 */

const [T1, T2] = FRICTION_TOPICS;

function renderAt(topicId: string, step: string, state: ProgressState) {
  render(
    <MemoryRouter initialEntries={[topicPath(getTopic(topicId)!, step as never)]}>
      <App repository={new MemoryProgressRepository(state)} />
    </MemoryRouter>,
  );
}

describe('topic recap', () => {
  it('sums up the big ideas, a real-life example and how each step went', async () => {
    const full = getFullTopic(T1)!;
    renderAt(T1, 'complete', playTopic(learnerState(), T1));

    const recap = await screen.findByRole('region', { name: 'What you learned' });
    expect(within(recap).getByText(full.watch.keyIdeas[0])).toBeInTheDocument();
    expect(within(recap).getByText(full.mentor.examples[0])).toBeInTheDocument();
    expect(within(recap).getByText(/In real life:/)).toBeInTheDocument();
    const steps = within(recap).getByRole('list', { name: 'How each step went' });
    expect(within(steps).getByText('Learn: done')).toBeInTheDocument();
    // Push the Box is an unscored experiment, so Play shows "done", not a score.
    expect(within(steps).getByText('Play: done')).toBeInTheDocument();
    expect(within(steps).getByText('Practice: best 100%')).toBeInTheDocument();
  });

  it('shows the best score for a scored game', async () => {
    const scored = FRICTION_TOPICS.find((id) => getTopic(id)!.play.assessed)!;
    const before = FRICTION_TOPICS.slice(0, FRICTION_TOPICS.indexOf(scored));
    const state = playTopic(
      before.reduce((s, id) => playTopic(s, id), learnerState()),
      scored,
      { playScore: 0.8 },
    );
    renderAt(scored, 'complete', state);
    const recap = await screen.findByRole('region', { name: 'What you learned' });
    expect(within(recap).getByText('Play: best 80%')).toBeInTheDocument();
  });
});

describe('the next step after a topic', () => {
  it('shows what comes next, how long it takes and what game it has, with one clear button', async () => {
    const user = userEvent.setup();
    const next = getTopic(T2)!;
    renderAt(T1, 'complete', playTopic(learnerState(), T1));

    const card = await screen.findByRole('region', { name: 'Up next' });
    expect(within(card).getByText(`Unlocked: ${topicLabel(next)}`)).toBeInTheDocument();
    expect(within(card).getByText(next.summary)).toBeInTheDocument();
    expect(within(card).getByText(`About ${next.estimatedMinutes} min`)).toBeInTheDocument();
    expect(within(card).getByText(next.play.title)).toBeInTheDocument();
    await user.click(within(card).getByRole('link', { name: /next topic/i }));
    expect(await screen.findByRole('heading', { level: 1, name: topicLabel(next) })).toBeInTheDocument();
  });

  it('below the pass mark, points straight to Practice instead of a locked topic', async () => {
    renderAt(T1, 'complete', playTopic(learnerState(), T1, { credits: 0 }));
    expect(await screen.findByText(/to unlock/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to practice/i })).toHaveAttribute('href', `${topicPath(getTopic(T1)!, 'practice')}`);
    expect(screen.queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
  });
});

describe('lesson recap', () => {
  it('lists every topic of a finished lesson with its stars, and offers the next lesson', async () => {
    const lesson = getLesson(FRICTION_LESSON)!;
    const last = FRICTION_TOPICS.at(-1)!;
    renderAt(last, 'complete', playLesson(learnerState(), FRICTION_LESSON));

    const recap = await screen.findByRole('region', { name: `Lesson recap: ${lessonLabel(lesson)}` });
    const topics = getTopicsForLesson(FRICTION_LESSON);
    expect(within(recap).getAllByRole('listitem')).toHaveLength(topics.length);
    for (const t of topics) expect(within(recap).getByText(topicLabel(t))).toBeInTheDocument();
    expect(within(recap).getByText(`${topics.length * 3} of ${topics.length * 3} stars`)).toBeInTheDocument();

    // Finishing Friction opens the next lesson, named once, in the "Up next" card.
    const nextLesson = nextLessonInSubject(lesson)!;
    expect(nextLesson.status).toBe('ready');
    expect(screen.getByText('Your next lesson is ready.')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Up next' });
    expect(within(card).getByText(lessonLabel(nextLesson))).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /next lesson/i })).toBeInTheDocument();
    expect(screen.getAllByText(lessonLabel(nextLesson))).toHaveLength(1);
  });
});

describe('topic header', () => {
  it('says where the topic sits in the lesson and announces the open step', async () => {
    const user = userEvent.setup();
    renderAt(T1, 'watch', playTopic(learnerState(), T1));
    expect(await screen.findByText(`Topic 1 of ${FRICTION_TOPICS.length} in this lesson`)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3: Learn')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /step 2: play/i }));
    expect(await screen.findByText('Step 2 of 3: Play')).toBeInTheDocument();
    // Keyboard and screen-reader users land at the start of the newly opened step.
    expect(document.getElementById('main')).toHaveFocus();
  });
});
