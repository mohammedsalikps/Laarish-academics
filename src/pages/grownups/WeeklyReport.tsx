import { Info } from 'lucide-react';
import type { SubjectId } from '../../domain/types';
import { isTopicMastered } from '../../engine/progression';
import { REWARD_RULES } from '../../engine/rules';
import { useAcademicsPrefs, weekKey } from '../../state/academicsPrefs';
import { useProgress } from '../../state/ProgressProvider';
import { dailyGoal, xpOnDay } from '../../state/selectors';
import { WorldIcon } from '../../world3d/WorldChip';
import { dayKey, isValidTestDate, parseDay, WEEKDAYS } from '../home/schoolWeek';
import { allClassWorlds, chapterPath, percent } from '../world/worldData';

/**
 * Weekly school report for grown-ups (wireframe G1), from what the app really
 * records: this week's school chapters and topics mastered, active days and
 * XP against the daily goal, a coming test, strongest topic and the one that
 * needs practice, and how many questions the child asked the mentor. The app
 * does not record minutes, so it reports XP and days instead.
 */
export function WeeklyReport() {
  const { state } = useProgress();
  const prefs = useAcademicsPrefs();
  const today = new Date();
  const monday = parseDay(weekKey(today))!;
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
  const sunday = parseDay(days[6])!;
  const worlds = allClassWorlds(state, prefs);
  const name = state.learner?.displayName ?? 'Your child';

  const activeDays = days.filter((d) => state.activeDays.includes(d)).length;
  const weekXp = days.reduce((s, d) => s + xpOnDay(state, d), 0);
  const goal = dailyGoal(state) * 7;
  const goalStatus = weekXp >= goal ? 'Done' : weekXp >= goal * (Math.min(7, days.indexOf(dayKey(today)) + 1) / 7) ? 'On track' : 'Needs a push';
  const questions = days.reduce((s, d) => s + (state.stats.mentorQuestionsByDay?.[d] ?? 0), 0);

  const chapters = worlds
    .filter((w) => w.thisWeek)
    .map((w) => {
      const path = chapterPath(state, w.thisWeek!.lesson, prefs)!;
      const required = path.topics.filter((t) => !t.topic.extension);
      return { world: w, path, required, mastered: required.filter((t) => isTopicMastered(t.topic, state.topics)).length };
    });

  const tests = chapters
    .map((c) => ({ ...c, date: prefs.testDates[c.world.subject.id as SubjectId] }))
    .filter((c): c is typeof c & { date: string } => !!c.date && isValidTestDate(c.date, today));

  const played = Object.values(state.topics).filter((r) => r && r.status === 'completed');
  const titleOf = (topicId: string) => worlds.flatMap((w) => w.chapters.flatMap((c) => c.view.topics)).find((t) => t.topic.id === topicId);
  const strong = played
    .filter((r) => (r!.lastPlayedAt ?? '') >= days[0])
    .sort((a, b) => b!.bestMastery - a!.bestMastery || b!.stars - a!.stars)[0];
  const needs = worlds
    .flatMap((w) => w.chapters.flatMap((c) => c.view.topics))
    .filter((t) => t.needsPractice)
    .sort((a, b) => a.mastery - b.mastery)[0];
  const strongView = strong ? titleOf(strong.topicId) : undefined;

  return (
    <section className="card mt-5 p-5 font-grown" aria-labelledby="weekly-report">
      <span className="inline-block rounded-full bg-grownup-soft px-3 py-1 text-xs font-extrabold text-grownup">For grown-ups</span>
      <h2 id="weekly-report" className="mt-2 text-xl font-extrabold text-ink">
        Weekly school report
      </h2>
      <p className="text-sm text-ink-muted">
        {name} · Class {state.learner?.grade} · {monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
      </p>

      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-[0.14em] text-ink-muted">School chapters</h3>
      {chapters.length === 0 ? (
        <p className="mt-1 text-sm text-ink-soft">No chapters set for this week yet. Set them below, or {name} can set them on Home.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {chapters.map((c) => (
            <li key={c.world.subject.id}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <WorldIcon theme={c.world.theme} size={22} />
                <span className="min-w-0 flex-1 font-extrabold text-ink">
                  {c.world.subject.name} · {c.path.chapter.lesson.title}
                </span>
                <span className="basis-full text-sm font-bold text-ink-soft sm:basis-auto">
                  {c.mastered} of {c.required.length} topics mastered
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-canvas-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={c.required.length} aria-valuenow={c.mastered} aria-label={`${c.path.chapter.lesson.title} topics mastered`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.required.length ? (c.mastered / c.required.length) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-sm text-ink-soft">
        Monday check-in: {prefs.checkInWeek === weekKey(today) ? 'answered this week' : 'not answered yet this week'}
        {prefs.chaptersChangedBy ? ` · chapters last set by ${prefs.chaptersChangedBy === 'child' ? name : 'a grown-up'}` : ''}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-3">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-muted">This week</h3>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {weekXp} XP <span className="text-sm font-bold text-ink-muted">of {goal}</span>
          </p>
          <p className="text-sm text-ink-soft">
            {activeDays} of 7 days active · daily goal {dailyGoal(state)} XP
          </p>
          <span className="mt-2 inline-block rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success-strong">{goalStatus}</span>
        </div>
        <div className="rounded-2xl border border-line p-3">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-muted">Tests</h3>
          {tests.length === 0 ? (
            <p className="mt-1 text-sm text-ink-soft">No test dates in the next two weeks.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {tests.map((t) => {
                const d = parseDay(t.date)!;
                return (
                  <li key={t.world.subject.id} className="text-sm text-ink">
                    <span className="font-extrabold">
                      Test on {WEEKDAYS[d.getDay()]} {d.getDate()} {d.toLocaleDateString(undefined, { month: 'short' })}
                    </span>{' '}
                    · {t.world.subject.name} · {t.path.chapter.lesson.title}: {t.mastered} of {t.required.length} topics revised
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl bg-success-soft p-3">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-success-strong">Strong at</h3>
          <p className="mt-1 text-sm font-bold text-ink">{strong && strongView ? `${strongView.topic.title}: ${percent(strong.bestMastery)}%, ${strong.stars} ${strong.stars === 1 ? 'star' : 'stars'}` : 'Nothing finished this week yet.'}</p>
        </div>
        <div className="rounded-2xl bg-reward-soft p-3">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-reward-strong">Needs practice</h3>
          <p className="mt-1 text-sm font-bold text-ink">{needs ? `${needs.topic.title}: ${percent(needs.mastery)}% (${percent(REWARD_RULES.unlock.minMastery)}% opens the next topic)` : 'Nothing below the pass mark.'}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        {name} asked the mentor {questions} {questions === 1 ? 'question' : 'questions'} this week. Conversations are not saved, only counted.
      </p>
      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-grownup-soft p-3 text-sm font-semibold text-ink">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-grownup" aria-hidden="true" />
        These lessons are Laarish originals mapped to NCERT. They have not yet been reviewed by teachers.
      </p>
    </section>
  );
}
