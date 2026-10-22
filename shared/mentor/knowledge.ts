import { getTopic } from '../curriculum/index.js';
import { groundingFor, type GroundingContext, type MentorGrounding } from './grounding.js';

/** Server-side grounding from the full curriculum. */

export * from './grounding.js';

export function getGrounding(context: GroundingContext): MentorGrounding {
  return groundingFor(context, getTopic);
}
