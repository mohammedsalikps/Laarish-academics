# Writing curriculum content

How lessons and topics are written for Laarish Academics. The data lives in
`shared/curriculum/` and is plain TypeScript, checked by `shared/curriculum/curriculum.test.ts`.

```
Subject → Class (level "class-1" … "class-8") → Branch → Lesson → Topic → Watch → Play → Practice → Complete
```

## Files

| What | Where |
|---|---|
| Schema (all types) | `shared/curriculum/types.ts` |
| Lessons, per subject or class range | `shared/curriculum/lessons/*.ts` (built with `classBranch`, `planned` and `source` from `lessons/helpers.ts`) |
| Topics | `shared/curriculum/topics/*.ts` (scenes with `scene`, videos with `missingVideo` from `topics/helpers.ts`) |
| Subjects, classes, branches | `shared/curriculum/subjects.ts` |
| Official sources that were checked | `docs/curriculum-sources.md` |
| Topic index shipped with the app (generated) | `shared/curriculum/topicIndex.ts`: run `npm run curriculum:index` after adding, removing or reordering topics, or changing a topic's title, summary, icon, minutes, game type, weights or quiz question ids |
| Topic content per subject (loaded on demand) | `shared/curriculum/bySubject/*.ts`: a new topic file goes in its subject's list here and in `TOPICS` in `shared/curriculum/index.ts` |

The app ships subjects, lessons and the small topic index; a subject's full topic content (videos, games, quizzes,
mentor notes) is downloaded the first time one of its topics is opened. Tests fail if the index or the per-subject
lists drift from the topic files.

## Ids

- Ids are stable database keys: learner progress is stored per topic id. **Never rename or reuse an existing id.**
- Lowercase kebab-case, prefixed by subject or theme and unique across the whole curriculum, e.g. lesson `m4-multiplication`, topic `m4-multiplication-arrays`. Hindi/Kannada ids use Latin letters (`hi3-matra-aa`, `kn2-vowels`).
- Quiz question ids only need to be unique within their topic.

## Lessons

Every lesson has: `id`, `title`, `summary` (one sentence), `intro` (two short sentences, spoken to the child), `objectives` (2–4 "can do" statements), `icon`, `status`, `topicIds` and a `source`.

- **Playable lesson** (`status: 'ready'`): 2–4 topics, each complete (see below). Its topics are listed in order in `topicIds`.
- **Planned lesson**: `planned(id, title, summary, icon, source)`. Shows as "coming soon". Use it for units the class should have but that are not written yet. Do not add planned lessons just to make a class look full.
- `source` records where the learning objectives come from:
  - `status: 'aligned'` only when the lesson is written for a chapter or unit listed in `docs/curriculum-sources.md` as verified for that class and year. Put the chapter title in `unit` and say how it was checked in `verification`. "Aligned" here means mapped to that chapter by its title and theme: it is not a claim that the chapter's content was compared line by line, which still needs a teacher.
  - `status: 'curriculum-inspired'` when the lesson fits the class's stage and themes but no single verified chapter matches (or the source is only corroborated).
  - `status: 'proposed'` (and `proposed: true` on the lesson) for Laarish's own additions.
  - Never claim alignment that is not in `docs/curriculum-sources.md`.
- Lessons in a branch unlock in order **within a class**. Do not add prerequisites that point to another class: a learner can start their own class directly. Cross-branch prerequisites inside a class are allowed when one lesson truly needs another.
- `review: { teacher: 'pending' }` on every new lesson; Hindi and Kannada lessons also get `nativeSpeaker: 'pending'`.

## Topics: a complete learning experience

Every topic in a playable lesson must have **all** of these (the tests check them):

