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
| "Need a hint?" button inside Play (audit item 6) | Not started: most games show a hint after a wrong answer, but there is no on-demand button yet |
| Downloadable worlds / service worker (X4) | Not started: not safe tonight; the app says only what is true |
| Official videos (Magnets, Halves and Quarters, Plant from Seed, Building Sentences) | Not started: no verified assets; labelled animated explainers stay |
| Preview deployment | Blocked: Vercel CLI not installed or signed in; project not linked to GitHub |

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

Not deployed. The Vercel project is not connected to the GitHub repository (no deployments,
statuses or webhooks), this checkout is not linked to a Vercel project, and the Vercel CLI is not
installed or signed in. A safe preview needs someone signed in to the team's Vercel account to
run `vercel login`, then `vercel link` (choosing the existing project, never a new one), then
`vercel deploy` (no `--prod`). Preview deployments do not touch the production domain.

## Verification (final run on this branch)

- Typecheck, lint, production build, lesson media check: all pass.
- Tests: 1,060 of 1,060 in 74 files, including every route, all 14 game engines, the saved-progress
  contract, 60 % unlock, the Lite-mode journey, the weekly report, Mini Makers and pin layout.
- Secret scan (API keys, tokens, private keys) of tracked files, the built bundle and this branch's
  history: no matches; no `.env` file is tracked.

## Continuing next session

1. `git fetch` and check out `feature/tech-summit-redesign` (or restore from the newest
   `E:\laarish-academics-backups\laarish-academics-all-refs-*.bundle`; copies on F:).
2. `npm ci`, then `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`.
3. `npm run dev` for development; `npm run build && npm run preview` (port 4173) for measurements.
   The measurement method is described above; add `?perf` to read scene stats.
4. Next tasks, in order: a "Need a hint?" button in Play; a real Android phone test;
   a preview deployment once someone signs in to Vercel; official videos when assets exist;
   the Mini Makers worked-solution reveal once lessons have solution steps.
