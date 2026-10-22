/**
 * Curriculum model for Laarish Academics.
 *
 *   Subject -> Class (level) -> Branch -> Lesson -> Topic -> (Watch -> Play -> Practice -> Complete)
 *
 * All curriculum content is plain, serialisable data shared by the browser app
 * and the mentor server (which uses it to ground AI answers). Learner progress
 * types live in src/state/progressTypes.ts.
 *
 * Shared modules use explicit .js import specifiers so they also run unbundled
 * on Node / serverless runtimes.
 */

export type SubjectId = 'science' | 'mathematics' | 'english' | 'hindi' | 'kannada' | 'social-science';

/** School classes (grades) supported by the curriculum: Classes 1-8, roughly ages 6-14. */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Language a topic is taught in or teaches. */
export type ContentLanguage = 'en' | 'hi' | 'kn';

export type ContentStatus = 'ready' | 'in-development';

/** Keys into the icon registry (src/components/ui/Icon.tsx). Keeps content free of UI imports. */
export type IconKey =
  | 'flask'
  | 'atom'
  | 'calculator'
  | 'book'
  | 'languages'
  | 'globe'
  | 'car'
  | 'magnet'
  | 'sun'
  | 'sprout'
  | 'droplets'
  | 'cog'
  | 'shapes'
  | 'pie'
  | 'ruler'
  | 'clock'
  | 'pen'
  | 'quote'
  | 'palette'
  | 'map'
  | 'compass'
  | 'landmark'
  | 'users'
  | 'footprints'
  | 'bike'
  | 'hand'
  | 'flame'
  | 'snowflake'
  | 'paperclip'
  | 'pencil'
  | 'eraser'
  | 'nail'
  | 'apple'
  | 'mountain'
  | 'star'
  | 'sparkles'
  | 'cloud'
  | 'box'
  | 'scale'
  | 'plus'
  | 'variable'
  | 'chart'
  | 'hash'
  | 'repeat'
  | 'percent'
  | 'lightbulb'
  | 'heart'
  | 'leaf'
  | 'fish'
  | 'bird'
  | 'home'
  | 'coins'
  | 'triangle'
  | 'thermometer'
  | 'wind'
  | 'moon'
  | 'music'
  | 'utensils'
  | 'tree'
  | 'flag'
  | 'scroll'
  | 'zap'
  | 'eye'
  | 'calendar';

export interface Subject {
  id: SubjectId;
  name: string;
  /** Name of the subject's learning world on the roadmap. */
  worldName: string;
  tagline: string;
  description: string;
  /** Accent colour (hex) and a soft background tint. */
  color: string;
  softColor: string;
  icon: IconKey;
  /** Lessons in curriculum order. */
  lessonIds: string[];
  /**
   * Optional deeper structure (used by Mathematics): Subject → Level → Branch →
   * Lessons. Subjects without levels show one ordered lesson roadmap.
   */
  levels?: SubjectLevel[];
  branches?: SubjectBranch[];
}

/** A class (grade) within a subject, e.g. "Class 4: Number Explorers" with grades [4, 4]. */
export interface SubjectLevel {
  id: string;
  /** 1-based position. */
  order: number;
  title: string;
  grades: readonly [Grade, Grade];
  description: string;
}

/** A strand of a subject, e.g. "Fractions and Decimals". Branches can appear in several levels. */
export interface SubjectBranch {
  id: string;
  title: string;
  description: string;
  icon: IconKey;
}

/**
 * How a lesson relates to an official curriculum:
 * - aligned: mapped to a named chapter or unit of an official document whose title, class and year were
 *   verified (docs/curriculum-sources.md). The lesson was written from that chapter's title and theme; a
 *   teacher still has to check it against the chapter's content.
 * - curriculum-inspired: follows the official stage and themes, but no single matching unit was verified
 * - proposed: Laarish's own planned lesson, not yet checked against an official source
 */
export type AlignmentStatus = 'aligned' | 'curriculum-inspired' | 'proposed';

