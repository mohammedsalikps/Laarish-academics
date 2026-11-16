import { ShieldAlert } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { ObjectPicture } from '../components/art/ObjectArt';
import { cn } from '../lib/cn';
import type { HowToStep } from './howTo';
import { BarMagnet, HorseshoeMagnet } from './magnet/MagnetArt';

/*
 * "How to play" in pictures. Every picture is a small inline SVG (96 x 64 units)
 * of the move itself: a hand dragging, a finger tapping, a hand turning a clock
 * hand. When motion is allowed each one plays its move three times and then
 * rests; without motion (the reducedMotion prop, html[data-motion=reduce] or the
 * OS setting before the app starts) the same drawing stands still, and the
 * dashed arrows and ripples still show what to do.
 */

/** Plays a move: 2.8 s, three times, after a short pause. Every rule is off when motion is reduced. */
const HOW_TO_CSS = `
.howto-anim{animation-duration:2.8s;animation-timing-function:ease-in-out;animation-delay:400ms;animation-iteration-count:3}
.howto-move{animation-name:howto-move}
.howto-tap{animation-name:howto-tap;transform-box:fill-box;transform-origin:50% 0}
.howto-ripple{animation-name:howto-ripple;transform-box:fill-box;transform-origin:center}
.howto-turn{animation-name:howto-turn}
.howto-grow{animation-name:howto-grow;transform-box:fill-box}
.howto-glow{animation-name:howto-glow}
.howto-draw{animation-name:howto-draw}
html[data-motion='reduce'] .howto-anim{animation:none!important}
@media (prefers-reduced-motion:reduce){html:not([data-motion]) .howto-anim{animation:none!important}}
@keyframes howto-move{0%,12%{transform:translate(var(--fx,0px),var(--fy,0px))}50%,82%{transform:translate(var(--tx,0px),var(--ty,0px))}100%{transform:translate(var(--fx,0px),var(--fy,0px))}}
@keyframes howto-tap{0%,35%,65%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(2px) scale(.94)}}
@keyframes howto-ripple{0%,45%{opacity:0;transform:scale(.3)}55%{opacity:.9}100%{opacity:0;transform:scale(1.5)}}
@keyframes howto-turn{0%,12%{transform:rotate(0deg)}70%,88%{transform:rotate(var(--turn,90deg))}100%{transform:rotate(0deg)}}
@keyframes howto-grow{0%,12%{transform:scale(var(--sx,1),var(--sy,1))}50%,82%{transform:scale(1,1)}100%{transform:scale(var(--sx,1),var(--sy,1))}}
@keyframes howto-glow{0%,35%{opacity:.25}60%,100%{opacity:1}}
@keyframes howto-draw{0%,10%{stroke-dashoffset:1}60%,100%{stroke-dashoffset:0}}
`;

type Kind = 'move' | 'tap' | 'ripple' | 'turn' | 'grow' | 'glow' | 'draw';

/** Class for an animated part, or nothing when motion is off. */
const anim = (on: boolean, kind: Kind): string | undefined => (on ? `howto-anim howto-${kind}` : undefined);
/** CSS custom properties for the keyframes (distances in SVG user units). */
const vars = (v: Record<string, string>) => v as CSSProperties;

/**
 * The 2-3 steps of a game as a numbered list of pictures with short captions.
 * `note` is a rule that must always be seen with the steps (the circuit's safety line).
 */
