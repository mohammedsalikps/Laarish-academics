import { isMentorId, type MentorId } from '../../shared/mentor/personas';
import { getLesson, getTopic, lessonLabel, topicLabel } from '../content';
import type { GameResult, QuizResult } from '../domain/results';
import { GRADES, TOPIC_STEPS, type Grade, type SubjectId, type TopicMeta, type TopicStep } from '../domain/types';
import { newlyEarnedAchievements } from '../engine/achievements';
import { AVATARS } from '../engine/avatars';
import { MISSION_REWARD, missionKey, missionView } from '../engine/missions';
import { computeTopicMastery, isLessonComplete, isStepAccessible, isTopicUnlocked } from '../engine/progression';
import { REWARD_RULES, clamp01, starsForMastery } from '../engine/rules';
import { localDateKey } from '../lib/dates';
import { validateDisplayName } from '../lib/validation';
import {
  createInitialState,
  type ActivityEntry,
  type AvatarId,
  type LearnerProfile,
  type ProgressState,
  type Settings,
  type TopicProgress,
} from './progressTypes';
import { coinBalance } from './selectors';

/**
 * Progress reducer. Pure and deterministic: callers pass timestamps and ids.
 *
 * All reward amounts are decided here from REWARD_RULES, never by the UI, and
 * every reward is claimed through an idempotency key. Actions on locked topics,
 * inaccessible steps, unknown surfaces or incomplete quizzes are ignored, so
 * progress cannot be unlocked by manipulating the interface.
 */

export interface NewLearner {
  displayName: string;
  grade: Grade;
  avatarId: AvatarId;
  mentorId: MentorId;
  interests: SubjectId[];
  dailyGoalXp: number;
}

export type LearnerChanges = Partial<Pick<LearnerProfile, 'displayName' | 'grade' | 'avatarId' | 'mentorId' | 'interests' | 'dailyGoalXp'>>;

export type ProgressAction =
  | { type: 'hydrate'; state: ProgressState }
  | { type: 'create-learner'; profile: NewLearner; id: string; now: string }
  | { type: 'update-learner'; changes: LearnerChanges; now: string }
  | { type: 'update-settings'; changes: Partial<Settings> }
  | { type: 'visit-subject'; subjectId: SubjectId; now: string }
  | { type: 'open-step'; topicId: string; step: TopicStep; now: string }
  | { type: 'complete-watch'; topicId: string; watched: boolean; now: string }
  | { type: 'experiment-run'; topicId: string; surfaceId: string; predictionCorrect: boolean; id: string; now: string }
  | { type: 'game-result'; topicId: string; result: GameResult; id: string; now: string }
  | { type: 'quiz-result'; topicId: string; result: QuizResult; id: string; now: string }
  | { type: 'mentor-question'; now: string }
  | { type: 'claim-mission'; now: string }
  | { type: 'purchase-avatar'; avatarId: AvatarId; now: string }
  | { type: 'reset' };

const LIMITS = { activity: 30, quizAttempts: 60, gameAttempts: 120, activeDays: 400, mentorDays: 30 };

const STEP_NAMES: Record<TopicStep, string> = { watch: 'Learn', play: 'Play', practice: 'Practice' };

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'reset':
      return { ...createInitialState(), settings: state.settings };
    case 'update-settings':
      return { ...state, settings: { ...state.settings, ...sanitizeSettings(action.changes) } };
    case 'create-learner':
      return createLearner(state, action);
    default:
      break;
  }
  if (!state.learner) return state;

  const next = applyLearnerAction(state, action);
  if (next === state) return state;
  return awardAchievements(next, 'now' in action ? action.now : new Date().toISOString());
}

