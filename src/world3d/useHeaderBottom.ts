import { useLayoutEffect, useState, type RefObject } from 'react';

/** The bottom edge (px from the top of its positioned parent) of a header laid over a scene, kept up to date. */
export function useHeaderBottom(ref: RefObject<HTMLElement | null>, fallback = 160): number {
  const [bottom, setBottom] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBottom(el.offsetTop + el.offsetHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return bottom;
}
