import { KANNADA_1_8_TOPICS } from '../topics/kannada-1-8.js';
import { LANGUAGE_TOPICS } from '../topics/languages.js';
import type { Topic } from '../types.js';

/** Full Kannada topic content: its own chunk in the browser build, loaded when a Kannada topic opens. */
export const TOPICS: Topic[] = [...LANGUAGE_TOPICS.filter((t) => t.subjectId === 'kannada'), ...KANNADA_1_8_TOPICS];
