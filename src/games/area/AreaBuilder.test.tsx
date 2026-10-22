import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AreaGridConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import AreaBuilder from './AreaBuilder';

const TOPIC = 'area-test';
const config: AreaGridConfig = {
  type: 'area-grid',
  cols: 8,
  rows: 6,
  rounds: [
    { id: 'area-12', area: 12, unit: 'square cm', prompt: 'Make a rectangle with an area of 12 square cm.', hint: 'Area is width times height. Which two numbers multiply to 12?', explanation: 'Width times height is 12, so 12 squares fit inside.' },
    { id: 'perimeter-14', perimeter: 14, prompt: 'Make a rectangle with a perimeter of 14 units.', hint: 'Width plus height must be 7.', explanation: 'All four sides add up to 14.' },
    { id: 'both', area: 12, perimeter: 14, unit: 'square m', prompt: 'Make a rectangle with area 12 square m and perimeter 14 m.', hint: 'Try a width of 3 or 4.', explanation: '3 × 4 = 12 and 3 + 4 + 3 + 4 = 14.' },
  ],
};

/* The grid's SVG is (64 + 8 × 40 + 6) by (34 + 6 × 40 + 6) units; laid out 1 px per unit here. */
const BOX = { left: 0, top: 0, width: 390, height: 280 };
/** Centre of a grid square, in client px. */
const at = (col: number, row: number) => ({ clientX: BOX.left + 64 + col * 40 + 20, clientY: BOX.top + 34 + row * 40 + 20 });

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <AreaBuilder config={config} topicId={TOPIC} attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount };
}

