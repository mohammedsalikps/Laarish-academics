# Curriculum audit: expansion to Classes 1–8

Date: 21 October 2026. Counts are generated from the curriculum data (`npm run curriculum:report` writes the full
lesson-by-lesson table to [curriculum-status.md](curriculum-status.md)); nothing here is estimated.

## 1. Before and after

| Measure | Before (Phase 1 audit) | After |
|---|---|---|
| Classes (grades) supported | 1–7, as three grade bands (1–2, 3–4, 5–7) | **1–8, one level per class** |
| Subjects | 6 | 6 (unchanged ids) |
| Branches | 23 (counted per subject) | 29 (per subject), used in 117 class × branch units |
| Lessons | 67 (11 playable, 56 empty "coming soon" cards) | **174 (99 playable, 75 planned)** |
| Topics | 24 | **240** |
| Fully playable topics (Watch, Play, Practice, Complete) | 24 | **240** |
| Practice questions | 76 | 1,140 |
| Topics with a verified official video | 1 | 1 |
| Topics without a game | 0 | 0 (2 friction simulations are exploratory, not assessed) |
| Topics without a quiz (fewer than 3 questions) | 0 | 0 |
| Game types | 8 | 13 (new: number line, area builder, clock setter, bar chart builder, circuit lab) |
| Lessons with an official source recorded | 0 | 174 |

The 56 empty cards from the earlier sample map had no topics, so no saved progress depended on them. They were
replaced by lessons mapped to the verified books; planned lessons now exist only for real chapters that are not
written yet.

## 2. Coverage by subject and class

Playable lessons / all lessons · playable topics.

| Subject | Class 1 | Class 2 | Class 3 | Class 4 | Class 5 | Class 6 | Class 7 | Class 8 | Total |
|---|---|---|---|---|---|---|---|---|---|
| Science | 2/2 · 5 | 2/2 · 5 | 2/7 · 5 | 2/7 · 5 | 2/6 · 5 | 5/11 · 12 | 3/11 · 7 | 4/13 · 12 | 22/59 · 56 |
| Mathematics | 3/6 · 8 | 4/7 · 9 | 4/7 · 9 | 5/8 · 11 | 4/6 · 9 | 3/7 · 7 | 3/8 · 7 | 4/9 · 9 | 30/58 · 69 |
| English | 1/1 · 3 | 2/2 · 4 | 2/2 · 5 | 2/2 · 4 | 2/2 · 5 | 2/2 · 5 | 2/2 · 5 | 2/2 · 5 | 15/15 · 36 |
| Hindi | 2/2 · 5 | 1/1 · 3 | 1/1 · 3 | 1/1 · 3 | 1/1 · 3 | 1/1 · 3 | 2/2 · 4 | 2/2 · 4 | 11/11 · 28 |
| Kannada | 2/2 · 5 | 1/1 · 2 | 1/2 · 2 | 1/1 · 2 | 1/1 · 2 | 1/1 · 2 | 2/2 · 4 | 1/1 · 2 | 10/11 · 21 |
| Social Science | 1/1 · 3 | 1/1 · 3 | 1/1 · 3 | 2/2 · 5 | 1/1 · 3 | 2/5 · 5 | 2/5 · 5 | 1/4 · 3 | 11/20 · 30 |

Every subject has at least one playable lesson in every class (a test enforces this). Science and Mathematics were
prioritised (125 of the 240 topics). Every class of every subject ends at least one lesson with a mixed review topic
(50 review topics in all).

## 3. Sources and how alignment is labelled

Sources were verified on 21 October 2026 for the 2026-27 academic year; the full record, with URLs, chapter lists and
what could not be verified, is [curriculum-sources.md](curriculum-sources.md).

- NCERT textbooks under NCF-SE 2023 (ncert.nic.in): *Joyful Mathematics*, *Maths Mela*, *Ganita Prakash*;
  *Mridang*, *Santoor*, *Poorvi*; *Sarangi*, *Veena*, *Malhar*; *Our Wondrous World*; *Curiosity*;
  *Exploring Society: India and Beyond*. Chapter titles were read from each book's official contents page.
- NCF-SE 2023 for the stages (no science, EVS or social science textbook in Classes 1–2; The World Around Us from
  Class 3; Science and Social Science from Class 6).
- CBSE: the curriculum pages cover Classes IX–XII; CBSE's use of NCERT books for Classes I–VIII comes from its circulars.
- Karnataka Textbook Society (2026-27): *Savi Kannada* / *Kali Kannada* (Classes 1–4), *Siri Kannada* / *Tili
  Kannada* (Classes 5–8). Titles were read from page images.

| Label | Playable lessons | Planned lessons | Meaning |
|---|---|---|---|
| Aligned | 42 (Science 17, Maths 18, Social Science 7) | 37 | Written for a named chapter of a verified book; matched by the chapter's **title and theme**. The chapter text was not compared line by line. |
| Curriculum-inspired | 57 (all English, Hindi and Kannada; Classes 1–2 Science and Social Science; some Maths and Science) | 38 | Follows the class's stage and themes; no single chapter matches, or the chapter match is a guess. |
| Proposed | 0 | 0 | Laarish's own addition, not checked against a syllabus. |

