import { Check, Mic, RotateCcw, Square, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { QuizAnswer, QuizQuestion } from '../../domain/types';
import { cn } from '../../lib/cn';
import { matchSpokenAnswer } from '../../voice/matchAnswer';
import { textLanguage } from '../../voice/speech';
import { useSpeechRecognition, type RecognitionProblem } from '../../voice/useSpeechRecognition';
import { describeAnswer } from '../../quiz/answerText';

const PROBLEMS: Record<RecognitionProblem, string> = {
  'not-allowed': 'The microphone is not allowed in this browser. A grown-up can allow it in the browser settings. You can tap your answer instead.',
  'no-speech': "I didn't hear anything. Try again, or tap your answer.",
  'no-microphone': 'No microphone was found. Tap your answer instead.',
  network: 'Voice answers need the internet in this browser. Tap your answer instead.',
  language: "This browser can't listen in this language. Tap your answer instead.",
  other: "Voice answers didn't work this time. Try again, or tap your answer.",
};

/**
 * Answer by speaking (only when a grown-up turned voice answers on in Settings
 * and the browser supports it). The learner presses the microphone, sees what
 * was heard and which answer it matches, and confirms it; tapping an answer
 * always works too. Nothing is submitted or saved from here.
 */
export function VoiceAnswer({ question, onChoose }: { question: QuizQuestion; onChoose: (answer: QuizAnswer) => void }) {
  const { supported, state, start, stop, cancel } = useSpeechRecognition();
  const language = textLanguage(question.type === 'single-choice' ? `${question.prompt} ${question.options.map((o) => o.text).join(' ')}` : question.prompt);
  const match = state.status === 'heard' ? matchSpokenAnswer(question, state.alternatives) : null;
  const focusRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state.status !== 'idle') focusRef.current?.focus();
  }, [state.status]);

  if (!supported) return null;

  if (state.status === 'idle') {
    return (
      <button type="button" className="btn btn-secondary min-h-[48px]" onClick={() => start(language)}>
        <Mic className="h-5 w-5 text-primary" aria-hidden="true" /> Say your answer
      </button>
    );
  }

  return (
    <div role="group" aria-label="Voice answer" className="rounded-3xl border-2 border-primary/25 bg-primary-soft/50 p-3.5">
      <div aria-live="polite">
        {state.status === 'listening' && (
          <p className="flex items-center gap-2 font-bold text-primary-strong">
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-white">
              <span className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring" aria-hidden="true" />
              <Mic className="h-5 w-5" aria-hidden="true" />
            </span>
            Listening… say your answer.
          </p>
        )}
        {state.status === 'listening' && state.interim && <p className="mt-1.5 text-ink-soft">I hear: “{state.interim}”</p>}
        {state.status === 'heard' && (
          <>
            <p className="font-bold">I heard: “{state.alternatives[0]}”</p>
            <p className={cn('mt-1', match ? 'font-bold text-primary-strong' : 'text-ink-soft')}>
              {match ? `That matches ${describeAnswer(question, match)}.` : "I'm not sure which answer that is. Try again, or tap your answer."}
            </p>
          </>
        )}
        {state.status === 'error' && <p className="font-bold text-ink-soft">{PROBLEMS[state.problem]}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.status === 'listening' && (
          <>
            <button ref={focusRef} type="button" className="btn btn-primary btn-sm min-h-[44px]" onClick={stop}>
              <Square className="h-4 w-4" aria-hidden="true" /> Done
            </button>
            <button type="button" className="btn btn-ghost btn-sm min-h-[44px]" onClick={cancel}>
              <X className="h-4 w-4" aria-hidden="true" /> Cancel
            </button>
          </>
        )}
        {state.status === 'heard' && match && (
          <button
            ref={focusRef}
            type="button"
            className="btn btn-primary btn-sm min-h-[44px]"
            onClick={() => {
              onChoose(match);
              cancel();
            }}
          >
            <Check className="h-4 w-4" aria-hidden="true" /> Choose it
          </button>
        )}
        {(state.status === 'heard' || state.status === 'error') && (
          <>
            <button ref={match ? undefined : focusRef} type="button" className="btn btn-secondary btn-sm min-h-[44px]" onClick={() => start(language)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Say it again
            </button>
            <button type="button" className="btn btn-ghost btn-sm min-h-[44px]" onClick={cancel}>
              <X className="h-4 w-4" aria-hidden="true" /> Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