function applyLearnerAction(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'update-learner':
      return updateLearner(state, action.changes);
    case 'visit-subject':
      if (state.stats.subjectsVisited.includes(action.subjectId)) return state;
      return { ...state, stats: { ...state.stats, subjectsVisited: [...state.stats.subjectsVisited, action.subjectId] } };
    case 'open-step':
      return openStep(state, action.topicId, action.step, action.now);
    case 'complete-watch': {
      const topic = topicFor(state, action.topicId, 'watch');
      if (!topic) return state;
      return completeStep(state, topic, 'watch', action.now, { withReward: action.watched });
    }
    case 'experiment-run':
      return experimentRun(state, action);
    case 'game-result':
      return gameResult(state, action);
    case 'quiz-result':
      return quizResult(state, action);
    case 'mentor-question': {
      const today = localDateKey(action.now);
      const byDay = trimDays({ ...state.stats.mentorQuestionsByDay, [today]: (state.stats.mentorQuestionsByDay[today] ?? 0) + 1 });
      let next: ProgressState = { ...state, stats: { ...state.stats, mentorQuestions: state.stats.mentorQuestions + 1, mentorQuestionsByDay: byDay } };
      next = claim(next, { key: 'mentor:first-question', xp: REWARD_RULES.xp.mentorFirstQuestion, reason: 'First question to your mentor', at: action.now });
      return markActive(next, action.now);
    }
    case 'claim-mission': {
      const today = localDateKey(action.now);
      const view = missionView(state, today);
      if (!view.complete || view.claimed) return state;
      const next = claim(state, {
        key: missionKey(today),
        xp: MISSION_REWARD.xp,
        coins: MISSION_REWARD.coins,
        reason: `Daily mission: ${view.mission.title}`,
        at: action.now,
      });
      return logActivity(next, { kind: 'mission', title: `Daily mission complete: ${view.mission.title}`, at: action.now });
    }
    case 'purchase-avatar': {
      const def = AVATARS.find((a) => a.id === action.avatarId);
      if (!def || state.ownedAvatars.includes(def.id)) return state;
      if (coinBalance(state) < def.cost) return state;
      const key = `purchase:avatar:${def.id}`;
      if (state.ledger.some((e) => e.key === key)) return state;
      const next: ProgressState = {
        ...state,
        ledger: [...state.ledger, { key, kind: 'spend', xp: 0, coins: -def.cost, reason: `Unlocked the ${def.name} avatar`, at: action.now }],
        ownedAvatars: [...state.ownedAvatars, def.id],
        learner: state.learner ? { ...state.learner, avatarId: def.id } : null,
      };
      return logActivity(next, { kind: 'purchase', title: `Unlocked the ${def.name} avatar`, at: action.now });
    }
    default:
      return state;
  }
}

/* ---------------------------------------------------------------- learner */

function createLearner(state: ProgressState, action: Extract<ProgressAction, { type: 'create-learner' }>): ProgressState {
  const name = validateDisplayName(action.profile.displayName);
  if (!name.ok || !GRADES.includes(action.profile.grade) || !isMentorId(action.profile.mentorId)) return state;
  const base = createInitialState();
  const avatarId = base.ownedAvatars.includes(action.profile.avatarId) ? action.profile.avatarId : base.ownedAvatars[0];
  return {
    ...base,
    settings: state.settings,
    learner: {
      id: action.id,
      displayName: name.value,
      grade: action.profile.grade,
      language: 'en',
      avatarId,
      mentorId: action.profile.mentorId,
      interests: [...new Set(action.profile.interests)],
      dailyGoalXp: validGoal(action.profile.dailyGoalXp),
      createdAt: action.now,
      mode: 'demo',
    },
  };
}

function updateLearner(state: ProgressState, changes: LearnerChanges): ProgressState {
  if (!state.learner) return state;
  const learner = { ...state.learner };
  if (changes.displayName !== undefined) {
    const name = validateDisplayName(changes.displayName);
    if (!name.ok) return state;
    learner.displayName = name.value;
  }
  if (changes.grade !== undefined) {
    if (!GRADES.includes(changes.grade)) return state;
    learner.grade = changes.grade;
  }
  if (changes.avatarId !== undefined) {
    if (!state.ownedAvatars.includes(changes.avatarId)) return state;
    learner.avatarId = changes.avatarId;
  }
  if (changes.mentorId !== undefined) {
    // Changing the mentor only changes who talks to the child: progress is untouched.
    if (!isMentorId(changes.mentorId)) return state;
    learner.mentorId = changes.mentorId;
  }
  if (changes.interests !== undefined) learner.interests = [...new Set(changes.interests)];
  if (changes.dailyGoalXp !== undefined) learner.dailyGoalXp = validGoal(changes.dailyGoalXp);
  return { ...state, learner };
}

