import { beforeEach, describe, expect, it } from 'vitest';
import { DISCOVERY_FACTS, discoveriesFor, newlyOpened, readFound, readOpenChapters, saveFound, saveOpenChapters } from './discoveries';
import { ISLAND_RADIUS, islandModel, type IslandStyle } from './islands';

const STYLES: IslandStyle[] = ['science', 'maths', 'english', 'hindi', 'kannada', 'social'];

describe('world discoveries', () => {
  it('gives every world three things to discover, each with a short fact', () => {
    for (const style of STYLES) {
      const items = discoveriesFor(style);
      expect(items).toHaveLength(3);
      expect(new Set(items.map((d) => d.id)).size).toBe(3);
      for (const d of items) {
        expect(d.name.length).toBeGreaterThan(1);
        expect(d.fact.length).toBeGreaterThan(40);
        expect(d.fact.length).toBeLessThan(200);
      }
    }
  });

  it('places each marker on the island and clear of the chapter landmarks', () => {
    for (const style of STYLES) {
      const landmarks = islandModel(style).anchors;
      for (const d of discoveriesFor(style)) {
        const [x, , z] = d.at;
        expect(Math.hypot(x, z), `${style}/${d.id} on the island`).toBeLessThan(ISLAND_RADIUS * 0.85);
        for (const a of landmarks) expect(Math.hypot(a.x - x, a.z - z), `${style}/${d.id} near a landmark`).toBeGreaterThan(0.3);
      }
    }
  });

  it('teaches the language worlds in their own script', () => {
    expect(DISCOVERY_FACTS.hindi.every((d) => /[ऀ-ॿ]/.test(d.fact))).toBe(true);
    expect(DISCOVERY_FACTS.kannada.every((d) => /[ಀ-೿]/.test(d.fact))).toBe(true);
  });
});

describe('remembered on this device', () => {
  beforeEach(() => window.localStorage.clear());

  it('celebrates nothing on the first visit, then only chapters that opened since', () => {
    expect(newlyOpened(undefined, ['a', 'b'])).toEqual([]);
    expect(newlyOpened(['a'], ['a', 'b'])).toEqual(['b']);
    expect(newlyOpened(['a', 'b'], ['a', 'b'])).toEqual([]);
  });

  it('keeps what was open per world and class', () => {
    expect(readOpenChapters('science:6')).toBeUndefined();
    saveOpenChapters('science:6', ['magnets']);
    saveOpenChapters('science:6', ['friction']);
    saveOpenChapters('mathematics:6', []);
    expect(readOpenChapters('science:6')).toEqual(['magnets', 'friction']);
    expect(readOpenChapters('mathematics:6')).toEqual([]);
  });

  it('remembers finds and survives bad stored data', () => {
    saveFound(new Set(['science/magnet']));
    expect(readFound().has('science/magnet')).toBe(true);
    window.localStorage.setItem('laarish-academics:discoveries', '{not json');
    expect(readFound().size).toBe(0);
  });
});
