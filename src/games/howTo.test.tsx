import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../shared/curriculum';
import type { AreaGridConfig, BarChartConfig, FractionBuilderConfig, GameConfig, MagnetLabConfig } from '../domain/types';
import { HOW_TO, HOW_TO_NOTE, MAX_CAPTION_WORDS, captionWords, howToSteps, type HowToScene } from './howTo';
import { HowToPicture, HowToSteps } from './HowToGuide';
import { GAMES } from './registry';

const configs = TOPICS.map((t) => ({ topic: t.id, game: t.play.game }));
const gamesOf = <C extends GameConfig>(type: C['type']) => configs.map((c) => c.game).filter((g): g is C => g.type === type);

describe('How to play in pictures: the data', () => {
  it('has steps for every registered game type', () => {
    expect(Object.keys(HOW_TO).sort()).toEqual(Object.keys(GAMES).sort());
  });

  it('gives every topic 2 or 3 steps, each a picture with a caption of at most 8 words', () => {
    expect(configs.length).toBeGreaterThan(100);
    for (const { topic, game } of configs) {
      const steps = howToSteps(game);
      expect(steps.length, topic).toBeGreaterThanOrEqual(2);
      expect(steps.length, topic).toBeLessThanOrEqual(3);
      for (const s of steps) {
        expect(captionWords(s.text), `${topic}: ${s.text}`).toBeLessThanOrEqual(MAX_CAPTION_WORDS);
        expect(s.text, topic).toMatch(/^[A-Z].*[.?!]$/);
      }
      expect(new Set(steps.map((s) => s.scene)).size, topic).toBe(steps.length);
    }
  });

  it('follows the topic: magnets show pushing and turning only when a topic has pole rounds', () => {
    for (const c of gamesOf<MagnetLabConfig>('magnet-lab')) {
      const scenes = howToSteps(c).map((s) => s.scene);
      const kinds = new Set(c.rounds.map((r) => r.kind));
      expect(scenes.includes('poles-push')).toBe(kinds.has('poles'));
      expect(scenes.includes('magnet-drag')).toBe(kinds.has('test'));
    }
    const polesOnly: MagnetLabConfig = { type: 'magnet-lab', objects: [], rounds: [{ kind: 'poles', id: 'p', prompt: 'Push', goal: 'explore', hint: 'h', explanation: 'e' }] };
    expect(howToSteps(polesOnly).map((s) => s.scene)).toEqual(['poles-push', 'poles-turn']);
  });

  it('follows the topic: bar charts show dragging for build rounds and tapping for read rounds', () => {
    for (const c of gamesOf<BarChartConfig>('bar-chart')) {
      const scenes = howToSteps(c).map((s) => s.scene);
      expect(scenes.includes('bar-drag')).toBe(c.rounds.some((r) => r.mode === 'build'));
      expect(scenes.includes('bar-tap')).toBe(c.rounds.some((r) => r.mode === 'read'));
      expect(scenes.at(-1)).toBe('press-check');
    }
  });

  it('follows the topic: the fraction picture uses its shape, and area pictures what the rounds measure', () => {
    for (const c of gamesOf<FractionBuilderConfig>('fraction-builder')) {
      expect(howToSteps(c)[0].variant).toBe(c.rounds[0].shape === 'bar' ? 'bar' : 'circle');
    }
    const area = (rounds: AreaGridConfig['rounds']): AreaGridConfig => ({ type: 'area-grid', cols: 6, rows: 4, rounds });
    const r = { id: 'r', prompt: 'p', hint: 'h', explanation: 'e' };
    expect(howToSteps(area([{ ...r, area: 6 }]))[1]).toMatchObject({ variant: 'area', text: 'Count the squares inside for area.' });
    expect(howToSteps(area([{ ...r, perimeter: 10 }]))[1]).toMatchObject({ variant: 'perimeter', text: 'Add up all four sides for perimeter.' });
    expect(howToSteps(area([{ ...r, area: 6, perimeter: 10 }]))[1].variant).toBe('both');
  });

  it('keeps the circuit safety rule with the pictures', () => {
    expect(HOW_TO_NOTE.circuit).toMatch(/Never touch wall sockets/);
  });
});

describe('How to play in pictures: the drawings', () => {
  const allScenes = new Set<HowToScene>(configs.flatMap(({ game }) => howToSteps(game).map((s) => s.scene)));

  it('draws every scene used by a topic, as a decorative picture', () => {
    for (const scene of allScenes) {
      const { container, unmount } = render(<HowToPicture step={{ scene, text: 'x.' }} animate />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('data-scene', scene);
      expect(svg.querySelectorAll('path, rect, circle, line, text, svg').length, scene).toBeGreaterThan(2);
      unmount();
    }
  });

  it('shows the steps as a numbered list: a picture and a caption in each item', () => {
    const steps = howToSteps(gamesOf('circuit')[0]);
    render(<HowToSteps steps={steps} animate={false} note={HOW_TO_NOTE.circuit} />);
    const list = screen.getByRole('list', { name: 'How to play in pictures' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(steps.length);
    items.forEach((item, i) => {
      expect(item.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(item).toHaveTextContent(`${i + 1}${steps[i].text}`);
    });
    expect(screen.getByText(HOW_TO_NOTE.circuit!)).toBeInTheDocument();
  });

  it('moves the hands and fingers only when motion is allowed', () => {
    const steps = howToSteps(gamesOf('clock')[0]);
    const { container, rerender } = render(<HowToSteps steps={steps} animate />);
    expect(screen.getByRole('list', { name: 'How to play in pictures' })).toHaveAttribute('data-animated', 'true');
    expect(container.querySelector('style')?.textContent).toMatch(/html\[data-motion='reduce'\] \.howto-anim\{animation:none!important\}/);
    expect(container.querySelectorAll('.howto-anim').length).toBeGreaterThan(0);

    rerender(<HowToSteps steps={steps} animate={false} />);
    expect(screen.getByRole('list', { name: 'How to play in pictures' })).toHaveAttribute('data-animated', 'false');
    expect(container.querySelector('style')).toBeNull();
    expect(container.querySelectorAll('.howto-anim')).toHaveLength(0);
    // Still pictures still show the move: dashed arrows or tap ripples.
    expect(container.querySelectorAll('[stroke-dasharray], circle[opacity]').length).toBeGreaterThan(0);
  });

  it('never animates any scene when motion is off', () => {
    for (const scene of allScenes) {
      const { container, unmount } = render(<HowToPicture step={{ scene, text: 'x.', variant: 'both' }} animate={false} />);
      expect(container.querySelectorAll('.howto-anim'), scene).toHaveLength(0);
      unmount();
    }
  });
});
