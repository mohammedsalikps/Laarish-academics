import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { CircuitConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import CircuitLab from './CircuitLab';

const config: CircuitConfig = {
  type: 'circuit',
  items: [
    { id: 'nail', label: 'Iron nail', art: 'iron-nail', conducts: true, explanation: 'Iron is a metal. Metals let electricity pass through them.' },
    { id: 'eraser', label: 'Rubber eraser', art: 'rubber-eraser', conducts: false, explanation: 'Rubber does not let electricity pass through. It is an insulator.' },
    { id: 'coin', label: 'Steel coin', icon: 'coins', conducts: true, explanation: 'Steel is a metal, so it conducts electricity.' },
    { id: 'ruler', label: 'Plastic ruler', icon: 'ruler', conducts: false, explanation: 'Plastic is an insulator.' },
  ],
  rounds: [
    { id: 'light', prompt: 'Make the bulb light up.', goal: 'light-bulb', hint: 'Look for an object made of metal.', explanation: 'A metal object closes the circuit, so electricity can flow.' },
    { id: 'all', prompt: 'Test every object.', goal: 'test-all', hint: 'Put each object in the gap and turn the switch on.', explanation: 'Metals are conductors. Rubber and plastic are insulators.' },
  ],
};

function setup({ reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState({ grade: 6 }))}>
      <CircuitLab config={config} topicId="electric-circuits" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onComplete, onRestart, container: view.container, unmount: view.unmount };
}

const card = (label: string) => within(screen.getByRole('group', { name: 'Objects' })).getByRole('button', { name: new RegExp(`^${label}`, 'i') });
const switchButton = () => screen.getByRole('button', { name: /^switch (on|off)$/i });
const mainButton = () => screen.getByRole('button', { name: /continue$|^next$|^finish$/i });
const circuit = () => screen.getByRole('img', { name: /on-screen circuit/i });
const status = () => screen.getByRole('status');
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);
const lastEvent = (onEvent: Mock) => onEvent.mock.calls.at(-1)?.[0];

function rect(el: Element, left: number, top: number, width: number, height: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect);
}

