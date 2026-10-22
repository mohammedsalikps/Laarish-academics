import type { ContentLanguage, SubjectId, Topic } from '../types.js';
import { missingVideo, scene } from './helpers.js';

/**
 * Hindi and Kannada colour topics, built from one template so both languages
 * get the same structure. SAMPLE CONTENT: vocabulary should be reviewed by a
 * language teacher before production use.
 */

interface ColourWord {
  id: string;
  word: string;
  sound: string;
  english: string;
  swatch: string;
  /** Short everyday example, in English with the target word. */
  example: string;
  hint: string;
}

interface LanguagePack {
  subjectId: Extract<SubjectId, 'hindi' | 'kannada'>;
  language: ContentLanguage;
  languageName: string;
  lessonId: string;
  idPrefix: string;
  greeting: string;
  colourWord: string;
  colourSound: string;
  praise: string;
  bright: ColourWord[];
  more: ColourWord[];
}

const HINDI: LanguagePack = {
  subjectId: 'hindi',
  language: 'hi',
  languageName: 'Hindi',
  lessonId: 'hindi-colours',
  idPrefix: 'hindi',
  greeting: 'नमस्ते (namaste)',
  colourWord: 'रंग',
  colourSound: 'rang',
  praise: 'बहुत अच्छे! (bahut achhe) Very good!',
  bright: [
    { id: 'laal', word: 'लाल', sound: 'laal', english: 'Red', swatch: '#E5484D', example: 'A ripe tomato is लाल.', hint: 'A ripe tomato is this colour.' },
    { id: 'neela', word: 'नीला', sound: 'neela', english: 'Blue', swatch: '#2F86D6', example: 'The clear sky is नीला.', hint: 'The colour of the clear sky.' },
    { id: 'hara', word: 'हरा', sound: 'hara', english: 'Green', swatch: '#2E9D5B', example: 'A parrot is हरा.', hint: 'The colour of a parrot.' },
    { id: 'peela', word: 'पीला', sound: 'peela', english: 'Yellow', swatch: '#F2C21B', example: 'A ripe banana is पीला.', hint: 'The colour of a ripe banana.' },
  ],
  more: [
    { id: 'kaala', word: 'काला', sound: 'kaala', english: 'Black', swatch: '#26243B', example: 'The night sky is काला.', hint: 'The colour of the night sky.' },
    { id: 'safed', word: 'सफ़ेद', sound: 'safed', english: 'White', swatch: '#FFFFFF', example: 'Milk is सफ़ेद.', hint: 'The colour of milk.' },
  ],
};

const KANNADA: LanguagePack = {
  subjectId: 'kannada',
  language: 'kn',
  languageName: 'Kannada',
  lessonId: 'kannada-colours',
  idPrefix: 'kannada',
  greeting: 'ನಮಸ್ಕಾರ (namaskaara)',
  colourWord: 'ಬಣ್ಣ',
  colourSound: 'banna',
  praise: 'ಚೆನ್ನಾಗಿದೆ! (chennagide) Well done!',
  bright: [
    { id: 'kempu', word: 'ಕೆಂಪು', sound: 'kempu', english: 'Red', swatch: '#E5484D', example: 'A ripe tomato is ಕೆಂಪು.', hint: 'A ripe tomato is this colour.' },
    { id: 'neeli', word: 'ನೀಲಿ', sound: 'neeli', english: 'Blue', swatch: '#2F86D6', example: 'The clear sky is ನೀಲಿ.', hint: 'The colour of the clear sky.' },
    { id: 'hasiru', word: 'ಹಸಿರು', sound: 'hasiru', english: 'Green', swatch: '#2E9D5B', example: 'Fresh leaves are ಹಸಿರು.', hint: 'The colour of fresh leaves.' },
    { id: 'haladi', word: 'ಹಳದಿ', sound: 'haladi', english: 'Yellow', swatch: '#F2C21B', example: 'A ripe banana is ಹಳದಿ.', hint: 'The colour of a ripe banana.' },
  ],
  more: [
    { id: 'kappu', word: 'ಕಪ್ಪು', sound: 'kappu', english: 'Black', swatch: '#26243B', example: 'The night sky is ಕಪ್ಪು.', hint: 'The colour of the night sky.' },
    { id: 'bili', word: 'ಬಿಳಿ', sound: 'bili', english: 'White', swatch: '#FFFFFF', example: 'Milk is ಬಿಳಿ.', hint: 'The colour of milk.' },
  ],
};

