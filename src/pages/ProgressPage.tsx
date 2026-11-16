import { BookOpen, Coins, Flame, ShieldCheck, Star, Trophy, UserRound, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ProgressBar, SectionHeading, StarRow } from '../components/ui/primitives';
import { getTopic, lessonLabel, topicLabel } from '../content';
import { passMastery } from '../engine/progression';
import { REWARD_RULES } from '../engine/rules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { formatShortDate, localDateKey } from '../lib/dates';
import { lessonPath, subjectPath } from '../lib/paths';
import { useAcademicsPrefs } from '../state/academicsPrefs';
import { useProgress } from '../state/ProgressProvider';
import { StreakWeek } from '../components/progress/StreakWeek';
import { worldPath } from '../world3d/paths';
import { WorldIcon } from '../world3d/WorldChip';
import { allClassWorlds, percent } from './world/worldData';
import { coinBalance, currentStreak, levelInfo, longestStreak, overallProgress, subjectViews, totalStars, totalXp, xpHistory } from '../state/selectors';

export default function ProgressPage() {
  useDocumentTitle('My progress');
  const { state } = useProgress();
  const today = localDateKey(new Date());
  const level = levelInfo(state);
  const history = xpHistory(state, today, 7);
  const maxXp = Math.max(REWARD_RULES.dailyGoal.default, ...history.map((h) => h.xp));
  const goal = state.learner?.dailyGoalXp ?? REWARD_RULES.dailyGoal.default;
  const subjects = subjectViews(state);
  const prefs = useAcademicsPrefs();
  const worlds = allClassWorlds(state, prefs);
  const overall = overallProgress(state);
  const startedLessons = subjects.flatMap((s) => s.lessons).filter((l) => l.state === 'in-progress' || l.state === 'completed' || l.state === 'available');

  const stats = [
    { label: 'Total XP', value: totalXp(state), icon: Zap, tone: 'bg-primary-soft text-primary-strong' },
    { label: 'Coins', value: coinBalance(state), icon: Coins, tone: 'bg-reward-soft text-reward-strong' },
    { label: 'Stars', value: totalStars(state), icon: Star, tone: 'bg-reward-soft text-reward-strong' },
    { label: 'Lessons done', value: `${overall.lessonsCompleted}/${overall.lessonsReady}`, icon: BookOpen, tone: 'bg-success-soft text-success-strong' },
    { label: 'Day streak', value: currentStreak(state, today), icon: Flame, tone: 'bg-coral-soft text-coral-strong' },
  ];

  return (
    <div className="page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">My progress</h1>
          <p className="mt-1 text-ink-soft">
            Level {level.level} · {level.xpIntoLevel} / {level.xpForNext} XP to the next level · Best streak {longestStreak(state)} {longestStreak(state) === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings" className="btn btn-secondary btn-sm">
            <UserRound className="h-4 w-4 text-primary" aria-hidden="true" /> Guide and avatar
          </Link>
          <Link to="/parents" className="btn btn-secondary btn-sm">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" /> Summary for grown-ups
          </Link>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label} className="card flex items-center gap-3 p-4">
            <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', s.tone)}>
              <s.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs font-bold text-ink-muted">{s.label}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Wireframe P1: this week's streak and the six worlds (real mastery, best stars; tap to open). */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-2" aria-labelledby="streak-week">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#B8540F]">
            <Flame className="h-4 w-4" aria-hidden="true" /> Streak
          </p>
          <h2 id="streak-week" className="mt-1 font-display text-2xl font-extrabold">
            {currentStreak(state, today)} {currentStreak(state, today) === 1 ? 'day' : 'days'}
          </h2>
          <p className="text-sm font-bold text-ink-muted">Best {longestStreak(state)}</p>
          <div className="mt-3">
            <StreakWeek activeDays={state.activeDays} size="md" />
          </div>
          <p className="mt-2 text-xs font-semibold text-ink-muted">A missed day stays grey, never red.</p>
        </section>
        <section className="card p-5 lg:col-span-3" aria-labelledby="your-worlds">
          <h2 id="your-worlds" className="text-lg font-extrabold">
            Your worlds
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {worlds.map((w) => {
              const best = Math.max(0, ...w.chapters.flatMap((c) => c.view.topics.map((t) => t.stars)));
              return (
                <li key={w.subject.id}>
                  <Link
                    to={worldPath(w.subject.id)}
                    className="flex min-h-[88px] flex-col gap-1 rounded-2xl border-2 border-line bg-surface p-3 transition hover:border-primary/40"
                    aria-label={`${w.theme.name}, ${w.subject.name}: ${percent(w.mastery)}% mastery, best ${best} of 3 stars. Open world`}
                  >
                    <span className="flex items-center gap-2">
                      <WorldIcon theme={w.theme} size={26} />
                      <span className="font-display text-lg font-extrabold">{percent(w.mastery)}%</span>
                    </span>
                    <span className="truncate text-sm font-bold text-ink">{w.theme.name}</span>
                    <StarRow stars={best} size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3" aria-labelledby="xp-week">
          <SectionHeading id="xp-week" title="XP this week" subtitle={`Daily goal: ${goal} XP`} />
          <div className="relative mt-2 flex h-48 items-end gap-2 sm:gap-4" aria-hidden="true">
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-success/50" style={{ bottom: `${Math.min(100, (goal / maxXp) * 100)}%` }} />
            {history.map((h) => (
              <div key={h.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-extrabold tabular-nums text-ink-soft">{h.xp || ''}</span>
                <div
                  className={cn('w-full max-w-[44px] rounded-t-xl transition-[height] duration-700', h.xp >= goal ? 'bg-success' : h.xp > 0 ? 'bg-primary' : 'bg-ink/10')}
                  style={{ height: `${Math.max(4, (h.xp / maxXp) * 100)}%` }}
                />
                <span className={cn('text-xs font-bold', h.day === today ? 'text-primary-strong' : 'text-ink-muted')}>
                  {h.day === today ? 'Today' : new Date(`${h.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
          <table className="sr-only">
            <caption>XP earned per day this week</caption>
            <tbody>
              {history.map((h) => (
                <tr key={h.day}>
                  <th scope="row">{h.day}</th>
                  <td>{h.xp} XP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card p-5 lg:col-span-2" aria-labelledby="subjects-progress">
          <SectionHeading id="subjects-progress" title="Subjects" />
          <ul className="space-y-4">
            {subjects.map((p) => (
              <li key={p.subject.id}>
                <div className="mb-1 flex justify-between gap-2 text-sm font-bold">
                  <Link to={subjectPath(p.subject.id)} className="hover:underline">
                    {p.subject.name}
                  </Link>
                  <span className="text-right text-ink-muted">
                    {p.lessonsCompleted}/{p.lessonsReady} lessons · {p.stars} ★
                  </span>
                </div>
                <ProgressBar value={p.progress} color={p.subject.color} size="sm" label={`${p.subject.name} progress`} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6" aria-labelledby="mastery-title">
        <SectionHeading
          id="mastery-title"
          title="Topic mastery"
          subtitle={`${Math.round(REWARD_RULES.unlock.minMastery * 100)}% mastery in a topic unlocks the next topic. Master every topic to complete the lesson.`}
        />
        <div className="space-y-4">
          {startedLessons.map((l) => (
            <div key={l.lesson.id} className="card overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <Link to={lessonPath(l.lesson.subjectId, l.lesson.id)} className="font-display text-lg font-semibold hover:underline">
                  {lessonLabel(l.lesson)}
                </Link>
                <span className="text-sm font-bold text-ink-muted">
                  {l.topicsMastered}/{l.topicsTotal} topics mastered
                </span>
              </div>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-extrabold">Topic</th>
                    <th className="px-4 py-2.5 font-extrabold">Status</th>
                    <th className="px-4 py-2.5 font-extrabold">Mastery</th>
                    <th className="px-4 py-2.5 font-extrabold">Stars</th>
                    <th className="px-4 py-2.5 font-extrabold">Played</th>
                  </tr>
                </thead>
                <tbody>
                  {l.topics.map((v) => (
                    <tr key={v.topic.id} className="border-t border-line">
                      <td className="px-4 py-3 font-bold">{topicLabel(v.topic)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'chip text-xs',
                            v.state === 'completed' && !v.needsPractice && 'bg-success-soft text-success-strong',
                            v.needsPractice && 'bg-reward-soft text-reward-strong',
                            v.state === 'in-progress' && 'bg-primary-soft text-primary-strong',
                            v.state === 'available' && 'bg-sky-soft text-[rgb(26_100_160)]',
                            v.state === 'locked' && 'bg-canvas-sunken text-ink-muted',
                          )}
                        >
                          {v.state === 'completed' ? (v.needsPractice ? 'Needs practice' : 'Mastered') : v.state === 'in-progress' ? 'In progress' : v.state === 'available' ? 'Ready' : 'Locked'}
                        </span>
                      </td>
                      <td className="w-44 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={v.mastery} size="sm" tone={v.mastery >= passMastery(v.topic) ? 'success' : 'reward'} label={`${v.topic.title} mastery`} />
                          <span className="w-10 text-right font-bold tabular-nums">{Math.round(v.mastery * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StarRow stars={v.stars} size={14} />
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{v.record?.timesCompleted ? `${v.record.timesCompleted}×` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="quiz-history">
        <SectionHeading id="quiz-history" title="Recent practice" />
        {state.quizAttempts.length === 0 ? (
          <EmptyState icon={<Trophy className="h-6 w-6" />} title="No practice yet" body="Finish a topic's Practice step and your scores will appear here." />
        ) : (
          <ul className="card divide-y divide-line">
            {[...state.quizAttempts]
              .reverse()
              .slice(0, 8)
              .map((q) => {
                const topic = getTopic(q.topicId);
                return (
                  <li key={q.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{topic ? topicLabel(topic) : q.topicId}</span>
                      <span className="text-xs font-semibold text-ink-muted">
                        {formatShortDate(q.at)} · {q.mode === 'practice' ? 'Practice round' : 'First attempt'}
                      </span>
                    </span>
                    <span className="hidden text-xs font-bold text-ink-muted sm:inline">
                      {q.correctFirstTry}/{q.total} first try
                    </span>
                    <span className={cn('chip', q.score >= REWARD_RULES.unlock.minMastery ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}>
                      {Math.round(q.score * 100)}%
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