const grid = () => screen.getByRole('group', { name: /^grid/i });
const layOutGrid = () => vi.spyOn(grid(), 'getBoundingClientRect').mockReturnValue({ ...BOX, right: BOX.width, bottom: BOX.height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
const square = (container: HTMLElement, col: number, row: number) => container.querySelector<SVGRectElement>(`[data-col="${col}"][data-row="${row}"]`)!;
const stepper = (name: string) => screen.getByRole('button', { name });
const readout = () => screen.getByRole('status');
const checkButton = () => screen.getByRole('button', { name: /^check$/i });
const nextButton = () => screen.getByRole('button', { name: /^(next|finish)$/i });
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);

async function build(user: ReturnType<typeof userEvent.setup>, width: number, height: number) {
  // Tap the opposite corner (a fallback hit-test, as jsdom has no layout).
  const target = document.querySelector<SVGRectElement>(`[data-col="${width - 1}"][data-row="${height - 1}"]`)!;
  await user.pointer({ keys: '[MouseLeft]', target });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Area Builder (played through the UI)', () => {
  it('shows one task, and the Width and Height steppers change the rectangle', async () => {
    const { user, onEvent, container } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: `Round 1 of 3: ${config.rounds[0].prompt}` })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(3);
    expect(readout()).toHaveTextContent('Area: 0 square cm · Perimeter: 0 cm');
    expect(grid()).toHaveAccessibleName('Grid, 8 by 6 squares. No rectangle yet.');

    // Check does nothing until a rectangle is drawn, but says why.
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(checkButton());
    expect(screen.getByText('Draw a rectangle first.')).toBeInTheDocument();
    expect(eventKeys(onEvent)).toEqual(['start']);

    // The first + makes a 1 × 1 square; then one square at a time.
    expect(stepper('Width minus 1')).toHaveAttribute('aria-disabled', 'true');
    await user.click(stepper('Width plus 1'));
    expect(readout()).toHaveTextContent('Area: 1 square cm · Perimeter: 4 cm');
    expect(screen.queryByText('Draw a rectangle first.')).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'false');
    await user.click(stepper('Width plus 1'));
    await user.click(stepper('Width plus 1'));
    for (let i = 0; i < 3; i++) await user.click(stepper('Height plus 1'));
    expect(readout()).toHaveTextContent('Area: 12 square cm · Perimeter: 14 cm');
    expect(grid()).toHaveAccessibleName(/Your rectangle is 3 wide and 4 tall\./);
    expect(within(screen.getByRole('group', { name: 'Width' })).getByText('3')).toBeInTheDocument();
    // Side lengths along the top and left edges.
    expect([...container.querySelectorAll('svg text')].map((t) => t.textContent)).toEqual(['3 cm', '4 cm']);

    await user.click(stepper('Height minus 1'));
    expect(readout()).toHaveTextContent('Area: 9 square cm · Perimeter: 12 cm');

    // The steppers stop at the edges of the grid.
    for (let i = 0; i < 9; i++) await user.click(stepper('Width plus 1'));
    expect(grid()).toHaveAccessibleName(/8 wide and 3 tall/);
    expect(stepper('Width plus 1')).toHaveAttribute('aria-disabled', 'true');
    for (let i = 0; i < 9; i++) await user.click(stepper('Width minus 1'));
    expect(grid()).toHaveAccessibleName(/1 wide and 3 tall/);
    expect(stepper('Width minus 1')).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets the opposite corner where a square is tapped', async () => {
    const { user, container } = setup();
    await user.pointer({ keys: '[MouseLeft]', target: square(container, 3, 2) });
    expect(grid()).toHaveAccessibleName(/4 wide and 3 tall/);
    expect(readout()).toHaveTextContent('Area: 12 square cm · Perimeter: 14 cm');

    // A finger tap, measured from the grid's box.
    layOutGrid();
    fireEvent.pointerDown(grid(), { pointerType: 'touch', pointerId: 3, button: 0, buttons: 1, ...at(1, 5) });
    fireEvent.pointerUp(grid(), { pointerType: 'touch', pointerId: 3, ...at(1, 5) });
    expect(grid()).toHaveAccessibleName(/2 wide and 6 tall/);
  });

  it('after a wrong check gives a nudge from the numbers, then the round hint', async () => {
    const { user, onEvent } = setup();
    const [first] = config.rounds;

    await build(user, 2, 5);
    await user.click(checkButton());
    const nudge = 'Your area is 10. You need 12: make it bigger.';
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    expect(checkButton()).toHaveAttribute('aria-disabled', 'true');
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: nudge } });

    // Check needs a change first, and says so.
    await user.click(checkButton());
    expect(screen.getByText(nudge)).toBeInTheDocument();
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(1);

    // The nudge was about the checked rectangle, so it goes when the rectangle changes.
    await user.click(stepper('Width plus 1'));
    await user.click(stepper('Width plus 1'));
    expect(screen.queryByText(nudge)).not.toBeInTheDocument();
    await user.click(checkButton());
    expect(screen.getByText(first.hint)).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-incorrect', vars: { hint: first.hint } });
    await user.click(stepper('Height minus 1'));
    expect(screen.getByText(first.hint)).toBeInTheDocument(); // the hint stays until the round is solved

    // 4 × 4 → 4 × 3 = 12.
    await user.click(stepper('Height minus 1'));
    await user.click(checkButton());
    expect(screen.getByText(first.explanation)).toBeInTheDocument();
    expect(screen.queryByText(first.hint)).not.toBeInTheDocument();
    expect(stepper('Width plus 1')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Round 1 done')).toBeInTheDocument();
    expect(onEvent).toHaveBeenLastCalledWith({ key: 'round-correct', vars: { explanation: first.explanation } });
  });

  it('says when only the perimeter is wrong', async () => {
    const { user } = setup();
    for (const [w, h] of [
      [3, 4],
      [2, 5],
    ]) {
      await build(user, w, h);
      await user.click(checkButton());
      await user.click(nextButton());
    }
    await build(user, 2, 6);
    await user.click(checkButton());
    expect(screen.getByText('Area is right, but the perimeter is 16, not 14.')).toBeInTheDocument();
  });

  it('checks with Enter on the grid and resizes with the arrow keys', async () => {
    const { user } = setup();
    grid().focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Draw a rectangle first.')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(grid()).toHaveAccessibleName(/2 wide and 4 tall/);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByText(config.rounds[0].explanation)).toBeInTheDocument();

    // Enter again moves on, like the big button, and focus goes to the new task.
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: `Round 2 of 3: ${config.rounds[1].prompt}` })).toHaveFocus();
    expect(readout()).toHaveTextContent('Area: 0 squares · Perimeter: 0 units');
  });

  it('plays every round, then completes exactly once', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();

    await build(user, 4, 4);
    await user.click(checkButton());
    await build(user, 6, 2);
    await user.click(checkButton());
    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: `Round 2 of 3: ${config.rounds[1].prompt}` })).toHaveFocus();

    await build(user, 1, 6);
    await user.click(checkButton());
    expect(screen.getByText(config.rounds[1].explanation)).toBeInTheDocument();
    await user.click(nextButton());

    await build(user, 4, 3);
    await user.click(checkButton());
    expect(screen.getByRole('button', { name: /^finish$/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(nextButton());
    expect(screen.getByRole('heading', { name: /every rectangle is built/i })).toHaveFocus();
    expect(screen.getByText(/2 of 3 right on the first try\./i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'area-grid', completed: true, total: 3, correct: 2, mistakes: 1, perfect: false, score: 2 / 3 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(eventKeys(onEvent).filter((k) => k === 'round-correct')).toHaveLength(3);
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(1);

    // The per-round list is behind a small toggle.
    expect(screen.queryByRole('list', { name: 'Your rounds' })).not.toBeInTheDocument();
    const rounds = screen.getByRole('button', { name: /your rounds/i });
    await user.click(rounds);
    expect(rounds).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('list', { name: 'Your rounds' })).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByText(/first try|tries/i).textContent)).toEqual(['2 tries', 'First try', 'First try']);
    expect(items[0]).toHaveTextContent('Round 1: Area 12 square cmYou built 6 by 2');

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports a perfect run with the complete:perfect coach event', async () => {
    const { user, onEvent, onComplete } = setup();
    for (const [w, h] of [
      [3, 4],
      [3, 4],
      [3, 4],
    ]) {
      await build(user, w, h);
      await user.click(checkButton());
      await user.click(nextButton());
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: true, score: 1 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(screen.getByText(/3 of 3 right on the first try. Perfect!/i)).toBeInTheDocument();
  });

  it('animates only when motion is allowed', async () => {
    const still = setup();
    expect(still.container.querySelector('.animate-pulse')).toBeNull();
    await still.user.click(stepper('Width plus 1'));
    expect(still.container.querySelector('.animate-pop-in')).toBeNull();
    still.unmount();

    const moving = setup({ reducedMotion: false });
    expect(moving.container.querySelector('.animate-pulse')).not.toBeNull(); // the "start here" square
    await moving.user.click(stepper('Width plus 1'));
    expect(moving.container.querySelector('.animate-pop-in')).toHaveTextContent('1');
  });
});

