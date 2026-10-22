import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { SortGameConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import SortGame from './SortGame';

// "More grip or less friction?" (Science → Friction): 8 items, 2 boxes.
const config = getTopic('friction-reducing')!.play.game as SortGameConfig;

function setup(reducedMotion = true) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <SortGame config={config} topicId="friction-reducing" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart };
}

const BOX: Record<string, RegExp> = { more: /^more friction/i, less: /^less friction/i };
const boxes = () => within(screen.getByRole('group', { name: 'Boxes' }));
const box = (id: string) => boxes().getByRole('button', { name: BOX[id] });
/** The one item on show (the card described by the short how-to). */
const card = () => screen.getByRole('button', { description: /put it in the box/i });
const item = () => config.items.find((i) => i.label === card().textContent)!;
const rightBox = () => box(item().binId);
const wrongBox = () => box(item().binId === 'more' ? 'less' : 'more');
const status = () => screen.getByRole('status');
const lastEvent = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];

function rect(el: Element, left: number, top: number, width = 160, height = 130) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect);
}

/** Presses the card, moves it and lets go (jsdom has no layout, so box rects are mocked). */
function dragCard(path: [number, number][]) {
  const el = card();
  const [[x0, y0], ...rest] = path;
  fireEvent.pointerDown(el, { pointerId: 5, pointerType: 'touch', clientX: x0, clientY: y0 });
  for (const [x, y] of rest) fireEvent.pointerMove(el, { pointerId: 5, pointerType: 'touch', clientX: x, clientY: y });
  const [x, y] = path[path.length - 1];
  fireEvent.pointerUp(el, { pointerId: 5, pointerType: 'touch', clientX: x, clientY: y });
}

