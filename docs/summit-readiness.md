# Tech Summit readiness: Class 6 → Science → Magnets

Branch `feature/tech-summit-redesign`. Production (`main`, the Vercel project and its domain) is untouched.

## The demo journey (verified end to end on a fresh learner, at 375 px)

Onboarding → Home (first-visit card) → set this week's chapter (Magnets) → "Start today's plan" →
3D chapter path → topic sheet (60 % meter) → Watch → Play (3D magnet bench, three rounds) →
Practice (6 questions incl. picture choice, sorting into trays, true/false with a reason) →
Complete (88 % mastery, 2 stars, rewards, recap) → back to the chapter path: Topic 1 done,
Topic 2 unlocked, chapter 50 %. Progress survives a full reload.

## Performance (production build, measured)

Method: `vite preview` of the production build, headless Chrome 154 driven over the DevTools
protocol, on this laptop's Intel UHD Graphics (hardware ANGLE/D3D11). "Phone" = 390×844 at
2.75× with Chrome's CPU slowdown (4× and 6×) to approximate a mid- and low-end phone CPU. The
GPU is **not** slowed down, so frame rates below are this laptop's GPU, not a Snapdragon 680's.
Times are medians of three runs, measured from navigation start to the scene's first frame
(`performance.mark('laarish:*-first-frame')`; add `?perf` to any URL to see the stats).

| Scene | Measured | Wireframe budget |
|---|---|---|
| Hub first frame, desktop, cold cache | 634 ms | ≤ 2 s |
| Hub first frame, phone 4×, cold cache | 1.13 s | ≤ 2 s |
| Hub first frame, phone 6×, warm cache | 1.31 s | ≤ 2 s |
| World first open, phone 4×, cold cache | 865 ms (one outlier run: 9.4 s) | ≤ 5 s |
| World, phone 4×, warm cache | 877 ms | ≤ 1.5 s cached |
| Hub tap → world first frame (includes the 1.2 s fly-in), phone 4× | 1.47 s | 1.2 s flight + ready |
| Chapter path, phone 4×, warm | 793 ms | (same world, ≤ 1.5 s) |
| Magnet bench, Watch → Play tab, phone 4× / 6× | 208 ms / 392 ms | ≤ 3 s |
| Magnet bench, direct page load, phone 4× | 1.02 s | ≤ 3 s |
| Draw calls: hub / world / chapter / bench | 9 / 2 / 3 / 17 | ≤ 60 / ≤ 80 / ≤ 80 / ≤ 40 |
| Triangles: hub / world / chapter / bench | 22,160 / 5,980 / 6,900 / 1,516 | set after the engine test |
| Textures | 0 (vertex colours only) | set after the engine test |
| JS heap after the scene loads | 12–25 MB | — |
| three.js chunk (loaded only when 3D is shown) | 556 KB (138 KB gzip) | — |
| Island engine / magnet bench code | 26 KB / 10 KB (9 / 4 KB gzip) | hub ≤ 8 MB, play scene ≤ 4 MB |
| World pack download | none: islands are built in code | ≤ 15 MB |
| Whole production build (`dist`) | 8.0 MB (3.7 MB code, styles, fonts) | base app ≤ 60 MB |
| Frame rate | 139–144 fps (display-capped, laptop GPU) | 30 fps on Snapdragon 680: **not measured** |

Not measured: a real Android phone (none available), GPU-limited frame rate on a budget phone,
battery and thermal behaviour.

## Lite mode

- No WebGL (`?nowebgl`, real Chrome): Home shows the 2D map, the world shows the chapter list,
  no canvas is created and three.js is never downloaded.
- Reduced motion (the saved setting or the OS): Lite mode, verified in real Chrome.
- Grown-up setting (Auto / Always on / Off) behind the parental gate.
- The automated tests run the whole journey in Lite mode (jsdom has no WebGL).

## Preview deployment

Not deployed. The Vercel project is not connected to the GitHub repository (no deployments,
statuses or webhooks), this checkout is not linked to a Vercel project, and the Vercel CLI is not
installed or signed in. A preview needs someone signed in to the team's Vercel account to run
`vercel login`, then `vercel link` (choosing the existing project, never a new one), then
`vercel deploy` (no `--prod`). Preview deployments do not touch the production domain.

## Verification (final run on this branch)

- Typecheck, lint, production build, lesson media check: all pass.
- Tests: 1,042 of 1,042 in 71 files, including:
  - every route (old `/subjects/…` and new `/world/…`) opening without an error screen;
  - all 14 game engines registered, loadable and used by real topics;
  - saved-progress (schema v2) contract, 60 % unlock, the Lite-mode journey;
  - mentor offline/demo fallback (existing mentor tests).
- Secret scan (API keys, tokens, private keys) of tracked files, the built bundle and this
  branch's history: no matches; no `.env` file is tracked.
