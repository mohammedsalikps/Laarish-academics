/**
 * Video production specs: one per topic video.
 *
 * A spec is the single source for a lesson video's objective, script,
 * storyboard, animation directions, on-screen text and timed narration. The
 * same narration cues generate the WebVTT captions (npm run media:check --
 * --write-captions), the transcript under the player and the optional
 * read-aloud narration, so they never drift apart.
 *
 * Workflow (docs/video-production.md):
 *   1. Write or update the spec here (status 'planned').
 *   2. Build each scene on a 1920x1080 animation canvas with the Moda motion
 *      tools, following the storyboard; export the scenes as one MP4.
 *   3. Save the MP4, poster and generated captions under public/media.
 *   4. Register the files in public/media/manifest.json and run
 *      npm run media:check. Only then set status to 'checked'.
 */

export interface NarrationCue {
  startS: number;
  endS: number;
  text: string;
}

export interface VideoScene {
  id: string;
  startS: number;
  endS: number;
  /** Storyboard beat: what this scene teaches. */
  purpose: string;
  /** What is on screen. */
  visuals: string;
  /** Animation and camera directions. */
  animation: string;
  onScreenText: string[];
  narration: NarrationCue[];
}

export type VideoProductionStatus = 'planned' | 'rendered' | 'checked';

export interface VideoSpec {
  videoId: string;
  topicId: string;
  title: string;
  objective: string;
  grades: [number, number];
  ageRange: string;
  /** Allowed length in seconds. */
  targetDurationS: [number, number];
  /** Files under public/media. */
  files: { video: string; captions: string; poster: string };
  output: { width: number; height: number; fps: number; container: 'mp4'; codec: 'h264'; audio: 'none' | 'narration' };
  style: string;
  soundGuidance: string;
  captionGuidance: string;
  /** Facts checked against the topic's curriculum facts before production. */
  accuracyChecks: string[];
  scenes: VideoScene[];
  production: { status: VideoProductionStatus; tool: string; source?: string; renderedOn?: string; durationS?: number };
}

const BRAND_STYLE =
  'Laarish brand: cream background #fff8e7, navy #1a1433 text, yellow #ffd200 accent, Nunito type, Laarish wordmark on the first and last scene. One idea per scene, large shapes, no clutter. Colour meaning is fixed across videos: green #1E9A5F = motion, coral #F06A4D = friction, purple #5847E0 = a push.';
const SILENT_SOUND =
  'The rendered file has no audio track (the motion tool does not generate sound). The app offers read-aloud narration of the caption cues using the device voice. A recorded voice-over can replace it later: record each cue at its time and add an AAC track.';
const CAPTIONS =
  'One short sentence per cue, at most about 12 words and 2 lines; cues never overlap; each cue stays on screen at least 1.5 s. Captions are generated from these narration cues.';

