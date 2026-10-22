import { useId, type ReactNode } from 'react';
import type { IllustrationSpec } from '../../domain/types';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { ToyCar } from './ToyCar';

const INK = '#1D1A4A';
const PRIMARY = '#5847E0';
const CORAL = '#F06A4D';
const AMBER = '#F2A516';
const WOOD = '#D9A066';

/** SVG patterns for the friction surfaces, namespaced per instance to keep ids unique. */
export function SurfacePatterns({ prefix }: { prefix: string }) {
  return (
    <defs>
      <pattern id={`${prefix}-wood`} width="40" height="20" patternUnits="userSpaceOnUse">
        <rect width="40" height="20" fill="#E3B07A" />
        <path d="M0 10 H40 M20 0 V10 M0 0 V0 M10 10 V20 M30 10 V20" stroke="#C98E55" strokeWidth="1.2" />
        <path d="M4 5 q6 -2 12 0 M24 15 q6 -2 12 0" stroke="#EDC596" strokeWidth="1" fill="none" />
      </pattern>
      <pattern id={`${prefix}-grass`} width="16" height="20" patternUnits="userSpaceOnUse">
        <rect width="16" height="20" fill="#6CC487" />
        <path d="M2 20 L4 9 L6 20 M9 20 L11 6 L13 20" fill="#4FA96B" />
        <circle cx="13" cy="15" r="1.2" fill="#8FD9A4" />
      </pattern>
      <pattern id={`${prefix}-carpet`} width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#C46A8F" />
        <circle cx="3" cy="3" r="1.6" fill="#A9527A" />
        <circle cx="9" cy="9" r="1.6" fill="#A9527A" />
        <circle cx="9" cy="3" r="1" fill="#D98CAB" />
        <circle cx="3" cy="9" r="1" fill="#D98CAB" />
      </pattern>
      <pattern id={`${prefix}-ice`} width="40" height="20" patternUnits="userSpaceOnUse">
        <rect width="40" height="20" fill="#CDEBFA" />
        <path d="M2 14 L14 6 M20 17 L32 9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 4 L36 1" stroke="#A7D8F2" strokeWidth="1.5" strokeLinecap="round" />
      </pattern>
      <pattern id={`${prefix}-gravel`} width="22" height="20" patternUnits="userSpaceOnUse">
        <rect width="22" height="20" fill="#B8AFA3" />
        <ellipse cx="5" cy="5" rx="4" ry="3" fill="#958A7C" />
        <ellipse cx="15" cy="9" rx="5" ry="3.5" fill="#D2CABF" />
        <ellipse cx="7" cy="15" rx="4.5" ry="3" fill="#A39788" />
        <ellipse cx="18" cy="17" rx="3" ry="2.2" fill="#857A6D" />
      </pattern>
    </defs>
  );
}

/** Saw-tooth edge points from x=40 to x=170, alternating between y and y + amp. */
function teeth(y: number, amp: number): [number, number][] {
  return Array.from({ length: 14 }, (_, i) => [40 + i * 10, y + (i % 2 ? amp : 0)]);
}
const toPath = (pts: [number, number][]) => pts.map(([x, y]) => `L ${x} ${y}`).join(' ');

function Label({ x, y, children, color = INK, anchor = 'middle' }: { x: number; y: number; children: ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily="Nunito Variable, Nunito, sans-serif" fontWeight={800} fontSize="13" fill={color}>
      {children}
    </text>
  );
}

