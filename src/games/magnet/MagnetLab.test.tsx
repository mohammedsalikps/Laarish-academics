import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { getTopic } from '../../../shared/curriculum';
import type { MagnetLabConfig } from '../../domain/types';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import MagnetLab from './MagnetLab';

const objectsConfig = getTopic('magnets-what-they-attract')!.play.game as MagnetLabConfig;
const polesConfig = getTopic('magnets-poles')!.play.game as MagnetLabConfig;

function setup(config: MagnetLabConfig, { reducedMotion = true } = {}) {
  const onEvent = vi.fn();
  const onRecord = vi.fn();
  const onComplete = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState({ grade: 6 }))}>
      <MagnetLab config={config} topicId="magnets" attempt={0} reducedMotion={reducedMotion} onEvent={onEvent} onRecord={onRecord} onComplete={onComplete} onRestart={onRestart} />
    </ProgressProvider>,
  );
  return { user: userEvent.setup(), onEvent, onRecord, onComplete, onRestart, container: view.container };
}

const objects = () => screen.getByRole('group', { name: 'Objects' });
const card = (label: string) => within(objects()).getByRole('button', { name: new RegExp(`^${label}`, 'i') });
const mainButton = () => screen.getByRole('button', { name: /continue$|^next$|^finish$/i });
const status = () => screen.getByRole('status');
const eventKeys = (onEvent: Mock) => onEvent.mock.calls.map(([e]) => e.key as string);
const lastEvent = (onEvent: Mock) => onEvent.mock.calls.at(-1)?.[0];

function rect(el: Element, left: number, top: number, width: number, height: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect);
}

async function testAll(user: ReturnType<typeof userEvent.setup>, labels: string[]) {
  for (const label of labels) await user.click(card(label));
}