export const VIDEO_SPECS: VideoSpec[] = [
  {
    videoId: 'video-friction-what-is',
    topicId: 'friction-what-is',
    title: 'What is friction?',
    objective: 'Children can say that friction is a force between surfaces that touch, that it pushes against motion and slows things down, and that rough surfaces make more friction than smooth ones.',
    grades: [3, 5],
    ageRange: '8 to 10 years',
    targetDurationS: [45, 120],
    files: { video: 'videos/friction-what-is.mp4', captions: 'captions/friction-what-is.en.vtt', poster: 'posters/friction-what-is.jpg' },
    output: { width: 1920, height: 1080, fps: 30, container: 'mp4', codec: 'h264', audio: 'none' },
    style: BRAND_STYLE,
    soundGuidance: SILENT_SOUND,
    captionGuidance: CAPTIONS,
    accuracyChecks: [
      'Friction is a force between two surfaces that touch.',
      'Friction acts against the direction of motion and slows moving things down.',
      'Rougher surfaces usually make more friction, so the same push sends a box farther on ice than on wood, and farther on wood than on carpet.',
      'The "tiny bumps" picture is a simplified model suitable for this age; it does not claim bumps are the only cause of friction.',
    ],
    scenes: [
      {
        id: 'title',
        startS: 0,
        endS: 8,
        purpose: 'Hook: a question from everyday life.',
        visuals: 'Laarish wordmark, "Science · Friction · Topic 1" pill, title, subtitle, a crate on a floor in front of a soft yellow sun.',
        animation: 'Sun scales in, title rises, subtitle fades in, crate slides in from the left and settles. Static camera.',
        onScreenText: ['What is friction?', 'Why do moving things slow down and stop?'],
        narration: [
          { startS: 0.3, endS: 4.2, text: 'Have you ever pushed a box and watched it stop all by itself?' },
          { startS: 4.4, endS: 7.8, text: "Let's find out why!" },
        ],
      },
      {
        id: 'push-and-stop',
        startS: 8,
        endS: 19,
        purpose: 'Observe: after one push, a sliding box slows down and stops.',
        visuals: 'Wooden floor, crate, purple push arrow and "Push!" label, then "fast", "slower…", "stop!" labels along the path.',
        animation: 'Push arrow appears, crate slides about two thirds of the screen with a smooth ease-out (constant slowing), labels appear as it passes. Static camera.',
        onScreenText: ['Push it… then let go!', 'fast', 'slower…', 'stop!', 'Nobody touched it after the push… so what slowed it down?'],
        narration: [
          { startS: 8.3, endS: 10.2, text: 'Give a box a push, then let go.' },
          { startS: 10.3, endS: 15.2, text: 'It slides… slows down… and stops.' },
          { startS: 15.4, endS: 18.8, text: 'Nobody touched it after the push. Something is pushing back!' },
        ],
      },
      {
        id: 'tiny-bumps',
        startS: 19,
        endS: 30,
        purpose: 'Explain with a simple model: surfaces have tiny bumps that catch.',
        visuals: 'Magnifying glass over the crate edge, zoom panel showing the zig-zag bottom of the box above the zig-zag floor, labels and coral "catch!" markers.',
        animation: 'Lens scales in, zoom panel opens, then the box surface jerks forward in small steps while catch markers pop in. Static camera; the zoom panel acts as the close-up.',
        onScreenText: ['Look closely… really closely!', "the box's bumps", "the floor's bumps", 'catch!'],
        narration: [
          { startS: 19.2, endS: 21.8, text: 'Look closely. Really closely!' },
          { startS: 22.0, endS: 24.6, text: 'Even smooth floors have tiny bumps.' },
          { startS: 24.8, endS: 29.8, text: "When the box slides, its bumps catch on the floor's bumps." },
        ],
      },
      {
        id: 'force-direction',
        startS: 30,
        endS: 40,
        purpose: 'Name the force and its direction.',
        visuals: 'Crate sliding right with a green "moving →" arrow and a coral "← friction" arrow at the floor, then a navy rule card.',
        animation: 'Crate and arrows drift right while slowing; the friction arrow appears after the motion arrow; the rule card scales in.',
        onScreenText: ['That push-back is called friction', 'moving →', '← friction', 'Friction always pushes against the way things move.'],
        narration: [
          { startS: 30.2, endS: 32.9, text: 'All that catching makes a force called friction.' },
          { startS: 33.0, endS: 35.4, text: 'Friction pushes back on the moving box.' },
          { startS: 35.6, endS: 39.8, text: 'Friction always pushes against the way things move.' },
        ],
      },
      {
        id: 'compare-surfaces',
        startS: 40,
        endS: 52,
        purpose: 'Compare: same push on ice, wood and carpet.',
        visuals: 'Three lanes (ice, wood, carpet) with identical crates and a "Same push for every box" chip; result tags and a rule card.',
        animation: 'All crates start together with the same speed and slow at a constant rate: carpet stops first, then wood, then ice (stopping time proportional to distance). Tags appear as each crate stops.',
        onScreenText: ['Same push, different floors', 'lots of friction', 'some friction', 'very little friction', 'Less friction, so the box slides farther on ice!'],
        narration: [
          { startS: 40.2, endS: 42.0, text: 'Same push, different floors.' },
          { startS: 42.1, endS: 44.4, text: 'Rough carpet makes lots of friction. The box stops quickly.' },
          { startS: 44.5, endS: 46.2, text: 'Wood makes some friction.' },
          { startS: 46.3, endS: 48.1, text: 'Smooth ice makes very little friction.' },
          { startS: 48.2, endS: 51.8, text: 'Less friction, so the box slides farthest on ice!' },
        ],
      },
      {
        id: 'recap-question',
        startS: 52,
        endS: 62,
        purpose: 'Recap the three ideas and end with a question for the child.',
        visuals: 'Three numbered recap cards, a navy "Your turn!" question card, Laarish wordmark.',
        animation: 'Recap cards rise in one by one, then the question card scales in. Holds on the final frame.',
        onScreenText: [
          'What did we learn?',
          'Friction is a force between surfaces that touch.',
          'It pushes against motion and slows things down.',
          'Rough surfaces: more friction. Smooth: less.',
          'Your turn! Where would a box slide farther: on ice or on carpet?',
        ],
        narration: [
          { startS: 52.2, endS: 54.2, text: "Let's recap. Friction is a force between surfaces that touch." },
          { startS: 54.3, endS: 55.8, text: 'It pushes against motion and slows things down.' },
          { startS: 55.9, endS: 57.4, text: 'Rough surfaces make more friction. Smooth surfaces make less.' },
          { startS: 57.5, endS: 60.0, text: 'Your turn! Where would a box slide farther: on ice or on carpet?' },
          { startS: 60.1, endS: 62.0, text: 'Pause and think, then try the quiz!' },
        ],
      },
    ],
    production: {
      status: 'checked',
      tool: 'Moda motion canvas (vector animation, MP4 export, no audio)',
      source: 'https://moda.app/canvas/8be8fe37-8945-49fe-af2a-d85b1379133c',
      renderedOn: '2026-10-21',
      durationS: 62,
    },
  },
];

