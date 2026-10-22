# Contributing to Laarish Academics

Thanks for helping children learn. This guide covers setting up the project, the checks every change must pass, and
the rules that keep learners' progress and content safe.

## Set up

Requirements: Node.js 24 (see `.nvmrc`; 20.19+ also works) and npm.

```bash
git clone https://github.com/mohammedsalikps/Laarish-academics.git
cd Laarish-academics
npm install
cp .env.example .env    # optional: only for the live AI mentor
npm run dev             # http://localhost:5173
```

Without `ANTHROPIC_API_KEY` the mentor runs in its clearly labelled demo mode, which is enough for most work.

## Before you open a pull request

```bash
npm run check           # typecheck + lint + all tests + production build
```

CI runs the same steps (plus `npm run media:check`) on every push and pull request. Also:

- Try the change in the browser at phone width (375 px) and desktop width.
- Changed topics? Run `npm run curriculum:index` (a test fails while the topic index is out of date). Changed
  lessons? Also run `npm run curriculum:report`.
- Changed the mentor's prompt or providers? Run `npm run mentor:check` with a real key and include the result.

## Rules that protect learners

- **Never rename or reuse a curriculum id** (subject, lesson, topic or question). Progress is saved per topic id.
- **No secrets in the repository.** API keys live in `.env` (ignored) or the host's environment variables, never in
  code, tests, screenshots or logs. The browser bundle must not contain server keys.
- **Minimal data to the AI.** The mentor receives curriculum ids and short app-computed facts, never the learner's
  name or full history.
- **Honest content.** Label lessons as aligned, curriculum-inspired or proposed as described in
  [docs/content-authoring.md](docs/content-authoring.md), and never claim teacher or native-speaker review that has
  not happened. The app checks quiz answers against the answer key; the AI never grades.
- **Accessible by default.** Every interaction works with touch, mouse and keyboard, has a screen-reader name, and
  respects reduced motion.

## Where things live

| Area | Location |
| --- | --- |
| Curriculum data (subjects, lessons, topics) | `shared/curriculum/` (how to write content: [docs/content-authoring.md](docs/content-authoring.md)) |
| Games | `src/games/<game>/` (pure logic module + component + tests), registered in `src/games/registry.ts` |
| Pages and topic player | `src/pages/`, `src/pages/topic/` |
| Progress rules and rewards | `src/engine/`, `src/state/reducer.ts` |
| Mentor (shared, server, browser) | `shared/mentor/`, `server/mentor/`, `src/mentor/` |
| Serverless API (Vercel) | `api/` |

## Commits and pull requests

- Keep each pull request to one change, with a short description of what changes for learners.
- Write commit messages in the imperative ("Add clock game hints"), with details in the body when useful.
- Fill in the pull request checklist.