**No lesson is claimed as officially approved or fully aligned to its chapter content.** The label appears on each
lesson page and is given to the AI tutor, which is instructed not to claim more (checked with a live call: asked
"Is this exactly what will come in my school exam?", the tutor said it could not promise that, explained the
mapping and pointed the child to their teacher and textbook).

## 4. Still awaiting human review

| Review | Lessons |
|---|---|
| Teacher review (all content) | **174 of 174** |
| Native-speaker educator (Hindi, Kannada) | **22** (11 Hindi, 11 Kannada); the authors listed every word and grammar point they were unsure of (see the lesson files' review notes and the Hindi and Kannada sections below) |
| Chapter-content check for "aligned" lessons | 79 (42 playable, 37 planned) |

Points flagged by the content authors for review:

- **Hindi**: vowel and consonant counts (11 vowels including ऋ; "33 basic consonants"), matra rendering on a dotted
  circle, noun gender examples (पानी m; किताब, सड़क, साइकिल f), honorific plurals, the ने rule as "usually",
  sentence-type examples (मिश्र/संयुक्त) and idiom meanings.
- **Kannada**: letter counts (13 vowels, 34 consonants), the transliteration scheme, picture words, noun types
  (ರೂಢನಾಮ/ಅನ್ವರ್ಥನಾಮ), gender of animals, formal future forms, proverb wording and meanings, and deliberately wrong
  distractors.
- **Science**: invented but realistic chart data (labelled as examples), the iron sulfide magnet example, lime water
  as basic, seasons simplified to three, food groups as go/grow/glow.
- **Social Science**: facts stated (28 states and 8 union territories, 22 scheduled languages, Constitution dates,
  73rd/74th Amendments, Harappan dates, ₹ symbol 2010, UPI 2016, RBI 1935) and relative words in several languages.
- **English**: reported speech backshift rules, "Yours sincerely" vs "Yours obediently", the Ganga's source simplified
  to the Gangotri glacier.
- **Mathematics**: where a chapter title did not name its topic (for example *Maths Mela* Class 3 "Fair Share",
  Class 5 "Animal Jumps", *Ganita Prakash* Class 8 "Fractions in Disguise" for percentages) the mapping is a reasoned
  guess and labelled curriculum-inspired; decimals are not taught before Class 7 because no earlier chapter title
  names them.

## 5. Gaps that remain

- **Videos**: 239 of 240 topics use the labelled temporary animated explainer.
- **Planned lessons**: 75 verified chapters are not written yet (most in Science and Mathematics Classes 3–8 and
  Social Science Classes 6–8). They show as "coming soon" after the playable lessons, never blocking them.
- **Assessments**: no end-of-lesson assessment yet (each topic has its own quiz; 50 review topics act as revision).
- **Sensitive chapter**: *Curiosity* Class 7 "Adolescence" is only a planned lesson.
- **Audio**: Hindi, Kannada and English phonics rely on the device's read-aloud voice; no recorded pronunciation.
- **Older topics**: the 24 original topics keep their 3–4 practice questions (new topics have 4–5); their ids and
  lessons are unchanged so saved progress still counts.
- **Download size** (fixed 22 October 2026): the app no longer ships every topic. It loads subjects, lessons and a
  small topic index (the main curriculum chunk went from 426 kB to 71 kB gzipped); each subject's topic content
  (36–109 kB gzipped) downloads when one of its topics, its lesson roadmap or the offline demo mentor needs it.

## 6. How it was checked

- `npm run check` (type check, lint, 848 automated tests, production build) passes.
- Curriculum tests check, for all 240 topics: unique stable ids, ordering, prerequisites (within a class only), a
  complete Watch → Play → Practice definition, valid game data (number-line targets on a tick, reachable area and
  clock answers, one balancing choice, chart values on the scale), coach lines that use only the values each game
  sends, no invented video URLs, a source and review status on every lesson, and at least one playable lesson per
  subject per class.
- Progress tests play every one of the 99 playable lessons topic by topic through the real reducer (unlocking in
  order, rewards paid once), check that weak quiz scores keep the next topic locked, that "Continue learning" picks
  the learner's class and then carries on with the lesson they started, and that progress saved with the original
  24 topics still completes the same lessons after reloading.
- In the browser (375 px and 1280 px): onboarding with Classes 1–8, the class map, a class page, a full new topic
  (Watch → Play on the number line → Practice → Complete with XP, coins and the next topic unlocking), the clock,
  area builder, bar chart and circuit games inside real topics, Hindi and Kannada script in their games, and the
  source line on lesson pages.
- Live AI (`npm run mentor:check`, 11 real requests): both mentors, the new Class 7 circuit topic, the syllabus
  honesty question and the existing checks.
