import type { IconKey, Lesson } from '../types.js';
import { classBranch, planned, source, type LessonSeed } from './helpers.js';

/** Social Science, Classes 1-8. */

const YEAR = '2026-27';
const REVIEW = { teacher: 'pending' } as const;

/** Classes 1-2 have no NCERT social science or EVS book (docs/curriculum-sources.md §3). */
const FOUNDATIONAL = 'NCF-SE 2023, Foundational Stage (no separate Social Science or EVS textbook in Classes 1-2)';
const NO_BOOK_CHECKED = 'NCERT offers no Class 1-2 EVS or Social Science book (ncert.nic.in textbook list, checked 21 Oct 2026; docs/curriculum-sources.md §3).';

/** Chapter titles of the NCERT books were read from the official Contents pages (prelims PDFs, Reprint 2026-27). */
const OWW_CHECKED =
  'Chapter title checked on the official Contents page (ncert.nic.in prelims PDF, Reprint 2026-27), recorded in docs/curriculum-sources.md §2.4 on 21 Oct 2026. Objectives were written from the chapter title and theme; the chapter text was not reviewed.';
const ES_CHECKED =
  'Chapter title checked on the official Contents page (ncert.nic.in prelims PDF), recorded in docs/curriculum-sources.md §2.6 on 21 Oct 2026. Objectives were written from the chapter title and theme; the chapter text was not reviewed.';
const ES_PLANNED = 'Chapter title checked on the official Contents page (ncert.nic.in prelims PDF), recorded in docs/curriculum-sources.md §2.6 on 21 Oct 2026. Lesson not written yet.';

/** "Exploring Society: India and Beyond", the NCERT Social Science book for Classes 6-8. */
const exploringSociety = (grade: 6 | 7 | 8, part?: 1 | 2) => `Exploring Society: India and Beyond, Class ${grade}${part ? `, Part ${part}` : ''}`;

/** A planned (coming soon) lesson for a verified Exploring Society chapter. */
function plannedChapter(id: string, title: string, summary: string, icon: IconKey, grade: 6 | 7 | 8, part: 1 | 2 | undefined, unit: string): LessonSeed {
  return {
    ...planned(id, title, summary, icon, source({ document: exploringSociety(grade, part), grade, academicYear: YEAR, unit, status: 'aligned', verification: ES_PLANNED })),
    review: REVIEW,
  };
}

