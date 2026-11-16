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

  it('keeps pins clear of UI laid over the scene, like the mentor and their speech bubble', () => {
    // Measured at 375 x 812: Rishi and his bubble cover the bottom-left; the locked Topic 3 pin sat under the bubble.
    const mentor = { left: 8, top: 660, right: 318, bottom: 800 };
    const lock = { ...box('topic-3', 160, 740, 0.9), w: 150, h: 80 };
    const free = box('topic-1', 200, 420, 0.1);
    const placed = separatePins([free, lock], { width: 375, height: 812, top: 150, avoid: [mentor] });
    const p = placed.get('topic-3')!;
    const clear = p.x + lock.w / 2 <= mentor.left || p.x - lock.w / 2 >= mentor.right || p.y <= mentor.top || p.y - lock.h >= mentor.bottom;
    expect(clear).toBe(true);
    expect(p.x + lock.w / 2).toBeLessThanOrEqual(375);
    expect(placed.get('topic-1')).toEqual({ x: 200, y: 420 }); // pins away from the mentor do not move
    expect([...placed.keys()].some((id) => id.startsWith('avoid'))).toBe(false);
  });

  it('ignores empty covered areas (an element that is not on screen)', () => {
    const placed = separatePins([box('a', 150, 300, 0)], { width: 375, height: 600, avoid: [{ left: 0, top: 0, right: 0, bottom: 0 }] });
    expect(placed.get('a')).toEqual({ x: 150, y: 300 });
  });

  it('finds the gap between the path and the mentor rather than covering another pin (measured chapter path, 375 px)', () => {
    // Pin sizes and anchors read from the Magnets chapter path at 375 x 812; Topic 3's own anchor is next to the trophy.
    const pins: PinBox[] = [
      { id: 'topic-1', x: 187, y: 532, w: 130, h: 102, depth: 0.1, visible: true },
      { id: 'kit', x: 128, y: 422, w: 130, h: 88, depth: 0.3, visible: true },
      { id: 'topic-2', x: 266, y: 421, w: 130, h: 100, depth: 0.5, visible: true },
      { id: 'trophy', x: 197, y: 313, w: 130, h: 88, depth: 0.7, visible: true },
      { id: 'topic-3', x: 152, y: 313, w: 130, h: 88, depth: 0.9, visible: true },
    ];
    const mentor = { left: 8, top: 660, right: 298, bottom: 800 };
    const placed = separatePins(pins, { width: 375, height: 812, top: 190, avoid: [mentor] });
    const list = pins.map((p) => ({ ...p, ...placed.get(p.id)! }));
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [list[i], list[j]];
        const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - a.h / 2 - (b.y - b.h / 2)) >= (a.h + b.h) / 2;
        expect(apart, `${a.id} and ${b.id} overlap`).toBe(true);
      }
    const t3 = list.find((p) => p.id === 'topic-3')!;
    expect(t3.y <= mentor.top || t3.x - t3.w / 2 >= mentor.right).toBe(true);
  });
});
