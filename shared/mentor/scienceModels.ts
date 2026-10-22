import type { RampHeight, Topic } from '../curriculum/types.js';

/**
 * Deterministic "app model" facts for topics whose games simulate something.
 * The numbers are computed with the same formulas the games use, so the mentor
 * can quote exact values instead of estimating them. These are teaching models,
 * not precise real-world predictions, and the facts say so.
 */

export const GRAVITY = 9.8; // m/s^2, same constant as src/games/friction/simulation.ts

/** Friction Lab: d = v0^2 / (2 * mu * g). */
export function frictionLabDistance(launchSpeed: number, mu: number): number {
  return (launchSpeed * launchSpeed) / (2 * Math.max(0.0001, mu) * GRAVITY);
}

/**
 * Ramp heights in the Friction Lab, as a fraction of the top height. Speed at
 * the bottom of a ramp grows with the square root of its height (v = √(2gh)),
 * so the rolling distance is proportional to the height: half the height, half
 * the distance.
 */
export const RAMP_HEIGHT_FACTOR: Record<RampHeight, number> = { top: 1, middle: 0.5, low: 0.25 };
export const RAMP_HEIGHT_NAMES: Record<RampHeight, string> = { top: 'Top', middle: 'Middle', low: 'Low' };

/** Launch speed (m/s) from a ramp height, given the speed from the top. */
export function rampLaunchSpeed(topSpeed: number, height: RampHeight): number {
  return topSpeed * Math.sqrt(RAMP_HEIGHT_FACTOR[height]);
}

const metres = (d: number) => `${d.toFixed(1)} m`;

export function modelFacts(topic: Topic | undefined): string[] {
  const game = topic?.play.game;
  if (!game) return [];
  switch (game.type) {
    case 'friction-experiment': {
      const at = (height: RampHeight) =>
        game.surfaces.map((s) => `${s.name.toLowerCase()} ${metres(frictionLabDistance(rampLaunchSpeed(game.launchSpeed, height), s.frictionCoefficient))}`).join(', ');
      return [
        `In the Friction Lab game a toy car rolls down a ramp onto a surface. From the top of the ramp (${game.launchSpeed} m/s) it rolls: ${at('top')}.`,
        `From the middle of the ramp (a smaller push) it rolls half as far: ${at('middle')}. From low on the ramp, a quarter as far: ${at('low')}.`,
        `Distance bands: short is under ${game.bands.mediumFrom} m, medium is ${game.bands.mediumFrom} to ${game.bands.farFrom} m, far is over ${game.bands.farFrom} m. A fair test changes only one thing at a time (the surface or the ramp height).`,
        'The game models friction as a steady slowing force (d = v² ÷ (2 × friction × 9.8)). It is a simplified teaching model, not an exact real-world measurement.',
      ];
    }
    case 'push-box': {
      const grips = game.floors.map((f) => `${f.name.toLowerCase()} grip ${f.grip}`).join(', ');
      return [
        `In the Push the Box game each floor has a friction grip level: ${grips}. Push strengths go from 1 (${game.pushLabels[0]}) to ${game.pushLabels.length} (${game.pushLabels[game.pushLabels.length - 1]}).`,
        'The box moves only when the push is bigger than the grip, then slides 1.5 steps for every push level above the grip. Friction pushes back as hard as the push, up to the grip level, so a small push on carpet leaves the box still.',
      ];
    }
    case 'balance':
      return ['In the Balance Scale game the scale stays level only when both sides add up to the same total. That is what the equals sign means.'];
    default:
      return [];
  }
}
