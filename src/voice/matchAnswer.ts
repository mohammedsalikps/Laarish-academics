import type { QuizAnswer, QuizQuestion } from '../domain/types';

/**
 * Turns what speech recognition heard into a quiz answer, or null when it is
 * not clear. Nothing is submitted from here: the learner sees the match and
 * confirms it, and the app then checks it against the answer key as usual.
 *
 * Understood: a letter ("B", "option B"), a position ("the second one", "two"),
 * the words of a choice ("iron nail"), and for true/false questions yes/true/
 * right or no/false/wrong (also in Hindi and Kannada).
 */

const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'it', 'its', 'of', 'to', 'i', 'think', 'my', 'answer', 'that', 'this', 'in', 'and', 'one', 'option', 'choice', 'please', 'um', 'uh']);
const ORDINALS: string[][] = [
  ['first', 'one', '1', 'won'],
  ['second', 'two', '2', 'to', 'too'],
  ['third', 'three', '3'],
  ['fourth', 'four', '4', 'for'],
  ['fifth', 'five', '5'],
  ['sixth', 'six', '6'],
];
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
/** How recognisers often write a spoken letter name. */
const LETTER_WORDS: Record<string, string> = { ay: 'a', eh: 'a', bee: 'b', be: 'b', see: 'c', sea: 'c', she: 'c', dee: 'd', di: 'd', ee: 'e', eff: 'f', ef: 'f' };

const TRUE_WORDS = ['true', 'yes', 'yeah', 'yep', 'right', 'correct', 'सही', 'सच', 'हाँ', 'हां', 'ಸರಿ', 'ಹೌದು'];
const FALSE_WORDS = ['false', 'no', 'nope', 'wrong', 'incorrect', 'not true', 'गलत', 'ग़लत', 'नहीं', 'झूठ', 'ತಪ್ಪು', 'ಇಲ್ಲ'];

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const contentWords = (text: string) => normalise(text).split(' ').filter((w) => w && !STOP_WORDS.has(w));

function letterIndex(said: string, count: number): number | null {
  const m = /^(?:(?:option|answer|letter|choice|it'?s|its|is)\s+)?([a-z]+)$/.exec(said);
  if (!m) return null;
  const letter = LETTER_WORDS[m[1]] ?? m[1];
  const i = LETTERS.indexOf(letter);
  return i >= 0 && i < count ? i : null;
}

function ordinalIndex(said: string, count: number): number | null {
  const words = said.replace(/^(?:the|number|option|answer)\s+/, '').replace(/\s+(?:one|option|answer)$/, '').split(' ');
  if (words.length !== 1) return null;
  const i = ORDINALS.findIndex((forms) => forms.includes(words[0]));
  return i >= 0 && i < count ? i : null;
}

/** The option whose words best match what was said, if exactly one does. */
function optionByWords(said: string, options: { text: string }[]): number | null {
  const whole = options.findIndex((o) => normalise(o.text) === said);
  if (whole >= 0) return whole;
  const saidWords = contentWords(said);
  if (!saidWords.length) return null;
  const scores = options.map((o) => {
    const words = new Set(contentWords(o.text));
    return saidWords.filter((w) => words.has(w)).length / saidWords.length;
  });
  const best = Math.max(...scores);
  if (best < 0.5) return null;
  const top = scores.filter((s) => s === best).length;
  return top === 1 ? scores.indexOf(best) : null;
}

function hasPhrase(said: string, phrases: string[]): boolean {
  return phrases.some((p) => new RegExp(`(^|\\s)${p}(\\s|$)`, 'u').test(said));
}

export function matchSpokenAnswer(question: QuizQuestion, heard: readonly string[]): QuizAnswer | null {
  for (const raw of heard) {
    const said = normalise(raw);
    if (!said) continue;
    if (question.type === 'true-false') {
      // "not true" says false, so check the false words first.
      if (hasPhrase(said, FALSE_WORDS)) return { type: 'true-false', value: false };
      if (hasPhrase(said, TRUE_WORDS)) return { type: 'true-false', value: true };
      continue;
    }
    if (question.type === 'single-choice') {
      const n = question.options.length;
      const i = letterIndex(said, n) ?? ordinalIndex(said, n) ?? optionByWords(said, question.options);
      if (i !== null) return { type: 'single-choice', optionId: question.options[i].id };
    }
  }
  return null;
}

/** Matching questions are answered by tapping only. */
export const canAnswerByVoice = (question: QuizQuestion): boolean => question.type !== 'match-pairs';
