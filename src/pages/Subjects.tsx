import { ArrowRight, Check, Info, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubjectArt } from '../components/art/SubjectArt';
import { PageHeader } from '../components/navigation/Breadcrumbs';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/primitives';
import { SAMPLE_CURRICULUM_NOTICE, lessonLabel } from '../content';
import type { SubjectState } from '../engine/progression';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { subjectPath } from '../lib/paths';
import { useProgress } from '../state/ProgressProvider';
import { subjectViews } from '../state/selectors';

const STATUS: Record<SubjectState, { label: string; className: string; action: string }> = {
  'not-started': { label: 'Not started', className: 'bg-canvas-sunken text-ink-soft', action: 'Start exploring' },
  'in-progress': { label: 'In progress', className: 'bg-primary-soft text-primary-strong', action: 'Continue' },
  completed: { label: 'Completed', className: 'bg-success-soft text-success-strong', action: 'Review' },
};

/** Level 2: every subject, with progress. Choosing one opens its lesson roadmap. */
export default function Subjects() {
  useDocumentTitle('Subjects');
  const { state } = useProgress();
  const views = subjectViews(state);

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/home' }, { label: 'Subjects' }]}
        title="Subjects"
        description="Choose a subject to see its lessons in order. Each lesson unlocks the next one as you learn."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {views.map((v) => {
          const s = v.subject;
          const status = STATUS[v.state];
          const nextView = v.lessons.find((l) => l.lesson.id === v.nextLesson?.id);
          return (
            <article key={s.id} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative h-36 p-3" style={{ backgroundColor: s.softColor }}>
                <SubjectArt id={s.id} className="transition duration-300 group-hover:scale-105" />
                <span className="chip absolute left-3 top-3 bg-surface/90 text-xs" style={{ color: s.color }}>
                  <Icon name={s.icon} width={14} height={14} /> {s.worldName}
                </span>
                <span className={cn('chip absolute right-3 top-3 text-xs', status.className)}>{status.label}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-2xl font-semibold">{s.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{s.description}</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm font-bold">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-success" aria-hidden="true" /> {v.lessonsCompleted} of {v.lessonsReady} lessons completed
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-ink-muted">
                      <Star className="h-4 w-4 fill-reward text-reward" aria-hidden="true" /> {v.stars}
                    </span>
                  </div>
                  <ProgressBar value={v.progress} color={s.color} label={`${s.name} progress`} />
                  <p className="mt-2 text-xs font-bold text-ink-muted">
                    {v.lessonsTotal} lessons · {v.lessonsReady} ready to play · {v.topicsMastered}/{v.topicsTotal} topics mastered
                  </p>
                </div>
                {nextView && (
                  <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 text-sm">
                    <span className="font-extrabold text-ink-muted">{nextView.state === 'in-progress' ? 'Continue: ' : nextView.state === 'completed' ? 'Review: ' : 'Next: '}</span>
                    {lessonLabel(nextView.lesson)}
                  </p>
                )}
                <div className="flex-1" />
                <Link to={subjectPath(s.id)} className="btn btn-secondary mt-5 w-full" style={{ color: s.color }} aria-label={`${status.action} ${s.name}`}>
                  {status.action} <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-8 flex items-start gap-2 text-sm text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {SAMPLE_CURRICULUM_NOTICE}
      </p>
    </div>
  );
}
