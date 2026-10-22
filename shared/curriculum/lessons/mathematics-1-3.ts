import type { AlignmentStatus, ContentReview, Lesson } from '../types.js';
import { classBranch, planned, source } from './helpers.js';

/**
 * Mathematics, Classes 1-3.
 *
 * Sequence and objectives follow NCERT Joyful Mathematics (Classes 1 and 2)
 * and Maths Mela (Class 3), whose chapter lists are recorded in
 * docs/curriculum-sources.md. Classes 1-2 chapter titles name their topic, so
 * lessons that match one are "aligned". Class 3 chapter titles do not name
 * their topic, so Class 3 lessons are "curriculum-inspired" until a chapter's
 * content is checked.
 */

const REVIEW: ContentReview = { teacher: 'pending' };
const YEAR = '2026-27';
const CHECKED = '21 Oct 2026';

/** A Joyful Mathematics (Class 1 or 2) chapter whose title and topic are listed as verified. */
function joyful(grade: 1 | 2, unit: string, status: AlignmentStatus = 'aligned', note?: string) {
  const code = grade === 1 ? 'aejm1' : 'bejm1';
  return source({
    document: `Joyful Mathematics, Class ${grade}`,
    grade,
    academicYear: YEAR,
    unit,
    status,
    verification:
      note ??
      `Chapter title and topic checked against the NCERT Contents page (${code}, Reprint 2026-27) listed as verified in docs/curriculum-sources.md, ${CHECKED}. Objectives mapped by Laarish; no textbook text is reproduced.`,
  });
}

/** A Maths Mela (Class 3) lesson: the chapter title is verified, but its topic is only inferred from the title. */
function mela(unit: string | undefined, note: string) {
  return source({ document: 'Maths Mela, Class 3', grade: 3, academicYear: YEAR, unit, status: 'curriculum-inspired', verification: note });
}

const MELA_INFERRED = `Chapter title verified on the NCERT Contents page (cemm1, Reprint 2026-27) in docs/curriculum-sources.md, ${CHECKED}. The title does not name the topic; the match to this lesson is inferred and the chapter content was not checked, so the lesson is not marked aligned.`;
const PLANNED_NOTE = `Planned lesson. Chapter title and topic verified in docs/curriculum-sources.md (${CHECKED}); lesson objectives not written yet.`;