describe('More grip or less friction? (sort game played through the UI)', () => {
  it('shows one item at a time with the boxes, a compact progress line and a reset action', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();
    expect(onEvent).toHaveBeenCalledWith({ key: 'start' });

    // No prompt paragraph, step labels or instructions: the mentor and "How to play" own those.
    expect(screen.queryByText(config.prompt)).not.toBeInTheDocument();
    expect(screen.queryByText(/pick an item|choose its box/i)).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
    expect(screen.getByText('0 / 8')).toBeInTheDocument();

    // Exactly one item is on show (glowing for the first move), plus the two boxes.
    expect(screen.getAllByRole('button', { pressed: false })).toEqual([card()]);
    expect(card()).toHaveClass('ring-4');
    expect(config.items.map((i) => i.label)).toContain(card().textContent);
    expect(boxes().getAllByRole('button')).toHaveLength(2);
    expect(box('more')).toHaveAccessibleName('More friction: Helps things grip. 0 sorted here.');

    await user.click(screen.getByRole('button', { name: /start over/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('uses a gentle pulse for the first-move cue only when motion is allowed', () => {
    setup(false);
    expect(card()).toHaveClass('animate-pulse-ring');
    expect(card()).not.toHaveClass('ring-4');
  });

  it('sorts by tapping (pick the item, then its box, or just tap the box) with short feedback', async () => {
    const { user, onEvent, onComplete } = setup();
    const first = item();

    // Tap to pick the item up, then a wrong box.
    await user.click(card());
    expect(card()).toHaveAttribute('aria-pressed', 'true');
    expect(card()).not.toHaveClass('animate-pulse-ring');
    expect(status()).toHaveTextContent('Now tap its box.');
    await user.click(wrongBox());
    expect(lastEvent(onEvent)).toMatchObject({ key: 'sort-incorrect', vars: { item: first.label } });
    expect(status()).toHaveTextContent('Not that box. Try again!');
    expect(status()).not.toHaveTextContent(first.explanation); // no give-away
    expect(item()).toBe(first); // the same item stays to try again
    expect(card()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('0 / 8')).toBeInTheDocument();

    // Tapping the right box places the item on show, even without picking it first.
    await user.click(rightBox());
    expect(lastEvent(onEvent)).toMatchObject({ key: 'sort-correct', vars: { item: first.label } });
    expect(status()).toHaveTextContent(first.explanation);
    expect(screen.getByText('1 / 8')).toBeInTheDocument();
    expect(item()).not.toBe(first);
    expect(status()).toHaveTextContent(`Next: ${item().label}.`);
    expect(box(first.binId)).toHaveAccessibleName(/1 sorted here/);
    expect(within(box(first.binId)).getByText(first.label)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('plays fully by keyboard and finishes once, with one short line and an optional recap', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();

    // Enter picks the item up; Escape puts it down; ArrowDown goes to the boxes.
    card().focus();
    await user.keyboard('{Enter}');
    expect(card()).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Escape}');
    expect(card()).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard('{ArrowDown}');
    expect(box('more')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(card()).toHaveFocus();
    await user.keyboard('{ArrowDown}');

    for (let n = 0; n < config.items.length; n += 1) {
      // Left/Right walk between the boxes; Enter puts the item in.
      if (document.activeElement !== rightBox()) await user.keyboard(item().binId === 'more' ? '{ArrowLeft}' : '{ArrowRight}');
      expect(rightBox()).toHaveFocus();
      await user.keyboard('{Enter}');
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'sort', completed: true, perfect: true, score: 1, correct: 8, total: 8, mistakes: 0 });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'complete:perfect' }));
    expect(onEvent.mock.calls.filter(([e]) => e.key === 'sort-correct')).toHaveLength(7);
    expect(status()).toHaveTextContent('Everything is sorted!');
    expect(screen.getByText('8 / 8')).toBeInTheDocument();

    const summary = screen.getByRole('region', { name: 'Everything is sorted!' });
    expect(within(summary).getByRole('heading', { name: 'Everything is sorted!' })).toHaveFocus();
    expect(summary).toHaveTextContent(/every one right on the first try!/i);
    const toggle = within(summary).getByRole('button', { name: /see what you learned/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(summary).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(summary).getByText(config.items[0].explanation)).not.toBeVisible();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(summary).getAllByRole('listitem')).toHaveLength(8);
    expect(within(summary).getByText(config.items[0].explanation)).toBeVisible();

    // Boxes are done; nothing is reported twice.
    expect(box('more')).toHaveAttribute('aria-disabled', 'true');
    await user.click(box('more'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls.filter(([e]) => e.key.startsWith('complete'))).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('sorts by dragging the card onto a box; a missed drop puts it back', async () => {
    const { user, onEvent, onComplete } = setup();
    rect(box('more'), 0, 300);
    rect(box('less'), 180, 300);
    const centre = (id: string): [number, number] => (id === 'more' ? [80, 365] : [260, 365]);

    const first = item();
    rect(card(), 90, 80, 180, 64);

    // A small wobble is still a tap, not a drag.
    fireEvent.pointerDown(card(), { pointerId: 3, pointerType: 'mouse', clientX: 100, clientY: 100 });
    fireEvent.pointerMove(card(), { pointerId: 3, pointerType: 'mouse', clientX: 102, clientY: 101 });
    expect(status()).not.toHaveTextContent(/drop it/i);
    expect(screen.getAllByText(first.label)).toHaveLength(1);
    fireEvent.pointerUp(card(), { pointerId: 3, pointerType: 'mouse', clientX: 102, clientY: 101 });

    // A real drag: a copy of the card follows the finger (where it was grabbed) and the box under it is named.
    const el = card();
    fireEvent.pointerDown(el, { pointerId: 5, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerMove(el, { pointerId: 5, pointerType: 'touch', clientX: 100, clientY: 200 });
    const ghost = screen.getAllByText(first.label).find((n) => !el.contains(n))!.closest<HTMLElement>('.fixed')!;
    expect(ghost).toHaveStyle({ transform: 'translate3d(90px, 180px, 0)' });
    expect(status()).toHaveTextContent('Drop it in its box.');
    const [wx, wy] = centre(first.binId === 'more' ? 'less' : 'more');
    fireEvent.pointerMove(el, { pointerId: 5, pointerType: 'touch', clientX: wx, clientY: wy });
    expect(status()).toHaveTextContent(first.binId === 'more' ? 'Let go to put it in “Less friction”.' : 'Let go to put it in “More friction”.');

    // Dropped on the wrong box: checked, and the card is back to try again.
    fireEvent.pointerUp(el, { pointerId: 5, pointerType: 'touch', clientX: wx, clientY: wy });
    expect(lastEvent(onEvent)).toMatchObject({ key: 'sort-incorrect' });
    expect(item()).toBe(first);
    expect(screen.getAllByText(first.label)).toHaveLength(1);

    // Dropped on empty space: nothing is tried.
    const before = onEvent.mock.calls.length;
    dragCard([
      [100, 100],
      [400, 700],
      [900, 900],
    ]);
    expect(onEvent.mock.calls.length).toBe(before);
    expect(item()).toBe(first);
    expect(screen.getAllByText(first.label)).toHaveLength(1);

    // A near miss just outside the right box still counts.
    const [rx] = centre(first.binId);
    dragCard([
      [100, 100],
      [rx, 250],
      [rx, 285],
    ]);
    expect(lastEvent(onEvent)).toMatchObject({ key: 'sort-correct', vars: { item: first.label } });
    expect(screen.getByText('1 / 8')).toBeInTheDocument();

    // Finish by dragging each item into its box.
    while (onComplete.mock.calls.length === 0) dragCard([[100, 100], [150, 200], centre(item().binId)]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: false, correct: 7, total: 8, mistakes: 1 });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'complete' }));
    expect(screen.getByRole('region', { name: 'Everything is sorted!' })).toHaveTextContent(/7 of 8 right on the first try/i);
    await user.click(box('less'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('Sort items with object pictures', () => {
  it('shows the picture on the card, hidden from screen readers, with the name unchanged', () => {
    // "Material Sort" (Science, Class 1): every item has a picture of what it is made of.
    const made = getTopic('s1-made-of')!.play.game as SortGameConfig;
    render(
      <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
        <SortGame config={made} topicId="s1-made-of" attempt={0} reducedMotion onEvent={vi.fn()} onComplete={vi.fn()} onRestart={vi.fn()} />
      </ProgressProvider>,
    );
    const item = made.items.find((i) => i.label === card().textContent)!;
    expect(item.art).toBeDefined();
    expect(card()).toHaveAccessibleName(item.label);
    expect(card().querySelector('svg[viewBox="0 0 64 64"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
