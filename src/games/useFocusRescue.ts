import { useEffect, useRef, type RefObject } from 'react';

/**
 * Keeps keyboard users in the game when the control they pressed disappears or is disabled
 * (a Start button that turns into "Rolling...", a Next button that becomes a disabled Check):
 * when `trigger` changes and focus has fallen to the page, it moves to `target` instead.
 * It never moves focus that is still on a usable control, and does nothing on first render.
 */
export function useFocusRescue(target: RefObject<HTMLElement | null>, trigger: string): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Let the browser settle focus after the re-render (a removed element blurs asynchronously in some browsers).
    const id = window.setTimeout(() => {
      const active = document.activeElement as (HTMLElement & { disabled?: boolean }) | null;
      const lost = !active || active === document.body || !active.isConnected || active.disabled === true;
      if (lost) target.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [target, trigger]);
}