export interface CurriculumSource {
  /** Body that publishes the curriculum, e.g. "NCERT" or "Karnataka DSERT". */
  framework: string;
  /** Textbook or syllabus document, e.g. "Maths Mela, Class 4". */
  document: string;
  grade: Grade;
  /** Academic year the document applies to, e.g. "2025-26". */
  academicYear: string;
  /** Chapter or unit the lesson's objectives map to (title only). */
  unit?: string;
  status: AlignmentStatus;
  /** How and when the mapping was checked. */
  verification: string;
}

/** Human review still required before content is described as verified. */
export interface ContentReview {
  teacher: 'pending' | 'done';
  /** For Hindi and Kannada: review by a native-speaker educator. */
  nativeSpeaker?: 'pending' | 'done';
}

export interface Lesson {
  id: string;
  subjectId: SubjectId;
  /** 1-based position in the subject roadmap. */
  order: number;
  title: string;
  summary: string;
  /** Short introduction shown at the top of the lesson roadmap. */
  intro: string;
  /** What the learner should be able to do after the lesson. */
  objectives?: string[];
  icon: IconKey;
  /** Inclusive grade range the lesson is recommended for. */
  grades: readonly [Grade, Grade];
  status: ContentStatus;
  /** Topics in curriculum order (empty while the lesson is in development). */
  topicIds: string[];
  /** Lesson ids that must be completed first. Defaults to the previous lesson in the same roadmap (branch, or subject). */
  prerequisites?: string[];
  /** For subjects with levels and branches: where this lesson sits. `order` is then its position in the branch. */
  levelId?: string;
  branchId?: string;
  /**
   * Added in the proposed curriculum expansion and not yet reviewed against an
   * official syllabus. Shown with a "Proposed" label until reviewed.
   */
  proposed?: boolean;
  /** Where the lesson's objectives come from and how well that mapping is verified. */
  source?: CurriculumSource;
  review?: ContentReview;
}

/* ------------------------------------------------------------------ Quiz */

export interface ChoiceOption {
  id: string;
  text: string;
}

interface QuestionBase {
  id: string;
  prompt: string;
  /** Hint that supports reasoning without giving the answer away. */
  hint: string;
  /** Shown after the question is resolved. */
  explanation: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'single-choice';
  options: ChoiceOption[];
  correctOptionId: string;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true-false';
  correct: boolean;
}

export interface MatchPairsQuestion extends QuestionBase {
  type: 'match-pairs';
  pairs: { id: string; left: string; right: string }[];
}

export type QuizQuestion = SingleChoiceQuestion | TrueFalseQuestion | MatchPairsQuestion;

/** Learner answer shapes, one per question type. */
export type QuizAnswer =
  | { type: 'single-choice'; optionId: string }
  | { type: 'true-false'; value: boolean }
  | { type: 'match-pairs'; mapping: Record<string, string> };

/* ------------------------------------------------------------- Illustrations */

export type IllustrationSpec =
  | { kind: 'friction-forces' }
  | { kind: 'surface-bumps' }
  | { kind: 'rough-vs-smooth' }
  | { kind: 'grip-and-brakes' }
  | { kind: 'reduce-friction' }
  | { kind: 'car-on-surfaces' }
  | { kind: 'magnet-poles'; mode: 'attract' | 'repel' }
  | { kind: 'fraction'; parts: number; filled: number }
  | { kind: 'compass-rose' }
  | { kind: 'icon'; icon: IconKey; tone?: 'primary' | 'success' | 'reward' | 'coral' | 'sky' }
  | { kind: 'word-chips'; words: string[] }
  | { kind: 'colour-swatches'; items: { word: string; color: string }[] }
  /** A balance scale with an expression on each pan. tilt: -1 left side lower, 0 level, 1 right side lower. */
  | { kind: 'balance'; left: string; right: string; tilt: -1 | 0 | 1 }
  /** A number line from `from` to `to` with `jumps` hops of 1 starting at `start`. */
  | { kind: 'number-line'; from: number; to: number; start: number; jumps: number }
  /** An analogue clock showing a time. */
  | { kind: 'clock'; hour: number; minute: number }
  /** A small bar chart. */
  | { kind: 'bar-chart'; bars: { label: string; value: number }[] }
  /** A regular shape with this many sides (0 = circle), with an optional caption. */
  | { kind: 'shape'; sides: number; label?: string }
  /** A width × height rectangle drawn on a cols × rows square grid, for area and perimeter. */
  | { kind: 'area-grid'; cols: number; rows: number; width: number; height: number }
  /** A cell, a bulb and wires: the bulb glows only when the circuit is closed. */
  | { kind: 'circuit'; closed: boolean };

