import { Lightbulb, Printer, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Avatar } from '../components/art/Avatar';
import { ProgressBar, StarRow } from '../components/ui/primitives';
import { SAMPLE_CURRICULUM_NOTICE, lessonLabel, topicLabel } from '../content';
import { REWARD_RULES } from '../engine/rules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatShortDate, localDateKey, shiftDateKey } from '../lib/dates';
import { cn } from '../lib/cn';
import { useProgress } from '../state/ProgressProvider';
import { completedTopicCount, currentStreak, levelInfo, overallProgress, subjectViews, totalStars, totalXp } from '../state/selectors';

/**
 * Grown-ups' progress summary behind a simple "ask a grown-up" check.
 * The check keeps young children from wandering in; it is NOT a security control.
 */
export default function Parents() {
  useDocumentTitle('For grown-ups');
  const [unlocked, setUnlocked] = useState(false);
  const [challenge] = useState(() => {
    const a = 6 + Math.floor(Math.random() * 4);
    const b = 7 + Math.floor(Math.random() * 3);
    return { a, b };
  });
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);

  if (!unlocked) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (Number(answer) === challenge.a * challenge.b) setUnlocked(true);
      else setError(true);
    };
    return (
      <div className="page grid min-h-[60dvh] place-items-center">
        <form onSubmit={submit} className="card w-full max-w-md p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-semibold">For grown-ups</h1>
          <p className="mt-1 text-ink-soft">Please ask a grown-up to answer this question.</p>
          <label htmlFor="gate" className="mt-5 block font-display text-3xl font-semibold">
            {challenge.a} × {challenge.b} = ?
          </label>
          <input
            id="gate"
            inputMode="numeric"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value.replace(/\D/g, ''));
              setError(false);
            }}
            className={cn('mx-auto mt-3 block min-h-[52px] w-40 rounded-2xl border-2 bg-surface text-center text-2xl font-bold outline-none focus:border-primary', error ? 'border-coral' : 'border-line')}
            aria-invalid={error}
            aria-describedby="gate-msg"
            autoComplete="off"
          />
          <p id="gate-msg" className="mt-2 min-h-[1.25rem] text-sm font-bold text-coral-strong" role="alert">
            {error ? 'That is not quite right. Please try again.' : ''}
          </p>
          <button type="submit" className="btn btn-primary mt-3" disabled={!answer}>
            Continue
          </button>
          <p className="mt-4 text-xs text-ink-muted">This simple check is not a security feature. Real accounts will use verified guardian access.</p>
        </form>
      </div>
    );
  }

  return <ParentSummary />;
}

