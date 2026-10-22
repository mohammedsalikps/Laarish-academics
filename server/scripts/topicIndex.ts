import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOPICS } from '../../shared/curriculum/index.js';
import { renderTopicIndex } from '../../shared/curriculum/topicContent.js';

/**
 * `npm run curriculum:index` rewrites shared/curriculum/topicIndex.ts, the small
 * topic index the browser ships with, from the full topic files. Run it after
 * adding, removing or reordering topics, or changing a topic's title, summary,
 * icon, minutes, game type, weights or quiz question ids. A test fails while the
 * index is out of date.
 */

const file = join(process.cwd(), 'shared', 'curriculum', 'topicIndex.ts');
writeFileSync(file, renderTopicIndex(TOPICS));
console.log(`Wrote ${TOPICS.length} topics to ${file}`);
