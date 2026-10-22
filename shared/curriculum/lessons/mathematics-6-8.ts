import type { AlignmentStatus, ContentReview, CurriculumSource, Grade, Lesson } from '../types.js';
import { classBranch, planned, source } from './helpers.js';

/**
 * Mathematics, Classes 6-8. Objectives and sequence follow NCERT Ganita Prakash
 * (Class 6; Class 7 Parts I and II; Class 8 Parts I and II), as listed in
 * docs/curriculum-sources.md. Lessons are original Laarish content.
 */

const YEAR = '2026-27';
const PENDING: ContentReview = { teacher: 'pending' };

const GP6 = 'Ganita Prakash, Class 6';
const GP7_1 = 'Ganita Prakash, Class 7 Part I';
const GP7_2 = 'Ganita Prakash, Class 7 Part II';
const GP8_1 = 'Ganita Prakash, Class 8 Part I';
const GP8_2 = 'Ganita Prakash, Class 8 Part II';
const BOOK_CODES: Record<string, string> = { [GP6]: 'fegp1', [GP7_1]: 'gegp1', [GP7_2]: 'gegp2', [GP8_1]: 'hegp1', [GP8_2]: 'hegp2' };

const checked = (document: string) =>
  `Chapter title checked in the official contents of ${document} (book code ${BOOK_CODES[document]}, ncert.nic.in), as listed and verified in docs/curriculum-sources.md on 21 Oct 2026.`;

/** A lesson whose objectives match one verified chapter. */
const aligned = (grade: Grade, document: string, unit: string): CurriculumSource =>
  source({
    document,
    grade,
    academicYear: YEAR,
    unit,
    status: 'aligned',
    verification: `${checked(document)} Objectives were mapped to the chapter title and the class level; the chapter text was not compared.`,
  });

/** A real chapter of the class whose lesson is not written yet. */
const plannedFrom = (grade: Grade, document: string, unit: string): CurriculumSource =>
  source({
    document,
    grade,
    academicYear: YEAR,
    unit,
    status: 'curriculum-inspired' satisfies AlignmentStatus,
    verification: `${checked(document)} Planned lesson for this chapter; no objectives have been written or mapped yet.`,
  });

