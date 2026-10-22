import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { MentorAvatar } from '../../components/mentor/MentorAvatar';
import type { MentorQuizContext } from '../../../shared/mentor/types';
import type { Lesson, Subject, Topic } from '../../domain/types';
import { useMentor } from '../../mentor/MentorProvider';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import type { TopicProgress } from '../../state/progressTypes';

export interface MentorExtras {
  recentResult?: string;
  lastMistake?: string;
  /** What the learner is trying to do in the game right now. */
  activity?: string;
  /** The Practice question on screen (ids only). */
  quiz?: MentorQuizContext;
}

export interface StepViewProps {
  subject: Subject;
  lesson: Lesson;
  topic: Topic;
  record?: TopicProgress;
  /** This step was completed at least once. */
  completed: boolean;
  /** The topic was already completed before this session: rewards were collected, this is practice. */
  practice: boolean;
  onBack?: () => void;
  onNext: () => void;
  setMentorExtras: (extras: MentorExtras) => void;
}

/** Small heading for a step. The step indicator above already says which step this is. */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold leading-tight md:text-2xl">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}

/** Round button with the chosen mentor's face that opens the chat. */
export function MentorButton({ className }: { className?: string }) {
  const mentor = useMentor();
  const persona = useMentorPersona();
  return (
    <button
      type="button"
      onClick={() => mentor.open()}
      className={`grid shrink-0 place-items-center rounded-full border-2 border-surface shadow-lift transition hover:-translate-y-0.5 ${className ?? ''}`}
      aria-label={`Ask ${persona.name} for help`}
      title={`Ask ${persona.name}`}
    >
      <MentorAvatar size={48} />
    </button>
  );
}

/**
 * Back / primary action / mentor button for a topic step. Sticky at the
 * bottom of the screen, so the main action and the mentor are always
 * reachable and sit below the content rather than over it.
 */
export function StepFooter({
  onBack,
  onContinue,
  canContinue,
  continueLabel = 'Continue',
  hint,
  extra,
}: {
  onBack?: () => void;
  onContinue: () => void;
  canContinue: boolean;
  continueLabel?: string;
  hint?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-[var(--space-gutter)] mt-6 border-t border-line bg-canvas/95 px-[var(--space-gutter)] pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
      {hint && !canContinue && <p className="mb-1.5 text-center text-xs font-bold text-ink-muted md:text-right md:text-sm">{hint}</p>}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {onBack && (
          <button type="button" className="btn btn-secondary !px-3.5" onClick={onBack} aria-label="Previous step">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        {extra}
        {/* Slightly tighter on phones so "Continue to Practice" fits beside Back and the mentor at 360px. */}
        <button
          type="button"
          className="btn btn-primary btn-lg min-w-0 flex-1 !px-3 !text-base sm:!px-7 sm:!text-lg md:ml-auto md:min-w-[220px] md:flex-none"
          onClick={onContinue}
          disabled={!canContinue}
        >
          <span className="truncate">{continueLabel}</span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
        <MentorButton />
      </div>
    </div>
  );
}
