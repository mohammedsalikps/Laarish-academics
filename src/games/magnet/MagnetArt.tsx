import { useId } from 'react';
import { MetalGradient } from '../../components/art/ObjectArt';
import type { MagnetPole } from '../../domain/types';

/**
 * The magnets for Magnet Explorer: original vector illustrations made for Laarish
 * (no photographs or third-party images). The everyday objects are drawn in
 * src/components/art/ObjectArt.tsx, shared with the other games.
 */

const N_RED = '#E4513B';
const N_DARK = '#B5301E';
const S_BLUE = '#2F72D6';
const S_DARK = '#1D4FA3';

/** Gradient ids must be unique per picture on the page. */
function useIds() {
  const base = useId().replace(/:/g, '');
  return (name: string) => `${base}-${name}`;
}

/**
 * A horseshoe magnet seen from the side, poles facing left: N on top, S below.
 * Drawn in a 120 × 120 box at (x, y), for use inside a scene SVG; `glow` adds
 * faint field lines while it is pulling something.
 */
export function HorseshoeMagnet({ x = 0, y = 0, glow = false }: { x?: number; y?: number; glow?: boolean }) {
  const id = useIds();
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F27A63" />
          <stop offset="0.5" stopColor={N_RED} />
          <stop offset="1" stopColor={N_DARK} />
        </linearGradient>
        <MetalGradient id={id('tip')} light="#F4F6F9" mid="#B8C0CA" dark="#6A7380" vertical />
      </defs>
      {glow && (
        <g fill="none" stroke="#7B6CF0" strokeWidth="1.6" strokeDasharray="3 4" opacity="0.55">
          <path d="M14 30 q-16 30 0 60" />
          <path d="M14 22 q-30 38 0 76" />
        </g>
      )}
      <path d="M40 18 H78 a42 42 0 0 1 0 84 H40 V80 H78 a20 20 0 0 0 0 -40 H40 Z" fill={`url(#${id('body')})`} stroke={N_DARK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M44 23 H78 a37 37 0 0 1 30 15" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.35" />
      <rect x="16" y="18" width="26" height="22" rx="2" fill={`url(#${id('tip')})`} stroke="#5D6673" strokeWidth="1.2" />
      <rect x="16" y="80" width="26" height="22" rx="2" fill={`url(#${id('tip')})`} stroke="#5D6673" strokeWidth="1.2" />
      <text x="29" y="34" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1D1A4A" fontFamily="Fredoka Variable, sans-serif">
        N
      </text>
      <text x="29" y="96" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1D1A4A" fontFamily="Fredoka Variable, sans-serif">
        S
      </text>
    </g>
  );
}

/**
 * A bar magnet for use inside a scene SVG. `left` and `right` are the poles at
 * each end; `hidden` paints both halves plain grey with "?" (the mystery magnet).
 * Drawn in a 160 × 44 box.
 */
export function BarMagnet({ left, right, hidden = false }: { left: MagnetPole; right: MagnetPole; hidden?: boolean }) {
  const id = useIds();
  const half = (pole: MagnetPole, x: number) => {
    const fill = hidden ? `url(#${id('grey')})` : `url(#${id(pole)})`;
    return (
      <g>
        <rect x={x} y="4" width="80" height="36" fill={fill} />
        <text x={x + 40} y="29" textAnchor="middle" fontSize="20" fontWeight="800" fill="#FFFFFF" fontFamily="Fredoka Variable, sans-serif">
          {hidden ? '?' : pole}
        </text>
      </g>
    );
  };
  return (
    <g>
      <defs>
        <linearGradient id={id('N')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F58A73" />
          <stop offset="0.55" stopColor={N_RED} />
          <stop offset="1" stopColor={N_DARK} />
        </linearGradient>
        <linearGradient id={id('S')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6FA0EC" />
          <stop offset="0.55" stopColor={S_BLUE} />
          <stop offset="1" stopColor={S_DARK} />
        </linearGradient>
        <linearGradient id={id('grey')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B4BAC4" />
          <stop offset="0.55" stopColor="#8A929E" />
          <stop offset="1" stopColor="#5D6673" />
        </linearGradient>
        <clipPath id={id('clip')}>
          <rect x="0" y="4" width="160" height="36" rx="7" />
        </clipPath>
      </defs>
      <ellipse cx="80" cy="42" rx="78" ry="3" fill="#1D1A4A" opacity="0.14" />
      <g clipPath={`url(#${id('clip')})`}>
        {half(left, 0)}
        {half(right, 80)}
        <rect x="0" y="6" width="160" height="5" fill="#FFFFFF" opacity="0.28" />
      </g>
      <rect x="0" y="4" width="160" height="36" rx="7" fill="none" stroke="#1D1A4A" strokeOpacity="0.25" strokeWidth="1.5" />
    </g>
  );
}