/** One scene of the temporary animated explainer shown while an official video is missing. */
export interface ExplainerScene {
  id: string;
  caption: string;
  illustration: IllustrationSpec;
  durationMs: number;
}

/* ------------------------------------------------------------------ Games */

export type DistanceBand = 'short' | 'medium' | 'far';
export type SurfaceTexture = 'wood' | 'grass' | 'gravel' | 'carpet' | 'ice';

export interface SurfaceDefinition {
  id: string;
  name: string;
  /** Effective friction coefficient used by the educational model (rolling + surface resistance). */
  frictionCoefficient: number;
  texture: SurfaceTexture;
  description: string;
  /** Explanation shown after a run on this surface. */
  explanation: string;
}

/** Where the car starts on the ramp: a higher start is a stronger push. */
export type RampHeight = 'low' | 'middle' | 'top';

/** A goal for the Friction Lab after free exploration, e.g. "make the car roll Far". */
export interface FrictionChallenge {
  id: string;
  prompt: string;
  target: DistanceBand;
  /** Surface fixed by the challenge (the learner changes only the ramp height). */
  surfaceId?: string;
  /** Ramp height fixed by the challenge (the learner changes only the surface). */
  height?: RampHeight;
  hint: string;
  /** Shown when the challenge is solved. */
  explanation: string;
}

export interface FrictionExperimentConfig {
  type: 'friction-experiment';
  /** Speed of the car (m/s) when it leaves the top of the ramp. Same for every surface. */
  launchSpeed: number;
  /** Visible track length in metres. */
  trackLength: number;
  surfaces: SurfaceDefinition[];
  /** Distance thresholds (metres) separating short/medium/far predictions. */
  bands: { mediumFrom: number; farFrom: number };
  /** Different surfaces that must be tested before the challenges (or, without challenges, completion). */
  minSurfacesToComplete: number;
  /** Goals that follow exploration, from easiest to hardest. Each must be reachable with the surfaces and ramp heights. */
  challenges?: FrictionChallenge[];
  /** One short question at the end that checks the child understood the idea, not just the clicks. */
  check?: ConceptCheck;
}

export interface ConceptCheck {
  prompt: string;
  options: ChoiceOption[];
  correctOptionId: string;
  hint: string;
  explanation: string;
}

export interface PushBoxConfig {
  type: 'push-box';
  /** Floors to push the box on. `grip` is how hard friction can push back (in push levels). */
  floors: { id: string; name: string; texture: SurfaceTexture; grip: number; description: string; explanation: string }[];
  /** Names for push strengths 1..n. */
  pushLabels: string[];
}

export interface ConceptMatchConfig {
  type: 'concept-match';
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  pairs: { id: string; left: string; leftIcon?: IconKey; right: string; hint: string }[];
}

export interface SortGameConfig {
  type: 'sort';
  prompt: string;
  bins: { id: string; label: string; description: string; icon: IconKey }[];
  /** `art` (an object picture, only when it matches the item) is shown instead of `icon`. */
  items: { id: string; label: string; icon?: IconKey; art?: ObjectArt; binId: string; explanation: string }[];
}

export interface FractionBuilderConfig {
  type: 'fraction-builder';
  rounds: { id: string; shape: 'circle' | 'bar'; parts: number; numerator: number; prompt: string; hint: string; explanation: string }[];
}

export interface GridExplorerConfig {
  type: 'grid-explorer';
  /** Grid is size x size; row 0 is the North edge. */
  size: number;
  start: [col: number, row: number];
  landmarks: { id: string; label: string; icon: IconKey; at: [col: number, row: number] }[];
  /** Tasks continue from wherever the explorer is standing. */
  tasks: { id: string; prompt: string; targetId: string; hint: string }[];
}

/** A term on one side of the balance: a number, or the unknown the learner must find. */
export type BalanceTerm = number | 'unknown';

