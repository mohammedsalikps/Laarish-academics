import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { FrictionExperimentConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import FrictionExperiment from './FrictionExperiment';

const config = getTopic('friction-rough-smooth')!.play.game as FrictionExperimentConfig;

function setup() {
  const onEvent = vi.fn();
  const onRecord = vi.fn();
  const onComplete = vi.fn();
  render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState())}>
      <FrictionExperiment config={config} topicId="friction-rough-smooth" attempt={0} reducedMotion onEvent={onEvent} onRecord={onRecord} onComplete={onComplete} onRestart={() => {}} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onRecord, onComplete };
}

const surface = (name: RegExp) => within(screen.getByRole('radiogroup', { name: 'Surface' })).getByRole('radio', { name });
const height = (name: RegExp) => within(screen.getByRole('radiogroup', { name: 'Ramp height' })).getByRole('radio', { name });
const band = (name: RegExp) => within(screen.getByRole('radiogroup', { name: 'Prediction' })).getByRole('radio', { name });

describe('Friction Lab (played through the UI)', () => {
  it('shows one step at a time: surface, then prediction, then Start', async () => {
    const { user, onRecord } = setup();
    // First only the surface choice: no prediction, no Start, no push control.
    expect(screen.getByRole('radiogroup', { name: 'Surface' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Prediction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Ramp height' })).not.toBeInTheDocument();

    await user.click(surface(/polished wood/i));
    expect(screen.queryByRole('radiogroup', { name: 'Surface' })).not.toBeInTheDocument();
    expect(screen.getByText(/how far will the car roll on polished wood/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();

    await user.click(band(/far/i));
    await user.click(screen.getByRole('button', { name: /^start$/i }));

    expect(await screen.findByText(/4\.6 m on polished wood/i)).toBeInTheDocument();
    expect(screen.getByText(/you predicted far\. right!/i)).toBeInTheDocument();
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ surfaceId: 'wood', height: 'top', predictionCorrect: true, mode: 'explore' })));

    // Results are folded away until asked for.
    expect(screen.queryByRole('list', { name: /distance comparison/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /my results/i }));
    expect(screen.getByRole('list', { name: /distance comparison/i })).toBeInTheDocument();
  });

  it('can be completed without a tutorial: explore, three challenges, then one question', async () => {
    const { user, onComplete, onEvent } = setup();
    const explore = async (s: RegExp, b: RegExp) => {
      await user.click(surface(s));
      await user.click(band(b));
      await user.click(screen.getByRole('button', { name: /^start$/i }));
      await screen.findByText(/you predicted/i);
    };
    await explore(/polished wood/i, /far/i);
    await user.click(screen.getByRole('button', { name: /try another surface/i }));
    await explore(/gravel/i, /short/i);
    expect(screen.getByText(/same push, different surfaces: polished wood 4\.6 m · gravel track 0\.8 m/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    // Challenge 1: free choice of surface and push. A wrong try first.
    await user.click(screen.getByRole('button', { name: /try the challenges/i }));
    expect(screen.getByRole('region', { name: /challenge 1 of 3/i })).toHaveTextContent(/make the car roll far/i);
    expect(screen.getByRole('radiogroup', { name: 'Ramp height' })).toBeInTheDocument();
    await user.click(surface(/grass/i));
    await user.click(screen.getByRole('button', { name: /test it/i }));
    expect(await screen.findByText(/it stopped in the medium zone, not far/i)).toBeInTheDocument();
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ key: 'challenge-retry' })));
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await user.click(surface(/polished wood/i));
    await user.click(screen.getByRole('button', { name: /test it/i }));
    expect(await screen.findByText(/challenge solved/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next challenge/i }));

    // Challenge 2: the surface stays; only the push can change.
    expect(screen.queryByRole('radiogroup', { name: 'Surface' })).not.toBeInTheDocument();
    await user.click(height(/low/i));
    await user.click(screen.getByRole('button', { name: /test it/i }));
    expect(await screen.findByText(/challenge solved/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next challenge/i }));

    // Challenge 3: the push stays; only the surface can change.
    expect(screen.queryByRole('radiogroup', { name: 'Ramp height' })).not.toBeInTheDocument();
    await user.click(surface(/grass/i));
    await user.click(screen.getByRole('button', { name: /test it/i }));
    expect(await screen.findByText(/challenge solved/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    // The concept check: a hint after a wrong answer, then the lab is complete.
    await user.click(screen.getByRole('button', { name: /last question/i }));
    const answers = screen.getByRole('radiogroup', { name: 'Answer' });
    await user.click(within(answers).getByRole('radio', { name: /more friction/i }));
    expect(screen.getByText(/which surface had fewer bumps/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    await user.click(within(answers).getByRole('radio', { name: /less friction to slow the car/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'friction-experiment', completed: true, total: 6, correct: 4 });
    expect(screen.getByText(/lab complete!/i)).toBeInTheDocument();
    // The delayed "all challenges done" line was cancelled: the mentor's last word stays on the answer.
    await new Promise((r) => setTimeout(r, 2400));
    expect(onEvent.mock.calls.at(-1)?.[0]).toEqual({ key: 'check-correct' });
  });
});
