/**
 * Choosing a device voice for a line of text. The language comes from the
 * script the text is written in (Kannada, Devanagari for Hindi, otherwise
 * English), because a voice for one script cannot read another: an English
 * voice skips Kannada letters. When the device has no voice for a script,
 * the line is not spoken and the app says so; the words stay on screen.
 */

export type SpeechLanguage = 'en' | 'hi' | 'kn';

export const SPEECH_LANGUAGE_NAMES: Record<SpeechLanguage, string> = { en: 'English', hi: 'Hindi', kn: 'Kannada' };

/** BCP 47 tags, preferring Indian English. */
export const SPEECH_TAGS: Record<SpeechLanguage, string> = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };

const KANNADA = /[ಀ-೿]/;
const DEVANAGARI = /[ऀ-ॿ]/;

/** The language a line must be read in, from its script. */
export function textLanguage(text: string): SpeechLanguage {
  if (KANNADA.test(text)) return 'kn';
  if (DEVANAGARI.test(text)) return 'hi';
  return 'en';
}

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

const normalTag = (lang: string) => lang.replace('_', '-').toLowerCase();

/**
 * The best voice for a language: the Indian variant first, then natural-sounding
 * voices (often named "Natural", "Neural", "Online" or "Google"), then the default.
 */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], language: SpeechLanguage): V | null {
  const tag = SPEECH_TAGS[language].toLowerCase();
  const candidates = voices.filter((v) => normalTag(v.lang).split('-')[0] === language);
  if (!candidates.length) return null;
  const score = (v: V) => (normalTag(v.lang) === tag ? 4 : 0) + (/natural|neural|online|google/i.test(v.name) ? 2 : 0) + (v.default ? 1 : 0);
  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** Text to speak for a question: the prompt, then each choice with its letter. */
export function questionSpeech(prompt: string, choices: string[] = []): string {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  return [prompt, ...choices.map((c, i) => `${letters[i]}: ${c}.`)].join(' ');
}
