import { SOCIAL_TOPICS } from '../topics/social.js';
import { SOCIAL_1_8_TOPICS } from '../topics/social-1-8.js';
import type { Topic } from '../types.js';

/** Full Social Science topic content: its own chunk in the browser build, loaded when a Social Science topic opens. */
export const TOPICS: Topic[] = [...SOCIAL_TOPICS, ...SOCIAL_1_8_TOPICS];