export const MATHS_6_8_LESSONS: Lesson[] = [
  /* ============================================================ Class 6 */
  ...classBranch('mathematics', 6, 'numbers', [
    {
      id: 'm6-other-side-of-zero',
      title: 'The Other Side of Zero',
      summary: 'Use negative numbers for temperatures, floors and sea level, and add and subtract them on a number line.',
      intro: 'Some numbers live on the other side of zero. Let us find them on the number line and learn to jump with them.',
      objectives: [
        'Place positive and negative integers on a number line and compare them.',
        'Use integers to describe everyday situations such as temperatures below zero and floors below the ground.',
        'Add and subtract integers by jumping along a number line.',
      ],
      icon: 'thermometer',
      status: 'ready',
      topicIds: ['m6-integers-number-line', 'm6-integers-jumps', 'm6-integers-review'],
      source: aligned(6, GP6, 'The Other Side of Zero'),
      review: PENDING,
    },
    {
      ...planned('m6-prime-time', 'Prime Time', 'Find factors and multiples, and tell prime numbers from composite numbers.', 'hash', plannedFrom(6, GP6, 'Prime Time')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 6, 'fractions', [
    { ...planned('m6-fractions', 'Fractions', 'Read, compare and add fractions using fraction strips and number lines.', 'pie', plannedFrom(6, GP6, 'Fractions')), review: PENDING },
  ]),
  ...classBranch('mathematics', 6, 'geometry', [
    { ...planned('m6-lines-and-angles', 'Lines and Angles', 'Name points, lines, rays and angles, and measure angles in degrees.', 'triangle', plannedFrom(6, GP6, 'Lines and Angles')), review: PENDING },
  ]),
  ...classBranch('mathematics', 6, 'measurement', [
    {
      id: 'm6-perimeter-and-area',
      title: 'Perimeter and Area',
      summary: 'Find the perimeter and area of rectangles and squares on a grid.',
      intro: 'Perimeter is the distance around a shape, and area is the space it covers. Let us build rectangles on a grid to see the difference.',
      objectives: [
        'Find the perimeter of a rectangle or square by adding its sides or using a rule.',
        'Find the area of a rectangle by counting unit squares or multiplying length by width.',
        'Show that rectangles with the same area can have different perimeters.',
      ],
      icon: 'ruler',
      status: 'ready',
      topicIds: ['m6-perimeter-rectangles', 'm6-area-rectangles'],
      source: aligned(6, GP6, 'Perimeter and Area'),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 6, 'patterns', [
    {
      ...planned('m6-patterns-in-maths', 'Patterns in Mathematics', 'Spot and extend number and shape patterns, such as triangular and square numbers.', 'repeat', plannedFrom(6, GP6, 'Patterns in Mathematics')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 6, 'data', [
    {
      id: 'm6-data-handling',
      title: 'Data Handling and Presentation',
      summary: 'Organise data with tally marks and tables, then draw and read bar graphs with a scale.',
      intro: 'Data is information we collect, like the favourite snacks of your class. Let us organise it and show it as a bar graph.',
      objectives: [
        'Organise raw data using tally marks and a frequency table.',
        'Draw a bar graph using a suitable scale.',
        'Read a bar graph to compare data and answer questions.',
      ],
      icon: 'chart',
      status: 'ready',
      topicIds: ['m6-data-bar-graphs', 'm6-data-reading-graphs'],
      source: aligned(6, GP6, 'Data Handling and Presentation'),
      review: PENDING,
    },
  ]),

  /* ============================================================ Class 7 */
  ...classBranch('mathematics', 7, 'numbers', [
    {
      id: 'm7-arithmetic-expressions',
      title: 'Arithmetic Expressions',
      summary: 'Read expressions as sums of terms, use brackets, and compare expressions without always calculating.',
      intro: 'An expression like 30 − 5 × 4 can be read in only one right way. Let us learn the rules, then use them to spot equal expressions quickly.',
      objectives: [
        'Find the value of an expression by working out its terms, including expressions with brackets.',
        'Explain how brackets change the value of an expression.',
        'Tell whether two expressions are equal by looking at how their terms change.',
      ],
      icon: 'calculator',
      status: 'ready',
      topicIds: ['m7-expressions-terms-brackets', 'm7-expressions-equal'],
      source: aligned(7, GP7_1, 'Arithmetic Expressions'),
      review: PENDING,
    },
    {
      ...planned('m7-large-numbers', 'Large Numbers Around Us', 'Read, write and estimate lakhs and crores, and compare them with thousands and millions.', 'hash', plannedFrom(7, GP7_1, 'Large Numbers Around Us')),
      review: PENDING,
    },
    {
      ...planned('m7-operations-with-integers', 'Operations with Integers', 'Add, subtract, multiply and divide integers.', 'plus', plannedFrom(7, GP7_2, 'Operations with Integers')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 7, 'fractions', [
    {
      id: 'm7-peek-beyond-point',
      title: 'A Peek Beyond the Point',
      summary: 'Use tenths and hundredths to measure, place decimals on a number line, and compare and add them.',
      intro: 'Some measurements fall between whole numbers, like 4 cm and 7 mm, and decimals let us write them exactly. Let us peek beyond the decimal point!',
      objectives: [
        'Write measurements and money using tenths and hundredths, such as 4.7 cm and ₹12.75.',
        'Place decimal numbers on a number line.',
        'Compare decimals and add simple decimals.',
      ],
      icon: 'ruler',
      status: 'ready',
      topicIds: ['m7-decimals-tenths', 'm7-decimals-hundredths', 'm7-decimals-review'],
      source: aligned(7, GP7_1, 'A Peek Beyond the Point'),
      review: PENDING,
    },
    {
      ...planned('m7-working-with-fractions', 'Working with Fractions', 'Multiply and divide fractions, and find a fraction of a fraction.', 'pie', plannedFrom(7, GP7_1, 'Working with Fractions')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 7, 'geometry', [
    {
      ...planned('m7-parallel-intersecting-lines', 'Parallel and Intersecting Lines', 'Identify parallel and intersecting lines and the angles formed where lines meet.', 'shapes', plannedFrom(7, GP7_1, 'Parallel and Intersecting Lines')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 7, 'algebra', [
    {
      id: 'letters-for-numbers',
      title: 'Letters for Numbers',
      summary: 'Use a letter for an unknown number and solve simple equations.',
      intro: 'In algebra, a letter such as x stands for a number we do not know yet. Keep the equation balanced to find it.',
      objectives: [
        'Explain that a letter such as x can stand for an unknown number.',
        'Solve one-step equations such as x + 5 = 12 by doing the same to both sides.',
        'Check a solution by putting it back into the equation.',
      ],
      icon: 'variable',
      status: 'ready',
      topicIds: ['algebra-letters', 'algebra-one-step'],
      source: source({
        document: 'Ganita Prakash, Class 7, Parts I and II',
        grade: 7,
        academicYear: YEAR,
        unit: 'Expressions using Letter-Numbers; Finding the Unknown',
        status: 'curriculum-inspired',
        verification:
          'Chapter titles checked in the official contents of Ganita Prakash Class 7 Part I (gegp1: Ch. 4 "Expressions using Letter-Numbers") and Part II (gegp2: Ch. 7 "Finding the Unknown"), as listed and verified in docs/curriculum-sources.md on 21 Oct 2026. None of the Class 6 chapter titles is about algebra with letters, so Class 7 is the right class. This lesson predates the expansion and introduces both chapters at a simple level (one-step equations), so it is curriculum-inspired rather than aligned to a single chapter.',
      }),
      review: PENDING,
    },
    {
      ...planned('m7-letter-number-expressions', 'Expressions using Letter-Numbers', 'Write expressions such as 5n + 3 for patterns and situations, simplify them and find their values.', 'variable', plannedFrom(7, GP7_1, 'Expressions using Letter-Numbers')),
      review: PENDING,
    },
  ]),

  /* ============================================================ Class 8 */
  ...classBranch('mathematics', 8, 'numbers', [
    {
      id: 'm8-power-play',
      title: 'Power Play',
      summary: 'Write repeated multiplication as powers and use the rules for multiplying and dividing powers.',
      intro: 'Fold a sheet of paper in half again and again, and the layers double each time. Powers are a short way to write such fast-growing numbers.',
      objectives: [
        'Write repeated multiplication using a base and an exponent, and find the value of a power.',
        'Use powers of 10 to write large numbers such as a lakh and a crore.',
        'Multiply and divide powers of the same base by adding or subtracting exponents.',
      ],
      icon: 'zap',
      status: 'ready',
      topicIds: ['m8-powers-exponents', 'm8-powers-rules'],
      source: aligned(8, GP8_1, 'Power Play'),
      review: PENDING,
    },
    {
      ...planned('m8-square-and-cube', 'A Square and A Cube', 'Find squares, cubes, square roots and cube roots, and spot their patterns.', 'shapes', plannedFrom(8, GP8_1, 'A Square and A Cube')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 8, 'fractions', [
    {
      id: 'm8-proportional-reasoning',
      title: 'Proportional Reasoning',
      summary: 'Compare quantities with ratios, find equal ratios and decide when two quantities are in proportion.',
      intro: 'If 3 cups of rice go with 1 cup of dal, how much rice goes with 4 cups of dal? Ratios and proportion answer such questions.',
      objectives: [
        'Write a ratio and simplify it, and find equal ratios.',
        'Decide whether two ratios are in proportion.',
        'Use proportion to scale recipes, maps and prices up or down.',
      ],
      icon: 'scale',
      status: 'ready',
      topicIds: ['m8-ratios-equal', 'm8-proportion-check'],
      source: aligned(8, GP8_1, 'Proportional Reasoning-1'),
      review: PENDING,
    },
    {
      id: 'm8-percentages',
      title: 'Percentages',
      summary: 'Understand per cent as "out of 100", convert between fractions and percentages, and find a percentage of an amount.',
      intro: 'Per cent means out of a hundred, so a percentage is really a fraction in disguise with 100 at the bottom. Let us unmask it!',
      objectives: [
        'Explain that a percentage is a fraction with denominator 100.',
        'Convert between fractions, decimals and percentages.',
        'Find a percentage of an amount and work out a discount.',
      ],
      icon: 'percent',
      status: 'ready',
      topicIds: ['m8-percent-meaning', 'm8-percent-of-amount'],
      source: source({
        document: GP8_2,
        grade: 8,
        academicYear: YEAR,
        unit: 'Fractions in Disguise',
        status: 'curriculum-inspired',
        verification: `${checked(GP8_2)} The chapter title suggests percentages (fractions written as parts of 100), but the chapter text was not read, so this lesson is curriculum-inspired rather than aligned.`,
      }),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 8, 'geometry', [
    {
      ...planned('m8-quadrilaterals', 'Quadrilaterals', 'Classify quadrilaterals and use the properties of parallelograms, rhombuses, rectangles and squares.', 'shapes', plannedFrom(8, GP8_1, 'Quadrilaterals')),
      review: PENDING,
    },
    {
      ...planned('m8-baudhayana-pythagoras', 'The Baudhayana-Pythagoras Theorem', 'Relate the sides of a right-angled triangle and use the theorem to find unknown lengths.', 'triangle', plannedFrom(8, GP8_2, 'The Baudhayana-Pythagoras Theorem')),
      review: PENDING,
    },
  ]),
  ...classBranch('mathematics', 8, 'measurement', [
    { ...planned('m8-area', 'Area', 'Find the areas of triangles, parallelograms and other figures by cutting and rearranging shapes.', 'ruler', plannedFrom(8, GP8_2, 'Area')), review: PENDING },
  ]),
  ...classBranch('mathematics', 8, 'algebra', [
    {
      id: 'm8-solving-equations',
      title: 'Solving Equations',
      summary: 'Solve equations with the unknown on one or both sides by keeping the balance, and use them to crack word puzzles.',
      intro: 'Think of a number, multiply it by 3 and add 12, and you get 60: what was the number? Equations solve such puzzles, one balanced step at a time.',
      objectives: [
        'Solve equations such as 3x + 4 = 19 by doing the same to both sides.',
        'Solve equations with the unknown on both sides, such as 3x + 2 = x + 10.',
        'Write an equation for a word puzzle, solve it and check the answer.',
      ],
      icon: 'variable',
      status: 'ready',
      topicIds: ['m8-equations-two-step', 'm8-equations-both-sides', 'm8-equations-review'],
      source: source({
        document: 'Ganita Prakash, Class 8, Parts I and II',
        grade: 8,
        academicYear: YEAR,
        status: 'curriculum-inspired',
        verification:
          'Chapter titles of Ganita Prakash Class 8 Part I (hegp1) and Part II (hegp2) checked in docs/curriculum-sources.md (verified 21 Oct 2026). No Class 8 chapter title names equations. The lesson extends Class 7 "Finding the Unknown" (Part II, Ch. 7) and fits the Class 8 algebra chapters ("We Distribute, Yet Things Multiply", "Algebra Play"), whose text was not checked, so it is curriculum-inspired.',
      }),
      review: PENDING,
    },
    {
      ...planned('m8-distributive-property', 'We Distribute, Yet Things Multiply', 'Use the distributive property to multiply expressions and discover useful identities.', 'variable', plannedFrom(8, GP8_1, 'We Distribute, Yet Things Multiply')),
      review: PENDING,
    },
  ]),
];
