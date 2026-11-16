import { BookCheck, BookDashed, BookOpen } from 'lucide-react';
import type { Lesson, TopicMeta } from '../../domain/types';

/** Whether a person has reviewed the lesson yet. Never claims a review that has not happened. */
export function reviewText(review: Lesson['review']): string {
  const teacher = review?.teacher === 'done';
  const native = review?.nativeSpeaker;
  if (teacher && native === 'pending') return 'reviewed by a teacher; awaiting native-speaker review';
  if (teacher) return 'reviewed by a teacher';
  return native === 'pending' ? 'awaiting teacher and native-speaker review' : 'awaiting teacher review';
}

/**
 * One honest line on where a lesson (or one of its topics) comes from: a Laarish original, how it
 * maps to the official book (by chapter title, or by section and pages once checked against the
 * chapter text), and whether a teacher has reviewed it.
 */
export function SourceNote({ lesson, topic, className = 'mt-3' }: { lesson: Lesson; topic?: Pick<TopicMeta, 'bookRef'>; className?: string }) {
  const s = lesson.source;
  if (!s) return null;
  const Icon = s.status === 'aligned' ? BookCheck : s.status === 'curriculum-inspired' ? BookOpen : BookDashed;
  const ref = topic?.bookRef;
  const text =
    s.status === 'aligned'
      ? `Laarish original lesson, mapped to ${s.framework} ${s.document}${s.unit ? `, “${s.unit}”` : ''} (${s.academicYear})${
          ref ? `, section ${ref.section}, pages ${ref.pages} (checked ${ref.checked})` : ' by chapter title'
        }`
      : s.status === 'curriculum-inspired'
        ? `Laarish original lesson, inspired by ${s.framework} ${s.document} (${s.academicYear})${s.unit ? `; closest chapter “${s.unit}”, not confirmed` : '; no single chapter matched'}`
        : 'Proposed Laarish lesson, not yet checked against an official syllabus';
  return (
    <p className={`${className} flex items-start gap-1.5 text-xs font-semibold text-ink-muted`}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {text} · {reviewText(lesson.review)}
      </span>
    </p>
  );
}
