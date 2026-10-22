import { ChartColumn, Coins, Flame, House, LayoutGrid, MessageCircle, Settings, ShieldCheck, Trophy, X, type LucideIcon } from 'lucide-react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { localDateKey } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { useMentor } from '../../mentor/MentorProvider';
import { useProgress } from '../../state/ProgressProvider';
import { coinBalance, currentStreak, levelInfo } from '../../state/selectors';
import { Avatar } from '../art/Avatar';
import { BrandMark } from '../art/Brand';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { MentorAvatar } from '../mentor/MentorAvatar';
import { PageSkeleton } from '../ui/PageSkeleton';
import { ProgressRing } from '../ui/primitives';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MAIN_NAV: NavItem[] = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/subjects', label: 'Subjects', icon: LayoutGrid },
  { to: '/achievements', label: 'Awards', icon: Trophy },
  { to: '/progress', label: 'Progress', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function StatChips({ compact = false }: { compact?: boolean }) {
  const { state } = useProgress();
  const level = levelInfo(state);
  const streak = currentStreak(state, localDateKey(new Date()));
  const coins = coinBalance(state);
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="chip bg-coral-soft text-coral-strong" title="Learning streak" aria-label={`${streak} day streak`}>
        <Flame className={cn('h-4 w-4', streak > 0 && 'fill-current')} aria-hidden="true" />
        {streak}
      </span>
      <span className="chip bg-reward-soft text-reward-strong" title="Coins" aria-label={`${coins} coins`}>
        <Coins className="h-4 w-4" aria-hidden="true" />
        {coins}
      </span>
      <span className="chip gap-2 bg-primary-soft py-0.5 pl-1 text-primary-strong" title={`Level ${level.level}: ${level.xpIntoLevel} of ${level.xpForNext} XP`}>
        <ProgressRing value={level.progress} size={compact ? 26 : 28} stroke={4} label={`Level ${level.level} progress`}>
          <span className="text-[0.65rem] font-extrabold">{level.level}</span>
        </ProgressRing>
        <span className={cn(compact && 'sr-only')}>Level {level.level}</span>
      </span>
    </div>
  );
}

function SideNav() {
  const { state } = useProgress();
  const mentor = useMentor();
  const persona = useMentorPersona();
  const learner = state.learner;
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[92px] flex-col border-r border-line bg-surface md:flex lg:w-[248px]">
      <Link to="/home" className="flex h-[76px] items-center justify-center px-4 lg:justify-start lg:px-6" aria-label="Laarish Academics home">
        <span className="lg:hidden">
          <BrandMark variant="icon" />
        </span>
        <span className="hidden lg:inline">
          <BrandMark />
        </span>
      </Link>
      <nav aria-label="Main" className="flex-1 px-3 lg:px-4">
        <ul className="space-y-1">
          {MAIN_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-extrabold transition lg:flex-row lg:gap-3 lg:px-4 lg:py-3 lg:text-[0.98rem]',
                    isActive ? 'bg-primary-soft text-primary-strong' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                  )
                }
              >
                <item.icon className="h-6 w-6" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-3 p-3 lg:p-4">
        <button
          type="button"
          onClick={() => mentor.open()}
          className="group flex w-full flex-col items-center gap-1 rounded-3xl border border-line bg-surface p-2.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 lg:flex-row lg:gap-3"
        >
          <MentorAvatar size={44} />
          <span className="text-center lg:text-left">
            <span className="block text-xs font-extrabold lg:text-base">Ask {persona.name}</span>
            <span className="hidden text-xs font-semibold text-ink-muted lg:block">Stuck? I can help!</span>
          </span>
        </button>
        {learner && (
          <Link to="/settings" className="hidden items-center gap-3 rounded-2xl px-2 py-2 hover:bg-canvas lg:flex">
            <Avatar id={learner.avatarId} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold">{learner.displayName}</span>
              <span className="block text-xs font-bold text-ink-muted">Class {learner.grade} · Demo mode</span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}

function MobileTabBar() {
  const persona = useMentorPersona();
  const items: NavItem[] = [MAIN_NAV[0], MAIN_NAV[1], { to: '/mentor', label: persona.name, icon: MessageCircle }, MAIN_NAV[2], MAIN_NAV[3]];
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-around px-2">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 pb-2 pt-2 text-[0.7rem] font-extrabold', isActive ? 'text-primary' : 'text-ink-muted')
              }
            >
              {({ isActive }) =>
                item.to === '/mentor' ? (
                  <>
                    <span className={cn('-mt-6 rounded-full border-4 shadow-lift', isActive ? 'border-primary' : 'border-surface')}>
                      <MentorAvatar size={48} />
                    </span>
                    {item.label}
                  </>
                ) : (
                  <>
                    <span className={cn('grid h-9 w-12 place-items-center rounded-full transition', isActive && 'bg-primary-soft')}>
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    {item.label}
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TopBar() {
  const { state } = useProgress();
  const learner = state.learner;
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line/70 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-3 px-[var(--space-gutter)] md:h-[76px]">
        <Link to="/home" className="md:hidden" aria-label="Laarish Academics home">
          <BrandMark variant="compact" />
        </Link>
        <span className="hidden items-center gap-2 text-sm font-bold text-ink-muted md:flex">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" /> Demo mode · progress saved on this device
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <StatChips />
          </span>
          <span className="sm:hidden">
            <StatChips compact />
          </span>
          {learner && (
            <Link to="/settings" className="rounded-full md:hidden" aria-label="Profile and settings">
              <Avatar id={learner.avatarId} size={36} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function StorageNotice() {
  const { notice, dismissNotice } = useProgress();
  if (!notice) return null;
  return (
    <div className="mx-auto mt-3 flex max-w-6xl items-start gap-3 rounded-2xl border border-reward/40 bg-reward-soft px-4 py-3 text-sm font-bold text-ink" role="status">
      <span className="flex-1">{notice}</span>
      <button type="button" onClick={dismissNotice} className="rounded-lg p-1 hover:bg-ink/5" aria-label="Dismiss message">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Layout for signed-in learner screens. Lessons use their own immersive layout. */
export function AppShell() {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-xl bg-primary px-4 py-2 font-bold text-white">
        Skip to content
      </a>
      <SideNav />
      <div className="md:pl-[92px] lg:pl-[248px]">
        <TopBar />
        <div className="px-[var(--space-gutter)]">
          <StorageNotice />
        </div>
        <main id="main" tabIndex={-1} className="outline-none">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
