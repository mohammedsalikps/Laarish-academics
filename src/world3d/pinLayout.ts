/**
 * Keeps HTML pins over a 3D scene readable. Pins are placed nearest first;
 * each one keeps its spot if it is free, otherwise it takes the closest free
 * spot (sideways, up or down) that overlaps none of the pins already placed.
 * Every pin stays inside the view, below any header laid over the scene, and off
 * any other UI laid over it (such as the mentor and their speech bubble).
 * Placing against all earlier pins at once avoids pins pushing each other back
 * and forth.
 */

export interface PinBox {
  id: string;
  /** Anchor point: the pin's bottom centre, in container pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 = nearest to the camera. */
  depth: number;
  visible: boolean;
}

/** A rectangle in container pixels. */
export interface Area {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface View {
  width: number;
  height: number;
  /** Pixels at the top covered by other UI; pins stay below it. */
  top?: number;
  /** Other UI laid over the scene: pins move clear of these as they do of each other. */
  avoid?: Area[];
}

function overlapOf(a: PinBox, b: PinBox, gap: number): { dx: number; dy: number } {
  const dx = (a.w + b.w) / 2 + gap - Math.abs(a.x - b.x);
  const dy = (a.h + b.h) / 2 + gap - Math.abs(a.y - a.h / 2 - (b.y - b.h / 2));
  return { dx, dy };
}

const overlaps = (a: PinBox, b: PinBox, gap: number) => {
  const { dx, dy } = overlapOf(a, b, gap);
  return dx > 0 && dy > 0;
};

export function separatePins(boxes: PinBox[], view: View, gap = 8): Map<string, { x: number; y: number }> {
  const pins = boxes.map((b) => ({ ...b }));
  const clamp = (p: PinBox) => {
    p.x = Math.min(Math.max(p.x, p.w / 2 + 2), Math.max(p.w / 2 + 2, view.width - p.w / 2 - 2));
    const minY = (view.top ?? 0) + p.h + 2;
    p.y = Math.min(Math.max(p.y, minY), Math.max(minY, view.height - 2));
  };
  pins.forEach(clamp);

  // Covered areas act as pins that are already placed and never move.
  const placed: PinBox[] = (view.avoid ?? [])
    .filter((a) => a.right > a.left && a.bottom > a.top)
    .map((a, i) => ({ id: `avoid-${i}`, x: (a.left + a.right) / 2, y: a.bottom, w: a.right - a.left, h: a.bottom - a.top, depth: -1, visible: true }));
  for (const pin of pins.filter((p) => p.visible).sort((a, b) => a.depth - b.depth)) {
    const free = () => placed.every((q) => !overlaps(q, pin, gap));
    if (!free()) {
      const origin = { x: pin.x, y: pin.y };
      // Spots just clear of each pin it touches, in all four directions, plus steps straight down.
      const spots: { x: number; y: number }[] = [];
      for (const q of placed) {
        if (!overlaps(q, pin, gap)) continue;
        const { dx, dy } = overlapOf(q, pin, gap);
        const side = pin.x < q.x ? -1 : 1;
        const up = pin.y < q.y ? -1 : 1;
        spots.push({ x: origin.x + side * dx, y: origin.y }, { x: origin.x - side * (pin.w + q.w + 2 * gap - dx), y: origin.y });
        spots.push({ x: origin.x, y: origin.y + up * dy }, { x: origin.x, y: origin.y - up * (pin.h + q.h + 2 * gap - dy) });
      }
      for (let k = 1; k <= 6; k++) spots.push({ x: origin.x, y: origin.y + k * (pin.h + gap) });
      // Next to every placed pin (and covered area): above, below, left and right, at the pin's own
      // height and at the neighbour's. Finds the gaps that fixed steps jump over on small screens.
      for (const q of placed) {
        const left = q.x - (q.w + pin.w) / 2 - gap;
        const right = q.x + (q.w + pin.w) / 2 + gap;
        spots.push({ x: origin.x, y: q.y - q.h - gap }, { x: origin.x, y: q.y + gap + pin.h });
        spots.push({ x: left, y: origin.y }, { x: right, y: origin.y }, { x: left, y: q.y }, { x: right, y: q.y });
      }
      spots.sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y));
      let best: { x: number; y: number; hits: number } | null = null;
      for (const s of spots) {
        pin.x = s.x;
        pin.y = s.y;
        clamp(pin);
        const hits = placed.filter((q) => overlaps(q, pin, gap)).length;
        if (hits === 0) {
          best = { x: pin.x, y: pin.y, hits };
          break;
        }
        if (!best || hits < best.hits) best = { x: pin.x, y: pin.y, hits };
      }
      if (best) {
        pin.x = best.x;
        pin.y = best.y;
      }
    }
    placed.push(pin);
  }
  return new Map(pins.map((p) => [p.id, { x: p.x, y: p.y }]));
}
