import { useId, type ReactElement } from 'react';
import type { ObjectArt } from '../../domain/types';
import { cn } from '../../lib/cn';

/**
 * Pictures of everyday objects for the games (Magnet Explorer, Circuit lab, Sort):
 * original vector illustrations made for Laarish (no photographs or third-party
 * images). Each object is drawn so its material is recognisable: grey iron and
 * steel, orange copper, yellow brass, silver aluminium, wood grain, coloured
 * plastic, pink or tan rubber, clear glass, dark graphite and soft cloth.
 */

/** Gradient ids must be unique per picture on the page. */
function useIds() {
  const base = useId().replace(/:/g, '');
  return (name: string) => `${base}-${name}`;
}

/** A brushed-metal gradient (steel by default; pass colours for other metals). */
export function MetalGradient({ id, light = '#E9EDF2', mid = '#A9B1BC', dark = '#5D6673', vertical = false }: { id: string; light?: string; mid?: string; dark?: string; vertical?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '1'}>
      <stop offset="0" stopColor={dark} />
      <stop offset="0.35" stopColor={light} />
      <stop offset="0.6" stopColor={mid} />
      <stop offset="1" stopColor={dark} />
    </linearGradient>
  );
}

/** An object picture (64 × 64 drawing). Inside another SVG, `x` and `y` place it. */
export function ObjectPicture({ art, size = 48, x, y, className }: { art: ObjectArt; size?: number; x?: number; y?: number; className?: string }) {
  const id = useIds();
  return (
    <svg viewBox="0 0 64 64" x={x} y={y} width={size} height={size} className={cn('shrink-0 overflow-visible', className)} aria-hidden="true" focusable="false">
      {ART[art](id)}
    </svg>
  );
}

const SHADOW = '#1D1A4A';

/** A key lying at an angle, in the given metal. */
function key(id: (name: string) => string, metal: { light: string; mid: string; dark: string; edge: string; shine: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id('key')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal.dark} />
          <stop offset="0.35" stopColor={metal.light} />
          <stop offset="0.65" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
      </defs>
      <g transform="rotate(-30 32 32)">
        <path d="M27 29 H56 V35 H53 V40 H49 V35 H46 V39 H42 V35 H27 Z" fill={`url(#${id('key')})`} stroke={metal.edge} strokeWidth="1" strokeLinejoin="round" />
        <circle cx="17" cy="32" r="11" fill={`url(#${id('key')})`} stroke={metal.edge} strokeWidth="1" />
        <circle cx="15" cy="32" r="4.2" fill="#FFFFFF" stroke={metal.edge} strokeWidth="1" />
        <path d="M30 31 H52" stroke={metal.shine} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      </g>
    </>
  );
}

/** Light wood (ice-cream sticks, cricket bats): pale top, darker lower edge. */
function LightWood({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#F6DDB0" />
      <stop offset="0.5" stopColor="#E7BF80" />
      <stop offset="1" stopColor="#CC975A" />
    </linearGradient>
  );
}

