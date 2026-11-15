import { BookOpen, Compass, Crown, FlaskConical, Flower2, Mountain, type LucideIcon } from 'lucide-react';
import type { WorldTheme } from './worlds';

const WORLD_ICONS: Record<WorldTheme['icon'], LucideIcon> = {
  flask: FlaskConical,
  crown: Crown,
  book: BookOpen,
  flower: Flower2,
  mountain: Mountain,
  compass: Compass,
};

/** The world's tinted icon tile (tint + icon, never colour alone). */
export function WorldIcon({ theme, size = 36, className }: { theme: WorldTheme; size?: number; className?: string }) {
  const Icon = WORLD_ICONS[theme.icon];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${className ?? ''}`}
      style={{ width: size, height: size, backgroundColor: theme.tint, color: theme.onTint, boxShadow: theme.subjectId === 'hindi' ? 'inset 0 0 0 1.5px #E2C36A' : undefined }}
      aria-hidden="true"
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.4} />
    </span>
  );
}

/**
 * A world chip floating over the hub: name + mastery %, always UI text (never
 * baked into the art). The button has a 56 px hit area even though it looks smaller.
 */
export function WorldChip({
  theme,
  label,
  mastery,
  thisWeek,
  onOpen,
}: {
  theme: WorldTheme;
  label: string;
  mastery: number;
  thisWeek: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative -mb-2 flex min-h-[56px] items-end justify-center px-1 pb-2 focus-visible:outline-none"
      aria-label={`${theme.name}, ${label}: ${mastery}% mastery${thisWeek ? ', this week in school' : ''}. Open world`}
    >
      <span
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 py-1 pl-1 pr-3 text-[13px] font-extrabold text-ink shadow-lift ring-2 transition group-hover:-translate-y-0.5 group-focus-visible:ring-4 group-focus-visible:ring-primary ${thisWeek ? 'ring-reward' : 'ring-white/0'}`}
      >
        <WorldIcon theme={theme} size={24} />
        {label} · {mastery}%
      </span>
      <span className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 rounded bg-white/90" aria-hidden="true" />
    </button>
  );
}
