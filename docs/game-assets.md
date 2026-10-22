# Game and quiz assets

What the games and the comic-style quiz draw with, where it comes from, and what is still missing. Nothing here is a
photograph or a third-party image; no licensed stock assets are used.

## In use

| Asset | Where | Source |
|---|---|---|
| Everyday objects: iron nail, steel paper clip, steel safety pin, iron bolt, copper coin, copper wire, brass key, steel key, steel spoon, steel tumbler, aluminium can, aluminium foil, wooden block, wooden ice-cream stick, cricket bat, wooden chair, plastic ruler, plastic straw, plastic comb, pencil lead (graphite), rubber eraser, rubber band, glass marble, cotton thread, cotton towel, bedsheet | `src/components/art/ObjectArt.tsx`, used by Magnet Explorer, Circuit lab and Sort | Original vector illustrations drawn for Laarish (SVG in code). Materials are shown by colour and finish: grey metallic gradients for iron and steel, orange for copper, yellow for brass, silver for aluminium, wood grain, coloured plastic, pink or tan rubber, clear glass, dark graphite, soft cloth |
| Horseshoe magnet (N and S tips), bar magnets (N red, S blue, grey "mystery" magnet), workbench and table | `src/games/magnet/MagnetArt.tsx`, `MagnetLab.tsx` | Original vector illustrations |
| Sound effects (tap, correct, try again, reward, whoosh, magnet snap) | `src/hooks/usePreferences.ts` (`useSound`) | Synthesised with Web Audio at runtime; no audio files. Off when Sound effects is off in Settings |
| Rishi and Ayra in the quiz | `public/mentors/rishi.webp`, `ayra.webp`, `*-face.webp` | The official mentor artwork already in the project; the quiz shows only the learner's chosen mentor |
| Spoken lines | The device's own voices (`speechSynthesis`) | No audio files. Which voices exist depends on the device (Settings lists them) |

All drawings are SVG, so they stay sharp at any size and add no image downloads. The object drawings are one shared
file of about 26 kB (6 kB gzipped), loaded only with Magnet Explorer, Circuit lab or Sort; the Magnet Explorer game
itself, with its magnets, is about 35 kB (11 kB gzipped) and loads only when a magnet topic is opened.

## Missing (not produced yet)

- **Photographs** of the real objects. The vector drawings are used instead; photographs would need to be taken or
  licensed, stored in `public/`, and kept consistent with each object's stated material.
- **Mentor expressions.** Rishi and Ayra each have one pose. The quiz shows reactions with a short one-time animation
  (a small hop for a right answer, a thoughtful tilt for "try again") and a sparkle, not different faces. Happy,
  thinking and encouraging poses from the original artist would make the reactions clearer.
- **Recorded voice lines.** Lines are read by the device voice, so the voice differs between devices, and devices
  without a Hindi or Kannada voice cannot read lines in those scripts (the words stay on screen).
- **Other games.** Circuit lab shows the object drawings for every object (on the cards, in the gap and in the test
  results). Sort shows them only where the items are real objects with a matching drawing: "What is it made of?" (all
  six items) and the marble in "Roll or slide?"; its other topics sort words, sentences and ideas, or objects not drawn
  yet, and keep their icons. Fair Share Kitchen, Clock setter, Area builder, Bar chart builder, Number line, Concept
  match, Treasure Trail, Balance scale, Sentence Builder, Friction Lab and Push the Box keep their existing drawings and
  icons. They already have a clear goal, a guided first move, feedback, hints, retry and a summary; new object artwork
  has not been made for them.
