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

describe('pins pushed against the header', () => {
  it('move sideways or down instead of piling up under the header', () => {
    // Three pins on one line at the very top, as on the desktop Science world.
    const row = [box('a', 400, 120, 0), box('b', 430, 120, 0.3), box('c', 455, 120, 0.6)];
    const placed = separatePins(row, { width: 1024, height: 700, top: 100 });
    const list = [...placed.values()];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i], list[j])).toBe(false);
    for (const p of list) expect(p.y - 60).toBeGreaterThanOrEqual(100);
  });
});

describe('the desktop Science world (pin sizes measured in the browser)', () => {
  it.each([
    [[0, 0.2, 0.4, 0.6]],
    [[0.6, 0.4, 0.2, 0]],
    [[0.4, 0, 0.6, 0.2]],
  ])('leaves no two pins overlapping whatever their depth order (%j)', (depths) => {
    // Three pins whose anchors all sit above the header, so all are pressed down onto the same line.
    const pins: PinBox[] = [
      { id: 'food', x: 419, y: 200, w: 139, h: 86, depth: depths[0], visible: true },
      { id: 'water', x: 499, y: 210, w: 118, h: 86, depth: depths[1], visible: true },
      { id: 'temp', x: 641, y: 205, w: 150, h: 86, depth: depths[2], visible: true },
      { id: 'magnets', x: 645, y: 355, w: 73, h: 130, depth: depths[3], visible: true },
    ];
    const placed = separatePins(pins, { width: 1024, height: 700, top: 193 });
    const sized = pins.map((p) => ({ ...p, ...placed.get(p.id)! }));
    for (let i = 0; i < sized.length; i++)
      for (let j = i + 1; j < sized.length; j++) {
        const a = sized[i];
        const b = sized[j];
        const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - a.h / 2 - (b.y - b.h / 2)) >= (a.h + b.h) / 2;
        expect(apart, `${a.id} / ${b.id}`).toBe(true);
      }
    for (const p of sized) expect(p.y - p.h).toBeGreaterThanOrEqual(193);
  });
});
