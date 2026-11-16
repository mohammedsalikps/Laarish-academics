import type { IslandStyle } from './islands';

/**
 * Things children can tap on each world island to learn one small, true fact.
 * Each matches a 3D object built in islands.ts; `at` is where its marker floats, in local
 * island coordinates (the object's x and z, a little above its top). Kept here, not in
 * islands.ts, so List view and Lite mode never load three.js.
 * Language worlds teach a word or letter in that language, with the English beside it.
 */

/** Height of the island's top surface (islands.ts TOP). */
const TOP = 0.2;

export type DiscoveryIcon =
  | 'telescope'
  | 'magnet'
  | 'sprout'
  | 'blocks'
  | 'calculator'
  | 'shapes'
  | 'book'
  | 'pencil'
  | 'citrus'
  | 'wind'
  | 'flower'
  | 'waves'
  | 'globe'
  | 'lighthouse'
  | 'signpost';

export interface Discovery {
  id: string;
  /** What the object is called. */
  name: string;
  /** A letter shown on the marker instead of an icon (the language worlds' letter stones and blocks). */
  glyph?: string;
  icon: DiscoveryIcon;
  /** One or two short sentences, read aloud on request. */
  fact: string;
  /** Marker position in local island coordinates. */
  at: readonly [number, number, number];
}

const FACTS: Record<IslandStyle, Discovery[]> = {
  science: [
    {
      id: 'telescope',
      at: [-1.2, TOP + 0.7, -0.9],
      name: 'Telescope',
      icon: 'telescope',
      fact: 'A telescope gathers light with lenses or mirrors, so faraway things like the Moon look bigger and clearer. Never look at the Sun through one.',
    },
    {
      id: 'magnet',
      at: [0.35, TOP + 0.5, -0.55],
      name: 'Horseshoe magnet',
      icon: 'magnet',
      fact: 'A magnet has a north pole and a south pole. It pulls things made of iron, like pins and nails, but not wood, plastic or paper.',
    },
    {
      id: 'seedling',
      at: [-0.2, TOP + 0.5, 0.3],
      name: 'Seedling',
      icon: 'sprout',
      fact: 'A seed holds a tiny baby plant and its food. With water, air and warmth it sprouts: a root grows down and a shoot grows up towards the light.',
    },
  ],
  maths: [
    {
      id: 'counting-steps',
      at: [0.0, TOP + 0.75, 1.15],
      name: 'Counting steps',
      icon: 'blocks',
      fact: 'One block, then two, then three: each step has one more block than the step before. 1 + 2 + 3 makes 6 blocks in all.',
    },
    {
      id: 'abacus',
      at: [1.3, TOP + 0.65, 0.1],
      name: 'Abacus',
      icon: 'calculator',
      fact: 'An abacus is a counting frame with beads on rods. This one has 3 beads on the bottom rod, 4 in the middle and 5 on top: 12 beads in all.',
    },
    {
      id: 'shapes',
      at: [-1.3, TOP + 0.5, -0.75],
      name: 'Solid shapes',
      icon: 'shapes',
      fact: 'A cube has 6 flat square faces. A sphere is round all over and has no corners. This pyramid has a square base and 4 triangle faces that meet at a point.',
    },
  ],
  english: [
    {
      id: 'storybook',
      at: [0.4, TOP + 0.55, -1.25],
      name: 'Storybook',
      icon: 'book',
      fact: 'Every story has a beginning, a middle and an end. The characters are the people or animals the story is about.',
    },
    {
      id: 'letter-blocks',
      at: [1.3, TOP + 0.65, -0.4],
      name: 'Alphabet blocks',
      glyph: 'ABC',
      icon: 'blocks',
      fact: 'English has 26 letters. Five of them, a, e, i, o and u, are vowels. The other 21 are consonants.',
    },
    {
      id: 'pencil',
      at: [-1.35, TOP + 0.45, -0.45],
      name: 'Pencil',
      icon: 'pencil',
      fact: 'A sentence starts with a capital letter and ends with a full stop, a question mark or an exclamation mark.',
    },
  ],
  hindi: [
    {
      id: 'akshar-a',
      at: [1.3, TOP + 0.55, -0.5],
      name: 'अ (a)',
      glyph: 'अ',
      icon: 'blocks',
      fact: 'अ is the first letter of the Hindi alphabet. It is a vowel, a स्वर. अ से अनार: a for pomegranate.',
    },
    {
      id: 'mango',
      at: [0.6, TOP + 0.5, -1.2],
      name: 'आम (mango)',
      icon: 'citrus',
      fact: 'आम means mango, India’s national fruit. Count the mangoes in the basket: एक, दो, तीन, चार, पाँच. Five!',
    },
    {
      id: 'kite',
      at: [-1.3, TOP + 0.95, -0.6],
      name: 'पतंग (kite)',
      icon: 'wind',
      fact: 'पतंग means kite. The wind pushes the kite up, and the string holds it steady so it can fly high.',
    },
  ],
  kannada: [
    {
      id: 'akshara-a',
      at: [1.35, TOP + 0.55, -0.2],
      name: 'ಅ (a)',
      glyph: 'ಅ',
      icon: 'blocks',
      fact: 'ಅ is the first letter of the Kannada alphabet. It is a vowel, a ಸ್ವರ. ಅ for ಅಮ್ಮ, amma, mother.',
    },
    {
      id: 'jasmine',
      at: [-1.35, TOP + 0.45, -0.3],
      name: 'ಮಲ್ಲಿಗೆ (jasmine)',
      icon: 'flower',
      fact: 'ಮಲ್ಲಿಗೆ means jasmine. Mysuru mallige is a jasmine from Karnataka, famous for its sweet smell.',
    },
    {
      id: 'coracle',
      at: [0.95, TOP + 0.4, 1.0],
      name: 'ಹರಿಗೋಲು (coracle)',
      icon: 'waves',
      fact: 'ಹರಿಗೋಲು means coracle: a round boat woven from bamboo. People row coracles across rivers like the Kaveri.',
    },
  ],
  social: [
    {
      id: 'globe',
      at: [-1.15, TOP + 0.75, 0.15],
      name: 'Globe',
      icon: 'globe',
      fact: 'A globe is a small round model of the Earth. Blue shows water and green shows land. About seven parts in ten of the Earth’s surface are water.',
    },
    {
      id: 'lighthouse',
      at: [1.3, TOP + 0.95, -0.25],
      name: 'Lighthouse',
      icon: 'lighthouse',
      fact: 'A lighthouse shines a bright light at night so that ships near the coast can find their way and keep away from rocks.',
    },
    {
      id: 'signpost',
      at: [-0.2, TOP + 0.85, -0.6],
      name: 'Signpost',
      icon: 'signpost',
      fact: 'The four main directions are north, south, east and west. The Sun rises in the east and sets in the west.',
    },
  ],
};

