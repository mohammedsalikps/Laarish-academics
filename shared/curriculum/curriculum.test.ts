// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  LESSONS,
  SUBJECTS,
  TOPICS,
  branchesForLevel,
  getBranch,
  getLesson,
  getLevel,
  getTopicsForLesson,
  lessonPrerequisites,
  lessonRoadmap,
  lessonsForBranch,
  legacyLevelToClass,
  levelForGrade,
  missingVideoAssets,
  subjectReadiness,
  topicPrerequisites,
  topicReadiness,
} from './index';
import { GRADES, MAGNET_PULLS, type GameType, type MagnetLabConfig, type QuizQuestion, type Topic } from './types';

function answerIsValid(q: QuizQuestion): boolean {
  switch (q.type) {
    case 'single-choice':
      return q.options.some((o) => o.id === q.correctOptionId) && new Set(q.options.map((o) => o.id)).size === q.options.length;
    case 'true-false':
      return typeof q.correct === 'boolean';
    case 'match-pairs':
      return q.pairs.length >= 2 && new Set(q.pairs.map((p) => p.id)).size === q.pairs.length;
    default:
      return false;
  }
}

/** Magnet Explorer: what a magnet does to each object follows from its material; every round can be finished. */
function magnetLabIsValid(g: MagnetLabConfig): boolean {
  const ids = g.objects.map((o) => o.id);
  if (new Set(ids).size !== ids.length || g.objects.some((o) => o.magnetic !== MAGNET_PULLS[o.material])) return false;
  if (g.rounds.length === 0 || new Set(g.rounds.map((r) => r.id)).size !== g.rounds.length) return false;
  return g.rounds.every((r) => {
    if (r.kind === 'poles') return r.goal !== 'identify' || r.hiddenFacing !== undefined;
    const objects = r.objectIds.map((id) => g.objects.find((o) => o.id === id));
    if (objects.length === 0 || objects.some((o) => !o) || new Set(r.objectIds).size !== r.objectIds.length) return false;
    return r.kind === 'test' || (objects.some((o) => o!.magnetic) && objects.some((o) => !o!.magnetic));
  });
}

function gameIsValid(topic: Topic): boolean {
  const g = topic.play.game;
  switch (g.type) {
    case 'magnet-lab':
      return magnetLabIsValid(g);
    case 'friction-experiment':
      return g.surfaces.length >= 2;
    case 'push-box':
      return g.floors.length >= 2 && g.floors.every((f) => f.grip >= 1 && f.grip < g.pushLabels.length);
    case 'concept-match':
      return g.pairs.length >= 2;
    case 'sort':
      return g.bins.length >= 2 && g.items.every((i) => g.bins.some((b) => b.id === i.binId));
    case 'fraction-builder':
      return g.rounds.length >= 1 && g.rounds.every((r) => r.numerator >= 1 && r.numerator <= r.parts);
    case 'grid-explorer':
      return g.tasks.every((t) => g.landmarks.some((l) => l.id === t.targetId));
    case 'balance':
      return g.rounds.length >= 1 && g.rounds.every((r) => balanceRoundIsValid(r));
    case 'word-order':
      return g.rounds.length >= 1 && g.rounds.every((r) => wordOrderRoundIsValid(r));
    case 'number-line':
      return g.rounds.length >= 1 && g.rounds.every((r) => numberLineRoundIsValid(r));
    case 'area-grid':
      return g.rounds.length >= 1 && g.rounds.every((r) => (r.area !== undefined || r.perimeter !== undefined) && areaSolutions(g.cols, g.rows, r).length > 0);
    case 'clock':
      return g.rounds.length >= 1 && g.rounds.every((r) => Number.isInteger(r.hour) && r.hour >= 1 && r.hour <= 12 && r.minute >= 0 && r.minute < 60 && r.minute % g.minuteStep === 0 && !(r.hour === 12 && r.minute === 0));
    case 'bar-chart':
      return g.rounds.length >= 1 && g.rounds.every((r) => barChartRoundIsValid(g.max, g.step, r));
    case 'circuit':
      return (
        g.items.length >= 2 &&
        g.items.some((i) => i.conducts) &&
        g.rounds.length >= 1 &&
        g.rounds.every((r) => r.goal === 'light-bulb' || (g.items.some((i) => i.conducts) && g.items.some((i) => !i.conducts)))
      );
    default:
      return false;
  }
}

