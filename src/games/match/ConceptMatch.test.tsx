import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { ConceptMatchConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import ConceptMatch from './ConceptMatch';

// Friction Detectives (Science → Friction → Topic 3).
const config = getTopic('friction-helps-us')!.play.game as ConceptMatchConfig;

function setup(reducedMotion = true) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <ConceptMatch config={config} topicId="friction-helps-us" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart };
}

const examples = () => within(screen.getByRole('list', { name: 'Example' }));
const concepts = () => within(screen.getByRole('list', { name: 'What friction is doing' }));
const example = (name: RegExp) => examples().getByRole('button', { name });
const concept = (name: RegExp) => concepts().getByRole('button', { name });
const status = () => screen.getByRole('status');
const lastEvent = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];

const SHOES_HINT = 'What would happen if your shoes were super smooth?';

/** Each example with the concept it matches. */
const PAIRS: [RegExp, RegExp][] = [
  [/bumpy shoe soles/i, /gives grip/i],
  [/bicycle brakes/i, /slows things down/i],
  [/rubbing your hands/i, /makes heat/i],
  [/writing with a pencil/i, /leave a mark/i],
  [/toy car stopping/i, /rough surfaces/i],
];

function rect(el: Element, left: number, top: number, width = 160, height = 60) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect);
}

/** Presses an example, moves it and lets go (jsdom has no layout, so card rects are mocked). */
function dragTo(el: HTMLElement, path: [number, number][]) {
  const [[x0, y0], ...rest] = path;
  fireEvent.pointerDown(el, { pointerId: 7, pointerType: 'touch', clientX: x0, clientY: y0 });
  for (const [x, y] of rest) fireEvent.pointerMove(el, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y });
  const [x, y] = path[path.length - 1];
  fireEvent.pointerUp(el, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y });
}

