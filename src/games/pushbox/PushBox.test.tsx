import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { PushBoxConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import PushBox from './PushBox';

const config = getTopic('friction-what-is')!.play.game as PushBoxConfig;
const grip = (id: string) => config.floors.find((f) => f.id === id)!.grip;
const explanation = (id: string) => config.floors.find((f) => f.id === id)!.explanation;

function setup() {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const utils = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <PushBox config={config} topicId="friction-what-is" attempt={0} reducedMotion onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, ...utils };
}

type User = ReturnType<typeof userEvent.setup>;
const RESULT_TITLE = /^(it slid|the box did not move|you moved the box)/i;
const floor = (name: RegExp) => within(screen.getByRole('radiogroup', { name: 'Floor' })).getByRole('radio', { name });
const slider = () => screen.getByRole('slider', { name: /push strength/i });
const pushButton = () => screen.getByRole('button', { name: /^push!$/i });
const feedback = () => screen.getByText(RESULT_TITLE).closest('[role="status"]') as HTMLElement;

/** Sets the push with the keyboard, the accessible alternative to dragging. */
async function setPush(user: User, level: number) {
  slider().focus();
  await user.keyboard('{Home}');
  for (let i = 1; i < level; i++) await user.keyboard('{ArrowRight}');
  expect(slider()).toHaveAttribute('aria-valuenow', String(level));
}

async function pushOn(user: User, name: RegExp, level: number) {
  await user.click(floor(name));
  await setPush(user, level);
  await user.click(pushButton());
  await screen.findByText(RESULT_TITLE);
}

