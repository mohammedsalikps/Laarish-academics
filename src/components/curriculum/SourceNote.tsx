import { BookCheck, BookDashed, BookOpen } from 'lucide-react';
import type { Lesson } from '../../domain/types';

/** One honest line on where a lesson comes from and whether it has been reviewed. */
export function SourceNote({ lesson }: { lesson: Lesson }) {
  const s = lesson.source;
  if (!s) return null;
  const review = lesson.review?.nativeSpeaker === 'pending' ? 'awaiting teacher and native-speaker review' : 'awaiting teacher review';
  const Icon = s.status === 'aligned' ? BookCheck : s.status === 'curriculum-inspired' ? BookOpen : BookDashed;
  const text =
    s.status === 'aligned'
      ? `Mapped to ${s.framework} ${s.document}${s.unit ? `, “${s.unit}”` : ''} (${s.academicYear}) by chapter title`
      : s.status === 'curriculum-inspired'
        ? `Inspired by ${s.framework} ${s.document} (${s.academicYear})${s.unit ? `; closest chapter “${s.unit}”, not confirmed` : '; no single chapter matched'}`
        : 'Proposed Laarish lesson, not yet checked against an official syllabus';
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-ink-muted">
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {text} · {review}
      </span>
    </p>
  );
}