export const SOCIAL_LESSONS: Lesson[] = [
  /* ---------------------------------------------------------------- Class 1 */
  ...classBranch('social-science', 1, 'community', [
    {
      id: 'ss1-my-family',
      title: 'My Family and Me',
      summary: 'Meet the people in a family and find safe ways to help at home.',
      intro: "Every family is special. Let's meet the people in a family and see how we can help at home.",
      objectives: [
        'Name family members such as grandparents, aunts, uncles and cousins.',
        'Say that families can be big or small, and that every family is special.',
        'Tell which jobs at home a child can help with and which are for grown-ups.',
      ],
      icon: 'home',
      status: 'ready',
      topicIds: ['ss1-family-members', 'ss1-helping-at-home', 'ss1-family-review'],
      source: source({
        document: FOUNDATIONAL,
        grade: 1,
        academicYear: YEAR,
        status: 'curriculum-inspired',
        verification: `${NO_BOOK_CHECKED} The theme follows the Foundational Stage socio-emotional domain and the family units of Class 1 Mridang ("My Family and Me") and Sarangi (परिवार), whose titles are verified there.`,
      }),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 2 */
  ...classBranch('social-science', 2, 'community', [
    {
      id: 'ss2-my-neighbourhood',
      title: 'My Neighbourhood',
      summary: 'Meet community helpers and find your way around a neighbourhood map.',
      intro: "A neighbourhood is the place around your home. Let's meet its helpers and walk its streets.",
      objectives: [
        'Name community helpers and the work they do.',
        'Find places such as the school, park, post office and hospital on a simple map.',
        'Say which helper works at which place.',
      ],
      icon: 'users',
      status: 'ready',
      topicIds: ['ss2-community-helpers', 'ss2-neighbourhood-map', 'ss2-neighbourhood-review'],
      source: source({
        document: FOUNDATIONAL,
        grade: 2,
        academicYear: YEAR,
        status: 'curriculum-inspired',
        verification: `${NO_BOOK_CHECKED} The theme follows the Class 2 Mridang unit "Going Places" ("Between Home and School", "This is My Town"), whose titles are verified there.`,
      }),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 3 */
  ...classBranch('social-science', 3, 'culture', [
    {
      id: 'ss3-festivals',
      title: 'Festivals Together',
      summary: 'Learn about national festivals and the harvest festivals celebrated across India.',
      intro: "India celebrates festivals all through the year. Let's find out what we celebrate and why.",
      objectives: [
        "Name India's national festivals and their dates.",
        'Match harvest festivals to the states where they are celebrated.',
        'Explain that festivals bring families and communities together.',
      ],
      icon: 'flag',
      status: 'ready',
      topicIds: ['ss3-national-festivals', 'ss3-harvest-festivals', 'ss3-festivals-review'],
      source: source({
        document: 'Our Wondrous World (The World Around Us), Class 3',
        grade: 3,
        academicYear: YEAR,
        unit: 'Unit 1 Our Families and Communities, Chapter 3: Celebrating Festivals',
        status: 'aligned',
        verification: OWW_CHECKED,
      }),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 4 */
  ...classBranch('social-science', 4, 'geography', [
    {
      id: 'directions-and-maps',
      title: 'Directions and Maps',
      summary: 'Find your way with North, South, East and West.',
      intro: 'Every explorer needs to know which way to go. Learn the four directions and how to read a map.',
      objectives: [
        'Name the four main directions and find them on a map.',
        'Follow directions to walk a route on a simple map.',
        'Explain what map symbols, a legend and a compass are for.',
      ],
      icon: 'compass',
      status: 'ready',
      topicIds: ['maps-directions', 'maps-reading'],
      source: source({
        document: 'Our Wondrous World (The World Around Us), Class 4',
        grade: 4,
        academicYear: YEAR,
        status: 'curriculum-inspired',
        verification:
          'No verified Class 4 chapter title is about directions or maps. Reading a neighbourhood map fits Unit 1 "Our Community" (chapter "Exploring Our Neighbourhood", title verified on ncert.nic.in, 21 Oct 2026, docs/curriculum-sources.md), but the chapter content was not checked.',
      }),
      review: REVIEW,
    },
    {
      id: 'ss4-different-lands',
      title: 'Different Lands, Different Lives',
      summary: "Discover India's mountains, deserts, plains, plateaus, coasts and islands, and how people live there.",
      intro: "India has snowy mountains, hot deserts and long sea coasts. Let's see how people live in each place.",
      objectives: [
        'Describe mountains, deserts, plains, plateaus, coasts and islands.',
        'Explain how homes, clothes and work suit each kind of land.',
        'Find the main lands of India on a simple map using directions.',
      ],
      icon: 'mountain',
      status: 'ready',
      topicIds: ['ss4-lands-and-lives', 'ss4-land-clues', 'ss4-lands-review'],
      source: source({
        document: 'Our Wondrous World (The World Around Us), Class 4',
        grade: 4,
        academicYear: YEAR,
        unit: 'Unit 5 Our Environment, Chapter 9: Different Lands, Different Lives',
        status: 'aligned',
        verification: OWW_CHECKED,
      }),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 5 */
  ...classBranch('social-science', 5, 'culture', [
    {
      id: 'ss5-vibrant-india',
      title: 'Our Vibrant Country',
      summary: "Explore India's states, languages and dances, and the unity in our diversity.",
      intro: "India has many states, languages and art forms. Let's explore how colourful our country is.",
      objectives: [
        'Say how many states and union territories India has.',
        'Match states to a main language spoken there.',
        'Tell classical dances from folk dances and name their states.',
        'Explain what unity in diversity means.',
      ],
      icon: 'palette',
      status: 'ready',
      topicIds: ['ss5-states-languages', 'ss5-dances', 'ss5-vibrant-review'],
      source: source({
        document: 'Our Wondrous World (The World Around Us), Class 5',
        grade: 5,
        academicYear: YEAR,
        unit: 'Unit 3 Incredible India, Chapter 5: Our Vibrant Country',
        status: 'curriculum-inspired',
        verification:
          'Chapter title verified on the official Contents page (ncert.nic.in prelims PDF, Reprint 2026-27; docs/curriculum-sources.md §2.4, 21 Oct 2026). The title suggests India’s cultural variety, but which languages and art forms the chapter covers was not checked, so the lesson is not marked aligned.',
      }),
      review: REVIEW,
    },
  ]),

  /* ---------------------------------------------------------------- Class 6 */
  ...classBranch('social-science', 6, 'community', [
    {
      id: 'ss6-grassroots-democracy',
      title: 'Grassroots Democracy',
      summary: 'Learn how villages, towns and cities govern themselves through elected local bodies.',
      intro: 'Who repairs the village hand pump or the city’s street lights? Meet the local governments people elect close to home.',
      objectives: [
        'Describe the three levels of Panchayati Raj and the role of the Gram Sabha.',
        'Name urban local bodies such as municipal corporations and municipal councils, and who leads them.',
        'Decide which local body can help with an everyday problem.',
      ],
      icon: 'users',
      status: 'ready',
      topicIds: ['ss6-panchayati-raj', 'ss6-urban-local-government', 'ss6-democracy-review'],
      source: source({
        document: exploringSociety(6),
        grade: 6,
        academicYear: YEAR,
        unit: 'Theme D, Chapters 10-12: Grassroots Democracy, Part 1 Governance; Part 2 Local Government in Rural Areas; Part 3 Local Government in Urban Areas',
        status: 'aligned',
        verification: ES_CHECKED,
      }),
      review: REVIEW,
    },
  ]),
  ...classBranch('social-science', 6, 'geography', [
    plannedChapter('ss6-locating-places', 'Locating Places on the Earth', 'Use maps, globes, latitudes and longitudes to find places on the Earth.', 'globe', 6, undefined, 'Theme A, Chapter 1: Locating Places on the Earth'),
    plannedChapter('ss6-landforms-and-life', 'Landforms and Life', 'Mountains, plateaus and plains, and how they shape the way people live.', 'mountain', 6, undefined, 'Theme A, Chapter 3: Landforms and Life'),
  ]),
  ...classBranch('social-science', 6, 'history', [
    {
      id: 'ss6-timelines-and-sources',
      title: 'Timelines and Sources of History',
      summary: 'Read timelines with BCE and CE years, and learn how historians use sources.',
      intro: 'History is the story of the people who lived before us. Learn how we count the years and how historians find clues about the past.',
      objectives: [
        'Place years, including BCE years, in order on a timeline.',
        'Work out the century a year belongs to.',
        'Tell written sources from material remains, and say what archaeologists do.',
      ],
      icon: 'scroll',
      status: 'ready',
      topicIds: ['ss6-timelines', 'ss6-sources'],
      source: source({
        document: exploringSociety(6),
        grade: 6,
        academicYear: YEAR,
        unit: 'Theme B, Chapter 4: Timeline and Sources of History',
        status: 'aligned',
        verification: ES_CHECKED,
      }),
      review: REVIEW,
    },
  ]),
  ...classBranch('social-science', 6, 'economics', [
    plannedChapter('ss6-economic-activities', 'Economic Activities Around Us', 'How people earn a living in farming, making things and services.', 'coins', 6, undefined, 'Theme E, Chapter 14: Economic Activities Around Us'),
  ]),

  /* ---------------------------------------------------------------- Class 7 */
  ...classBranch('social-science', 7, 'community', [
    {
      id: 'ss7-constitution',
      title: 'The Constitution of India',
      summary: "Learn how India's Constitution was made and what rights and duties it gives citizens.",
      intro: 'The Constitution is the rule book of our democracy. Discover how it was written and what it means for you.',
      objectives: [
        'Place the key dates in the making of the Constitution on a timeline.',
        'Explain the Preamble, Fundamental Rights and Fundamental Duties in simple words.',
        'Tell Fundamental Rights apart from Fundamental Duties.',
      ],
      icon: 'scroll',
      status: 'ready',
      topicIds: ['ss7-making-constitution', 'ss7-constitution-ideas', 'ss7-rights-duties-review'],
      source: source({
        document: exploringSociety(7, 1),
        grade: 7,
        academicYear: YEAR,
        unit: 'Theme D, Chapter 10: The Constitution of India — An Introduction',
        status: 'aligned',
        verification: ES_CHECKED,
      }),
      review: REVIEW,
    },
  ]),
  ...classBranch('social-science', 7, 'geography', [
    plannedChapter('ss7-weather-and-climate', 'Weather and Climates of India', 'What weather is, how it is measured, and the different climates found across India.', 'cloud', 7, 1, 'Theme A, Chapters 2-3: Understanding the Weather; Climates of India'),
  ]),
  ...classBranch('social-science', 7, 'history', [
    plannedChapter('ss7-rise-of-empires', 'The Rise of Empires', 'How large kingdoms and empires grew in ancient India.', 'landmark', 7, 1, 'Theme B, Chapter 5: The Rise of Empires'),
  ]),
  ...classBranch('social-science', 7, 'economics', [
    {
      id: 'ss7-barter-to-money',
      title: 'From Barter to Money',
      summary: 'Discover why people moved from swapping goods to using money, and what money does for us.',
      intro: 'Imagine swapping rice for shoes every time you went shopping! Find out how money made trade easier.',
      objectives: [
        'Explain barter and the problem of the double coincidence of wants.',
        'Describe the main functions of money.',
        'Use prices in rupees to compare the value of goods.',
      ],
      icon: 'coins',
      status: 'ready',
      topicIds: ['ss7-barter-and-money', 'ss7-prices'],
      source: source({
        document: exploringSociety(7, 1),
        grade: 7,
        academicYear: YEAR,
        unit: 'Theme E, Chapter 11: From Barter to Money',
        status: 'aligned',
        verification: ES_CHECKED,
      }),
      review: REVIEW,
    },
    plannedChapter('ss7-understanding-markets', 'Understanding Markets', 'How buyers and sellers meet in markets, from weekly haats to online shops.', 'coins', 7, 1, 'Theme E, Chapter 12: Understanding Markets'),
  ]),

  /* ---------------------------------------------------------------- Class 8 */
  ...classBranch('social-science', 8, 'community', [
    plannedChapter('ss8-elections', "Universal Franchise and India's Electoral System", 'How every adult citizen gets to vote, and how elections are run in India.', 'users', 8, 1, "Theme D, Chapter 5: Universal Franchise and India's Electoral System"),
  ]),
  ...classBranch('social-science', 8, 'history', [
    plannedChapter('ss8-colonial-era', 'The Colonial Era in India', 'How European trading companies came to rule India, and what it meant for its people.', 'landmark', 8, 1, 'Theme B, Chapter 4: The Colonial Era in India'),
  ]),
  ...classBranch('social-science', 8, 'economics', [
    {
      id: 'ss8-natural-resources',
      title: 'Natural Resources and Their Use',
      summary: 'Learn about renewable and non-renewable resources and how to use them sustainably.',
      intro: 'Water, soil, forests, coal and sunlight are gifts of nature. Find out which can run out and how to use them wisely.',
      objectives: [
        'Classify natural resources as renewable or non-renewable.',
        'Build and read a chart of water use, and suggest ways to save water.',
        'Explain sustainable development and ways to conserve resources.',
      ],
      icon: 'leaf',
      status: 'ready',
      topicIds: ['ss8-resource-types', 'ss8-water-use', 'ss8-resources-review'],
      source: source({
        document: exploringSociety(8, 1),
        grade: 8,
        academicYear: YEAR,
        unit: 'Theme A, Chapter 1: Natural Resources and Their Use',
        status: 'aligned',
        verification: ES_CHECKED,
      }),
      review: REVIEW,
    },
    plannedChapter('ss8-factors-of-production', 'Factors of Production', 'Land, labour, capital and enterprise: what it takes to produce goods and services.', 'cog', 8, 1, 'Theme E, Chapter 7: Factors of Production'),
  ]),
];
