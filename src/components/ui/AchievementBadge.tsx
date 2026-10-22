import { Lock } from 'lucide-react';
import type { AchievementDefinition } from '../../engine/achievements';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

const TONES = {
  primary: { ring: '#5847E0', bg: '#EEEBFF', fg: '#4031B8' },
  success: { ring: '#1E9A5F', bg: '#E1F5EB', fg: '#127045' },
  reward: { ring: '#F2A516', bg: '#FFF3D6', fg: '#9E6200' },
  coral: { ring: '#F06A4D', bg: '#FFE9E3', fg: '#B04028' },
  sky: { ring: '#3B97DE', bg: '#E2F1FC', fg: '#1F64A0' },
} as const;

/** Medal-style badge. Locked badges are shown in grey with a lock. */
export function AchievementBadge({ def, unlocked, size = 72, className }: { def: AchievementDefinition; unlocked: boolean; size?: number; className?: string }) {
  const tone = TONES[def.tone];
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 72 72" width={size} height={size} className="absolute inset-0">
        <path
          d="M36 3 L44 9 L54 8 L58 17 L67 22 L65 32 L70 41 L63 48 L62 58 L52 61 L45 69 L36 65 L27 69 L20 61 L10 58 L9 48 L2 41 L7 32 L5 22 L14 17 L18 8 L28 9 Z"
          fill={unlocked ? tone.ring : '#D6D3E0'}
        />
        <circle cx="36" cy="36" r="24" fill={unlocked ? tone.bg : '#F1EFF5'} />
        <circle cx="36" cy="36" r="24" fill="none" stroke="#fff" strokeWidth="3" opacity="0.8" />
      </svg>
      <span className="relative" style={{ color: unlocked ? tone.fg : '#9A97AE' }}>
        <Icon name={def.icon} width={size * 0.36} height={size * 0.36} strokeWidth={2.2} />
      </span>
      {!unlocked && (
        <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-surface text-ink-muted shadow-soft">
          <Lock className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}
