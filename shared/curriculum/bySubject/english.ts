import { ENGLISH_TOPICS } from '../topics/english.js';
import { ENGLISH_1_8_TOPICS } from '../topics/english-1-8.js';
import { SENTENCE_TOPICS } from '../topics/sentences.js';
import type { Topic } from '../types.js';

/** Full English topic content: its own chunk in the browser build, loaded when an English topic opens. */
export const TOPICS: Topic[] = [...ENGLISH_TOPICS, ...SENTENCE_TOPICS, ...ENGLISH_1_8_TOPICS];