describe.each(['touch', 'mouse'] as const)('Area Builder with a %s', (pointerType) => {
  it('drags from the top-left square to set the width and height, snapping to whole squares', () => {
    setup();
    layOutGrid();
    const notPrevented = fireEvent.pointerDown(grid(), { pointerType, pointerId: 7, button: 0, buttons: 1, ...at(0, 0) });
    // A mouse must not start selecting text; a finger is left alone.
    expect(notPrevented).toBe(pointerType === 'touch');
    expect(grid()).toHaveAccessibleName(/1 wide and 1 tall/);

    // Moves keep arriving on the grid (pointer capture); the position decides the square.
    fireEvent.pointerMove(grid(), { pointerType, pointerId: 7, buttons: 1, ...at(2, 1) });
    expect(grid()).toHaveAccessibleName(/3 wide and 2 tall/);
    fireEvent.pointerMove(grid(), { pointerType, pointerId: 7, buttons: 1, clientX: at(3, 3).clientX + 15, clientY: at(3, 3).clientY - 15 });
    expect(grid()).toHaveAccessibleName(/4 wide and 4 tall/);
    // Past the edge of the grid snaps to the last square.
    fireEvent.pointerMove(grid(), { pointerType, pointerId: 7, buttons: 1, clientX: 900, clientY: 900 });
    expect(grid()).toHaveAccessibleName(/8 wide and 6 tall/);
    fireEvent.pointerMove(grid(), { pointerType, pointerId: 7, buttons: 1, ...at(3, 2) });
    fireEvent.pointerUp(grid(), { pointerType, pointerId: 7, ...at(3, 2) });
    expect(grid()).toHaveAccessibleName(/4 wide and 3 tall/);
    expect(readout()).toHaveTextContent('Area: 12 square cm · Perimeter: 14 cm');

    // After release, moving does nothing; another pointer is ignored mid-drag.
    fireEvent.pointerMove(grid(), { pointerType, pointerId: 7, buttons: 0, ...at(0, 0) });
    expect(grid()).toHaveAccessibleName(/4 wide and 3 tall/);
    fireEvent.pointerDown(grid(), { pointerType, pointerId: 8, button: 0, buttons: 1, ...at(1, 1) });
    fireEvent.pointerMove(grid(), { pointerType, pointerId: 9, buttons: 1, ...at(5, 5) });
    expect(grid()).toHaveAccessibleName(/2 wide and 2 tall/);
  });
});
