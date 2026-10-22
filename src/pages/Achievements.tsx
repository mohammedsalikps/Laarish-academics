import { Coins, Zap } from 'lucide-react';
import { AchievementBadge } from '../components/ui/AchievementBadge';
import { ProgressBar } from '../components/ui/primitives';
import { ACHIEVEMENTS } from '../engine/achievements';
import { REWARD_RULES } from '../engine/rules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatShortDate, localDateKey } from '../lib/dates';
import { cn } from '../lib/cn';
import { useProgress } from '../state/ProgressProvider';

export default function Achievements() {
  useDocumentTitle('Achievements');
  const { state } = useProgress();
  const today = localDateKey(new Date());
  const count = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

  return (
    <div className="page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Achievements</h1>
          <p className="mt-1 text-ink-soft">
            Each achievement earns <strong className="text-primary-strong">+{REWARD_RULES.xp.achievement} XP</strong> and{' '}
            <strong className="text-reward-strong">+{REWARD_RULES.coins.achievement} coins</strong>. They are just for you: nobody else can see them.
          </p>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="font-display text-3xl font-semibold">{count}</span>
          <span className="text-sm font-bold text-ink-muted">
            of {ACHIEVEMENTS.length}
            <br />
            unlocked
          </span>
        </div>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = state.achievements[a.id];
          const p = a.progress(state, today);
          return (
            <li key={a.id} className={cn('card flex items-center gap-4 p-4', !unlocked && 'bg-surface/70')}>
              <AchievementBadge def={a} unlocked={Boolean(unlocked)} size={76} />
              <div className="min-w-0 flex-1">
                <p className={cn('font-display text-lg font-semibold', !unlocked && 'text-ink-soft')}>{a.name}</p>
                <p className="text-sm text-ink-muted">{a.description}</p>
                {unlocked ? (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-extrabold text-success-strong">
                    <span>Unlocked {formatShortDate(unlocked.unlockedAt)}</span>
                    <span className="flex items-center gap-1 text-primary-strong">
                      <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />+{REWARD_RULES.xp.achievement}
                    </span>
                    <span className="flex items-center gap-1 text-reward-strong">
                      <Coins className="h-3.5 w-3.5" aria-hidden="true" />+{REWARD_RULES.coins.achievement}
                    </span>
                  </p>
                ) : (
                  <div className="mt-2">
                    <ProgressBar value={p.current / p.target} size="sm" tone="reward" label={`${a.name} progress`} />
                    <p className="mt-1 text-xs font-bold text-ink-muted">
                      {p.current} / {p.target}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
