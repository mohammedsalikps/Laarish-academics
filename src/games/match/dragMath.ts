/**
 * Pointer geometry for drag and drop in Concept Match and the Sort game. Kept pure (plain numbers
 * in, plain numbers out) so it can be unit tested without a layout engine.
 * All coordinates are viewport pixels (clientX / getBoundingClientRect).
 */
export interface Point {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Movement (px) before a press becomes a drag; anything smaller is still a tap. */
export const DRAG_THRESHOLD = 6;
/** A drop this close (px) to a card still counts, which forgives small fingers. */
export const DROP_TOLERANCE = 24;

export function toBox(id: string, rect: { left: number; top: number; right: number; bottom: number }): Box {
  return { id, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/** True once the pointer has travelled far enough from `start` to count as a drag. */
export function passedDragThreshold(start: Point, now: Point, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(now.x - start.x, now.y - start.y) >= threshold;
}

/** Shortest distance from a point to a box (0 when the point is inside it). */
export function distanceToBox(p: Point, b: Box): number {
  const dx = Math.max(b.left - p.x, 0, p.x - b.right);
  const dy = Math.max(b.top - p.y, 0, p.y - b.bottom);
  return Math.hypot(dx, dy);
}

/**
 * The drop target under the pointer: the box containing it, otherwise the
 * nearest box within `tolerance`. Ties (e.g. a point in a gap between two
 * cards) go to the box whose centre is closer. Empty (unmeasured) boxes are ignored.
 */
export function dropTargetAt(p: Point, boxes: readonly Box[], tolerance = DROP_TOLERANCE): string | null {
  let best: { id: string; d: number; c: number } | null = null;
  for (const b of boxes) {
    if (b.right <= b.left || b.bottom <= b.top) continue;
    const d = distanceToBox(p, b);
    if (d > tolerance) continue;
    const c = Math.hypot(p.x - (b.left + b.right) / 2, p.y - (b.top + b.bottom) / 2);
    if (!best || d < best.d || (d === best.d && c < best.c)) best = { id: b.id, d, c };
  }
  return best?.id ?? null;
}

/** Where the grab point sits inside the card, so the ghost stays under the finger where it was picked up. */
export function grabOffset(p: Point, card: { left: number; top: number }): Point {
  return { x: p.x - card.left, y: p.y - card.top };
}

/** CSS transform placing the ghost's top-left corner so the grab point follows the pointer. */
export function ghostTransform(p: Point, offset: Point): string {
  return `translate3d(${Math.round(p.x - offset.x)}px, ${Math.round(p.y - offset.y)}px, 0)`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A soft S-curve from the middle of `from`'s right edge to the middle of `to`'s
 * left edge, in coordinates relative to `origin` (the overlay's top-left corner).
 */
export function connectorPath(from: Box, to: Box, origin: Point): { d: string; start: Point; end: Point } {
  const start = { x: r1(from.right - origin.x), y: r1((from.top + from.bottom) / 2 - origin.y) };
  const end = { x: r1(to.left - origin.x), y: r1((to.top + to.bottom) / 2 - origin.y) };
  const bend = r1(Math.max(8, (end.x - start.x) / 2));
  return { d: `M ${start.x} ${start.y} C ${r1(start.x + bend)} ${start.y}, ${r1(end.x - bend)} ${end.y}, ${end.x} ${end.y}`, start, end };
}
