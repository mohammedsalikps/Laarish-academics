import { HINDI_1_8_TOPICS } from '../topics/hindi-1-8.js';
import { LANGUAGE_TOPICS } from '../topics/languages.js';
import type { Topic } from '../types.js';

/** Full Hindi topic content: its own chunk in the browser build, loaded when a Hindi topic opens. */
export const TOPICS: Topic[] = [...LANGUAGE_TOPICS.filter((t) => t.subjectId === 'hindi'), ...HINDI_1_8_TOPICS];