export const MATHS_1_3_LESSONS: Lesson[] = [
  /* ------------------------------------------------------------ Class 1 */
  ...classBranch('mathematics', 1, 'numbers', [
    {
      id: 'm1-numbers-to-20',
      title: 'Numbers to 20',
      summary: 'Count, order and compare numbers up to 20.',
      intro: 'Let us count up to 20 and find each number on a number line. Then we will find which number is more.',
      objectives: [
        'Count objects up to 20 and see a number from 11 to 20 as 10 and some more.',
        'Say the number just before, just after and between numbers up to 20.',
        'Compare two numbers up to 20 and say which is more.',
      ],
      icon: 'hash',
      status: 'ready',
      topicIds: ['m1-ten-and-more', 'm1-before-and-after', 'm1-more-or-less', 'm1-numbers-review'],
      source: joyful(1, 'Making 10 (Numbers 10 to 20)'),
      review: REVIEW,
    },
    {
      id: 'adding-within-20',
      title: 'Adding within 20',
      summary: 'Count on and make 10 to add quickly.',
      intro: 'Adding means putting groups together. Learn to count on from the bigger number and to use number pairs that make 10.',
      objectives: ['Add two numbers within 20 by counting on from the bigger number.', 'Know the pairs of numbers that make 10 and find a missing partner.'],
      icon: 'plus',
      status: 'ready',
      topicIds: ['adding-counting-on', 'adding-number-bonds'],
      // This lesson was first in the branch before "Numbers to 20" was added. It stays open so learners who
      // already started or finished it are not locked out by the new lesson in front of it.
      prerequisites: [],
      source: joyful(1, 'Vegetable Farm (Addition and Subtraction up to 20)'),
      review: REVIEW,
    },
    {
      ...planned('m1-taking-away', 'Taking Away within 20', 'Take away by counting back and find how many are left.', 'footprints', joyful(1, 'Vegetable Farm (Addition and Subtraction up to 20)', 'curriculum-inspired', PLANNED_NOTE)),
      review: REVIEW,
    },
  ]),
  ...classBranch('mathematics', 1, 'geometry', [
    {
      id: 'm1-long-round-flat',
      title: 'Long, Round and Flat',
      summary: 'Sort things around us by their shape and how they move.',
      intro: 'Some things roll and some things slide. Let us look at the shapes of things around us.',
      objectives: ['Sort objects that roll, slide, or do both.', 'Describe objects as long, round or flat, with straight or curved edges.'],
      icon: 'shapes',
      status: 'ready',
      topicIds: ['m1-roll-or-slide', 'm1-shape-words'],
      source: joyful(1, 'What is Long? What is Round? (Shapes)'),
      review: REVIEW,
    },
  ]),
  ...classBranch('mathematics', 1, 'measurement', [
    { ...planned('m1-long-and-short', 'Long and Short, Heavy and Light', 'Compare lengths and weights by looking, lifting and sorting.', 'ruler', joyful(1, "Lina's Family (Measurement)", 'curriculum-inspired', PLANNED_NOTE)), review: REVIEW },
  ]),
  ...classBranch('mathematics', 1, 'patterns', [
    { ...planned('m1-patterns', 'Patterns Around Us', 'Spot, continue and make patterns with shapes, colours and numbers.', 'repeat', joyful(1, 'Utsav (Patterns)', 'curriculum-inspired', PLANNED_NOTE)), review: REVIEW },
  ]),

  /* ------------------------------------------------------------ Class 2 */
  ...classBranch('mathematics', 2, 'numbers', [
    {
      id: 'm2-tens-and-ones',
      title: 'Tens and Ones',
      summary: 'Build numbers up to 100 from tens and ones and find them on a number line.',
      intro: 'Ten sticks tied together make one bundle of ten. Let us use bundles and loose sticks to build numbers up to 100.',
      objectives: ['Show a number up to 100 as tens and ones.', 'Find numbers up to 100 on a number line.', 'Count forward and back in tens from any number.'],
      icon: 'hash',
      status: 'ready',
      topicIds: ['m2-bundles-of-ten', 'm2-numbers-to-100-line'],
      source: joyful(2, 'Fun with Numbers (Numbers 1 to 100)'),
      review: REVIEW,
    },
    {
      id: 'm2-add-and-take-away',
      title: 'Adding and Taking Away',
      summary: 'Add and take away numbers up to 100 with jumps on a number line.',
      intro: 'It is festival time! Let us count diyas and flowers by jumping forward to add and back to take away.',
      objectives: [
        'Add a one-digit or two-digit number with jumps on a number line.',
        'Take away with jumps back on a number line.',
        'Choose to add or take away in a story, and find how many more are needed.',
      ],
      icon: 'plus',
      status: 'ready',
      topicIds: ['m2-jump-to-add', 'm2-jump-back', 'm2-festival-review'],
      source: joyful(2, 'Decoration for Festival (Addition and Subtraction)'),
      review: REVIEW,
    },
    {
      ...planned('m2-grouping-and-sharing', 'Grouping and Sharing', 'Make equal groups and share things equally.', 'users', joyful(2, 'Grouping and Sharing (Multiplication and Division)', 'curriculum-inspired', PLANNED_NOTE)),
      review: REVIEW,
    },
  ]),
  ...classBranch('mathematics', 2, 'geometry', [
    { ...planned('m2-solid-shapes', 'Solid Shapes Around Us', 'Name and sort solid shapes such as cubes, cylinders, cones and spheres.', 'shapes', joyful(2, 'Shapes Around Us (3D Shapes)', 'curriculum-inspired', PLANNED_NOTE)), review: REVIEW },
  ]),
  ...classBranch('mathematics', 2, 'measurement', [
    {
      id: 'm2-money-at-the-fair',
      title: 'Money at the Fair',
      summary: 'Know Indian coins and notes and add up small amounts in rupees.',
      intro: 'At the fair, everything costs rupees. Let us count coins and notes and pay the right amount.',
      objectives: ['Name common Indian coins and notes.', 'Add coins and notes to find a total in rupees.', 'Find how much more money is needed, or the change, for a small purchase.'],
      icon: 'coins',
      status: 'ready',
      topicIds: ['m2-coins-and-notes', 'm2-paying-at-the-fair'],
      source: joyful(2, 'Fun at the Fair (Money)'),
      review: REVIEW,
    },
    { ...planned('m2-measuring-length', 'Measuring Length', 'Measure and compare lengths using hand spans, steps and other units.', 'ruler', joyful(2, "Rani's Gift (Measurement)", 'curriculum-inspired', PLANNED_NOTE)), review: REVIEW },
  ]),
  ...classBranch('mathematics', 2, 'data', [
    {
      id: 'm2-collecting-data',
      title: 'Collecting and Showing Data',
      summary: 'Count things, put the counts in a table and show them in a chart.',
      intro: 'Which fruit does your class like best? Let us collect answers, count them and show them in a chart.',
      objectives: ['Collect and count data and record it in a simple table.', 'Show data in a chart where each step stands for one.', 'Read a chart to find the most, the fewest and how many more.'],
      icon: 'chart',
      status: 'ready',
      topicIds: ['m2-make-a-chart', 'm2-read-a-chart'],
      source: joyful(2, 'Data Handling'),
      review: REVIEW,
    },
  ]),

  /* ------------------------------------------------------------ Class 3 */
  ...classBranch('mathematics', 3, 'numbers', [
    {
      id: 'm3-numbers-to-1000',
      title: 'Hundreds, Tens and Ones',
      summary: 'Read, build, compare and place numbers up to 1000.',
      intro: 'Ten tens make one hundred. Let us build big numbers with hundreds, tens and ones and find them on a number line.',
      objectives: ['Show a three-digit number as hundreds, tens and ones.', 'Compare three-digit numbers using place value.', 'Place numbers up to 1000 on a number line and jump by hundreds and tens.'],
      icon: 'hash',
      status: 'ready',
      topicIds: ['m3-hundreds-tens-ones', 'm3-numbers-to-1000-line'],
      source: mela('House of Hundreds–I', MELA_INFERRED),
      review: REVIEW,
    },
    {
      id: 'm3-equal-groups',
      title: 'Equal Groups',
      summary: 'Use equal groups and skip counting to multiply.',
      intro: 'Rakhis, bangles and idlis often come in equal groups. Let us count them quickly by skip counting and multiplying.',
      objectives: ['Find the total of equal groups by skip counting.', 'Show equal groups as equal jumps on a number line.', 'Write equal groups as a multiplication, such as 3 × 4 = 12.'],
      icon: 'repeat',
      status: 'ready',
      topicIds: ['m3-skip-counting', 'm3-groups-and-times'],
      source: mela(
        undefined,
        `Fits the Class 3 stage of NCERT Maths Mela (chapter list verified in docs/curriculum-sources.md, ${CHECKED}). The chapter titles do not name their topics, so no single chapter was matched and no unit is named.`,
      ),
      review: REVIEW,
    },
    { ...planned('m3-adding-big-numbers', 'Adding and Taking Away Big Numbers', 'Add and take away three-digit numbers using hundreds, tens and ones.', 'plus', mela('House of Hundreds–II', `Planned lesson. ${MELA_INFERRED}`)), review: REVIEW },
  ]),
  ...classBranch('mathematics', 3, 'fractions', [
    {
      id: 'halves-and-quarters',
      title: 'Halves and Quarters',
      summary: 'Share things fairly by cutting them into equal parts.',
      intro: 'When friends share, every part should be fair. Learn to cut things into halves and quarters and read fractions like 1/2 and 3/4.',
      objectives: ['Recognise equal parts and show one half (1/2) of a shape.', 'Recognise quarters and read 1/4, 2/4, 3/4 and 4/4.'],
      icon: 'pie',
      status: 'ready',
      topicIds: ['fractions-halves', 'fractions-quarters'],
      source: mela('Fair Share', MELA_INFERRED),
      review: REVIEW,
    },
  ]),
  ...classBranch('mathematics', 3, 'geometry', [
    { ...planned('m3-fun-with-shapes', 'Fun with Shapes', 'Explore flat shapes, their sides and corners, and fit shapes together.', 'triangle', mela('Fun with Shapes', `Planned lesson. ${MELA_INFERRED}`)), review: REVIEW },
  ]),
  ...classBranch('mathematics', 3, 'measurement', [
    {
      id: 'm3-telling-the-time',
      title: 'Telling the Time',
      summary: 'Read and set clock times to the hour, half hour and quarter hour.',
      intro: 'A clock tells us when to wake up, eat and play. Let us read the hour hand and the minute hand.',
      objectives: [
        "Read and show times to the hour and half hour on a clock.",
        'Read and show quarter past and quarter to.',
        'Work out the time half an hour or one hour later.',
      ],
      icon: 'clock',
      status: 'ready',
      topicIds: ['m3-oclock-and-half-past', 'm3-quarter-past-and-to', 'm3-time-review'],
      source: mela('Time Goes On', MELA_INFERRED),
      review: REVIEW,
    },
    { ...planned('m3-filling-and-lifting', 'Filling and Lifting', 'Compare and measure how much things hold and how heavy they are.', 'scale', mela('Filling and Lifting', `Planned lesson. ${MELA_INFERRED}`)), review: REVIEW },
  ]),
];