type NumberLineRound = Extract<Topic['play']['game'], { type: 'number-line' }>['rounds'][number];
/** Index of a value on the line's ticks, or null when it is not exactly on a tick. */
const tickIndex = (r: NumberLineRound, v: number) => {
  const i = (v - r.from) / r.step;
  return Math.abs(i - Math.round(i)) < 1e-9 ? Math.round(i) : null;
};
/** The target (and the jump start) sit on ticks inside the line, and a jump really moves. */
function numberLineRoundIsValid(r: NumberLineRound): boolean {
  const last = tickIndex(r, r.to);
  const t = tickIndex(r, r.target);
  if (!(r.step > 0 && r.to > r.from && last !== null && last <= 40 && t !== null && t >= 0 && t <= last)) return false;
  if (r.format?.kind === 'fraction' && Math.abs(r.step * r.format.denominator - Math.round(r.step * r.format.denominator)) > 1e-9) return false;
  if (r.mode === 'jump') {
    const s = r.start === undefined ? null : tickIndex(r, r.start);
    return s !== null && s >= 0 && s <= last && s !== t;
  }
  return true;
}

type AreaRound = Extract<Topic['play']['game'], { type: 'area-grid' }>['rounds'][number];
/** Every rectangle on the grid that satisfies the round. */
function areaSolutions(cols: number, rows: number, r: AreaRound): [number, number][] {
  const out: [number, number][] = [];
  for (let w = 1; w <= cols; w += 1) for (let h = 1; h <= rows; h += 1) if ((r.area === undefined || w * h === r.area) && (r.perimeter === undefined || 2 * (w + h) === r.perimeter)) out.push([w, h]);
  return out;
}

type BarRound = Extract<Topic['play']['game'], { type: 'bar-chart' }>['rounds'][number];
function barChartRoundIsValid(max: number, step: number, r: BarRound): boolean {
  const onScale = r.values.every((v) => v >= 0 && v <= max && Number.isInteger(v / step));
  const ids = r.categories.map((c) => c.id);
  const shape = r.categories.length >= 2 && r.categories.length <= 6 && r.values.length === r.categories.length && new Set(ids).size === ids.length;
  if (r.mode === 'read') return shape && onScale && ids.includes(r.answerId ?? '');
  return shape && onScale && r.values.some((v) => v > 0);
}

type BalanceRound = Extract<Topic['play']['game'], { type: 'balance' }>['rounds'][number];
const total = (terms: BalanceRound['left'], x: number) => terms.reduce<number>((s, t) => s + (t === 'unknown' ? x : t), 0);

/** The stated answer really balances the scale, and it is the only choice that does. */
function balanceRoundIsValid(r: BalanceRound): boolean {
  const hasUnknown = [...r.left, ...r.right].includes('unknown');
  const balances = (x: number) => total(r.left, x) === total(r.right, x);
  return hasUnknown && r.choices.includes(r.answer) && balances(r.answer) && r.choices.filter(balances).length === 1 && new Set(r.choices).size === r.choices.length;
}

type WordOrderRound = Extract<Topic['play']['game'], { type: 'word-order' }>['rounds'][number];

/** A real sentence: capital letter first, end mark last, alternatives use the same tiles, distractors never duplicate the end mark. */
function wordOrderRoundIsValid(r: WordOrderRound): boolean {
  const sorted = (w: string[]) => [...w].sort().join('|');
  const end = r.words[r.words.length - 1];
  return (
    r.words.length >= 3 &&
    /^[A-Z]/.test(r.words[0]) &&
    /^[.?!]$/.test(end) &&
    (r.alsoAccept ?? []).every((alt) => sorted(alt) === sorted(r.words)) &&
    !(r.distractors ?? []).includes(end) &&
    Boolean(r.clue && r.hint && r.explanation)
  );
}