function ParentSummary() {
  const { state } = useProgress();
  const learner = state.learner!;
  const today = localDateKey(new Date());
  const level = levelInfo(state);
  const days = Array.from({ length: 14 }, (_, i) => shiftDateKey(today, i - 13));
  const active = new Set(state.activeDays);
  const subjects = subjectViews(state);
  const overall = overallProgress(state);
  const lessons = subjects.flatMap((s) => s.lessons).filter((l) => l.state !== 'in-development');
  const topics = lessons.flatMap((l) => l.topics.map((t) => ({ ...t, lesson: l.lesson })));
  const practice = topics.filter((v) => v.needsPractice);
  const notStarted = topics.filter((v) => v.state === 'available');

  return (
    <div className="page max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar id={learner.avatarId} size={64} />
          <div>
            <p className="eyebrow">Progress summary for grown-ups</p>
            <h1 className="text-3xl font-semibold">{learner.displayName}</h1>
            <p className="text-sm font-bold text-ink-muted">
              Class {learner.grade} · learning since {formatShortDate(learner.createdAt)}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Print
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Lessons completed', `${overall.lessonsCompleted} of ${overall.lessonsReady}`],
          ['Topics completed', completedTopicCount(state)],
          ['Stars earned', totalStars(state)],
          ['Level', `${level.level} (${totalXp(state)} XP)`],
          ['Current streak', `${currentStreak(state, today)} ${currentStreak(state, today) === 1 ? 'day' : 'days'}`],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">{k}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="card mt-5 p-5" aria-labelledby="activity-14">
        <h2 id="activity-14" className="text-lg font-semibold">
          Learning days (last 14 days)
        </h2>
        <ol className="mt-3 flex gap-1.5">
          {days.map((d) => (
            <li
              key={d}
              className={cn('h-8 flex-1 rounded-lg', active.has(d) ? 'bg-success' : 'bg-ink/10')}
              title={d}
              aria-label={`${d}: ${active.has(d) ? 'learned' : 'no activity'}`}
            />
          ))}
        </ol>
        <p className="mt-2 text-sm text-ink-muted">
          {days.filter((d) => active.has(d)).length} active days · {state.stats.mentorQuestions} questions asked to the mentor (conversation content is not stored)
        </p>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-5" aria-labelledby="by-subject">
          <h2 id="by-subject" className="text-lg font-semibold">
            By subject
          </h2>
          <ul className="mt-3 space-y-3">
            {subjects.map((p) => (
              <li key={p.subject.id}>
                <div className="mb-1 flex justify-between gap-2 text-sm font-bold">
                  <span>{p.subject.name}</span>
                  <span className="text-right text-ink-muted">
                    {p.lessonsCompleted}/{p.lessonsReady} lessons · {p.topicsMastered}/{p.topicsTotal} topics
                  </span>
                </div>
                <ProgressBar value={p.progress} color={p.subject.color} size="sm" label={`${p.subject.name} progress`} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="suggestions">
          <h2 id="suggestions" className="flex items-center gap-2 text-lg font-semibold">
            <Lightbulb className="h-5 w-5 text-reward" aria-hidden="true" /> Suggestions
          </h2>
          <ul className="mt-3 space-y-2 text-[0.95rem] text-ink-soft">
            {practice.map((v) => (
              <li key={v.topic.id}>
                <strong className="text-ink">{topicLabel(v.topic)}</strong> ({v.lesson.title}): mastery is {Math.round(v.mastery * 100)}%. Replaying the Practice step together would help
                reach {Math.round(REWARD_RULES.unlock.minMastery * 100)}% and unlock the next topic.
              </li>
            ))}
            {notStarted.slice(0, 3).map((v) => (
              <li key={v.topic.id}>
                <strong className="text-ink">{v.topic.title}</strong> in {lessonLabel(v.lesson)} is ready to start ({v.topic.estimatedMinutes} minutes).
              </li>
            ))}
            {practice.length === 0 && notStarted.length === 0 && <li>Every available topic is mastered. New lessons are on the way!</li>}
          </ul>
        </section>
      </div>

      <section className="card mt-5 overflow-x-auto p-0" aria-labelledby="missions-table">
        <h2 id="missions-table" className="px-5 pt-5 text-lg font-semibold">
          Topics
        </h2>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead className="border-y border-line text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-5 py-2.5 font-extrabold">Topic</th>
              <th className="px-5 py-2.5 font-extrabold">Lesson</th>
              <th className="px-5 py-2.5 font-extrabold">Mastery</th>
              <th className="px-5 py-2.5 font-extrabold">Stars</th>
              <th className="px-5 py-2.5 font-extrabold">Last played</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((v) => (
              <tr key={v.topic.id} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5 font-bold">{v.topic.title}</td>
                <td className="px-5 py-2.5 text-ink-soft">{lessonLabel(v.lesson)}</td>
                <td className="px-5 py-2.5">{v.record ? `${Math.round(v.mastery * 100)}%` : v.state === 'locked' ? 'Locked' : 'Not started'}</td>
                <td className="px-5 py-2.5">
                  <StarRow stars={v.stars} size={13} />
                </td>
                <td className="px-5 py-2.5 text-ink-muted">{v.record ? formatShortDate(v.record.lastPlayedAt) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 text-sm text-ink-soft" aria-labelledby="privacy">
        <h2 id="privacy" className="text-lg font-semibold text-ink">
          Data and privacy in this demo
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Stored: nickname, grade, avatar, learning progress and settings, in this browser's local storage only.</li>
          <li>Not collected: real name, email, birthday, location, photos or contacts. No advertising or tracking.</li>
          <li>Mentor (Rishi or Ayra): typed questions are sent to the Laarish server (without the nickname) to generate an answer, and are not saved.</li>
          <li>Delete: use Settings → Reset all progress, or clear this site's data in the browser.</li>
          <li>Production accounts will require verified guardian consent, data minimisation, retention limits and deletion on request before launch.</li>
        </ul>
        <p className="mt-3 text-xs">{SAMPLE_CURRICULUM_NOTICE}</p>
      </section>
    </div>
  );
}
