import type { IconKey } from '../domain/types';
import { localDateKey } from '../lib/dates';
import type { ProgressState } from '../state/progressTypes';
import { completedTopicCount, currentStreak, dailyGoal, levelInfo, overallProgress, totalStars, xpOnDay } from '../state/selectors';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: IconKey;
  tone: 'primary' | 'success' | 'reward' | 'coral' | 'sky';
  /** Progress towards the achievement as current/target. Unlocked when current >= target. */
  progress: (state: ProgressState, today: string) => { current: number; target: number };
}

const completedStepCount = (s: ProgressState) => Object.values(s.topics).reduce((sum, t) => sum + (t?.completedSteps.length ?? 0), 0);

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first learning step.',
    icon: 'footprints',
    tone: 'primary',
    progress: (s) => ({ current: Math.min(1, completedStepCount(s)), target: 1 }),
  },
  {
    id: 'curious-mind',
    name: 'Curious Mind',
    description: 'Ask your mentor a question.',
    icon: 'sparkles',
    tone: 'sky',
    progress: (s) => ({ current: Math.min(1, s.stats.mentorQuestions), target: 1 }),
  },
  {
    id: 'lab-explorer',
    name: 'Lab Explorer',
    description: 'Test 3 different surfaces in an experiment.',
    icon: 'flask',
    tone: 'success',
    progress: (s) => ({ current: Math.min(3, s.stats.surfacesTested.length), target: 3 }),
  },
  {
    id: 'sharp-predictor',
    name: 'Sharp Predictor',
    description: 'Make 3 correct predictions in experiments.',
    icon: 'star',
    tone: 'reward',
    progress: (s) => ({ current: Math.min(3, s.stats.correctPredictions), target: 3 }),
  },
  {
    id: 'perfect-play',
    name: 'Perfect Play',
    description: 'Finish a game with no mistakes.',
    icon: 'shapes',
    tone: 'coral',
    progress: (s) => ({ current: Math.min(1, s.stats.perfectGames), target: 1 }),
  },
  {
    id: 'quiz-whiz',
    name: 'Quiz Whiz',
    description: 'Answer every question in a quiz right on the first try.',
    icon: 'sparkles',
    tone: 'primary',
    progress: (s) => ({ current: Math.min(1, s.stats.perfectQuizzes), target: 1 }),
  },
  {
    id: 'topic-champion',
    name: 'Topic Champion',
    description: 'Complete your first topic.',
    icon: 'star',
    tone: 'success',
    progress: (s) => ({ current: Math.min(1, completedTopicCount(s)), target: 1 }),
  },
  {
    id: 'lesson-complete',
    name: 'Lesson Complete',
    description: 'Complete every topic in a lesson.',
    icon: 'flame',
    tone: 'success',
    progress: (s) => ({ current: Math.min(1, overallProgress(s).lessonsCompleted), target: 1 }),
  },
  {
    id: 'star-collector',
    name: 'Star Collector',
    description: 'Earn 5 stars across your topics.',
    icon: 'star',
    tone: 'reward',
    progress: (s) => ({ current: Math.min(5, totalStars(s)), target: 5 }),
  },
  {
    id: 'goal-getter',
    name: 'Goal Getter',
    description: 'Reach your daily XP goal.',
    icon: 'flame',
    tone: 'coral',
    progress: (s, today) => {
      const goal = dailyGoal(s);
      const best = Math.max(xpOnDay(s, today), ...s.activeDays.map((d) => xpOnDay(s, d)));
      return { current: Math.min(goal, best), target: goal };
    },
  },
  {
    id: 'on-a-roll',
    name: 'On a Roll',
    description: 'Learn on 3 days in a row.',
    icon: 'flame',
    tone: 'reward',
    progress: (s, today) => ({ current: Math.min(3, currentStreak(s, today)), target: 3 }),
  },
  {
    id: 'world-traveller',
    name: 'World Traveller',
    description: 'Visit 3 different subject worlds.',
    icon: 'globe',
    tone: 'sky',
    progress: (s) => ({ current: Math.min(3, s.stats.subjectsVisited.length), target: 3 }),
  },
  {
    id: 'rising-star',
    name: 'Rising Star',
    description: 'Reach Level 3.',
    icon: 'atom',
    tone: 'primary',
    progress: (s) => ({ current: Math.min(3, levelInfo(s).level), target: 3 }),
  },
];

export function getAchievement(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function isAchieved(def: AchievementDefinition, state: ProgressState, today: string): boolean {
  const { current, target } = def.progress(state, today);
  return current >= target;
}

/** Achievements that are earned but not yet recorded. */
export function newlyEarnedAchievements(state: ProgressState, nowIso: string): AchievementDefinition[] {
  if (!state.learner) return [];
  const today = localDateKey(nowIso);
  return ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && isAchieved(a, state, today));
}
