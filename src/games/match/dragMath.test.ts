import { describe, expect, it } from 'vitest';
import { DROP_TOLERANCE, connectorPath, distanceToBox, dropTargetAt, ghostTransform, grabOffset, passedDragThreshold, toBox, type Box } from './dragMath';

const box = (id: string, left: number, top: number, w = 100, h = 50): Box => ({ id, left, top, right: left + w, bottom: top + h });

describe('drag maths (concept match and sort)', () => {
  it('finds the sort box a card is dropped on, side by side, forgiving the gap between boxes', () => {
    // Two boxes in a row (as on a phone): 160px wide, 8px apart.
    const boxes = [box('more', 0, 300, 160, 130), box('less', 168, 300, 160, 130)];
    expect(dropTargetAt({ x: 80, y: 365 }, boxes)).toBe('more');
    expect(dropTargetAt({ x: 250, y: 420 }, boxes)).toBe('less');
    expect(dropTargetAt({ x: 163, y: 365 }, boxes)).toBe('more'); // in the gap, nearer "more"
    expect(dropTargetAt({ x: 166, y: 365 }, boxes)).toBe('less');
    expect(dropTargetAt({ x: 80, y: 300 - DROP_TOLERANCE }, boxes)).toBe('more'); // just above
    expect(dropTargetAt({ x: 80, y: 120 }, boxes)).toBeNull(); // still over the card's own spot
  });

  it('only turns a press into a drag after a real movement', () => {
    expect(passedDragThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false); // 5px: still a tap
    expect(passedDragThreshold({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
    expect(passedDragThreshold({ x: 10, y: 10 }, { x: 10, y: 40 }, 40)).toBe(false);
  });

  it('measures the distance from a point to a box', () => {
    const b = box('a', 100, 100);
    expect(distanceToBox({ x: 150, y: 120 }, b)).toBe(0);
    expect(distanceToBox({ x: 90, y: 120 }, b)).toBe(10);
    expect(distanceToBox({ x: 150, y: 160 }, b)).toBe(10);
    expect(distanceToBox({ x: 203, y: 154 }, b)).toBe(5); // corner: 3-4-5
  });

  it('finds the card under the pointer', () => {
    const boxes = [box('grip', 200, 0), box('heat', 200, 60), box('mark', 200, 120)];
    expect(dropTargetAt({ x: 250, y: 25 }, boxes)).toBe('grip');
    expect(dropTargetAt({ x: 250, y: 85 }, boxes)).toBe('heat');
    expect(dropTargetAt({ x: 299, y: 169 }, boxes)).toBe('mark');
  });

  it('forgives near misses within the tolerance, but not far ones', () => {
    const boxes = [box('grip', 200, 0)];
    expect(dropTargetAt({ x: 200 - DROP_TOLERANCE + 1, y: 25 }, boxes)).toBe('grip');
    expect(dropTargetAt({ x: 200 - DROP_TOLERANCE - 1, y: 25 }, boxes)).toBeNull();
    expect(dropTargetAt({ x: 250, y: 400 }, boxes)).toBeNull();
    expect(dropTargetAt({ x: 250, y: 25 }, [])).toBeNull();
  });

  it('prefers the containing card, then the closer edge, then the closer centre', () => {
    // A point inside one card and within tolerance of another goes to the one it is inside.
    expect(dropTargetAt({ x: 250, y: 48 }, [box('near', 200, 60), box('inside', 200, 0)])).toBe('inside');
    // In the gap between two cards it goes to the nearer edge.
    expect(dropTargetAt({ x: 250, y: 53 }, [box('above', 200, 0), box('below', 200, 60)])).toBe('above');
    expect(dropTargetAt({ x: 250, y: 57 }, [box('above', 200, 0), box('below', 200, 60)])).toBe('below');
    // Exactly between two edges: the closer centre wins (the shorter card here).
    expect(dropTargetAt({ x: 250, y: 55 }, [box('tall', 200, -50, 100, 100), box('short', 200, 60, 100, 20)])).toBe('short');
  });

  it('ignores cards that have not been laid out', () => {
    expect(dropTargetAt({ x: 0, y: 0 }, [box('hidden', 0, 0, 0, 0)])).toBeNull();
  });

  it('keeps the ghost under the finger where the card was grabbed', () => {
    const offset = grabOffset({ x: 130, y: 220 }, { left: 100, top: 200 });
    expect(offset).toEqual({ x: 30, y: 20 });
    expect(ghostTransform({ x: 330.4, y: 420.6 }, offset)).toBe('translate3d(300px, 401px, 0)');
  });

  it('draws a connector from the example’s right edge to the concept’s left edge', () => {
    const { d, start, end } = connectorPath(box('a', 110, 220, 100, 60), box('a', 260, 300, 100, 40), { x: 10, y: 20 });
    expect(start).toEqual({ x: 200, y: 230 });
    expect(end).toEqual({ x: 250, y: 300 });
    expect(d).toBe('M 200 230 C 225 230, 225 300, 250 300');
  });

  it('converts DOM rects to boxes', () => {
    expect(toBox('x', { left: 1, top: 2, right: 3, bottom: 4 })).toEqual({ id: 'x', left: 1, top: 2, right: 3, bottom: 4 });
  });
});
