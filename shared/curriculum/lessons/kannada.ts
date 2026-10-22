import type { Grade, Lesson } from '../types.js';
import { classBranch, planned, source } from './helpers.js';

/**
 * Kannada, Classes 1-8.
 *
 * Kannada is not an NCERT subject for most of these classes. The reference is
 * Karnataka's state curriculum: DSERT designs it and the Karnataka Textbook
 * Society (KTBS) publishes the 2026-27 books listed in docs/curriculum-sources.md
 * §6.1 (Savi Kannada / Kali Kannada for Classes 1-4, Siri Kannada / Tili Kannada
 * for Classes 5-8). Only book and lesson titles were verified (read from page
 * images), and KTBS teaches grammar inside reading lessons, so every lesson here
 * is 'curriculum-inspired': it follows the usual progression of Kannada as a
 * first or second language, not a checked unit.
 */

const FRAMEWORK = 'Karnataka DSERT (KTBS textbooks)';
const YEAR = '2026-27';
const CHECKED =
  'KTBS 2026-27 book and lesson titles were read from official page images on textbooks.karnataka.gov.in (docs/curriculum-sources.md §6.1, 21 Oct 2026); the units’ learning objectives were not checked.';
const REVIEW = { teacher: 'pending', nativeSpeaker: 'pending' } as const;

function ktbsBooks(grade: Grade): string {
  if (grade === 1) return 'Savi Kannada Parts 1–2 (first language) and Kali Kannada-1 (second language), Class 1';
  if (grade <= 4) return `Savi Kannada Parts 1–2 (first language) and Kali Kannada-${grade} Parts 1–2 (second language), Class ${grade}`;
  return `Siri Kannada Parts 1–2 (first language) and Tili Kannada Parts 1–2 (second language), Class ${grade}`;
}

/** A Kannada lesson that follows the KTBS stage and themes; `note` says how it relates to the listed units. */
function ktbs(grade: Grade, note: string) {
  return source({ framework: FRAMEWORK, document: ktbsBooks(grade), grade, academicYear: YEAR, status: 'curriculum-inspired', verification: `${note} ${CHECKED}` });
}