/** Lights the bulb in the first round by tapping, then goes on to the test-all round. */
async function solveFirstRound(user: ReturnType<typeof userEvent.setup>) {
  await user.click(card('Iron nail'));
  await user.click(switchButton());
  await user.click(mainButton());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Circuit Lab (played through the UI)', () => {
  it('shows one task: the circuit, the switch, the objects, a safety line and one main button', async () => {
    const { user, onEvent } = setup();
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: 'Round 1 of 2: Make the bulb light up.' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Round progress' })).getAllByRole('listitem')).toHaveLength(2);
    expect(circuit()).toHaveAccessibleName(/The switch is off \(open\)\. The gap is empty\. The bulb is off\./);
    expect(screen.getByText('On-screen circuit only. Never touch wall sockets or mains electricity.')).toBeVisible();
    expect(within(screen.getByRole('group', { name: 'Objects' })).getAllByRole('button')).toHaveLength(4);
    expect(switchButton()).toHaveAccessibleName('Switch off');
    expect(switchButton()).toHaveAttribute('aria-pressed', 'false');
    expect(status()).toBeEmptyDOMElement();

    // The main button waits for a lit bulb, and says why when pressed too soon.
    expect(mainButton()).toHaveAccessibleName('Light the bulb to continue');
    expect(mainButton()).toHaveAttribute('aria-disabled', 'true');
    expect(mainButton()).toHaveAccessibleDescription(/put an object in the gap and turn the switch on/i);
    await user.click(mainButton());
    expect(status()).toHaveTextContent(/put an object in the gap and turn the switch on/i);
    expect(eventKeys(onEvent)).toEqual(['start']);
  });

  it('shows the picture of an object on its card and in the gap, hidden from screen readers', async () => {
    const { user } = setup();
    const picture = (el: Element) => el.querySelector('svg[viewBox="0 0 64 64"]');
    // The picture is decoration: the card is still named by the object alone.
    expect(card('Iron nail')).toHaveAccessibleName('Iron nail');
    expect(picture(card('Iron nail'))).toHaveAttribute('aria-hidden', 'true');
    // An object without a picture keeps its icon.
    expect(card('Steel coin')).toHaveAccessibleName('Steel coin');
    expect(picture(card('Steel coin'))).toBeNull();

    expect(picture(circuit())).toBeNull();
    await user.click(card('Iron nail'));
    expect(picture(circuit())).toHaveAttribute('aria-hidden', 'true');
    expect(circuit()).toHaveAccessibleName(/Iron nail is in the gap\./);
  });

  it('places an object by tapping, works the switch, and lights the bulb only for a conductor', async () => {
    const { user, onEvent, onComplete } = setup();

    // Tap an insulator into the gap: nothing happens until the switch is on.
    await user.click(card('Rubber eraser'));
    expect(card('Rubber eraser')).toHaveAttribute('aria-pressed', 'true');
    expect(circuit()).toHaveAccessibleName(/Rubber eraser is in the gap\. The bulb is off\./);
    expect(status()).toHaveTextContent('Now turn the switch on to test the rubber eraser.');
    expect(eventKeys(onEvent)).toEqual(['start']);

    await user.click(switchButton());
    expect(switchButton()).toHaveAccessibleName('Switch on');
    expect(switchButton()).toHaveAttribute('aria-pressed', 'true');
    expect(circuit()).toHaveAccessibleName(/switch is on \(closed\).*The bulb is off\./);
    expect(status()).toHaveTextContent('The bulb stays off: the rubber eraser does not let electricity through. Rubber eraser is an insulator. Try something made of metal.');
    expect(onEvent).toHaveBeenCalledWith({ key: 'bulb-off', vars: { item: 'Rubber eraser' } });
    expect(lastEvent(onEvent)).toEqual({ key: 'round-incorrect', vars: { hint: 'Rubber eraser is an insulator. Try something made of metal.' } });
    expect(mainButton()).toHaveAttribute('aria-disabled', 'true');

    // A second insulator (with the switch still on) brings the round's hint.
    await user.click(card('Plastic ruler'));
    expect(card('Rubber eraser')).toHaveAttribute('aria-pressed', 'false');
    expect(card('Plastic ruler')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('The bulb stays off: the plastic ruler does not let electricity through. Look for an object made of metal.');
    expect(lastEvent(onEvent)).toEqual({ key: 'round-incorrect', vars: { hint: 'Look for an object made of metal.' } });

    // Switch off: the circuit is open, so nothing lights and nothing is tested.
    await user.click(switchButton());
    expect(switchButton()).toHaveAccessibleName('Switch off');
    const before = onEvent.mock.calls.length;
    await user.click(card('Iron nail'));
    expect(onEvent.mock.calls.length).toBe(before);
    expect(circuit()).toHaveAccessibleName(/Iron nail is in the gap\. The bulb is off\./);
    expect(status()).toHaveTextContent('Now turn the switch on to test the iron nail.');

    // Switch on with a conductor: the bulb lights and the round is done.
    await user.click(switchButton());
    expect(circuit()).toHaveAccessibleName(/The bulb is lit\./);
    expect(status()).toHaveTextContent('The bulb lights: the iron nail lets electricity through. Iron is a metal. Metals let electricity pass through them.');
    expect(eventKeys(onEvent).slice(-2)).toEqual(['bulb-on', 'round-correct']);
    expect(onEvent).toHaveBeenCalledWith({ key: 'bulb-on', vars: { item: 'Iron nail' } });
    expect(lastEvent(onEvent)).toEqual({ key: 'round-correct', vars: { explanation: config.rounds[0].explanation } });
    expect(eventKeys(onEvent).filter((k) => k === 'round-incorrect')).toHaveLength(2);
    expect(mainButton()).toHaveAccessibleName('Next');
    expect(mainButton()).not.toHaveAttribute('aria-disabled', 'true');
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(mainButton());
    expect(screen.getByRole('heading', { name: 'Round 2 of 2: Test every object.' })).toHaveFocus();
    // A fresh circuit: empty gap, switch off.
    expect(switchButton()).toHaveAccessibleName('Switch off');
    expect(circuit()).toHaveAccessibleName(/The gap is empty\. The bulb is off\./);
  });

  it('plays by keyboard: Enter puts the focused object in, Escape takes it out', async () => {
    const { user, onEvent } = setup();
    card('Steel coin').focus();
    await user.keyboard('{Enter}');
    expect(card('Steel coin')).toHaveAttribute('aria-pressed', 'true');
    expect(circuit()).toHaveAccessibleName(/Steel coin is in the gap/);

    await user.keyboard('{Escape}');
    expect(card('Steel coin')).toHaveAttribute('aria-pressed', 'false');
    expect(circuit()).toHaveAccessibleName(/The gap is empty/);

    await user.keyboard('{Enter}');
    switchButton().focus();
    await user.keyboard('{Enter}');
    expect(switchButton()).toHaveAttribute('aria-pressed', 'true');
    expect(lastEvent(onEvent)).toMatchObject({ key: 'round-correct' });

    // Escape works from the switch too; the bulb goes out with the gap open again.
    await user.keyboard('{Escape}');
    expect(circuit()).toHaveAccessibleName(/The gap is empty\. The bulb is off\./);
    expect(status()).toHaveTextContent('The bulb stays off: there is a gap in the circuit.');
    expect(switchButton()).toHaveFocus();
  });

  describe.each(['touch', 'mouse'] as const)('dragging with a %s', (pointerType) => {
    it('drops an object on the gap; a missed drop puts it back', () => {
      const { onEvent, container } = setup();
      const gap = container.querySelector('[data-drop-zone="gap"]')!;
      rect(gap, 100, 300, 160, 52);
      rect(card('Iron nail'), 20, 500, 140, 52);

      // Turn the switch on first, so the drop tests the circuit straight away.
      fireEvent.click(switchButton());

      // A small wobble is still a tap, not a drag.
      fireEvent.pointerDown(card('Iron nail'), { pointerId: 3, pointerType, button: 0, clientX: 40, clientY: 520 });
      fireEvent.pointerMove(card('Iron nail'), { pointerId: 3, pointerType, clientX: 42, clientY: 521 });
      expect(document.querySelector('.fixed')).toBeNull();
      fireEvent.pointerUp(card('Iron nail'), { pointerId: 3, pointerType, clientX: 42, clientY: 521 });

      // A real drag: a copy of the card follows the pointer, where it was grabbed.
      const el = card('Iron nail');
      fireEvent.pointerDown(el, { pointerId: 5, pointerType, button: 0, clientX: 40, clientY: 520 });
      fireEvent.pointerMove(el, { pointerId: 5, pointerType, clientX: 60, clientY: 450 });
      const ghost = document.querySelector<HTMLElement>('.fixed')!;
      expect(ghost).toHaveTextContent('Iron nail');
      expect(ghost).toHaveStyle({ transform: 'translate3d(40px, 430px, 0)' });
      expect(status()).toHaveTextContent('Drop it in the gap.');

      // Let go far from the gap: it goes back and nothing is tested.
      fireEvent.pointerMove(el, { pointerId: 5, pointerType, clientX: 300, clientY: 700 });
      fireEvent.pointerUp(el, { pointerId: 5, pointerType, clientX: 300, clientY: 700 });
      expect(document.querySelector('.fixed')).toBeNull();
      expect(card('Iron nail')).toHaveAttribute('aria-pressed', 'false');
      expect(eventKeys(onEvent)).toEqual(['start']);

      // Over the gap the line says so; letting go puts it in and the bulb lights.
      fireEvent.pointerDown(el, { pointerId: 6, pointerType, button: 0, clientX: 40, clientY: 520 });
      fireEvent.pointerMove(el, { pointerId: 6, pointerType, clientX: 120, clientY: 400 });
      fireEvent.pointerMove(el, { pointerId: 6, pointerType, clientX: 180, clientY: 326 });
      expect(status()).toHaveTextContent('Let go to put it in the gap.');
      fireEvent.pointerUp(el, { pointerId: 6, pointerType, clientX: 180, clientY: 326 });
      expect(document.querySelector('.fixed')).toBeNull();
      expect(card('Iron nail')).toHaveAttribute('aria-pressed', 'true');
      expect(circuit()).toHaveAccessibleName(/Iron nail is in the gap\. The bulb is lit\./);
      expect(eventKeys(onEvent)).toEqual(['start', 'bulb-on', 'round-correct']);

      // A near miss just outside the gap still counts.
      rect(card('Rubber eraser'), 180, 500, 140, 52);
      const eraser = card('Rubber eraser');
      fireEvent.pointerDown(eraser, { pointerId: 7, pointerType, button: 0, clientX: 200, clientY: 520 });
      fireEvent.pointerMove(eraser, { pointerId: 7, pointerType, clientX: 190, clientY: 420 });
      fireEvent.pointerUp(eraser, { pointerId: 7, pointerType, clientX: 190, clientY: 370 });
      expect(card('Rubber eraser')).toHaveAttribute('aria-pressed', 'true');
      expect(lastEvent(onEvent)).toEqual({ key: 'bulb-off', vars: { item: 'Rubber eraser' } });
      // The round was already done, so this is not a mistake.
      expect(eventKeys(onEvent)).not.toContain('round-incorrect');

      // A drag that ends without a click never swallows the next key press (Enter = keydown, then click).
      fireEvent.keyDown(card('Steel coin'), { key: 'Enter' });
      fireEvent.click(card('Steel coin'));
      expect(card('Steel coin')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('fills the two result columns in the test-all round and finishes only when every object is tested', async () => {
    const { user, onEvent, onComplete } = setup();
    await solveFirstRound(user);
    const conductors = () => screen.getByRole('list', { name: 'Lets electricity through (conductors)' });
    const insulators = () => screen.getByRole('list', { name: 'Does not (insulators)' });
    expect(screen.getByText('0 of 4 objects tested')).toBeInTheDocument();
    expect(within(conductors()).queryAllByRole('listitem')).toHaveLength(0);
    expect(mainButton()).toHaveAccessibleName('Test every object to continue');

    // Placed but not tested yet (the switch is off).
    await user.click(card('Plastic ruler'));
    expect(within(insulators()).queryAllByRole('listitem')).toHaveLength(0);

    await user.click(switchButton());
    expect(within(insulators()).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Plastic ruler']);
    expect(status()).toHaveTextContent('The bulb stays off: the plastic ruler does not let electricity through. Plastic is an insulator.');
    expect(card('Plastic ruler')).toHaveAccessibleName(/tested/);

    await user.click(card('Steel coin'));
    expect(status()).toHaveTextContent('The bulb lights: the steel coin lets electricity through. Steel is a metal, so it conducts electricity.');
    await user.click(card('Rubber eraser'));
    expect(screen.getByText('3 of 4 objects tested')).toBeInTheDocument();
    expect(within(conductors()).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Steel coin']);
    expect(within(insulators()).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Plastic ruler', 'Rubber eraser']);
    expect(mainButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(mainButton());
    expect(status()).toHaveTextContent('3 of 4 tested.');

    await user.click(card('Iron nail'));
    expect(within(conductors()).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Steel coin', 'Iron nail']);
    expect(status()).toHaveTextContent('The bulb lights: the iron nail lets electricity through. Metals are conductors. Rubber and plastic are insulators.');
    expect(lastEvent(onEvent)).toEqual({ key: 'round-correct', vars: { explanation: config.rounds[1].explanation } });
    // An investigation: insulators are never mistakes.
    expect(eventKeys(onEvent)).not.toContain('round-incorrect');
    expect(mainButton()).toHaveAccessibleName('Finish');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes once with a perfect result, a short summary, Play again and a closed results list', async () => {
    const { user, onEvent, onComplete, onRestart } = setup();
    await solveFirstRound(user);
    await user.click(switchButton());
    for (const item of config.items) await user.click(card(item.label));
    await user.click(mainButton());

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toEqual({
      gameType: 'circuit',
      score: 1,
      correct: 2,
      total: 2,
      mistakes: 0,
      completed: true,
      perfect: true,
      summary: 'Finished 2 of 2 circuit rounds with 0 wrong tries',
    });
    expect(eventKeys(onEvent).at(-1)).toBe('complete:perfect');
    expect(eventKeys(onEvent).filter((k) => k.startsWith('complete'))).toHaveLength(1);

    expect(screen.getByRole('heading', { name: 'Circuit lab complete!' })).toHaveFocus();
    expect(screen.getByText('Every round right on the first try. Perfect!')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /your results/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Your results' })).not.toBeInTheDocument();
    expect(screen.getByText(config.items[0].explanation)).not.toBeVisible();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const results = screen.getByRole('list', { name: 'Your results' });
    expect(within(results).getAllByRole('listitem')).toHaveLength(4);
    expect(results).toHaveTextContent('Iron nail: conductor.');
    expect(results).toHaveTextContent('Rubber eraser: insulator.');
    expect(within(results).getByText(config.items[1].explanation)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports mistakes from the light-bulb round (complete, not perfect)', async () => {
    const { user, onEvent, onComplete } = setup();
    await user.click(switchButton());
    await user.click(card('Rubber eraser'));
    await user.click(card('Rubber eraser')); // out again
    await user.click(card('Rubber eraser')); // the same insulator again is not a new mistake
    await user.click(card('Iron nail'));
    await user.click(mainButton());
    await user.click(switchButton());
    for (const item of config.items) await user.click(card(item.label));
    await user.click(mainButton());

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, perfect: false, correct: 1, total: 2, mistakes: 1, score: 0.5 });
    expect(eventKeys(onEvent).at(-1)).toBe('complete');
    expect(screen.getByText('1 of 2 rounds right on the first try.')).toBeInTheDocument();
  });

  it('glows and swings only when motion is allowed', async () => {
    const lever = (container: HTMLElement) => container.querySelector<SVGGElement>('svg g[style]')!;
    const still = setup();
    await still.user.click(card('Iron nail'));
    await still.user.click(switchButton());
    expect(circuit()).toHaveAccessibleName(/The bulb is lit/);
    expect(still.container.querySelector('.animate-pulse')).toBeNull();
    expect(lever(still.container).style.transition).toBe('none');
    expect(still.container.querySelector('.animate-fade-up, .animate-pop-in')).toBeNull();
    still.unmount();

    const moving = setup({ reducedMotion: false });
    await moving.user.click(card('Iron nail'));
    await moving.user.click(switchButton());
    expect(moving.container.querySelector('.animate-pulse')).not.toBeNull();
    expect(lever(moving.container).style.transition).toContain('transform');
  });
});
