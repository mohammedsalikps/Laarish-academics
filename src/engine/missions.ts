import type { IconKey } from '../domain/types';
import { hashString } from '../lib/ids';
import { localDateKey } from '../lib/dates';
import type { ProgressState } from '../state/progressTypes';
import { xpOnDay } from '../state/selectors';
import { REWARD_RULES } from './rules';

/** Daily missions: one deterministic mission per learner per day, claimable once. */

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  icon: IconKey;
  target: number;
  progress: (state: ProgressState, today: string) => number;
}

const onDay = (iso: string, today: string) => localDateKey(iso) === today;

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'earn-xp',
    title: 'Power up',
    description: 'Earn 40 XP today.',
    icon: 'sparkles',
    target: 40,
    progress: (s, today) => xpOnDay(s, today),
  },
  {
    id: 'finish-game',
    title: 'Game on',
    description: 'Finish a mini-game today.',
    icon: 'shapes',
    target: 1,
    progress: (s, today) => s.gameAttempts.filter((g) => g.completed && onDay(g.at, today)).length,
  },
  {
    id: 'ask-lumi', // id kept from the earlier mentor so saved mission claims still match
    title: 'Curious explorer',
    description: 'Ask your mentor a question today.',
    icon: 'sparkles',
    target: 1,
    progress: (s, today) => s.stats.mentorQuestionsByDay[today] ?? 0,
  },
  {
    id: 'quiz-first-try',
    title: 'Sharp thinker',
    description: 'Answer 3 quiz questions right on the first try today.',
    icon: 'star',
    target: 3,
    progress: (s, today) => s.quizAttempts.filter((q) => onDay(q.at, today)).reduce((sum, q) => sum + q.correctFirstTry, 0),
  },
  {
    id: 'two-steps',
    title: 'Keep moving',
    description: 'Complete 2 learning steps today.',
    icon: 'footprints',
    target: 2,
    progress: (s, today) => s.activity.filter((a) => (a.kind === 'step' || a.kind === 'topic') && onDay(a.at, today)).length,
  },
];

export const MISSION_REWARD = { xp: REWARD_RULES.xp.dailyMission, coins: REWARD_RULES.coins.dailyMission };

export function missionKey(today: string): string {
  return `mission:${today}`;
}

export function missionForDay(state: ProgressState, today: string): MissionDefinition {
  const seed = hashString(`${today}:${state.learner?.id ?? 'guest'}`);
  return MISSIONS[seed % MISSIONS.length];
}

export interface MissionView {
  mission: MissionDefinition;
  current: number;
  complete: boolean;
  claimed: boolean;
}

export function missionView(state: ProgressState, today: string): MissionView {
  const mission = missionForDay(state, today);
  const current = Math.min(mission.target, mission.progress(state, today));
  return {
    mission,
    current,
    complete: current >= mission.target,
    claimed: state.ledger.some((e) => e.key === missionKey(today)),
  };
}