/** A world's discoveries, in the order their markers are read by screen readers. */
export function discoveriesFor(style: IslandStyle): readonly Discovery[] {
  return FACTS[style];
}

/** Every discovery's fact, keyed by world, for tests and the docs. */
export const DISCOVERY_FACTS: Readonly<Record<IslandStyle, readonly Discovery[]>> = FACTS;

/* ------------------------------------------------------- remembered on this device */

const FOUND_KEY = 'laarish-academics:discoveries';
const OPEN_KEY = 'laarish-academics:open-chapters';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: remembered for this visit only.
  }
}

/** Discoveries found on this device, as "style/id". */
export function readFound(): Set<string> {
  const list = readJson<unknown>(FOUND_KEY, []);
  return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
}

export function saveFound(found: ReadonlySet<string>) {
  writeJson(FOUND_KEY, [...found]);
}

/**
 * Chapters that opened since the last visit to this world and class. The first visit
 * records what is open without celebrating anything, so only real unlocks are new.
 */
export function newlyOpened(previous: readonly string[] | undefined, open: readonly string[]): string[] {
  if (!previous) return [];
  const seen = new Set(previous);
  return open.filter((id) => !seen.has(id));
}

export function readOpenChapters(key: string): string[] | undefined {
  const all = readJson<Record<string, unknown>>(OPEN_KEY, {});
  const list = all && typeof all === 'object' ? all[key] : undefined;
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : undefined;
}

export function saveOpenChapters(key: string, open: readonly string[]) {
  const all = readJson<Record<string, unknown>>(OPEN_KEY, {});
  const previous = readOpenChapters(key) ?? [];
  writeJson(OPEN_KEY, { ...(all && typeof all === 'object' ? all : {}), [key]: [...new Set([...previous, ...open])] });
}
