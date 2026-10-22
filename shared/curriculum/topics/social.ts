import type { MentorFaq, Topic } from '../types.js';
import { missingVideo, scene } from './helpers.js';

/** Social Science topics. SAMPLE CONTENT; review with subject experts before production use. */

const MAP_FAQ: MentorFaq[] = [
  { keywords: ['compass'], answer: 'A compass has a needle that points North. Once you know North, you can find East, South and West.' },
  { keywords: ['legend', 'key', 'symbol'], answer: 'A legend, or key, is a little box on a map that explains what each symbol means.' },
  { keywords: ['sun', 'rise', 'set'], answer: 'The Sun rises in the East and sets in the West.' },
  { keywords: ['north', 'top'], answer: 'On most maps, North is at the top. South is at the bottom, East is on the right and West is on the left.' },
];

const MAP_FACTS = [
  'The four main directions are North, South, East and West. On most maps, North is at the top.',
  'The Sun rises in the East and sets in the West.',
];

export const SOCIAL_TOPICS: Topic[] = [
  {
    id: 'maps-directions',
    subjectId: 'social-science',
    lessonId: 'directions-and-maps',
    order: 1,
    title: 'The four directions',
    summary: 'Walk a treasure trail using North, South, East and West.',
    objectives: ['Name the four main directions.', 'Follow directions on a simple map.'],
    language: 'en',
    icon: 'compass',
    estimatedMinutes: 7,
    watch: {
      video: missingVideo('video-maps-directions', 'The four directions'),
      intro: 'Ahoy, explorer! Every great adventurer needs to know which way to go.',
      explainer: [
        scene('North, South, East and West are the four main directions.', { kind: 'compass-rose' }),
        scene('On most maps, North is at the top. South is at the bottom, East is on the right and West is on the left.', { kind: 'compass-rose' }),
        scene('The Sun rises in the East and sets in the West. You can use it to find directions outdoors.', { kind: 'icon', icon: 'sun', tone: 'reward' }),
      ],
      keyIdeas: ['The four main directions are North, South, East and West.', 'On most maps, North is at the top.', 'The Sun rises in the East and sets in the West.'],
    },
    play: {
      title: 'Treasure Trail',
      assessed: true,
      weight: 1,
      game: {
        type: 'grid-explorer',
        size: 5,
        start: [2, 4],
        landmarks: [
          { id: 'well', label: 'Well', icon: 'droplets', at: [2, 2] },
          { id: 'tree', label: 'Mango tree', icon: 'sprout', at: [4, 2] },
          { id: 'temple', label: 'Temple', icon: 'landmark', at: [4, 0] },
          { id: 'chest', label: 'Treasure chest', icon: 'star', at: [0, 0] },
        ],
        tasks: [
          { id: 't1', prompt: 'Walk 2 steps North to reach the well.', targetId: 'well', hint: 'North is up on this map.' },
          { id: 't2', prompt: 'Now walk 2 steps East to the mango tree.', targetId: 'tree', hint: 'East is to the right on this map.' },
          { id: 't3', prompt: 'Walk 2 steps North to find the temple.', targetId: 'temple', hint: 'Keep going up: North is at the top.' },
          { id: 't4', prompt: 'Finally, walk 4 steps West to the treasure chest!', targetId: 'chest', hint: 'West is to the left on this map.' },
        ],
      },
      coach: {
        start: 'Tap a glowing square or use the arrow buttons to walk, then press "I am here!".',
        'task-correct': 'You found it! Great direction skills.',
        'task-incorrect': 'Not quite there yet. Check the compass and try again.',
        complete: 'You found the treasure! You are a true explorer.',
        'complete:perfect': 'Every stop found on the first try. Amazing navigating!',
      },
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-sunrise',
          type: 'single-choice',
          prompt: 'In which direction does the Sun rise?',
          options: [
            { id: 'north', text: 'North' },
            { id: 'east', text: 'East' },
            { id: 'west', text: 'West' },
            { id: 'south', text: 'South' },
          ],
          correctOptionId: 'east',
          hint: 'Think about where the Sun is in the early morning.',
          explanation: 'The Sun rises in the East.',
        },
        {
          id: 'q-top',
          type: 'single-choice',
          prompt: 'On most maps, which direction is at the top?',
          options: [
            { id: 'north', text: 'North' },
            { id: 'south', text: 'South' },
            { id: 'east', text: 'East' },
          ],
          correctOptionId: 'north',
          hint: 'Look at the compass on the Treasure Trail map.',
          explanation: 'North is at the top of most maps.',
        },
        {
          id: 'q-right',
          type: 'single-choice',
          prompt: 'You are facing North. Which direction is on your right?',
          options: [
            { id: 'east', text: 'East' },
            { id: 'west', text: 'West' },
            { id: 'south', text: 'South' },
          ],
          correctOptionId: 'east',
          hint: 'On a map with North at the top, which direction is on the right side?',
          explanation: 'When you face North, East is on your right and West is on your left.',
        },
      ],
    },
    mentor: {
      facts: [...MAP_FACTS, 'When you face North, East is on your right and West is on your left.'],
      simpler: 'Directions tell us which way to go. North is usually up on a map, South is down, East is right and West is left.',
      examples: ['In the morning, look towards where the Sun rises. That way is East!'],
      why: 'The Earth turns, so the Sun always appears to rise in the East and set in the West. That makes it a handy direction guide.',
      hints: {
        play: 'Look at the letters around the map: N is up, S is down, E is right and W is left.',
        practice: 'Picture a map with North at the top. Where are the other directions?',
        default: 'Remember: North at the top, Sun rises in the East.',
      },
      faq: MAP_FAQ,
      practice: [{ question: 'In which direction does the Sun set?', accept: ['west'], explanation: 'The Sun sets in the West.' }],
    },
  },
  {
    id: 'maps-reading',
    subjectId: 'social-science',
    lessonId: 'directions-and-maps',
    order: 2,
    title: 'Reading a map',
    summary: 'Learn how symbols, a legend and a compass help us read maps.',
    objectives: ['Explain what map symbols and a legend are.', 'Use a compass to find North.'],
    language: 'en',
    icon: 'map',
    estimatedMinutes: 6,
    watch: {
      video: missingVideo('video-maps-reading', 'Reading a map'),
      intro: "Maps use little pictures to show where things are. Let's learn how to read them!",
      explainer: [
        scene('A map is a drawing of a place as if you were looking down from the sky.', { kind: 'icon', icon: 'map', tone: 'sky' }),
        scene('Maps use small pictures called symbols, like a tree for a park.', { kind: 'icon', icon: 'sprout', tone: 'success' }),
        scene('The legend, or key, explains what each symbol means. A compass shows which way is North.', { kind: 'compass-rose' }),
      ],
      keyIdeas: ['A map is a drawing of a place seen from above.', 'Symbols are small pictures on a map.', 'The legend (key) explains the symbols.'],
    },
    play: {
      title: 'Map Match',
      assessed: true,
      weight: 1,
      game: {
        type: 'concept-match',
        prompt: 'Match each map word to what it means.',
        leftLabel: 'Word',
        rightLabel: 'Meaning',
        pairs: [
          { id: 'north', left: 'North', leftIcon: 'compass', right: 'Usually at the top of a map', hint: 'Look at the compass rose.' },
          { id: 'east', left: 'East', leftIcon: 'sun', right: 'Where the Sun rises', hint: 'Think about the morning.' },
          { id: 'west', left: 'West', leftIcon: 'sun', right: 'Where the Sun sets', hint: 'Think about the evening.' },
          { id: 'legend', left: 'Legend (key)', leftIcon: 'map', right: 'Explains the symbols on a map', hint: 'It is like a dictionary for map pictures.' },
          { id: 'compass', left: 'Compass', leftIcon: 'compass', right: 'A tool whose needle points North', hint: 'Explorers carry it to find directions.' },
        ],
      },
      coach: {
        start: 'Tap a map word, then tap what it means.',
        'match-correct': 'Right on course!',
        'match-incorrect': 'Not quite. Think about the Sun and the compass.',
        complete: 'All matched! You are ready for any adventure.',
        'complete:perfect': 'Perfect navigation with no mistakes!',
      },
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-legend',
          type: 'true-false',
          prompt: 'A map legend tells us what the map symbols mean.',
          correct: true,
          hint: 'What is another name for the legend?',
          explanation: 'True! The legend, or key, explains the symbols.',
        },
        {
          id: 'q-symbols',
          type: 'single-choice',
          prompt: 'What do we call the small pictures on a map?',
          options: [
            { id: 'symbols', text: 'Symbols' },
            { id: 'letters', text: 'Letters' },
            { id: 'stamps', text: 'Stamps' },
            { id: 'stickers', text: 'Stickers' },
          ],
          correctOptionId: 'symbols',
          hint: 'The legend explains them.',
          explanation: 'The small pictures on a map are called symbols.',
        },
        {
          id: 'q-compass',
          type: 'true-false',
          prompt: 'A compass needle points towards the North.',
          correct: true,
          hint: 'Why do explorers carry a compass?',
          explanation: 'True! The compass needle points North, which helps us find all the other directions.',
        },
      ],
    },
    mentor: {
      facts: [...MAP_FACTS, 'A map legend, or key, explains what the map symbols mean.', 'A compass needle points North.'],
      simpler: 'A map is like a picture of a place from the sky. Little pictures called symbols show things like trees and schools, and the legend tells you what each one means.',
      examples: ['A treasure map might have a small tree symbol, and the legend tells you it means "forest".'],
      hints: {
        play: 'Think about the Sun in the morning and evening, and remember what a compass does.',
        practice: 'The legend explains symbols. The compass points North.',
        default: 'Symbols are small pictures; the legend explains them.',
      },
      faq: MAP_FAQ,
      practice: [{ question: 'If North is at the top of a map, which direction is on the right?', accept: ['east'], explanation: 'East is on the right when North is at the top.' }],
    },
  },
];
