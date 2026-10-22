import type { Lesson } from '../types.js';
import { classBranch, planned, source } from './helpers.js';

/** Mathematics, Classes 4-5. */

/** NCERT Maths Mela for each class, in use in 2026-27 (see docs/curriculum-sources.md). */
const MELA_4 = { document: 'Maths Mela, Class 4', grade: 4, academicYear: '2026-27' } as const;
const MELA_5 = { document: 'Maths Mela, Class 5', grade: 5, academicYear: '2026-27' } as const;

/** The chapter title names this lesson's topic. */
const TITLE_MATCH =
  'Chapter title checked against the verified Maths Mela contents in docs/curriculum-sources.md (ncert.nic.in prelims PDF, Reprint 2026-27, checked 21 Oct 2026). Objectives were mapped from the chapter title; the chapter content still needs a teacher check.';

/** A planned lesson named after a verified chapter. */
const PLANNED_CHAPTER =
  'Chapter title checked against the verified Maths Mela contents in docs/curriculum-sources.md (ncert.nic.in prelims PDF, Reprint 2026-27, checked 21 Oct 2026). Lesson not written yet.';

/** The chapter title suggests the topic, but does not name it. */
const LIKELY_CHAPTER =
  'Book and chapter list verified in docs/curriculum-sources.md (ncert.nic.in prelims PDF, Reprint 2026-27, checked 21 Oct 2026). The chapter title suggests this topic but does not name it, and the chapter content was not checked, so the lesson is curriculum-inspired.';

