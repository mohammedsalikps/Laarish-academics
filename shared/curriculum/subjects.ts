import { ENGLISH_LESSONS } from './lessons/english.js';
import { HINDI_LESSONS } from './lessons/hindi.js';
import { classLevelId } from './lessons/helpers.js';
import { KANNADA_LESSONS } from './lessons/kannada.js';
import { MATHS_1_3_LESSONS } from './lessons/mathematics-1-3.js';
import { MATHS_4_5_LESSONS } from './lessons/mathematics-4-5.js';
import { MATHS_6_8_LESSONS } from './lessons/mathematics-6-8.js';
import { SCIENCE_1_5_LESSONS } from './lessons/science-1-5.js';
import { SCIENCE_6_8_LESSONS } from './lessons/science-6-8.js';
import { SOCIAL_LESSONS } from './lessons/social.js';
import { GRADES, type Lesson, type Subject, type SubjectBranch, type SubjectLevel } from './types.js';

/**
 * Laarish curriculum: Subject → Class (1-8) → Branch → Lesson → Topic.
 *
 * Lessons and topics are original Laarish content. Each lesson records the
 * official source its learning objectives were mapped to and how well that
 * mapping is verified (see `source` on Lesson and docs/curriculum-sources.md).
 * Nothing here has been reviewed by teachers yet.
 */
export const SAMPLE_CURRICULUM_NOTICE =
  'Original Laarish lessons, mapped to NCERT classes where marked. Not yet reviewed by teachers; lessons marked Proposed are not yet checked against an official syllabus.';

/** One level per class. Themes are short names for the class's journey in the subject. */
function classLevels(themes: readonly string[], descriptions: readonly string[]): SubjectLevel[] {
  return GRADES.map((grade, i) => ({ id: classLevelId(grade), order: grade, title: `Class ${grade}: ${themes[i]}`, grades: [grade, grade], description: descriptions[i] }));
}

/** Lessons in class order, then the subject's branch order, then their order in the branch. */
function inClassOrder(lessons: Lesson[], branches: SubjectBranch[]): Lesson[] {
  const branchIndex = (id?: string) => branches.findIndex((b) => b.id === id);
  return [...lessons].sort((a, b) => a.grades[0] - b.grades[0] || (a.levelId ?? '').localeCompare(b.levelId ?? '', 'en', { numeric: true }) || branchIndex(a.branchId) - branchIndex(b.branchId) || a.order - b.order);
}

/* --------------------------------------------------------- Mathematics */

export const MATHS_BRANCHES: SubjectBranch[] = [
  { id: 'numbers', title: 'Numbers and Arithmetic', description: 'Counting, place value, adding, taking away, multiplying and dividing.', icon: 'plus' },
  { id: 'fractions', title: 'Fractions and Decimals', description: 'Equal parts, fractions of amounts, decimals and percentages.', icon: 'pie' },
  { id: 'geometry', title: 'Shapes and Geometry', description: 'Shapes, lines, angles, symmetry and constructions.', icon: 'shapes' },
  { id: 'measurement', title: 'Measurement, Time and Money', description: 'Length, weight, capacity, time, money, perimeter and area.', icon: 'ruler' },
  { id: 'patterns', title: 'Patterns and Early Algebra', description: 'Patterns, the equals sign and missing numbers.', icon: 'scale' },
  { id: 'algebra', title: 'Algebra', description: 'Use letters for unknown numbers, build expressions and solve equations.', icon: 'variable' },
  { id: 'data', title: 'Data Handling', description: 'Collect, sort and read data in tables, pictographs and charts.', icon: 'chart' },
];

export const MATHS_LEVELS = classLevels(
  ['Number Friends', 'Counting Adventures', 'Maths Fair', 'Number Explorers', 'Big Number Builders', 'Pattern Detectives', 'Expression Explorers', 'Mathematical Thinkers'],
  [
    'Count, compare and add small numbers, and spot shapes and patterns.',
    'Numbers to 100, adding and taking away, shapes, time and money.',
    'Numbers to 1000, equal sharing, fractions, measuring and data.',
    'Bigger numbers, multiplication, fractions, time, money and maps of shapes.',
    'Large numbers, factors, fractions and decimals, area and data.',
    'Number patterns, primes, fractions, negative numbers, angles and data.',
    'Large numbers, expressions with letters, decimals, lines and angles.',
    'Rational numbers, powers, equations, proportion and data.',
  ],
);

/* ------------------------------------------------------------- Science */

export const SCIENCE_BRANCHES: SubjectBranch[] = [
  { id: 'physics', title: 'Forces and Energy', description: 'Physics: pushes, pulls, friction, magnets, light, sound, heat and electricity.', icon: 'magnet' },
  { id: 'chemistry', title: 'Materials and Matter', description: 'Chemistry: what things are made of and how materials change.', icon: 'flask' },
  { id: 'biology', title: 'Living Things', description: 'Biology: plants, animals, food, health and the human body.', icon: 'sprout' },
  { id: 'environment', title: 'Earth, Space and Environment', description: 'Water, weather, habitats, the Earth, the Moon and caring for our planet.', icon: 'globe' },
];

