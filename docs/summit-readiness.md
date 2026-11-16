# Tech Summit readiness: Class 6 → Science → Magnets

Branch `feature/tech-summit-redesign` (never merged; `main` and production untouched).
Last updated 16 Nov 2026.

## The demo journey (verified end to end on a fresh learner, at 375 px)

Onboarding → Home (first-visit card) → set this week's chapter (Magnets) → "Start today's plan" →
3D chapter path → topic sheet (60 % meter) → Watch → Play (3D magnet bench, three rounds) →
Practice (6 questions incl. picture choice, sorting into trays, true/false with a reason) →
Complete (stars, rewards, recap) → back to the chapter path: Topic 1 done, Topic 2 unlocked.
Progress survives a full reload. The compass topic ("Finding directions with a magnet") follows
as an Explore more topic after the chapter trophy.

## Running the summit demo

1. Before the session: open the preview (below) on the demo device, signed in to Vercel or with a
   shareable link. Make a fresh learner by clearing the site's data in the browser. Charge the
   device; Wi-Fi on.
2. Welcome → **Start learning** → a nickname → **Class 6** → choose Rishi or Ayra.
3. Home: point out the 3D hub (drag to spin). Tap **Science** to fly into Discovery Valley, then
   tap **Magnets**.
4. Chapter path: tap **Topic 1**. The sheet shows the 60 % unlock and, at the bottom, the honest
   source line (Laarish original, NCERT Curiosity Class 6 section 4.1 pages 62-64, awaiting teacher
   review). Tap **Start**.
5. Watch: the labelled animated explainer (use the scene arrows to move on), then
   **Continue to Play**.
6. Play: drag or tap objects to the magnet. Show **Need a hint?** (hint 1, then hint 2, then
   "Ask Rishi"). In round 3 put one object in the wrong tray to show the calm "not yet"
   feedback, then sort correctly and **Finish**.
7. Practice: 6 questions (picture choice, sorting, true/false with a reason).
8. Complete: stars, XP and achievements. Back on the chapter path, Topic 2 is unlocked.
9. If 3D is slow or unavailable on the device, add `?nowebgl` to the address, or set Lite mode in
   Grown-ups: the same journey runs on the 2D map and lists.
10. Do not promise: official videos, teacher-reviewed content, AI answers in the preview (it has no
    AI key and shows labelled demo answers), offline downloads, or phone performance figures
    (not yet measured on a real phone).

## Task ledger

| Area | State |
|---|---|
| Summit slice (Home, hub, world, chapter path, topic sheet, Watch, Play, Practice, Complete, Lite) | Done, tested, pushed |
| Magnets compass topic (NCERT Curiosity Ch. 4, §4.3, pp. 65-67) | Done, tested, pushed |
| Shared game layer for all 14 engines (feedback tone, objective, Play again, round progress, not-yet colour, sort reasons) | Done, tested, pushed |
| 3D: soft shadows (desktop-class only), floating world island, collision-free pins | Done, tested, pushed |
| My progress: streak week and Your worlds; brand badge colours | Done, tested, pushed |
| Grown-ups: weekly school report, daily goal, chapters and tests, Lite mode | Done, tested, pushed |
| Mini Makers (Classes 7-8): Manrope, evening hub, numbered nodes | Done, tested, pushed |
| Mini Makers worked-solution reveal (M3) | Not started: needs solution steps in content |
| Per-engine fixes from the audit: friction "Surfaces tested X of N" and scene text/overlays at 375 px; area grid squares ≥ 24 px at 320 px for 10 columns; balance pan labels never clipped | Done, tested, pushed (checked by hand at 375 and 320 px) |
| "Need a hint?" in Play for all 14 engines: one hint at a time (a nudge from the question, then the round hint, never the answer), free, offline, then "Ask Rishi/Ayra" | Done, tested, pushed (content test over all 241 topics; Magnets played through the app; checked by hand at 375 px) |
| Engine audit, all 14 one by one (mission, instructions, hints, feedback, explanation, replay, progress, keyboard/touch, layout, reduced motion) | Done; fixes pushed: number-line step buttons, readable Push Box / Circuit / Magnet 2D labels, map "Stop X of Y", Balance and Circuit wording, Friction feedback colours and coach lines, keyboard focus kept in Friction, Sentence builder and Push Box, Match hint follows the card tried |
| Magnets content fact-check against the chapter text; source line on every topic sheet ("Laarish original lesson", section and pages, "awaiting teacher review") | Done, tested, pushed |
| Android test checklist (`docs/android-test-checklist.md`) | Written. Real-phone test **not done**: no Android phone was available |
| Downloadable worlds / service worker (X4) | Not started: not safe tonight; the app says only what is true |
| Official videos (Magnets, Halves and Quarters, Plant from Seed, Building Sentences) | Not started: no verified assets; labelled animated explainers stay |
| Preview deployment | Done: isolated Vercel preview of this branch (see "Preview deployment" below) |
| Chapter path at 375 px: Rishi's speech bubble covers the label of the last (locked, Explore more) node | Known, not fixed (cosmetic) |
| Vercel's own type check of the mentor server files reports 3 TypeScript errors (non-strict narrowing in `server/mentor/handler.ts` and `providers.ts`; code unchanged from `main`). The build completes and deploys | Known, not fixed |

