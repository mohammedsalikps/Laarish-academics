/**
 * Keeps HTML pins over a 3D scene readable: when two pins overlap on screen,
 * the farther one moves (sideways or up/down, whichever is shorter), and every
 * pin stays inside the view. Nearer pins keep their place.
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

export function separatePins(boxes: PinBox[], view: { width: number; height: number; top?: number }, gap = 8, iterations = 12): Map<string, { x: number; y: number }> {
  const pins = boxes.map((b) => ({ ...b }));
  const clamp = (p: PinBox) => {
    p.x = Math.min(Math.max(p.x, p.w / 2 + 2), Math.max(p.w / 2 + 2, view.width - p.w / 2 - 2));
    // `top` keeps pins clear of UI laid over the top of the scene (header cards).
    const minY = (view.top ?? 0) + p.h + 2;
    p.y = Math.min(Math.max(p.y, minY), Math.max(minY, view.height - 2));
  };
  pins.forEach(clamp);
  const order = pins.filter((p) => p.visible).sort((a, b) => a.depth - b.depth);
  for (let pass = 0; pass < iterations; pass++) {
    let moved = false;
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const near = order[i];
        const far = order[j];
        const dx = (near.w + far.w) / 2 + gap - Math.abs(near.x - far.x);
        const dy = (near.h + far.h) / 2 + gap - Math.abs(near.y - near.h / 2 - (far.y - far.h / 2));
        if (dx <= 0 || dy <= 0) continue;
        if (dx < dy) far.x += (far.x < near.x ? -1 : 1) * dx;
        else far.y += (far.y < near.y ? -1 : 1) * dy;
        clamp(far);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(pins.map((p) => [p.id, { x: p.x, y: p.y }]));
}