describe('curriculum structure', () => {
  it('has six subjects with unique ids', () => {
    expect(SUBJECTS.map((s) => s.id)).toEqual(['science', 'mathematics', 'english', 'hindi', 'kannada', 'social-science']);
  });

  it('uses unique ids for lessons and topics', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });

  it('links subjects → lessons → topics in both directions, in order', () => {
    for (const subject of SUBJECTS) {
      const lessons = subject.lessonIds.map((id) => getLesson(id)!);
      expect(lessons.every((l) => l && l.subjectId === subject.id)).toBe(true);
      // Lesson numbers run 1..n along each roadmap: the branch (when the subject has levels) or the subject.
      for (const lesson of lessons) {
        const roadmap = lessonRoadmap(lesson);
        expect(roadmap.map((l) => l.order)).toEqual(roadmap.map((_, i) => i + 1));
      }
      if (!subject.levels) expect(lessons.map((l) => l.order)).toEqual(lessons.map((_, i) => i + 1));
    }
    for (const lesson of LESSONS) {
      const topics = getTopicsForLesson(lesson.id);
      expect(topics.map((t) => t.id)).toEqual(lesson.topicIds);
      expect(topics.map((t) => t.order)).toEqual(topics.map((_, i) => i + 1));
      expect(topics.every((t) => t.subjectId === lesson.subjectId && t.lessonId === lesson.id)).toBe(true);
      if (lesson.status === 'ready') expect(topics.length).toBeGreaterThan(0);
    }
  });

  it('gives every subject at least one playable lesson', () => {
    for (const subject of SUBJECTS) expect(LESSONS.some((l) => l.subjectId === subject.id && l.status === 'ready'), subject.id).toBe(true);
  });

  it('chains prerequisites to the previous lesson and topic by default', () => {
    for (const lesson of LESSONS) {
      for (const id of lessonPrerequisites(lesson)) expect(getLesson(id)?.subjectId).toBe(lesson.subjectId);
    }
    for (const topic of TOPICS) {
      const prereqs = topicPrerequisites(topic);
      if (topic.order === 1) expect(prereqs).toEqual([]);
      else expect(prereqs).toEqual([getTopicsForLesson(topic.lessonId)[topic.order - 2].id]);
    }
  });
});