const label = (c: ColourWord) => `${c.word} (${c.sound})`;

function colourTopics(p: LanguagePack): Topic[] {
  const all = [...p.bright, ...p.more];
  const facts = [`${p.colourWord} (${p.colourSound}) means colour in ${p.languageName}.`, all.map((c) => `${label(c)} = ${c.english.toLowerCase()}`).join(', ') + '.'];
  const faq = [
    {
      keywords: ['colour', 'color', p.colourSound],
      answer: `${p.colourWord} (${p.colourSound}) means colour. ${p.bright.map((c) => `${c.english} is ${label(c)}`).join(', ')}.`,
    },
    ...all.map((c) => ({ keywords: [c.english.toLowerCase(), c.sound, c.word], answer: `${label(c)} means ${c.english.toLowerCase()}. ${c.example}` })),
  ];
  const mentorBase = {
    facts,
    simpler: `Each colour has a ${p.languageName} word. For example, ${label(p.bright[0])} is red, like a tomato, and ${label(p.bright[1])} is blue, like the sky.`,
    examples: [`${p.bright[2].example} ${p.bright[3].example}`, `${p.more[0].example} ${p.more[1].example}`],
    why: `Linking each word to something you can picture, like a red tomato for ${label(p.bright[0])}, helps you remember it.`,
    hints: {
      watch: 'Say each word out loud after your mentor. Saying it helps you remember!',
      play: `Say the ${p.languageName} word out loud, then think of the picture hint: tomato, sky, leaves, banana, night or milk.`,
      practice: `Think of something that is that colour and remember its ${p.languageName} word.`,
      default: `Link each ${p.languageName} colour word to something you can picture.`,
    },
    faq,
  };

  const matchPairs = (words: ColourWord[]) =>
    words.map((c) => ({ id: c.id, left: label(c), leftIcon: 'palette' as const, right: c.english, hint: c.hint }));
  const coach = {
    start: `Tap a ${p.languageName} word, then tap its English meaning.`,
    'match-correct': p.praise,
    'match-incorrect': 'Not quite. Say the word out loud and think of the hint.',
    complete: `All matched! Your ${p.languageName} colours are shining.`,
    'complete:perfect': 'Perfect matching with no mistakes!',
  };

  return [
    {
      id: `${p.idPrefix}-colours-bright`,
      subjectId: p.subjectId,
      lessonId: p.lessonId,
      order: 1,
      title: `Four bright colours`,
      summary: `Learn ${p.bright.map((c) => c.word).join(', ')}.`,
      objectives: [`Read and say four colour words in ${p.languageName}.`, 'Match each word to its English meaning.'],
      language: p.language,
      icon: 'palette',
      estimatedMinutes: 5,
      watch: {
        video: missingVideo(`video-${p.idPrefix}-colours-bright`, `Four bright colours in ${p.languageName}`),
        intro: `${p.greeting}, explorer! ${p.colourWord} (${p.colourSound}) means colour. Let's learn four bright colours in ${p.languageName}!`,
        explainer: p.bright.map((c) =>
          scene(`${label(c)} means ${c.english.toLowerCase()}. ${c.example}`, { kind: 'colour-swatches', items: [{ word: c.word, color: c.swatch }] }),
        ),
        keyIdeas: p.bright.map((c) => `${label(c)} = ${c.english.toLowerCase()}`),
      },
      play: {
        title: 'Colour Match',
        assessed: true,
        weight: 1,
        game: { type: 'concept-match', prompt: `Match each ${p.languageName} colour word to its English meaning.`, leftLabel: p.languageName, rightLabel: 'English', pairs: matchPairs(p.bright) },
        coach,
      },
      practice: {
        weight: 3,
        questions: [
          {
            id: 'q-blue',
            type: 'single-choice',
            prompt: `What does ${label(p.bright[1])} mean?`,
            options: [
              { id: 'red', text: 'Red' },
              { id: 'blue', text: 'Blue' },
              { id: 'green', text: 'Green' },
              { id: 'yellow', text: 'Yellow' },
            ],
            correctOptionId: 'blue',
            hint: 'Think of the clear sky.',
            explanation: `${label(p.bright[1])} means blue, like the sky.`,
          },
          {
            id: 'q-green',
            type: 'single-choice',
            prompt: `Which ${p.languageName} word means green?`,
            options: p.bright.map((c) => ({ id: c.id, text: label(c) })),
            correctOptionId: p.bright[2].id,
            hint: p.bright[2].hint,
            explanation: `${label(p.bright[2])} means green.`,
          },
          {
            id: 'q-banana',
            type: 'single-choice',
            prompt: 'A ripe banana is usually...',
            options: [p.bright[3], p.bright[1], p.bright[0]].map((c) => ({ id: c.id, text: label(c) })),
            correctOptionId: p.bright[3].id,
            hint: 'What colour is a ripe banana in English?',
            explanation: `A ripe banana is yellow, which is ${label(p.bright[3])}.`,
          },
        ],
      },
      mentor: {
        ...mentorBase,
        practice: [{ question: `How do you say "yellow" in ${p.languageName}?`, accept: [p.bright[3].sound, p.bright[3].word], explanation: `Yellow is ${label(p.bright[3])}, like a ripe banana.` }],
      },
    },
    {
      id: `${p.idPrefix}-colours-more`,
      subjectId: p.subjectId,
      lessonId: p.lessonId,
      order: 2,
      title: 'Black, white and review',
      summary: `Learn ${p.more.map((c) => c.word).join(' and ')}, then match all six colours.`,
      objectives: [`Read and say six colour words in ${p.languageName}.`, 'Match all six words to their meanings.'],
      language: p.language,
      icon: 'palette',
      estimatedMinutes: 5,
      watch: {
        video: missingVideo(`video-${p.idPrefix}-colours-more`, `Black, white and review in ${p.languageName}`),
        intro: "Let's learn two more colours, and then match all six!",
        explainer: [
          ...p.more.map((c) => scene(`${label(c)} means ${c.english.toLowerCase()}. ${c.example}`, { kind: 'colour-swatches', items: [{ word: c.word, color: c.swatch }] })),
          scene(`Now you know six colours: ${all.map((c) => c.word).join(', ')}.`, { kind: 'colour-swatches', items: all.map((c) => ({ word: c.word, color: c.swatch })) }),
        ],
        keyIdeas: p.more.map((c) => `${label(c)} = ${c.english.toLowerCase()}`).concat([`You now know six colours in ${p.languageName}.`]),
      },
      play: {
        title: 'Six Colour Match',
        assessed: true,
        weight: 1,
        game: { type: 'concept-match', prompt: `Match all six ${p.languageName} colour words to their English meanings.`, leftLabel: p.languageName, rightLabel: 'English', pairs: matchPairs(all) },
        coach,
      },
      practice: {
        weight: 3,
        questions: [
          {
            id: 'q-white-tf',
            type: 'true-false',
            prompt: `${label(p.more[1])} means black.`,
            correct: false,
            hint: 'Think of the colour of milk.',
            explanation: `False! ${label(p.more[1])} means white. ${label(p.more[0])} means black.`,
          },
          {
            id: 'q-milk',
            type: 'single-choice',
            prompt: 'Milk is...',
            options: [p.more[0], p.more[1], p.bright[0]].map((c) => ({ id: c.id, text: label(c) })),
            correctOptionId: p.more[1].id,
            hint: 'What colour is milk in English?',
            explanation: `Milk is white, which is ${label(p.more[1])}.`,
          },
          {
            id: 'q-match-six',
            type: 'match-pairs',
            prompt: 'Match each word to its colour.',
            pairs: [p.bright[0], p.more[0], p.bright[2]].map((c) => ({ id: c.id, left: label(c), right: c.english })),
            hint: 'Tomato, night sky, leaves...',
            explanation: `${label(p.bright[0])} is red, ${label(p.more[0])} is black and ${label(p.bright[2])} is green.`,
          },
        ],
      },
      mentor: {
        ...mentorBase,
        practice: [{ question: `How do you say "black" in ${p.languageName}?`, accept: [p.more[0].sound, p.more[0].word], explanation: `Black is ${label(p.more[0])}, like the night sky.` }],
      },
    },
  ];
}

export const LANGUAGE_TOPICS: Topic[] = [...colourTopics(HINDI), ...colourTopics(KANNADA)];
