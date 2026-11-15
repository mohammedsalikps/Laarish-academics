import { ArrowRight, BookOpen, Check, Clock, Gamepad2, Globe2, Lightbulb, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StarRow } from '../../components/ui/primitives';
import { lessonLabel, topicLabel } from '../../content';
import type { Lesson, Topic, TopicMeta } from '../../domain/types';
import type { LessonView } from '../../engine/progression';
import type { TopicProgress } from '../../state/progressTypes';

const pct = (score: number | undefined) => `${Math.round((score ?? 0) * 100)}%`;

/**
 * "What you learned": the topic's big ideas, one real-life example, and how
 * each step went. Built only from the topic's own content and saved scores.
 */
export function TopicRecap({ topic, record }: { topic: Topic; record: TopicProgress }) {
  const ideas = topic.watch.keyIdeas.slice(0, 3);
  const example = topic.mentor.examples[0];
  const playScored = topic.play.assessed && topic.play.weight > 0;
  const done = (step: 'watch' | 'play' | 'practice') => record.completedSteps.includes(step);

  return (
    <section aria-labelledby="recap-title" className="card mx-auto mt-4 max-w-3xl p-4 sm:p-5">
      <h3 id="recap-title" className="flex items-center gap-2 font-display text-lg font-semibold">
        <Lightbulb className="h-5 w-5 text-reward-strong" aria-hidden="true" /> What you learned
      </h3>
      {ideas.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {ideas.map((idea) => (
            <li key={idea} className="flex gap-2 leading-snug">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {idea}
            </li>
          ))}
        </ul>
      )}
      {example && (
        <div className="mt-3 flex gap-2.5 rounded-2xl bg-sky-soft p-3">
          <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(26_100_160)]" aria-hidden="true" />
          <p className="leading-snug">
            <span className="font-extrabold">In real life: </span>
            {example}
          </p>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="How each step went">
        <JourneyChip icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} done={done('watch')} label="Learn" value={done('watch') ? 'done' : 'not yet'} />
        <JourneyChip
          icon={<Gamepad2 className="h-4 w-4" aria-hidden="true" />}
          done={done('play')}
          label="Play"
          value={!done('play') ? 'not yet' : playScored ? `best ${pct(record.scores.play)}` : 'done'}
        />
        <JourneyChip
          icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          done={done('practice')}
          label="Practice"
          value={done('practice') ? `best ${pct(record.scores.practice)}` : 'not yet'}
        />
      </ul>
    </section>
  );
}

function JourneyChip({ icon, label, value, done }: { icon: ReactNode; label: string; value: string; done: boolean }) {
  return (
    <li className={`chip ${done ? 'bg-success-soft text-success-strong' : 'bg-canvas-sunken text-ink-soft'}`}>
      {icon}
      <span>
        {label}: {value}
      </span>
    </li>
  );
}

/** Every topic of a finished lesson with its stars and best mastery. */
export function LessonRecap({ lesson, view }: { lesson: Lesson; view: LessonView }) {
  return (
    <section aria-labelledby="lesson-recap-title" className="card mx-auto mt-4 max-w-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="lesson-recap-title" className="font-display text-lg font-semibold">
          Lesson recap: {lessonLabel(lesson)}
        </h3>
        <p className="chip bg-reward-soft text-reward-strong">
          {view.stars} of {view.maxStars} stars
        </p>
      </div>
      <ol className="mt-3 divide-y divide-line">
        {view.topics.map((t) => (
          <li key={t.topic.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            <span className="min-w-0 font-bold">{topicLabel(t.topic)}</span>
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              <StarRow stars={t.stars} size={16} />
              <span>{pct(t.mastery)} mastery</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The one clear next step after a topic, with what it involves. */
export function UpNextCard({ to, actionLabel, title, summary, meta }: { to: string; actionLabel: string; title: string; summary: string; meta?: ReactNode }) {
  return (
    <section aria-label="Up next" className="card mx-auto flex max-w-3xl flex-col gap-3 border-success/30 bg-success-soft p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-wider text-success-strong">Up next</p>
        <p className="font-display text-lg font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{summary}</p>
        {meta && <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-ink-muted">{meta}</p>}
      </div>
      <Link to={to} className="btn btn-primary btn-lg shrink-0">
        {actionLabel} <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
  );
}

/** "About 6 min · Game: Push the Box" for the next topic. */
export function TopicMetaLine({ topic }: { topic: TopicMeta }) {
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> About {topic.estimatedMinutes} min
      </span>
      <span className="inline-flex items-center gap-1">
        <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> {topic.play.title}
      </span>
    </>
  );
}
