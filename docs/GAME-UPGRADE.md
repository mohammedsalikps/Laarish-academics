# Game upgrade: the 14 mini-game engines (November 2026)

The product owner's list, applied to every engine in `src/games/`. The 3D magnet
bench (`src/world3d/`) was deliberately left alone.

**How this was checked:** with automated tests (Vitest + jsdom; full suite 87 files /
1,374 tests passing on 16 Nov), `tsc` and ESLint. Afterwards, in the browser (dev server):

- the Magnets How to play pictures at desktop width: three clear steps (drag to the
  magnet, watch the pull, sort into trays), with "All the steps in words" below;
- the sentence builder at 375 × 812: one instruction line at a time ("Start here…"
  changes to "Tap a placed word to send it back" after the first tile), with raised tiles.

The other 12 engines' pictures, the first-move pulses, dark-mode contrast and a physical
phone are **not checked visually yet**. Give them one look on a phone before release.

## What is shared by all 14 engines

| Goal | What changed | Where |
| --- | --- | --- |
| 1. Objective before starting | The mission card already showed the goal. Two goals were vague or wrong and now follow the topic's rounds: Bar chart (was "Finish all 4 chart tasks"; now "Read the bar charts to answer all 4 questions", "Make all 4 bar charts match their tables" or "Build and read bar charts: …") and Magnet ("…then sort them" only when the topic has a sort round). | `src/games/registry.ts` |
| 2. Visual instructions | **How to play is now pictures.** 2–3 steps per game, each a small inline-SVG drawing of the move (a hand dragging an object to a magnet, a finger tapping a tray, a hand turning the clock's long hand…) with a caption of at most 8 words. Steps follow the topic's config (pole-only magnet topics show pushing and turning; read-only bar charts show tapping; area topics show counting squares or adding sides; fractions show a roti or a chocolate bar). A read-aloud button reads the captions. The circuit safety rule stays visible under the pictures. Every original written instruction is kept under "All the steps in words" (a collapsed `<details>`), so nothing is lost. | `src/games/howTo.ts` (data), `src/games/HowToGuide.tsx` (drawings), `src/pages/topic/MissionCard.tsx` |
| 2. Reduced motion | Pictures play their move 3 times and then rest. With reduced motion (the `reducedMotion` setting, `html[data-motion=reduce]`, or the OS setting before the app starts) no animation CSS is rendered and the drawings stand still; dashed arrows and tap rings still show the move. The panel's fade-in is also off. | `HowToGuide.tsx`, `MissionCard.tsx` |
| 4. Obvious interactive objects | New shared helper: `RAISED` (a solid bottom edge like the app's buttons) and `firstMoveCue()` (one soft pulse after 0.5 s; a still ring with reduced motion), marked `data-cue="first-move"`. Applied to the engines that lacked a cue or a raised look (below). | `src/games/affordance.ts` |
| 5. Touch targets ≥ 44 px | Audited every `<button>` in the engines with a script: all use `.btn` (56 px), `.btn-sm` (44 px), `h-11` (44 px), `min-h-[44px]` or larger card sizes. No control below 44 px was found, so no size changes were needed. | — |
| 7–10. Feedback, hints, why, replay | Verified in code for every engine: sound + coloured feedback on each answer, "Need a hint?" via `useHintContext` (all 14), an explanation after a right answer, and a finish card with Play again (Friction and Push Box rely on the mission card's Play again plus their own finish line). No gaps found. | — |

## Per engine

| Engine | What changed | Verified by |
| --- | --- | --- |
| Area builder (`area-grid`) | Width/height − and + buttons raised. Picture steps: drag across the grid; count squares / add sides (follows the rounds); Check. Removed a stray doc comment. | howTo tests; existing AreaBuilder tests |
| Balance (`balance`) | Number choices raised; before the first try they pulse once (still ring with reduced motion). Picture steps: tap a number; heavier side goes down; make it level, then Check. Removed a stray doc comment. | `affordance.test.tsx`; existing tests |
| Bar chart (`bar-chart`) | Mission now says build or read. In the first read round the bar buttons pulse once until one is chosen. Picture steps follow the round modes. Removed a stray doc comment. | `affordance.test.tsx`, `registry.test.ts`, howTo tests |
| Circuit lab (`circuit`) | Object cards raised; the first card pulses once until something goes in the gap. Pictures: drag into the gap; switch on; does the bulb light? Safety line shown with the pictures (and still in the game). | `affordance.test.tsx`, `missionHowTo.test.tsx` |
| Clock (`clock`) | Already had a first-move cue and raised buttons. Pictures: drag the long hand round; the short hand follows (both hands animate together); Check. Removed a stray doc comment. | howTo tests; existing tests |
| Fraction builder (`fraction-builder`) | Already had a roti / chocolate bar and a cue. Pictures use the topic's shape. Removed a stray doc comment. | howTo tests; existing tests |
| Friction lab (`friction-experiment`) | Surface, prediction and push choices raised. First run, one step at a time: the surfaces pulse once, then (after choosing) the predictions, then nothing. Pictures: choose a surface; guess how far; press Start. | `affordance.test.tsx` |
| Map adventure (`grid-explorer`) | Already had "Start here" and a pulse, 48 px compass buttons and ~50 px map squares on a 360 px phone. Pictures: tap a square; or N/S/E/W; "I am here!". No engine change. | howTo tests; existing tests |
| Magnet explorer (`magnet-lab`) | Object cards raised; the first card pulses once until an object is tested, picked or sorted. Mission mentions sorting only when there is a sort round. Pictures reuse the game's own horseshoe and bar magnets and object art. 3D bench untouched. The "simplified model" note stays visible (an existing test requires it). | `affordance.test.tsx`, `registry.test.ts`, `missionHowTo.test.tsx` |
| Matching (`concept-match`) | Already polished (one status line, cue, raised cards). Pictures only. | howTo tests; existing tests |
| Number line (`number-line`) | **Had no first-move cue:** before the first point a soft band behind the line glows once (still with reduced motion). − / + mark buttons raised. Pictures: tap a mark; or drag the marker; Check. Removed a stray doc comment. | `affordance.test.tsx` |
| Push box (`push-box`) | Floor choices raised (it already had step-by-step cues). Pictures: choose a floor; drag the hand to push harder; Push!. | existing tests |
| Sorting (`sort`) | Already polished. Pictures only (2 steps). | howTo tests; existing tests |
| Sentence builder (`word-order`) | **Up to three instruction lines could show at once** (strip helper, "Start here" badge, "All tiles used"). Now one line at a time above the tiles: "Start here…" → "Tap a placed word to send it back" → "All tiles used. Press Check!". Tiles raised; the tray pulses once at the start. | `affordance.test.tsx`; existing tests |

## New and changed tests

- `src/games/howTo.test.tsx` (new): every game type has steps; every real topic gets 2–3 steps with captions ≤ 8 words; steps follow the config; every scene draws; still pictures when motion is off.
- `src/pages/topic/missionHowTo.test.tsx` (new): the panel shows the pictures, keeps all written instructions under "All the steps in words", shows the circuit safety rule, animates only with motion allowed.
- `src/games/affordance.test.tsx` (new): the shared cue, plus the cue / raised look / single instruction line in Sentence builder, Balance, Number line, Bar chart, Circuit, Magnet and Friction.
- `src/games/registry.test.ts`: one new test for the concrete bar-chart and magnet missions.
- No existing assertion was changed or weakened.

## Remaining gaps

- **Not checked visually.** The 37 pictures were drawn by coordinates and tested for structure only. Proportions, overlaps (for example the hand covering a number-line label) and dark-mode contrast need a look on a real screen.
- Match, Sort, Clock, Area, Fraction, Bar chart (build), Map adventure and Push box keep their existing cues, which pulse continuously until the first move rather than once (all stop with reduced motion).
- Mission goals for Sort and Matching are the topic's own prompt from the curriculum (one English reading topic's prompt is a whole short letter). Shortening them means editing curriculum content, which was out of scope.
- No new realistic object art: the engines that would gain most (fractions, clock, magnets, circuit, sort) already use real objects; Area keeps its unit-square grid (a ruler edge was considered but needs a layout change and visual checking).
- Hint wording and explanations were checked to exist, not rewritten.