export interface BalanceGameConfig {
  type: 'balance';
  /** How the unknown is shown: "?" for missing numbers, a letter such as "x" for algebra. */
  unknownLabel: string;
  rounds: {
    id: string;
    left: BalanceTerm[];
    right: BalanceTerm[];
    /** Value of the unknown that balances the scale. Checked by the curriculum tests. */
    answer: number;
    /** Values the learner can try (must include the answer). */
    choices: number[];
    prompt: string;
    hint: string;
    explanation: string;
  }[];
}

/** Sentence Builder: put word tiles in order to make a sentence. */
export interface WordOrderConfig {
  type: 'word-order';
  prompt: string;
  rounds: {
    id: string;
    /** The sentence as tiles, in the correct order, punctuation as its own tile (e.g. ["The", "cat", "sleeps", "."]). */
    words: string[];
    /** Other correct orders, if any (e.g. "In the park we play."). */
    alsoAccept?: string[][];
    /** Extra tiles that do not belong in the sentence (e.g. "?" when the answer ends with "."). */
    distractors?: string[];
    /** What the sentence is about, shown as a picture clue. */
    icon?: IconKey;
    clue: string;
    hint: string;
    explanation: string;
  }[];
}

/**
 * Number Line: tap (or drag the marker) to the right point on a number line.
 * Works for whole numbers, negative numbers, fractions and decimals.
 */
export interface NumberLineConfig {
  type: 'number-line';
  rounds: {
    id: string;
    /** Ends of the line and the distance between ticks. Every tick is a choosable point. */
    from: number;
    to: number;
    step: number;
    /** Which ticks get a printed label: every n-th tick, counting from `from`. Default 1. */
    labelEvery?: number;
    /** How numbers are written: whole or negative numbers, decimals, or fractions with this denominator. Default integer. */
    format?: { kind: 'integer' } | { kind: 'decimal'; places: number } | { kind: 'fraction'; denominator: number };
    /** "place": put the marker on `target`. "jump": the marker starts at `start` and the learner jumps to the result. */
    mode: 'place' | 'jump';
    start?: number;
    /** The correct point. Must be one of the ticks. */
    target: number;
    prompt: string;
    hint: string;
    explanation: string;
  }[];
}

/** Area Builder: drag out a rectangle on a square grid to match an area and/or a perimeter. */
export interface AreaGridConfig {
  type: 'area-grid';
  /** Grid size in squares. */
  cols: number;
  rows: number;
  rounds: {
    id: string;
    /** What the rectangle must have: at least one of area or perimeter. */
    area?: number;
    perimeter?: number;
    /** Name of one square, e.g. "square cm". Default "squares". */
    unit?: string;
    prompt: string;
    hint: string;
    explanation: string;
  }[];
}

/** Clock Setter: move the hands to show a time. */
export interface ClockConfig {
  type: 'clock';
  /** Smallest step of the minute hand: 60 (o'clock only), 30, 15 or 5 minutes. */
  minuteStep: 60 | 30 | 15 | 5;
  /** hour is 1-12; minute is a multiple of minuteStep. */
  rounds: { id: string; hour: number; minute: number; prompt: string; hint: string; explanation: string }[];
}

/** Bar Chart Builder: raise or lower bars so the chart shows the data, or read a chart to answer a question. */
export interface BarChartConfig {
  type: 'bar-chart';
  /** Top of the scale and the size of one step on it. Every value must be a multiple of step, up to max. */
  max: number;
  step: number;
  rounds: {
    id: string;
    categories: { id: string; label: string; icon?: IconKey }[];
    /** "build": make each bar match `values` (shown as a table). "read": the chart is drawn; pick the category that answers the prompt. */
    mode: 'build' | 'read';
    /** One value per category, in the same order. */
    values: number[];
    /** For "read" rounds: the category id that answers the prompt. */
    answerId?: string;
    prompt: string;
    hint: string;
    explanation: string;
  }[];
}

/** Circuit Lab (on screen only): put an object in the gap of a circuit and close the switch to see if the bulb lights. */
export interface CircuitConfig {
  type: 'circuit';
  /** Objects that can be placed in the gap. `conducts` must match the real material. `art` (a picture) is shown instead of `icon`. */
  items: { id: string; label: string; icon?: IconKey; art?: ObjectArt; conducts: boolean; explanation: string }[];
  /** "light-bulb": find a conductor and light the bulb. "test-all": test every object and sort it. */
  rounds: { id: string; prompt: string; goal: 'light-bulb' | 'test-all'; hint: string; explanation: string }[];
}

