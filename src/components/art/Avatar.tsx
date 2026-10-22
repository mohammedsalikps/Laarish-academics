import type { AvatarId } from '../../state/progressTypes';
import { cn } from '../../lib/cn';

const BG: Record<AvatarId, string> = {
  fox: '#FFE8D6',
  panda: '#E6F4EE',
  bunny: '#FDE4EC',
  cat: '#E1EFFC',
  robot: '#DDF5F1',
  dino: '#ECE9FF',
};

function Face({ id }: { id: AvatarId }) {
  switch (id) {
    case 'fox':
      return (
        <g>
          <path d="M14 18 L22 34 L30 24 Z M50 18 L42 34 L34 24 Z" fill="#E8742A" />
          <path d="M17 22 L22 31 L27 25 Z M47 22 L42 31 L37 25 Z" fill="#FFD3B0" />
          <path d="M32 22 C 46 22 52 32 52 40 C 52 50 42 56 32 56 C 22 56 12 50 12 40 C 12 32 18 22 32 22 Z" fill="#F28C38" />
          <path d="M32 40 C 40 40 48 44 50 48 C 46 54 40 56 32 56 C 24 56 18 54 14 48 C 16 44 24 40 32 40 Z" fill="#FFF6EE" />
          <circle cx="25" cy="38" r="3" fill="#1D1A4A" />
          <circle cx="39" cy="38" r="3" fill="#1D1A4A" />
          <ellipse cx="32" cy="45" rx="3.2" ry="2.4" fill="#1D1A4A" />
        </g>
      );
    case 'panda':
      return (
        <g>
          <circle cx="18" cy="22" r="7" fill="#2B2A3F" />
          <circle cx="46" cy="22" r="7" fill="#2B2A3F" />
          <circle cx="32" cy="38" r="20" fill="#fff" stroke="#E5E2EF" strokeWidth="1.5" />
          <ellipse cx="24" cy="37" rx="6" ry="7.5" transform="rotate(-20 24 37)" fill="#2B2A3F" />
          <ellipse cx="40" cy="37" rx="6" ry="7.5" transform="rotate(20 40 37)" fill="#2B2A3F" />
          <circle cx="24.5" cy="36.5" r="2.2" fill="#fff" />
          <circle cx="39.5" cy="36.5" r="2.2" fill="#fff" />
          <ellipse cx="32" cy="46" rx="3.4" ry="2.4" fill="#2B2A3F" />
          <circle cx="20" cy="46" r="2.6" fill="#F7A8B8" opacity="0.6" />
          <circle cx="44" cy="46" r="2.6" fill="#F7A8B8" opacity="0.6" />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <rect x="19" y="4" width="9" height="26" rx="4.5" fill="#F5F1FA" stroke="#E5DDF0" />
          <rect x="36" y="4" width="9" height="26" rx="4.5" fill="#F5F1FA" stroke="#E5DDF0" />
          <rect x="21.5" y="8" width="4" height="18" rx="2" fill="#F7B6C8" />
          <rect x="38.5" y="8" width="4" height="18" rx="2" fill="#F7B6C8" />
          <circle cx="32" cy="40" r="18" fill="#F5F1FA" stroke="#E5DDF0" strokeWidth="1.5" />
          <circle cx="25" cy="38" r="2.8" fill="#1D1A4A" />
          <circle cx="39" cy="38" r="2.8" fill="#1D1A4A" />
          <path d="M29.5 44 L34.5 44 L32 47 Z" fill="#F07A9A" />
          <circle cx="21" cy="45" r="2.8" fill="#F7A8B8" opacity="0.6" />
          <circle cx="43" cy="45" r="2.8" fill="#F7A8B8" opacity="0.6" />
        </g>
      );
    case 'cat':
      return (
        <g>
          <path d="M14 34 L17 14 L30 24 Z M50 34 L47 14 L34 24 Z" fill="#6E86B8" />
          <circle cx="32" cy="38" r="19" fill="#8FA6D6" />
          <ellipse cx="25" cy="37" rx="3" ry="4" fill="#1D1A4A" />
          <ellipse cx="39" cy="37" rx="3" ry="4" fill="#1D1A4A" />
          <path d="M30 44 L34 44 L32 46.5 Z" fill="#F07A9A" />
          <path d="M14 44 h10 M14 48 h10 M40 44 h10 M40 48 h10" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
        </g>
      );
    case 'robot':
      return (
        <g>
          <line x1="32" y1="8" x2="32" y2="18" stroke="#2B6F69" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="8" r="4" fill="#F2A516" />
          <rect x="12" y="18" width="40" height="36" rx="10" fill="#18A999" />
          <rect x="18" y="27" width="28" height="14" rx="6" fill="#0F3D3A" />
          <circle cx="26" cy="34" r="3.2" fill="#7CF5E8" />
          <circle cx="38" cy="34" r="3.2" fill="#7CF5E8" />
          <rect x="25" y="45" width="14" height="3.5" rx="1.75" fill="#0F3D3A" />
          <rect x="7" y="30" width="5" height="12" rx="2.5" fill="#2B6F69" />
          <rect x="52" y="30" width="5" height="12" rx="2.5" fill="#2B6F69" />
        </g>
      );
    case 'dino':
      return (
        <g>
          <path d="M20 22 l4 -8 4 8 M30 19 l4 -9 4 9 M40 22 l4 -8 4 8" fill="#3F9E5A" />
          <path d="M32 18 C 48 18 54 30 54 40 C 54 50 44 56 32 56 C 20 56 10 50 10 40 C 10 30 16 18 32 18 Z" fill="#5BBF77" />
          <circle cx="24" cy="36" r="3.4" fill="#fff" />
          <circle cx="40" cy="36" r="3.4" fill="#fff" />
          <circle cx="24.6" cy="36.6" r="1.8" fill="#1D1A4A" />
          <circle cx="40.6" cy="36.6" r="1.8" fill="#1D1A4A" />
          <path d="M24 46 q8 6 16 0" stroke="#1D1A4A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="27" cy="27" r="2" fill="#3F9E5A" />
          <circle cx="38" cy="25" r="1.6" fill="#3F9E5A" />
        </g>
      );
  }
}

export function Avatar({ id, size = 44, className, ring = false }: { id: AvatarId; size?: number; className?: string; ring?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full', ring && 'ring-4 ring-surface', className)}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="32" fill={BG[id]} />
      <Face id={id} />
    </svg>
  );
}
