import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type Tone = 'primary' | 'success' | 'reward' | 'coral' | 'sky';

const BAR_TONE: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  reward: 'bg-reward',
  coral: 'bg-coral',
  sky: 'bg-sky',
};

export function ProgressBar({
  value,
  tone = 'primary',
  label,
  className,
  color,
  size = 'md',
}: {
  value: number;
  tone?: Tone;
  label: string;
  className?: string;
  /** Optional explicit colour (e.g. subject colour). */
  color?: string;
  size?: 'sm' | 'md';
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('w-full overflow-hidden rounded-full bg-ink/[0.07]', size === 'sm' ? 'h-2' : 'h-3', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', !color && BAR_TONE[tone])}
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

const RING_TONE: Record<Tone, string> = {
  primary: 'rgb(var(--c-primary))',
  success: 'rgb(var(--c-success))',
  reward: 'rgb(var(--c-reward))',
  coral: 'rgb(var(--c-coral))',
  sky: 'rgb(var(--c-sky))',
};

export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  tone = 'primary',
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-ink) / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING_TONE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 800ms var(--ease-out)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function StarRow({ stars, max = 3, size = 18, animate = false, className }: { stars: number; max?: number; size?: number; animate?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${stars} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          width={size}
          height={size}
          className={cn(i < stars ? 'fill-reward text-reward' : 'fill-ink/10 text-ink/10', animate && i < stars && 'animate-star-pop')}
          style={animate ? { animationDelay: `${200 + i * 220}ms` } : undefined}
        />
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-line px-6 py-8 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-canvas-sunken text-ink-muted">{icon}</div>
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = 'primary', className }: { children: ReactNode; tone?: Tone | 'neutral'; className?: string }) {
  const tones: Record<Tone | 'neutral', string> = {
    primary: 'bg-primary-soft text-primary-strong',
    success: 'bg-success-soft text-success-strong',
    reward: 'bg-reward-soft text-reward-strong',
    coral: 'bg-coral-soft text-coral-strong',
    sky: 'bg-sky-soft text-[rgb(26_100_160)]',
    neutral: 'bg-canvas-sunken text-ink-soft',
  };
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function SectionHeading({ title, subtitle, action, id }: { title: string; subtitle?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-semibold md:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
