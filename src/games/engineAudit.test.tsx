import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TOPICS, getTopic } from '../../shared/curriculum';
import type { BalanceGameConfig, CircuitConfig, ConceptMatchConfig, FrictionExperimentConfig, PushBoxConfig } from '../domain/types';
import { MemoryProgressRepository } from '../state/persistence';
import { ProgressProvider } from '../state/ProgressProvider';
import { learnerState } from '../test/fixtures';
import type { HintContext } from './framework';
import FrictionExperiment from './friction/FrictionExperiment';
import ConceptMatch from './match/ConceptMatch';
import PushBox from './pushbox/PushBox';
import { GAMES } from './registry';

/** Fixes from the per-engine audit (summit release), checked one by one. */

const gamesOf = <T,>(type: string) => TOPICS.map((t) => t.play.game).filter((g) => g.type === type) as T[];
const wrap = (ui: React.ReactNode) => render(<ProgressProvider repository={new MemoryProgressRepository(learnerState())}>{ui}</ProgressProvider>);
const noop = () => {};

describe('mission and instruction wording', () => {
  it('Balance names "the missing number" instead of printing "finding ?."', () => {
    for (const c of gamesOf<BalanceGameConfig>('balance')) {
      const text = [GAMES.balance.goal(c), ...GAMES.balance.instructions(c)].join(' ');
      expect(text).not.toMatch(/finding \?|for \?\./);
      if (c.unknownLabel === '?') expect(GAMES.balance.goal(c)).toMatch(/finding the missing number\.$/);
    }
  });

  it('Circuit describes both parts when a topic lights the bulb and tests objects, and names the real switch button', () => {
    for (const c of gamesOf<CircuitConfig>('circuit')) {
      const light = c.rounds.some((r) => r.goal === 'light-bulb');
      const test = c.rounds.some((r) => r.goal === 'test-all');
      if (light && test) expect(GAMES.circuit.goal(c)).toMatch(/^Light the bulb, then test all \d+ objects/);
      expect(GAMES.circuit.instructions(c).join(' ')).toMatch(/Press the switch to turn it on/);
    }
  });

  it('Friction mentions the last question, and the push buttons only for challenges that use them', () => {
    const c = getTopic('friction-rough-smooth')!.play.game as FrictionExperimentConfig;
    expect(GAMES['friction-experiment'].goal(c)).toMatch(/and answer one last question\.$/);
    const steps = GAMES['friction-experiment'].instructions(c);
    expect(steps.find((s) => /Low, Middle or Top/.test(s))).toMatch(/^In some challenges/);
  });
});

describe('keyboard focus stays in the game', () => {
  it('Friction: after Start the result card holds focus (Start itself is gone)', async () => {
    const user = userEvent.setup();
    const config = getTopic('friction-rough-smooth')!.play.game as FrictionExperimentConfig;
    wrap(<FrictionExperiment config={config} topicId="t" attempt={0} reducedMotion onEvent={noop} onComplete={noop} onRestart={noop} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Surface' })).getByRole('radio', { name: /grass/i }));
    await user.click(within(screen.getByRole('radiogroup', { name: 'Prediction' })).getByRole('radio', { name: /short/i }));
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await screen.findByText(/you predicted/i);
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement).toHaveTextContent(/on grass/i);
  });

  it('Push Box: focus returns to Push! after the box has moved', async () => {
    const user = userEvent.setup();
    const config = getTopic('friction-what-is')!.play.game as PushBoxConfig;
    wrap(<PushBox config={config} topicId="t" attempt={0} reducedMotion onEvent={noop} onComplete={noop} onRestart={noop} />);
    await user.click(within(screen.getByRole('radiogroup', { name: 'Floor' })).getAllByRole('radio')[0]);
    screen.getByRole('slider', { name: /push strength/i }).focus();
    await user.keyboard('{End}');
    await user.click(screen.getByRole('button', { name: /^push!$/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /pushing/i })).toBeNull());
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect((document.activeElement as HTMLButtonElement).disabled).not.toBe(true);
  });
});

describe('coach and hints', () => {
  it('Friction says the challenges are ready once enough surfaces are tested', async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    const config = getTopic('friction-rough-smooth')!.play.game as FrictionExperimentConfig;
    wrap(<FrictionExperiment config={config} topicId="t" attempt={0} reducedMotion onEvent={onEvent} onComplete={noop} onRestart={noop} />);
    for (const [s, b] of [
      [/polished wood/i, /far/i],
      [/gravel/i, /short/i],
    ] as const) {
      if (screen.queryByRole('button', { name: /try another surface/i })) await user.click(screen.getByRole('button', { name: /try another surface/i }));
      await user.click(within(screen.getByRole('radiogroup', { name: 'Surface' })).getByRole('radio', { name: s }));
      await user.click(within(screen.getByRole('radiogroup', { name: 'Prediction' })).getByRole('radio', { name: b }));
      await user.click(screen.getByRole('button', { name: /^start$/i }));
      await screen.findByText(/you predicted/i);
    }
    await waitFor(() => expect(onEvent).toHaveBeenCalledWith({ key: 'challenges-ready' }), { timeout: 3500 });
  });

  it('Match: after a wrong try, "Need a hint?" is about the card just tried', async () => {
    const user = userEvent.setup();
    const reports: (HintContext | null)[] = [];
    const config = getTopic('friction-helps-us')!.play.game as ConceptMatchConfig;
    wrap(<ConceptMatch config={config} topicId="t" attempt={0} reducedMotion onEvent={noop} onComplete={noop} onRestart={noop} onHintContext={(c) => reports.push(c)} />);
    const shoes = config.pairs.find((p) => /shoe/i.test(p.left))!;
    const wrongRight = config.pairs.find((p) => p.id !== shoes.id)!.right;
    await user.click(within(screen.getByRole('list', { name: 'Example' })).getByRole('button', { name: new RegExp(shoes.left.slice(0, 12), 'i') }));
    const concepts = screen.getByRole('list', { name: config.rightLabel });
    await user.click(within(concepts).getByRole('button', { name: new RegExp(wrongRight.slice(0, 12), 'i') }));
    expect(reports.at(-1)?.key).toBe(`match:${shoes.id}`);
    expect(reports.at(-1)?.steps).toContain(shoes.hint);
  });
});