const ART: Record<ObjectArt, (id: (name: string) => string) => ReactElement> = {
  'iron-nail': (id) => (
    <>
      <defs>
        <MetalGradient id={id('shaft')} light="#D9DDE2" mid="#8E96A1" dark="#4B525C" />
      </defs>
      <g transform="rotate(-38 32 32)">
        <ellipse cx="32" cy="32" rx="25" ry="2.6" fill={SHADOW} opacity="0.12" transform="translate(1 9)" />
        <path d="M12 29.6 L50 29.6 L58 32 L50 34.4 L12 34.4 Z" fill={`url(#${id('shaft')})`} />
        <rect x="8" y="24" width="5" height="16" rx="1.6" fill="#5D6673" />
        <rect x="8.8" y="24.8" width="1.6" height="14.4" rx="0.8" fill="#C9CED6" />
        <path d="M14 30.4 H48" stroke="#F4F6F9" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
      </g>
    </>
  ),
  'paper-clip': (id) => (
    <>
      <defs>
        <MetalGradient id={id('wire')} light="#F2F4F7" mid="#AEB6C1" dark="#6A7380" />
      </defs>
      <g transform="rotate(-24 32 32)">
        <path d="M30 22 V44 a5 5 0 0 0 10 0 V14 a8 8 0 0 0 -16 0 V48 a11 11 0 0 0 22 0 V20" fill="none" stroke="#5D6673" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" transform="translate(1 1.5)" />
        <path d="M30 22 V44 a5 5 0 0 0 10 0 V14 a8 8 0 0 0 -16 0 V48 a11 11 0 0 0 22 0 V20" fill="none" stroke={`url(#${id('wire')})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  ),
  'safety-pin': (id) => (
    <>
      <defs>
        {/* userSpaceOnUse, so the straight (zero-height) wire still gets the gradient. */}
        <linearGradient id={id('pin')} gradientUnits="userSpaceOnUse" x1="8" y1="26" x2="56" y2="42">
          <stop offset="0" stopColor="#646D7A" />
          <stop offset="0.35" stopColor="#F2F4F7" />
          <stop offset="0.6" stopColor="#B2BAC5" />
          <stop offset="1" stopColor="#646D7A" />
        </linearGradient>
      </defs>
      <g transform="rotate(-30 32 32)">
        <path d="M14 36 L48 30" stroke={`url(#${id('pin')})`} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M14 38 L50 38" stroke={`url(#${id('pin')})`} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="11" cy="37" r="4.6" fill="none" stroke={`url(#${id('pin')})`} strokeWidth="2.6" />
        <path d="M45 27 h9 a3 3 0 0 1 3 3 v8 a3 3 0 0 1 -3 3 h-9 z" fill={`url(#${id('pin')})`} stroke="#5D6673" strokeWidth="1" />
        <path d="M48 30 L52 30" stroke="#5D6673" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </>
  ),
  'iron-bolt': (id) => (
    <>
      <defs>
        <MetalGradient id={id('bolt')} light="#C6CBD2" mid="#7D8591" dark="#3F4650" />
        <MetalGradient id={id('head')} light="#B9BFC8" mid="#6F7782" dark="#353B44" vertical />
      </defs>
      <g transform="rotate(-35 32 32)">
        <rect x="22" y="27" width="34" height="10" rx="1.5" fill={`url(#${id('bolt')})`} />
        {[26, 30, 34, 38, 42, 46, 50, 54].map((x) => (
          <path key={x} d={`M${x} 27 l-2 10`} stroke="#3F4650" strokeWidth="1" opacity="0.7" />
        ))}
        <path d="M8 22 L20 20 L24 32 L20 44 L8 42 L5 32 Z" fill={`url(#${id('head')})`} stroke="#353B44" strokeWidth="1" strokeLinejoin="round" />
        <path d="M12 23 L14 41" stroke="#DDE1E6" strokeWidth="1.2" opacity="0.7" />
      </g>
    </>
  ),
  'copper-coin': (id) => (
    <>
      <defs>
        <radialGradient id={id('coin')} cx="0.38" cy="0.34" r="0.75">
          <stop offset="0" stopColor="#F6B98A" />
          <stop offset="0.45" stopColor="#D4793F" />
          <stop offset="1" stopColor="#8E4618" />
        </radialGradient>
      </defs>
      <ellipse cx="33" cy="49" rx="18" ry="4" fill={SHADOW} opacity="0.12" />
      <circle cx="32" cy="32" r="19" fill="#8E4618" />
      <circle cx="32" cy="31" r="19" fill={`url(#${id('coin')})`} />
      <circle cx="32" cy="31" r="14.5" fill="none" stroke="#9C5221" strokeWidth="1.4" opacity="0.7" />
      <path d="M32 21 c4 5 4 10 0 14 c-4 -4 -4 -9 0 -14 z M24 31 c5 -2 9 0 8 4 c-5 1 -8 -1 -8 -4 z M40 31 c-5 -2 -9 0 -8 4 c5 1 8 -1 8 -4 z" fill="#A85A26" opacity="0.75" />
      <path d="M20 24 a14 14 0 0 1 9 -7" stroke="#FFE0C4" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
    </>
  ),
  'brass-key': (id) => key(id, { light: '#F6D873', mid: '#D3A72E', dark: '#8F6A12', edge: '#7A5A0E', shine: '#FFF1C2' }),
  'steel-key': (id) => key(id, { light: '#F2F4F7', mid: '#AEB6C1', dark: '#5D6673', edge: '#4B525C', shine: '#FFFFFF' }),
  'aluminium-can': (id) => (
    <>
      <defs>
        <MetalGradient id={id('can')} light="#FAFBFC" mid="#C3CAD3" dark="#7E8793" />
      </defs>
      <ellipse cx="33" cy="57" rx="14" ry="3" fill={SHADOW} opacity="0.12" />
      <rect x="18" y="12" width="28" height="44" rx="5" fill={`url(#${id('can')})`} />
      <rect x="18" y="24" width="28" height="18" fill="#2E8FD6" />
      <rect x="18" y="24" width="28" height="18" fill={`url(#${id('can')})`} opacity="0.35" />
      <path d="M24 33 h16" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="32" cy="12.5" rx="14" ry="3.6" fill="#D5DAE1" stroke="#8E97A3" strokeWidth="1" />
      <ellipse cx="32" cy="12.5" rx="10.5" ry="2.4" fill="#BAC1CB" />
      <path d="M30 11.6 h6 a1.6 1.6 0 0 1 0 3.2 h-6 z" fill="#9AA2AD" />
    </>
  ),
  'aluminium-foil': (id) => (
    <>
      <defs>
        <linearGradient id={id('foil')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8E97A3" />
          <stop offset="0.3" stopColor="#F7F9FB" />
          <stop offset="0.55" stopColor="#C3CAD3" />
          <stop offset="0.75" stopColor="#EEF1F5" />
          <stop offset="1" stopColor="#8E97A3" />
        </linearGradient>
      </defs>
      <ellipse cx="33" cy="55" rx="23" ry="3" fill={SHADOW} opacity="0.12" />
      <path d="M9 24 L20 15 L33 19 L46 12 L57 22 L54 35 L58 47 L45 53 L31 50 L17 54 L8 43 L12 33 Z" fill={`url(#${id('foil')})`} stroke="#8E97A3" strokeWidth="1" strokeLinejoin="round" />
      <path d="M20 15 L33 19 L29 31 Z M46 12 L57 22 L42 27 Z" fill="#FFFFFF" opacity="0.6" />
      <path d="M29 31 L42 27 L45 53 L31 50 Z" fill="#FFFFFF" opacity="0.3" />
      <path d="M12 33 L29 31 L17 54 L8 43 Z M42 27 L54 35 L45 53 Z" fill="#5D6673" opacity="0.16" />
      <path d="M20 15 L29 31 L42 27 L46 12 M29 31 L31 50 M42 27 L54 35 M29 31 L12 33 M9 24 L29 31" fill="none" stroke="#8E97A3" strokeWidth="0.8" strokeLinejoin="round" opacity="0.75" />
    </>
  ),
  'copper-wire': (id) => (
    <>
      <defs>
        <linearGradient id={id('copper')} gradientUnits="userSpaceOnUse" x1="8" y1="10" x2="56" y2="54">
          <stop offset="0" stopColor="#8E4618" />
          <stop offset="0.35" stopColor="#F6B98A" />
          <stop offset="0.6" stopColor="#D4793F" />
          <stop offset="1" stopColor="#8E4618" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="53" rx="22" ry="3" fill={SHADOW} opacity="0.12" />
      <g fill="none" stroke={`url(#${id('copper')})`} strokeWidth="2.8" strokeLinecap="round">
        <ellipse cx="27" cy="35" rx="17" ry="11" />
        <ellipse cx="31" cy="32.5" rx="17" ry="11" />
        <ellipse cx="35" cy="30" rx="17" ry="11" />
        <path d="M10.4 37 C6 42 7 48 13 50.5" />
        <path d="M51.6 28 C56 22 55 14 48 11" />
      </g>
      <g fill="none" stroke="#FFE0C4" strokeWidth="0.9" strokeLinecap="round" opacity="0.8">
        <path d="M14 30 C17 25 24 22.6 31 22.4" />
        <path d="M22 25 C26 21 32 19.4 38 19.4" />
      </g>
    </>
  ),
  'steel-spoon': (id) => (
    <>
      <defs>
        <MetalGradient id={id('handle')} light="#F4F6F9" mid="#B4BCC7" dark="#646D7A" vertical />
        <radialGradient id={id('bowl')} cx="0.62" cy="0.65" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#C3CAD3" />
          <stop offset="1" stopColor="#6A7380" />
        </radialGradient>
      </defs>
      <g transform="rotate(-35 32 32)">
        <ellipse cx="33" cy="32" rx="27" ry="2.6" fill={SHADOW} opacity="0.12" transform="translate(1 9)" />
        <path d="M25 30.6 C34 30.8 44 29.6 54 28.6 C58.5 28.2 60.5 30 60.5 32 C60.5 34 58.5 35.8 54 35.4 C44 34.4 34 33.2 25 33.4 Z" fill={`url(#${id('handle')})`} stroke="#5D6673" strokeWidth="0.8" />
        <ellipse cx="15" cy="32" rx="12" ry="8.5" fill="#8E97A3" stroke="#5D6673" strokeWidth="1" />
        <ellipse cx="15.4" cy="32" rx="10.2" ry="6.9" fill={`url(#${id('bowl')})`} />
        <ellipse cx="11.5" cy="29" rx="3.6" ry="1.7" fill="#FFFFFF" opacity="0.8" transform="rotate(-12 11.5 29)" />
        <path d="M30 31.4 C38 31.2 46 30.4 55 29.6" fill="none" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
      </g>
    </>
  ),
  'steel-tumbler': (id) => (
    <>
      <defs>
        <linearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6A7380" />
          <stop offset="0.2" stopColor="#F4F6F9" />
          <stop offset="0.42" stopColor="#AEB6C1" />
          <stop offset="0.7" stopColor="#E9EDF2" />
          <stop offset="1" stopColor="#7E8793" />
        </linearGradient>
      </defs>
      <ellipse cx="33" cy="57" rx="15" ry="3" fill={SHADOW} opacity="0.12" />
      <path d="M17 12 L47 12 L43 53.5 Q42.8 56 40.5 56 L23.5 56 Q21.2 56 21 53.5 Z" fill={`url(#${id('steel')})`} stroke="#6A7380" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M21.6 50.5 Q32 53 42.4 50.5" fill="none" stroke="#6A7380" strokeWidth="0.8" opacity="0.6" />
      <path d="M23 17 L25.4 51" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <ellipse cx="32" cy="12" rx="15" ry="3.6" fill="#DDE2E8" stroke="#7E8793" strokeWidth="0.9" />
      <ellipse cx="32" cy="12.2" rx="12.4" ry="2.5" fill="#8E97A3" />
      <path d="M21 12.6 Q32 15.4 43 12.6" fill="none" stroke="#C3CAD3" strokeWidth="0.9" opacity="0.8" />
    </>
  ),
  'wooden-block': (id) => (
    <>
      <defs>
        <linearGradient id={id('top')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2C98E" />
          <stop offset="1" stopColor="#DDA25E" />
        </linearGradient>
        <linearGradient id={id('side')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C88743" />
          <stop offset="1" stopColor="#9E6227" />
        </linearGradient>
      </defs>
      <ellipse cx="33" cy="54" rx="22" ry="3.5" fill={SHADOW} opacity="0.12" />
      <path d="M10 22 L32 12 L54 22 L32 32 Z" fill={`url(#${id('top')})`} />
      <path d="M10 22 L32 32 V53 L10 43 Z" fill={`url(#${id('side')})`} />
      <path d="M54 22 L32 32 V53 L54 43 Z" fill="#B57434" />
      <path d="M16 21 q8 -3 16 1 q8 4 14 0 M20 25 q8 -3 14 1" stroke="#B9783A" strokeWidth="0.9" fill="none" opacity="0.7" />
      <path d="M14 31 q6 3 4 9 M22 34 q5 4 3 12 M38 36 q5 -3 10 -3 M37 44 q6 -2 13 -6" stroke="#875220" strokeWidth="0.9" fill="none" opacity="0.6" />
      <circle cx="44" cy="40" r="1.6" fill="#875220" opacity="0.6" />
    </>
  ),
  'ice-cream-stick': (id) => (
    <>
      <defs>
        <LightWood id={id('wood')} />
      </defs>
      <g transform="rotate(-35 32 32)">
        <ellipse cx="32" cy="32" rx="26" ry="2.6" fill={SHADOW} opacity="0.12" transform="translate(1 9)" />
        <rect x="5" y="26.5" width="54" height="11" rx="5.5" fill={`url(#${id('wood')})`} stroke="#B98143" strokeWidth="0.8" />
        <path d="M9 28.6 H55" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <g fill="none" stroke="#B57D40" strokeWidth="0.7" opacity="0.55">
          <path d="M11 30.6 Q24 29.6 37 30.6 T56 30.4" />
          <path d="M8 33.2 Q21 34.2 34 33.2 T55 33.6" />
          <path d="M14 35.4 Q29 34.8 45 35.6" />
        </g>
      </g>
    </>
  ),
  'cricket-bat': (id) => (
    <>
      <defs>
        <LightWood id={id('willow')} />
      </defs>
      <g transform="rotate(-40 32 32)">
        <ellipse cx="33" cy="32" rx="29" ry="2.6" fill={SHADOW} opacity="0.12" transform="translate(1 10)" />
        <path
          d="M24 25.5 Q24.6 25 26.4 25 H59 Q62.5 25 62.5 28.5 V35.5 Q62.5 39 59 39 H26.4 Q24.6 39 24 38.5 Q21.6 35.2 19 34.2 V29.8 Q21.6 28.8 24 25.5 Z"
          fill={`url(#${id('willow')})`}
          stroke="#B58146"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <path d="M27 27.2 H59" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <g fill="none" stroke="#B57D40" strokeWidth="0.6" opacity="0.5">
          <path d="M28 30 H58 M30 33.4 H60 M27 36.4 H57" />
        </g>
        <rect x="3" y="29.8" width="18" height="4.4" rx="2" fill="#2E2A6B" />
        {[6, 8.6, 11.2, 13.8, 16.4].map((x) => (
          <path key={x} d={`M${x} 29.8 v4.4`} stroke="#5C58A6" strokeWidth="0.8" />
        ))}
      </g>
    </>
  ),
  'wooden-chair': (id) => (
    <>
      <defs>
        <linearGradient id={id('seat')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2C98E" />
          <stop offset="1" stopColor="#D99A55" />
        </linearGradient>
        <linearGradient id={id('post')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D69552" />
          <stop offset="1" stopColor="#A9692D" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="60" rx="23" ry="2.6" fill={SHADOW} opacity="0.12" />
      {/* Back legs, then the back rest */}
      <rect x="18" y="40" width="3.4" height="15" rx="1" fill="#8E5522" />
      <rect x="42.6" y="40" width="3.4" height="15" rx="1" fill="#8E5522" />
      <rect x="17" y="5" width="4.4" height="31" rx="1.4" fill={`url(#${id('post')})`} />
      <rect x="42.6" y="5" width="4.4" height="31" rx="1.4" fill={`url(#${id('post')})`} />
      <rect x="17" y="5" width="30" height="7" rx="2" fill={`url(#${id('seat')})`} stroke="#B57434" strokeWidth="0.7" />
      <rect x="25.4" y="12" width="3.6" height="22" fill="#C88743" />
      <rect x="35" y="12" width="3.6" height="22" fill="#C88743" />
      <path d="M19 7.4 q7 -1.4 13 0.4 q7 1.6 13 -0.2" fill="none" stroke="#B9783A" strokeWidth="0.7" opacity="0.7" />
      {/* Seat and front legs */}
      <path d="M17 34 H47 L53 41 H11 Z" fill={`url(#${id('seat')})`} stroke="#B57434" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M16 37 q9 -1.6 17 0 q8 1.6 15 0" fill="none" stroke="#B9783A" strokeWidth="0.7" opacity="0.7" />
      <rect x="11" y="41" width="42" height="4" fill="#B57434" />
      <rect x="12" y="45" width="4" height="15" rx="1" fill={`url(#${id('post')})`} />
      <rect x="48" y="45" width="4" height="15" rx="1" fill={`url(#${id('post')})`} />
    </>
  ),
  'plastic-ruler': () => (
    <g transform="rotate(-32 32 32)">
      <rect x="2" y="25" width="60" height="14" rx="2.5" fill="#FFD23F" stroke="#D9A400" strokeWidth="1" />
      <rect x="2" y="25" width="60" height="5" rx="2" fill="#FFFFFF" opacity="0.35" />
      {Array.from({ length: 13 }, (_, i) => (
        <path key={i} d={`M${6 + i * 4.5} 25 v${i % 2 === 0 ? 6 : 3.5}`} stroke="#6E5600" strokeWidth="0.9" />
      ))}
      <text x="9" y="37.5" fontSize="5" fontWeight="700" fill="#6E5600" fontFamily="Nunito Variable, sans-serif">
        cm
      </text>
    </g>
  ),
  'plastic-straw': (id) => (
    <>
      <defs>
        <linearGradient id={id('tube')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#DCD8EA" />
          <stop offset="0.45" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#C9C5DD" />
        </linearGradient>
        <clipPath id={id('long')}>
          <rect x="29" y="22" width="6" height="38" rx="1" />
        </clipPath>
        <clipPath id={id('short')}>
          <rect x="29" y="2" width="6" height="13.4" rx="1" />
        </clipPath>
      </defs>
      <ellipse cx="33" cy="57" rx="17" ry="2.6" fill={SHADOW} opacity="0.12" transform="rotate(-8 33 57)" />
      <g transform="rotate(28 32 34)">
        <rect x="29" y="22" width="6" height="38" rx="1" fill={`url(#${id('tube')})`} />
        <g clipPath={`url(#${id('long')})`} stroke="#E4513B" strokeWidth="2.4" opacity="0.9">
          {[24, 30, 36, 42, 48, 54, 60].map((y) => (
            <path key={y} d={`M27 ${y} L37 ${y - 4}`} />
          ))}
        </g>
        <rect x="29" y="22" width="6" height="38" rx="1" fill="none" stroke="#B5B1CC" strokeWidth="0.7" />
        {/* The bendy part */}
        <rect x="29" y="15" width="6" height="7.4" fill="#ECEAF4" stroke="#B5B1CC" strokeWidth="0.7" />
        <path d="M29 17 h6 M29 19 h6 M29 21 h6" stroke="#B5B1CC" strokeWidth="0.8" />
        <g transform="rotate(-42 32 15)">
          <rect x="29" y="2" width="6" height="13.4" rx="1" fill={`url(#${id('tube')})`} />
          <g clipPath={`url(#${id('short')})`} stroke="#E4513B" strokeWidth="2.4" opacity="0.9">
            {[4, 10, 16, 22].map((y) => (
              <path key={y} d={`M27 ${y} L37 ${y - 4}`} />
            ))}
          </g>
          <rect x="29" y="2" width="6" height="13.4" rx="1" fill="none" stroke="#B5B1CC" strokeWidth="0.7" />
        </g>
      </g>
    </>
  ),
  'plastic-comb': (id) => (
    <>
      <defs>
        <linearGradient id={id('comb')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6FB2F2" />
          <stop offset="0.5" stopColor="#2E7ED6" />
          <stop offset="1" stopColor="#1F5FAE" />
        </linearGradient>
      </defs>
      <g transform="rotate(-22 32 32)">
        <ellipse cx="32" cy="32" rx="27" ry="2.6" fill={SHADOW} opacity="0.12" transform="translate(1 14)" />
        {Array.from({ length: 15 }, (_, i) => (
          <rect key={i} x={8.6 + i * 3.2} y="25" width="1.9" height={i < 6 ? 18 : 15} rx="0.9" fill="#2A72C6" />
        ))}
        <rect x="6" y="18" width="52" height="9" rx="3" fill={`url(#${id('comb')})`} />
        <rect x="8" y="19.4" width="48" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.45" />
      </g>
    </>
  ),
  'pencil-lead': (id) => (
    <>
      <defs>
        <linearGradient id={id('paint')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="0.5" stopColor="#F2B90F" />
          <stop offset="1" stopColor="#C98F00" />
        </linearGradient>
        <linearGradient id={id('graphite')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F3238" />
          <stop offset="0.4" stopColor="#9095A0" />
          <stop offset="1" stopColor="#2F3238" />
        </linearGradient>
      </defs>
      <g transform="rotate(-35 32 32)">
        <ellipse cx="32" cy="32" rx="27" ry="2.6" fill={SHADOW} opacity="0.12" transform="translate(1 9)" />
        <rect x="4" y="27" width="42" height="10" rx="1" fill={`url(#${id('paint')})`} />
        <path d="M5 30.3 H46 M5 33.7 H46" stroke="#D9A400" strokeWidth="0.6" opacity="0.7" />
        <path d="M6 28.5 H44" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
        {/* Cut open to show the graphite inside */}
        <rect x="16" y="28.4" width="18" height="7.2" rx="0.8" fill="#EBC78F" stroke="#B98143" strokeWidth="0.6" />
        <rect x="16" y="30.3" width="18" height="3.4" fill={`url(#${id('graphite')})`} />
        <path d="M46 27 L56 30.4 V33.6 L46 37 Z" fill="#EBC78F" />
        <path d="M46 27 q2 2.5 0 5 q2 2.5 0 5" fill="none" stroke="#C9A06A" strokeWidth="0.8" />
        <path d="M56 30.4 L61.5 32 L56 33.6 Z" fill={`url(#${id('graphite')})`} />
      </g>
    </>
  ),
  'rubber-eraser': (id) => (
    <>
      <defs>
        <linearGradient id={id('pink')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB3C4" />
          <stop offset="1" stopColor="#E9809A" />
        </linearGradient>
      </defs>
      <ellipse cx="33" cy="47" rx="22" ry="3.5" fill={SHADOW} opacity="0.12" />
      <g transform="rotate(-12 32 34)">
        <path d="M10 26 L40 26 L40 44 L12 44 Q8 44 8 40 V30 Q8 26 10 26 Z" fill={`url(#${id('pink')})`} />
        <path d="M40 26 L54 26 Q58 26 58 30 V40 Q58 44 54 44 L40 44 Z" fill="#4C7BD9" />
        <path d="M12 29 H52" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      </g>
    </>
  ),
  'rubber-band': () => (
    <>
      <ellipse cx="33" cy="51" rx="21" ry="3" fill={SHADOW} opacity="0.12" />
      <path d="M13 33 C11 22 24 15 38 17 C51 19 57 28 53 37 C49 46 34 49 23 46 C16 44 13.5 39 13 33 Z" fill="none" stroke="#A8620F" strokeWidth="5" transform="translate(0.5 1)" opacity="0.55" />
      <path d="M13 33 C11 22 24 15 38 17 C51 19 57 28 53 37 C49 46 34 49 23 46 C16 44 13.5 39 13 33 Z" fill="none" stroke="#E9A23B" strokeWidth="3.6" />
      <path d="M15.6 28 C18.5 21.5 27 17.6 36.5 18.2" fill="none" stroke="#FFD99A" strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
    </>
  ),
  'glass-marble': (id) => (
    <>
      <defs>
        <radialGradient id={id('glass')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#E8FBFF" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#7FD3E6" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2A8FB0" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <ellipse cx="33" cy="52" rx="14" ry="3" fill={SHADOW} opacity="0.12" />
      <circle cx="32" cy="34" r="16" fill={`url(#${id('glass')})`} stroke="#2A8FB0" strokeWidth="0.8" />
      <path d="M22 38 q6 -10 14 -6 q6 3 10 -2" stroke="#F06A4D" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M24 30 q5 6 12 4" stroke="#F2A516" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />
      <ellipse cx="26" cy="26" rx="4.5" ry="3" fill="#FFFFFF" opacity="0.85" transform="rotate(-30 26 26)" />
    </>
  ),
  'cotton-thread': () => (
    <>
      <ellipse cx="33" cy="56" rx="17" ry="3" fill={SHADOW} opacity="0.12" />
      {/* Wooden reel: bottom rim, the wound thread, then the top rim */}
      <ellipse cx="32" cy="50" rx="14" ry="4.4" fill="#B57434" />
      <rect x="18" y="46" width="28" height="4" fill="#D9A066" />
      <ellipse cx="32" cy="46" rx="14" ry="4.4" fill="#E7B57A" />
      <path d="M20 16 H44 V45 Q32 48.6 20 45 Z" fill="#E4513B" />
      <path d="M20 16 H25 V46 Q22 45.6 20 45 Z" fill="#B5301E" opacity="0.55" />
      <path d="M37 16 H41 V46.2 Q39 46.6 37 46.6 Z" fill="#F58A73" opacity="0.7" />
      <g fill="none" stroke="#8F2418" strokeWidth="0.55" opacity="0.5">
        {[19, 21.6, 24.2, 26.8, 29.4, 32, 34.6, 37.2, 39.8, 42.4].map((y) => (
          <path key={y} d={`M20 ${y} Q32 ${y + 1.4} 44 ${y}`} />
        ))}
      </g>
      <rect x="18" y="12" width="28" height="4" fill="#D9A066" />
      <ellipse cx="32" cy="12" rx="14" ry="4.4" fill="#F2C98E" stroke="#B57434" strokeWidth="0.8" />
      <ellipse cx="32" cy="12" rx="3.2" ry="1.2" fill="#875220" />
      <path d="M44 31 C51 31.5 55.5 37 52.5 43 C50 47.5 54 51.5 58.5 49.5" fill="none" stroke="#E4513B" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  'cotton-towel': () => (
    <>
      <ellipse cx="33" cy="55" rx="25" ry="3" fill={SHADOW} opacity="0.12" />
      {/* Lower fold */}
      <path d="M8 40 Q8 36 12 36 H53 Q57 36 57 40 V48 Q57 52 53 52 H12 Q8 52 8 48 Z" fill="#4E9CCB" />
      <rect x="45" y="36" width="3.2" height="16" fill="#FFFFFF" opacity="0.85" />
      <rect x="50" y="36" width="1.6" height="16" fill="#F2A516" opacity="0.9" />
      {/* Upper fold, with the soft rounded edge on the left */}
      <path d="M10 25 Q10 21 15 21 H54 Q57 21 57 24 V35 Q57 38 54 38 H15 Q10 38 10 34 Z" fill="#7CC0E6" />
      <path d="M15 21 Q8.6 29.5 15 38" fill="none" stroke="#4E9CCB" strokeWidth="1.2" />
      <rect x="45" y="21" width="3.2" height="17" fill="#FFFFFF" opacity="0.9" />
      <rect x="50" y="21" width="1.6" height="17" fill="#F2A516" opacity="0.9" />
      {/* Terry loops */}
      <g fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="0.8 1.8" strokeLinecap="round" opacity="0.55">
        <path d="M15 25 H43 M14 29 H43 M14 33 H43" />
        <path d="M12 41 H43 M12 45 H43 M12 49 H43" />
      </g>
    </>
  ),
  bedsheet: () => (
    <>
      <ellipse cx="33" cy="55" rx="25" ry="3" fill={SHADOW} opacity="0.12" />
      {/* Thin folded layers under the top fold */}
      <path d="M8 46 Q8 43 11 43 H54 Q57 43 57 46 V49 Q57 52 54 52 H11 Q8 52 8 49 Z" fill="#C45E86" />
      <path d="M8 41 Q8 38 11 38 H54 Q57 38 57 41 V44 Q57 47 54 47 H11 Q8 47 8 44 Z" fill="#E888AA" />
      <path d="M8 36 Q8 33 11 33 H54 Q57 33 57 36 V39 Q57 42 54 42 H11 Q8 42 8 39 Z" fill="#D46F96" />
      {/* Top fold with a flower print */}
      <path d="M9 21 Q9 17 13 17 H54 Q57 17 57 20 V33 Q57 36 54 36 H13 Q9 36 9 32 Z" fill="#F4A7C0" />
      <path d="M13 17 Q7.6 26.5 13 36" fill="none" stroke="#D46F96" strokeWidth="1.1" />
      <path d="M12 33.6 H55" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="1.6 1.4" opacity="0.8" />
      {[
        [20, 23],
        [33, 28],
        [46, 22.4],
        [26, 31.4],
        [51, 30.6],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          {[0, 72, 144, 216, 288].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return <circle key={deg} cx={cx + 2.1 * Math.cos(a)} cy={cy + 2.1 * Math.sin(a)} r="1.4" fill="#FFFFFF" opacity="0.95" />;
          })}
          <circle cx={cx} cy={cy} r="1.1" fill="#F2A516" />
        </g>
      ))}
    </>
  ),
};