function validGoal(goal: number): number {
  return (REWARD_RULES.dailyGoal.options as readonly number[]).includes(goal) ? goal : REWARD_RULES.dailyGoal.default;
}

function sanitizeSettings(changes: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (changes.motion && ['system', 'reduce', 'full'].includes(changes.motion)) out.motion = changes.motion;
  if (changes.textSize && ['standard', 'large'].includes(changes.textSize)) out.textSize = changes.textSize;
  if (typeof changes.sound === 'boolean') out.sound = changes.sound;
  if (typeof changes.readAloud === 'boolean') out.readAloud = changes.readAloud;
  if (typeof changes.voiceAnswers === 'boolean') out.voiceAnswers = changes.voiceAnswers;
  if (changes.mentorLanguage && ['en', 'hi', 'kn'].includes(changes.mentorLanguage)) out.mentorLanguage = changes.mentorLanguage;
  return out;
}

/* ----------------------------------------------------------------- topics */

/** The topic, if it exists, is unlocked, and the step is accessible. */
function topicFor(state: ProgressState, topicId: string, step: TopicStep): TopicMeta | null {
  const topic = getTopic(topicId);
  if (!topic || !isTopicUnlocked(topic, state.topics)) return null;
  if (!isStepAccessible(state.topics[topicId], step)) return null;
  return topic;
}

function ensureRecord(state: ProgressState, topic: TopicMeta, now: string): TopicProgress {
  return (
    state.topics[topic.id] ?? {
      topicId: topic.id,
      status: 'in-progress',
      currentStep: 'watch',
      completedSteps: [],
      scores: {},
      startedAt: now,
      lastPlayedAt: now,
      timesCompleted: 0,
      bestMastery: 0,
      stars: 0,
    }
  );
}

function openStep(state: ProgressState, topicId: string, step: TopicStep, now: string): ProgressState {
  const topic = topicFor(state, topicId, step);
  if (!topic) return state;
  const record = ensureRecord(state, topic, now);
  if (state.topics[topicId] && record.currentStep === step) return state;
  return { ...state, topics: { ...state.topics, [topicId]: { ...record, currentStep: step, lastPlayedAt: now } } };
}

function completeStep(state: ProgressState, topic: TopicMeta, step: TopicStep, now: string, opts: { withReward: boolean; score?: number }): ProgressState {
  const record = ensureRecord(state, topic, now);
  const firstTime = !record.completedSteps.includes(step);
  const scores =
    opts.score === undefined || step === 'watch'
      ? record.scores
      : { ...record.scores, [step]: Math.max(record.scores[step] ?? 0, clamp01(opts.score)) };
  const nextStep = TOPIC_STEPS[TOPIC_STEPS.indexOf(step) + 1] ?? step;
  const updated: TopicProgress = {
    ...record,
    completedSteps: firstTime ? [...record.completedSteps, step] : record.completedSteps,
    scores,
    currentStep: nextStep,
    lastPlayedAt: now,
  };
  let next: ProgressState = { ...state, topics: { ...state.topics, [topic.id]: updated } };
  if (opts.withReward) {
    next = claim(next, {
      key: `topic:${topic.id}:${step}`,
      xp: REWARD_RULES.xp.stepComplete,
      reason: `${STEP_NAMES[step]}: ${topic.title}`,
      at: now,
      topicId: topic.id,
      lessonId: topic.lessonId,
    });
  }
  // The final step is reported by the topic completion entry instead.
  if (firstTime && step !== 'practice') {
    next = logActivity(next, { kind: 'step', title: `${STEP_NAMES[step]}: ${topic.title}`, detail: lessonLabel(getLesson(topic.lessonId)!), at: now, topicId: topic.id });
  }
  next = markActive(next, now);
  return step === 'practice' ? finalizeTopic(next, topic, now) : next;
}

