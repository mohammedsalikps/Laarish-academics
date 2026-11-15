import { describe, expect, it } from 'vitest';
import { separatePins, type PinBox } from './pinLayout';

const box = (id: string, x: number, y: number, depth: number): PinBox => ({ id, x, y, w: 100, h: 60, depth, visible: true });
const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 100 && Math.abs(a.y - b.y) < 60;

describe('pins over a 3D scene', () => {
  it('moves the farther of two overlapping pins and leaves the nearer one in place', () => {
    const placed = separatePins([box('near', 150, 200, 0), box('far', 170, 210, 1)], { width: 375, height: 600 });
    expect(placed.get('near')).toEqual({ x: 150, y: 200 });
    expect(overlaps(placed.get('near')!, placed.get('far')!)).toBe(false);
  });

  it('untangles a cluster and keeps every pin on screen', () => {
    const boxes = [box('a', 180, 300, 0), box('b', 190, 305, 0.2), box('c', 175, 310, 0.4), box('d', 200, 295, 0.6), box('e', 360, 40, 0.8)];
    const placed = separatePins(boxes, { width: 375, height: 600 });
    const list = [...placed.values()];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i], list[j])).toBe(false);
    for (const p of list) {
      expect(p.x - 50).toBeGreaterThanOrEqual(0);
      expect(p.x + 50).toBeLessThanOrEqual(375);
      expect(p.y - 60).toBeGreaterThanOrEqual(0);
    }
  });

  it('ignores hidden pins', () => {
    const placed = separatePins([box('a', 150, 200, 0), { ...box('b', 150, 200, 1), visible: false }], { width: 375, height: 600 });
    expect(placed.get('b')).toEqual({ x: 150, y: 200 });
  });
});
