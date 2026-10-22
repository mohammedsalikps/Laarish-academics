import { Volume2, VolumeX } from 'lucide-react';
import type { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { SPEECH_LANGUAGE_NAMES, textLanguage } from '../../voice/speech';

/**
 * Plays (or stops) one line with the device voice, using the speech state of the
 * panel it belongs to. When the device has no voice for the line's language the
 * button says so instead of reading it wrongly.
 */
export function SpeakButton({ text, label, speech, className }: { text: string; label: string; speech: ReturnType<typeof useSpeech>; className?: string }) {
  if (!speech.supported) return null;
  if (!speech.canSpeak(text)) {
    const language = SPEECH_LANGUAGE_NAMES[textLanguage(text)];
    return (
      <span
        className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-muted/60', className)}
        role="img"
        aria-label={`No ${language} voice on this device, so read the words on screen`}
        title={`No ${language} voice on this device`}
      >
        <VolumeX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => (speech.speaking ? speech.stop() : speech.speak(text))}
      aria-label={speech.speaking ? 'Stop reading aloud' : label}
      className={cn(
        'grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink/10 bg-surface text-primary hover:border-primary/40 hover:bg-primary-soft',
        speech.speaking && 'border-primary bg-primary-soft',
        className,
      )}
    >
      {speech.speaking ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
