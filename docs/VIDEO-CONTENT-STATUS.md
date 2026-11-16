# Lesson videos: status, pipeline and blockers

Last updated 16 Nov 2026 (evening). The per-lesson table is generated: see
[VIDEO-CONTENT-STATUS.coverage.md](VIDEO-CONTENT-STATUS.coverage.md) (`npm run videos:queue`).

## Where things stand

| | Count |
|---|---|
| Topics (one Watch video each) | 241, in 99 lessons |
| Real videos in the app | **2**: Friction "What is friction?" (initial import) and Magnets "What do magnets attract?" (Moda pilot, 16 Nov), both checked by `npm run media:check` |
| Pending | 239: 19 priority 1 (Class 6 Science and Mathematics), 11 priority 2 (demonstration lessons), 209 priority 3 |
| Failed | 0 |
| Planned lessons without content | 75 of the 174 lessons; they get videos once their topics are written |

Until a topic has a real video, its Watch step shows the clearly labelled animated explainer
("Temporary animated explainer. The official video for this topic has not been added yet."). If
a real video fails to load, the explainer takes over with an honest note. No placeholder is ever
counted or shown as a real video.

## Generators checked (16 Nov 2026)

| Service | What was found | Usable now? |
|---|---|---|
| **Moda** (connected 16 Nov, paid plan, Laarish team) | **Cannot generate video or audio** (its connector says so). It can generate pictures inside a design (25 image models, metered), cut them out, animate them with keyframes, and export a page as MP4 (free) | **Yes, as animated clips built from AI-generated clay pictures**, not AI-generated video. Pilot made and in the app (below) |
| **Higgsfield** | Connected. Workspace credits 124.89 (plan "max"). Catalogue includes Seedance 2.0 / 2.0 Mini / 2.5, Cinema Studio, MiniMax H3, Wan 2.6, FLUX 3 Video, Grok Video. The connector can **read** the catalogue, credits and finished generations, but has **no tool to start a generation** | Not from this session. Fallback: the owner generates in Higgsfield with the prompts in `content/video-queue.json`, and the finished clips are imported from the Higgsfield history |
| **Figma Weave** | Can run video models with a cost quote and approval per run, but reports that the Figma account is not linked to Weave | No (needs the Figma–Weave link) |

Per-video prices could not be read: the Higgsfield connector does not expose them and the public
pricing page did not render. Prices will be quoted per batch before anything is generated.

## The Moda pilot (16 Nov)

**Magnets → "What do magnets attract?"**, 12 s, silent, captions from the topic's key ideas.
Canvas (private, Laarish team, kit "Laarish Brand System 2026"):
https://moda.app/canvas/a5338801-2b3b-441d-a013-ff7a072dc403

| Time | What moves |
|---|---|
| 0–4.3 s | A red clay horseshoe magnet slides onto a classroom table; a yellow arrow shows the pull; paper clips and nails jump onto its tips; a green tick |
| 4.3–8.3 s | The magnet beside a wooden pencil, plastic block, rubber eraser, glass marble and paper; nothing moves; a red cross |
| 8.3–12 s | An aluminium can and copper coins stay put while a curious girl watches; a red cross |

The title "What do magnets attract?" is typeset on screen for the first 2.5 s. Moda only generates
pictures inside a real design, and typeset text is crisp, unlike lettering drawn by an image model;
every other word is in the captions. Pictures: `nano-banana` (NanoBanana 2.1), 1K; two cut-outs with
background removal. The ingest step re-encoded it to 720p H.264 (503 KB) with a poster and captions,
and it plays in the Watch step.

**Cost:** 60 Moda credits for the pilot (5 pictures + 2 cut-outs; balance 30,500 → 30,440).
At that rate: the other 19 priority-1 clips ≈ 1,140 credits; all 239 pending ≈ 14,300 credits.
Each clip is designed per topic (its own scenes and motion), so it also takes real authoring
time; nothing is batch-stamped from a template.

**Not done without approval:** the next batch (19 priority-1 clips). Each batch's credits are
approved first.

## The pipeline

1. **Queue** (`npm run videos:queue`): `content/video-queue.json` lists every topic's job in
   production order: priority, a prompt built only from that topic's own explainer scenes (so it
   matches what the lesson teaches), 12 s, 16:9, and three caption lines from the topic's key
   ideas. One shared style for all six subjects (soft clay-like 3D, warm daylight, Indian settings);
   every prompt forbids on-screen text, logos and unsafe actions. Language topics show objects and
   actions only; the words come from the captions.
2. **Generate** with the chosen service, priority 1 first, in batches whose cost is approved first.
3. **Ingest** (`npm run videos:ingest -- results.json`, where results.json lists the clips the
   generator actually produced): download (https only) → ffprobe check (a real video, 5–25 s) →
   re-encode for phones (720p H.264, fast start, silent) → thumbnail at 1 s → WebVTT captions →
   upload to **Vercel Blob** → `public/media/manifest.json` points at the Blob URLs → result
   recorded in `content/video-log.json` (completed or failed with the reason).
   `--local` stores the files in `public/media` instead (served with the app, as the first two
   videos are); use it for a handful of clips before Blob exists.
   Without `BLOB_READ_WRITE_TOKEN` or `--local` it is a dry run that publishes nothing.
4. **Label** the topic's video `officialVideo(...)` in `shared/curriculum/topics` and run
   `npm run curriculum:index`. The ingest step prints this reminder, and tests fail until the
   curriculum and the manifest agree.
5. **Check** (`npm run media:check`, `npm run videos:queue`, `npm test`): the coverage report updates.

The app reads the video files' addresses from the manifest at run time. The one code change per
video is the label in step 4, which the topic sheet and readiness reports use.

## Storage: Vercel Blob (chosen 16 Nov)

Not created yet. It needs a Blob store on the existing `laarish-academics` project (Vercel →
Storage → Create → Blob), which adds `BLOB_READ_WRITE_TOKEN` to the project. That token is used
only by the ingest script on a trusted machine (`BLOB_READ_WRITE_TOKEN=… npm run videos:ingest -- …`);
it is never sent to the browser. Videos are public files on Vercel's CDN, cached for a year.
The store will be created with the owner's confirmation before the first large batch. When it is
connected to the project, choose **Preview and Development only**: the token is used by the ingest
script, never by the running app, so Production's environment variables stay unchanged.