export const SCIENCE_LEVELS = classLevels(
  ['Little Noticers', 'Curious Minds', 'World Around Us', 'Nature Detectives', 'Young Investigators', 'Curious Scientists', 'Lab Explorers', 'Junior Researchers'],
  [
    'Notice plants, animals, the body and everyday materials.',
    'Living and non-living things, water, weather and pushes and pulls.',
    'Plants, animals, food, water and the things we use.',
    'Living together, water, food and how things work.',
    'Plants and animals, the senses, materials and our Earth.',
    'Magnets, materials, measurement, living things and the sky.',
    'Acids and bases, electric circuits, changes, heat and light.',
    'Forces, microbes, matter, light and the Earth in space.',
  ],
);

/* ------------------------------------------------------------- English */

export const ENGLISH_BRANCHES: SubjectBranch[] = [
  { id: 'listening', title: 'Phonics, Listening and Speaking', description: 'Letter sounds, rhymes, listening carefully and speaking clearly.', icon: 'languages' },
  { id: 'words', title: 'Vocabulary and Grammar', description: 'Naming, doing and describing words, word families and word meanings.', icon: 'pen' },
  { id: 'sentences', title: 'Sentences and Punctuation', description: 'Build sentences, capital letters, full stops, question marks and tenses.', icon: 'quote' },
  { id: 'reading', title: 'Reading and Stories', description: 'Story order, characters and reading for meaning.', icon: 'book' },
  { id: 'writing', title: 'Writing and Expression', description: 'Write sentences, messages, letters and short paragraphs.', icon: 'pencil' },
];

export const ENGLISH_LEVELS = classLevels(
  ['First Sounds', 'First Words', 'Word Builders', 'Story Readers', 'Confident Readers', 'Thoughtful Readers', 'Clear Writers', 'Skilled Communicators'],
  [
    'Letter sounds, rhymes and first words.',
    'Naming and doing words and first sentences.',
    'Describing words, punctuation and short stories.',
    'Tenses, story order and reading for detail.',
    'Richer vocabulary, conjunctions and reading for meaning.',
    'Parts of speech, main ideas and paragraphs.',
    'Tenses, voice and structured writing.',
    'Reported speech, inference and persuasive writing.',
  ],
);

/* ------------------------------------------------- Hindi and Kannada */

export const LANGUAGE_BRANCHES: SubjectBranch[] = [
  { id: 'letters', title: 'Letters and Sounds', description: 'The alphabet, vowel signs and reading syllables.', icon: 'languages' },
  { id: 'words', title: 'Words and Vocabulary', description: 'Colours, family, animals, numbers and everyday words.', icon: 'palette' },
  { id: 'grammar', title: 'Grammar', description: 'Naming words, gender, number, describing words and tenses.', icon: 'pen' },
  { id: 'sentences', title: 'Sentences, Reading and Writing', description: 'Build sentences, read short texts and write simple messages.', icon: 'quote' },
];

const LANGUAGE_LEVEL_DESCRIPTIONS = [
  'Letters, sounds and first words.',
  'Vowel signs, everyday words and short sentences.',
  'Reading words and simple sentences.',
  'Grammar basics and short passages.',
  'Grammar, vocabulary and reading for meaning.',
  'Sentences, grammar and short compositions.',
  'Reading passages and writing messages.',
  'Grammar in use and expressive writing.',
];

export const HINDI_LEVELS = classLevels(
  ['अक्षर (Letters)', 'शब्द (Words)', 'वाक्य (Sentences)', 'पढ़ना (Reading)', 'व्याकरण (Grammar)', 'अभिव्यक्ति (Expression)', 'रचना (Composition)', 'संवाद (Communication)'],
  LANGUAGE_LEVEL_DESCRIPTIONS,
);
export const KANNADA_LEVELS = classLevels(
  ['ಅಕ್ಷರ (Letters)', 'ಪದ (Words)', 'ವಾಕ್ಯ (Sentences)', 'ಓದು (Reading)', 'ವ್ಯಾಕರಣ (Grammar)', 'ಅಭಿವ್ಯಕ್ತಿ (Expression)', 'ರಚನೆ (Composition)', 'ಸಂವಹನ (Communication)'],
  LANGUAGE_LEVEL_DESCRIPTIONS,
);

/* ------------------------------------------------------ Social Science */

export const SOCIAL_BRANCHES: SubjectBranch[] = [
  { id: 'community', title: 'Family and Community', description: 'Civics: families, helpers, rules and how communities work together.', icon: 'users' },
  { id: 'geography', title: 'Maps and Places', description: 'Geography: directions, maps, landforms, regions and the environment.', icon: 'map' },
  { id: 'history', title: 'Our Past', description: 'History: time, chronology and how people lived long ago.', icon: 'landmark' },
  { id: 'culture', title: 'Culture and Heritage', description: 'Festivals, food, clothes, languages and heritage across India.', icon: 'flag' },
  { id: 'economics', title: 'Resources and Livelihoods', description: 'Resources, work, money and how people earn a living.', icon: 'coins' },
];