export const MATHS_4_5_LESSONS: Lesson[] = [
  /* ---------------------------------------------------------------- Class 4 */
  ...classBranch('mathematics', 4, 'numbers', [
    {
      id: 'm4-equal-groups',
      title: 'Equal Groups',
      summary: 'Multiply equal groups and arrays, share equally, and solve story problems.',
      intro: 'When things come in equal groups, multiplying is a quick way to count them. Sharing equally works the other way round.',
      objectives: [
        'Write equal groups and arrays as multiplication facts.',
        'Use skip counting on a number line to multiply.',
        'Share a number equally and write it as a division.',
        'Choose multiplication or division to solve a story problem.',
      ],
      icon: 'calculator',
      status: 'ready',
      topicIds: ['m4-equal-groups-arrays', 'm4-equal-groups-sharing', 'm4-equal-groups-review'],
      source: source({ ...MELA_4, unit: 'Equal Groups', status: 'aligned', verification: TITLE_MATCH }),
      review: { teacher: 'pending' },
    },
    {
      ...planned(
        'm4-thousands',
        'Thousands Around Us',
        'Read, write, compare and place numbers up to 10,000.',
        'hash',
        source({ ...MELA_4, unit: 'Thousands Around Us', status: 'aligned', verification: PLANNED_CHAPTER }),
      ),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 4, 'fractions', [
    {
      id: 'm4-sharing-fractions',
      title: 'Fractions in Sharing and Measuring',
      summary: 'Use halves, quarters and other fractions to share fairly and to measure.',
      intro: 'Fractions help us share fairly. They also help us measure parts of a metre, a kilogram or an hour.',
      objectives: [
        'Show a fraction of a shape with equal parts, such as 3/4 or 2/3.',
        'Explain what the top and bottom numbers of a fraction mean.',
        'Use half, a quarter and three quarters of a metre, a kilogram, a litre and an hour.',
      ],
      icon: 'pie',
      status: 'ready',
      topicIds: ['m4-fractions-equal-shares', 'm4-fractions-of-measures'],
      source: source({ ...MELA_4, unit: 'Sharing and Measuring', status: 'curriculum-inspired', verification: LIKELY_CHAPTER }),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 4, 'geometry', [
    {
      ...planned(
        'm4-symmetry',
        'Fun with Symmetry',
        'Find lines of symmetry in shapes, letters and designs.',
        'shapes',
        source({ ...MELA_4, unit: 'Fun with Symmetry', status: 'aligned', verification: PLANNED_CHAPTER }),
      ),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 4, 'measurement', [
    {
      id: 'm4-clocks-calendar',
      title: 'Clocks and Calendars',
      summary: 'Read clock times to 5 minutes, find how long things take and use a calendar.',
      intro: 'Clocks tell us the time of day, and calendars tell us the date. Learn to read both like a pro.',
      objectives: [
        'Read and show a time to 5 minutes on a clock with hands.',
        'Find how long an activity takes, in minutes.',
        'Use a calendar to find the days in each month and to count days.',
      ],
      icon: 'clock',
      status: 'ready',
      topicIds: ['m4-time-five-minutes', 'm4-time-calendar'],
      source: source({ ...MELA_4, unit: 'Ticking Clocks and Turning Calendar', status: 'aligned', verification: TITLE_MATCH }),
      review: { teacher: 'pending' },
    },
    {
      ...planned(
        'm4-measuring-length',
        'Measuring Length',
        'Measure and estimate lengths in centimetres, metres and kilometres.',
        'ruler',
        source({ ...MELA_4, unit: 'Measuring Length', status: 'aligned', verification: PLANNED_CHAPTER }),
      ),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 4, 'patterns', [
    {
      id: 'missing-numbers',
      title: 'Missing Numbers',
      summary: 'Use the equals sign like a balance to find a missing number.',
      intro: 'The equals sign means both sides have the same value, just like a balanced scale. Use that idea to find missing numbers.',
      objectives: [
        'Explain that = means both sides have the same value.',
        'Tell whether a number sentence with sums on both sides is true.',
        'Find a missing number that makes both sides equal.',
      ],
      icon: 'scale',
      status: 'ready',
      topicIds: ['missing-equals-balance', 'missing-number-find'],
      source: source({
        ...MELA_4,
        status: 'curriculum-inspired',
        verification:
          'Book verified in docs/curriculum-sources.md (ncert.nic.in, checked 21 Oct 2026). No Class 4 chapter title names the equals sign or missing numbers; the lesson follows the preparatory-stage theme of number relationships and patterns.',
      }),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 4, 'data', [
    {
      id: 'm4-data-handling',
      title: 'Data Handling',
      summary: 'Collect data in tables, show it as bar graphs and read what the bars tell us.',
      intro: 'Data is information we collect, like everyone’s favourite snack. Tables and bar graphs make it easy to understand.',
      objectives: [
        'Count data with tally marks and record it in a table.',
        'Draw a bar graph from a table using a scale.',
        'Read a bar graph to find the most, the least and differences.',
      ],
      icon: 'chart',
      status: 'ready',
      topicIds: ['m4-data-making-bar-graphs', 'm4-data-reading-bar-graphs'],
      source: source({ ...MELA_4, unit: 'Data Handling', status: 'aligned', verification: TITLE_MATCH }),
      review: { teacher: 'pending' },
    },
  ]),

  /* ---------------------------------------------------------------- Class 5 */
  ...classBranch('mathematics', 5, 'numbers', [
    {
      id: 'm5-large-numbers',
      title: 'Numbers up to One Lakh',
      summary: 'Read, write, place and compare numbers up to 1,00,000 using Indian place value.',
      intro: 'Train journeys, ticket counts and town populations use big numbers. Learn to read them with thousands and lakhs.',
      objectives: [
        'Read and write numbers up to 1,00,000 in figures and in words, using Indian commas.',
        'Tell the place value of each digit up to ten thousands.',
        'Place and compare large numbers on a number line.',
      ],
      icon: 'hash',
      status: 'ready',
      topicIds: ['m5-large-numbers-place-value', 'm5-large-numbers-number-line'],
      source: source({ ...MELA_5, unit: 'We the Travellers–I', status: 'curriculum-inspired', verification: LIKELY_CHAPTER }),
      review: { teacher: 'pending' },
    },
    {
      id: 'm5-factors-multiples',
      title: 'Multiples and Factors',
      summary: 'Find multiples by skip jumping and factors by making equal groups.',
      intro: 'A frog that always jumps 3 steps lands only on certain numbers. These are multiples, and they help us find factors too.',
      objectives: [
        'Find the multiples of a number by skip counting.',
        'Find the smallest common multiple of two small numbers.',
        'Find all the factors of a number by making equal groups or rectangles.',
      ],
      icon: 'repeat',
      status: 'ready',
      topicIds: ['m5-multiples-jumps', 'm5-factors-equal-groups'],
      source: source({ ...MELA_5, unit: 'Animal Jumps', status: 'curriculum-inspired', verification: LIKELY_CHAPTER }),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 5, 'fractions', [
    {
      id: 'm5-fractions',
      title: 'Fractions',
      summary: 'Find equivalent fractions, place fractions on a number line and compare them.',
      intro: 'Two friends can eat the same amount of roti even if one has 1/2 and the other has 2/4. Find out why, and see where fractions live on the number line.',
      objectives: [
        'Make equivalent fractions such as 1/2 = 2/4 = 3/6.',
        'Place fractions between 0 and 2 on a number line.',
        'Compare fractions with the same denominator or numerator, and compare fractions with 1/2.',
      ],
      icon: 'pie',
      status: 'ready',
      topicIds: ['m5-fractions-equivalent', 'm5-fractions-number-line', 'm5-fractions-review'],
      source: source({ ...MELA_5, unit: 'Fractions', status: 'aligned', verification: TITLE_MATCH }),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 5, 'geometry', [
    {
      ...planned(
        'm5-angles-as-turns',
        'Angles as Turns',
        'See angles as turns: quarter, half and full turns, and right angles around us.',
        'compass',
        source({ ...MELA_5, unit: 'Angles as Turns', status: 'aligned', verification: PLANNED_CHAPTER }),
      ),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 5, 'measurement', [
    {
      id: 'm5-area-perimeter',
      title: 'Area and Perimeter',
      summary: 'Measure the space inside a shape in squares and the length around its edge.',
      intro: 'How many square tiles cover a floor, and how long is the border around it? Area and perimeter answer these two questions.',
      objectives: [
        'Find the area of a shape by counting unit squares.',
        'Find the area of a rectangle by multiplying, and its perimeter by adding the sides.',
        'Show that rectangles with the same area can have different perimeters.',
      ],
      icon: 'ruler',
      status: 'ready',
      topicIds: ['m5-area-counting-squares', 'm5-area-and-perimeter'],
      source: source({ ...MELA_5, unit: "Grandmother's Quilt", status: 'curriculum-inspired', verification: LIKELY_CHAPTER }),
      review: { teacher: 'pending' },
    },
  ]),
  ...classBranch('mathematics', 5, 'data', [
    {
      ...planned(
        'm5-data-through-pictures',
        'Data Through Pictures',
        'Collect data and show it with pictographs and bar graphs.',
        'chart',
        source({ ...MELA_5, unit: 'Data Through Pictures', status: 'aligned', verification: PLANNED_CHAPTER }),
      ),
      review: { teacher: 'pending' },
    },
  ]),
];
