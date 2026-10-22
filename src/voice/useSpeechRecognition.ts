import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_TAGS, type SpeechLanguage } from './speech';

/**
 * Voice answers with the browser's own speech recognition (Web Speech API).
 * The microphone is only used after the learner presses the microphone button,
 * and the browser asks for permission then. Laarish never records or keeps
 * audio: it only receives the recognised words, keeps them on screen for the
 * learner to confirm, and forgets them. Which service turns speech into text
 * depends on the browser (Chrome and Edge send the audio to their own speech
 * servers), so voice answers are off until a grown-up turns them on in Settings.
 */

/** The parts of the Web Speech API used here (not all browsers ship its types). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

export function recognitionConstructor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isRecognitionSupported = (): boolean => recognitionConstructor() !== null;

export type RecognitionProblem = 'not-allowed' | 'no-speech' | 'no-microphone' | 'network' | 'language' | 'other';

export type RecognitionState =
  | { status: 'idle' }
  | { status: 'listening'; interim: string }
  | { status: 'heard'; alternatives: string[] }
  | { status: 'error'; problem: RecognitionProblem };

function problemFor(error: string): RecognitionProblem {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'no-microphone';
    case 'network':
      return 'network';
    case 'language-not-supported':
      return 'language';
    default:
      return 'other';
  }
}

/** Stops listening after this long, in case the browser never ends the session itself. */
const MAX_LISTEN_MS = 10_000;

export function useSpeechRecognition() {
  const [state, setState] = useState<RecognitionState>({ status: 'idle' });
  const rec = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported = isRecognitionSupported();

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const detach = useCallback(() => {
    clearTimer();
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
    }
    return r;
  }, []);

  const start = useCallback(
    (language: SpeechLanguage) => {
      const Ctor = recognitionConstructor();
      if (!Ctor) return;
      detach()?.abort();
      const r = new Ctor();
      r.lang = SPEECH_TAGS[language];
      r.interimResults = true;
      r.maxAlternatives = 3;
      r.continuous = false;
      let heard: string[] | null = null;
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const result = e.results[i];
          if (result.isFinal) heard = Array.from({ length: result.length }, (_, j) => result[j].transcript.trim()).filter(Boolean);
          else interim += result[0]?.transcript ?? '';
        }
        if (!heard) setState({ status: 'listening', interim: interim.trim() });
      };
      r.onerror = (e) => {
        if (e.error === 'aborted') return;
        detach();
        setState({ status: 'error', problem: problemFor(e.error) });
      };
      r.onend = () => {
        detach();
        setState(heard?.length ? { status: 'heard', alternatives: heard } : { status: 'error', problem: 'no-speech' });
      };
      rec.current = r;
      setState({ status: 'listening', interim: '' });
      try {
        r.start();
        timer.current = setTimeout(() => rec.current?.stop(), MAX_LISTEN_MS);
      } catch {
        detach();
        setState({ status: 'error', problem: 'other' });
      }
    },
    [detach],
  );

  /** Stop listening and use what was heard so far. */
  const stop = useCallback(() => rec.current?.stop(), []);

  /** Stop listening and forget everything. */
  const cancel = useCallback(() => {
    detach()?.abort();
    setState({ status: 'idle' });
  }, [detach]);

  useEffect(() => () => detach()?.abort(), [detach]);

  return { supported, state, start, stop, cancel };
}