function Arrow({ x1, x2, y, color, width = 5 }: { x1: number; x2: number; y: number; color: string; width?: number }) {
  const dir = x2 > x1 ? 1 : -1;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2 - dir * 8} y2={y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M ${x2} ${y} L ${x2 - dir * 12} ${y - 8} L ${x2 - dir * 12} ${y + 8} Z`} fill={color} />
    </g>
  );
}

function Magnet({ x, y, left, right }: { x: number; y: number; left: 'N' | 'S'; right: 'N' | 'S' }) {
  const color = (p: 'N' | 'S') => (p === 'N' ? CORAL : '#2F86D6');
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="40" height="30" rx="6" fill={color(left)} />
      <rect x="40" y="0" width="40" height="30" rx="6" fill={color(right)} />
      <rect x="34" y="0" width="12" height="30" fill={color(right)} />
      <rect x="34" y="0" width="6" height="30" fill={color(left)} />
      <text x="20" y="21" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="16" fill="#fff">
        {left}
      </text>
      <text x="60" y="21" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="16" fill="#fff">
        {right}
      </text>
    </g>
  );
}

function FractionPie({ parts, filled }: { parts: number; filled: number }) {
  const cx = 95;
  const cy = 80;
  const r = 56;
  const slices = Array.from({ length: parts }, (_, i) => {
    const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
    return <path key={i} d={d} fill={i < filled ? PRIMARY : '#F5D9A8'} stroke="#fff" strokeWidth="3.5" />;
  });
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill="#E9C48A" />
      {parts === 1 ? <circle cx={cx} cy={cy} r={r} fill={filled ? PRIMARY : '#F5D9A8'} /> : slices}
      {[
        [80, 64],
        [112, 96],
        [108, 60],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#D4A866" opacity={filled ? 0.25 : 0.8} />
      ))}
      <text x="198" y="92" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="34" fill={INK}>
        {filled > 0 ? `${filled}/${parts}` : parts}
      </text>
      <text x="198" y="114" textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize="11" fill="#69668E">
        {filled > 0 ? 'shaded' : 'equal parts'}
      </text>
    </g>
  );
}

function BalanceArt({ left, right, tilt }: { left: string; right: string; tilt: -1 | 0 | 1 }) {
  const pivot = { x: 120, y: 46 };
  const arm = 78;
  const a = (tilt * 8 * Math.PI) / 180;
  const ends = [
    { x: pivot.x - arm * Math.cos(a), y: pivot.y - arm * Math.sin(a), text: left },
    { x: pivot.x + arm * Math.cos(a), y: pivot.y + arm * Math.sin(a), text: right },
  ];
  return (
    <g>
      <path d="M 100 150 L 140 150 L 130 136 L 110 136 Z" fill="#6B6F8C" />
      <rect x="116" y={pivot.y} width="8" height="92" rx="4" fill="#8B8FA8" />
      <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke={PRIMARY} strokeWidth="7" strokeLinecap="round" />
      <circle cx={pivot.x} cy={pivot.y} r="7" fill={AMBER} stroke="#fff" strokeWidth="2" />
      {ends.map((e, i) => (
        <g key={i} transform={`translate(${e.x} ${e.y})`}>
          <line x1="0" y1="0" x2="-28" y2="40" stroke="#8B8FA8" strokeWidth="2" />
          <line x1="0" y1="0" x2="28" y2="40" stroke="#8B8FA8" strokeWidth="2" />
          <rect x="-30" y="14" width="60" height="22" rx="7" fill="#fff" stroke="#D9DBE8" strokeWidth="1.5" />
          <text x="0" y="30" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="14" fill={INK}>
            {e.text}
          </text>
          <path d="M -38 40 Q 0 56 38 40 Z" fill={AMBER} />
        </g>
      ))}
    </g>
  );
}

function NumberLineArt({ from, to, start, jumps }: { from: number; to: number; start: number; jumps: number }) {
  const x0 = 18;
  const x1 = 222;
  const count = Math.max(1, to - from);
  const xAt = (n: number) => x0 + ((n - from) / count) * (x1 - x0);
  const y = 112;
  const ticks = Array.from({ length: count + 1 }, (_, i) => from + i);
  return (
    <g>
      <line x1={x0 - 6} y1={y} x2={x1 + 6} y2={y} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {ticks.map((n) => (
        <g key={n}>
          <line x1={xAt(n)} y1={y - 6} x2={xAt(n)} y2={y + 6} stroke={INK} strokeWidth="2" />
          <text x={xAt(n)} y={y + 22} textAnchor="middle" fontFamily="Nunito Variable, Nunito, sans-serif" fontWeight="800" fontSize={count > 12 ? 9 : 12} fill={n === start ? CORAL : n === start + jumps ? PRIMARY : INK}>
            {n}
          </text>
        </g>
      ))}
      {Array.from({ length: jumps }, (_, i) => {
        const a = xAt(start + i);
        const b = xAt(start + i + 1);
        return <path key={i} d={`M ${a} ${y - 4} Q ${(a + b) / 2} ${y - 34} ${b} ${y - 4}`} fill="none" stroke={PRIMARY} strokeWidth="2.5" />;
      })}
      <circle cx={xAt(start)} cy={y} r="6" fill={CORAL} />
      {jumps > 0 && <circle cx={xAt(start + jumps)} cy={y} r="6" fill={PRIMARY} />}
      {jumps > 0 && <Label x={(xAt(start) + xAt(start + jumps)) / 2} y={y - 42} color={PRIMARY}>{`+${jumps}`}</Label>}
    </g>
  );
}

function ClockArt({ hour, minute }: { hour: number; minute: number }) {
  const c = { x: 120, y: 80 };
  const r = 64;
  // The hour hand moves on between the numbers as the minutes pass (3:30 points halfway to 4).
  const hourAngle = (((hour % 12) + minute / 60) * 30 * Math.PI) / 180;
  const minuteAngle = (minute * 6 * Math.PI) / 180;
  const hand = (angle: number, length: number) => ({ x: c.x + length * Math.sin(angle), y: c.y - length * Math.cos(angle) });
  const h = hand(hourAngle, 34);
  const m = hand(minuteAngle, 52);
  return (
    <g>
      <circle cx={c.x} cy={c.y} r={r + 6} fill={AMBER} />
      <circle cx={c.x} cy={c.y} r={r} fill="#fff" />
      {Array.from({ length: 12 }, (_, i) => {
        const p = hand(((i + 1) * 30 * Math.PI) / 180, r - 14);
        return (
          <text key={i} x={p.x} y={p.y + 5} textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="13" fill={INK}>
            {i + 1}
          </text>
        );
      })}
      <line x1={c.x} y1={c.y} x2={h.x} y2={h.y} stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <line x1={c.x} y1={c.y} x2={m.x} y2={m.y} stroke={PRIMARY} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx={c.x} cy={c.y} r="5" fill={CORAL} />
    </g>
  );
}

function BarChartArt({ bars }: { bars: { label: string; value: number }[] }) {
  const top = Math.max(1, ...bars.map((b) => b.value));
  const x0 = 34;
  const base = 128;
  const height = 100;
  const slot = (216 - x0) / Math.max(1, bars.length);
  const colors = [PRIMARY, CORAL, AMBER, '#0E9F8E', '#2F86D6', '#C27206'];
  return (
    <g>
      <line x1={x0} y1={base} x2={226} y2={base} stroke={INK} strokeWidth="2.5" />
      <line x1={x0} y1={base} x2={x0} y2={base - height - 6} stroke={INK} strokeWidth="2.5" />
      {bars.map((b, i) => {
        const h = (b.value / top) * height;
        const x = x0 + i * slot + slot * 0.2;
        return (
          <g key={`${b.label}-${i}`}>
            <rect x={x} y={base - h} width={slot * 0.6} height={h} rx="4" fill={colors[i % colors.length]} />
            <text x={x + slot * 0.3} y={base - h - 5} textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize="11" fill={INK}>
              {b.value}
            </text>
            <text x={x + slot * 0.3} y={base + 15} textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize="10" fill="#69668E">
              {b.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function ShapeArt({ sides, label }: { sides: number; label?: string }) {
  const c = { x: 120, y: label ? 70 : 80 };
  const r = 54;
  const points = Array.from({ length: sides }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    return `${c.x + r * Math.cos(a)},${c.y + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <g>
      {sides < 3 ? (
        <circle cx={c.x} cy={c.y} r={r} fill="#ECE9FF" stroke={PRIMARY} strokeWidth="5" />
      ) : (
        <polygon points={points} fill="#ECE9FF" stroke={PRIMARY} strokeWidth="5" strokeLinejoin="round" />
      )}
      {sides >= 3 &&
        Array.from({ length: sides }, (_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
          return <circle key={i} cx={c.x + r * Math.cos(a)} cy={c.y + r * Math.sin(a)} r="5" fill={CORAL} />;
        })}
      {label && <Label x={120} y={150}>{label}</Label>}
    </g>
  );
}

