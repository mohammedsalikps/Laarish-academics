# 3D worlds: what changed (16 Nov 2026)

The six subject worlds keep their islands, chapter landmarks, pins, camera, Lite mode and List
view. This upgrade adds things to discover and a celebration when a chapter opens.

## Tap to discover

Each world has three new clay objects. Tapping one opens a short, true fact with **Read aloud**,
and the world remembers which ones the child has found ("1 of 3 found").

| World | Objects | What they teach |
|---|---|---|
| Science (Discovery Valley) | Telescope, horseshoe magnet, seedling in a pot | How telescopes gather light (and never at the Sun); magnet poles and what magnets attract; how a seed sprouts |
| Mathematics (Number Kingdom) | Counting steps (1, 2, 3 cubes), abacus, cube + sphere + pyramid | Counting on: 1 + 2 + 3 = 6; counting the abacus beads (3 + 4 + 5 = 12, matching the model); faces of solid shapes |
| English (Story Forest) | Storybook on a stand, alphabet blocks (ABC), giant pencil | Beginning, middle and end; 26 letters with 5 vowels; capital letter and end mark |
| Hindi (Akshar Garden) | Letter stone (अ), basket of five mangoes, kite | अ as the first स्वर (अ से अनार); आम and counting एक to पाँच; पतंग |
| Kannada (Akshara Hills) | Letter stone (ಅ), jasmine bed, coracle | ಅ as the first ಸ್ವರ (ಅ for ಅಮ್ಮ); ಮಲ್ಲಿಗೆ (Mysuru mallige); ಹರಿಗೋಲು on the Kaveri |
| Social Science (Explorer's Atlas) | Globe, striped lighthouse, signpost | Land and water on Earth (about 7 parts in 10 water); why lighthouses exist; the four directions and sunrise in the east |

The objects replace plain bushes, away from the chapter landmarks. A test checks that every marker
is on its island and clear of every landmark.

**Markers.** Each object has a 44 px gold button with a sparkle; once found it turns white with a
green tick. Markers are *minor* pins:
- They are placed after the chapter pins, so a chapter pin never moves for them.
- If a marker would sit more than 56 px from its object, it hides until the camera turns. On a
  375 px phone that usually leaves one marker showing instead of crowding the chapters.
- Every discovery is also in **List view** under "Things to discover", so none is ever out of
  reach. This includes Lite mode, keyboard use and screen readers.

**Read aloud** uses the device voice for the fact's script. If the device has no Hindi or Kannada
voice, the button is hidden rather than reading the script with the wrong voice.

**Saved data.** Found items are stored in `laarish-academics:discoveries` on the device. The
saved-progress record (`laarish-academics:progress`, schema v2) is unchanged.

## Chapter unlock celebration

When a chapter has opened since the child's last visit to that world and class:
- Its pin shows a **New!** flag that pops in, with a pulsing ring.
- Rishi says "*{chapter}* just opened. Tap it to start!"
- The List view row has a **New!** chip.
- Screen readers hear ", just opened".

The first visit to a world records what is open and celebrates nothing, so only real unlocks are
flagged. With reduced motion there is no pop or pulse; the flag and words remain. Stored in
`laarish-academics:open-chapters`, per world and class.

## Performance

- **Draw calls:** none added. The objects are built from the same clay shapes and merged into
  the island mesh, so each world is still 3 draw calls.
- **Triangles per island, before → after:**

  | Science | Maths | English | Hindi | Kannada | Social |
  |---|---|---|---|---|---|
  | 2,780 → 3,076 | 1,988 → 2,276 | 2,468 → 2,368 | 2,728 → 2,692 | 2,812 → 3,920 | 688 → 1,240 |

  The whole Science scene measured 9,352 triangles in the browser with `?perf`.
- **Downloads:** nothing to download. There are no textures; markers are HTML.
- **Lite mode and List view:** the discovery data (`src/world3d/discoveries.ts`) imports no
  three.js, so these views still never load the 3D engine.

## Checked

- **Unit tests:** `src/world3d/discoveries.test.ts` (6) covers facts, placement, scripts,
  first-visit rules and storage.
- **Page tests:** `src/pages/world/discover.test.tsx` (4) covers the fact card, the found count
  and remembering it, the Hindi letter, the New! flag only after an unlock, and nothing on the
  first visit.
- **Existing tests:** the world tests and the route smoke tests pass.
- **In the browser (dev server):**
  - All six worlds at desktop width; Science at 375 × 812.
  - The Kannada fact card on desktop.
  - The Telescope fact card as a phone bottom sheet, with Read aloud and Got it.
- **Not checked:**
  - A physical Android phone.
  - Frame rate with the pane visible. The browser pane was hidden, so the first-frame time it
    reported is not meaningful.