describe('classes: Subject → Class → Branch → Lesson', () => {
  const maths = SUBJECTS.find((s) => s.id === 'mathematics')!;

  it('gives every subject one level per class, Classes 1-8 in order', () => {
    for (const subject of SUBJECTS) {
      expect(subject.levels?.map((l) => l.id), subject.id).toEqual(GRADES.map((g) => `class-${g}`));
      expect(subject.levels?.map((l) => l.grades), subject.id).toEqual(GRADES.map((g) => [g, g]));
      expect(subject.levels?.every((l) => l.title.startsWith(`Class ${l.order}: `)), subject.id).toBe(true);
      expect(subject.branches?.length, subject.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('places every lesson in a real class and branch of its subject, recommended for that class', () => {
    for (const lesson of LESSONS) {
      const level = getLevel(lesson.subjectId, lesson.levelId);
      expect(level, lesson.id).toBeDefined();
      expect(getBranch(lesson.subjectId, lesson.branchId), lesson.id).toBeDefined();
      expect(lesson.grades, lesson.id).toEqual(level!.grades);
    }
  });

  it('numbers lessons 1..n within each class branch', () => {
    for (const subject of SUBJECTS) {
      for (const level of subject.levels!) {
        for (const branch of subject.branches!) {
          const lessons = lessonsForBranch(subject.id, level.id, branch.id);
          expect(lessons.map((l) => l.order), `${subject.id}/${level.id}/${branch.id}`).toEqual(lessons.map((_, i) => i + 1));
        }
      }
    }
  });

  it('keeps prerequisites inside a class, so a learner can start their own class directly', () => {
    for (const lesson of LESSONS) {
      for (const id of lessonPrerequisites(lesson)) {
        const prerequisite = getLesson(id);
        expect(prerequisite?.subjectId, `${lesson.id} needs ${id}`).toBe(lesson.subjectId);
        expect(prerequisite?.levelId, `${lesson.id} needs ${id}`).toBe(lesson.levelId);
      }
    }
  });

  it('recommends the class for a learner and maps old grade-band links to classes', () => {
    for (const grade of GRADES) expect(levelForGrade(maths, grade)?.id).toBe(`class-${grade}`);
    expect(legacyLevelToClass('level-2', 4)).toBe('class-4');
    expect(legacyLevelToClass('level-2', 7)).toBe('class-3');
    expect(legacyLevelToClass('level-3', undefined)).toBe('class-5');
    expect(legacyLevelToClass('class-3', 3)).toBeUndefined();
  });

  it('keeps algebra for Class 6 and above, and never includes calculus', () => {
    for (const grade of [1, 2, 3, 4, 5] as const) expect(branchesForLevel(maths, `class-${grade}`).map((b) => b.id), `class-${grade}`).not.toContain('algebra');
    expect(JSON.stringify([maths, LESSONS, TOPICS])).not.toMatch(/calculus|differentiat|integration by/i);
  });
});

describe('topic content', () => {
  it.each(TOPICS.map((t) => [t.id, t] as const))('%s has a complete Watch → Play → Practice definition', (_, topic) => {
    expect(topic.objectives.length).toBeGreaterThan(0);
    expect(topic.watch.explainer.length).toBeGreaterThan(0);
    expect(topic.watch.keyIdeas.length).toBeGreaterThan(0);
    expect(gameIsValid(topic)).toBe(true);
    expect(topic.play.coach.start).toBeTruthy();
    expect(topic.practice.questions.length).toBeGreaterThanOrEqual(3);
    expect(new Set(topic.practice.questions.map((q) => q.id)).size).toBe(topic.practice.questions.length);
    for (const q of topic.practice.questions) {
      expect(answerIsValid(q), q.id).toBe(true);
      expect(q.hint, q.id).toBeTruthy();
      expect(q.explanation, q.id).toBeTruthy();
    }
    expect(topic.practice.weight).toBeGreaterThan(0);
    expect(topic.mentor.facts.length).toBeGreaterThan(0);
    expect(topic.mentor.hints.default).toBeTruthy();
    expect(topic.mentor.practice.length).toBeGreaterThan(0);
  });

  it('writes coach lines only for events the game sends, using only the values it sends', () => {
    const round = { 'round-correct': ['explanation'], 'round-incorrect': ['hint'] };
    // Event keys each game emits (besides start, complete and complete:perfect), with the {placeholders} it fills.
    const EVENTS: Partial<Record<GameType, Record<string, string[]>>> = {
      'concept-match': { 'match-correct': ['left', 'right'], 'match-incorrect': ['left', 'right', 'hint'] },
      sort: { 'sort-correct': ['item', 'bin'], 'sort-incorrect': ['item', 'bin'] },
      'grid-explorer': { 'task-correct': ['place'], 'task-incorrect': ['hint'], walk: [] },
      'word-order': { 'tile-placed': [], 'sentence-correct': [], 'sentence-incorrect': [], 'sentence-hint': [] },
      'fraction-builder': round,
      balance: round,
      'number-line': round,
      'area-grid': round,
      clock: round,
      'bar-chart': round,
      circuit: { ...round, 'bulb-on': ['item'], 'bulb-off': ['item'] },
      'magnet-lab': {
        ...round,
        pulled: ['object', 'explanation'],
        'not-pulled': ['object', 'explanation'],
        'sort-correct': ['object', 'explanation'],
        'sort-incorrect': ['object', 'hint'],
        attract: [],
        repel: [],
        turned: [],
        hint: ['hint'],
      },
    };
    for (const topic of TOPICS) {
      const events = EVENTS[topic.play.game.type];
      if (!events) continue; // push-box and friction-experiment have their own event sets
      for (const [key, line] of Object.entries(topic.play.coach)) {
        const base = key.split(':')[0];
        const allowed = ['start', 'complete'].includes(base) ? [] : events[base];
        expect(allowed, `${topic.id}: the game never sends "${key}"`).toBeDefined();
        for (const [, name] of line.matchAll(/\{(\w+)\}/g)) expect(allowed, `${topic.id} "${key}" uses {${name}}`).toContain(name);
      }
    }
  });

  it('does not invent video URLs: every missing official video is tracked', () => {
    const missing = missingVideoAssets();
    for (const topic of TOPICS) {
      if (topic.watch.video.status === 'missing') {
        expect(topic.watch.video.src).toBeUndefined();
        expect(missing.some((m) => m.topicId === topic.id && m.videoId === topic.watch.video.id)).toBe(true);
      }
    }
  });
});

describe('coverage and honest labelling', () => {
  it('keeps every subject playable and every ready lesson complete', () => {
    for (const subject of SUBJECTS) expect(subjectReadiness(subject).lessonsReady, subject.id).toBeGreaterThanOrEqual(1);
    for (const lesson of LESSONS.filter((l) => l.status === 'ready')) {
      expect(lesson.topicIds.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.topicIds.every((id) => TOPICS.some((t) => t.id === id)), lesson.id).toBe(true);
    }
    for (const lesson of LESSONS.filter((l) => l.status === 'in-development')) expect(lesson.topicIds, lesson.id).toEqual([]);
  });

  it('gives every subject at least one playable lesson in every class, 1 to 8', () => {
    for (const subject of SUBJECTS) {
      for (const grade of GRADES) {
        expect(LESSONS.some((l) => l.subjectId === subject.id && l.grades[0] === grade && l.status === 'ready'), `${subject.id} class ${grade}`).toBe(true);
      }
    }
  });

  it('never puts a planned lesson in front of a playable one, so nothing playable is locked behind "coming soon"', () => {
    for (const subject of SUBJECTS) {
      for (const level of subject.levels!) {
        for (const branch of subject.branches!) {
          const lessons = lessonsForBranch(subject.id, level.id, branch.id);
          const firstPlanned = lessons.findIndex((l) => l.status !== 'ready');
          if (firstPlanned >= 0) expect(lessons.slice(firstPlanned).every((l) => l.status !== 'ready'), `${subject.id}/${level.id}/${branch.id}`).toBe(true);
        }
      }
    }
  });

  it('records where every lesson comes from, and how well that is verified', () => {
    for (const lesson of LESSONS) {
      const s = lesson.source;
      expect(s, lesson.id).toBeDefined();
      expect(['aligned', 'curriculum-inspired', 'proposed'], lesson.id).toContain(s!.status);
      expect(s!.grade, lesson.id).toBe(lesson.grades[0]);
      expect(s!.academicYear, lesson.id).toMatch(/^\d{4}-\d{2}$/);
      expect(s!.framework && s!.document && s!.verification, lesson.id).toBeTruthy();
      // An aligned lesson names the unit it was checked against.
      if (s!.status === 'aligned') expect(s!.unit, lesson.id).toBeTruthy();
      // The "Proposed" label in the app follows the source status.
      expect(Boolean(lesson.proposed), lesson.id).toBe(s!.status === 'proposed');
    }
  });

  it('marks every lesson as awaiting teacher review, and Hindi and Kannada as awaiting native-speaker review', () => {
    for (const lesson of LESSONS) {
      expect(lesson.review?.teacher, lesson.id).toBe('pending');
      if (lesson.subjectId === 'hindi' || lesson.subjectId === 'kannada') expect(lesson.review?.nativeSpeaker, lesson.id).toBe('pending');
    }
  });

  it('gives every playable lesson learning objectives', () => {
    for (const lesson of LESSONS.filter((l) => l.status === 'ready')) expect(lesson.objectives?.length, lesson.id).toBeGreaterThanOrEqual(2);
  });

  it('keeps the original lessons and their topic ids, so saved progress still counts', () => {
    const original: Record<string, string[]> = {
      friction: ['friction-what-is', 'friction-rough-smooth', 'friction-helps-us', 'friction-reducing'],
      magnets: ['magnets-what-they-attract', 'magnets-poles'],
      'adding-within-20': ['adding-counting-on', 'adding-number-bonds'],
      'halves-and-quarters': ['fractions-halves', 'fractions-quarters'],
      'missing-numbers': ['missing-equals-balance', 'missing-number-find'],
      'letters-for-numbers': ['algebra-letters', 'algebra-one-step'],
      'naming-and-doing-words': ['words-naming', 'words-doing'],
      'building-sentences': ['sentences-word-order', 'sentences-asking'],
      'hindi-colours': ['hindi-colours-bright', 'hindi-colours-more'],
      'kannada-colours': ['kannada-colours-bright', 'kannada-colours-more'],
      'directions-and-maps': ['maps-directions', 'maps-reading'],
    };
    for (const [lessonId, topicIds] of Object.entries(original)) {
      expect(getLesson(lessonId)?.status, lessonId).toBe('ready');
      for (const id of topicIds) expect(getLesson(lessonId)?.topicIds, lessonId).toContain(id);
    }
  });

  it('tracks video, game, quiz and assessment readiness separately', () => {
    const friction = topicReadiness(TOPICS.find((t) => t.id === 'friction-what-is')!);
    expect(friction).toMatchObject({ video: 'ready', game: 'exploratory', quiz: 'ready', assessment: 'planned' });
    const sentences = topicReadiness(TOPICS.find((t) => t.id === 'sentences-word-order')!);
    expect(sentences).toMatchObject({ video: 'explainer', game: 'assessed', quiz: 'ready' });
    expect(TOPICS.map(topicReadiness).filter((r) => r.video === 'ready').map((r) => r.topicId)).toEqual(['friction-what-is']);
  });
});
