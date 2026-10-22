import type { ContentReview, Lesson } from '../types.js';
import { classBranch, planned, source } from './helpers.js';

/**
 * Science (The World Around Us), Classes 1-5.
 *
 * Classes 1-2: NCERT has no Science or EVS textbook (Foundational Stage, NCF-SE 2023), so these
 * lessons are curriculum-inspired. Classes 3-5: lessons follow the science chapters of
 * "Our Wondrous World" (The World Around Us). Social themes of that book (family, community,
 * festivals, travel, maps) belong to Social Science. See docs/curriculum-sources.md.
 */

const ACADEMIC_YEAR = '2026-27';
const REVIEW: ContentReview = { teacher: 'pending' };

const WONDROUS_BOOKS: Record<3 | 4 | 5, string> = {
  3: 'The World Around Us: Our Wondrous World, Class 3 (ceev1)',
  4: 'The World Around Us: Our Wondrous World, Class 4 (deev1)',
  5: 'The World Around Us: Our Wondrous World, Class 5 (eeev1)',
};

/** Classes 3-5: a written lesson whose objectives follow a verified chapter of Our Wondrous World. */
const wondrous = (grade: 3 | 4 | 5, unit: string) =>
  source({
    document: WONDROUS_BOOKS[grade],
    grade,
    academicYear: ACADEMIC_YEAR,
    unit,
    status: 'aligned',
    verification:
      'Chapter title verified on the official NCERT prelims (Reprint 2026-27), recorded in docs/curriculum-sources.md §2.4 (21 Oct 2026). Objectives mapped to the chapter title and theme; the chapter text was not compared line by line.',
  });

/** Classes 3-5: a verified chapter whose lesson is not written yet. */
const wondrousPlanned = (grade: 3 | 4 | 5, unit: string, note = '') =>
  source({
    document: WONDROUS_BOOKS[grade],
    grade,
    academicYear: ACADEMIC_YEAR,
    unit,
    status: 'curriculum-inspired',
    verification: `Chapter title verified on the official NCERT prelims (Reprint 2026-27), recorded in docs/curriculum-sources.md §2.4 (21 Oct 2026). Lesson not written yet; the summary is based on the chapter title, and objectives will be mapped when the lesson is written.${note}`,
  });

/** Classes 1-2: no textbook for this area, so lessons follow the Foundational Stage's themes. */
const foundational = (grade: 1 | 2) =>
  source({
    document: 'NCF-SE 2023, Foundational Stage (no separate Science/EVS textbook for this class)',
    grade,
    academicYear: ACADEMIC_YEAR,
    status: 'curriculum-inspired',
    verification:
      'docs/curriculum-sources.md §3 and §5 (checked 21 Oct 2026): NCERT offers no Science or EVS book for Classes 1-2, and The World Around Us starts in Grade 3. Theme chosen to fit the Foundational Stage; not mapped to a textbook chapter.',
  });