const labelsOf = (config: MagnetLabConfig, index: number) => {
  const round = config.rounds[index];
  if (round.kind === 'poles') return [];
  return round.objectIds.map((id) => config.objects.find((o) => o.id === id)!.label);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Magnet Explorer: which objects does a magnet pull?', () => {
  it('starts with one clear task, the workbench, the objects, an honest model note and one waiting main button', async () => {
    const { user, onEvent } = setup(objectsConfig);
    expect(eventKeys(onEvent)).toEqual(['start']);
    expect(screen.getByRole('heading', { name: /^Round 1 of 3: Bring each object close to the magnet/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Workbench with a horseshoe magnet\. Bring an object close/ })).toBeInTheDocument();
    expect(within(objects()).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByText(/A simplified model\. Real magnets get weaker with distance/)).toBeVisible();
    expect(mainButton()).toHaveAccessibleName('Test every object to continue');
    expect(mainButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(mainButton());
    expect(status()).toHaveTextContent('Bring each object to the magnet. 0 of 5 tested.');
  });

  it('tests objects by tapping: iron and steel are pulled across the gap, other materials are not', async () => {
    const { user, onEvent, onRecord } = setup(objectsConfig);
    await user.click(card('Iron nail'));
    expect(card('Iron nail')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /Iron nail is next to the magnet\. The magnet pulled it/ })).toBeInTheDocument();
    expect(status()).toHaveTextContent('The magnet pulled the iron nail across the gap, before they even touched! Nails are made of iron, and magnets pull iron.');
    expect(lastEvent(onEvent)).toEqual({ key: 'pulled', vars: { object: 'Iron nail', explanation: 'Nails are made of iron, and magnets pull iron.' } });
    expect(onRecord).toHaveBeenLastCalledWith({ kind: 'observation', text: 'Magnet Explorer: the magnet pulled the iron nail (made of iron).' });

    await user.click(card('Wooden block'));
    expect(status()).toHaveTextContent('Nothing happened: the magnet does not pull the wooden block. Wood is not magnetic.');
    expect(lastEvent(onEvent)).toMatchObject({ key: 'not-pulled' });
    expect(within(screen.getByRole('list', { name: 'Pulled by the magnet' })).getByText('Iron nail')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Not pulled' })).getByText('Wooden block')).toBeInTheDocument();

    // Escape (or tapping it again) takes the object off the magnet.
    fireEvent.keyDown(card('Wooden block'), { key: 'Escape' });
    expect(card('Wooden block')).toHaveAttribute('aria-pressed', 'false');

    await testAll(user, ['Steel paper clip', 'Plastic ruler', 'Rubber eraser']);
    expect(eventKeys(onEvent)).toContain('round-correct');
    expect(status()).toHaveTextContent('The magnet pulled the iron nail and the steel paper clip. It did not pull wood, plastic or rubber.');
    expect(mainButton()).toHaveAccessibleName('Next');
    await user.click(mainButton());
    expect(screen.getByRole('heading', { name: /^Round 2 of 3: Is every metal magnetic\?/ })).toHaveFocus();
  });

  describe.each(['touch', 'mouse'] as const)('dragging with a %s', (pointerType) => {
    it('drops an object near the magnet to test it; a missed drop puts it back', () => {
      const { onEvent, container } = setup(objectsConfig);
      rect(container.querySelector('[data-drop-zone="magnet"]')!, 100, 100, 300, 160);
      const el = card('Steel paper clip');
      rect(el, 20, 500, 150, 60);

      fireEvent.pointerDown(el, { pointerId: 2, pointerType, button: 0, clientX: 40, clientY: 520 });
      fireEvent.pointerMove(el, { pointerId: 2, pointerType, clientX: 60, clientY: 440 });
      expect(document.querySelector<HTMLElement>('.fixed')).toHaveTextContent('Steel paper clip');
      expect(status()).toHaveTextContent('Bring it close to the magnet.');
      fireEvent.pointerMove(el, { pointerId: 2, pointerType, clientX: 60, clientY: 700 });
      fireEvent.pointerUp(el, { pointerId: 2, pointerType, clientX: 60, clientY: 700 });
      expect(document.querySelector('.fixed')).toBeNull();
      expect(eventKeys(onEvent)).toEqual(['start']);

      fireEvent.pointerDown(el, { pointerId: 3, pointerType, button: 0, clientX: 40, clientY: 520 });
      fireEvent.pointerMove(el, { pointerId: 3, pointerType, clientX: 200, clientY: 200 });
      expect(status()).toHaveTextContent('Let go near the magnet.');
      fireEvent.pointerUp(el, { pointerId: 3, pointerType, clientX: 200, clientY: 200 });
      expect(card('Steel paper clip')).toHaveAttribute('aria-pressed', 'true');
      expect(lastEvent(onEvent)).toMatchObject({ key: 'pulled', vars: { object: 'Steel paper clip' } });
    });
  });

  it('teaches that not every metal is magnetic, then sorts new objects by tap, keyboard and drag', async () => {
    const { user, onEvent, container } = setup(objectsConfig);
    await testAll(user, labelsOf(objectsConfig, 0));
    await user.click(mainButton());
    for (const label of labelsOf(objectsConfig, 1)) {
      await user.click(card(label));
      expect(status()).toHaveTextContent(/Nothing happened/);
    }
    expect(status()).toHaveTextContent('Copper, brass and aluminium are metals, but a magnet does not pull them.');
    await user.click(mainButton());

    // Sort: pick an object, then a tray. A wrong tray is a gentle mistake with a nudge.
    expect(screen.getByRole('heading', { name: /^Round 3 of 3: Challenge: sort these objects/ })).toBeInTheDocument();
    const tray = (name: RegExp) => screen.getByRole('button', { name });
    await user.click(card('Glass marble'));
    expect(status()).toHaveTextContent('Now choose a tray for glass marble.');
    await user.click(tray(/^Magnetic tray/));
    expect(status()).toHaveTextContent('Not that tray. Think about what the glass marble is made of.');
    expect(lastEvent(onEvent)).toEqual({ key: 'sort-incorrect', vars: { object: 'Glass marble', hint: 'Think about what the glass marble is made of.' } });

    // The marble stays picked up, so the other tray is one tap away.
    expect(card('Glass marble')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tray(/^Not magnetic tray/));
    expect(within(objects()).queryByRole('button', { name: /^Glass marble/ })).toBeNull();
    expect(tray(/^Not magnetic tray/)).toHaveAccessibleName(/1 object in it/);

    // Keyboard: Enter on the object, then on the tray.
    card('Iron bolt').focus();
    await user.keyboard('{Enter}');
    expect(card('Iron bolt')).toHaveAttribute('aria-pressed', 'true');
    tray(/^Magnetic tray/).focus();
    await user.keyboard('{Enter}');
    expect(within(objects()).queryByRole('button', { name: /^Iron bolt/ })).toBeNull();

    // Drag onto a tray.
    rect(tray(/^Magnetic tray/), 10, 400, 170, 130);
    rect(tray(/^Not magnetic tray/), 200, 400, 170, 130);
    const pin = card('Steel safety pin');
    rect(pin, 20, 200, 150, 60);
    fireEvent.pointerDown(pin, { pointerId: 9, pointerType: 'touch', button: 0, clientX: 40, clientY: 220 });
    fireEvent.pointerMove(pin, { pointerId: 9, pointerType: 'touch', clientX: 80, clientY: 450 });
    expect(status()).toHaveTextContent('Let go to put it in Magnetic.');
    fireEvent.pointerUp(pin, { pointerId: 9, pointerType: 'touch', clientX: 80, clientY: 450 });
    expect(lastEvent(onEvent)).toMatchObject({ key: 'sort-correct', vars: { object: 'Steel safety pin' } });

    for (const [label, name] of [
      ['Brass key', /^Not magnetic tray/],
      ['Steel paper clip', /^Magnetic tray/],
      ['Aluminium can', /^Not magnetic tray/],
    ] as const) {
      await user.click(card(label));
      await user.click(tray(name));
    }
    expect(eventKeys(onEvent).at(-1)).toBe('round-correct');
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('gives a hint on request without counting a mistake', async () => {
    const { user, onEvent } = setup(objectsConfig);
    await user.click(screen.getByRole('button', { name: /need a hint/i }));
    expect(screen.getByText('Test every object. Watch closely: does it jump to the magnet, or stay still?')).toBeVisible();
    expect(lastEvent(onEvent)).toEqual({ key: 'hint', vars: { hint: 'Test every object. Watch closely: does it jump to the magnet, or stay still?' } });
    expect(screen.queryByRole('button', { name: /need a hint/i })).toBeNull();
  });

  it('finishes once with a summary of what was discovered, and can be played again', async () => {
    const { user, onComplete, onRestart } = setup(objectsConfig);
    await testAll(user, labelsOf(objectsConfig, 0));
    await user.click(mainButton());
    await testAll(user, labelsOf(objectsConfig, 1));
    await user.click(mainButton());
    const round = objectsConfig.rounds[2];
    if (round.kind !== 'sort') throw new Error('expected a sort round');
    for (const id of round.objectIds) {
      const o = objectsConfig.objects.find((x) => x.id === id)!;
      await user.click(card(o.label));
      await user.click(screen.getByRole('button', { name: o.magnetic ? /^Magnetic tray/ : /^Not magnetic tray/ }));
    }
    await user.click(mainButton());
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ gameType: 'magnet-lab', completed: true, perfect: true, score: 1, total: 3 });
    expect(screen.getByRole('heading', { name: 'Magnet Explorer complete!' })).toHaveFocus();
    expect(within(screen.getByRole('region', { name: 'What you discovered' })).getAllByRole('listitem')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /every object/i }));
    expect(screen.getByRole('list', { name: 'Every object' })).toHaveTextContent('Copper coin: not magnetic.');
    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('animates the pull only when motion is allowed', async () => {
    const animate = vi.fn(() => ({ onfinish: null, oncancel: null }) as unknown as Animation);
    Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true });
    try {
      const reduced = setup(objectsConfig, { reducedMotion: true });
      await reduced.user.click(card('Iron nail'));
      expect(animate).not.toHaveBeenCalled();
      cleanup();
      const full = setup(objectsConfig, { reducedMotion: false });
      await full.user.click(card('Iron nail'));
      // The nail waits at the test spot, then speeds into the magnet.
      expect(animate).toHaveBeenCalledWith(expect.arrayContaining([{ transform: 'translate(0px, 0px)' }]), expect.objectContaining({ duration: 650 }));
    } finally {
      delete (Element.prototype as { animate?: unknown }).animate;
    }
  });
});

