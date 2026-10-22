import { Coins, Trophy, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { Dialog } from '../components/ui/Dialog';
import { useSound } from '../hooks/usePreferences';
import { createId } from '../lib/ids';
import { useProgress } from '../state/ProgressProvider';
import { levelInfo, totalXp } from '../state/selectors';

interface Toast {
  id: string;
  xp: number;
  coins: number;
  title: string;
  achievement: boolean;
}

/**
 * Shows animated "+XP / +coins" toasts for new ledger entries, and a level-up
 * celebration. It only reacts to rewards earned while the app is open.
 */
export function RewardFeed() {
  const { state, ready } = useProgress();
  const play = useSound();
  const seen = useRef<number | null>(null);
  const lastLevel = useRef<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const count = state.ledger.length;
    const level = levelInfo(state).level;
    if (seen.current === null || count < seen.current) {
      seen.current = count;
      lastLevel.current = level;
      return;
    }
    const fresh = state.ledger.slice(seen.current).filter((e) => e.kind === 'reward');
    seen.current = count;
    if (fresh.length > 0) {
      const achievements = fresh.filter((e) => e.key.startsWith('achievement:'));
      const others = fresh.filter((e) => !e.key.startsWith('achievement:'));
      const next: Toast[] = [];
      if (others.length) {
        next.push({
          id: createId('t'),
          xp: others.reduce((s, e) => s + e.xp, 0),
          coins: others.reduce((s, e) => s + e.coins, 0),
          title: others[others.length - 1].reason,
          achievement: false,
        });
      }
      for (const a of achievements) {
        next.push({ id: createId('t'), xp: a.xp, coins: a.coins, title: a.reason.replace(/^Achievement: /, ''), achievement: true });
      }
      setToasts((t) => [...t, ...next].slice(-3));
      play('reward');
      for (const t of next) {
        window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== t.id)), t.achievement ? 4200 : 2800);
      }
    }
    if (lastLevel.current !== null && level > lastLevel.current) setLevelUp(level);
    lastLevel.current = level;
  }, [state, ready, play]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 md:left-auto md:right-6 md:top-24 md:items-end" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              t.achievement
                ? 'flex animate-pop-in items-center gap-3 rounded-2xl border border-reward/40 bg-surface py-2.5 pl-2.5 pr-4 shadow-float'
                : 'flex animate-pop-in items-center gap-3 rounded-2xl bg-ink py-2.5 pl-3 pr-4 text-white shadow-float'
            }
          >
            {t.achievement ? (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-reward-soft text-reward-strong">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
            <div>
              {t.achievement && <p className="text-xs font-extrabold uppercase tracking-wider text-reward-strong">Achievement unlocked</p>}
              <p className="max-w-[240px] truncate text-sm font-bold">{t.title}</p>
            </div>
            <div className="flex items-center gap-2 font-extrabold">
              {t.xp > 0 && (
                <span className={t.achievement ? 'flex items-center gap-1 text-primary' : 'flex items-center gap-1 text-[rgb(196_186_255)]'}>
                  <Zap className="h-4 w-4 fill-current" aria-hidden="true" />+{t.xp}
                </span>
              )}
              {t.coins > 0 && (
                <span className="flex items-center gap-1 text-reward">
                  <Coins className="h-4 w-4" aria-hidden="true" />+{t.coins}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={levelUp !== null} onClose={() => setLevelUp(null)} title="Level up!" hideTitle>
        <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
          <MentorAvatar variant="full" size={150} mood="celebrating" />
          <p className="eyebrow mt-3">Level up</p>
          <p className="font-display text-4xl font-semibold">You reached Level {levelUp}!</p>
          <p className="mt-2 text-ink-soft">You have earned {totalXp(state)} XP so far. Keep exploring to grow even more.</p>
          <button type="button" className="btn btn-primary btn-lg mt-6" onClick={() => setLevelUp(null)}>
            Awesome!
          </button>
        </div>
      </Dialog>
    </>
  );
}
