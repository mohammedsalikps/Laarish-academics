import { ArrowRight, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RoadmapPath, type RoadmapNodeData } from '../../components/navigation/RoadmapPath';
import { Dialog } from '../../components/ui/Dialog';
import { gradeLabel, isLessonForGrade, lessonLabel } from '../../content';
import type { Grade, IconKey, Subject } from '../../domain/types';
import type { LessonView } from '../../engine/progression';
import { lessonPath } from '../../lib/paths';

function lessonSubtitle(v: LessonView): string {
  switch (v.state) {
    case 'completed':
      return `All ${v.topicsTotal} topics mastered`;
    case 'in-progress':
      return `${v.topicsMastered} of ${v.topicsTotal} topics mastered`;
    case 'available':
      return `${v.topicsTotal} topics · Ready to start`;
    case 'locked':
      return `Locked · finish ${v.missing[0] ? v.missing[0].title : 'the lesson before'} first`;
    default:
      return 'Coming soon';
  }
}

/** A labelled stretch of the path, such as one branch of a class. */
export interface LessonGroup {
  id: string;
  title?: string;
  icon?: IconKey;
  detail?: string;
  lessons: LessonView[];
}

/**
 * Ordered, connected lesson roadmap (zigzag path), in labelled groups, with
 * info for locked and coming-soon lessons. Each lesson opens its topic roadmap.
 */
export function LessonPathSection({ subject, groups, label, grade, emptyText }: { subject: Subject; groups: LessonGroup[]; label: string; grade?: Grade; emptyText?: string }) {
  const navigate = useNavigate();
  const [info, setInfo] = useState<LessonView | null>(null);
  const lessons = groups.flatMap((g) => g.lessons);
  const next = lessons.find((l) => l.state === 'in-progress') ?? lessons.find((l) => l.state === 'available');
  const firstOf = new Map(groups.filter((g) => g.title && g.lessons.length).map((g) => [g.lessons[0].lesson.id, g]));

  const nodes: RoadmapNodeData[] = lessons.map((v) => ({
    id: v.lesson.id,
    number: v.lesson.order,
    title: v.lesson.title,
    subtitle: lessonSubtitle(v) + (grade && !isLessonForGrade(v.lesson, grade) ? ` · ${gradeLabel(v.lesson.grades)}` : '') + (v.lesson.proposed ? ' · Proposed' : ''),
    state: v.state,
    icon: v.lesson.icon,
    stars: v.topicsTotal ? Math.round(v.stars / v.topicsTotal) : 0,
    progress: v.progress,
    recommended: next?.lesson.id === v.lesson.id,
    recommendedLabel: v.state === 'in-progress' ? 'Continue' : 'Start here',
    ariaLabel: `${lessonLabel(v.lesson)}, ${lessonSubtitle(v)}${v.lesson.proposed ? ', proposed new lesson' : ''}`,
    onSelect: () => (v.state === 'locked' || v.state === 'in-development' ? setInfo(v) : navigate(lessonPath(subject.id, v.lesson.id))),
    section: firstOf.has(v.lesson.id) ? sectionOf(firstOf.get(v.lesson.id)!) : undefined,
  }));

  return (
    <>
      <section className="mx-auto max-w-3xl rounded-4xl px-2 py-6" style={{ background: `linear-gradient(180deg, ${subject.softColor}, transparent)` }} aria-label={label}>
        {nodes.length === 0 ? <p className="card p-6 text-center text-ink-soft">{emptyText ?? 'No lessons here yet.'}</p> : <RoadmapPath nodes={nodes} color={subject.color} label={label} />}
      </section>

      <Dialog open={Boolean(info)} onClose={() => setInfo(null)} title={info ? lessonLabel(info.lesson) : ''}>
        {info && (
          <div className="space-y-4 px-5 pb-6 pt-3 sm:px-6">
            <p className="text-ink-soft">{info.lesson.summary}</p>
            {info.state === 'in-development' ? (
              <p className="rounded-2xl bg-canvas-sunken px-4 py-3 text-sm font-bold text-ink-soft">
                {info.lesson.proposed
                  ? 'Proposed new lesson: part of the planned curriculum expansion. It is not written yet and still needs review by subject experts.'
                  : 'This lesson is planned but not written yet. Check back soon!'}
              </p>
            ) : (
              <>
                <p className="flex items-start gap-2 rounded-2xl bg-reward-soft px-4 py-3 text-sm font-bold">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-reward-strong" aria-hidden="true" />
                  {info.missing.length ? `Master every topic in ${info.missing.map((m) => m.title).join(' and ')} to unlock this lesson.` : 'Finish the lesson before this one to unlock it.'}
                </p>
                {info.missing[0] && (
                  <Link to={lessonPath(info.missing[0].subjectId, info.missing[0].id)} className="btn btn-primary w-full" onClick={() => setInfo(null)}>
                    Go to {info.missing[0].title} <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}

function sectionOf(g: LessonGroup): NonNullable<RoadmapNodeData['section']> {
  return { id: g.id, title: g.title ?? '', icon: g.icon, detail: g.detail };
}
