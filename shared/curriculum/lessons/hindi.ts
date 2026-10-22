import type { Grade, Lesson } from '../types.js';
import { classBranch, source } from './helpers.js';

/**
 * Hindi, Classes 1-8.
 *
 * NCERT Hindi books (Sarangi 1-2, Veena 3-5, Malhar 6-8) are literature-based: letters,
 * grammar and vocabulary are practised through stories and poems, not taught as separate
 * chapters. So these lessons follow each class's stage and themes and are labelled
 * 'curriculum-inspired'; none claims a single textbook chapter. All Hindi content awaits
 * review by a teacher and a native-speaker educator.
 */

const BOOKS: Record<Grade, string> = {
  1: 'Sarangi (सारंगी), Hindi textbook for Class 1',
  2: 'Sarangi (सारंगी), Hindi textbook for Class 2',
  3: 'Veena (वीणा), Hindi textbook for Class 3',
  4: 'Veena (वीणा), Hindi textbook for Class 4',
  5: 'Veena (वीणा), Hindi textbook for Class 5',
  6: 'Malhar (मल्हार), Hindi textbook for Class 6',
  7: 'Malhar (मल्हार), Hindi textbook for Class 7',
  8: 'Malhar (मल्हार), Hindi textbook for Class 8',
};

/** A curriculum-inspired source: the NCERT Hindi book of that class, checked against its contents list. */
const inspiredBy = (grade: Grade, why: string) =>
  source({
    document: BOOKS[grade],
    grade,
    academicYear: '2026-27',
    status: 'curriculum-inspired',
    verification: `Stage checked against the ${BOOKS[grade].split(',')[0]} contents in docs/curriculum-sources.md (official contents page image, 21 Oct 2026). ${why}`,
  });

const REVIEW = { teacher: 'pending', nativeSpeaker: 'pending' } as const;

