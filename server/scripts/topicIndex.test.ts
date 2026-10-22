import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../shared/curriculum/index.js';
import { renderTopicIndex } from '../../shared/curriculum/topicContent.js';

describe('npm run curriculum:index', () => {
  it('has written the current topic index (run it after changing topics)', async () => {
    const source = await readFile(join(process.cwd(), 'shared', 'curriculum', 'topicIndex.ts'), 'utf8');
    expect(source.replace(/\r\n/g, '\n')).toBe(renderTopicIndex(TOPICS));
  });
});