export function HowToSteps({ steps, animate, note }: { steps: HowToStep[]; animate: boolean; note?: string }) {
  return (
    <div>
      {animate && <style>{HOW_TO_CSS}</style>}
      <ol aria-label="How to play in pictures" data-animated={animate ? 'true' : 'false'} className={cn('grid gap-2', steps.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {steps.map((s, i) => (
          <li key={`${s.scene}-${i}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2 shadow-soft sm:flex-col sm:items-stretch sm:p-3">
            <HowToPicture step={s} animate={animate} />
            <p className="flex min-w-0 items-start gap-2 text-[0.95rem] font-bold leading-snug text-ink">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <span className="min-w-0">{s.text}</span>
            </p>
          </li>
        ))}
      </ol>
      {note && (
        <p className="mt-2 flex items-start gap-1.5 text-sm font-bold text-ink-soft">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-coral-strong" aria-hidden="true" /> {note}
        </p>
      )}
    </div>
  );
}

/** One step's drawing. Decorative: the caption next to it says the same thing in words. */
export function HowToPicture({ step, animate }: { step: HowToStep; animate: boolean }) {
  const Scene = SCENES[step.scene];
  return (
    <svg viewBox="0 0 96 64" className="h-auto w-24 shrink-0 rounded-xl bg-canvas sm:w-full" aria-hidden="true" focusable="false" data-scene={step.scene}>
      <Scene a={animate} variant={step.variant} />
    </svg>
  );
}

/* ------------------------------------------------------------- parts */

/** A pointing hand; the fingertip is at (x, y). With `tap` it presses down and up. */
const FINGER = 'M-3 2a3 3 0 0 1 6 0v8h6a3 3 0 0 1 3 3v6a7 7 0 0 1-7 7h-5a6 6 0 0 1-5.5-3.5l-3.5-6a2.5 2.5 0 0 1 4-2.5l2 2.5z';
function Finger({ x, y, tap, a }: { x: number; y: number; tap?: boolean; a?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.8)`}>
      <g className={tap ? anim(Boolean(a), 'tap') : undefined}>
        <path d={FINGER} className="fill-surface stroke-ink" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 10v3.5M9 10v3.5" className="stroke-ink" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** The ring of a tap. */
function Ripple({ x, y, a, r = 7 }: { x: number; y: number; a: boolean; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="none" className={cn('stroke-primary', anim(a, 'ripple'))} strokeWidth="2" opacity="0.6" />;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** A dashed path with an arrowhead at `tip`, pointing along `angle` (degrees, 0 = right, 90 = down). */
function Arrow({ d, tip, angle }: { d: string; tip: [number, number]; angle: number }) {
  const [x, y] = tip;
  const p = (off: number) => {
    const r = ((angle + off) * Math.PI) / 180;
    return `${round1(x + 5 * Math.cos(r))} ${round1(y + 5 * Math.sin(r))}`;
  };
  return (
    <g className="stroke-primary" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} strokeDasharray="3 3" />
      <path d={`M${p(150)} L${x} ${y} L${p(-150)}`} />
    </g>
  );
}

/** A small card with two lines of "text". */
function Card({ x, y, w = 30, h = 14, tone = 'plain' }: { x: number; y: number; w?: number; h?: number; tone?: 'plain' | 'selected' | 'target' | 'done' }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="3.5"
        strokeWidth="1.5"
        strokeDasharray={tone === 'target' ? '3 2' : undefined}
        className={tone === 'selected' ? 'fill-primary-soft stroke-primary' : tone === 'done' ? 'fill-success-soft stroke-success' : tone === 'target' ? 'fill-canvas-sunken stroke-line-strong' : 'fill-surface stroke-line-strong'}
      />
      <rect x={x + 4} y={y + h / 2 - 3.5} width={w * 0.6} height="2.2" rx="1.1" className="fill-ink/30" />
      <rect x={x + 4} y={y + h / 2 + 1.3} width={w * 0.38} height="2.2" rx="1.1" className="fill-ink/20" />
    </g>
  );
}

/** An open box (the sort game's bins and the magnet trays). */
function Bin({ x, y, w = 36, children, hot }: { x: number; y: number; w?: number; children?: ReactNode; hot?: boolean }) {
  return (
    <g>
      <path d={`M${x} ${y} h${w} l-3 18 h-${w - 6} z`} strokeWidth="1.5" strokeDasharray="3 2" className={hot ? 'fill-primary-soft stroke-primary' : 'fill-surface stroke-line-strong'} />
      {children}
    </g>
  );
}

/** A rounded button with a label, like the games' main buttons. */
function Button({ x, y, w, label, tone = 'green' }: { x: number; y: number; w: number; label: string; tone?: 'green' | 'gold' }) {
  return (
    <g>
      <rect x={x} y={y + 2} width={w} height="15" rx="6" fill={tone === 'green' ? '#0E5C38' : '#C49216'} />
      <rect x={x} y={y} width={w} height="15" rx="6" fill={tone === 'green' ? '#16804E' : '#F2B42A'} />
      <text x={x + w / 2} y={y + 10.5} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={tone === 'green' ? '#FFFFFF' : '#1D1A4A'} className="font-display">
        {label}
      </text>
    </g>
  );
}

/** A floor or surface swatch. */
const SWATCH = { wood: '#C8925A', grass: '#7CC36B', ice: '#CDEBFA' } as const;
function Swatch({ x, y, kind, selected }: { x: number; y: number; kind: keyof typeof SWATCH; selected?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width="24" height="20" rx="4" fill={SWATCH[kind]} strokeWidth={selected ? 2.5 : 1.2} className={selected ? 'stroke-primary' : 'stroke-line-strong'} />
      {kind === 'wood' && <path d={`M${x + 3} ${y + 7}h18M${x + 3} ${y + 13}h12`} stroke="#9A6A3A" strokeWidth="1" strokeLinecap="round" />}
      {kind === 'grass' && <path d={`M${x + 5} ${y + 16}l2-6l2 6M${x + 12} ${y + 16}l2-7l2 7M${x + 18} ${y + 16}l1.5-5l1.5 5`} stroke="#4C9A3E" strokeWidth="1" fill="none" />}
      {kind === 'ice' && <path d={`M${x + 4} ${y + 6}l6-3M${x + 12} ${y + 15}l7-4`} stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />}
    </g>
  );
}

function Car({ x, y, scale = 0.3 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M4 -14 C 4 -20 8 -22 14 -22 L 20 -22 L 27 -33 C 28 -35 30 -36 32 -36 L 46 -36 C 49 -36 51 -35 52 -33 L 57 -24 C 61 -23 64 -20 64 -16 L 64 -11 C 64 -9 62 -8 60 -8 L 6 -8 C 4 -8 4 -10 4 -14 Z" fill="#F06A4D" />
      <path d="M29 -24 L 33 -32 L 44 -32 L 44 -24 Z" fill="#DDF3FF" />
      <circle cx="16" cy="-8" r="8" fill="#2B2A3F" />
      <circle cx="50" cy="-8" r="8" fill="#2B2A3F" />
      <circle cx="16" cy="-8" r="4" fill="#C9C6DA" />
      <circle cx="50" cy="-8" r="4" fill="#C9C6DA" />
    </g>
  );
}

/** A balance scale; `tilt` in degrees (positive: the right side is down). */
function Scale({ tilt, left, right }: { tilt: number; left: string; right: string }) {
  const px = 48;
  const py = 8;
  const arm = 27;
  const t = (tilt * Math.PI) / 180;
  const ends: [number, number][] = [
    [round1(px - arm * Math.cos(t)), round1(py - arm * Math.sin(t))],
    [round1(px + arm * Math.cos(t)), round1(py + arm * Math.sin(t))],
  ];
  return (
    <g>
      <path d="M40 35h16l-3-4h-10z" fill="#6B6F8C" />
      <rect x="46.5" y={py} width="3" height="24" rx="1.5" fill="#8B8FA8" />
      <line x1={ends[0][0]} y1={ends[0][1]} x2={ends[1][0]} y2={ends[1][1]} stroke="#5847E0" strokeWidth="3" strokeLinecap="round" />
      <circle cx={px} cy={py} r="3" fill="#F2A516" />
      {ends.map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y}l-9 13M${x} ${y}l9 13`} stroke="#8B8FA8" strokeWidth="1.2" />
          <path d={`M${x - 12} ${y + 13}q12 7 24 0z`} fill="#F2A516" stroke="#C98500" strokeWidth="1" />
          <rect x={x - 8} y={y + 3} width="16" height="9" rx="2.5" fill="#FFFFFF" stroke="#D9DBE8" />
          <text x={x} y={y + 10.3} textAnchor="middle" fontSize="7.5" fontWeight="800" className="fill-ink font-display">
            {i ? right : left}
          </text>
        </g>
      ))}
    </g>
  );
}

/** A number tile (balance choices). */
function Tile({ x, y, label, on }: { x: number; y: number; label: string; on?: boolean }) {
  return (
    <g>
      <rect x={x} y={y + 1.5} width="16" height="14" rx="3.5" className="fill-line-strong" />
      <rect x={x} y={y} width="16" height="14" rx="3.5" strokeWidth="1.4" className={on ? 'fill-primary stroke-primary' : 'fill-surface stroke-line-strong'} />
      <text x={x + 8} y={y + 10.3} textAnchor="middle" fontSize="9" fontWeight="800" className={cn('font-display', on ? 'fill-white' : 'fill-ink')}>
        {label}
      </text>
    </g>
  );
}

/** A word tile (sentence builder). */
function WordTile({ x, y, w, word, placed }: { x: number; y: number; w: number; word: string; placed?: boolean }) {
  return (
    <g>
      <rect x={x} y={y + 1.5} width={w} height="13" rx="3.5" className="fill-line-strong" />
      <rect x={x} y={y} width={w} height="13" rx="3.5" strokeWidth="1.4" className={placed ? 'fill-surface stroke-primary' : 'fill-surface stroke-line-strong'} />
      <text x={x + w / 2} y={y + 9.4} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-ink font-display">
        {word}
      </text>
    </g>
  );
}

/** The sentence strip with its first word in place. */
function Strip({ words }: { words: string[] }) {
  const widths = words.map((w) => Math.max(14, w.length * 5 + 8));
  const starts = widths.map((_, i) => 8 + widths.slice(0, i).reduce((sum, wd) => sum + wd + 4, 0));
  const slotX = 8 + widths.reduce((sum, wd) => sum + wd + 4, 0);
  return (
    <g>
      <rect x="4" y="5" width="88" height="21" rx="5" fill="none" strokeWidth="1.5" strokeDasharray="3 2" className="stroke-line-strong" />
      {words.map((w, i) => (
        <WordTile key={w} x={starts[i]} y={9} w={widths[i]} word={w} placed />
      ))}
      <rect x={slotX} y="9" width="18" height="13" rx="3.5" fill="none" strokeWidth="1.2" strokeDasharray="2 2" className="stroke-primary/60" />
    </g>
  );
}

/** A number line from 0 to 5 along y. */
function NumberLine({ y }: { y: number }) {
  return (
    <g>
      <line x1="6" x2="90" y1={y} y2={y} className="stroke-ink" strokeWidth="2" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <g key={n}>
          <line x1={12 + n * 14.4} x2={12 + n * 14.4} y1={y - 4} y2={y + 4} className="stroke-ink" strokeWidth="1.6" />
          <text x={12 + n * 14.4} y={y + 13} textAnchor="middle" fontSize="7.5" fontWeight="800" className="fill-ink font-display">
            {n}
          </text>
        </g>
      ))}
    </g>
  );
}

/** The marker pin; its point is at (x, y). */
function Pin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0C-5 -7 -7 -10 -7 -13a7 7 0 0 1 14 0c0 3-2 6-7 13z" className="fill-primary" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="0" cy="-13" r="2.6" fill="#FFFFFF" />
    </g>
  );
}

/** A clock face centred at (48, 32) with the hands at `minute` and `hour` degrees (0 = 12 o'clock). */
function ClockFace({ children }: { children: ReactNode }) {
  return (
    <g>
      <circle cx="48" cy="32" r="27" className="fill-surface stroke-ink" strokeWidth="2.5" />
      {Array.from({ length: 12 }, (_, i) => {
        const r = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={round1(48 + 22 * Math.sin(r))}
            y1={round1(32 - 22 * Math.cos(r))}
            x2={round1(48 + 25 * Math.sin(r))}
            y2={round1(32 - 25 * Math.cos(r))}
            className="stroke-ink"
            strokeWidth={i % 3 === 0 ? 2.2 : 1.2}
            strokeLinecap="round"
          />
        );
      })}
      {children}
      <circle cx="48" cy="32" r="2.8" className="fill-ink" />
    </g>
  );
}
const HAND_ORIGIN: CSSProperties = { transformOrigin: '48px 32px' };

/** The horseshoe magnet of Magnet Explorer at 42%, poles facing left around y = 32. */
function Horseshoe() {
  return (
    <g transform="translate(46 7) scale(0.42)">
      <HorseshoeMagnet />
    </g>
  );
}

/** The circuit loop with its cell, bulb and gap; `lit` makes the bulb glow, `inGap` puts a coin in the gap. */
function Circuit({ lit, a, inGap }: { lit?: boolean; a: boolean; inGap?: boolean }) {
  return (
    <g>
      <path d="M38 44H10V10H86V44H58" fill="none" className="stroke-ink" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="5" y="20" width="10" height="14" fill="#FFFFFF" />
      <path d="M4 24h12M7 29h6" className="stroke-ink" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="38" cy="44" r="2.2" className="fill-ink" />
      <circle cx="58" cy="44" r="2.2" className="fill-ink" />
      {lit && (
        <g className={anim(a, 'glow')} stroke="#F2A516" strokeWidth="2" strokeLinecap="round">
          <path d="M48 0.5v1.5M37 4l2 1.5M59 4l-2 1.5M34 12h2.5M62 12h-2.5" />
        </g>
      )}
      <circle cx="48" cy="11" r="6.5" fill={lit ? '#FFD54A' : '#FFF6D5'} className={cn('stroke-ink', lit && anim(a, 'glow'))} strokeWidth="1.6" />
      {inGap && <ObjectPicture art="copper-coin" size={16} x={40} y={36} />}
    </g>
  );
}

/** A 3 x 3 patch of map; `cell` returns the fill of each square. */
function MapGrid({ x, y, size = 15, highlight }: { x: number; y: number; size?: number; highlight?: [number, number][] }) {
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const c = i % 3;
        const r = Math.floor(i / 3);
        const on = highlight?.some(([hc, hr]) => hc === c && hr === r);
        return <rect key={i} x={x + c * size + 1} y={y + r * size + 1} width={size - 2} height={size - 2} rx="2.5" fill={on ? '#F3FBF1' : '#CBE8C4'} stroke={on ? '#FFFFFF' : 'none'} strokeWidth="1.2" />;
      })}
    </g>
  );
}

const REACHABLE: [number, number][] = [
  [1, 1],
  [2, 1],
];

function Avatar({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="5.5" className="fill-primary" stroke="#FFFFFF" strokeWidth="1.8" />
      <circle cx={x - 1.8} cy={y - 1} r="0.9" fill="#FFFFFF" />
      <circle cx={x + 1.8} cy={y - 1} r="0.9" fill="#FFFFFF" />
    </g>
  );
}

/** The roti (circle) or chocolate bar (bar) in four pieces, `shaded` of them coloured in. */
function FractionShape({ variant, shaded, x = 48 }: { variant?: 'circle' | 'bar'; shaded: number; x?: number }) {
  if (variant === 'bar') {
    return (
      <g>
        <rect x={x - 30} y="16" width="60" height="30" rx="4" fill="#6B3F1E" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={x - 28 + i * 14.5} y="18" width="12.5" height="26" rx="2" className={i < shaded ? 'fill-primary' : undefined} fill={i < shaded ? undefined : '#9C6233'} />
        ))}
      </g>
    );
  }
  const slices = [
    'M0 0V-22A22 22 0 0 1 22 0Z',
    'M0 0H22A22 22 0 0 1 0 22Z',
    'M0 0V22A22 22 0 0 1 -22 0Z',
    'M0 0H-22A22 22 0 0 1 0 -22Z',
  ];
  return (
    <g transform={`translate(${x} 32)`}>
      <circle r="26" fill="#E9C48A" />
      {slices.map((d, i) => (
        <path key={i} d={d} className={i < shaded ? 'fill-primary' : undefined} fill={i < shaded ? undefined : '#F5D9A8'} stroke="#E9C48A" strokeWidth="1.5" />
      ))}
    </g>
  );
}

/** Bars of a bar chart on a baseline at y = 54. */
function Bars({ heights, hot }: { heights: number[]; hot?: number }) {
  return (
    <g>
      <path d="M12 6V54H90" fill="none" className="stroke-ink/60" strokeWidth="2" strokeLinecap="round" />
      {[18, 30, 42].map((y) => (
        <line key={y} x1="12" x2="90" y1={y} y2={y} className="stroke-line" strokeWidth="1" />
      ))}
      {heights.map((h, i) => (
        <rect key={i} x={22 + i * 22} y={54 - h} width="14" height={h} rx="2.5" className={hot === i ? 'fill-reward' : 'fill-primary'} />
      ))}
    </g>
  );
}

/**
 * A 3 x 2 rectangle measured the way the round asks: squares counted inside (area), all four sides
 * added up (perimeter), or both.
 */
function AreaMeasure({ a, variant }: { a: boolean; variant?: HowToStep['variant'] }) {
  const area = variant !== 'perimeter';
  const sides = variant !== 'area';
  const label = (x: number, y: number, n: number) => (
    <text x={x} y={y} textAnchor="middle" fontSize="8" fontWeight="800" className="fill-ink font-display">
      {n}
    </text>
  );
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const x = 27 + (i % 3) * 14;
        const y = 12 + Math.floor(i / 3) * 14;
        return (
          <g key={i}>
            <rect x={x} y={y} width="14" height="14" className="fill-primary/20 stroke-primary/50" strokeWidth="1" />
            {area && (
              <text x={x + 7} y={y + 10} textAnchor="middle" fontSize="8" fontWeight="800" className={cn('fill-primary-strong font-display', anim(a, 'glow'))} style={{ animationDelay: `${400 + i * 150}ms` }}>
                {i + 1}
              </text>
            )}
          </g>
        );
      })}
      <rect x="27" y="12" width="42" height="28" fill="none" className={cn('stroke-primary', sides && anim(a, 'glow'))} strokeWidth="2.5" />
      {label(48, 9, 3)}
      {label(21, 29, 2)}
      {sides && label(75, 29, 2)}
      {sides && label(48, 49, 3)}
      {variant !== 'both' && (
        <text x="48" y="60" textAnchor="middle" fontSize="8.5" fontWeight="800" className="fill-primary-strong font-display">
          {area ? '6 squares' : '3 + 2 + 3 + 2 = 10'}
        </text>
      )}
    </>
  );
}

/* ------------------------------------------------------------ scenes */

type SceneProps = { a: boolean; variant?: HowToStep['variant'] };

const SCENES: Record<HowToStep['scene'], (p: SceneProps) => ReactNode> = {
  'magnet-drag': ({ a }) => (
    <>
      <Horseshoe />
      <Arrow d="M28 32H45" tip={[45, 32]} angle={0} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '26px' })}>
        <ObjectPicture art="paper-clip" size={22} x={3} y={21} />
        <Finger x={14} y={34} />
      </g>
    </>
  ),
  'magnet-watch': ({ a }) => (
    <>
      <Horseshoe />
      <path d="M14 26h10M10 32h14M14 38h10" className="stroke-primary/60" strokeWidth="2" strokeLinecap="round" />
      <g className={anim(a, 'move')} style={vars({ '--fx': '-16px' })}>
        <ObjectPicture art="paper-clip" size={22} x={30} y={21} />
      </g>
    </>
  ),
  'magnet-sort': ({ a }) => (
    <>
      <Bin x={6} y={42} hot>
        <path d="M20 46v4a5 5 0 0 0 10 0v-4" fill="none" stroke="#E4513B" strokeWidth="3" />
      </Bin>
      <Bin x={54} y={42}>
        <circle cx="72" cy="50" r="5" fill="none" stroke="#8A929E" strokeWidth="2" />
        <path d="M68.5 53.5l7-7" stroke="#8A929E" strokeWidth="2" />
      </Bin>
      <Arrow d="M40 22Q30 30 26 38" tip={[26, 38]} angle={115} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '-20px', '--ty': '24px' })}>
        <ObjectPicture art="iron-nail" size={22} x={38} y={1} />
        <Finger x={49} y={12} />
      </g>
    </>
  ),
  'poles-push': ({ a }) => (
    <>
      <g transform="translate(6 24) scale(0.25)">
        <BarMagnet left="N" right="S" />
      </g>
      <Arrow d="M22 16H34" tip={[34, 16]} angle={0} />
      <Arrow d="M74 16H62" tip={[62, 16]} angle={180} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '-7px' })}>
        <g transform="translate(52 24) scale(0.25)">
          <BarMagnet left="N" right="S" />
        </g>
        <Finger x={74} y={32} />
      </g>
    </>
  ),
  'poles-turn': ({ a }) => (
    <>
      <path d="M34 20a16 10 0 0 1 28 0" fill="none" className="stroke-primary" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
      <path d="M57.5 16.5L62 20l1-5.5" fill="none" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <g className={anim(a, 'turn')} style={{ ...vars({ '--turn': '180deg' }), transformOrigin: '48px 34px' }}>
        <g transform="translate(28 28.5) scale(0.25)">
          <BarMagnet left="N" right="S" />
        </g>
      </g>
    </>
  ),
  'surface-pick': ({ a }) => (
    <>
      <Swatch x={6} y={14} kind="wood" />
      <Swatch x={36} y={14} kind="grass" selected />
      <Swatch x={66} y={14} kind="ice" />
      <Ripple x={48} y={30} a={a} />
      <Finger x={48} y={30} tap a={a} />
    </>
  ),
  predict: ({ a }) => (
    <>
      <line x1="4" x2="92" y1="44" y2="44" className="stroke-ink/50" strokeWidth="2" />
      <Car x={4} y={44} scale={0.24} />
      {[
        { x: 38, c: '#16804E' },
        { x: 60, c: '#F2A516' },
        { x: 82, c: '#E4513B' },
      ].map((f, i) => (
        <g key={f.x}>
          <line x1={f.x} x2={f.x} y1="44" y2="26" className="stroke-ink" strokeWidth="1.5" />
          <path d={`M${f.x} 26l9 3.5l-9 3.5z`} fill={f.c} />
          {i === 1 && <Ripple x={f.x + 2} y={30} a={a} r={9} />}
        </g>
      ))}
      <Finger x={62} y={33} tap a={a} />
    </>
  ),
  roll: ({ a }) => (
    <>
      <path d="M2 18L30 48H2Z" fill="#E3C79E" stroke="#B8915C" strokeWidth="1.2" />
      <rect x="2" y="48" width="92" height="5" fill="#C8925A" />
      <Arrow d="M48 38H80" tip={[80, 38]} angle={0} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '40px' })}>
        <Car x={28} y={48} scale={0.28} />
      </g>
      <circle cx="80" cy="14" r="9" fill="#16804E" />
      <path d="M77 9.5v9l7.5-4.5z" fill="#FFFFFF" />
      <Finger x={82} y={18} tap a={a} />
    </>
  ),
  'push-drag': ({ a }) => (
    <>
      <rect x="0" y="50" width="96" height="6" fill="#D8D2C8" />
      <rect x="58" y="28" width="22" height="22" rx="2" fill="#D9A066" stroke="#8A6239" strokeWidth="1.5" />
      <path d="M58 28l22 22M80 28L58 50" stroke="#8A6239" strokeWidth="1" opacity="0.5" />
      <rect x="26" y="37" width="26" height="5" fill="#5847E0" />
      <path d="M57 39.5l-6-5v10z" fill="#5847E0" />
      <Arrow d="M20 24H6" tip={[6, 24]} angle={180} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '-8px' })}>
        <circle cx="24" cy="39.5" r="6" fill="#FFFFFF" stroke="#5847E0" strokeWidth="2" />
        <Finger x={24} y={40} />
      </g>
    </>
  ),
  'push-go': ({ a }) => (
    <>
      <rect x="0" y="50" width="96" height="6" fill="#D8D2C8" />
      <Button x={4} y={6} w={34} label="Push!" />
      <Finger x={22} y={17} tap a={a} />
      <path d="M44 34h8M40 40h12M44 46h8" className="stroke-ink/40" strokeWidth="2" strokeLinecap="round" />
      <g className={anim(a, 'move')} style={vars({ '--tx': '16px' })}>
        <rect x="56" y="28" width="22" height="22" rx="2" fill="#D9A066" stroke="#8A6239" strokeWidth="1.5" />
        <path d="M56 28l22 22M78 28L56 50" stroke="#8A6239" strokeWidth="1" opacity="0.5" />
      </g>
    </>
  ),
  'match-drag': ({ a }) => (
    <>
      <Card x={4} y={34} />
      <Card x={62} y={8} tone="target" />
      <Card x={62} y={34} tone="target" />
      <Arrow d="M37 20Q50 24 58 38" tip={[58, 38]} angle={60} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '50px', '--ty': '24px' })}>
        <Card x={4} y={8} tone="selected" />
        <Finger x={20} y={18} />
      </g>
    </>
  ),
  'match-tap': ({ a }) => (
    <>
      <Card x={4} y={8} tone="selected" />
      <Card x={4} y={34} />
      <Card x={62} y={8} tone="target" />
      <Card x={62} y={34} tone="target" />
      <circle cx="34" cy="8" r="5" className="fill-primary" />
      <text x="34" y="10.8" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#FFFFFF" className="font-display">
        1
      </text>
      <Ripple x={77} y={41} a={a} />
      <Finger x={77} y={41} tap a={a} />
    </>
  ),
  'match-done': ({ a }) => (
    <>
      <Card x={4} y={8} tone="done" />
      <Card x={4} y={34} tone="done" />
      <Card x={62} y={8} tone="done" />
      <Card x={62} y={34} tone="done" />
      <path d="M34 15L62 41" pathLength={1} strokeDasharray="1" stroke="#5847E0" strokeWidth="2.5" strokeLinecap="round" className={anim(a, 'draw')} />
      <path d="M34 41L62 15" pathLength={1} strokeDasharray="1" stroke="#F2A516" strokeWidth="2.5" strokeLinecap="round" className={anim(a, 'draw')} />
      <circle cx="48" cy="58" r="5.5" className="fill-success" />
      <path d="M45.3 58l1.9 1.9l3.6-3.8" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'sort-drag': ({ a }) => (
    <>
      <Bin x={6} y={40} hot />
      <Bin x={54} y={40} />
      <Arrow d="M38 20Q30 28 26 36" tip={[26, 36]} angle={115} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '-20px', '--ty': '24px' })}>
        <Card x={34} y={3} w={28} />
        <Finger x={48} y={12} />
      </g>
    </>
  ),
  'sort-tap': ({ a }) => (
    <>
      <Card x={34} y={3} w={28} tone="selected" />
      <Bin x={6} y={40} />
      <Bin x={54} y={40} hot />
      <Ripple x={72} y={48} a={a} />
      <Finger x={72} y={48} tap a={a} />
    </>
  ),
  'fraction-shade': ({ a, variant }) =>
    variant === 'bar' ? (
      <>
        <FractionShape variant="bar" shaded={1} />
        <Ripple x={40} y={31} a={a} />
        <Finger x={40} y={31} tap a={a} />
      </>
    ) : (
      <>
        <FractionShape variant="circle" shaded={1} />
        <Ripple x={58} y={42} a={a} />
        <Finger x={58} y={42} tap a={a} />
      </>
    ),
  'fraction-count': ({ a, variant }) => (
    <>
      <g className="font-display" fontWeight="700" textAnchor="middle">
        <text x="14" y="27" fontSize="15" className={cn('fill-primary', anim(a, 'glow'))}>
          3
        </text>
        <rect x="7" y="31" width="14" height="2.4" rx="1.2" className="fill-ink" />
        <text x="14" y="49" fontSize="15" className="fill-ink">
          4
        </text>
      </g>
      <text x="29" y="38" fontSize="12" fontWeight="800" className="fill-ink-muted font-display">
        =
      </text>
      <FractionShape variant={variant === 'bar' ? 'bar' : 'circle'} shaded={3} x={64} />
    </>
  ),
  'map-walk': ({ a }) => (
    <>
      <MapGrid x={24} y={9} highlight={REACHABLE} />
      <path d="M38 33h14" stroke="#8A6239" strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round" />
      <g className={anim(a, 'move')} style={vars({ '--tx': '30px' })}>
        <Avatar x={31.5} y={31.5} />
      </g>
      <Ripple x={61.5} y={31.5} a={a} />
      <Finger x={61.5} y={33} tap a={a} />
    </>
  ),
  'map-compass': ({ a }) => (
    <>
      {[
        { l: 'N', x: 41, y: 2 },
        { l: 'W', x: 23, y: 20 },
        { l: 'E', x: 59, y: 20 },
        { l: 'S', x: 41, y: 38 },
      ].map((b) => (
        <g key={b.l}>
          <rect x={b.x} y={b.y + 1.5} width="14" height="14" rx="3.5" className="fill-line-strong" />
          <rect x={b.x} y={b.y} width="14" height="14" rx="3.5" strokeWidth="1.4" className="fill-surface stroke-line-strong" />
          <text x={b.x + 7} y={b.y + 10} textAnchor="middle" fontSize="8.5" fontWeight="800" className={cn('font-display', b.l === 'N' ? 'fill-coral-strong' : 'fill-primary')}>
            {b.l}
          </text>
        </g>
      ))}
      <Ripple x={66} y={27} a={a} />
      <Finger x={66} y={28} tap a={a} />
    </>
  ),
  'map-arrive': ({ a }) => (
    <>
      <rect x="6" y="6" width="26" height="26" rx="4" fill="#CBE8C4" />
      <path d="M19 12l2 4.5l5 .5l-3.8 3.3l1.2 4.9L19 22.6l-4.4 2.6l1.2-4.9L12 17l5-.5z" fill="#F2B42A" stroke="#C49216" strokeWidth="0.8" />
      <Avatar x={28} y={10} />
      <Button x={38} y={38} w={54} label="I am here!" />
      <Finger x={70} y={50} tap a={a} />
    </>
  ),
  'balance-try': ({ a }) => (
    <>
      <Scale tilt={9} left="?" right="8" />
      <Tile x={22} y={40} label="3" />
      <Tile x={40} y={40} label="5" on />
      <Tile x={58} y={40} label="8" />
      <Ripple x={48} y={49} a={a} />
      <Finger x={48} y={50} tap a={a} />
    </>
  ),
  'balance-tip': ({ a }) => (
    <>
      <Scale tilt={9} left="3" right="8" />
      <g className={anim(a, 'move')} style={vars({ '--fy': '-4px' })}>
        <Arrow d="M88 30V44" tip={[88, 44]} angle={90} />
      </g>
      <text x="48" y="54" textAnchor="middle" fontSize="9" fontWeight="800" className="fill-notyet-strong font-display">
        3 &lt; 8
      </text>
    </>
  ),
  'balance-level': ({ a }) => (
    <>
      <Scale tilt={0} left="5" right="5" />
      <Button x={30} y={41} w={36} label="Check" />
      <Finger x={56} y={52} tap a={a} />
    </>
  ),
  'words-tap': ({ a }) => (
    <>
      <Strip words={['The']} />
      <Arrow d="M22 40Q30 32 38 27" tip={[38, 27]} angle={-35} />
      <WordTile x={8} y={42} w={22} word="cat" />
      <WordTile x={36} y={42} w={22} word="sat" />
      <WordTile x={64} y={42} w={14} word="." />
      <Ripple x={19} y={50} a={a} />
      <Finger x={19} y={51} tap a={a} />
    </>
  ),
  'words-back': ({ a }) => (
    <>
      <Strip words={['The', 'cat']} />
      <Arrow d="M62 27Q71 34 69 43" tip={[69, 43]} angle={100} />
      <rect x="58" y="46" width="24" height="13" rx="3.5" fill="none" strokeWidth="1.2" strokeDasharray="2 2" className="stroke-line-strong" />
      <Ripple x={46} y={16} a={a} />
      <Finger x={46} y={17} tap a={a} />
    </>
  ),
  'line-tap': ({ a }) => (
    <>
      <NumberLine y={34} />
      <Pin x={55.2} y={33} />
      <Ripple x={55.2} y={36} a={a} />
      <Finger x={55.2} y={38} tap a={a} />
    </>
  ),
  'line-drag': ({ a }) => (
    <>
      <NumberLine y={40} />
      <Arrow d="M34 8H62" tip={[62, 8]} angle={0} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '28.8px' })}>
        <Pin x={26.4} y={39} />
        <Finger x={26.4} y={27} />
      </g>
    </>
  ),
  'area-drag': ({ a }) => (
    <>
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={18 + (i % 5) * 12} y={6 + Math.floor(i / 5) * 12} width="12" height="12" className="fill-surface stroke-line-strong" strokeWidth="1" />
      ))}
      <rect x="18" y="6" width="36" height="24" className={cn('fill-primary/25 stroke-primary', anim(a, 'grow'))} strokeWidth="2.5" style={{ ...vars({ '--sx': '0.34', '--sy': '0.5' }), transformOrigin: '0 0' }} />
      <circle cx="18" cy="6" r="2.6" className="fill-primary" />
      <g className={anim(a, 'move')} style={vars({ '--fx': '-24px', '--fy': '-12px' })}>
        <circle cx="54" cy="30" r="3.6" className="fill-surface stroke-primary" strokeWidth="2" />
        <Finger x={54} y={31} />
      </g>
    </>
  ),
  'area-count': ({ a, variant }) => <AreaMeasure a={a} variant={variant} />,
  'clock-turn': ({ a }) => (
    <>
      <ClockFace>
        <line x1="48" y1="32" x2="62" y2="32" className="stroke-ink" strokeWidth="4" strokeLinecap="round" />
        <g className={anim(a, 'turn')} style={{ ...HAND_ORIGIN, ...vars({ '--turn': '90deg' }) }}>
          <line x1="48" y1="32" x2="48" y2="11" className="stroke-primary" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="48" cy="11" r="3" className="fill-primary" />
          <Finger x={48} y={12} />
        </g>
      </ClockFace>
      <Arrow d="M58.6 2.9A31 31 0 0 1 74.8 16.5" tip={[74.8, 16.5]} angle={60} />
    </>
  ),
  'clock-hands': ({ a }) => (
    <ClockFace>
      <g className={anim(a, 'turn')} style={{ ...HAND_ORIGIN, ...vars({ '--turn': '30deg' }) }}>
        <line x1="48" y1="32" x2="62" y2="32" className="stroke-ink" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className={anim(a, 'turn')} style={{ ...HAND_ORIGIN, ...vars({ '--turn': '360deg' }) }}>
        <line x1="48" y1="32" x2="48" y2="11" className="stroke-primary" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </ClockFace>
  ),
  'bar-drag': ({ a }) => (
    <>
      <Bars heights={[22, 34]} />
      <rect x="66" y="22" width="14" height="32" rx="2.5" className={cn('fill-primary-strong', anim(a, 'grow'))} style={{ ...vars({ '--sy': '0.45' }), transformOrigin: '50% 100%' }} />
      <Arrow d="M86 30V12" tip={[86, 12]} angle={-90} />
      <g className={anim(a, 'move')} style={vars({ '--fy': '17.6px' })}>
        <rect x="63" y="19" width="20" height="6" rx="3" className="fill-surface stroke-primary" strokeWidth="1.8" />
        <Finger x={73} y={23} />
      </g>
    </>
  ),
  'bar-tap': ({ a }) => (
    <>
      <Bars heights={[22, 40, 16]} hot={1} />
      <Ripple x={51} y={34} a={a} />
      <Finger x={51} y={35} tap a={a} />
    </>
  ),
  'circuit-drag': ({ a }) => (
    <>
      <Circuit a={a} />
      <Arrow d="M26 52Q36 52 42 47" tip={[42, 47]} angle={-30} />
      <g className={anim(a, 'move')} style={vars({ '--tx': '34px', '--ty': '-10px' })}>
        <ObjectPicture art="copper-coin" size={18} x={5} y={45} />
        <Finger x={14} y={56} />
      </g>
    </>
  ),
  'circuit-switch': ({ a }) => (
    <>
      <rect x="28" y="20" width="40" height="22" rx="11" className="fill-success" />
      <g className={anim(a, 'move')} style={vars({ '--fx': '-18px' })}>
        <circle cx="57" cy="31" r="8" fill="#FFFFFF" />
      </g>
      <text x="48" y="56" textAnchor="middle" fontSize="8.5" fontWeight="800" className="fill-success-strong font-display">
        ON
      </text>
      <Ripple x={52} y={36} a={a} />
      <Finger x={52} y={37} tap a={a} />
    </>
  ),
  'circuit-bulb': ({ a }) => <Circuit lit inGap a={a} />,
  'press-check': ({ a }) => (
    <>
      <g className={anim(a, 'tap')}>
        <Button x={20} y={20} w={56} label="✓ Check" />
      </g>
      <Ripple x={58} y={33} a={a} />
      <Finger x={58} y={34} tap a={a} />
    </>
  ),
};
