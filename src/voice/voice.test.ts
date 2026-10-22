import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from '../domain/types';
import { canAnswerByVoice, matchSpokenAnswer } from './matchAnswer';
import { pickVoice, questionSpeech, textLanguage } from './speech';

const choice: QuizQuestion = {
  id: 'q',
  type: 'single-choice',
  prompt: 'Which of these will a magnet attract?',
  options: [
    { id: 'spoon', text: 'A plastic spoon' },
    { id: 'nail', text: 'An iron nail' },
    { id: 'block', text: 'A wooden block' },
    { id: 'marble', text: 'A glass marble' },
  ],
  correctOptionId: 'nail',
  hint: 'h',
  explanation: 'e',
};
const trueFalse: QuizQuestion = { id: 'tf', type: 'true-false', prompt: 'All metals stick to magnets.', correct: false, hint: 'h', explanation: 'e' };
const hindi: QuizQuestion = {
  id: 'hi',
  type: 'single-choice',
  prompt: 'लाल रंग कौन सा है?',
  options: [
    { id: 'red', text: 'लाल' },
    { id: 'blue', text: 'नीला' },
  ],
  correctOptionId: 'red',
  hint: 'h',
  explanation: 'e',
};

describe('matching a spoken answer', () => {
  it.each([
    ['an iron nail', 'nail'],
    ['Iron nail.', 'nail'],
    ['iron', 'nail'],
    ['B', 'nail'],
    ['option b', 'nail'],
    ['bee', 'nail'],
    ['the second one', 'nail'],
    ['four', 'marble'],
    ['I think the glass marble', 'marble'],
  ])('"%s" picks %s', (said, id) => {
    expect(matchSpokenAnswer(choice, [said])).toEqual({ type: 'single-choice', optionId: id });
  });

  it('returns nothing when it is unclear, so the learner taps instead', () => {
    expect(matchSpokenAnswer(choice, ['banana'])).toBeNull();
    expect(matchSpokenAnswer(choice, ['a'])).toEqual({ type: 'single-choice', optionId: 'spoon' });
    expect(matchSpokenAnswer(choice, [''])).toBeNull();
    // Two choices fit equally well: not a match.
    expect(matchSpokenAnswer({ ...choice, options: [{ id: 'x', text: 'Plastic spoon' }, { id: 'y', text: 'Plastic ruler' }] }, ['plastic'])).toBeNull();
  });

  it('tries the other things the browser thought it heard', () => {
    expect(matchSpokenAnswer(choice, ['banana', 'wooden block'])).toEqual({ type: 'single-choice', optionId: 'block' });
  });

  it('understands true and false, including "not true" and Hindi and Kannada words', () => {
    expect(matchSpokenAnswer(trueFalse, ['true'])).toEqual({ type: 'true-false', value: true });
    expect(matchSpokenAnswer(trueFalse, ['yes it is'])).toEqual({ type: 'true-false', value: true });
    expect(matchSpokenAnswer(trueFalse, ['not true'])).toEqual({ type: 'true-false', value: false });
    expect(matchSpokenAnswer(trueFalse, ['false'])).toEqual({ type: 'true-false', value: false });
    expect(matchSpokenAnswer(trueFalse, ['सही'])).toEqual({ type: 'true-false', value: true });
    expect(matchSpokenAnswer(trueFalse, ['ತಪ್ಪು'])).toEqual({ type: 'true-false', value: false });
    expect(matchSpokenAnswer(trueFalse, ['maybe'])).toBeNull();
  });

  it('matches answers in Hindi script', () => {
    expect(matchSpokenAnswer(hindi, ['नीला'])).toEqual({ type: 'single-choice', optionId: 'blue' });
  });

  it('leaves matching questions to tapping', () => {
    expect(canAnswerByVoice({ id: 'm', type: 'match-pairs', prompt: 'p', pairs: [], hint: 'h', explanation: 'e' })).toBe(false);
    expect(canAnswerByVoice(choice)).toBe(true);
  });
});

describe('choosing a voice', () => {
  const voices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US', default: true },
    { name: 'Microsoft Heera - English (India)', lang: 'en-IN' },
    { name: 'Google हिन्दी', lang: 'hi-IN' },
    { name: 'Microsoft Kalpana - Hindi (India)', lang: 'hi_IN' },
  ];

  it('reads each line in the language of its script', () => {
    expect(textLanguage('Which magnet?')).toBe('en');
    expect(textLanguage('लाल (laal) means red.')).toBe('hi');
    expect(textLanguage('ಕೆಂಪು (kempu) means red.')).toBe('kn');
  });

  it('prefers the Indian voice and natural-sounding voices, and reports a missing language', () => {
    expect(pickVoice(voices, 'en')?.name).toBe('Microsoft Heera - English (India)');
    expect(pickVoice(voices, 'hi')?.name).toBe('Google हिन्दी');
    expect(pickVoice(voices, 'kn')).toBeNull();
    expect(pickVoice([], 'en')).toBeNull();
  });

  it('reads a question with its lettered choices', () => {
    expect(questionSpeech('Pick one.', ['Iron', 'Wood'])).toBe('Pick one. A: Iron. B: Wood.');
  });
});
