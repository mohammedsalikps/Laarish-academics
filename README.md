# Laarish Academics

[![CI](https://github.com/mohammedsalikps/Laarish-academics/actions/workflows/ci.yml/badge.svg)](https://github.com/mohammedsalikps/Laarish-academics/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-laarish--academics.vercel.app-5847E0)](https://laarish-academics.vercel.app)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

A gamified, interactive learning web app for children in **Classes 1–8** (about ages 6–14). Learners pick a subject
and their class, follow an ordered roadmap of lessons and topics, and learn every topic in the same four steps:
**1. Learn → 2. Play → 3. Practice → 4. Complete**. A mentor the child chooses, **Rishi** or **Ayra**, gives hints
and explanations along the way, and learners earn XP, coins, stars and achievements.

**[Open the live app](https://laarish-academics.vercel.app)** · [Run it locally](#run-locally) ·
[Curriculum](#curriculum) · [Deployment](#deployment) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

<details>
<summary><strong>Contents</strong></summary>

- [Learning flow](#learning-flow)
- [Curriculum](#curriculum)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [Mentors: Rishi and Ayra](#mentors-rishi-and-ayra)
- [AI mentor](#ai-mentor)
- [Project structure](#project-structure)
- [Key design decisions](#key-design-decisions)
- [Adding official content and videos](#adding-official-content-and-videos)
- [Deployment](#deployment)
- [Demo vs production](#demo-vs-production)

</details>

> **This is a demo build.** Learner progress is stored in the browser only and sign-in is not enabled. Lessons are
> original Laarish content mapped to NCERT classes where marked, and **none of it has been reviewed by teachers yet**
> (Hindi and Kannada also await native-speaker review). See [Demo vs production](#demo-vs-production).

## Learning flow

```
Home ─► Subject overview (zigzag lesson roadmap of one class) ─► Lesson (topic roadmap) ─► Topic: Learn → Play → Practice → Complete

/home
/subjects
/subjects/:subject?class=6                      overview: totals, class selector, the class's lessons as one path
/subjects/:subject/:lesson                      ordered topics of a lesson
/subjects/:subject/:lesson/:topic?step=watch|play|practice|complete    ("watch" is the Learn step; ?step=learn works too)
```

| Level | Screen | What it shows |
| --- | --- | --- |
| 1 | **Home** (`src/pages/Home.tsx`) | The chosen mentor's greeting and one daily message, one Continue card (the lesson the learner already started, otherwise a lesson from their own class), the mission banner only when a reward is ready to claim, one compact progress link and the subject list. |
| 2 | **Subjects** (`src/pages/Subjects.tsx`) | One card per subject: illustration, description, status, lessons completed / ready (from data), stars, next lesson (from the learner's class), Start/Continue/Review. |
| 3 | **Subject overview** (`src/pages/SubjectRoadmap.tsx`) | Subject name and description; lessons and topics available and completed, stars and overall progress; a small class selector (the learner's class first, kept in the address as `?class=`); and that class's lessons as one winding, numbered path in labelled branch sections, each node completed, in progress (with a ring), available, locked (with what to finish first) or coming soon. Switching class only changes the view. |
| 4 | **Lesson roadmap** (`src/pages/LessonRoadmap.tsx`) | Lesson intro, **where the lesson comes from** (official source and review status), progress, the connected topic path and topic list, Continue Learning. |
| 5 | **Topic player** (`src/pages/topic/`) | Learn (video or labelled temporary explainer, key ideas and transcript), Play (one game, "How to play" on request), Practice (a one-on-one comic-style conversation with the chosen mentor: one question at a time, a kind reaction and explanation after each answer, a celebration at the end), Complete (rewards, stars, mastery, what unlocked). Play unlocks only after Learn is finished and Practice only after the game is finished. |

Deep links are guarded: a locked lesson or topic shows what to finish first, a step that is not open yet sends
the learner to the furthest open step, and ids that do not belong together show "not found". Links saved before
classes existed (`/levels/level-1`, `level-2`, `level-3`), and the old class and branch pages
(`/subjects/:subject/levels/:class[/:branch]`), open the overview at the matching class (and branch); old
`/learn/:id` links redirect to the matching roadmap. Saved progress is keyed by topic id, so none of this changes it.

## Curriculum

**8 classes · 6 subjects · 174 lessons (99 playable, 75 planned) · 240 complete topics · 1 official video.**
The generated audit with every lesson, source and topic is [docs/curriculum-status.md](docs/curriculum-status.md);
the verified official sources are in [docs/curriculum-sources.md](docs/curriculum-sources.md); the audit summary,
method and open gaps are in [docs/curriculum-audit.md](docs/curriculum-audit.md).

| Subject | Branches | Reference used for objectives and order |
| --- | --- | --- |
| Science | Forces and Energy · Materials and Matter · Living Things · Earth, Space and Environment | Classes 1–2: NCF-SE 2023 foundational stage (no NCERT book). Classes 3–5: *Our Wondrous World*. Classes 6–8: *Curiosity* |
| Mathematics | Numbers and Arithmetic · Fractions and Decimals · Shapes and Geometry · Measurement, Time and Money · Patterns and Early Algebra · Algebra · Data Handling | *Joyful Mathematics* (1–2), *Maths Mela* (3–5), *Ganita Prakash* (6–8) |
| English | Phonics, Listening and Speaking · Vocabulary and Grammar · Sentences and Punctuation · Reading and Stories · Writing and Expression | Stage and skills of *Mridang* (1–2), *Santoor* (3–5), *Poorvi* (6–8) |
| Hindi | Letters and Sounds · Words and Vocabulary · Grammar · Sentences, Reading and Writing | Stage of *Sarangi* (1–2), *Veena* (3–5), *Malhar* (6–8) |
| Kannada | (same as Hindi) | Karnataka KTBS books: *Savi/Kali Kannada* (1–4), *Siri/Tili Kannada* (5–8) |
| Social Science | Family and Community · Maps and Places · Our Past · Culture and Heritage · Resources and Livelihoods | Classes 1–2: foundational stage. Classes 3–5: *Our Wondrous World*. Classes 6–8: *Exploring Society: India and Beyond* |

Every subject has at least one playable lesson in every class from 1 to 8, and every playable topic has Watch
(explainer, key ideas, transcript), Play (a real game), Practice (4–5 questions with hints and explanations, at least
3 in the older topics) and Complete. Each lesson records its official source and one of three honest labels:

- **Aligned**: written for a named chapter of a verified NCERT/Karnataka book (2026-27). The match was made from the
  chapter's title and theme; a teacher still has to check it against the chapter text.
- **Curriculum-inspired**: follows the class's stage and themes, but no single chapter matches (most grammar and
  language lessons, and everything in Classes 1–2 where NCERT has no science or social science book).
- **Proposed**: Laarish's own addition (none at present).

The label is shown on each lesson page and given to the AI tutor, which is told never to claim more than that.
Lessons unlock in order **within a class**; there are no prerequisites between classes, so a learner can start
their own class directly. Calculus and other higher-secondary topics are excluded. How to write new content:
[docs/content-authoring.md](docs/content-authoring.md).

**Lesson videos.** Science → Friction → "What is friction?" has an official 62-second animated lesson video
(`public/media/videos/friction-what-is.mp4`, 1920×1080, captions, transcript and read-aloud narration), produced with
the workflow in [docs/video-production.md](docs/video-production.md). The other 239 topics show a clearly labelled
"temporary animated explainer" until their videos are produced; `npm run media:check` lists them.

### Mini-games

| Game | Used for | Interaction |
| --- | --- | --- |
| Push the Box, Friction Lab | Friction | Simulated forces and a fair-test lab (see Friction models below) |
| Concept match | Terms, meanings, translations, examples | Drag a card onto its match (or tap-tap / keyboard), connector lines, hints |
| Sort | Classifying into 2–3 groups | Drag the card into a box or tap the box, with explanations |
| Fair Share Kitchen | Fractions | Tap or paint pieces; live fraction readout |
| Treasure Trail | Directions and maps | Walk a grid map; direction feedback |
| Balance scale | Missing numbers, expressions, equations | Try numbers until the scale is level |
| Sentence Builder | English sentences | Put word tiles in order with the right end mark |
| **Number line** (new) | Counting, place value, adding and taking away by jumps, fractions, decimals, negative numbers, percentages, timelines | Tap a mark or drag the marker; jump arcs; Indian place-value commas |
| **Area builder** (new) | Area and perimeter | Drag out a rectangle on a square grid or use width/height steppers; live area and perimeter |
| **Clock setter** (new) | Telling the time (o'clock to 5 minutes) | Drag the minute hand (the hour hand follows) or use the buttons |
| **Bar chart builder** (new) | Making and reading bar graphs | Drag bars or use +/−; read mode: tap the bar that answers |
| **Circuit lab** (new) | Closed circuits, conductors and insulators | Put an object in the gap and close the switch; the bulb lights only through a conductor (on-screen only) |
| **Magnet Explorer** (new) | Magnets: what they pull, and poles | A workbench with a horseshoe magnet: drag (or tap) everyday objects to it; iron and steel jump across the gap and stick, copper, brass, aluminium, wood, plastic, rubber and glass do not. Then sort new objects into Magnetic / Not magnetic trays. Poles: push one bar magnet towards another and turn it around; opposite poles snap together, like poles push apart without touching, and a mystery magnet's hidden pole is worked out from what happens. A labelled simplified model |

Every game has one task per screen, a guided first move, feedback, a short nudge and then a hint after mistakes,
retry, a completion summary, touch and mouse dragging, keyboard and screen-reader support, reduced motion and a
375 px phone layout.

## Requirements

- Node.js **20.19+ or 22.12+** (developed and tested on Node 24.13.1, npm 11.8)
- npm

## Run locally

```bash
git clone https://github.com/mohammedsalikps/Laarish-academics.git
cd Laarish-academics
npm install
cp .env.example .env        # optional: only needed for the live AI mentor or a media manifest URL
npm run dev                 # http://localhost:5173 (app + /api/mentor)
```

`npm run dev` starts Vite and serves the mentor API from the same dev server, so no second process is needed.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload and the mentor API |
| `npm run typecheck` | TypeScript checks for the app and server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit, integration and navigation tests |
| `npm run build` | Production build: client to `dist/`, Node server to `dist-server/server.mjs` |
| `npm start` | Runs the production server (serves `dist/` and `/api`), reads `.env` if present |
| `npm run check` | typecheck + lint + test + build |
| `npm run mentor:check` | **Live AI check**: makes real calls with your key and prints `LIVE AI VERIFIED` or why not |
| `npm run media:check` | Checks every registered video, caption file and poster against the real files and the video specs (add `-- --write-captions` to regenerate captions from the specs) |
| `npm run curriculum:report` | Regenerates `docs/curriculum-status.md` (lesson map and per-topic readiness) |
| `npm run curriculum:index` | Regenerates `shared/curriculum/topicIndex.ts` after topics change (a test fails while it is out of date) |

## Environment variables

Copy `.env.example` to `.env`. Never commit real secrets.

| Variable | Required | Where | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | For live AI | Server only | Enables the real AI mentor (Claude). Without it, the labelled demo mentor answers. |
| `MENTOR_PROVIDER` | No | Server | `auto` (default), `demo` (force demo) or `claude` |
| `MENTOR_MODEL` | No | Server | Claude model, default `claude-opus-5-5` |
| `MENTOR_EFFORT` | No | Server | `low` (default), `medium` or `high` |
| `MENTOR_TIMEOUT_MS` | No | Server | Provider timeout, default `20000` (3,000–60,000) |
| `MENTOR_MAX_TOKENS` | No | Server | Reply token cap, default `2048` (512–8,192) |
| `MENTOR_RATE_LIMIT` | No | Server | Questions per client IP per 5 minutes, default `30` |
| `TRUST_PROXY` | No | Server | `1` to use `X-Forwarded-For` for rate limiting behind a trusted proxy (automatic on Vercel) |
| `PORT` | No | Server | Port for `npm start`, default `3000` |
| `VITE_MEDIA_MANIFEST_URL` | No | Browser (build time) | Where to load the video manifest from; default `/media/manifest.json` |

Only `VITE_*` variables reach browser code. The API key is read on the server and never sent to the client
(`dist/` is checked for it in the verification steps below).

### Practice and voice

- **Comic-style Practice.** The chosen mentor (official Rishi or Ayra artwork, never a third character) welcomes the
  learner, asks one question per speech bubble, reacts with a short animation and a kind line, gives the lesson's hint
  after a wrong first try and explains every answer. Scoring is unchanged (two tries; full marks first time, half marks
  with a hint or a second try), so saved progress and rewards are unaffected. Keyboard: A–D or 1–4 choose, T/F for
  true/false, Enter checks.
- **Read aloud.** Every bubble has a speaker button (play or stop). With *Read aloud* on (Settings or the quiz toggle),
  each new line is read once when it appears; nothing repeats by itself. The voice is chosen from the line's script:
  English (Indian English preferred), Hindi (Devanagari) or Kannada. Lines in a language the device has no voice for
  are not read; the button says so and the words stay on screen. Settings lists the voices the device has.
- **Voice answers (optional, off by default).** A grown-up can turn on *Answer quiz questions by voice* in Settings.
  The quiz then shows a microphone button; the browser asks for microphone permission only when it is pressed. The
  learner sees what was heard and which choice it matches, and confirms it (it is never submitted automatically);
  tapping always works. Laarish never records or keeps audio; the browser's own speech recognition (Web Speech API)
  turns speech into text, and Chrome and Edge do this on Google's or Microsoft's speech service, which the setting
  explains. Browsers without speech recognition (for example Firefox) simply show no microphone. Denied permission,
  silence, no microphone and network errors each get a short message.
- **Mentor help in the quiz.** "Ask Ayra for another hint / to explain more / for a real-life example" sends only the
  question id and the chosen option id; the server reads the question, checks the answer against the answer key and,
  until the answer has been shown, tells the AI not to reveal it.

## Mentors: Rishi and Ayra

The child picks one of two mentor characters during setup (step 3 of 3); profiles made before mentors existed are
asked once at `/choose-mentor`. The choice is saved with the learner profile (`mentorId`), survives a refresh,
and can be changed in **Settings → Your mentor** without touching progress. The chosen mentor's picture and name are
used on Home, in the navigation, on Watch, Play, Practice feedback, Complete, empty states and in the chat.

- **Artwork:** the official character images are kept unmodified in `assets/mentors/` (`rishi-original.jpg`,
  `ayra-original.jpg`). `public/mentors/{rishi,ayra}.webp` are background-removed cut-outs of them and
  `{rishi,ayra}-face.webp` square head crops. Replace these files to update the art; no code change is needed.
- **Definitions:** `shared/mentor/personas.ts` (name, short intro, catchphrase, personality line, colours). Rishi:
  "Let's explore and solve problems together!"; Ayra: "Let's discover new things together!".
- **Personas, not models.** Rishi and Ayra are two personalities of the **same** live model. The persona adds one
  line to the per-request prompt ("You are Ayra. ..."); it changes how the mentor talks, never the facts, the
  teaching rules or the safety rules (`server/mentor/persona.test.ts` checks that the prompts differ only in
  that line).

## AI mentor

### Turning on live AI and verifying it

1. Create an API key in the Anthropic Console.
2. Put it in `.env` as `ANTHROPIC_API_KEY=...` (local) or in your host's environment settings.
3. Run `npm run mentor:check`. It confirms the configured model with the Models API, then sends real requests
   through the same server handler the app uses, as both personas: "What is your name?" to Rishi and to Ayra, a
   Science question during Push the Box with the current game instruction, a Maths explanation that uses the
   calculator tool, a progress explanation from app numbers, a question about the lesson video, a Friction Lab
   result, an English hint and a Hindi "explain in my language" request. It prints each reply plus a usage line (tokens, tool calls, cache reads). It never prints
   the key. Only treat live AI as working when it ends with **LIVE AI VERIFIED**.
4. Restart `npm run dev`. The log prints `Mentor API: /api/mentor using Claude (...)`, the chat badge shows
   **Live AI**, and each live reply is labelled "Live AI".

### Architecture (one shared model, specialised context and tools)

No model is trained in this app. API calls do not train models, and there are no per-subject or per-topic models.
Both mentors combine:

1. **One shared language model** (Claude, `MENTOR_MODEL`, default `claude-opus-5-5` at low effort) for explanations,
   hints, examples and conversation.
2. **Layered instructions** (`server/mentor/prompt.ts`): a fixed teaching/safety/privacy block (prompt-cached), then
   per-request class guidance, the lesson's curriculum mapping, subject guidance and the current topic's objectives, key ideas and facts, looked
   up on the server by curriculum id (`shared/mentor/knowledge.ts`), so the browser cannot inject "facts".
3. **Deterministic app logic** for anything that must be exact: progress, unlocking and rewards come from
   `src/engine/` and are never decided by the model.
4. **A validated maths engine** (`shared/mentor/calculator.ts`): exact rational arithmetic (fractions, decimals,
   %, "of", brackets). Calculations in the child's question are pre-computed and given to the model, and the model
   can call a **`calculate` tool** (`server/mentor/providers.ts`) for any other number it states (at most two tool
   rounds per reply).
5. **Scientific model facts** (`shared/mentor/scienceModels.ts`): numbers from the same formulas the games use
   (e.g. Friction Lab stopping distances, Push the Box grip levels), so explanations match what the child saw.
6. Specialised predictive models only where a well-defined task, data and evaluation justify them; none exist yet.

### How a question is handled

- **On the device first.** "What is my name?" is answered in the browser from the profile and never sent.
  "How am I doing?" shows exact facts computed from the app's progress (`src/mentor/localAnswers.ts`), then asks
  the AI for a short explanation and next step using a **minimal summary** (counts and curriculum ids only).
- **Minimal context.** Each request carries: the question, at most the last 6 messages (earlier progress answers and
  the greeting are excluded), curriculum ids, the current step (Watch/Play/Practice/Complete), grade and reply
  language, the chosen mentor (`rishi` or `ayra`) and, during Play only, one line saying which game the child is
  in and its current instruction. Never the nickname or profile. Screens without their own context use the learner's current topic.
- **Teaching rules:** answer the latest question first, 40–100 words normally (longer, numbered steps when needed),
  hints rather than answers during Practice, gentle correction of misconceptions, brief answers to off-topic
  questions then an offer to return to the lesson, no invented facts or numbers.
- **Server only.** `server/mentor/handler.ts` validates input (unknown ids and malformed progress are dropped),
  rate-limits per client, screens the message (personal data, self-harm, unsafe content, dangerous experiments)
  **before** any provider call, applies a timeout, sanitises output and returns `{ reply, provider }`.
- **Model check:** before its first reply the server confirms once (per process) that the configured model is
  available to the API key (`models.retrieve`); if not, it answers with a friendly error and logs
  `ModelUnavailableError` instead of calling the model.
- **Cost controls:** low effort, `MENTOR_MAX_TOKENS` cap (2048, covers thinking + answer), short history, prompt
  caching of the fixed block (verified: ~1,200 tokens read from cache per request), one SDK retry, rate limiting.
  Each reply logs one line without conversation text:
  `[mentor] ok provider=claude intent=free step=play subject=science ms=… in=… out=… cache_read=… tools=…`.
- **Honest labelling and failures.** The badge says **Live AI** or **Demo mode**; every reply is labelled "Live AI",
  "Demo answer" or "From the app". If the live server fails, the child sees a friendly error with **Try again**
  and their question is put back in the box; the app does not silently switch to demo answers. The on-device demo
  is used only when no mentor API exists (e.g. static hosting) and is labelled as such.
- **Suggested prompts** (four at a time, step-aware): "Explain this more simply", "Give me a hint", "Show me an
  example", "Why did my answer go wrong?", "Explain it in my language", "How am I doing?".

## Project structure

```
shared/curriculum/   Curriculum model and data used by browser and server
  types.ts           Subject, Lesson, Topic (watch/play/practice/mentor), quiz and game configs
  subjects.ts        Subjects with their classes (levels) and branches; lessons come from lessons/*.ts
  lessons/           Lessons per subject and class range, each with its official source and review status
  topics/            Topic content per subject (science, mathematics, numbersAndAlgebra, english, sentences, languages, social)
  catalog.ts         Lookups, prerequisites and labels over subjects, lessons and the topic index (what the browser ships)
  topicIndex.ts      Generated topic index: ids, order, titles, weights, game types, quiz question ids
  bySubject/         Full topic content grouped per subject; the browser loads one subject at a time (topicContent.ts)
  index.ts           The catalog plus full topics and readiness (video / game / quiz / assessment), for the server and tests
shared/media/        Video production specs (script, storyboard, timed narration → captions) and manifest validation
shared/mentor/       Mentor API types, safety and validation, grounding, exact calculator, science model facts,
                     progress wording, demo mentor
docs/                Video production workflow, curriculum roadmap, generated curriculum status
src/
  app/               Routes, reward toasts, navigation (hierarchy) tests
  components/        UI primitives, art, layout, navigation (Breadcrumbs, RoadmapPath, StepIndicator, StepDots),
                     lesson UI (VideoPlayer, ExplainerPlayer, QuestionView), mentor UI
  content/           Re-exports the curriculum; media manifest loader; daily messages
  engine/            rules.ts (all reward/unlock rules), progression (topic/lesson/subject views), achievements, missions
  games/             Mini-game framework, registry and games: friction, pushbox, match, sort, fraction, grid, balance, words
  pages/             Home, Subjects, SubjectRoadmap (subject overview and class roadmap), LegacyClassRedirect, LessonRoadmap,
                     roadmap/ (shared lesson path), topic/ (player and steps), other screens
  mentor/            Mentor client, conversation state, on-device answers (name, progress summary)
  quiz/              Quiz engine (attempts, hints, credit, scoring)
  state/             Progress model (schema v2), pure reducer, selectors, persistence with migration
server/              Mentor API handler, Claude provider with calculate tool, prompt, rate limiter, dev plugin,
                     Node server, live check, media check and curriculum report scripts
api/                 Vercel serverless functions (mentor, health)
public/brand/        Laarish wordmark and app icons (from the brand kit)
public/media/        manifest.json, videos/, captions/ (generated WebVTT) and posters/ for official lesson videos
```

## Key design decisions

- **Content is data.** Each topic declares its objectives, order, prerequisites (default: the previous topic),
  video metadata, explainer fallback, key ideas, game config, quiz, mastery override, language and mentor context
  and hints. One topic player and one roadmap component render every subject. `shared/curriculum/curriculum.test.ts`
  checks ids, ordering, links, quiz answers, game configs and that missing videos are tracked.
- **Topic content loads per subject.** The browser ships subjects, lessons and a generated topic index (enough for
  roadmaps, unlocking and rewards); a subject's videos, games, quizzes and mentor notes download when one of its
  topics or lesson roadmaps opens, with a loading state and a retry. The mentor server imports everything.
- **Logic is separate from UI.** Unlock and progress rules are pure functions in `src/engine/progression.ts`; rewards
  are decided only in `src/state/reducer.ts` from `src/engine/rules.ts`.
- **Idempotent rewards.** Every reward is claimed with a unique key in a ledger; XP and coin balances are derived from
  it, so replays cannot duplicate rewards or make balances negative. Actions on locked topics, steps that are not open,
  unknown surfaces or incomplete quizzes are ignored.
- **Persistence behind `ProgressRepository`** with versioned envelopes, migration (v1 lessons/stages → v2 topics keeps
  XP, coins, achievements and avatars and explains the change), corrupted-data recovery and cross-tab sync.
- **Accessibility:** keyboard-operable controls and games, visible focus, ARIA for steps, roadmaps and dialogs, live
  regions, reduced motion (OS or in-app), larger text, read-aloud, 44px touch targets, no horizontal overflow.

### Progress and reward rules (defaults in `src/engine/rules.ts`)

- **Watch** is always open and never forces waiting; watching at least 80% earns its XP. **Play** opens after Watch,
  **Practice** after Play, and **Complete** after Practice.
- **Topic mastery** = weighted best scores: Practice ×3, plus the game ×1 when the game is assessed (exploratory
  games such as Push the Box and Friction Lab do not count). A topic is **mastered at ≥60%** (per-topic override
  `mastery.passMastery`), which unlocks the next topic. A lesson is complete when every topic is mastered, which
  unlocks the next lesson.
- **Stars:** completing = 1, ≥70% = 2, ≥90% = 3. **Quiz credit:** right first time without a hint = 1, with a hint
  or on the second try = 0.5, revealed after two tries = 0.

| Event | XP | Coins |
| --- | --- | --- |
| First completion of Watch / Play / Practice | 10 each | – |
| First test of each experiment surface / first correct prediction per surface | 5 / 5 | – |
| Assessed game completed / perfect (first time) | 15 / 10 | – |
| Quiz question right (with help / first try), once per question | 5 / 10 | – |
| Topic completed (first time) | 30 | 5 |
| Each star earned for the first time (1, 2, 3) | – | 3 |
| Lesson completed (first time) | 50 | 15 |
| Achievement unlocked | 10 | 5 |
| Daily mission claimed | 10 | 15 |
| First question to your mentor | 5 | – |

Replays are practice: they can raise best scores and stars (and pay coins only for new stars) but never repeat a reward.

### Friction models

- **Push the Box:** each floor has a grip level (carpet 3, wood 2, ice 1). A push moves the box only when it is
  stronger than the grip, and slides it `(push − grip) × 1.5` steps. A deterministic teaching model.
- **Friction Lab:** from the top of the ramp the toy car leaves at 3 m/s; friction is a constant deceleration `a = μ·g`
  with an effective coefficient (wood 0.10, grass 0.30, gravel 0.60), so it stops after `v₀² / (2μg)` (≈4.6 m, 1.5 m,
  0.8 m). Starting from the middle or low on the ramp is a smaller push: `v₀ = v_top·√(height fraction)`, so the
  distance scales with the height (half, quarter). Air resistance is ignored, and the app says it is a model.

## Adding official content and videos

- **Videos:** follow [docs/video-production.md](docs/video-production.md): write the spec in
  `shared/media/videoSpecs.ts`, render the MP4, save it with its poster under `public/media`, generate captions with
  `npm run media:check -- --write-captions`, register it in `public/media/manifest.json`, mark the topic's video with
  `officialVideo(...)`, and run `npm run media:check` and `npm test`:

  ```json
  { "videos": { "video-friction-what-is": { "src": "/media/videos/friction-what-is.mp4",
                                            "captionsSrc": "/media/captions/friction-what-is.en.vtt",
                                            "captionsLang": "en", "poster": "/media/posters/friction-what-is.jpg" } } }
  ```

  Only `https://` URLs and same-origin paths are accepted. Captions on another origin need CORS. If a video fails
  to play, the learner gets the explainer and can carry on.
- **New topic:** add a `Topic` to the subject's file in `shared/curriculum/topics/`, add its id to the lesson's
  `topicIds` in its `shared/curriculum/lessons/` file, and set the lesson's `status: 'ready'`. A new topic file also
  goes in its subject's list in `shared/curriculum/bySubject/` and in `TOPICS` in `shared/curriculum/index.ts`. Run
  `npm run curriculum:index`, then `npm test`.
- **New game type:** add a config type in `shared/curriculum/types.ts`, a pure logic module with tests and a component in
  `src/games/<name>/`, and register it in `src/games/registry.ts`.

## Deployment

### Vercel (frontend + serverless mentor API) — deployed

Live: **https://laarish-academics.vercel.app** (project `salik-alpha/laarish-academics`).

`vercel.json` builds the client (`npm run build:client`, output `dist/`), rewrites all non-API routes to
`index.html` so deep links and refreshes work, sends the same security headers as the Node server (CSP, nosniff,
frame denial; the microphone allowed for this site only, for opt-in voice answers), and `api/mentor.ts` /
`api/health.ts` become serverless functions. `.vercelignore` keeps `.env` files and local builds out of uploads.
Learner progress stays in each browser, so no database or storage service is needed.

```bash
vercel deploy --prod
```

The live AI mentor needs `ANTHROPIC_API_KEY` in the Vercel project (server-side only). Until it is added the
hosted mentor answers in the labelled demo mode (`GET /api/mentor` returns `{"provider":"demo"}`). To add it:

```bash
vercel env add ANTHROPIC_API_KEY production
```

then redeploy with `vercel deploy --prod` and check that `/api/mentor` reports `"provider":"claude"`. Optional
variables (`MENTOR_MODEL`, `MENTOR_EFFORT`, `MENTOR_RATE_LIMIT`, ...) are listed in `.env.example`.

The in-memory rate limiter is per serverless instance; use a shared store (for example Redis) for strict limits.

### Any Node host (single process)

```bash
npm ci
npm run build
npm start            # PORT defaults to 3000
```

`dist-server/server.mjs` serves `dist/` with SPA fallback, long-term caching for hashed assets, security headers
(CSP, nosniff, frame denial) and the `/api` routes. Keep `node_modules` (production dependencies) next to it.
A `Dockerfile` is included (not built or tested in this environment).

### Static hosting only

Deploy `dist/` to any static host with an SPA fallback to `index.html`. Without a backend, the mentor uses
the on-device demo answers and labels them as such.

## Demo vs production

| Concern | This demo | Needed for production |
| --- | --- | --- |
| Accounts | Nickname-only demo learner, no sign-in | Real authentication with guardian accounts and verified parental consent |
| Progress storage | Browser localStorage on one device (not secure, not backed up) | Server database behind an authenticated API that enforces authorisation and unlock rules server-side |
| AI mentor | Live Claude when `ANTHROPIC_API_KEY` is set (verified with `npm run mentor:check` and in the browser); labelled demo otherwise. Usage is logged to the server console only | Provider-side moderation, persistent usage/cost dashboards and alerts, data-processing agreements, retention policy, human review of flagged conversations |
| Rate limiting | In-memory per process | Shared store |
| Curriculum and media | 240 original topics for Classes 1-8, mapped to verified 2026-27 NCERT/Karnataka books by chapter title or stage; not yet reviewed by teachers or native speakers; one official animated video, temporary explainers elsewhere | Teacher-reviewed lessons checked against chapter content; native-speaker-reviewed Hindi and Kannada; videos for every topic with recorded voice-over; end-of-lesson assessments |
| Parent area | "Ask a grown-up" maths check (not security) | Verified guardian access |

Before collecting any account-based child data, put in place guardian consent, data minimisation, retention limits,
deletion on request, and an assessment against applicable law (for example India's Digital Personal Data Protection
Act, 2023, and laws such as COPPA or GDPR for other regions). This demo does not claim compliance with any of them.