export function getVideoSpec(videoId: string | undefined): VideoSpec | undefined {
  return videoId ? VIDEO_SPECS.find((s) => s.videoId === videoId) : undefined;
}

export function narrationCues(spec: VideoSpec): NarrationCue[] {
  return spec.scenes.flatMap((s) => s.narration);
}

function vttTime(s: number): string {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(rest).padStart(3, '0')}`;
}

/** WebVTT captions generated from the spec's narration cues. */
export function toWebVtt(spec: VideoSpec): string {
  const cues = narrationCues(spec).map((c, i) => `${i + 1}\n${vttTime(c.startS)} --> ${vttTime(c.endS)}\n${c.text}`);
  return `WEBVTT\n\nNOTE ${spec.title} (${spec.videoId}). Generated from shared/media/videoSpecs.ts; do not edit by hand.\n\n${cues.join('\n\n')}\n`;
}

/** Short summary of what the video shows, used to ground the mentor during the Watch step. */
export function videoSummary(spec: VideoSpec): string[] {
  return spec.scenes.map((s) => `${s.purpose} ${s.narration.map((n) => n.text).join(' ')}`);
}

/** Structural problems in a spec (timing, length, caption rules). Empty when valid. */
export function specProblems(spec: VideoSpec): string[] {
  const problems: string[] = [];
  const end = spec.scenes[spec.scenes.length - 1]?.endS ?? 0;
  if (end < spec.targetDurationS[0] || end > spec.targetDurationS[1]) problems.push(`${spec.videoId}: length ${end}s is outside ${spec.targetDurationS.join('-')}s`);
  let prevEnd = 0;
  for (const scene of spec.scenes) {
    if (scene.startS !== prevEnd) problems.push(`${spec.videoId}/${scene.id}: starts at ${scene.startS}s, previous scene ended at ${prevEnd}s`);
    prevEnd = scene.endS;
  }
  let prevCue = -1;
  for (const cue of narrationCues(spec)) {
    if (cue.startS < prevCue) problems.push(`${spec.videoId}: cue "${cue.text}" overlaps the previous cue`);
    if (cue.endS - cue.startS < 1.5) problems.push(`${spec.videoId}: cue "${cue.text}" is shorter than 1.5s`);
    if (cue.text.split(/\s+/).length > 14) problems.push(`${spec.videoId}: cue "${cue.text}" is too long for one caption`);
    prevCue = cue.endS;
  }
  const lastScene = spec.scenes[spec.scenes.length - 1];
  if (!lastScene?.narration.some((n) => n.text.includes('?'))) problems.push(`${spec.videoId}: the last scene must end with a question`);
  return problems;
}
