/**
 * One look for everything a child can tap or drag in a game, shared by the engines:
 *
 *  - RAISED: a solid bottom edge, like the app's own buttons, so a tile or card
 *    reads as "something to press" before it is touched.
 *  - firstMoveCue: a wordless "start here". Before the first move, the thing to
 *    try first pulses once (after a short pause, so the child has looked at the
 *    screen). With reduced motion it gets a steady ring instead, never motion.
 *
 * Elements carrying the cue get `data-cue="first-move"` (FIRST_MOVE), so tests
 * and screen-reader-free checks can find it.
 */

/** Raised edge for tappable and draggable tiles (the same edge as `.btn-secondary`). */
export const RAISED = 'shadow-press-line';

/** One soft pulse after 0.5 s (the pulse-ring keyframes from the Tailwind config, played once). */
export const PULSE_ONCE = 'animate-[pulse-ring_1.8s_ease-out_500ms_1]';

/** A steady ring: the reduced-motion form of the cue. */
export const CUE_RING = 'ring-4 ring-primary/30';

export const FIRST_MOVE = 'first-move';

/** Class names for the first-move cue on an HTML element (box-shadow based, so not for SVG shapes). */
export function firstMoveCue(on: boolean, reducedMotion: boolean): string {
  if (!on) return '';
  return reducedMotion ? CUE_RING : `ring-2 ring-primary/40 ${PULSE_ONCE}`;
}
