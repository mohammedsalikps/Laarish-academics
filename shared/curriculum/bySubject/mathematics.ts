import { MATHEMATICS_TOPICS } from '../topics/mathematics.js';
import { MATHS_1_3_TOPICS } from '../topics/maths-1-3.js';
import { MATHS_4_5_TOPICS } from '../topics/maths-4-5.js';
import { MATHS_6_8_TOPICS } from '../topics/maths-6-8.js';
import { NUMBERS_AND_ALGEBRA_TOPICS } from '../topics/numbersAndAlgebra.js';
import type { Topic } from '../types.js';

/** Full Mathematics topic content: its own chunk in the browser build, loaded when a Mathematics topic opens. */
export const TOPICS: Topic[] = [...MATHEMATICS_TOPICS, ...NUMBERS_AND_ALGEBRA_TOPICS, ...MATHS_1_3_TOPICS, ...MATHS_4_5_TOPICS, ...MATHS_6_8_TOPICS];
