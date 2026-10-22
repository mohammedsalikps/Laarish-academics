import type { CurriculumSource, IconKey, Lesson } from '../types.js';
import { classBranch, planned, source, type LessonSeed } from './helpers.js';

/**
 * Science, Classes 6-8, mapped to NCERT Curiosity (Grades 6, 7 and 8).
 * Chapter titles come from docs/curriculum-sources.md (verified on ncert.nic.in, 21 Oct 2026).
 * Planned ("coming soon") lessons sit at the end of each branch so they never lock a playable lesson.
 */

type MiddleGrade = 6 | 7 | 8;

const BOOK_CODE: Record<MiddleGrade, string> = { 6: 'fecu1', 7: 'gecu1', 8: 'hecu1' };

/** A lesson mapped to one Curiosity chapter whose title is verified in docs/curriculum-sources.md. */
function curiosity(grade: MiddleGrade, chapter: number, unit: string, note: string): CurriculumSource {
  return source({
    document: `Curiosity, Class ${grade}`,
    grade,
    academicYear: '2026-27',
    unit,
    status: 'aligned',
    verification: `Chapter ${chapter} title verified on ncert.nic.in (${BOOK_CODE[grade]}, Reprint 2026-27), recorded in docs/curriculum-sources.md, 21 Oct 2026. ${note}`,
  });
}

const WRITTEN = 'Objectives written by Laarish for this chapter; not yet compared line by line with the chapter text.';

/** A real Curiosity chapter that is not written yet: shown as "coming soon". */
function soon(id: string, title: string, summary: string, icon: IconKey, grade: MiddleGrade, chapter: number, unit: string): LessonSeed {
  return { ...planned(id, title, summary, icon, curiosity(grade, chapter, unit, 'Lesson not written yet.')), review: { teacher: 'pending' } };
}

