# Lesson video production

How Laarish lesson videos are made, checked and connected to the app. The first
video, **Science → Friction → Topic 1 "What is friction?"**, was produced with
this workflow and is live in the app.

## What the tooling can and cannot do

Checked in this environment (October 2026):

| Capability | Available? | Notes |
|---|---|---|
| Vector motion graphics on a 1920×1080 canvas (shapes, text, brand logo, keyframes, eases) | Yes | Moda motion canvas (`category: 'animation'`), connected as an MCP tool |
| Render to MP4 (H.264, 30 fps), all scenes stitched into one file | Yes | `export(format: 'mp4', scope: 'sequence')`, free, up to 600 s |
| AI video generation (footage from a prompt) | No | Not offered by any connected tool |
| Audio, voice-over or music generation | No | Rendered files have **no audio track** |
| ffmpeg / ffprobe on this machine | No | Files are checked by `npm run media:check` (reads the MP4 header) and in a real browser |

So lesson videos are **animated explainers** built from vector scenes. They are
silent; narration is delivered by:

1. **Captions** generated from the script (WebVTT), shown in a bar under the
   picture so they never cover on-screen labels.
2. **Read-aloud narration**: the player reads each caption with the device
   voice (`speechSynthesis`). If a sentence is still being read when the next
   one starts, the video waits for it. Learners can switch it off.
3. A **transcript** under the player.

A recorded human voice-over can be added later without changing the app: record
one clip per caption cue at its timestamp and add it as the MP4's audio track.

## Pipeline

```
Spec (shared/media/videoSpecs.ts)
  → build scenes on a 1920×1080 Moda animation canvas (layout first, then motion)
  → check frames, fix, export all scenes as one MP4
  → save to public/media/videos/<topicId>.mp4 (+ poster JPG)
  → npm run media:check -- --write-captions   (captions generated from the spec)
  → register in public/media/manifest.json
  → curriculum: officialVideo(...) for the topic, spec production.status = 'checked'
  → npm run media:check, npm test, and watch it in the app (Watch step)
```

Every step is required. **A video is not marked available until the real file
has been rendered, checked and registered.** `npm run media:check` and the
test suite fail if a registered video, caption file or poster is missing, is
not a readable MP4, is outside the 45–120 s target, does not match its script
length, or if its captions drift from the spec.

## The production spec

Each video has a typed spec in `shared/media/videoSpecs.ts` (`VideoSpec`). It
is the single source for:

| Field | Purpose |
|---|---|
| `videoId`, `topicId` | Links the video to the curriculum (`video-<topicId>`) |
| `title`, `objective`, `grades`, `ageRange` | What the child should understand afterwards, and for whom |
| `targetDurationS` | 45–120 s, one topic per video |
| `files` | `videos/<topicId>.mp4`, `captions/<topicId>.en.vtt`, `posters/<topicId>.jpg` under `public/media` |
| `output` | 1920×1080, 30 fps, MP4/H.264, audio `none` until a voice-over exists |
| `style`, `soundGuidance`, `captionGuidance` | Brand, sound and caption rules |
| `accuracyChecks` | Facts checked against the topic's curriculum facts before production |
| `scenes[]` | Storyboard: `purpose`, `visuals`, `animation` (and camera) directions, `onScreenText`, timed `narration` cues |
| `production` | Status (`planned` → `rendered` → `checked`), tool, editable source link, render date, length |

Rules the spec tests enforce: scenes are back to back from 0 s, cues never
overlap and last at least 1.5 s, a cue is at most about 14 words, the length is
inside the target, and **the last scene ends with a question for the child**.

## Scene and style rules

- **Brand**: cream `#fff8e7` background, navy `#1a1433` text, yellow `#ffd200`
  accent, Nunito type, Laarish wordmark on the first and last scene.
- **One idea per scene**, 8–12 s each. Large shapes, generous space, no clutter.
- **Fixed colour meaning across all videos**: green `#1E9A5F` = motion,
  coral `#F06A4D` = friction or an opposing force, purple `#5847E0` = a push.
- **Text**: headings 72 px, labels ≥ 30 px at 1080p; keep 96 px margins.
- **Motion that teaches**: animate from an offset back to the final layout
  (the canvas rest state is the last frame). Motion must be physically honest
  (for example, a sliding box slows with an ease-out, and in a "same push"
  comparison the stopping time is proportional to the distance).
- Every label appears with a fade or pop; nothing appears before the narration
  mentions it. No flashing, no more than one thing moving at a time when the
  child must read.
- **Accuracy**: simplified models are allowed but must be named as such and
  never contradict the curriculum facts.

## Reusable prompt (for an AI agent with the Moda motion tools)

Copy, fill in the spec and give it to the agent:

```
Produce the Laarish lesson video for <Subject> → <Lesson> → Topic <n> "<title>".

Use the spec <videoId> in shared/media/videoSpecs.ts exactly: objective,
scenes (purpose, visuals, animation, on-screen text) and the narration timing.
Brand kit: Laarish (bk_10C9GY6JBC8JYT2PM544C40P2M). Canvas: 1920×1080,
category 'animation', one page per scene, each page as long as its scene.

For each scene:
1. Lay out the final frame with canvas_apply_markup (real text, Nunito,
   colours from docs/video-production.md), screenshot it and fix the layout.
2. Add motion with canvas_edit motion.page(...): animate from offsets toward
   the final layout (blend 'add' keyframes for moves, fades or pops for labels),
   timed so each element appears when its narration cue starts.
Then export all pages with export(format 'mp4', scope 'sequence', fps 30,
video_quality 'high'), download it to public/media/videos/<topicId>.mp4, export
page 1 as JPEG to public/media/posters/<topicId>.jpg, and check frames at the
start of every scene in a browser (draw the <video> to a canvas). Fix anything
that appears early, overlaps or is unreadable, and re-export.
Do not invent facts, URLs or files. Report the canvas link and the checks.
```

Then register it (manifest, `officialVideo(...)`, spec status `checked`) and
run `npm run media:check -- --write-captions`.

## Checklist before registering a video

- [ ] Length 45–120 s, matches the script length (±1.5 s)
- [ ] Each scene checked at its start, middle and end frame; nothing appears early
- [ ] Facts match the topic's curriculum facts and `accuracyChecks`
- [ ] Ends with a recap and a question for the child
- [ ] Laarish wordmark on the first and last scene
- [ ] Captions generated from the spec; transcript shows in the Watch step
- [ ] Plays in the app (desktop and 375 px phone width), poster shows before play
- [ ] `npm run media:check` passes

## Production log

| Video | Length | File | Source | Checks |
|---|---|---|---|---|
| `video-friction-what-is` (Science → Friction → Topic 1) | 62 s, 1920×1080, H.264, 2.8 MB, no audio | `public/media/videos/friction-what-is.mp4` | [Moda canvas](https://moda.app/canvas/8be8fe37-8945-49fe-af2a-d85b1379133c) | Frames checked for all six scenes in Chrome; first render showed the "stop!" label before the push, fixed and re-rendered; plays in the Watch step with captions, transcript and read-aloud |

Next videos (specs to write, in priority order): Friction topics 2–4,
Halves and quarters, Building sentences topics 1–2, Magnets topics 1–2.