export const SOCIAL_LEVELS = classLevels(
  ['My Family', 'My Neighbourhood', 'My Community', 'Maps and Places', 'Our Country', 'India and Beyond', 'Our Past and Present', 'Society and Citizens'],
  [
    'Me, my family, my home and the people around me.',
    'Neighbours, helpers, festivals and staying safe.',
    'Communities, food, water and finding our way.',
    'Directions, maps, regions and life long ago.',
    'States, landforms, resources and heritage.',
    'Maps, early history, local government and livelihoods.',
    'Kingdoms, democracy, markets and the environment.',
    'Resources, the Constitution, colonial history and society.',
  ],
);

/* ------------------------------------------------------------ Subjects */

const SCIENCE_LESSONS = inClassOrder([...SCIENCE_1_5_LESSONS, ...SCIENCE_6_8_LESSONS], SCIENCE_BRANCHES);
const MATHS_LESSONS = inClassOrder([...MATHS_1_3_LESSONS, ...MATHS_4_5_LESSONS, ...MATHS_6_8_LESSONS], MATHS_BRANCHES);
const ENGLISH = inClassOrder(ENGLISH_LESSONS, ENGLISH_BRANCHES);
const HINDI = inClassOrder(HINDI_LESSONS, LANGUAGE_BRANCHES);
const KANNADA = inClassOrder(KANNADA_LESSONS, LANGUAGE_BRANCHES);
const SOCIAL = inClassOrder(SOCIAL_LESSONS, SOCIAL_BRANCHES);

export const SUBJECTS: Subject[] = [
  {
    id: 'science',
    name: 'Science',
    worldName: 'Discovery Valley',
    tagline: 'Experiment, observe, discover',
    description: 'Run experiments and explore living things, materials, forces, light, electricity and our Earth.',
    color: '#0E9F8E',
    softColor: '#DDF5F1',
    icon: 'flask',
    lessonIds: SCIENCE_LESSONS.map((l) => l.id),
    levels: SCIENCE_LEVELS,
    branches: SCIENCE_BRANCHES,
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    worldName: 'Number Kingdom',
    tagline: 'Patterns, numbers and shapes',
    description: 'Numbers, fractions, shapes, measurement, data and algebra, class by class.',
    color: '#5847E0',
    softColor: '#ECE9FF',
    icon: 'calculator',
    lessonIds: MATHS_LESSONS.map((l) => l.id),
    levels: MATHS_LEVELS,
    branches: MATHS_BRANCHES,
  },
  {
    id: 'english',
    name: 'English',
    worldName: 'Story Forest',
    tagline: 'Words, sentences and stories',
    description: 'Sounds, words, grammar, reading and writing, class by class.',
    color: '#E5603F',
    softColor: '#FFE8E1',
    icon: 'book',
    lessonIds: ENGLISH.map((l) => l.id),
    levels: ENGLISH_LEVELS,
    branches: ENGLISH_BRANCHES,
  },
  {
    id: 'hindi',
    name: 'Hindi',
    worldName: 'Akshar Garden',
    tagline: 'हिंदी शब्द और अक्षर',
    description: 'Learn Hindi letters, words, grammar and sentences.',
    color: '#C27206',
    softColor: '#FFF1D6',
    icon: 'languages',
    lessonIds: HINDI.map((l) => l.id),
    levels: HINDI_LEVELS,
    branches: LANGUAGE_BRANCHES,
  },
  {
    id: 'kannada',
    name: 'Kannada',
    worldName: 'Akshara Hills',
    tagline: 'ಕನ್ನಡ ಪದಗಳು ಮತ್ತು ಅಕ್ಷರಗಳು',
    description: 'Learn Kannada letters, words, grammar and sentences.',
    color: '#D23F6E',
    softColor: '#FDE4EC',
    icon: 'languages',
    lessonIds: KANNADA.map((l) => l.id),
    levels: KANNADA_LEVELS,
    branches: LANGUAGE_BRANCHES,
  },
  {
    id: 'social-science',
    name: 'Social Science',
    worldName: "Explorer's Atlas",
    tagline: 'People, places and our world',
    description: 'Families and communities, maps and places, our past, culture and livelihoods.',
    color: '#2F86D6',
    softColor: '#E1EFFC',
    icon: 'globe',
    lessonIds: SOCIAL.map((l) => l.id),
    levels: SOCIAL_LEVELS,
    branches: SOCIAL_BRANCHES,
  },
];

export const LESSONS: Lesson[] = [...SCIENCE_LESSONS, ...MATHS_LESSONS, ...ENGLISH, ...HINDI, ...KANNADA, ...SOCIAL];