- `title`, `summary`, `objectives` (1–3), `language`, `icon`, `estimatedMinutes` (5–10), `difficulty` (1 introduce, 2 practise, 3 stretch).
- **Watch**: `video: missingVideo('video-<topic-id>', title)` (there is no official video yet; never invent a URL), an `intro` line from the mentor, 3–5 explainer `scene(caption, illustration)`s that teach the idea step by step, and 2–4 `keyIdeas` (the recap).
- **Play**: a real game from the table below with 3–6 rounds/items, clear prompts, a hint and an explanation for each, and a `coach` script using that game's event keys. `assessed: true`, `weight: 1` unless the game is purely exploratory.
- **Practice**: 4–5 questions (`single-choice`, `true-false` or `match-pairs`), each with a `hint` that helps without giving the answer and an `explanation` that says why. Distractors must be plausible mistakes a child might make, never jokes. `weight: 3`.
- **Mentor** grounding: 3–5 `facts` (true, simple statements the AI tutor may use), `simpler` (one-sentence version), `examples` (1–2, from Indian children's everyday life), `why`, `hints` (`default` plus `watch`/`play`/`practice` where useful), `faq` (2–4 keyword → answer), and `practice` (1–2 open questions with `accept` keywords and an `explanation`).

### Illustrations for explainer scenes

`friction-forces`, `surface-bumps`, `rough-vs-smooth`, `grip-and-brakes`, `reduce-friction`, `car-on-surfaces`, `magnet-poles {mode}`,
`fraction {parts, filled}`, `compass-rose`, `icon {icon, tone}`, `word-chips {words}`, `colour-swatches {items}`,
`balance {left, right, tilt}`, `number-line {from, to, start, jumps}` (whole numbers, at most ~20 ticks), `clock {hour, minute}`,
`bar-chart {bars}`, `shape {sides, label}` (0 = circle), `area-grid {cols, rows, width, height}`, `circuit {closed}`.
Use `icon` or `word-chips` when nothing else fits; keep word chips to 2–5 short words.

### Magnet Explorer objects

Each object has a `material`, and whether a magnet pulls it must equal `MAGNET_PULLS[material]` in `types.ts` (a test
checks it). Only iron and ordinary iron-based steel are pulled. Do not add objects whose material is uncertain, such as
coins of unknown metal or stainless-steel spoons (many are not magnetic); say what a coin is made of in its label. The
pictures are drawn in `src/components/art/ObjectArt.tsx`; a new object needs a new drawing there.

### Object pictures in Circuit lab and Sort

`circuit` items and `sort` items can have `art` (one of the `ObjectArt` drawings), shown instead of `icon`. Give an
item a picture only when the drawing shows the same object in the same material as its label, and that material
behaves as the game says: a "Steel key" gets `steel-key`, never `brass-key`; a "Copper wire" gets `copper-wire`, not
the copper coin. When nothing matches, keep the icon or add a drawing. In a sort game, never let the items with
pictures be the ones from one box (for example, only the metal things drawn), so a picture never hints at the answer.

### Games and their coach event keys

| Game type | Use for | Coach keys (write a line for each) |
|---|---|---|
| `concept-match` | Matching terms to meanings, examples to ideas, words to translations | `start`, `match-correct`, `match-incorrect`, `complete`, `complete:perfect` |
| `sort` | Classifying into 2–3 groups | `start`, `sort-correct`, `sort-incorrect`, `complete`, `complete:perfect` |
| `fraction-builder` | Shading fractions of a shape | `start`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `balance` | Missing numbers, equations | `start`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `word-order` | Building sentences (English only: capital first, `.` `?` or `!` last) | `start`, `tile-placed`, `sentence-correct`, `sentence-incorrect`, `sentence-hint`, `complete`, `complete:perfect` |
| `grid-explorer` | Directions and maps | `start`, `task-correct`, `task-incorrect`, `complete`, `complete:perfect` |
| `number-line` | Counting, adding/taking away by jumps, place value, fractions, decimals, negative numbers | `start`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `area-grid` | Area and perimeter of rectangles | `start`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `clock` | Telling the time | `start`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `bar-chart` | Building and reading bar graphs and pictograph data | `start`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `circuit` | Conductors and insulators, closed and open circuits (on screen only) | `start`, `bulb-on`, `bulb-off`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `magnet-lab` | Magnet Explorer: which materials a magnet pulls (test and sort rounds), and poles (attract, repel, identify a hidden pole) | `start`, `pulled`, `not-pulled`, `sort-correct`, `sort-incorrect`, `attract`, `repel` (and `attract:mystery`, `repel:mystery` for the hidden-pole round, which must not name the pole), `turned`, `hint`, `round-correct`, `round-incorrect`, `complete`, `complete:perfect` |
| `push-box`, `friction-experiment` | Friction only (existing topics) | see `topics/science.ts` |

Coach lines may use `{explanation}` or `{hint}` placeholders where the game sends them. Check an existing topic using the same game (for example `topics/mathematics.ts`, `topics/numbersAndAlgebra.ts`, `topics/english.ts`, `topics/social.ts`) and copy its key names exactly.

Game data rules that the tests enforce: a `number-line` target (and jump start) must be exactly on a tick, with at most 40 ticks; an `area-grid` round must be possible on the grid; `clock` minutes must be multiples of `minuteStep` and the time must not be 12:00; `bar-chart` values must be multiples of `step` up to `max`, 2–6 categories; a `balance` round must have exactly one balancing choice; a `circuit` needs at least one conductor (and an insulator for `test-all`).

### Practice (the comic-style quiz)

The mentor asks the questions one at a time, reacts to each answer and explains it. Everything it says about the
subject comes from the question's own `hint` and `explanation`, so write both as short, kind sentences a child can
hear read aloud. The app checks answers against `correctOptionId` / `correct`; the AI never grades. Optionally set
`practice.intro` to the mentor's opening line (for example "Ready for a magnet challenge? ..."); otherwise a general
line is used.

## Quality and safety

- Original writing only. Use the official curriculum for **objectives and sequence**, never copy textbook text, exercises, stories, poems or pictures.
- Facts must be correct. Numbers in explanations must add up. Science must match the real world (a bulb lights only through a conductor in a closed circuit; never suggest touching mains electricity).
- Experiments described for real life use safe household materials only. Anything involving heat, sharp tools, chemicals stronger than kitchen ingredients (vinegar, baking soda, lemon juice, salt, sugar) or electricity beyond a toy cell must be on-screen only or say "with an adult".
- Age-appropriate language: Classes 1–2 very short sentences; Classes 3–5 short sentences; Classes 6–8 clear sentences with correct subject terms.
- Indian context: rupees, Indian names, places, food, festivals and seasons, written respectfully and without stereotypes.
- Hindi uses Devanagari with correct spelling and matras; Kannada uses Kannada script. Add a Latin transliteration in brackets where it helps a beginner. All Hindi and Kannada content stays `nativeSpeaker: 'pending'` until a native-speaker educator has reviewed it.
- No placeholders: no "Topic 1", "TBD" or lorem ipsum. If something cannot be written well, leave the lesson `planned`.
