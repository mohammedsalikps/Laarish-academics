import { Sparkles } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { useProgress } from '../../state/ProgressProvider';
import { MentorAvatar } from '../mentor/MentorAvatar';
import { SpeakButton } from './SpeakButton';

export type PanelMood = 'speak' | 'cheer' | 'think' | 'explain';

const MOOD_MOTION: Record<PanelMood, string> = {
  speak: '',
  cheer: 'motion-safe:animate-cheer',
  think: 'motion-safe:animate-tilt',
  explain: '',
};

const INK = '#1D1A4A';

/**
 * One comic panel: the learner's chosen mentor (official Rishi or Ayra artwork)
 * with a speech bubble. On phones the bubble sits above the mentor, with its
 * tail pointing down; from small tablets up the mentor stands beside it.
 * Remount with a new `key` for each new line, so its one small reaction
 * animation plays once. With "Read aloud" on, the line is spoken once when it
 * appears; the speaker button replays or stops it.
 */
export function ComicPanel({
  speak,
  mood = 'speak',
  figure = 'full',
  children,
  className,
}: {
  /** The words to read aloud (usually the bubble text). */
  speak?: string;
  mood?: PanelMood;
  /** Full character for big moments, the face for compact lines. */
  figure?: 'full' | 'face';
  children: ReactNode;
  className?: string;
}) {
  const persona = useMentorPersona();
  const speech = useSpeech();
  const { state } = useProgress();
  const autoRead = state.settings.readAloud;
  const { speak: say, supported } = speech;
  // Each line is read once, when it appears (and only if Read aloud is on then). Turning
  // Read aloud on does not re-read lines already on screen; the speaker button does.
  const appeared = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (appeared.current === speak) return;
    appeared.current = speak;
    if (autoRead && supported && speak) say(speak);
  }, [speak, autoRead, supported, say]);

  return (
    <div className={cn('flex flex-col sm:flex-row-reverse sm:items-end sm:gap-3', className)}>
      <div className="relative min-w-0 flex-1 rounded-[24px] border-[3px] border-ink bg-surface px-4 py-3 shadow-[4px_4px_0_#1D1A4A] sm:mb-2 sm:rounded-[26px] sm:px-5 sm:py-4">
        {/* Tail: down towards the mentor on phones, sideways beside it on larger screens. */}
        <svg className="absolute -bottom-[17px] left-7 h-[19px] w-6 sm:hidden" viewBox="0 0 24 19" aria-hidden="true">
          <path d="M1.5 0 L4 17.5 L21 0" fill="#FFFFFF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="3.6" y="-4" width="15.5" height="4" fill="#FFFFFF" />
        </svg>
        <svg className="absolute -left-[16px] bottom-4 hidden h-6 w-[19px] sm:block" viewBox="0 0 19 24" aria-hidden="true">
          <path d="M19 1.5 L1.5 15 L19 21" fill="#FFFFFF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="17" y="3.6" width="4" height="15.5" fill="#FFFFFF" />
        </svg>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{children}</div>
          {speak && <SpeakButton text={speak} speech={speech} label={`Hear ${persona.name} say this`} className="-mr-1.5 -mt-1" />}
        </div>
      </div>
      <div className={cn('relative mt-3 shrink-0 self-start pl-2 sm:mt-0 sm:self-end sm:pl-0', MOOD_MOTION[mood])}>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 top-1/4 rounded-full"
          style={{ backgroundImage: `radial-gradient(${persona.colors.accent}33 1.4px, transparent 1.6px)`, backgroundSize: '9px 9px' }}
        />
        {figure === 'full' ? (
          <MentorAvatar variant="full" size={150} label={persona.name} className="relative h-[92px] w-auto sm:h-[150px]" />
        ) : (
          <MentorAvatar size={52} label={persona.name} className="relative !h-11 !w-11 sm:!h-[52px] sm:!w-[52px]" />
        )}
        {mood === 'cheer' && <Sparkles className="absolute -right-2 top-0 h-6 w-6 fill-reward text-reward-strong motion-safe:animate-star-pop" aria-hidden="true" />}
      </div>
    </div>
  );
}