/** Runs when Practice completes: recomputes mastery and stars, and claims completion rewards once. */
function finalizeTopic(state: ProgressState, topic: TopicMeta, now: string): ProgressState {
  const record = state.topics[topic.id];
  if (!record || !TOPIC_STEPS.every((s) => record.completedSteps.includes(s))) return state;
  const lesson = getLesson(topic.lessonId)!;
  const lessonWasComplete = isLessonComplete(lesson, state.topics);
  const mastery = computeTopicMastery(topic, record.scores);
  const bestMastery = Math.max(record.bestMastery, mastery);
  const previousStars = record.stars;
  const stars = Math.max(previousStars, starsForMastery(bestMastery, true)) as 0 | 1 | 2 | 3;
  const firstCompletion = record.status !== 'completed';
  let next: ProgressState = {
    ...state,
    topics: {
      ...state.topics,
      [topic.id]: {
        ...record,
        status: 'completed',
        completedAt: record.completedAt ?? now,
        timesCompleted: record.timesCompleted + 1,
        bestMastery,
        stars,
        currentStep: 'watch',
      },
    },
  };
  const ids = { topicId: topic.id, lessonId: topic.lessonId };
  next = claim(next, {
    key: `topic:${topic.id}:complete`,
    xp: REWARD_RULES.xp.topicComplete,
    coins: REWARD_RULES.coins.topicComplete,
    reason: `Topic complete: ${topic.title}`,
    at: now,
    ...ids,
  });
  for (let star = 1; star <= stars; star += 1) {
    next = claim(next, { key: `topic:${topic.id}:star:${star}`, coins: REWARD_RULES.coins.perStar, reason: `Star ${star} on ${topic.title}`, at: now, ...ids });
  }
  if (firstCompletion) {
    next = logActivity(next, { kind: 'topic', title: `Completed ${topicLabel(topic)}`, detail: `${lesson.title} · ${stars} star${stars === 1 ? '' : 's'}`, at: now, topicId: topic.id });
  } else if (stars > previousStars) {
    next = logActivity(next, { kind: 'topic', title: `Improved ${topic.title}`, detail: `Now ${stars} stars`, at: now, topicId: topic.id });
  }

  if (!lessonWasComplete && isLessonComplete(lesson, next.topics)) {
    next = claim(next, {
      key: `lesson:${lesson.id}:complete`,
      xp: REWARD_RULES.xp.lessonComplete,
      coins: REWARD_RULES.coins.lessonComplete,
      reason: `Lesson complete: ${lesson.title}`,
      at: now,
      lessonId: lesson.id,
    });
    next = logActivity(next, { kind: 'lesson', title: `Completed ${lessonLabel(lesson)}`, detail: 'Every topic mastered', at: now, lessonId: lesson.id });
  }
  return next;
}