export const KANNADA_LESSONS: Lesson[] = [
  /* ---------------------------------------------------------------- Class 1 */
  ...classBranch('kannada', 1, 'letters', [
    {
      id: 'kn1-vowels',
      title: 'ಸ್ವರಗಳು: Vowels',
      summary: 'Meet the 13 Kannada vowels and words that begin with them.',
      intro: 'ಸ್ವರ (svara) means vowel. Say each vowel, find a word that starts with it, and listen for short and long sounds.',
      objectives: [
        'Recognise and say the 13 Kannada vowels, from ಅ to ಔ.',
        'Match each vowel to a word that begins with it.',
        'Tell a short vowel sound (ಹ್ರಸ್ವ) from a long one (ದೀರ್ಘ).',
      ],
      icon: 'languages',
      status: 'ready',
      topicIds: ['kn1-vowels-first', 'kn1-vowels-more', 'kn1-vowels-review'],
      source: ktbs(1, 'Closest verified unit title: Savi Kannada Part 1 “ಪದ ಓದು – ಅಕ್ಷರ ಕಲಿ” (read words, learn letters), first language.'),
      review: REVIEW,
    },
  ]),
  ...classBranch('kannada', 1, 'words', [
    {
      id: 'kannada-colours',
      title: 'ಬಣ್ಣಗಳು: Colours',
      summary: 'Learn six colour words in Kannada.',
      intro: 'ಬಣ್ಣ (banna) means colour. Learn to read, say and match six Kannada colour words.',
      objectives: ['Read and say six Kannada colour words.', 'Match each colour word to its English meaning and to everyday things of that colour.'],
      icon: 'palette',
      status: 'ready',
      topicIds: ['kannada-colours-bright', 'kannada-colours-more'],
      source: ktbs(1, 'Colour words are typical first vocabulary for Class 1; no KTBS Class 1 unit title is about colours, so the mapping is by stage only.'),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 2 */
  ...classBranch('kannada', 2, 'letters', [
    {
      id: 'kn2-consonants',
      title: 'ವ್ಯಂಜನಗಳು: Consonants',
      summary: 'Meet the 34 Kannada consonants and read simple words made from them.',
      intro: 'ವ್ಯಂಜನ (vyanjana) means consonant. Meet the consonant family, then join letters to read your first words.',
      objectives: [
        'Recognise Kannada consonants and the five consonant groups (ವರ್ಗ).',
        'Match a consonant to a word that begins with it.',
        'Blend consonants to read simple words such as ಮರ and ಕಮಲ.',
      ],
      icon: 'languages',
      status: 'ready',
      topicIds: ['kn2-consonants-meet', 'kn2-consonants-words'],
      source: ktbs(
        2,
        'Closest verified unit titles: the letter-learning lessons (ಅಕ್ಷರ ಪಾಠ) in Kali Kannada-2 Parts 1–2, second language (that contents page was hard to read). The first-language Savi Kannada series teaches letters in Class 1.',
      ),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 3 */
  ...classBranch('kannada', 3, 'letters', [
    {
      id: 'kn3-kagunita',
      title: 'ಕಾಗುಣಿತ: Vowel Signs',
      summary: 'Add vowel signs to consonants to make syllables, then read words with them.',
      intro: 'A consonant and a vowel join to make a new letter, like ಕ + ಆ = ಕಾ. Learn the vowel signs and read words with them.',
      objectives: [
        'Join a consonant and a vowel to make a syllable (ಗುಣಿತಾಕ್ಷರ).',
        'Recognise the vowel signs in syllables such as ಕಾ, ಕಿ, ಕೀ, ಕು, ಕೆ and ಕೊ.',
        'Read two-syllable words such as ಮೀನು, ಗಿಳಿ and ಶಾಲೆ.',
      ],
      icon: 'pencil',
      status: 'ready',
      topicIds: ['kn3-kagunita-signs', 'kn3-kagunita-words'],
      source: ktbs(
        3,
        'Related verified unit titles: “ಗುಣಿತಾಕ್ಷರಗಳು” in Savi Kannada Class 1 Part 2 (first language) and the ಗುಣಿತಾಕ್ಷರ lessons in Kali Kannada-2 Part 2 (second language). Kali Kannada-3 Part 1 opens with a bridge unit (ಸೇತುಬಂಧ) whose content was not checked; this lesson secures vowel signs at that stage, a little later than the KTBS sequence.',
      ),
      review: REVIEW,
    },
    {
      ...planned(
        'kn3-ottakshara',
        'ಒತ್ತಕ್ಷರಗಳು: Double Letters',
        'Read and write words with an ottakshara (a consonant joined below another), such as ಅಮ್ಮ, ಹಕ್ಕಿ and ಪುಸ್ತಕ.',
        'languages',
        ktbs(3, 'Matches the ottakshara lessons listed in Kali Kannada-3 Part 1 (second language); first-language learners meet “ಒತ್ತಕ್ಷರಗಳು” in Savi Kannada Class 1 Part 2.'),
      ),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 4 */
  ...classBranch('kannada', 4, 'grammar', [
    {
      id: 'kn4-nouns-gender',
      title: 'ನಾಮಪದ ಮತ್ತು ಲಿಂಗ: Nouns and Gender',
      summary: 'Find naming words, tell general names from special names, and sort nouns by gender.',
      intro: 'ನಾಮಪದ (naamapada) is a naming word. Find naming words and learn the three genders, called ಲಿಂಗ (linga).',
      objectives: [
        'Identify naming words (ನಾಮಪದ) for people, places, animals and things.',
        'Tell a general name (ರೂಢನಾಮ) from a special name (ಅಂಕಿತನಾಮ).',
        'Sort nouns into ಪುಲ್ಲಿಂಗ, ಸ್ತ್ರೀಲಿಂಗ and ನಪುಂಸಕಲಿಂಗ.',
      ],
      icon: 'pen',
      status: 'ready',
      topicIds: ['kn4-naamapada', 'kn4-linga'],
      source: ktbs(
        4,
        'KTBS books teach grammar through exercises inside reading lessons; no Class 4 unit title names nouns or gender (Savi Kannada 4 ends with “ನುಡಿ ಆಟಗಳು”, word games). ನಾಮಪದ and ಲಿಂಗ follow the usual Kannada grammar progression for this stage.',
      ),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 5 */
  ...classBranch('kannada', 5, 'grammar', [
    {
      id: 'kn5-number-adjectives',
      title: 'ವಚನ ಮತ್ತು ವಿಶೇಷಣ: Number and Describing Words',
      summary: 'Change nouns from one to many, and use describing words.',
      intro: 'ವಚನ (vachana) tells us if there is one or many. ವಿಶೇಷಣ (visheshana) words describe a noun.',
      objectives: [
        'Change a noun from ಏಕವಚನ (one) to ಬಹುವಚನ (many) with the right ending.',
        'Identify describing words (ವಿಶೇಷಣ) in a phrase.',
        'Tell singular nouns, plural nouns and describing words apart.',
      ],
      icon: 'sparkles',
      status: 'ready',
      topicIds: ['kn5-vachana', 'kn5-visheshana'],
      source: ktbs(
        5,
        'No Class 5 unit title names ವಚನ or ವಿಶೇಷಣ; Tili Kannada Class 5 lists supplementary “ಭಾಷಾ ಚಟುವಟಿಕೆಗಳು” (language activities). Number and describing words follow the usual Kannada grammar progression for this stage.',
      ),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 6 */
  ...classBranch('kannada', 6, 'grammar', [
    {
      id: 'kn6-pronouns-verbs',
      title: 'ಸರ್ವನಾಮ ಮತ್ತು ಕ್ರಿಯಾಪದ: Pronouns and Verbs',
      summary: 'Use pronouns in place of nouns, and find the verb and its ending in a sentence.',
      intro: 'ಸರ್ವನಾಮ (sarvanaama) words stand in for nouns. ಕ್ರಿಯಾಪದ (kriyaapada) words tell us what someone does.',
      objectives: [
        'Use common pronouns such as ನಾನು, ನೀನು, ಅವನು, ಅವಳು and ಅದು.',
        'Choose ನೀವು and ಅವರು to speak politely to and about elders.',
        'Find the verb (ಕ್ರಿಯಾಪದ) in a sentence and match its ending to the doer.',
      ],
      icon: 'users',
      status: 'ready',
      topicIds: ['kn6-sarvanama', 'kn6-kriyapada'],
      source: ktbs(6, 'No Class 6 unit title names pronouns or verbs; they follow the usual Kannada grammar progression for this stage.'),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 7 */
  ...classBranch('kannada', 7, 'words', [
    {
      id: 'kn7-word-pairs',
      title: 'ಸಮಾನಾರ್ಥಕ ಮತ್ತು ವಿರುದ್ಧಾರ್ಥಕ ಪದಗಳು: Synonyms and Opposites',
      summary: 'Find words with the same meaning and words with the opposite meaning.',
      intro: 'Some words mean the same, like ಸೂರ್ಯ and ರವಿ. Others mean the opposite, like ಹಗಲು and ರಾತ್ರಿ.',
      objectives: [
        'Match Kannada words with their synonyms (ಸಮಾನಾರ್ಥಕ ಪದಗಳು).',
        'Match words with their opposites (ವಿರುದ್ಧಾರ್ಥಕ ಪದಗಳು), including ones made with ಅ or ಅನ್.',
        'Tell a synonym pair from an opposite pair.',
      ],
      icon: 'book',
      status: 'ready',
      topicIds: ['kn7-samanarthaka', 'kn7-viruddharthaka'],
      source: ktbs(7, 'No Class 7 unit title names synonyms or opposites; they are a usual vocabulary exercise in Kannada at this stage.'),
      review: REVIEW,
    },
  ]),
  ...classBranch('kannada', 7, 'grammar', [
    {
      id: 'kn7-tenses',
      title: 'ಕಾಲ: Tenses',
      summary: 'Tell past, present and future apart from time words and verb endings.',
      intro: 'ಕಾಲ (kaala) means time. A Kannada verb changes its ending to show if something happened, is happening or will happen.',
      objectives: [
        'Name the three tenses: ಭೂತಕಾಲ, ವರ್ತಮಾನಕಾಲ and ಭವಿಷ್ಯತ್ ಕಾಲ.',
        'Use time words such as ನಿನ್ನೆ, ಇಂದು and ನಾಳೆ as clues.',
        'Recognise and form the past, present and future of a verb.',
      ],
      icon: 'clock',
      status: 'ready',
      topicIds: ['kn7-kaala-three', 'kn7-kaala-forms'],
      source: ktbs(7, 'No Class 7 unit title names tenses; ಕಾಲ follows the usual Kannada grammar progression for this stage.'),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 8 */
  ...classBranch('kannada', 8, 'sentences', [
    {
      id: 'kn8-proverbs-sentences',
      title: 'ಗಾದೆಗಳು ಮತ್ತು ವಾಕ್ಯ ರಚನೆ: Proverbs and Sentences',
      summary: 'Learn well-known Kannada proverbs and build clear, correct sentences.',
      intro: 'ಗಾದೆಗಳು (gaadegalu) are wise old sayings. Learn what they mean, then build sentences with a doer, an object and a verb.',
      objectives: [
        'Explain the meaning of common Kannada proverbs (ಗಾದೆಗಳು) and link them to everyday situations.',
        'Identify the ಕರ್ತೃ (doer), ಕರ್ಮ (object) and ಕ್ರಿಯಾಪದ (verb) in a sentence.',
        'Complete a sentence with a verb whose ending agrees with the doer.',
      ],
      icon: 'quote',
      status: 'ready',
      topicIds: ['kn8-gaadegalu', 'kn8-vakya-rachane'],
      source: ktbs(
        8,
        'Tili Kannada Class 8 Part 1 lists the composition task “ಗಾದೆಗಳ ವಿಸ್ತರಣೆ” (expanding proverbs), and Tili Kannada Class 5 lists “ಗಾದೆ ಮಾತುಗಳು” and “ನುಡಿಗಟ್ಟುಗಳು” as supplementary readings; only the titles were verified.',
      ),
      review: REVIEW,
    },
  ]),
];
