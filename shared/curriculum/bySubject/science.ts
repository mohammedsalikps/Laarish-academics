import { SCIENCE_TOPICS } from '../topics/science.js';
import { SCIENCE_1_5_TOPICS } from '../topics/science-1-5.js';
import { SCIENCE_6_8_TOPICS } from '../topics/science-6-8.js';
import type { Topic } from '../types.js';

/** Full Science topic content: its own chunk in the browser build, loaded when a Science topic opens. */
export const TOPICS: Topic[] = [...SCIENCE_TOPICS, ...SCIENCE_1_5_TOPICS, ...SCIENCE_6_8_TOPICS];
