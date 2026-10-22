import { ArrowRight, BookOpen, Check, Info, Star } from 'lucide-react';
import { useEffect, useId } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SubjectArt } from '../components/art/SubjectArt';
import { PageHeader } from '../components/navigation/Breadcrumbs';
import { ProgressBar, ProgressRing } from '../components/ui/primitives';
import { LESSONS, SAMPLE_CURRICULUM_NOTICE, getSubject, lessonLabel, levelForGrade } from '../content';
import type { Subject, SubjectLevel } from '../domain/types';
import { levelView, subjectView, type LessonView } from '../engine/progression';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useReducedMotion } from '../hooks/usePreferences';
import { classParam, lessonPath, subjectPath } from '../lib/paths';
import { useMentorContext } from '../mentor/MentorProvider';
import { useProgress } from '../state/ProgressProvider';
import NotFound from './NotFound';
import { LessonPathSection, type LessonGroup } from './roadmap/LessonPathSection';

/**
 * Level 3: a subject's overview. Its totals and progress, a small class
 * selector (the learner's own class first), and one winding roadmap of that
 * class's lessons, in labelled branch sections. A lesson opens its topics.
 * The class is in the URL (?class=6), so links and the back button keep it;
 * switching class only changes what is shown, never the learner's progress.
 */
export default function SubjectRoadmap() {
  const { subjectId } = useParams();
  const subject = getSubject(subjectId);
  const { actions } = useProgress();
  useDocumentTitle(subject?.name ?? 'Not found');
  useMentorContext(subject ? { subjectId: subject.id, step: 'none' } : null);

  useEffect(() => {
    if (subject) actions.visitSubject(subject.id);
  }, [subject, actions]);

  if (!subject) return <NotFound />;
  return <SubjectOverview subject={subject} />;
}

function SubjectOverview({ subject }: { subject: Subject }) {
  const { state } = useProgress();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const reducedMotion = useReducedMotion();
  const selectId = useId();
  const grade = state.learner!.grade;
  const levels = subject.levels ?? [];
  const mine = levelForGrade(subject, grade);
  const requested = levels.find((l) => classParam(l.id) === params.get('class'));
  const level: SubjectLevel | undefined = requested ?? mine ?? levels[0];
  const overall = subjectView(subject, state.topics, grade);
  const view = level ? levelView(subject, level, state.topics) : undefined;

  // Coming back from a lesson (or an old branch link) scrolls to that branch on the path.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [hash, level?.id, reducedMotion]);

  const groups: LessonGroup[] = view
    ? view.branches.map((b) => ({
        id: b.branch.id,
        title: b.branch.title,
        icon: b.branch.icon,
        detail: b.lessonsReady ? `${b.lessonsCompleted}/${b.lessonsReady} done` : 'coming soon',
        lessons: b.lessons,
      }))
    : [{ id: 'all', lessons: overall.lessons }];
  const next: LessonView | undefined = view ? view.nextLesson : overall.lessons.find((l) => l.state === 'in-progress' || l.state === 'available');
  const levelName = level?.title.split(':')[0];
  const theme = level?.title.split(': ')[1];
  const hasProposed = LESSONS.some((l) => l.subjectId === subject.id && l.proposed);

  return (
    <div className="page max-w-5xl">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/home' }, { label: 'Subjects', to: '/subjects' }, { label: subject.name }]}
        eyebrow={subject.worldName}
        eyebrowColor={subject.color}
        title={subject.name}
        description={subject.description}
        aside={
          <div className="hidden h-28 w-36 md:block" aria-hidden="true">
            <SubjectArt id={subject.id} />
          </div>
        }
      >
        <section aria-label={`${subject.name} progress`} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl bg-surface p-3.5 shadow-soft sm:gap-x-5 sm:p-4">
          <span className="shrink-0">
            <ProgressRing value={overall.progress} size={56} tone={overall.state === 'completed' ? 'success' : 'primary'} label={`${subject.name}: ${Math.round(overall.progress * 100)}% of topics mastered`}>
            <span className="text-sm font-extrabold">{Math.round(overall.progress * 100)}%</span>
          </ProgressRing>
          </span>
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm sm:flex sm:flex-wrap sm:gap-x-6">
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Lessons</dt>
              <dd className="flex items-center gap-1 font-extrabold">
                <Check className="h-4 w-4 text-success" aria-hidden="true" /> {overall.lessonsCompleted} of {overall.lessonsReady} done
              </dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Topics</dt>
              <dd className="flex items-center gap-1 font-extrabold">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" /> {overall.topicsMastered} of {overall.topicsTotal} mastered
              </dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Stars</dt>
              <dd className="flex items-center gap-1 font-extrabold">
                <Star className="h-4 w-4 fill-reward text-reward" aria-hidden="true" /> {overall.stars} of {overall.maxStars}
              </dd>
            </div>
          </dl>
          {overall.lessonsTotal > overall.lessonsReady && (
            <p className="basis-full text-xs font-semibold text-ink-muted">
              {overall.lessonsReady} lessons ready to play, {overall.lessonsTotal - overall.lessonsReady} more planned (Classes 1–8).
            </p>
          )}
        </section>
      </PageHeader>

      {level && view && (
        <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <label htmlFor={selectId} className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
              Showing
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                id={selectId}
                value={level.id}
                onChange={(e) => navigate(subjectPath(subject.id, e.target.value))}
                className="min-h-[44px] rounded-2xl border-2 border-line bg-surface px-3 font-display text-lg font-semibold shadow-soft focus:border-primary focus:outline-none"
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title.split(':')[0]}
                    {l.id === mine?.id ? ' (my class)' : ''}
                  </option>
                ))}
              </select>
              {theme && <span className="text-sm font-bold text-ink-soft">{theme}</span>}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {levelName}: {view.lessonsCompleted} of {view.lessonsReady} lessons done
              {view.lessonsTotal > view.lessonsReady ? ` · ${view.lessonsTotal - view.lessonsReady} coming soon` : ''}
            </p>
            {view.lessonsReady > 0 && <ProgressBar value={view.progress} color={subject.color} size="sm" label={`${levelName} progress`} className="mt-1.5 max-w-xs" />}
          </div>
          {next && (
            <Link to={lessonPath(subject.id, next.lesson.id)} className="btn btn-primary">
              {next.state === 'in-progress' ? 'Continue' : 'Start'} {lessonLabel(next.lesson)} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <LessonPathSection
        subject={subject}
        groups={groups}
        label={levelName ? `${subject.name} ${levelName} lessons in order` : `${subject.name} lessons in order`}
        emptyText={`No ${subject.name} lessons for ${levelName ?? 'this class'} yet.`}
      />

      <p className="mt-8 flex items-start gap-2 text-sm text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {SAMPLE_CURRICULUM_NOTICE}
          {hasProposed && ' Lessons marked Proposed are new planned lessons that still need review by subject experts.'}
          {subject.id === 'mathematics' && ' Calculus and other higher-secondary topics are not included: this app is for Classes 1 to 8.'}
        </span>
      </p>
    </div>
  );
}