function AreaGridArt({ cols, rows, width, height }: { cols: number; rows: number; width: number; height: number }) {
  const cell = Math.min(200 / cols, 128 / rows);
  const x0 = (240 - cell * cols) / 2;
  const y0 = (160 - cell * rows) / 2;
  return (
    <g>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={x0 + c * cell}
            y={y0 + r * cell}
            width={cell}
            height={cell}
            fill={c < width && r < height ? '#C9C2FF' : '#fff'}
            stroke={c < width && r < height ? PRIMARY : '#D9DBE8'}
            strokeWidth={c < width && r < height ? 1.5 : 1}
          />
        )),
      )}
      <rect x={x0} y={y0} width={cell * width} height={cell * height} fill="none" stroke={PRIMARY} strokeWidth="3.5" />
    </g>
  );
}

function CircuitArt({ closed }: { closed: boolean }) {
  return (
    <g>
      {closed && <circle cx="174" cy="44" r="30" fill="#FFE08A" opacity="0.7" />}
      <path d="M 50 44 H 160 M 188 44 H 214 V 128 H 150 M 110 128 H 26 V 44 H 50" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <g transform="translate(174 44)">
        <circle r="16" fill={closed ? '#FFD23F' : '#F1F0F6'} stroke={INK} strokeWidth="3" />
        <path d="M -6 4 l 3 -8 l 3 8 l 3 -8 l 3 8" fill="none" stroke={closed ? CORAL : '#8B8FA8'} strokeWidth="2" />
      </g>
      <g transform="translate(70 30)">
        <rect x="0" y="0" width="34" height="28" rx="5" fill="#0E9F8E" />
        <rect x="34" y="8" width="6" height="12" rx="2" fill="#0B7A6D" />
        <text x="10" y="20" fontFamily="Nunito Variable, sans-serif" fontWeight="900" fontSize="14" fill="#fff">
          +
        </text>
      </g>
      <circle cx="110" cy="128" r="4.5" fill={INK} />
      <circle cx="150" cy="128" r="4.5" fill={INK} />
      <line x1="110" y1="128" x2={closed ? 150 : 144} y2={closed ? 128 : 104} stroke={closed ? PRIMARY : CORAL} strokeWidth="5" strokeLinecap="round" />
      <Label x={130} y={154}>{closed ? 'Switch closed: bulb on' : 'Switch open: bulb off'}</Label>
    </g>
  );
}