/** Science, Classes 6-8. */
export const SCIENCE_6_8_LESSONS: Lesson[] = [
  /* ------------------------------------------------------------ Class 6 */
  ...classBranch('science', 6, 'physics', [
    {
      id: 'magnets',
      title: 'Magnets',
      summary: 'What can magnets pull, and why do some magnets push each other away?',
      intro: 'Magnets can pull some things without even touching them. Discover which things, and what happens when two magnets meet.',
      objectives: ['Identify materials that a magnet attracts, and explain that not all metals are magnetic.', 'Name the two poles of a magnet and describe how poles attract and repel.'],
      icon: 'magnet',
      status: 'ready',
      topicIds: ['magnets-what-they-attract', 'magnets-poles'],
      source: curiosity(6, 4, 'Exploring Magnets', WRITTEN),
      review: { teacher: 'pending' },
    },
    {
      id: 's6-temperature',
      title: 'Temperature and its Measurement',
      summary: 'How hot or cold is it? Read thermometers in degrees Celsius and record temperatures as data.',
      intro: 'Touch can fool us about hot and cold, so scientists measure temperature with a thermometer. Learn to read one and turn your readings into a graph.',
      objectives: [
        'Explain why a thermometer is used instead of touch to judge temperature.',
        'Read clinical and laboratory thermometers in degrees Celsius, including readings below 0 °C.',
        'Record temperature readings in a bar graph and read patterns from it.',
      ],
      icon: 'thermometer',
      status: 'ready',
      topicIds: ['s6-temperature-thermometers', 's6-temperature-records', 's6-temperature-review'],
      source: curiosity(6, 7, 'Temperature and its Measurement', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s6-length-motion', 'Measurement of Length and Motion', 'Measure lengths with standard units and describe linear, circular and periodic motion.', 'ruler', 6, 5, 'Measurement of Length and Motion'),
  ]),
  ...classBranch('science', 6, 'chemistry', [
    {
      id: 's6-separation',
      title: 'Separating Mixtures',
      summary: 'How do we pick stones out of dal, get salt from sea water and clear muddy water?',
      intro: 'Many things we use every day are mixtures. Discover the clever ways people separate them, from winnowing grain to filtering water.',
      objectives: [
        'Explain why we separate the parts of a mixture.',
        'Choose handpicking, threshing, winnowing, sieving or a magnet based on how the parts differ.',
        'Describe sedimentation, decantation, filtration and evaporation for mixtures with water.',
      ],
      icon: 'flask',
      status: 'ready',
      topicIds: ['s6-separation-solids', 's6-separation-water'],
      source: curiosity(6, 9, 'Methods of Separation in Everyday Life', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s6-materials', 'Materials Around Us', 'Group materials by properties such as hardness, transparency, solubility and whether they float.', 'box', 6, 6, 'Materials Around Us'),
  ]),
  ...classBranch('science', 6, 'biology', [
    {
      id: 's6-mindful-eating',
      title: 'Food and Nutrients',
      summary: 'What is in our food, and how does a balanced meal keep us healthy?',
      intro: 'Every food you eat carries nutrients that give energy, build the body and protect it. Learn what they are and how to put together a balanced meal.',
      objectives: [
        'Name the main nutrients and give Indian foods rich in each.',
        'Explain what a balanced diet is and choose a balanced meal.',
        'Link some deficiency diseases to the nutrient that is missing.',
      ],
      icon: 'apple',
      status: 'ready',
      topicIds: ['s6-food-nutrients', 's6-food-balanced'],
      source: curiosity(6, 3, 'Mindful Eating: A Path to a Healthy Body', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s6-diversity', 'Diversity in the Living World', 'Observe and group the many kinds of plants and animals around us.', 'leaf', 6, 2, 'Diversity in the Living World'),
    soon('s6-living-creatures', 'Living Creatures', 'Find out what all living things have in common, from seeds to animals.', 'bird', 6, 10, 'Living Creatures: Exploring their Characteristics'),
  ]),
  ...classBranch('science', 6, 'environment', [
    {
      id: 's6-states-of-water',
      title: 'States of Water',
      summary: 'Follow water as it melts, evaporates, condenses and falls as rain.',
      intro: 'Water can be solid ice, liquid water or an invisible gas. Follow its journey and find out what makes wet clothes dry faster.',
      objectives: [
        'Identify the three states of water in everyday examples.',
        'Name the changes of state and describe the water cycle.',
        'Use results from a fair test to explain what makes water evaporate faster.',
      ],
      icon: 'droplets',
      status: 'ready',
      topicIds: ['s6-water-states', 's6-water-changes', 's6-water-evaporation'],
      source: curiosity(6, 8, 'A Journey through States of Water', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s6-natures-treasures', "Nature's Treasures", 'Air, water, soil, forests and fuels: the resources nature gives us and how to use them wisely.', 'mountain', 6, 11, "Nature's Treasures"),
    soon('s6-beyond-earth', 'Beyond Earth', 'Stars, constellations, the planets of our Solar System and the Moon.', 'star', 6, 12, 'Beyond Earth'),
  ]),

  /* ------------------------------------------------------------ Class 7 */
  ...classBranch('science', 7, 'physics', [
    {
      id: 's7-electricity',
      title: 'Electric Circuits',
      summary: 'How does a torch light up? Build circuits on screen, test conductors and learn the parts of a circuit.',
      intro: 'A bulb glows only when electricity has a complete path to follow. Build circuits on screen, test which materials let electricity through, and learn what each part does.',
      objectives: [
        'Explain that a bulb glows only in a closed circuit.',
        'Classify materials as conductors or insulators by testing them in a circuit.',
        'Name the components of a circuit and their jobs, and follow electrical safety rules.',
      ],
      icon: 'lightbulb',
      status: 'ready',
      topicIds: ['s7-electricity-circuits', 's7-electricity-conductors', 's7-electricity-review'],
      source: curiosity(7, 3, 'Electricity: Circuits and their Components', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s7-heat-transfer', 'Heat Transfer in Nature', 'How heat moves by conduction, convection and radiation, from cooking pots to sea breezes.', 'flame', 7, 7, 'Heat Transfer in Nature'),
    soon('s7-time-motion', 'Measurement of Time and Motion', 'Measure time with clocks and pendulums, and compare speeds of moving things.', 'clock', 7, 8, 'Measurement of Time and Motion'),
    soon('s7-light', 'Light: Shadows and Reflections', 'How light travels in straight lines, makes shadows and reflects from mirrors.', 'sun', 7, 11, 'Light: Shadows and Reflections'),
  ]),
  ...classBranch('science', 7, 'chemistry', [
    {
      id: 's7-acids-bases',
      title: 'Acids, Bases and Indicators',
      summary: 'Why is lemon sour and soap slippery? Test substances on screen with natural indicators.',
      intro: 'Some substances are acidic, some are basic and some are neutral. Use natural indicators like turmeric and china rose, safely on screen, to tell them apart.',
      objectives: [
        'Classify common substances as acidic, basic or neutral.',
        'Describe how litmus, turmeric and china rose indicators change colour.',
        'Explain neutralisation with everyday examples and follow safety rules for acids and bases.',
      ],
      icon: 'flask',
      status: 'ready',
      topicIds: ['s7-acids-bases-indicators', 's7-acids-bases-sort'],
      source: curiosity(7, 2, 'Exploring Substances: Acidic, Basic, and Neutral', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s7-metals-nonmetals', 'Metals and Non-metals', 'Compare the properties of metals and non-metals and where we use them.', 'cog', 7, 4, 'The World of Metals and Non-metals'),
    soon('s7-changes', 'Physical and Chemical Changes', 'Tell changes that make new substances from changes that do not, like rusting and melting.', 'sparkles', 7, 5, 'Changes Around Us: Physical and Chemical'),
  ]),
  ...classBranch('science', 7, 'biology', [
    {
      id: 's7-plant-life',
      title: 'Life Processes in Plants',
      summary: 'How do plants make food, and how do water and food travel through them?',
      intro: 'Plants cannot walk to find food, so they make their own using sunlight. Find out how, and how water and food travel inside a plant.',
      objectives: [
        'Describe photosynthesis: what a leaf takes in and what it makes.',
        'Explain the roles of chlorophyll and stomata.',
        'Describe how xylem and phloem transport water, minerals and food.',
      ],
      icon: 'leaf',
      status: 'ready',
      topicIds: ['s7-plants-photosynthesis', 's7-plants-transport'],
      source: curiosity(7, 10, 'Life Processes in Plants', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s7-adolescence', 'Adolescence: Growing Up', 'Understand the changes of growing up, and how to stay healthy and confident through them.', 'users', 7, 6, 'Adolescence: A Stage of Growth and Change'),
    soon('s7-animal-life', 'Life Processes in Animals', 'How animals, including humans, digest food, breathe and move materials around the body.', 'heart', 7, 9, 'Life Processes in Animals'),
  ]),
  ...classBranch('science', 7, 'environment', [
    soon('s7-earth-moon-sun', 'Earth, Moon and the Sun', 'Day and night, the phases of the Moon, and eclipses.', 'moon', 7, 12, 'Earth, Moon, and the Sun'),
  ]),

  /* ------------------------------------------------------------ Class 8 */
  ...classBranch('science', 8, 'physics', [
    {
      id: 'friction',
      title: 'Friction',
      summary: 'Why do moving things slow down and stop?',
      intro: 'Friction is everywhere: in your shoes, on your bicycle and even in your hands. Test it, spot it and learn how to control it.',
      objectives: [
        'Explain friction as a force between surfaces that opposes motion.',
        'Compare friction on rough and smooth surfaces.',
        'Give examples of useful friction and ways to reduce it.',
      ],
      icon: 'car',
      status: 'ready',
      topicIds: ['friction-what-is', 'friction-rough-smooth', 'friction-helps-us', 'friction-reducing'],
      source: source({
        document: 'Curiosity, Class 8',
        grade: 8,
        academicYear: '2026-27',
        unit: 'Exploring Forces',
        status: 'curriculum-inspired',
        verification:
          'Curiosity, Class 8 (hecu1, Reprint 2026-27) has no separate chapter on friction (chapter list verified on ncert.nic.in, recorded in docs/curriculum-sources.md, 21 Oct 2026). Friction belongs to the forces theme of Chapter 5, Exploring Forces; how deeply that chapter covers friction was not checked. Kept in Class 8 so saved progress still counts.',
      }),
      review: { teacher: 'pending' },
    },
    {
      id: 's8-forces',
      title: 'Exploring Forces',
      summary: 'Pushes and pulls, contact and non-contact forces, and what happens when forces combine.',
      intro: 'Every push or pull is a force. Discover what forces can do, which ones act without touching, and how forces add up.',
      objectives: [
        'Describe what a force can do to the motion and shape of an object.',
        'Classify forces as contact (muscular, friction) or non-contact (magnetic, electrostatic, gravitational).',
        'Find the net force when forces act in the same or opposite directions.',
      ],
      icon: 'hand',
      status: 'ready',
      topicIds: ['s8-forces-effects', 's8-forces-contact', 's8-forces-net'],
      source: curiosity(8, 5, 'Exploring Forces', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s8-electricity-effects', 'Magnetic and Heating Effects of Electricity', 'How electric current heats wires and turns iron into an electromagnet.', 'zap', 8, 4, 'Electricity: Magnetic and Heating Effects'),
    soon('s8-light', 'Light: Mirrors and Lenses', 'How plane and curved mirrors and lenses form images.', 'eye', 8, 10, 'Light: Mirrors and Lenses'),
  ]),
  ...classBranch('science', 8, 'chemistry', [
    {
      id: 's8-matter',
      title: 'Elements, Compounds and Mixtures',
      summary: 'Is it pure? Sort matter into elements, compounds and mixtures.',
      intro: 'Everything around you is matter, but not all matter is the same. Find out what makes a substance pure, and how elements, compounds and mixtures differ.',
      objectives: [
        'Tell pure substances from mixtures, using the scientific meaning of "pure".',
        'Classify pure substances as elements or compounds, with examples and symbols.',
        'Compare the properties of mixtures and compounds using evidence.',
      ],
      icon: 'atom',
      status: 'ready',
      topicIds: ['s8-matter-pure-mixtures', 's8-matter-elements-compounds', 's8-matter-review'],
      source: curiosity(8, 8, 'Nature of Matter: Elements, Compounds, and Mixtures', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s8-particles', 'Particulate Nature of Matter', 'Matter is made of tiny particles: how they are arranged and move in solids, liquids and gases.', 'atom', 8, 7, 'Particulate Nature of Matter'),
    soon('s8-solutions', 'Solutes, Solvents and Solutions', 'How substances dissolve, and what makes a solution dilute, concentrated or saturated.', 'droplets', 8, 9, 'The Amazing World of Solutes, Solvents, and Solutions'),
  ]),
  ...classBranch('science', 8, 'biology', [
    {
      id: 's8-microbes',
      title: 'The Invisible Living World',
      summary: 'Meet bacteria, fungi, protozoa, algae and viruses, and find out how they help and harm us.',
      intro: 'Some living things are too small to see without a microscope, yet they make curd, enrich soil and sometimes make us ill. Meet the microorganisms!',
      objectives: [
        'Name the main groups of microorganisms with an example of each.',
        'Give examples of useful microorganisms in food, farming and medicine.',
        'Name diseases caused by microorganisms and simple ways to prevent them.',
      ],
      icon: 'eye',
      status: 'ready',
      topicIds: ['s8-microbes-groups', 's8-microbes-useful-harmful'],
      source: curiosity(8, 2, 'The Invisible Living World: Beyond Our Naked Eye', WRITTEN),
      review: { teacher: 'pending' },
    },
    soon('s8-health', 'Health: The Ultimate Treasure', 'What keeps us healthy, how diseases spread, and how we can prevent them.', 'heart', 8, 3, 'Health: The Ultimate Treasure'),
  ]),
  ...classBranch('science', 8, 'environment', [
    soon('s8-winds-storms', 'Pressure, Winds, Storms and Cyclones', 'Air pressure, why winds blow, and how to stay safe in storms and cyclones.', 'wind', 8, 6, 'Pressure, Winds, Storms, and Cyclones'),
    soon('s8-sky-time', 'Keeping Time with the Skies', 'How the Sun, the Moon and the stars help us keep days, months and calendars.', 'moon', 8, 11, 'Keeping Time with the Skies'),
    soon('s8-nature-harmony', 'How Nature Works in Harmony', 'Food chains, ecosystems and how living things depend on each other.', 'tree', 8, 12, 'How Nature Works in Harmony'),
    soon('s8-our-earth', 'Our Home: Earth', 'What makes Earth a unique planet for life, and how we can protect it.', 'globe', 8, 13, 'Our Home: Earth, a Unique Life Sustaining Planet'),
  ]),
];
