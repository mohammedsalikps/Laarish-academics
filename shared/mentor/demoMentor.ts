import { demoReply } from './demoReply.js';
import { getGrounding } from './knowledge.js';
import type { MentorReply, MentorRequest } from './types.js';

/** The demo mentor grounded in the full curriculum (server side). */

export * from './demoReply.js';

export function demoMentorReply(req: MentorRequest): MentorReply {
  return demoReply(req, getGrounding(req.context));
}
