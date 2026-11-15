// @vitest-environment node
import { describe, expect, it } from 'vitest';

/**
 * Guards the accessibility basics that live in the global stylesheet: text
 * contrast of the colour tokens and buttons (WCAG AA, 4.5:1), the 44px touch
 * target of every button size, and reduced motion both before and after the
 * app has started.
 */

// Read from disk: the test runner replaces CSS imports (even ?raw) with empty modules. The specifier is a
// variable so the app's type check, which has no Node types, does not try to resolve it.
const fsModule = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fsModule)) as { readFileSync(path: URL, encoding: 'utf8'): string };
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

type Rgb = [number, number, number];

const token = (name: string): Rgb => {
  const m = css.match(new RegExp(`--c-${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));
  if (!m) throw new Error(`token --c-${name} not found`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const WHITE: Rgb = [255, 255, 255];

const rule = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`${selector} not found`);
  return css.slice(start, css.indexOf('}', start));
};

describe('text contrast (WCAG AA)', () => {
  it.each([
    ['ink-muted', 'canvas'],
    ['ink-muted', 'surface'],
    ['ink-muted', 'canvas-sunken'],
    ['ink-soft', 'canvas'],
    ['primary-strong', 'primary-soft'],
    ['success-strong', 'success-soft'],
    ['reward-strong', 'reward-soft'],
    ['primary', 'surface'],
  ])('%s text on %s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('white text on the primary and success buttons', () => {
    expect(contrast(WHITE, token('primary'))).toBeGreaterThanOrEqual(4.5);
    const m = rule('.btn-success').match(/bg-\[rgb\((\d+)_(\d+)_(\d+)\)\]/);
    expect(m).not.toBeNull();
    expect(contrast(WHITE, [Number(m![1]), Number(m![2]), Number(m![3])])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('touch targets', () => {
  it.each(['.btn', '.btn-sm', '.btn-lg'])('%s is at least 44px tall', (selector) => {
    const m = rule(selector).match(/min-height:\s*(\d+)px/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(44);
  });
});

describe('reduced motion', () => {
  it('follows the in-app setting once the app runs, and the OS setting before that', () => {
    expect(css).toMatch(/html\[data-motion='reduce'\] \*/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html:not\(\[data-motion\]\) \*/);
  });
});
