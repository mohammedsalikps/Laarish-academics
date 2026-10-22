/**
 * Single source of truth for XP, coin, star, level and unlock rules.
 *
 * Every reward is claimed through an idempotency key (see state/reducer.ts), so
 * each amount below is granted at most once per key. Replaying a topic is
 * "practice": it can raise best scores and stars, but never re-grants a reward
 * that was already claimed.
 */
export const REWARD_RULES = {
  xp: {
    /** First completion of each step of a topic (Watch, Play, Practice). Watch needs most of the video watched. */
    stepComplete: 10,
    /** First time the learner tests each surface in an experiment. */
    experimentSurfaceTested: 5,
    /** First correct prediction for each surface. */
    experimentCorrectPrediction: 5,
    /** First completion of an assessed mini-game. */
    gameComplete: 15,
    /** First time an assessed mini-game is finished with no mistakes. */
    gamePerfect: 10,
    /** Per quiz question, the first time it is answered correctly without help. */
    quizFirstTry: 10,
    /** Per quiz question, the first time it is answered correctly after a hint or retry. */
    quizAssisted: 5,
    /** First completion of a topic (all three steps). */
    topicComplete: 30,
    /** First completion of a whole lesson (every topic mastered). */
    lessonComplete: 50,
    /** First question ever asked to the mentor. */
    mentorFirstQuestion: 5,
    /** Daily mission bonus. */
    dailyMission: 10,
    /** Bonus for each achievement unlocked. */
    achievement: 10,
  },
  coins: {
    /** First completion of a topic. */
    topicComplete: 5,
    /** Each star earned on a topic for the first time (stars 1, 2 and 3 are separate claims). */
    perStar: 3,
    /** First completion of a whole lesson. */
    lessonComplete: 15,
    dailyMission: 15,
    achievement: 5,
  },
  /** Mastery thresholds (0-1) for 2 and 3 stars on a topic. Completing a topic always earns at least 1 star. */
  stars: {
    two: 0.7,
    three: 0.9,
  },
  unlock: {
    /**
     * Mastery (0-1) a topic needs to count as mastered. The next topic unlocks when
     * the previous one is mastered; the next lesson unlocks when every topic of the
     * previous lesson is mastered. A topic can override this with mastery.passMastery.
     */
    minMastery: 0.6,
  },
  quiz: {
    /** Answer attempts per question before the answer is revealed. */
    maxAttempts: 2,
    /** Credit for a correct answer on the first try without a hint. */
    creditFirstTry: 1,
    /** Credit for a correct answer after a hint or on the second try. */
    creditAssisted: 0.5,
  },
  video: {
    /** Fraction of a video (or explainer) that counts as "watched" for the Watch step reward. */
    watchedThreshold: 0.8,
  },
  dailyGoal: {
    options: [30, 50, 100] as const,
    default: 50,
  },
} as const;

/** XP needed to reach a level: L1 = 0, L2 = 100, L3 = 300, L4 = 600, L5 = 1000 ... */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * l * (l - 1);
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  /** 0-1 progress towards the next level. */
  progress: number;
}

export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    xpIntoLevel: xp - floor,
    xpForNext: next - floor,
    progress: Math.min(1, (xp - floor) / (next - floor)),
  };
}

/** Stars for a completed topic given its mastery (0-1). Incomplete topics have 0 stars. */
export function starsForMastery(mastery: number, completed: boolean): 0 | 1 | 2 | 3 {
  if (!completed) return 0;
  if (mastery >= REWARD_RULES.stars.three) return 3;
  if (mastery >= REWARD_RULES.stars.two) return 2;
  return 1;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