describe('Magnet Explorer: poles', () => {
  const push = () => screen.getByRole('button', { name: /push together/i });
  const turn = () => screen.getByRole('button', { name: /turn it around/i });
  const track = () => screen.getByRole('img', { name: /Two bar magnets on a table/ });

  it('explores: like poles repel without touching, opposite poles attract', async () => {
    const { user, onEvent, onRecord } = setup(polesConfig);
    expect(track()).toHaveAccessibleName(/The right magnet's N pole faces it\. There is a gap between them\./);
    await user.click(push());
    expect(status()).toHaveTextContent('Two N poles met: they repel and push apart, without even touching.');
    expect(lastEvent(onEvent)).toEqual({ key: 'repel' });
    expect(onRecord).toHaveBeenLastCalledWith({ kind: 'observation', text: 'Magnet Explorer: pushed the N pole of a magnet towards an N pole; they repelled.' });
    await user.click(turn());
    expect(track()).toHaveAccessibleName(/The right magnet's S pole faces it/);
    await user.click(push());
    expect(track()).toHaveAccessibleName(/The magnets are stuck together/);
    expect(status()).toHaveTextContent('An N pole and an S pole met: they attract and snap together.');
    expect(eventKeys(onEvent).at(-1)).toBe('round-correct');
    expect(within(screen.getByRole('list', { name: 'Results seen' })).getAllByText(/seen$/)).toHaveLength(2);
  });

  it('pushes by dragging the moving magnet towards the other one', () => {
    const { onEvent, container } = setup(polesConfig);
    rect(track(), 0, 0, 360, 110);
    const moving = container.querySelector('g.cursor-grab')!;
    fireEvent.pointerDown(moving, { pointerId: 4, pointerType: 'touch', button: 0, clientX: 280, clientY: 50 });
    fireEvent.pointerMove(moving, { pointerId: 4, pointerType: 'touch', clientX: 250, clientY: 50 });
    fireEvent.pointerUp(moving, { pointerId: 4, pointerType: 'touch', clientX: 250, clientY: 50 });
    expect(lastEvent(onEvent)).toEqual({ key: 'repel' });
  });

  it('challenges count the wrong result as a mistake and nudge towards turning the magnet', async () => {
    const { user, onEvent } = setup(polesConfig);
    await user.click(push());
    await user.click(turn());
    await user.click(push());
    await user.click(mainButton());
    expect(screen.getByRole('heading', { name: /^Round 2 of 4: Challenge: make the two magnets pull together/ })).toHaveFocus();
    await user.click(push());
    expect(lastEvent(onEvent)).toEqual({ key: 'round-incorrect', vars: { hint: 'Try turning the magnet around.' } });
    await user.click(turn());
    await user.click(push());
    expect(eventKeys(onEvent).at(-1)).toBe('round-correct');
  });

  it('mystery magnet: labels stay hidden until the child works out the pole', async () => {
    const { user, onEvent, onRecord, onComplete } = setup(polesConfig);
    // Rounds 1-3.
    await user.click(push());
    await user.click(turn());
    await user.click(push());
    await user.click(mainButton());
    await user.click(turn());
    await user.click(push());
    await user.click(mainButton());
    await user.click(turn());
    await user.click(push());
    await user.click(mainButton());

    expect(track()).toHaveAccessibleName(/The right magnet's poles are hidden/);
    const answer = (name: RegExp) => screen.getByRole('button', { name });
    expect(answer(/south \(S\)/i)).toBeDisabled();
    await user.click(push());
    expect(lastEvent(onEvent)).toEqual({ key: 'attract:mystery' });
    expect(onRecord.mock.calls.at(-1)?.[0].text).not.toMatch(/\bS pole\b/);
    expect(status()).toHaveTextContent('They attract and snap together.');
    await user.click(answer(/north \(N\)/i));
    expect(lastEvent(onEvent)).toMatchObject({ key: 'round-incorrect' });
    await user.click(answer(/south \(S\)/i));
    expect(status()).toHaveTextContent('Yes! The south (S) pole was facing the N pole.');
    expect(track()).toHaveAccessibleName(/The right magnet's S pole faces it/);
    await user.click(mainButton());
    expect(onComplete.mock.calls[0][0]).toMatchObject({ completed: true, mistakes: 1, correct: 3, total: 4 });
  });
});
