import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { useProgress } from '../../state/ProgressProvider';
import { MentorAvatar, type MentorMood } from './MentorAvatar';

/**
 * The chosen mentor (Rishi or Ayra) with a short speech line. Used for lesson
 * introductions and for coaching lines that react to what the learner does.
 */
export function MentorBubble({
  text,
  mood = 'speaking',
  size = 44,
  children,
  className,
  live = true,
}: {
  text: string;
  mood?: MentorMood;
  size?: number;
  children?: ReactNode;
  className?: string;
  /** Announce changes to screen readers. */
  live?: boolean;
}) {
  const speech = useSpeech();
  const persona = useMentorPersona();
  const { state: progress } = useProgress();
  const autoRead = progress.settings.readAloud;
  const { speak, supported } = speech;
  // "Read aloud" setting: speak each new line automatically (helpful for early readers).
  useEffect(() => {
    if (autoRead && supported) speak(text);
  }, [text, autoRead, supported, speak]);
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <MentorAvatar size={size} mood={mood} label={persona.name} />
      <div
        key={text}
        className="flex min-w-0 flex-1 animate-pop-in items-start gap-2 rounded-3xl rounded-tl-md bg-surface px-4 py-2.5 shadow-soft"
        aria-live={live ? 'polite' : undefined}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[1rem] font-semibold leading-snug text-ink">{text}</p>
          {children}
        </div>
        {supported && (
          <button
            type="button"
            onClick={() => (speech.speaking ? speech.stop() : speech.speak(text))}
            className={cn('-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-primary', autoRead && 'text-primary')}
            aria-label={speech.speaking ? 'Stop reading aloud' : `Hear ${persona.name} say this`}
          >
            {speech.speaking ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
