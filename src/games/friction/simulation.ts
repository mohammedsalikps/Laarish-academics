import { rampLaunchSpeed } from '../../../shared/mentor/scienceModels';
import type { DistanceBand, FrictionExperimentConfig, RampHeight } from '../../domain/types';

/**
 * Educational friction model for the toy-car experiment.
 *
 * Assumptions (documented for teachers and reviewers):
 * - From the same ramp height the car leaves the ramp at the same speed v0.
 *   A lower start is a smaller push: v0 = v_top × √(height fraction), so the
 *   distance scales with the height (see RAMP_HEIGHT_FACTOR).
 * - On the flat surface the only horizontal force is friction, modelled as a
 *   constant deceleration a = mu * g, where mu is an *effective* coefficient
 *   that lumps together rolling resistance and surface roughness.
 * - Air resistance, wheel bearings, slopes and bounces are ignored.
 *
 * This is a deterministic teaching model that shows the right relationship
 * (more friction -> shorter distance). It is not a precise real-world prediction.
 */
export const GRAVITY = 9.8; // m/s^2

export function deceleration(mu: number): number {
  return Math.max(0.0001, mu) * GRAVITY;
}

/** Distance (m) travelled before stopping: d = v0^2 / (2 * mu * g). */
export function stoppingDistance(v0: number, mu: number): number {
  return (v0 * v0) / (2 * deceleration(mu));
}

/** Time (s) until the car stops: t = v0 / (mu * g). */
export function stoppingTime(v0: number, mu: number): number {
  return v0 / deceleration(mu);
}

/** Position (m) along the surface at time t (s). */
export function positionAt(t: number, v0: number, mu: number): number {
  const tStop = stoppingTime(v0, mu);
  if (t <= 0) return 0;
  if (t >= tStop) return stoppingDistance(v0, mu);
  return v0 * t - 0.5 * deceleration(mu) * t * t;
}

/** Speed (m/s) at time t (s). */
export function speedAt(t: number, v0: number, mu: number): number {
  return Math.max(0, v0 - deceleration(mu) * Math.max(0, t));
}

export function distanceBand(distance: number, bands: FrictionExperimentConfig['bands']): DistanceBand {
  if (distance >= bands.farFrom) return 'far';
  if (distance >= bands.mediumFrom) return 'medium';
  return 'short';
}

export const BAND_LABELS: Record<DistanceBand, string> = {
  short: 'a short way',
  medium: 'a medium distance',
  far: 'a long way',
};

export const BAND_TITLES: Record<DistanceBand, string> = {
  short: 'Short',
  medium: 'Medium',
  far: 'Far',
};

export function formatMetres(distance: number): string {
  return `${distance.toFixed(1)} m`;
}

export interface RunOutcome {
  surfaceId: string;
  height: RampHeight;
  /** Speed (m/s) leaving the ramp. */
  launchSpeed: number;
  distance: number;
  band: DistanceBand;
  /** Real (unscaled) time to stop, in seconds. */
  duration: number;
}

export function simulateRun(config: FrictionExperimentConfig, surfaceId: string, height: RampHeight = 'top'): RunOutcome | null {
  const surface = config.surfaces.find((s) => s.id === surfaceId);
  if (!surface) return null;
  const launchSpeed = rampLaunchSpeed(config.launchSpeed, height);
  const distance = stoppingDistance(launchSpeed, surface.frictionCoefficient);
  return {
    surfaceId,
    height,
    launchSpeed,
    distance,
    band: distanceBand(distance, config.bands),
    duration: stoppingTime(launchSpeed, surface.frictionCoefficient),
  };
}
