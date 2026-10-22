import type { Grade, Lesson } from '../types.js';
import { classBranch, source } from './helpers.js';

/**
 * English, Classes 1-8.
 *
 * NCERT's English books (Mridang for Classes 1-2, Santoor for 3-5, Poorvi for
 * 6-8) are built around themes and stories, not grammar chapters. Laarish's
 * skill lessons follow each class's stage and skills, so they are marked
 * 'curriculum-inspired' rather than aligned to one chapter.
 */

const CHECKED = 'Book, year and unit list checked in docs/curriculum-sources.md (ncert.nic.in textbook page and prelims PDF, Reprint 2026-27), 21 Oct 2026.';

const BOOKS: Record<Grade, string> = { 1: 'Mridang', 2: 'Mridang', 3: 'Santoor', 4: 'Santoor', 5: 'Santoor', 6: 'Poorvi', 7: 'Poorvi', 8: 'Poorvi' };

/** Fits the class's NCERT English stage and skills; no single chapter of the theme-based book teaches it. */
function inspired(grade: Grade, note: string) {
  return source({ document: `${BOOKS[grade]}, Class ${grade}`, grade, academicYear: '2026-27', status: 'curriculum-inspired', verification: `${CHECKED} ${note}` });
}

export const ENGLISH_LESSONS: Lesson[] = [
  /* Class 1 */
  ...classBranch('english', 1, 'listening', [
    {
      id: 'e1-sounds-and-rhymes',
      title: 'Letter Sounds and Rhymes',
      summary: 'Hear the first sound of a word and find words that rhyme.',
      intro: 'Every word starts with a sound. Listen for first sounds and find words that rhyme!',
      objectives: ['Say the first sound of a simple word.', 'Group words that start with the same sound.', 'Find pairs of words that rhyme.'],
      icon: 'music',
      status: 'ready',
      topicIds: ['e1-beginning-sounds', 'e1-rhyming-words', 'e1-sounds-review'],
      source: inspired(1, 'Mridang Class 1 is theme-based (My Family and Me, Life Around Us, Food, Seasons) with rhymes and stories but no phonics chapter by title; beginning sounds and rhyming fit the Class 1 foundational stage, so this is not marked aligned.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 2 (the original English lessons) */
  ...classBranch('english', 2, 'words', [
    {
      id: 'naming-and-doing-words',
      title: 'Naming and Doing Words',
      summary: 'Find the words that name things and the words that show actions.',
      intro: 'Every sentence is built from different kinds of words. Become a word detective and sort naming words from doing words.',
      objectives: ['Find naming words (nouns) for people, places, animals and things.', 'Find doing words (verbs) that show an action.', 'Tell naming words and doing words apart in a sentence.'],
      icon: 'pen',
      status: 'ready',
      topicIds: ['words-naming', 'words-doing'],
      source: inspired(2, 'Mridang Class 2 is theme-based (Fun with Friends, Welcome to My World, Going Places, Life Around Us, Harmony); no chapter is a grammar unit by title, so naming and doing words are matched to the Class 2 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 2, 'sentences', [
    {
      id: 'building-sentences',
      title: 'Building Sentences',
      summary: 'Put words in order and finish sentences with the right mark.',
      intro: 'A sentence is a group of words that makes sense. Build sentences tile by tile and learn when to use a full stop or a question mark.',
      objectives: ['Put words in an order that makes sense.', 'Start a sentence with a capital letter and end it with a full stop.', 'End an asking sentence with a question mark.'],
      icon: 'quote',
      status: 'ready',
      topicIds: ['sentences-word-order', 'sentences-asking'],
      source: inspired(2, 'Mridang Class 2 is theme-based with no sentence-building chapter by title; first sentences and end marks are matched to the Class 2 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 3 */
  ...classBranch('english', 3, 'words', [
    {
      id: 'e3-describing-words',
      title: 'Describing Words',
      summary: 'Use describing words to say what people, animals and things are like.',
      intro: 'Describing words paint a picture with words. Find them, and use them to tell how things look, feel, taste and sound.',
      objectives: ['Find describing words (adjectives) in a sentence.', 'Tell which naming word a describing word describes.', 'Choose describing words for colour, size, shape, feel, taste and sound.'],
      icon: 'palette',
      status: 'ready',
      topicIds: ['e3-finding-adjectives', 'e3-adjectives-senses'],
      source: inspired(3, 'Santoor Class 3 units (Fun with Friends, Toys and Games, Good Food, The Sky) are theme-based; no chapter title names describing words, so the lesson is matched to the Class 3 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 3, 'sentences', [
    {
      id: 'e3-capitals-and-punctuation',
      title: 'Capital Letters and Punctuation',
      summary: 'Use capital letters for sentence starts and names, and end every sentence with the right mark.',
      intro: 'Capital letters and punctuation marks are signals for the reader. Learn where they go and why.',
      objectives: ['Use capital letters to start sentences and for names of people, places, days, months and festivals.', 'End a sentence with a full stop, question mark or exclamation mark.', 'Use commas to separate things in a list.'],
      icon: 'quote',
      status: 'ready',
      topicIds: ['e3-capital-letters', 'e3-end-marks', 'e3-punctuation-review'],
      source: inspired(3, 'Santoor Class 3 is theme-based with no punctuation chapter by title; capital letters, end marks and commas fit the Class 3 stage, so this is not marked aligned.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 4 */
  ...classBranch('english', 4, 'sentences', [
    {
      id: 'e4-simple-past',
      title: 'Talking About the Past',
      summary: 'Use the simple past tense to tell about things that already happened.',
      intro: 'Yesterday has already happened, so we talk about it in the past tense. Learn how doing words change when we tell about the past.',
      objectives: ['Add -ed (or -d) to regular doing words to show the past.', 'Use common special past forms such as went, ate, saw and bought.', 'Use time words like yesterday and last week with the past tense.'],
      icon: 'calendar',
      status: 'ready',
      topicIds: ['e4-past-ed', 'e4-past-irregular'],
      source: inspired(4, 'Santoor Class 4 units (My Land, My Beautiful World, Fun with Games, Up High) are theme-based; no chapter title names the past tense, so the lesson is matched to the Class 4 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 4, 'reading', [
    {
      id: 'e4-story-order',
      title: 'Story Order',
      summary: 'Follow the events of a story from beginning to end, and retell it in order.',
      intro: 'Every story has a beginning, a middle and an end. Learn to follow events in order and retell a story clearly.',
      objectives: ['Tell the beginning, middle and end of a short story.', 'Use order words like first, next, then and finally.', 'Retell a short story in the right order, in the past tense.'],
      icon: 'book',
      status: 'ready',
      topicIds: ['e4-story-sequence', 'e4-story-retell'],
      source: inspired(4, 'Santoor Class 4 is built on stories and poems in four theme units; story order and retelling fit the Class 4 stage, but no single chapter is about sequencing, so this is not marked aligned. The story in this lesson is original.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 5 */
  ...classBranch('english', 5, 'words', [
    {
      id: 'e5-word-meanings',
      title: 'Same and Opposite Meanings',
      summary: 'Use synonyms and antonyms to make your words richer.',
      intro: 'Some words mean almost the same, and some mean the opposite. Knowing both makes your speaking and writing richer.',
      objectives: ['Match words with similar meanings (synonyms).', 'Match words with opposite meanings (antonyms), including opposites made with un-, dis- and im-.', 'Choose a synonym or antonym that fits a sentence.'],
      icon: 'sparkles',
      status: 'ready',
      topicIds: ['e5-synonyms', 'e5-antonyms', 'e5-word-meanings-review'],
      source: inspired(5, 'Santoor Class 5 units (Let\'s Have Fun, My Colourful World, Water, Ups and Downs, Work is Worship) are theme-based; no chapter title names synonyms or antonyms, so the lesson is matched to the Class 5 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 5, 'sentences', [
    {
      id: 'e5-joining-words',
      title: 'Joining Words and Place Words',
      summary: 'Join ideas with and, but, or, because and so, and show where things are with in, on, under and more.',
      intro: 'Joining words link ideas together, and place words tell us where things are. Use both to build longer, clearer sentences.',
      objectives: ['Join two ideas with and, but, or, because or so.', 'Choose the joining word that shows the right link between ideas.', 'Use prepositions such as in, on, under, between, behind and beside, and at, on and in for time.'],
      icon: 'paperclip',
      status: 'ready',
      topicIds: ['e5-conjunctions', 'e5-prepositions'],
      source: inspired(5, 'Santoor Class 5 is theme-based with no grammar chapter by title; conjunctions and prepositions fit the Class 5 stage, so this is not marked aligned.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 6 */
  ...classBranch('english', 6, 'words', [
    {
      id: 'e6-parts-of-speech',
      title: 'Parts of Speech',
      summary: 'Name the job each word does in a sentence: noun, pronoun, verb, adjective, adverb, preposition or conjunction.',
      intro: 'Every word in a sentence has a job. Learn the main parts of speech and spot them in real sentences.',
      objectives: ['Identify nouns (including proper, collective and abstract nouns), pronouns and verbs.', 'Tell adjectives, which describe nouns, from adverbs, which describe verbs.', "Work out a word's part of speech from how it is used in a sentence."],
      icon: 'pen',
      status: 'ready',
      topicIds: ['e6-nouns-pronouns-verbs', 'e6-adjectives-adverbs', 'e6-parts-review'],
      source: inspired(6, 'Poorvi Class 6 units (Fables and Folk Tales, Friendship, Nurturing Nature, Sports and Wellness, Culture and Tradition) are theme-based; no chapter title names the parts of speech, so the lesson is matched to the Class 6 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 6, 'reading', [
    {
      id: 'e6-main-idea',
      title: 'Reading for the Main Idea',
      summary: 'Find what a passage is mostly about, the details that support it, and a title and summary that fit.',
      intro: 'Every good paragraph is about one big idea. Learn to find the main idea, the supporting details and a fitting title.',
      objectives: ['State the main idea of a short paragraph.', 'Tell supporting details apart from the main idea.', 'Choose a title or a one-sentence summary that fits a passage.'],
      icon: 'lightbulb',
      status: 'ready',
      topicIds: ['e6-main-idea-details', 'e6-titles-summaries'],
      source: inspired(6, 'Reading for the main idea is a core Class 6 reading skill across Poorvi\'s units, but it is not one chapter; all passages here are original Laarish texts, so this is not marked aligned.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 7 */
  ...classBranch('english', 7, 'sentences', [
    {
      id: 'e7-tenses-in-use',
      title: 'Tenses in Use',
      summary: 'Choose the right tense for habits, actions in progress, finished actions and future plans.',
      intro: 'Tenses tell us when something happens and whether it is finished. Learn to pick the tense that fits the time.',
      objectives: ['Use the simple present for habits and facts, and the present continuous for actions happening now.', 'Use the simple past, the present perfect (with since and for) and the future with will.', 'Name the tense of a sentence and keep tenses steady in a short passage.'],
      icon: 'clock',
      status: 'ready',
      topicIds: ['e7-present-tenses', 'e7-past-perfect-future', 'e7-tenses-review'],
      source: inspired(7, 'Poorvi Class 7 units (Learning Together, Wit and Humour, Dreams and Discoveries, Travel and Adventure, Bravehearts) are theme-based; no chapter title names tenses, so the lesson is matched to the Class 7 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 7, 'writing', [
    {
      id: 'e7-messages-and-letters',
      title: 'Messages and Letters',
      summary: 'Write short messages and letters with the right parts in the right order.',
      intro: 'A clear message or letter has parts that every reader expects. Learn what goes where, and write so your reader understands quickly.',
      objectives: ['Include the key parts of a short message: date and time, who it is for, the main news, any action and who wrote it.', 'Set out an informal letter: address, date, greeting, body, closing and name.', 'Choose formal or informal language to suit the reader.'],
      icon: 'pencil',
      status: 'ready',
      topicIds: ['e7-message-writing', 'e7-letter-writing'],
      source: inspired(7, 'Poorvi Class 7 is theme-based with no chapter on message or letter writing by title; these writing formats fit the Class 7 stage, so this is not marked aligned.'),
      review: { teacher: 'pending' },
    },
  ]),

  /* Class 8 */
  ...classBranch('english', 8, 'sentences', [
    {
      id: 'e8-reported-speech',
      title: 'Direct and Reported Speech',
      summary: 'Write the exact words people say, and report them in your own sentence.',
      intro: 'We can share what someone said in two ways: in their exact words, or reported in our own sentence. Learn the punctuation and the changes each way needs.',
      objectives: ['Punctuate direct speech with quotation marks, commas and capital letters.', 'Change statements into reported speech, shifting pronouns, tenses and time words.', 'Report questions with asked + if or a question word, and commands with told + to.'],
      icon: 'quote',
      status: 'ready',
      topicIds: ['e8-direct-speech', 'e8-reported-changes'],
      source: inspired(8, 'Poorvi Class 8 units (Wit and Wisdom, Values and Dispositions, Mystery and Magic, Environment, Science and Curiosity) are theme-based; no chapter title names direct or reported speech, so the lesson is matched to the Class 8 stage, not to a chapter.'),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('english', 8, 'reading', [
    {
      id: 'e8-inference-and-persuasion',
      title: 'Inference and Persuasion',
      summary: 'Read between the lines, tell facts from opinions, and build a persuasive argument.',
      intro: 'Good readers notice what a writer does not say directly, and good writers know how to persuade. Learn both, and read persuasive texts with a critical eye.',
      objectives: ['Make inferences that are supported by clues in a text.', 'Tell facts from opinions and choose relevant reasons for a persuasive paragraph.', 'Tell what a text states, what it suggests and what it does not support.'],
      icon: 'eye',
      status: 'ready',
      topicIds: ['e8-inference', 'e8-persuasive-writing', 'e8-reading-review'],
      source: inspired(8, 'Inference and persuasive writing fit the Class 8 stage and Poorvi\'s reading of stories and non-fiction, but no single chapter teaches them; all passages here are original Laarish texts, so this is not marked aligned.'),
      review: { teacher: 'pending' },
    },
  ]),
];
