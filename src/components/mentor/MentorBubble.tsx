import { CheckCircle2, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
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
  tone = 'neutral',
}: {
  text: string;
  mood?: MentorMood;
  size?: number;
  children?: ReactNode;
  className?: string;
  /** Announce changes to screen readers. */
  live?: boolean;
  /** Feedback colour: green for right, calm orange for "not yet" (never red), gold when done. */
  tone?: 'neutral' | 'correct' | 'not-yet' | 'complete';
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
      <MentorAvatar size={size} mood={tone === 'complete' ? 'celebrating' : mood} label={persona.name} />
      <div
        key={text}
        className={cn(
          'flex min-w-0 flex-1 animate-pop-in items-start gap-2 rounded-3xl rounded-tl-md px-4 py-2.5 shadow-soft',
          tone === 'neutral' && 'bg-surface',
          tone === 'correct' && 'border-2 border-success/40 bg-success-soft',
          tone === 'not-yet' && 'border-2 border-[#E8833A]/50 bg-[#FFF4EA]',
          tone === 'complete' && 'border-2 border-reward/60 bg-reward-soft',
        )}
        aria-live={live ? 'polite' : undefined}
        data-tone={tone}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[1rem] font-semibold leading-snug text-ink">
            {tone === 'correct' && <CheckCircle2 className="mr-1.5 inline h-5 w-5 -translate-y-0.5 text-success-strong" aria-label="Right:" />}
            {tone === 'not-yet' && <RotateCcw className="mr-1.5 inline h-5 w-5 -translate-y-0.5 text-[#B8540F]" aria-label="Not yet:" />}
            {tone === 'complete' && <Trophy className="mr-1.5 inline h-5 w-5 -translate-y-0.5 text-reward-strong" aria-label="Done:" />}
            {text}
          </p>
          {children}
        </div>
        {supported && (
          <button
            type="button"
            onClick={() => (speech.speaking ? speech.stop() : speech.speak(text))}
            className={cn('-my-1.5 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-primary', autoRead && 'text-primary')}
            aria-label={speech.speaking ? 'Stop reading aloud' : `Hear ${persona.name} say this`}
          >
            {speech.speaking ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
