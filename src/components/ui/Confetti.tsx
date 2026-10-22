import { useMemo, type CSSProperties } from 'react';

const CONFETTI_COLORS = ['#5847E0', '#F2A516', '#1E9A5F', '#F06A4D', '#3B97DE'];

/** One-shot celebratory confetti. Callers skip it when reduced motion is on. */
export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        dx: ((i * 53) % 120) - 60,
        rot: ((i * 97) % 720) - 360,
        delay: (i % 12) * 80,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + (i % 3) * 3,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-4 block rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.w * 1.6,
              backgroundColor: p.color,
              '--dx': `${p.dx}px`,
              '--rot': `${p.rot}deg`,
              animation: `confetti 2.8s ease-in ${p.delay}ms forwards`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