describe('Friction Detectives (concept match played through the UI)', () => {
  it('starts calm: just the cards, a compact progress line and a small reset action', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();
    expect(onEvent).toHaveBeenCalledWith({ key: 'start' });

    // No title, objective paragraph, instructions or clues: the mentor and "How to play" own those.
    expect(screen.queryByText(config.prompt)).not.toBeInTheDocument();
    expect(screen.queryByText(/start here/i)).not.toBeInTheDocument();
    expect(screen.queryByText(SHOES_HINT)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();

    // Progress reads "0 / 5"; a wordless glow marks the first card to try.
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
    expect(examples().getAllByRole('button')[0]).toHaveClass('ring-4');
    expect(examples().getAllByRole('button')[1]).not.toHaveClass('ring-4');

    await user.click(screen.getByRole('button', { name: /start over/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('uses a gentle pulse for the first-move cue only when motion is allowed', () => {
    setup(false);
    expect(examples().getAllByRole('button')[0]).toHaveClass('animate-pulse-ring');
    expect(examples().getAllByRole('button')[0]).not.toHaveClass('ring-4');
  });

  it('matches by tapping, with clues only after wrong tries', async () => {
    const { user, onEvent, onComplete } = setup();

    // Tap an example: one short next step, and the glow goes away.
    await user.click(example(/bumpy shoe soles/i));
    expect(example(/bumpy shoe soles/i)).toHaveAttribute('aria-pressed', 'true');
    expect(examples().getAllByRole('button')[0]).not.toHaveClass('ring-4');
    expect(status()).toHaveTextContent('Now tap its match.');
    expect(screen.queryByText(SHOES_HINT)).not.toBeInTheDocument();

    // A wrong concept: the clue appears under the example and describes it.
    await user.click(concept(/makes heat/i));
    expect(lastEvent(onEvent)).toMatchObject({ key: 'match-incorrect', vars: { hint: SHOES_HINT } });
    expect(status()).toHaveTextContent(/not quite\. read the clue\./i);
    expect(status()).toHaveTextContent(`Clue: ${SHOES_HINT}`); // read out for screen readers
    expect(example(/bumpy shoe soles/i)).toHaveAccessibleDescription(SHOES_HINT);
    expect(within(concept(/gives grip/i)).queryByText('Suggested')).not.toBeInTheDocument();

    // Second mistake on the same example: its match is gently highlighted.
    await user.click(example(/bumpy shoe soles/i));
    await user.click(concept(/leave a mark/i));
    expect(status()).toHaveTextContent(/try the card with the lightbulb/i);
    expect(within(concept(/gives grip/i)).getByText('Suggested')).toBeInTheDocument();

    // Retry is always possible.
    await user.click(example(/bumpy shoe soles/i));
    await user.click(concept(/gives grip/i));
    expect(lastEvent(onEvent)).toMatchObject({ key: 'match-correct', vars: { left: 'Bumpy shoe soles on a running track', right: 'Friction gives grip so we do not slip' } });
    expect(status()).toHaveTextContent(/^Match!/);
    expect(status()).toHaveTextContent('Bumpy shoe soles on a running track goes with Friction gives grip so we do not slip.');
    expect(screen.queryByText(SHOES_HINT)).not.toBeInTheDocument();
    expect(example(/bumpy shoe soles/i)).toHaveAccessibleName(/matched with friction gives grip/i);
    expect(example(/bumpy shoe soles/i)).toHaveAttribute('aria-disabled', 'true');
    expect(concept(/gives grip/i)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    // Tapping in the other order (concept first) works too.
    await user.click(concept(/makes heat/i));
    expect(status()).toHaveTextContent('Now tap its match.');
    await user.click(example(/rubbing your hands/i));
    expect(example(/rubbing your hands/i)).toHaveAccessibleName(/matched with friction makes heat/i);

    // A matched card can't be picked again.
    await user.click(example(/bumpy shoe soles/i));
    expect(example(/bumpy shoe soles/i)).not.toHaveAttribute('aria-pressed');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('plays fully by keyboard and finishes with one short line and an optional recap', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();

    // Enter picks an example; Escape puts it back.
    example(/bumpy shoe soles/i).focus();
    await user.keyboard('{Enter}');
    expect(example(/bumpy shoe soles/i)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Escape}');
    expect(example(/bumpy shoe soles/i)).toHaveAttribute('aria-pressed', 'false');

    for (const [ex, match] of PAIRS) {
      // Arrow keys walk the example column to the card.
      const lefts = examples().getAllByRole('button');
      for (let guard = 0; document.activeElement !== example(ex) && guard < 5; guard += 1) {
        await user.keyboard(lefts.indexOf(example(ex)) > lefts.indexOf(document.activeElement as HTMLElement) ? '{ArrowDown}' : '{ArrowUp}');
      }
      expect(example(ex)).toHaveFocus();
      await user.keyboard('{Enter}');

      // ArrowRight jumps across; ArrowUp/Down walk to the match.
      await user.keyboard('{ArrowRight}');
      const rights = concepts().getAllByRole('button');
      expect(rights).toContain(document.activeElement);
      for (let guard = 0; document.activeElement !== concept(match) && guard < 5; guard += 1) {
        await user.keyboard(rights.indexOf(concept(match)) > rights.indexOf(document.activeElement as HTMLElement) ? '{ArrowDown}' : '{ArrowUp}');
      }
      expect(concept(match)).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(example(ex)).toHaveAccessibleName(/matched/i);
      // Focus returns to the example column (until the finish line takes it at the end).
      if (onComplete.mock.calls.length === 0) expect(examples().getAllByRole('button')).toContain(document.activeElement);
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'concept-match', completed: true, perfect: true, score: 1, correct: 5, total: 5, mistakes: 0 });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'complete:perfect' }));
    expect(onEvent.mock.calls.filter(([e]) => e.key === 'match-correct')).toHaveLength(4);
    expect(status()).toHaveTextContent('All 5 pairs matched!');
    expect(screen.getByText('5 / 5')).toBeInTheDocument();

    // One short line; the recap stays folded away until asked for.
    const summary = screen.getByRole('region', { name: 'All 5 pairs matched!' });
    expect(within(summary).getByRole('heading', { name: 'All 5 pairs matched!' })).toHaveFocus();
    expect(summary).toHaveTextContent(/every match right on the first try!/i);
    const toggle = within(summary).getByRole('button', { name: /see what you learned/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(summary).queryByRole('list')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(summary).getAllByRole('listitem')).toHaveLength(5);
    expect(within(summary).getByText('Bicycle brakes squeezing the wheel')).toBeInTheDocument();
    await user.click(toggle);
    expect(within(summary).queryByRole('list')).not.toBeInTheDocument();

    // The small reset action becomes "Play again".
    expect(screen.queryByRole('button', { name: /start over/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('matches by dragging an example onto a concept, with a retry after a miss', async () => {
    const { user, onEvent, onComplete } = setup();
    const brakes = example(/bicycle brakes/i);
    rect(brakes, 0, 0);
    rect(concept(/makes heat/i), 200, 0);
    rect(concept(/slows things down/i), 200, 80);

    // A small wobble is still a tap, not a drag.
    fireEvent.pointerDown(brakes, { pointerId: 3, pointerType: 'mouse', clientX: 20, clientY: 20 });
    fireEvent.pointerMove(brakes, { pointerId: 3, pointerType: 'mouse', clientX: 22, clientY: 21 });
    expect(status()).not.toHaveTextContent(/drop it/i);
    fireEvent.pointerUp(brakes, { pointerId: 3, pointerType: 'mouse', clientX: 22, clientY: 21 });

    // Drag onto the wrong concept: a short cue while dragging, then the try is checked.
    fireEvent.pointerDown(brakes, { pointerId: 7, pointerType: 'touch', clientX: 20, clientY: 20 });
    fireEvent.pointerMove(brakes, { pointerId: 7, pointerType: 'touch', clientX: 120, clientY: 24 });
    expect(status()).toHaveTextContent('Drop it on its match.');
    fireEvent.pointerMove(brakes, { pointerId: 7, pointerType: 'touch', clientX: 260, clientY: 30 });
    expect(status()).toHaveTextContent('Let go to match!');
    fireEvent.pointerUp(brakes, { pointerId: 7, pointerType: 'touch', clientX: 260, clientY: 30 });
    expect(lastEvent(onEvent)).toMatchObject({ key: 'match-incorrect', vars: { left: 'Bicycle brakes squeezing the wheel', right: 'Friction makes heat' } });
    expect(screen.getByText('What do brakes help a rider do?')).toBeInTheDocument();

    // Dropped on empty space: nothing is tried.
    const before = onEvent.mock.calls.length;
    dragTo(brakes, [
      [20, 20],
      [300, 300],
      [600, 600],
    ]);
    expect(onEvent.mock.calls.length).toBe(before);
    expect(brakes).not.toHaveAttribute('aria-disabled');

    // A near miss just outside the right card still counts.
    dragTo(brakes, [
      [20, 20],
      [150, 90],
      [190, 110],
    ]);
    expect(lastEvent(onEvent)).toMatchObject({ key: 'match-correct' });
    expect(brakes).toHaveAccessibleName(/matched with friction slows things down/i);

    // Finish the rest by tapping.
    for (const [ex, match] of PAIRS.filter(([ex]) => !ex.test('bicycle brakes'))) {
      await user.click(example(ex));
      await user.click(concept(match));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: false, correct: 4, total: 5, mistakes: 1 });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'complete' }));
    expect(onEvent.mock.calls.filter(([e]) => e.key.startsWith('complete'))).toHaveLength(1);
    const summary = screen.getByRole('region', { name: 'All 5 pairs matched!' });
    expect(summary).toHaveTextContent(/4 of 5 right on the first try/i);
    expect(within(summary).queryByText(/worth remembering/i)).not.toBeInTheDocument();

    // Nothing more happens after the end: completion is reported exactly once.
    await user.click(example(/bicycle brakes/i));
    await user.click(concept(/makes heat/i));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