## Performance (production build, measured)

Method: `vite preview` of the production build, headless Chrome 154 over the DevTools protocol, on
this laptop's Intel UHD Graphics (hardware ANGLE/D3D11). "Phone" = 390×844 at 2.75×, an Android
user agent (so the app takes its phone path) and Chrome's CPU slowdown (4× and 6×) to approximate a
mid- and low-end phone CPU. The GPU is **not** slowed down. Times are medians of three runs, from
navigation start to the scene's first frame (`performance.mark('laarish:*-first-frame')`; add `?perf`
to any URL for the stats). Measured after every change on 16 Nov.

| Scene | Measured | Wireframe budget |
|---|---|---|
| Hub first frame, desktop, cold cache (with soft shadows) | 676 ms | ≤ 2 s |
| Hub first frame, phone 4×, cold cache | 1.15 s | ≤ 2 s |
| Hub first frame, phone 6×, warm cache | 2.0 s (runs 1.75-2.3 s): borderline | ≤ 2 s |
| World first open, phone 4×, cold cache | 877 ms | ≤ 5 s |
| World, phone 4×, warm cache | 836 ms | ≤ 1.5 s cached |
| Hub tap → world first frame (includes the 1.2 s fly-in), phone 4× | 1.80 s | 1.2 s flight + ready |
| Chapter path, phone 4×, warm | 774 ms | (same world) |
| Magnet bench, Watch → Play tab, phone 4× / 6× | 304 ms / 398 ms | ≤ 3 s |
| Draw calls: hub (desktop / phone) / world / chapter / bench | 16 / 9 / 2 / 3 / 17 | ≤ 60 / ≤ 80 / ≤ 80 / ≤ 40 |
| Triangles: hub (desktop / phone) / world / chapter / bench | 38,432 / 22,160 / 5,980 / 6,900 / 1,516 | set after the engine test |
| Textures | 0 (vertex colours only) | set after the engine test |
| JS heap after the scene loads | 12-30 MB | — |
| three.js chunk (only when 3D is shown) | 556 KB (138 KB gzip) | — |
| Island engine / magnet bench code | 26 KB / 10 KB (9.5 / 3.8 KB gzip) | hub ≤ 8 MB, play ≤ 4 MB |
| World pack download | none: islands are built in code | ≤ 15 MB |
| Whole production build (`dist`) | 8.0 MB | base app ≤ 60 MB |
| Frame rate | 97-144 fps (laptop GPU) | 30 fps on Snapdragon 680: **not measured** |

Soft shadows (one 1024 shadow map) doubled the hub's render passes and pushed phone first frames
past 2 s, so they are used only on desktop-class devices (8 GB+, 8+ cores, not a phone);
`?shadows=on|off` overrides it. Not measured: a real Android phone, GPU-limited frame rate on a
budget phone, battery and heat.

## Lite mode and offline

- No WebGL (`?nowebgl`, real Chrome): Home shows the 2D map, the world shows the chapter list, no
  canvas is created and three.js is never downloaded. The whole journey test runs in Lite mode.