export const SCIENCE_1_5_LESSONS: Lesson[] = [
  /* ============================================================== Class 1 */
  ...classBranch('science', 1, 'biology', [
    {
      id: 's1-my-body',
      title: 'My Body and My Senses',
      summary: 'Name the parts of your body and the five senses that help you know the world.',
      intro: "Your body can do so many things! Let's name its parts and find out how you see, hear, smell, taste and feel.",
      objectives: [
        'Name the main parts of the body and say what each helps us do.',
        'Name the five senses and the body part used for each.',
        'Sort body parts into those that help us sense and those that help us move.',
      ],
      icon: 'hand',
      status: 'ready',
      topicIds: ['s1-body-parts', 's1-five-senses', 's1-body-review'],
      source: foundational(1),
      review: REVIEW,
    },
  ]),
  ...classBranch('science', 1, 'chemistry', [
    {
      id: 's1-things-around-me',
      title: 'Things Around Me',
      summary: 'Find out what everyday things are made of, and why.',
      intro: "Look around you! Things are made of wood, metal, cloth, plastic and glass. Let's find out what they are made of and why.",
      objectives: ['Say what common things at home and school are made of.', 'Sort objects by material: wood, metal or cloth.', 'Say why a material is chosen for a job.'],
      icon: 'box',
      status: 'ready',
      topicIds: ['s1-made-of', 's1-right-material'],
      source: foundational(1),
      review: REVIEW,
    },
  ]),

  /* ============================================================== Class 2 */
  ...classBranch('science', 2, 'biology', [
    {
      id: 's2-living-things',
      title: 'Living and Non-living Things',
      summary: 'Find out what makes something alive and what all living things need.',
      intro: "A puppy grows, but a pencil does not. Let's find out how we can tell what is living!",
      objectives: [
        'Sort things around us into living and non-living.',
        'Name signs of life: growing, breathing, needing food and water, and having young ones.',
        'Say what plants and animals need to stay alive.',
      ],
      icon: 'sprout',
      status: 'ready',
      topicIds: ['s2-living-or-not', 's2-signs-of-life'],
      source: foundational(2),
      review: REVIEW,
    },
  ]),
  ...classBranch('science', 2, 'environment', [
    {
      id: 's2-weather',
      title: 'Weather and Seasons',
      summary: 'Watch the weather, keep a weather chart and learn how the seasons change.',
      intro: "Is it sunny, cloudy, rainy or windy today? Let's watch the weather, make a chart and learn about the seasons.",
      objectives: [
        'Describe the weather as sunny, cloudy, rainy or windy.',
        'Record the weather in a bar chart and read which weather happened most.',
        'Name the seasons and what we wear and see in each.',
      ],
      icon: 'cloud',
      status: 'ready',
      topicIds: ['s2-weather-chart', 's2-seasons', 's2-weather-review'],
      source: foundational(2),
      review: REVIEW,
    },
  ]),

  /* ============================================================== Class 3 */
  ...classBranch('science', 3, 'biology', [
    {
      id: 's3-plants',
      title: 'Getting to Know Plants',
      summary: 'Explore the parts of a plant and the different kinds of plants around us.',
      intro: "Plants are everywhere: in pots, parks and fields. Let's discover their parts and the different kinds of plants.",
      objectives: [
        'Name the parts of a plant and say what each part does.',
        'Group plants into trees, shrubs and herbs.',
        'Name the plant part in foods we eat, and say how to care for a plant.',
      ],
      icon: 'leaf',
      status: 'ready',
      topicIds: ['s3-plant-parts', 's3-trees-shrubs-herbs', 's3-plants-review'],
      source: wondrous(3, 'Chapter 4: Getting to Know Plants'),
      review: REVIEW,
    },
    { ...planned('s3-plants-animals-together', 'Plants and Animals Live Together', 'How plants and animals depend on each other for food and shelter.', 'bird', wondrousPlanned(3, 'Chapter 5: Plants and Animals Live Together')), review: REVIEW },
    { ...planned('s3-food-we-eat', 'Food We Eat', 'Where our food comes from and the different foods we eat.', 'utensils', wondrousPlanned(3, 'Chapter 8: Food We Eat')), review: REVIEW },
    { ...planned('s3-healthy-happy', 'Staying Healthy and Happy', 'Everyday habits that keep our bodies and minds healthy.', 'heart', wondrousPlanned(3, 'Chapter 9: Staying Healthy and Happy')), review: REVIEW },
  ]),
  ...classBranch('science', 3, 'chemistry', [
    { ...planned('s3-world-of-things', 'This World of Things', 'The materials everyday things are made of, and what they are like.', 'box', wondrousPlanned(3, 'Chapter 10: This World of Things')), review: REVIEW },
  ]),
  ...classBranch('science', 3, 'environment', [
    {
      id: 's3-waste',
      title: 'Taking Charge of Waste',
      summary: 'Sort waste into wet and dry, and make less waste with reduce, reuse and recycle.',
      intro: "Every day, homes and schools throw away waste. Let's learn to sort it and to make less of it!",
      objectives: [
        'Sort waste into wet waste (green bin) and dry waste (blue bin).',
        'Explain reduce, reuse and recycle with examples.',
        'Suggest ways to make less waste at home and school.',
      ],
      icon: 'repeat',
      status: 'ready',
      topicIds: ['s3-wet-dry-waste', 's3-three-rs'],
      source: wondrous(3, 'Chapter 12: Taking Charge of Waste'),
      review: REVIEW,
    },
    { ...planned('s3-water', 'Water: A Precious Gift', 'Where we get water, how we use it and how to save it.', 'droplets', wondrousPlanned(3, 'Chapter 7: Water—A Precious Gift')), review: REVIEW },
  ]),

  /* ============================================================== Class 4 */
  ...classBranch('science', 4, 'biology', [
    {
      id: 's4-food-health',
      title: 'Food for Health',
      summary: 'Learn the jobs of different foods and plan a balanced tiffin.',
      intro: "Food gives us energy to play, helps us grow and keeps us well. Let's find out which foods do which job!",
      objectives: [
        'Group foods into energy-giving, body-building and protective foods.',
        'Plan a balanced meal with food from each group.',
        'Read and build a bar chart from a food survey.',
      ],
      icon: 'apple',
      status: 'ready',
      topicIds: ['s4-food-groups', 's4-tiffin-survey'],
      source: wondrous(4, 'Chapter 5: Food for Health'),
      review: REVIEW,
    },
    { ...planned('s4-nature-trail', 'Nature Trail', 'Explore and observe the living things around us.', 'tree', wondrousPlanned(4, 'Chapter 3: Nature Trail')), review: REVIEW },
    { ...planned('s4-growing-with-nature', 'Growing up with Nature', 'How we live, grow and learn alongside nature.', 'sprout', wondrousPlanned(4, 'Chapter 4: Growing up with Nature')), review: REVIEW },
    { ...planned('s4-healthy-living', 'Happy and Healthy Living', 'Habits that keep our bodies and minds healthy.', 'heart', wondrousPlanned(4, 'Chapter 6: Happy and Healthy Living')), review: REVIEW },
  ]),
  ...classBranch('science', 4, 'physics', [
    {
      ...planned(
        's4-how-things-work',
        'How Things Work',
        'Explore how simple toys move, and why some things float while others sink.',
        'cog',
        wondrousPlanned(4, 'Chapter 7: How Things Work', ' For this chapter the summary also names themes (spinning toys, floating and sinking) reported only by secondary study guides.'),
      ),
      review: REVIEW,
    },
  ]),
  ...classBranch('science', 4, 'chemistry', [
    { ...planned('s4-how-things-made', 'How Things are Made', 'The materials and steps that go into making everyday things.', 'box', wondrousPlanned(4, 'Chapter 8: How Things are Made')), review: REVIEW },
  ]),
  ...classBranch('science', 4, 'environment', [
    {
      id: 's4-our-sky',
      title: 'Our Sky',
      summary: 'Explore the Sun, the Moon and the stars, and how shadows change during the day.',
      intro: "Look up! By day the Sun lights the sky, and by night the Moon and stars appear. Let's explore our sky.",
      objectives: [
        'Explain how shadows form and why they change length during the day.',
        'Describe how the Moon seems to change shape over about a month, and why it shines.',
        'Know that stars are very distant suns, and tell the day sky from the night sky.',
      ],
      icon: 'moon',
      status: 'ready',
      topicIds: ['s4-sun-shadows', 's4-moon-stars', 's4-sky-review'],
      source: wondrous(4, 'Chapter 10: Our Sky'),
      review: REVIEW,
    },
  ]),

  /* ============================================================== Class 5 */
  ...classBranch('science', 5, 'physics', [
    {
      id: 's5-energy',
      title: 'Energy: How Things Work',
      summary: 'Discover forms of energy, where energy comes from and how to save it.',
      intro: "Everything that moves, glows, heats up or makes a sound uses energy. Let's find out where energy comes from and how to save it!",
      objectives: [
        'Name forms of energy: light, heat, sound, movement and electrical energy.',
        'Say what energy change happens in common machines, and use electricity safely.',
        'Tell renewable sources of energy from non-renewable ones, and suggest ways to save energy.',
      ],
      icon: 'zap',
      status: 'ready',
      topicIds: ['s5-forms-of-energy', 's5-energy-sources'],
      source: wondrous(5, 'Chapter 7: Energy—How Things Work'),
      review: REVIEW,
    },
  ]),
  ...classBranch('science', 5, 'chemistry', [
    { ...planned('s5-clothes', 'Clothes: How Things are Made', 'Where the fibres in our clothes come from, and how cloth is made.', 'palette', wondrousPlanned(5, 'Chapter 8: Clothes—How Things are Made')), review: REVIEW },
  ]),
  ...classBranch('science', 5, 'biology', [
    { ...planned('s5-mystery-of-food', 'The Mystery of Food', 'Explore the food we eat and what happens to it.', 'utensils', wondrousPlanned(5, 'Chapter 3: The Mystery of Food')), review: REVIEW },
  ]),
  ...classBranch('science', 5, 'environment', [
    {
      id: 's5-water',
      title: 'Water: The Essence of Life',
      summary: 'Water in three states, the water cycle, and how to save every drop.',
      intro: "Water can be ice, liquid or invisible vapour, and it travels round and round between the sky and the Earth. Let's follow it!",
      objectives: [
        'Describe water as a solid, a liquid and a gas, and name the changes between them.',
        'Explain the water cycle: evaporation, condensation, precipitation and collection.',
        'Read a water-use chart and suggest ways to save water.',
      ],
      icon: 'droplets',
      status: 'ready',
      topicIds: ['s5-states-of-water', 's5-water-cycle', 's5-water-review'],
      source: wondrous(5, 'Chapter 1: Water—The Essence of Life'),
      review: REVIEW,
    },
    { ...planned('s5-rhythms-of-nature', 'Rhythms of Nature', 'Notice the patterns that repeat in nature around us.', 'repeat', wondrousPlanned(5, 'Chapter 9: Rhythms of Nature')), review: REVIEW },
    { ...planned('s5-earth-home', 'Earth: Our Shared Home', 'Caring for the Earth that all living things share.', 'globe', wondrousPlanned(5, 'Chapter 10: Earth—Our Shared Home')), review: REVIEW },
  ]),
];
