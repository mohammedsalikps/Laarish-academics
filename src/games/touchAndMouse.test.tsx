/**
 * The same drags must work with a finger and with a mouse. On a touch screen
 * the browser captures the pointer, so every move arrives on the element where
 * the finger first landed; the games hit-test where the finger is now.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../shared/curriculum';
import type { FractionBuilderConfig, PushBoxConfig } from '../domain/types';
import { MemoryProgressRepository } from '../state/persistence';
import { ProgressProvider } from '../state/ProgressProvider';
import { learnerState } from '../test/fixtures';
import FractionBuilder from './fraction/FractionBuilder';
import { beginPointerDrag } from './framework';
import PushBox from './pushbox/PushBox';

const POINTERS = ['touch', 'mouse'] as const;

function renderGame(game: ReactElement) {
  render(<ProgressProvider repository={new MemoryProgressRepository(learnerState())}>{game}</ProgressProvider>);
  return userEvent.setup();
}

const gameProps = (topicId: string) => ({ topicId, attempt: 0, reducedMotion: true, onEvent: vi.fn(), onComplete: vi.fn(), onRestart: vi.fn() });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('beginPointerDrag', () => {
  it('captures the pointer for both, and blocks text selection only for a mouse (a finger still scrolls the page)', () => {
    for (const pointerType of POINTERS) {
      const preventDefault = vi.fn();
      const setPointerCapture = vi.fn();
      beginPointerDrag({ pointerType, pointerId: 4, preventDefault, currentTarget: { setPointerCapture } as unknown as Element });
      expect(setPointerCapture).toHaveBeenCalledWith(4);
      expect(preventDefault).toHaveBeenCalledTimes(pointerType === 'mouse' ? 1 : 0);
    }
  });
});

describe.each(POINTERS)('Push the Box with a %s', (pointerType) => {
  it('chooses a floor by tapping and sets the push by dragging the slider', async () => {
    const config = getTopic('friction-what-is')!.play.game as PushBoxConfig;
    const user = renderGame(<PushBox config={config} {...gameProps('friction-what-is')} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Floor' })).getByRole('radio', { name: /ice/i }));

    const slider = screen.getByRole('slider', { name: /push strength/i });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 356, height: 84, right: 356, bottom: 84, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    fireEvent.pointerDown(slider, { pointerType, pointerId: 9, clientX: 28, button: 0, buttons: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    fireEvent.pointerMove(slider, { pointerType, pointerId: 9, clientX: 328, buttons: 1 });
    expect(slider).toHaveAttribute('aria-valuenow', String(config.pushLabels.length));
    fireEvent.pointerUp(slider, { pointerType, pointerId: 9, clientX: 328 });
    expect(screen.getByRole('button', { name: /^push!$/i })).toBeEnabled();
  });
});

describe.each(POINTERS)('Fair Share Kitchen with a %s', (pointerType) => {
  it('shades a piece on tap and paints across pieces with one drag', () => {
    const config = getTopic('fractions-halves')!.play.game as FractionBuilderConfig;
    renderGame(<FractionBuilder config={config} {...gameProps('fractions-halves')} />);
    const part = (n: number) => screen.getByRole('button', { name: `Part ${n} of 2` });

    // The finger lands on part 1, then slides over part 2. Moves keep arriving on part 1.
    const under = vi.fn(() => part(1));
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: under });
    fireEvent.pointerDown(part(1), { pointerType, pointerId: 5, button: 0, buttons: 1, clientX: 10, clientY: 10 });
    expect(part(1)).toHaveAttribute('aria-pressed', 'true');
    under.mockReturnValue(part(2));
    fireEvent.pointerMove(part(1), { pointerType, pointerId: 5, buttons: 1, clientX: 200, clientY: 10 });
    fireEvent.pointerUp(part(1), { pointerType, pointerId: 5, clientX: 200, clientY: 10 });
    expect([part(1), part(2)].map((p) => p.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
    expect(screen.getByText(/2 of 2 equal parts shaded/)).toBeInTheDocument();
    delete (document as { elementFromPoint?: unknown }).elementFromPoint;
  });
});
