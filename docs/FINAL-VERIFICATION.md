# Final verification: major product upgrade (16 Nov 2026)

Branch `feature/tech-summit-redesign`. Nothing is merged into `main` and nothing is deployed to
Production. Production (`laarish-academics.vercel.app`) and its environment variables are
untouched.

**Preview to test:** https://laarish-academics-lfv1oqv2f-salik-alpha.vercel.app
(Vercel preview; open it while signed in to Vercel. It was built from 1ac94c3.)

## Automated checks (16 Nov, on 1ac94c3)

| Check | Result |
|---|---|
| `npm run typecheck` (app and server) | Pass |
| `npm run lint` | 0 errors, 1 warning that predates this work (`SourceNote.tsx`, fast refresh) |
| `npx vitest run` | **87 files, 1,374 tests, all passing** |
| `npm run build` | Pass. three.js stays in its own lazy chunk; the world page does not import it |
| `npm run media:check` | Pass: 2 official videos (Friction, Magnets), 239 topics on the labelled explainer |
| Secret scan (tracked files and `dist/`) | No real keys. The only `sk-ant-` string is a deliberately fake test value |

## Checked on the preview (browser, desktop width)

| What | Result |
|---|---|
| `GET /api/mentor?check=model` | `{"provider":"demo", "check":{"keyConfigured":false, "environment":"preview", "result":"missing_key"}}`, an honest answer because Preview has no key yet |
| Grown-ups → Rishi's AI status → Check the AI | "Demo mode: no AI key on this server … Environment: preview · Key set: no". No key input anywhere |
| Magnets → What do magnets attract? → Watch | The real clip loads: `/media/videos/magnets-attract.mp4`, 12 s, 1280×720, captions track, poster |
| Kannada world | 3D island with three discovery markers (ಅ, ಮಲ್ಲಿಗೆ, ಹರಿಗೋಲು) beside the chapter pins |
| New learner setup → Home | Works (nickname, class, mentor) |

## Checked on the dev server (browser)

- All six worlds at desktop width: the new objects are visible and the markers sit over them.
- Science at 375 × 812, with List view "Things to discover".
- Fact cards: the Kannada card on desktop; the Telescope card as a phone bottom sheet with Read
  aloud.
- Game How to play pictures (Magnets).
- Sentence builder at 375 × 812: one instruction line at a time, raised tiles.

## The four priorities

| Priority | State | Details |
|---|---|---|
| 1. Real lesson videos | **Pipeline done; 2 real videos; batch awaiting approval** | Moda cannot generate video. It animates AI-generated clay pictures and exports MP4. The Magnets pilot is in the app. The next 19 priority-1 clips are quoted at about 1,140 Moda credits and not started. See [VIDEO-CONTENT-STATUS.md](VIDEO-CONTENT-STATUS.md) |
| 2. 3D worlds | **Done** | 18 tap-to-discover objects with facts, a New! celebration when a chapter opens, and no extra draw calls. See [3D-WORLD-UPGRADE.md](3D-WORLD-UPGRADE.md) |
| 3. AI mentors | **Code done; keys are the owner's step** | The status check names the failure, fallbacks are honest, and there is no key input for children. Production fails at the model check (key or workspace). Preview has no key. See [AI-STATUS.md](AI-STATUS.md) |
| 4. 14 games | **Done (tests); partly checked visually** | Picture How to play, raised controls, a first-move cue and goals that match the rounds. See [GAME-UPGRADE.md](GAME-UPGRADE.md) |

## Not verified, or left to the owner

- **Live AI in Preview and Production.** Add a Preview key, then rotate the Production key. The
  steps are in AI-STATUS.md. Production needs a redeploy, which waits for your approval.
- **More videos.** Approve the next Moda batch. Before about 20 clips, create the Vercel Blob store
  and connect it to Preview and Development only.
- **Physical phone testing.** Nothing here was tested on a real Android phone. Frame rate was not
  measured with the browser pane visible.
- **Games, visually.** 12 of the 14 engines' pictures, the first-move pulses and dark mode have not
  been looked at on screen.
- **Hindi and Kannada read-aloud.** This depends on the device having those voices; without one,
  the button is hidden.

## Commits in this upgrade (all pushed)

| Commit | What |
|---|---|
| bdc9457 | AI: mentor diagnosis, safe status check, honest fallback |
| f129486 | Docs: AI status and root cause |
| d4480c2 | Videos: pipeline, prompt queue and coverage tracker |
| 01182ca | Worlds: tap-to-discover objects and New! chapter celebration |
| 2f6befa | Videos: first Moda lesson clip (Magnets) and local ingest |
| 283783c | Curriculum: Magnets topic 1 has its official video |
| f16039e | Videos: ingest labelling reminder and docs step |
| 1ac94c3 | Games: picture How to play, raised controls, first-move cue |
| (this file) | Docs: final verification |

`main` is still 446492c. Backup bundles of all refs are on E: and F: (`laarish-academics-backups`).
