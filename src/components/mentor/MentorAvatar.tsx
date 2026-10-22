import { MENTORS, type MentorId } from '../../../shared/mentor/personas';
import { cn } from '../../lib/cn';
import { useMentorPersona } from '../../mentor/useMentorPersona';

export type MentorMood = 'idle' | 'speaking' | 'thinking' | 'celebrating';

const MOOD_CLASS: Record<MentorMood, string> = {
  idle: '',
  speaking: '',
  thinking: 'motion-safe:animate-pulse',
  celebrating: 'motion-safe:animate-pop-in',
};

/**
 * The learner's chosen mentor (Rishi or Ayra), drawn from the official artwork.
 * `face` is a round head-and-shoulders picture for chat, buttons and bubbles;
 * `full` is the whole character for welcome and celebration moments.
 * Pass `mentorId` to show a specific mentor (for example while choosing).
 */
export function MentorAvatar({
  mentorId,
  size = 48,
  variant = 'face',
  mood = 'idle',
  label,
  className,
}: {
  mentorId?: MentorId;
  size?: number;
  variant?: 'face' | 'full';
  mood?: MentorMood;
  /** Accessible name; the picture is decorative when omitted. */
  label?: string;
  className?: string;
}) {
  const chosen = useMentorPersona();
  const persona = mentorId ? MENTORS[mentorId] : chosen;
  const alt = label ?? '';

  if (variant === 'full') {
    const width = Math.round((size * persona.art.width) / persona.art.height);
    return (
      <img
        src={`/mentors/${persona.id}.webp`}
        width={width}
        height={size}
        alt={alt}
        aria-hidden={label ? undefined : true}
        className={cn('block shrink-0 select-none object-contain', MOOD_CLASS[mood], className)}
        draggable={false}
      />
    );
  }
  return (
    <span
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-full', MOOD_CLASS[mood], className)}
      style={{ width: size, height: size, backgroundColor: persona.colors.soft }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img src={`/mentors/${persona.id}-face.webp`} width={size} height={size} alt="" className="h-full w-full select-none object-cover" draggable={false} />
    </span>
  );
}