/**
 * What a Magnet Explorer object is made of. Whether a magnet pulls it follows from
 * the material alone (MAGNET_PULLS). Steel here means ordinary iron-based steel
 * (paper clips, pins, bolts): some stainless steels are not magnetic, so objects
 * such as steel spoons are left out rather than guessed.
 */
export type MagnetMaterial = 'iron' | 'steel' | 'copper' | 'aluminium' | 'brass' | 'wood' | 'plastic' | 'rubber' | 'glass';

export const MAGNET_PULLS: Record<MagnetMaterial, boolean> = {
  iron: true,
  steel: true,
  copper: false,
  aluminium: false,
  brass: false,
  wood: false,
  plastic: false,
  rubber: false,
  glass: false,
};

/**
 * Object pictures (src/components/art/ObjectArt.tsx), used by Magnet Explorer, Circuit
 * lab and Sort. Each drawing shows one material: give an item a picture only when its
 * label and its physics match that material (a "Steel key" gets 'steel-key', never
 * 'brass-key'); otherwise leave it out and use an icon.
 */
export type ObjectArt =
  | 'iron-nail'
  | 'paper-clip'
  | 'safety-pin'
  | 'iron-bolt'
  | 'copper-coin'
  | 'copper-wire'
  | 'brass-key'
  | 'steel-key'
  | 'steel-spoon'
  | 'steel-tumbler'
  | 'aluminium-can'
  | 'aluminium-foil'
  | 'wooden-block'
  | 'ice-cream-stick'
  | 'cricket-bat'
  | 'wooden-chair'
  | 'plastic-ruler'
  | 'plastic-straw'
  | 'plastic-comb'
  | 'pencil-lead'
  | 'rubber-eraser'
  | 'rubber-band'
  | 'glass-marble'
  | 'cotton-thread'
  | 'cotton-towel'
  | 'bedsheet';

export type MagnetPole = 'N' | 'S';

export type MagnetRound =
  /** Bring objects to the magnet and watch which are pulled. An investigation: no mistakes. */
  | { kind: 'test'; id: string; prompt: string; objectIds: string[]; hint: string; explanation: string }
  /** Put each object in the Magnetic or Not magnetic tray. Objects not tested before make it a real prediction. */
  | { kind: 'sort'; id: string; prompt: string; objectIds: string[]; hint: string; explanation: string }
  /**
   * Two bar magnets. The fixed magnet's N pole faces the one the learner moves and turns around.
   * explore: see both results; attract / repel: make it happen; identify: the moving magnet's
   * labels are hidden and the learner works out which pole faces the N pole (`hiddenFacing` at the start).
   */
  | { kind: 'poles'; id: string; prompt: string; goal: 'explore' | 'attract' | 'repel' | 'identify'; hiddenFacing?: MagnetPole; hint: string; explanation: string };

/** Magnet Explorer: a workbench with a magnet and everyday objects, and a pair of bar magnets for poles. */
export interface MagnetLabConfig {
  type: 'magnet-lab';
  /** `magnetic` must equal MAGNET_PULLS[material]; a curriculum test checks it. */
  objects: { id: string; label: string; material: MagnetMaterial; art: ObjectArt; magnetic: boolean; explanation: string }[];
  rounds: MagnetRound[];
}

export type GameConfig =
  | MagnetLabConfig
  | FrictionExperimentConfig
  | PushBoxConfig
  | ConceptMatchConfig
  | SortGameConfig
  | FractionBuilderConfig
  | GridExplorerConfig
  | BalanceGameConfig
  | WordOrderConfig
  | NumberLineConfig
  | AreaGridConfig
  | ClockConfig
  | BarChartConfig
  | CircuitConfig;
export type GameType = GameConfig['type'];

/**
 * Mentor coaching lines that react to game events (AI-guided discovery).
 * Keys are event keys such as "surface-selected:grass" or "run-finished:correct".
 * Values may contain {placeholders} filled from the event's variables.
 */