function experimentRun(state: ProgressState, action: Extract<ProgressAction, { type: 'experiment-run' }>): ProgressState {
  const topic = topicFor(state, action.topicId, 'play');
  if (!topic || topic.play.game.type !== 'friction-experiment') return state;
  const surface = topic.play.game.surfaces.find((s) => s.id === action.surfaceId);
  if (!surface) return state;

  const record = ensureRecord(state, topic, action.now);
  const surfaceKey = `${topic.id}:${surface.id}`;
  let next: ProgressState = {
    ...state,
    topics: { ...state.topics, [topic.id]: { ...record, lastPlayedAt: action.now } },
    stats: {
      ...state.stats,
      experimentRuns: state.stats.experimentRuns + 1,
      correctPredictions: state.stats.correctPredictions + (action.predictionCorrect ? 1 : 0),
      surfacesTested: state.stats.surfacesTested.includes(surfaceKey) ? state.stats.surfacesTested : [...state.stats.surfacesTested, surfaceKey],
    },
    gameAttempts: cap(
      [
        ...state.gameAttempts,
        {
          id: action.id,
          topicId: topic.id,
          gameType: 'friction-experiment',
          at: action.now,
          score: action.predictionCorrect ? 1 : 0,
          completed: false,
          mode: record.completedSteps.includes('play') ? 'practice' : 'first',
          summary: `Tested ${surface.name}${action.predictionCorrect ? ' (prediction correct)' : ''}`,
        },
      ],
      LIMITS.gameAttempts,
    ),
  };
  const ids = { topicId: topic.id, lessonId: topic.lessonId };
  next = claim(next, { key: `exp:${topic.id}:${surface.id}:tested`, xp: REWARD_RULES.xp.experimentSurfaceTested, reason: `Tested ${surface.name}`, at: action.now, ...ids });
  if (action.predictionCorrect) {
    next = claim(next, {
      key: `exp:${topic.id}:${surface.id}:predicted`,
      xp: REWARD_RULES.xp.experimentCorrectPrediction,
      reason: `Correct prediction on ${surface.name}`,
      at: action.now,
      ...ids,
    });
  }
  return markActive(next, action.now);
}

function gameResult(state: ProgressState, action: Extract<ProgressAction, { type: 'game-result' }>): ProgressState {
  const topic = topicFor(state, action.topicId, 'play');
  if (!topic || topic.play.game.type !== action.result.gameType) return state;
  const play = topic.play;
  const result = { ...action.result, score: clamp01(action.result.score) };
  const record = ensureRecord(state, topic, action.now);
  const practice = record.completedSteps.includes('play');

  let next: ProgressState = {
    ...state,
    gameAttempts: cap(
      [
        ...state.gameAttempts,
        { id: action.id, topicId: topic.id, gameType: result.gameType, at: action.now, score: result.score, completed: result.completed, mode: practice ? 'practice' : 'first', summary: result.summary },
      ],
      LIMITS.gameAttempts,
    ),
  };
  if (!result.completed) return markActive(next, action.now);

  if (result.perfect && play.assessed) next = { ...next, stats: { ...next.stats, perfectGames: next.stats.perfectGames + 1 } };
  next = completeStep(next, topic, 'play', action.now, { withReward: true, score: result.score });
  const ids = { topicId: topic.id, lessonId: topic.lessonId };
  if (play.assessed) {
    next = claim(next, { key: `game:${topic.id}:complete`, xp: REWARD_RULES.xp.gameComplete, reason: `Finished ${play.title}`, at: action.now, ...ids });
    if (result.perfect) {
      next = claim(next, { key: `game:${topic.id}:perfect`, xp: REWARD_RULES.xp.gamePerfect, reason: `Perfect game: ${play.title}`, at: action.now, ...ids });
    }
  }
  return next;
}

function quizResult(state: ProgressState, action: Extract<ProgressAction, { type: 'quiz-result' }>): ProgressState {
  const topic = topicFor(state, action.topicId, 'practice');
  if (!topic) return state;
  const questions = topic.practice.questions;
  const validIds = new Set(questions.map((q) => q.id));
  const answers = action.result.answers.filter((a) => validIds.has(a.questionId));
  // Every question must be resolved before the quiz counts as finished.
  if (new Set(answers.map((a) => a.questionId)).size !== questions.length) return state;

  const credits = answers.map((a) => clamp01(a.credit));
  const score = credits.reduce((s, c) => s + c, 0) / questions.length;
  const correctFirstTry = credits.filter((c) => c >= 1).length;
  const record = ensureRecord(state, topic, action.now);
  const practice = record.completedSteps.includes('practice');

  let next: ProgressState = {
    ...state,
    quizAttempts: cap(
      [
        ...state.quizAttempts,
        {
          id: action.id,
          topicId: topic.id,
          at: action.now,
          score,
          correctFirstTry,
          total: questions.length,
          mode: practice ? 'practice' : 'first',
          answers: answers.map((a) => ({ ...a, credit: clamp01(a.credit) })),
        },
      ],
      LIMITS.quizAttempts,
    ),
  };
  const ids = { topicId: topic.id, lessonId: topic.lessonId };
  for (const a of answers) {
    if (a.credit > 0) {
      next = claim(next, { key: `quiz:${topic.id}:${a.questionId}:correct`, xp: REWARD_RULES.xp.quizAssisted, reason: 'Quiz question correct', at: action.now, ...ids });
    }
    if (a.credit >= 1) {
      next = claim(next, {
        key: `quiz:${topic.id}:${a.questionId}:first-try`,
        xp: REWARD_RULES.xp.quizFirstTry - REWARD_RULES.xp.quizAssisted,
        reason: 'Quiz question right first try',
        at: action.now,
        ...ids,
      });
    }
  }
  if (correctFirstTry === questions.length) next = { ...next, stats: { ...next.stats, perfectQuizzes: next.stats.perfectQuizzes + 1 } };
  return completeStep(next, topic, 'practice', action.now, { withReward: true, score });
}

