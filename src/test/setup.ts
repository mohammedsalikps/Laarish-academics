import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);

// Screens are lazy-loaded; when the whole suite runs in parallel the first import of a route chunk can take
// longer than Testing Library's default 1s wait.
configure({ asyncUtilTimeout: 10_000 });

// Some test files run in the node environment (server and shared code).
const hasDom = typeof window !== 'undefined';

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  window.localStorage.clear();
});

if (hasDom) {
  // jsdom does not implement matchMedia, scrolling or media playback.
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  Element.prototype.scrollIntoView = function scrollIntoView() {};
  Element.prototype.scrollTo = function scrollTo() {} as typeof Element.prototype.scrollTo;
  // Pointer capture (used by drag interactions) is not implemented by jsdom.
  Element.prototype.setPointerCapture ??= function setPointerCapture() {};
  Element.prototype.releasePointerCapture ??= function releasePointerCapture() {};
  Element.prototype.hasPointerCapture ??= () => false;
}