export type CoachScript = Record<string, string>;

/* ---------------------------------------------------------------- Topics */

export interface VideoAsset {
  id: string;
  title: string;
  /**
   * Official video URL. Usually left empty in this data and supplied through the
   * media manifest (public/media/manifest.json) so media can change without code.
   */
  src?: string;
  poster?: string;
  captionsSrc?: string;
  captionsLang?: string;
  /** Delivery status, so missing official assets are tracked in content. */
  status: 'available' | 'missing';
}

export interface TopicWatch {
  video: VideoAsset;
  /** The mentor's opening line for the topic. */
  intro: string;
  /** Temporary animated explainer, shown only while the official video is missing or fails. */
  explainer: ExplainerScene[];
  /** The main ideas in a few short sentences. */
  keyIdeas: string[];
}

export interface TopicPlay {
  title: string;
  game: GameConfig;
  coach: CoachScript;
  /** Assessed games count towards mastery; exploratory simulations do not. */
  assessed: boolean;
  /** Weight in the mastery calculation when assessed. */
  weight: number;
}

export interface TopicPractice {
  /** What the mentor says to open the quiz, e.g. "Ready for a magnet challenge?". A general line is used when left out. */
  intro?: string;
  questions: QuizQuestion[];
  /** Weight of the quiz in the mastery calculation. */
  weight: number;
}

export interface MentorFaq {
  keywords: string[];
  answer: string;
}

export interface MentorPracticeQuestion {
  question: string;
  /** Lower-case keywords; an answer containing any of them is treated as correct by the demo mentor. */
  accept: string[];
  explanation: string;
}

/** Optional mentor grounding and hints for a topic. Used by the AI prompt and the demo mentor. */
export interface TopicMentor {
  facts: string[];
  simpler: string;
  examples: string[];
  why?: string;
  hints: { watch?: string; play?: string; practice?: string; default: string };
  faq: MentorFaq[];
  practice: MentorPracticeQuestion[];
}

export interface Topic {
  id: string;
  subjectId: SubjectId;
  lessonId: string;
  /** 1-based position within the lesson. */
  order: number;
  title: string;
  summary: string;
  objectives: string[];
  language: ContentLanguage;
  icon: IconKey;
  estimatedMinutes: number;
  /** 1 = introduces the idea, 2 = practises it, 3 = stretches it. Defaults to 1. */
  difficulty?: 1 | 2 | 3;
  /** Topic ids that must be mastered first. Defaults to the previous topic in the lesson. */
  prerequisites?: string[];
  watch: TopicWatch;
  play: TopicPlay;
  practice: TopicPractice;
  /** Overrides for completion rules. Defaults come from src/engine/rules.ts. */
  mastery?: { passMastery?: number };
  mentor: TopicMentor;
}

/** What progress rules need to know about a topic's game before its content has loaded. */
export type GameMeta =
  | { type: Exclude<GameType, 'friction-experiment'> }
  | { type: 'friction-experiment'; surfaces: Pick<SurfaceDefinition, 'id' | 'name'>[] };

/**
 * The part of a topic that ships with the app: ids, order, titles, mastery
 * weights and the ids the progress reducer checks. It is a structural subset of
 * Topic (every Topic is a TopicMeta), so roadmaps and progress work before a
 * subject's full topic content (videos, games, quizzes, mentor notes) has been
 * downloaded. Generated into topicIndex.ts by `npm run curriculum:index`.
 */
export interface TopicMeta extends Pick<
  Topic,
  'id' | 'subjectId' | 'lessonId' | 'order' | 'title' | 'summary' | 'language' | 'icon' | 'estimatedMinutes' | 'difficulty' | 'prerequisites' | 'mastery'
> {
  watch: { video: Pick<VideoAsset, 'id' | 'status'> };
  play: Pick<TopicPlay, 'title' | 'assessed' | 'weight'> & { game: GameMeta };
  practice: Pick<TopicPractice, 'weight'> & { questions: Pick<QuizQuestion, 'id'>[] };
}

export type TopicStep = 'watch' | 'play' | 'practice';
export const TOPIC_STEPS: readonly TopicStep[] = ['watch', 'play', 'practice'];
