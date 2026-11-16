import { useEffect, useState } from 'react';
import { newlyOpened, readFound, readOpenChapters, saveFound, saveOpenChapters, type Discovery } from '../../world3d/discoveries';
import type { IslandStyle } from '../../world3d/islands';

/** Remembers which of a world's discoveries this device has found. */
export function useDiscoveries(style: IslandStyle) {
  const [found, setFound] = useState<Set<string>>(readFound);
  const key = (d: Discovery) => `${style}/${d.id}`;
  const isFound = (d: Discovery) => found.has(key(d));
  const markFound = (d: Discovery) => {
    if (found.has(key(d))) return;
    // Re-read so another tab's finds are kept.
    const next = new Set([...readFound(), ...found, key(d)]);
    saveFound(next);
    setFound(next);
  };
  return { isFound, markFound };
}

/**
 * Chapters that opened since this world and class were last visited on this device.
 * The answer is fixed for the visit (so the celebration does not vanish on re-render);
 * what is open now is remembered for next time.
 */
export function useNewChapters(key: string, openIds: readonly string[]): ReadonlySet<string> {
  const [state, setState] = useState(() => ({ key, ids: new Set(newlyOpened(readOpenChapters(key), openIds)) }));
  if (state.key !== key) setState({ key, ids: new Set(newlyOpened(readOpenChapters(key), openIds)) });
  const openKey = openIds.join('|');
  useEffect(() => {
    if (key) saveOpenChapters(key, openKey ? openKey.split('|') : []);
  }, [key, openKey]);
  return state.key === key ? state.ids : new Set();
}
