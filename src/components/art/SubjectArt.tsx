import type { ReactNode } from 'react';
import type { SubjectId } from '../../domain/types';
import { cn } from '../../lib/cn';

/** Hand-built SVG illustrations for each subject world. */
export function SubjectArt({ id, className }: { id: SubjectId; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={cn('h-full w-full', className)} aria-hidden="true">
      {ART[id]}
    </svg>
  );
}

const sparkle = (x: number, y: number, s = 1, fill = '#F2A516') => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -7 C 1 -2 2 -1 7 0 C 2 1 1 2 0 7 C -1 2 -2 1 -7 0 C -2 -1 -1 -2 0 -7 Z"
    fill={fill}
  />
);

const ART: Record<SubjectId, ReactNode> = {
  science: (
    <g>
      <circle cx="80" cy="62" r="46" fill="#C9EEE7" />
      <ellipse cx="80" cy="62" rx="44" ry="16" fill="none" stroke="#0E9F8E" strokeWidth="2.5" opacity="0.5" transform="rotate(-25 80 62)" />
      <ellipse cx="80" cy="62" rx="44" ry="16" fill="none" stroke="#0E9F8E" strokeWidth="2.5" opacity="0.5" transform="rotate(25 80 62)" />
      <path d="M68 24 h24 v6 h-3 v20 l20 34 a8 8 0 0 1 -7 12 h-44 a8 8 0 0 1 -7 -12 l20 -34 v-20 h-3 z" fill="#fff" stroke="#1D1A4A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 70 h36 l11 18 a5 5 0 0 1 -4.5 7.5 h-49 a5 5 0 0 1 -4.5 -7.5 z" fill="#0E9F8E" />
      <circle cx="74" cy="82" r="4" fill="#7FE0D2" />
      <circle cx="88" cy="77" r="3" fill="#7FE0D2" />
      <circle cx="80" cy="56" r="3.5" fill="#0E9F8E" opacity="0.6" />
      <circle cx="86" cy="44" r="2.5" fill="#0E9F8E" opacity="0.5" />
      {sparkle(126, 26)}
      {sparkle(34, 34, 0.7, '#5847E0')}
    </g>
  ),
  mathematics: (
    <g>
      <circle cx="80" cy="62" r="46" fill="#DDD8FF" />
      <rect x="40" y="58" width="34" height="34" rx="6" fill="#5847E0" />
      <circle cx="104" cy="74" r="18" fill="#F2A516" />
      <path d="M80 22 L102 58 H58 Z" fill="#F06A4D" strokeLinejoin="round" />
      <text x="57" y="81" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="18" fill="#fff">
        3
      </text>
      <text x="104" y="80" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="17" fill="#1D1A4A">
        1/2
      </text>
      <path d="M124 30 h12 M130 24 v12" stroke="#5847E0" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 98 h12" stroke="#5847E0" strokeWidth="4" strokeLinecap="round" />
      {sparkle(32, 28, 0.8)}
    </g>
  ),
  english: (
    <g>
      <circle cx="80" cy="62" r="46" fill="#FFD7CB" />
      <path d="M30 40 C 50 34 66 36 80 44 C 94 36 110 34 130 40 V 94 C 110 88 94 90 80 98 C 66 90 50 88 30 94 Z" fill="#fff" stroke="#1D1A4A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M80 44 V 98" stroke="#1D1A4A" strokeWidth="3" />
      <text x="55" y="76" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="22" fill="#E5603F">
        Aa
      </text>
      <path d="M92 58 h26 M92 68 h22 M92 78 h26" stroke="#E5603F" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <g transform="rotate(35 128 28)">
        <rect x="122" y="6" width="10" height="40" rx="2" fill="#F2A516" />
        <path d="M122 46 h10 l-5 9 z" fill="#FFE2B8" />
      </g>
      {sparkle(30, 26, 0.8, '#5847E0')}
    </g>
  ),
  hindi: (
    <g>
      <circle cx="80" cy="62" r="46" fill="#FFE2A8" />
      <rect x="46" y="32" width="56" height="60" rx="14" fill="#fff" stroke="#1D1A4A" strokeWidth="3" />
      <text x="74" y="78" textAnchor="middle" fontFamily="Noto Sans Devanagari, Nirmala UI, sans-serif" fontWeight="700" fontSize="38" fill="#D9820A">
        अ
      </text>
      <rect x="98" y="22" width="34" height="38" rx="10" fill="#D9820A" transform="rotate(10 115 41)" />
      <text x="116" y="49" textAnchor="middle" fontFamily="Noto Sans Devanagari, Nirmala UI, sans-serif" fontWeight="700" fontSize="20" fill="#fff" transform="rotate(10 115 41)">
        आ
      </text>
      {sparkle(34, 30, 0.8, '#5847E0')}
      {sparkle(128, 90, 0.7)}
    </g>
  ),
  kannada: (
    <g>
      <circle cx="80" cy="62" r="46" fill="#FBC9D8" />
      <rect x="46" y="32" width="56" height="60" rx="14" fill="#fff" stroke="#1D1A4A" strokeWidth="3" />
      <text x="74" y="78" textAnchor="middle" fontFamily="Noto Sans Kannada, Nirmala UI, sans-serif" fontWeight="700" fontSize="36" fill="#D23F6E">
        ಅ
      </text>
      <rect x="98" y="22" width="34" height="38" rx="10" fill="#D23F6E" transform="rotate(10 115 41)" />
      <text x="116" y="49" textAnchor="middle" fontFamily="Noto Sans Kannada, Nirmala UI, sans-serif" fontWeight="700" fontSize="20" fill="#fff" transform="rotate(10 115 41)">
        ಆ
      </text>
      {sparkle(34, 30, 0.8, '#F2A516')}
      {sparkle(128, 90, 0.7, '#5847E0')}
    </g>
  ),
  'social-science': (
    <g>
      <circle cx="80" cy="62" r="46" fill="#CBE3F8" />
      <circle cx="76" cy="64" r="32" fill="#2F86D6" />
      <path d="M58 46 C 66 42 72 48 70 54 C 68 60 60 58 58 64 C 56 70 50 66 48 60 C 47 54 52 49 58 46 Z" fill="#5BBF77" />
      <path d="M82 70 C 90 66 98 70 98 78 C 98 86 90 90 84 86 C 79 83 78 74 82 70 Z" fill="#5BBF77" />
      <path d="M84 40 C 90 38 96 42 94 48 C 92 52 86 50 84 46 Z" fill="#5BBF77" />
      <ellipse cx="76" cy="64" rx="32" ry="32" fill="none" stroke="#1D1A4A" strokeWidth="3" />
      <path d="M114 22 C 106 22 102 28 102 34 C 102 42 114 54 114 54 C 114 54 126 42 126 34 C 126 28 122 22 114 22 Z" fill="#F06A4D" stroke="#1D1A4A" strokeWidth="2.5" />
      <circle cx="114" cy="34" r="4.5" fill="#fff" />
      {sparkle(32, 28, 0.8)}
    </g>
  ),
};