export const HINDI_LESSONS: Lesson[] = [
  /* ----------------------------------------------------------- Class 1 */
  ...classBranch('hindi', 1, 'letters', [
    {
      id: 'hi1-swar',
      title: 'स्वर: Vowels',
      summary: 'Recognise the Hindi vowels from अ to औ and match them to picture words.',
      intro: 'स्वर (swar) are the vowels of Hindi. Say them, hear short and long sounds, and match each one to a word.',
      objectives: [
        'Recognise and say the Hindi vowels अ to औ, and अं and अः.',
        'Match each vowel to a word that starts with it.',
        'Tell short vowels (अ इ उ) from long vowels (आ ई ऊ).',
      ],
      icon: 'languages',
      status: 'ready',
      topicIds: ['hi1-swar-a-to-oo', 'hi1-swar-ri-to-au', 'hi1-swar-review'],
      source: inspiredBy(1, 'Its contents list only stories and poems, so no chapter is claimed; learning the vowels fits the Class 1 stage of beginning to read.'),
      review: REVIEW,
    },
  ]),
  ...classBranch('hindi', 1, 'words', [
    {
      id: 'hindi-colours',
      title: 'रंग: Colours',
      summary: 'Learn six colour words in Hindi.',
      intro: 'रंग (rang) means colour. Learn to read, say and match six Hindi colour words.',
      objectives: ['Read and say six Hindi colour words.', 'Match each colour word to its English meaning.'],
      icon: 'palette',
      status: 'ready',
      topicIds: ['hindi-colours-bright', 'hindi-colours-more'],
      source: inspiredBy(1, 'Its contents list only stories and poems on everyday themes, so no chapter is claimed; first everyday words fit the Class 1 stage (colours appear later as the Sarangi 2 unit रंग ही रंग).'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 2 */
  ...classBranch('hindi', 2, 'letters', [
    {
      id: 'hi2-vyanjan',
      title: 'व्यंजन: Consonants',
      summary: 'Meet the first Hindi consonants and join letters to read simple words.',
      intro: 'व्यंजन (vyanjan) are the consonants of Hindi. Meet क, ख, ग and friends, then join them to read words like घर and कमल.',
      objectives: [
        'Recognise and say the consonants क, ख, ग, घ, च and छ.',
        'Join two or three consonants to read simple words without vowel signs.',
        'Count the letters in a simple word.',
      ],
      icon: 'pencil',
      status: 'ready',
      topicIds: ['hi2-vyanjan-ka-to-chha', 'hi2-vyanjan-words', 'hi2-vyanjan-review'],
      source: inspiredBy(2, 'No chapter is about the consonants, so none is claimed; reading simple consonant words fits the Class 2 stage.'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 3 */
  ...classBranch('hindi', 3, 'letters', [
    {
      id: 'hi3-matra',
      title: 'मात्राएँ: Vowel signs',
      summary: 'Use the vowel signs ा ि ी ु ू े ै ो ौ to read and build words.',
      intro: 'When a vowel joins a consonant, it becomes a small sign called a मात्रा. Learn every मात्रा and use it to read new words.',
      objectives: [
        'Name the vowel sign (मात्रा) for each vowel from आ to औ.',
        'Read and build words with मात्राएँ.',
        'Tell short signs (ि ु) from long signs (ी ू).',
      ],
      icon: 'pen',
      status: 'ready',
      topicIds: ['hi3-matra-aa-i-ee', 'hi3-matra-u-to-au', 'hi3-matra-review'],
      source: inspiredBy(3, 'No chapter is about vowel signs, so none is claimed; reading words with मात्राएँ fits the Class 3 stage.'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 4 */
  ...classBranch('hindi', 4, 'grammar', [
    {
      id: 'hi4-sangya-ling',
      title: 'संज्ञा और लिंग: Nouns and gender',
      summary: 'Find naming words and tell पुल्लिंग from स्त्रीलिंग.',
      intro: 'संज्ञा words name people, places, animals and things. In Hindi each one is पुल्लिंग or स्त्रीलिंग, and you will learn to tell which.',
      objectives: [
        'Find the संज्ञा (nouns) in a sentence.',
        'Tell व्यक्तिवाचक (special) names from जातिवाचक (general) names.',
        'Change nouns between पुल्लिंग and स्त्रीलिंग and test the gender of things.',
      ],
      icon: 'users',
      status: 'ready',
      topicIds: ['hi4-sangya', 'hi4-ling', 'hi4-sangya-ling-review'],
      source: inspiredBy(4, 'The book has no grammar chapter, so none is claimed; nouns and gender are a usual Class 4 grammar topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 5 */
  ...classBranch('hindi', 5, 'grammar', [
    {
      id: 'hi5-vachan-visheshan',
      title: 'वचन और विशेषण: Number and describing words',
      summary: 'Make nouns plural and use describing words that agree with them.',
      intro: 'वचन tells us one or many, and a विशेषण tells us more about a noun. Learn how both change together.',
      objectives: [
        'Change nouns from एकवचन to बहुवचन using common rules.',
        'Sort विशेषण into quality, number and quantity words.',
        'Make a विशेषण agree with its noun in gender and number.',
      ],
      icon: 'sparkles',
      status: 'ready',
      topicIds: ['hi5-vachan', 'hi5-visheshan', 'hi5-vachan-visheshan-review'],
      source: inspiredBy(5, 'The book has no grammar chapter, so none is claimed; number and adjectives are a usual Class 5 grammar topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 6 */
  ...classBranch('hindi', 6, 'grammar', [
    {
      id: 'hi6-sarvanam-kriya',
      title: 'सर्वनाम और क्रिया: Pronouns and verbs',
      summary: 'Use pronouns in place of nouns, find verbs with and without objects, and make them agree.',
      intro: 'सर्वनाम save us from repeating nouns, and क्रिया tell us what is done. Learn both and make them agree.',
      objectives: [
        'Use the right सर्वनाम in place of a noun, including आप for respect.',
        'Find the क्रिया in a sentence and tell सकर्मक from अकर्मक.',
        'Make the verb agree with its सर्वनाम.',
      ],
      icon: 'footprints',
      status: 'ready',
      topicIds: ['hi6-sarvanam', 'hi6-kriya', 'hi6-sarvanam-kriya-review'],
      source: inspiredBy(6, 'The book has no grammar chapter, so none is claimed; pronouns and transitive/intransitive verbs are a usual Class 6 grammar topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 7 */
  ...classBranch('hindi', 7, 'words', [
    {
      id: 'hi7-paryay-vilom',
      title: 'पर्यायवाची और विलोम: Synonyms and opposites',
      summary: 'Learn words with the same meaning and words with opposite meanings.',
      intro: 'Some words mean the same, and some mean the opposite. Grow your Hindi word store with both.',
      objectives: [
        'Match common words to their पर्यायवाची शब्द.',
        'Give the विलोम of common words, including ones made with prefixes.',
        'Tell पर्यायवाची from विलोम.',
      ],
      icon: 'repeat',
      status: 'ready',
      topicIds: ['hi7-paryayvachi', 'hi7-vilom'],
      source: inspiredBy(7, 'No chapter is a vocabulary unit, so none is claimed; synonyms and opposites are a usual Class 7 vocabulary topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),
  ...classBranch('hindi', 7, 'grammar', [
    {
      id: 'hi7-kaal',
      title: 'काल: Tenses',
      summary: 'Tell past, present and future from the verb, and change the tense of a sentence.',
      intro: 'The verb tells us when something happens. Find the काल of a sentence, then move it into the past or the future.',
      objectives: [
        'Identify भूतकाल, वर्तमान काल and भविष्यत् काल from the verb.',
        'Change a sentence from one काल to another with correct agreement.',
      ],
      icon: 'clock',
      status: 'ready',
      topicIds: ['hi7-kaal-teen', 'hi7-kaal-badlo'],
      source: inspiredBy(7, 'The book has no grammar chapter, so none is claimed; tenses are a usual Class 7 grammar topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),

  /* ----------------------------------------------------------- Class 8 */
  ...classBranch('hindi', 8, 'words', [
    {
      id: 'hi8-muhavare',
      title: 'मुहावरे: Idioms',
      summary: 'Learn common Hindi idioms, what they mean and how to use them in sentences.',
      intro: 'A मुहावरा says something in a colourful way. Learn what popular idioms mean and use them in the right place.',
      objectives: [
        'Explain the meaning of common मुहावरे.',
        'Choose the right मुहावरा for a situation and fit it into a sentence.',
        'Tell a मुहावरा from a लोकोक्ति.',
      ],
      icon: 'quote',
      status: 'ready',
      topicIds: ['hi8-muhavare-arth', 'hi8-muhavare-prayog'],
      source: inspiredBy(8, 'No chapter is about idioms, so none is claimed; मुहावरे are a usual Class 8 language topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),
  ...classBranch('hindi', 8, 'sentences', [
    {
      id: 'hi8-vakya-rachna',
      title: 'वाक्य रचना: Sentence structure',
      summary: 'Split sentences into उद्देश्य and विधेय, and tell सरल, संयुक्त and मिश्र वाक्य apart.',
      intro: 'Every sentence has a subject and something said about it. Learn its parts and the three ways Hindi sentences are built.',
      objectives: [
        'Split a sentence into उद्देश्य and विधेय.',
        'Identify सरल, संयुक्त and मिश्र वाक्य by their joining words.',
      ],
      icon: 'scroll',
      status: 'ready',
      topicIds: ['hi8-vakya-ang', 'hi8-vakya-bhed'],
      source: inspiredBy(8, 'The book has no grammar chapter, so none is claimed; sentence parts and kinds of sentences are a usual Class 8 grammar topic. Chapter exercises were not checked.'),
      review: REVIEW,
    },
  ]),
];