/* ---------------------------------------------------------------- helpers */

interface Claim {
  key: string;
  xp?: number;
  coins?: number;
  reason: string;
  at: string;
  topicId?: string;
  lessonId?: string;
}

/** Idempotent reward claim: a key already in the ledger is never applied again. */
export function claim(state: ProgressState, c: Claim): ProgressState {
  if (state.ledger.some((e) => e.key === c.key)) return state;
  const xp = Math.max(0, Math.round(c.xp ?? 0));
  const coins = Math.max(0, Math.round(c.coins ?? 0));
  if (xp === 0 && coins === 0) return state;
  return {
    ...state,
    ledger: [
      ...state.ledger,
      {
        key: c.key,
        kind: 'reward',
        xp,
        coins,
        reason: c.reason,
        at: c.at,
        ...(c.topicId ? { topicId: c.topicId } : {}),
        ...(c.lessonId ? { lessonId: c.lessonId } : {}),
      },
    ],
  };
}

function awardAchievements(state: ProgressState, now: string): ProgressState {
  let next = state;
  // Achievement rewards can unlock further achievements (e.g. Rising Star), so repeat until stable.
  for (let guard = 0; guard < 20; guard += 1) {
    const earned = newlyEarnedAchievements(next, now);
    if (earned.length === 0) break;
    for (const a of earned) {
      next = { ...next, achievements: { ...next.achievements, [a.id]: { unlockedAt: now } } };
      next = claim(next, { key: `achievement:${a.id}`, xp: REWARD_RULES.xp.achievement, coins: REWARD_RULES.coins.achievement, reason: `Achievement: ${a.name}`, at: now });
      next = logActivity(next, { kind: 'achievement', title: `Unlocked ${a.name}`, detail: a.description, at: now, ref: a.id });
    }
  }
  return next;
}

function markActive(state: ProgressState, now: string): ProgressState {
  const day = localDateKey(now);
  if (state.activeDays.includes(day)) return state;
  const activeDays = [...state.activeDays, day].sort();
  return { ...state, activeDays: activeDays.slice(-LIMITS.activeDays) };
}

function logActivity(state: ProgressState, entry: Omit<ActivityEntry, 'id'>): ProgressState {
  const id = `${entry.kind}:${entry.at}:${state.activity.length}:${entry.ref ?? entry.topicId ?? entry.lessonId ?? ''}`;
  return { ...state, activity: [{ id, ...entry }, ...state.activity].slice(0, LIMITS.activity) };
}

function cap<T>(items: T[], max: number): T[] {
  return items.length > max ? items.slice(items.length - max) : items;
}

function trimDays(byDay: Record<string, number>): Record<string, number> {
  const keys = Object.keys(byDay).sort();
  if (keys.length <= LIMITS.mentorDays) return byDay;
  return Object.fromEntries(keys.slice(-LIMITS.mentorDays).map((k) => [k, byDay[k]]));
}