- Reduced motion (saved setting or OS) and the grown-ups' Lite mode setting both switch to Lite.
- Offline: a calm banner; progress is saved on the device; the mentor answers with its labelled
  offline answers and the topic's prepared hints. There is no service worker, so lessons not yet
  opened are not available offline, and the app does not claim they are.

## Wireframe contradictions resolved

- Chapter vs lesson: a wireframe "chapter" is the app's lesson; routes `/world/:subject/chapter/:lesson`.
- "sci6-13" refers to the old textbook; the app maps Magnets to *Curiosity* Chapter 4 (verified).
- Tints on progress bars (page 1 says never; H1 note 4 says yes): progress bars stay navy/teal.
- Pin label size (13-14 px vs Nunito 11): 13 px, for readability.
- Minutes (P1, G1, G3): the app records XP and active days, not minutes; screens say XP and days.
- Adding a topic to a finished lesson would reopen it: new topics in shipped lessons are marked
  Explore more and never decide completion (saved-progress contract).
- 3D pins drawn on the art vs the captions: pins come from real lessons at the island's landmarks;
  chapter order follows the verified textbook chapter numbers.

## Preview deployment

**Preview (16 Nov 2026, app code of commit `ca1a89d`):
https://laarish-academics-j4r3uzwev-salik-alpha.vercel.app**. An earlier preview of `c492172` is
https://laarish-academics-3pv156hxp-salik-alpha.vercel.app.

- Made with the existing project `salik-alpha/laarish-academics` (`vercel deploy --target preview`,
  no `--prod`, no `vercel link`, no environment changes), using `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`
  so no new project could be created.
- Isolation checked afterwards: production is still the 25-day-old deployment `fzpqu6297`, and both
  production domains (laarish-academics.vercel.app, laarish-academics-salik-alpha.vercel.app) still
  point to it.
- The project's only environment variable is `ANTHROPIC_API_KEY`, scoped to Production. The preview
  therefore has no AI key: the mentor answers with its labelled demo answers. There are no database
  or Firebase variables, so the preview cannot reach production data.
- The project has Vercel Authentication on for every deployment except custom domains: opening the
  preview needs a Vercel sign-in with access to the team, or a shareable link made in the Vercel
  dashboard (Deployment → Share). The settings were not changed.
- The project is not connected to GitHub, so pushes do not deploy; previews are made from the CLI.

## Verification (final run on this branch)

- Typecheck, lint, production build, lesson media check: all pass.
- Tests: 1,316 of 1,316 in 78 files, including every route, all 14 game engines, hints for every
  game in the curriculum, the engine-audit fixes, the saved-progress contract, 60 % unlock, the
  Lite-mode journey, the weekly report, Mini Makers, source notes and pin layout.
- By hand on the production build at 375 px (16 Nov): onboarding (new Class 6 learner) → Home →
  Discovery Valley → Magnets → topic sheet → Watch (3 scenes) → Play on the 3D bench (3 rounds,
  one deliberate wrong sort) → Practice (6 of 6) → Complete (92 %, Level 2) → Topic 2 unlocked;
  progress kept after a full reload; `?nowebgl` gives the 2D map and chapter list with no
  three.js download; every route opens without an error or sideways scroll. Desktop (1366 px)
  Home and Topic 2 checked.
- Secret scan (API keys, tokens, private keys) of tracked files, the built bundle and this branch's
  history: no matches; no `.env` file is tracked.

## Continuing next session

1. `git fetch` and check out `feature/tech-summit-redesign` (or restore from the newest
   `E:\laarish-academics-backups\laarish-academics-all-refs-*.bundle`; copies on F:).
2. `npm ci`, then `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`.
3. `npm run dev` for development; `npm run build && npm run preview` (port 4173) for measurements.
   The measurement method is described above; add `?perf` to read scene stats.
4. Next tasks, in order: the real Android phone test (`docs/android-test-checklist.md`); a
   shareable preview link for the summit (Vercel dashboard); the chapter-path bubble overlap at
   375 px; official videos when assets exist; the Mini Makers worked-solution reveal once
   lessons have solution steps.
5. New preview: `VERCEL_ORG_ID=<team id> VERCEL_PROJECT_ID=prj_g0HbBNe6IYWLHS3X45CeNPK6Gb66
   npx vercel@65.16.0 deploy --target preview`. Never `--prod`.
