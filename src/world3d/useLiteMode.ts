import { useMemo } from 'react';
import { useReducedMotion } from '../hooks/usePreferences';
import { useAcademicsPrefs } from '../state/academicsPrefs';
import { lowEndDevice, webglAvailable } from './capability';

export type LiteReason = 'grown-up' | 'reduced-motion' | 'device' | null;

/**
 * Lite mode (wireframe rule 8): the 3D hub, world and path become a flat 2D
 * map and lists on low-end devices, with reduced motion, or when a grown-up
 * chooses it. Same routes, same data; only the rendering changes.
 */
export function useLiteMode(): { lite: boolean; reason: LiteReason } {
  const prefs = useAcademicsPrefs();
  const reduced = useReducedMotion();
  const device = useMemo(() => ({ lowEnd: lowEndDevice(), webgl: webglAvailable() }), []);
  if (prefs.liteMode === 'on') return { lite: true, reason: 'grown-up' };
  // "Always 3D" still needs WebGL to draw anything.
  if (prefs.liteMode === 'off') return device.webgl ? { lite: false, reason: null } : { lite: true, reason: 'device' };
  if (reduced) return { lite: true, reason: 'reduced-motion' };
  if (device.lowEnd) return { lite: true, reason: 'device' };
  return { lite: false, reason: null };
}
