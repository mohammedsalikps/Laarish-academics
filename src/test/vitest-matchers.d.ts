import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Vitest 5's Assertion takes two type parameters, so the augmentation shipped with
// jest-dom does not merge. Extend Vitest's Matchers interface instead.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> extends TestingLibraryMatchers<unknown, R> {}
}