function SvgFrame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg viewBox="0 0 240 160" className="h-full w-full" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  );
}

const TONE_BG = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  reward: 'bg-reward-soft text-reward-strong',
  coral: 'bg-coral-soft text-coral',
  sky: 'bg-sky-soft text-sky',
} as const;

/** Renders an IllustrationSpec from lesson content. */
export function Illustration({ spec, className, label }: { spec: IllustrationSpec; className?: string; label?: string }) {
  const uid = useId().replace(/:/g, '');
  const box = cn('relative aspect-[3/2] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-soft to-canvas', className);

  switch (spec.kind) {
    case 'icon':
      return (
        <div className={cn(box, 'grid place-items-center')} role={label ? 'img' : undefined} aria-label={label}>
          <div className={cn('grid h-28 w-28 place-items-center rounded-full', TONE_BG[spec.tone ?? 'primary'])}>
            <Icon name={spec.icon} className="h-14 w-14" strokeWidth={1.75} />
          </div>
        </div>
      );
    case 'colour-swatches':
      return (
        <div className={cn(box, 'flex flex-wrap content-center items-center justify-center gap-4 p-5')} role={label ? 'img' : undefined} aria-label={label}>
          {spec.items.map((item, i) => (
            <span key={`${item.word}-${i}`} className="flex animate-pop-in flex-col items-center gap-2" style={{ animationDelay: `${i * 80}ms` }}>
              <span
                className={cn('rounded-3xl border-4 border-surface shadow-lift', spec.items.length > 2 ? 'h-16 w-16' : 'h-24 w-24')}
                style={{ backgroundColor: item.color }}
              />
              <span className="rounded-xl bg-surface px-3 py-1 font-display text-2xl font-semibold shadow-soft">{item.word}</span>
            </span>
          ))}
        </div>
      );
    case 'word-chips':
      return (
        <div className={cn(box, 'flex flex-wrap content-center items-center justify-center gap-2.5 p-5')} role={label ? 'img' : undefined} aria-label={label}>
          {spec.words.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className={cn(
                'animate-pop-in rounded-2xl px-4 py-2 font-display text-2xl font-semibold shadow-soft',
                ['bg-surface text-primary', 'bg-primary text-white', 'bg-reward-soft text-reward-strong', 'bg-coral-soft text-coral-strong'][i % 4],
              )}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {w}
            </span>
          ))}
        </div>
      );
    default:
      break;
  }

  let art: ReactNode;
  switch (spec.kind) {
    case 'friction-forces':
      art = (
        <>
          <rect x="0" y="118" width="240" height="42" fill={`url(#${uid}-wood)`} />
          <g className="anim-nudge">
            <rect x="96" y="70" width="64" height="48" rx="8" fill={AMBER} />
            <rect x="104" y="78" width="48" height="8" rx="4" fill="#FFD27A" />
            <Arrow x1={30} x2={90} y={94} color={PRIMARY} />
            <Label x={58} y={82} color={PRIMARY}>
              Push
            </Label>
          </g>
          <Arrow x1={176} x2={116} y={132} color={CORAL} width={4.5} />
          <Label x={150} y={153} color="#fff">
            Friction
          </Label>
        </>
      );
      break;
    case 'surface-bumps':
      art = (
        <>
          <defs>
            <clipPath id={`${uid}-lens`}>
              <circle cx="104" cy="74" r="54" />
            </clipPath>
          </defs>
          <circle cx="104" cy="74" r="58" fill="#fff" />
          <g clipPath={`url(#${uid}-lens)`}>
            <path d={`M 40 20 L 170 20 ${toPath([...teeth(68, 12)].reverse())} Z`} fill={AMBER} />
            <path d={`M 40 140 ${toPath(teeth(73, 12))} L 170 140 Z`} fill={WOOD} />
          </g>
          <circle cx="104" cy="74" r="56" fill="none" stroke={INK} strokeWidth="6" />
          <line x1="146" y1="114" x2="184" y2="148" stroke={INK} strokeWidth="12" strokeLinecap="round" />
          <Label x={205} y={40}>
            Tiny
          </Label>
          <Label x={205} y={56}>
            bumps!
          </Label>
        </>
      );
      break;
    case 'rough-vs-smooth':
      art = (
        <>
          <rect x="0" y="0" width="240" height="160" fill="#F4FAFF" />
          <rect x="10" y="48" width="220" height="20" rx="6" fill={`url(#${uid}-wood)`} />
          <g transform="translate(172 50) scale(0.75)">
            <ToyCar />
          </g>
          <path d="M130 36 h30 M136 28 h22" stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <Label x={14} y={86} anchor="start" color="#8A5A25">
            Smooth wood: rolls far
          </Label>
          <rect x="10" y="122" width="220" height="20" rx="6" fill={`url(#${uid}-gravel)`} />
          <g transform="translate(26 124) scale(0.75)">
            <ToyCar color="#5847E0" />
          </g>
          <Label x={226} y={112} anchor="end" color="#5E554B">
            Rough gravel: stops soon
          </Label>
        </>
      );
      break;
    case 'grip-and-brakes':
      art = (
        <>
          <rect x="0" y="122" width="120" height="38" fill="#C9C2B6" />
          <path d="M14 104 C 14 84 30 70 50 70 L 72 70 C 82 70 86 78 92 84 L 106 96 C 112 102 110 112 102 112 L 20 112 C 16 112 14 108 14 104 Z" fill={CORAL} />
          <path d="M22 76 h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <rect x="14" y="112" width="96" height="10" rx="3" fill={INK} />
          {[20, 32, 44, 56, 68, 80, 92].map((x) => (
            <rect key={x} x={x} y="120" width="6" height="5" rx="1.5" fill={INK} />
          ))}
          <Label x={62} y={150} color={INK}>
            Grip
          </Label>
          <g transform="translate(180 80)">
            <circle r="44" fill="none" stroke={INK} strokeWidth="7" />
            <circle r="5" fill={INK} />
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="0" y1="0" x2={40 * Math.cos((i * Math.PI) / 4)} y2={40 * Math.sin((i * Math.PI) / 4)} stroke="#8D8AA6" strokeWidth="2" />
            ))}
            <rect x="-10" y="-56" width="20" height="12" rx="3" fill={AMBER} />
            <rect x="-10" y="-38" width="20" height="8" rx="3" fill={AMBER} opacity="0.85" />
          </g>
          <Label x={180} y={150}>
            Brakes
          </Label>
        </>
      );
      break;
    case 'reduce-friction':
      art = (
        <>
          <g transform="translate(20 30)">
            <path d="M10 40 h44 v34 a8 8 0 0 1 -8 8 h-28 a8 8 0 0 1 -8 -8 z" fill="#2F86D6" />
            <path d="M54 46 L 88 30 L 92 36 L 58 56 Z" fill="#2F86D6" />
            <rect x="22" y="30" width="20" height="10" rx="3" fill="#1F5E99" />
            <path d="M92 40 q4 8 0 12 q-4 -4 0 -12 Z" fill={AMBER} className="anim-drip" />
            <path d="M92 60 q4 8 0 12 q-4 -4 0 -12 Z" fill={AMBER} className="anim-drip [animation-delay:600ms]" />
          </g>
          <Label x={60} y={140}>
            Oil
          </Label>
          <g transform="translate(130 64)">
            <rect x="0" y="0" width="84" height="44" rx="8" fill={AMBER} />
            <circle cx="18" cy="52" r="10" fill={INK} />
            <circle cx="66" cy="52" r="10" fill={INK} />
            <circle cx="18" cy="52" r="4" fill="#C9C6DA" />
            <circle cx="66" cy="52" r="4" fill="#C9C6DA" />
          </g>
          <rect x="120" y="126" width="110" height="5" rx="2.5" fill="#C9C2B6" />
          <Label x={172} y={150}>
            Wheels
          </Label>
        </>
      );
      break;
    case 'car-on-surfaces':
      art = (
        <>
          <rect x="0" y="0" width="240" height="160" fill="#EAF6FF" />
          <circle cx="206" cy="30" r="16" fill="#FFE08A" />
          <rect x="0" y="112" width="120" height="48" fill={`url(#${uid}-wood)`} />
          <rect x="120" y="112" width="120" height="48" fill={`url(#${uid}-grass)`} />
          <g className="anim-drive">
            <g transform="translate(70 114)">
              <ToyCar />
            </g>
          </g>
          <path d="M40 92 h22 M34 100 h22" stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <circle cx="182" cy="70" r="20" fill="#fff" stroke={PRIMARY} strokeWidth="3" />
          <text x="182" y="79" textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="26" fill={PRIMARY}>
            ?
          </text>
        </>
      );
      break;
    case 'magnet-poles': {
      const attract = spec.mode === 'attract';
      art = (
        <>
          <Magnet x={14} y={64} left="S" right="N" />
          <Magnet x={146} y={64} left={attract ? 'S' : 'N'} right={attract ? 'N' : 'S'} />
          {attract ? (
            <>
              <Arrow x1={100} x2={114} y={50} color={PRIMARY} width={4} />
              <Arrow x1={140} x2={126} y={50} color={PRIMARY} width={4} />
              <path d="M110 79 q10 -8 20 0 M110 85 q10 8 20 0" stroke={AMBER} strokeWidth="3" fill="none" strokeLinecap="round" />
              <Label x={120} y={130}>
                Opposite poles attract
              </Label>
            </>
          ) : (
            <>
              <Arrow x1={110} x2={92} y={50} color={CORAL} width={4} />
              <Arrow x1={130} x2={148} y={50} color={CORAL} width={4} />
              <Label x={120} y={130}>
                Same poles repel
              </Label>
            </>
          )}
        </>
      );
      break;
    }
    case 'fraction':
      art = <FractionPie parts={spec.parts} filled={spec.filled} />;
      break;
    case 'compass-rose':
      art = (
        <g transform="translate(120 80)">
          <circle r="62" fill="#fff" stroke={INK} strokeWidth="4" />
          <circle r="50" fill="none" stroke="#E5E2EF" strokeWidth="2" />
          <path d="M0 -46 L 10 0 L 0 46 L -10 0 Z" fill={CORAL} />
          <path d="M0 46 L 10 0 L -10 0 Z" fill="#2F86D6" />
          <path d="M-46 0 L 0 -8 L 46 0 L 0 8 Z" fill="#C9C6DA" />
          <circle r="5" fill={INK} />
          {[
            ['N', 0, -66],
            ['S', 0, 74],
            ['E', 72, 5],
            ['W', -72, 5],
          ].map(([t, x, y]) => (
            <text key={t as string} x={x as number} y={y as number} textAnchor="middle" fontFamily="Fredoka Variable, sans-serif" fontWeight="600" fontSize="16" fill={INK}>
              {t}
            </text>
          ))}
        </g>
      );
      break;
    case 'balance':
      art = <BalanceArt left={spec.left} right={spec.right} tilt={spec.tilt} />;
      break;
    case 'number-line':
      art = <NumberLineArt from={spec.from} to={spec.to} start={spec.start} jumps={spec.jumps} />;
      break;
    case 'clock':
      art = <ClockArt hour={spec.hour} minute={spec.minute} />;
      break;
    case 'bar-chart':
      art = <BarChartArt bars={spec.bars} />;
      break;
    case 'shape':
      art = <ShapeArt sides={spec.sides} label={spec.label} />;
      break;
    case 'area-grid':
      art = <AreaGridArt cols={spec.cols} rows={spec.rows} width={spec.width} height={spec.height} />;
      break;
    case 'circuit':
      art = <CircuitArt closed={spec.closed} />;
      break;
    default:
      art = null;
  }

  return (
    <div className={box}>
      <SvgFrame label={label}>
        <SurfacePatterns prefix={uid} />
        {art}
      </SvgFrame>
    </div>
  );
}