describe('Push the Box (played through the UI)', () => {
  it('guides the first move one step at a time, then shows balanced forces when the box does not move', async () => {
    const { user, onEvent } = setup();
    expect(onEvent).toHaveBeenCalledWith({ key: 'start' });
    expect(screen.getByText(`0 of ${config.floors.length} floors moved`)).toBeInTheDocument();

    // Step 1: only the floors are offered; the push controls are not shown yet.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^push!$/i })).not.toBeInTheDocument();

    await user.click(floor(/carpet/i));
    expect(floor(/carpet/i)).toHaveAttribute('aria-checked', 'true');
    expect(onEvent).toHaveBeenCalledWith({ key: 'floor-selected:carpet' });

    // Step 2: the force slider appears; Push! waits until a push has been chosen.
    expect(slider()).toHaveAttribute('aria-valuenow', '1');
    expect(screen.queryByRole('button', { name: /^push!$/i })).not.toBeInTheDocument();

    // Keyboard control of the force slider.
    slider().focus();
    await user.keyboard('{End}');
    expect(slider()).toHaveAttribute('aria-valuenow', String(config.pushLabels.length));
    await user.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuenow', '3');
    expect(slider()).toHaveAttribute('aria-valuetext', `${config.pushLabels[2]} push, 3 of ${config.pushLabels.length}`);

    // Step 3: Push! Carpet grips as hard as a medium push, so friction balances it.
    expect(pushButton()).toBeEnabled();
    await user.click(pushButton());
    expect(screen.getByRole('button', { name: /pushing/i })).toBeDisabled();
    expect(await screen.findByText('The box did not move.')).toBeInTheDocument();
    expect(feedback()).toHaveTextContent(/friction pushed back just as hard as your push/i);
    expect(feedback()).not.toHaveTextContent(/bigger/i); // no hint after a single try
    expect(screen.getByRole('img', { name: /did not move/i })).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'push-stuck' })));

    // The result takes the slider's place: the one next step is to try again.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(pushButton()).toBeEnabled();
    expect(slider()).toHaveAttribute('aria-valuenow', '3');
    expect(screen.queryByText('The box did not move.')).not.toBeInTheDocument();
    expect(screen.queryByText('Balanced')).not.toBeInTheDocument();
  });

  it('hints only after repeated stuck pushes, then explains the move in one sentence', async () => {
    const { user, onEvent } = setup();
    await pushOn(user, /carpet/i, 1);
    expect(feedback()).not.toHaveTextContent(/bigger/i);
    await pushOn(user, /carpet/i, 2);
    expect(feedback()).toHaveTextContent(/bigger than small/i);
    await pushOn(user, /carpet/i, grip('carpet'));
    expect(feedback()).toHaveTextContent(/try the big push/i);

    // The hint stays beside the slider for the next try.
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText(/try the big push/i)).toBeInTheDocument();

    await pushOn(user, /carpet/i, grip('carpet') + 1);
    expect(screen.getByText('It slid 1.5 steps!')).toBeInTheDocument();
    const [firstSentence] = explanation('carpet').split(/(?<=\.)\s/);
    expect(feedback()).toHaveTextContent(firstSentence);
    expect(feedback()).not.toHaveTextContent(explanation('carpet'));
    expect(feedback()).toHaveTextContent(/smallest push/i);
    expect(screen.queryByText(/try the big push/i)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /slid 1.5 steps on the carpet/i })).toBeInTheDocument();
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'push-moved' })));
    expect(screen.getByText(`1 of ${config.floors.length} floors moved`)).toBeInTheDocument();

    // Next floor moves on to a floor where the box has not moved yet.
    await user.click(screen.getByRole('button', { name: /next floor/i }));
    expect(floor(/wooden floor/i)).toHaveAttribute('aria-checked', 'true');
    expect(onEvent).toHaveBeenCalledWith({ key: 'floor-selected:wood' });
    expect(pushButton()).toBeEnabled();
  });

  it('completes once every floor has moved, reporting the result exactly once', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();
    await pushOn(user, /carpet/i, grip('carpet') + 1);
    await pushOn(user, /wooden floor/i, grip('wood') + 1);
    expect(onComplete).not.toHaveBeenCalled();
    await pushOn(user, /ice/i, grip('ice') + 1);

    // Results are reported from an effect just after the result shows.
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'push-box', completed: true, perfect: true, score: 1, total: config.floors.length });
    expect(screen.getByText('You moved the box on every floor!')).toBeInTheDocument();
    expect(feedback()).toHaveTextContent(/carpet pushed back the hardest, and ice the least/i);
    expect(screen.getByText(`All ${config.floors.length} floors moved`)).toBeInTheDocument();
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith({ key: 'complete' }), { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);

    // Exploring further shows normal results and never reports again.
    await pushOn(user, /ice/i, config.pushLabels.length);
    expect(screen.getByText(/^it slid/i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the results notebook behind a "My results" toggle that is closed by default', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: /my results/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /my results/i })).not.toBeInTheDocument();

    await pushOn(user, /carpet/i, 1);
    await pushOn(user, /ice/i, grip('ice') + 1);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('region', { name: /my results/i });
    expect(toggle).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByText(/not moved yet \(1 try\)/i)).toBeInTheDocument();
    expect(within(panel).getByText(/moved with small \(2\)/i)).toBeInTheDocument();
    expect(within(panel).getByText('Not tried')).toBeInTheDocument();
    expect(panel).toHaveTextContent(`smallest push found on 1 of ${config.floors.length} floors`);
    expect(panel).toHaveTextContent(/model note/i);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /my results/i })).not.toBeInTheDocument();
  });

  it('sets the push by dragging the slider or the hand in the scene', async () => {
    const { user, container } = setup();
    await user.click(floor(/ice/i));
    const rect = (width: number) => ({ left: 0, top: 0, width, height: 84, right: width, bottom: 84, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    // Slider: the thumb (56px) travels between 28px and width - 28px.
    const s = slider();
    vi.spyOn(s, 'getBoundingClientRect').mockReturnValue(rect(356));
    fireEvent.pointerDown(s, { clientX: 328, pointerId: 1 });
    expect(s).toHaveAttribute('aria-valuenow', String(config.pushLabels.length));
    expect(pushButton()).toBeEnabled(); // choosing a push reveals Push!
    fireEvent.pointerMove(s, { clientX: 178, pointerId: 1 });
    expect(s).toHaveAttribute('aria-valuenow', '3');
    fireEvent.pointerUp(s, { pointerId: 1 });
    fireEvent.pointerMove(s, { clientX: 28, pointerId: 1 });
    expect(s).toHaveAttribute('aria-valuenow', '3');

    // Scene: pulling the hand far back from the box is the biggest push; close to the box, the smallest.
    const zone = container.querySelector<HTMLDivElement>('[data-drag="push-arrow"]')!;
    vi.spyOn(zone, 'getBoundingClientRect').mockReturnValue(rect(178));
    fireEvent.pointerDown(zone, { clientX: 0, pointerId: 2 });
    expect(s).toHaveAttribute('aria-valuenow', String(config.pushLabels.length));
    fireEvent.pointerMove(zone, { clientX: 170, pointerId: 2 });
    expect(s).toHaveAttribute('aria-valuenow', '1');
    fireEvent.pointerUp(zone, { pointerId: 2 });
  });
});
