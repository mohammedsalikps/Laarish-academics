# Lesson videos: status, pipeline and blockers

Last updated 16 Nov 2026. The per-lesson table is generated: see
[VIDEO-CONTENT-STATUS.coverage.md](VIDEO-CONTENT-STATUS.coverage.md) (`npm run videos:queue`).

## Where things stand

| | Count |
|---|---|
| Topics (one Watch video each) | 241, in 99 lessons |
| Real videos in the app | **1** (Friction: "What is friction?", from the initial import, checked by `npm run media:check`) |
| Pending | 240: 20 priority 1 (Class 6 Science and Mathematics), 12 priority 2 (demonstration lessons), 208 priority 3 |
| Failed | 0 |
| Planned lessons without content | 75 of the 174 lessons; they get videos once their topics are written |

Until a topic has a real video, its Watch step shows the clearly labelled animated explainer
("Temporary animated explainer. The official video for this topic has not been added yet."). If
a real video fails to load, the explainer takes over with an honest note. No placeholder is ever
counted or shown as a real video.

## Generators checked (16 Nov 2026)

| Service | What was found | Usable now? |
|---|---|---|
| **Moda** ("Moda - Slides and Designs") | In the connector directory: slides, designs and **motion graphics**. Not yet connected to this session; the owner has a Pro plan and chose it as the first option | **Waiting for the connection.** Once connected, its tools decide whether it can produce short MP4 clips |
| **Higgsfield** | Connected. Workspace credits 124.89 (plan "max"). Catalogue includes Seedance 2.0 / 2.0 Mini / 2.5, Cinema Studio, MiniMax H3, Wan 2.6, FLUX 3 Video, Grok Video. The connector can **read** the catalogue, credits and finished generations, but has **no tool to start a generation** | Not from this session. Fallback: the owner generates in Higgsfield with the prompts in `content/video-queue.json`, and the finished clips are imported from the Higgsfield history |
| **Figma Weave** | Can run video models with a cost quote and approval per run, but reports that the Figma account is not linked to Weave | No (needs the Figma–Weave link) |

Per-video prices could not be read: the Higgsfield connector does not expose them and the public
pricing page did not render. Prices will be quoted per batch before anything is generated.

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
   Without `BLOB_READ_WRITE_TOKEN` it is a dry run that publishes nothing.
4. **Check** (`npm run media:check`, `npm run videos:queue`): the coverage report updates.

The app reads the manifest at run time, so new videos need no code change or rebuild.

## Storage: Vercel Blob (chosen 16 Nov)

Not created yet. It needs a Blob store on the existing `laarish-academics` project (Vercel →
Storage → Create → Blob), which adds `BLOB_READ_WRITE_TOKEN` to the project. That token is used
only by the ingest script on a trusted machine (`BLOB_READ_WRITE_TOKEN=… npm run videos:ingest -- …`);
it is never sent to the browser. Videos are public files on Vercel's CDN, cached for a year.
The store will be created with the owner's confirmation when the first real clips exist.
