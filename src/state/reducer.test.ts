import { describe, expect, it } from 'vitest';
import { getLesson, getTopic } from '../content';
import { REWARD_RULES } from '../engine/rules';
import { FRICTION_LESSON, FRICTION_TOPICS, NOW, apply, gameResult, learnerState, playLesson, playTopic, quizResultFor } from '../test/fixtures';
import { createInitialState, type ProgressState } from './progressTypes';
import { progressReducer } from './reducer';
import { coinBalance, totalXp } from './selectors';

const [T1, T2, T3] = FRICTION_TOPICS;
const nonAchievement = (s: ProgressState) => s.ledger.filter((e) => !e.key.startsWith('achievement:'));
const sumXp = (s: ProgressState) => nonAchievement(s).reduce((a, e) => a + e.xp, 0);
const sumCoins = (s: ProgressState) => nonAchievement(s).reduce((a, e) => a + e.coins, 0);
const questionCount = (id: string) => getTopic(id)!.practice.questions.length;

describe('learner profile', () => {
  it('creates a demo learner with validated input', () => {
    const s = learnerState();
    expect(s.learner).toMatchObject({ displayName: 'Asha', grade: 4, mode: 'demo', avatarId: 'fox' });
  });

  it('rejects invalid nicknames', () => {
    const base = createInitialState();
    for (const displayName of ['a', 'me@mail.com']) {
      const s = progressReducer(base, { type: 'create-learner', profile: { displayName, grade: 4, avatarId: 'fox', mentorId: 'ayra', interests: [], dailyGoalXp: 50 }, id: 'x', now: NOW });
      expect(s.learner).toBeNull();
    }
  });

  it('ignores learning actions when there is no learner', () => {
    const base = createInitialState();
    expect(progressReducer(base, { type: 'complete-watch', topicId: T1, watched: true, now: NOW })).toBe(base);
  });
});

describe('rewards for one topic', () => {
  const x = REWARD_RULES.xp;
  const c = REWARD_RULES.coins;

  it('pays step, quiz and completion rewards for an exploratory game', () => {
    expect(getTopic(T1)!.play.assessed).toBe(false);
    const s = playTopic(learnerState(), T1);
    expect(sumXp(s)).toBe(x.stepComplete * 3 + x.quizFirstTry * questionCount(T1) + x.topicComplete);
    expect(sumCoins(s)).toBe(c.topicComplete + 3 * c.perStar);
    expect(s.topics[T1]).toMatchObject({ status: 'completed', stars: 3, bestMastery: 1, timesCompleted: 1, completedSteps: ['watch', 'play', 'practice'] });
    expect(s.achievements['first-steps']).toBeDefined();
    expect(s.achievements['topic-champion']).toBeDefined();
    expect(s.achievements['quiz-whiz']).toBeDefined();
  });

  it('adds game rewards when the game is assessed', () => {
    const ready = playTopic(playTopic(learnerState(), T1), T2);
    expect(getTopic(T3)!.play.assessed).toBe(true);
    const s = playTopic(ready, T3);
    const gained = sumXp(s) - sumXp(ready);
    expect(gained).toBe(x.stepComplete * 3 + x.gameComplete + x.gamePerfect + x.quizFirstTry * questionCount(T3) + x.topicComplete);
    expect(s.achievements['perfect-play']).toBeDefined();
  });

  it('rewards the Friction Lab experiment per surface and correct prediction', () => {
    const before = playTopic(learnerState(), T1);
    const s = apply(
      before,
      { type: 'complete-watch', topicId: T2, watched: true, now: NOW },
      { type: 'experiment-run', topicId: T2, surfaceId: 'wood', predictionCorrect: true, id: 'r1', now: NOW },
      { type: 'experiment-run', topicId: T2, surfaceId: 'wood', predictionCorrect: true, id: 'r2', now: NOW },
    );
    const exp = s.ledger.filter((e) => e.key.startsWith(`exp:${T2}:`));
    expect(exp.map((e) => e.key)).toEqual([`exp:${T2}:wood:tested`, `exp:${T2}:wood:predicted`]);
    expect(exp.reduce((a, e) => a + e.xp, 0)).toBe(x.experimentSurfaceTested + x.experimentCorrectPrediction);
    expect(s.stats.experimentRuns).toBe(2);
  });

  it('completes Watch without forced waiting, but only pays watch XP after watching', () => {
    const skipped = apply(learnerState(), { type: 'complete-watch', topicId: T1, watched: false, now: NOW });
    expect(skipped.topics[T1]?.completedSteps).toEqual(['watch']);
    expect(skipped.ledger.some((e) => e.key === `topic:${T1}:watch`)).toBe(false);
    const watched = apply(skipped, { type: 'complete-watch', topicId: T1, watched: true, now: NOW }, { type: 'complete-watch', topicId: T1, watched: true, now: NOW });
    expect(watched.ledger.filter((e) => e.key === `topic:${T1}:watch`)).toHaveLength(1);
  });

  it('gives half XP for assisted answers and tops it up on a later first-try answer', () => {
    const n = questionCount(T1);
    const credits = Array.from({ length: n }, (_, i) => (i === 0 ? 0.5 : i === 1 ? 0 : 1));
    const first = playTopic(learnerState(), T1, { credits });
    const q = getTopic(T1)!.practice.questions;
    const xpFor = (s: ProgressState, id: string) => s.ledger.filter((e) => e.key.startsWith(`quiz:${T1}:${id}:`)).reduce((a, e) => a + e.xp, 0);
    expect(xpFor(first, q[0].id)).toBe(x.quizAssisted);
    expect(xpFor(first, q[1].id)).toBe(0);
    const replay = playTopic(first, T1, { runId: 'b' });
    expect(xpFor(replay, q[0].id)).toBe(x.quizFirstTry);
    expect(xpFor(replay, q[1].id)).toBe(x.quizFirstTry);
  });
});

describe('reward idempotency and replays', () => {
  it('never awards the same reward twice', () => {
    const once = playTopic(playTopic(learnerState(), T1), T2);
    const thrice = playTopic(playTopic(once, T2, { runId: 'b' }), T2, { runId: 'c' });
    expect(sumXp(thrice) + sumCoins(thrice)).toBe(sumXp(once) + sumCoins(once));
    expect(new Set(thrice.ledger.map((e) => e.key)).size).toBe(thrice.ledger.length);
    expect(thrice.topics[T2]?.timesCompleted).toBe(3);
    // Replays can still earn genuinely new achievements (3 correct predictions across runs).
    expect(once.achievements['sharp-predictor']).toBeUndefined();
    expect(thrice.achievements['sharp-predictor']).toBeDefined();
    expect(totalXp(thrice)).toBeGreaterThan(totalXp(once));
  });

  it('records replays as practice attempts', () => {
    const s = playTopic(playTopic(learnerState(), T1), T1, { runId: 'b' });
    expect(s.quizAttempts.map((q) => q.mode)).toEqual(['first', 'practice']);
  });

  it('lets a replay raise stars and only pays coins for the new stars', () => {
    const n = questionCount(T1);
    // One half-credit answer keeps mastery between the 2- and 3-star marks.
    const credits = Array.from({ length: n }, (_, i) => (i === 0 ? 0.5 : 1));
    const first = playTopic(learnerState(), T1, { credits });
    expect(first.topics[T1]?.stars).toBe(2);
    const improved = playTopic(first, T1, { runId: 'b' });
    expect(improved.topics[T1]?.stars).toBe(3);
    expect(sumCoins(improved) - sumCoins(first)).toBe(REWARD_RULES.coins.perStar);
  });

  it('never lowers best mastery or stars on a weaker replay', () => {
    const perfect = playTopic(learnerState(), T1);
    const weak = playTopic(perfect, T1, { credits: 0, runId: 'b' });
    expect(weak.topics[T1]).toMatchObject({ stars: 3, bestMastery: 1, status: 'completed' });
  });
});

describe('unlock rules', () => {
  it('ignores progress on locked topics and lessons', () => {
    const s = learnerState();
    expect(progressReducer(s, { type: 'complete-watch', topicId: T2, watched: true, now: NOW })).toBe(s);
    // Exploring Forces waits for Friction (both Class 8 physics).
    expect(progressReducer(s, { type: 'complete-watch', topicId: getLesson('s8-forces')!.topicIds[0], watched: true, now: NOW })).toBe(s);
  });

  it('requires the pass mark on the previous topic before unlocking the next', () => {
    const weak = playTopic(learnerState(), T1, { credits: 0 });
    expect(weak.topics[T1]).toMatchObject({ status: 'completed', stars: 1, bestMastery: 0 });
    expect(progressReducer(weak, { type: 'complete-watch', topicId: T2, watched: true, now: NOW })).toBe(weak);
    const strong = playTopic(weak, T1, { runId: 'b' });
    expect(progressReducer(strong, { type: 'complete-watch', topicId: T2, watched: true, now: NOW }).topics[T2]?.completedSteps).toEqual(['watch']);
  });

  it('cannot skip steps', () => {
    const s = learnerState();
    expect(progressReducer(s, { type: 'game-result', topicId: T1, result: gameResult('push-box', 1), id: 'g', now: NOW })).toBe(s);
    const watched = apply(s, { type: 'complete-watch', topicId: T1, watched: true, now: NOW });
    expect(progressReducer(watched, { type: 'quiz-result', topicId: T1, result: quizResultFor(T1), id: 'q', now: NOW })).toBe(watched);
    expect(progressReducer(watched, { type: 'open-step', topicId: T1, step: 'practice', now: NOW })).toBe(watched);
  });

  it('only finishes Practice when every question is answered', () => {
    const played = apply(
      learnerState(),
      { type: 'complete-watch', topicId: T1, watched: true, now: NOW },
      { type: 'game-result', topicId: T1, result: gameResult('push-box', 1), id: 'g', now: NOW },
    );
    const full = quizResultFor(T1);
    const partial = { ...full, answers: full.answers.slice(1) };
    expect(progressReducer(played, { type: 'quiz-result', topicId: T1, result: partial, id: 'q', now: NOW })).toBe(played);
    const duplicated = { ...full, answers: [...full.answers.slice(1), full.answers[1]] };
    expect(progressReducer(played, { type: 'quiz-result', topicId: T1, result: duplicated, id: 'q', now: NOW })).toBe(played);
  });

  it('ignores games reported with the wrong type or an unknown surface', () => {
    const s = apply(playTopic(learnerState(), T1), { type: 'complete-watch', topicId: T2, watched: true, now: NOW });
    expect(progressReducer(s, { type: 'game-result', topicId: T2, result: gameResult('sort', 1), id: 'x', now: NOW })).toBe(s);
    expect(progressReducer(s, { type: 'experiment-run', topicId: T2, surfaceId: 'lava', predictionCorrect: true, id: 'x', now: NOW })).toBe(s);
  });

  it('an incomplete game result is recorded but does not finish Play', () => {
    const s = apply(learnerState(), { type: 'complete-watch', topicId: T1, watched: true, now: NOW });
    const after = progressReducer(s, { type: 'game-result', topicId: T1, result: { ...gameResult('push-box', 0.5), completed: false }, id: 'g', now: NOW });
    expect(after.gameAttempts).toHaveLength(1);
    expect(after.topics[T1]?.completedSteps).toEqual(['watch']);
  });
});

describe('lesson completion', () => {
  it('completes the lesson once every topic is mastered, pays once and unlocks the next lesson', () => {
    const before = playTopic(playTopic(playTopic(learnerState(), T1), T2), T3);
    expect(before.ledger.some((e) => e.key === `lesson:${FRICTION_LESSON}:complete`)).toBe(false);
    const all = playLesson(learnerState(), FRICTION_LESSON);
    const lessonEntries = all.ledger.filter((e) => e.key === `lesson:${FRICTION_LESSON}:complete`);
    expect(lessonEntries).toHaveLength(1);
    expect(lessonEntries[0]).toMatchObject({ xp: REWARD_RULES.xp.lessonComplete, coins: REWARD_RULES.coins.lessonComplete });
    expect(all.activity.some((a) => a.kind === 'lesson' && a.lessonId === FRICTION_LESSON)).toBe(true);
    expect(all.achievements['lesson-complete']).toBeDefined();
    const magnets = progressReducer(all, { type: 'complete-watch', topicId: 'magnets-what-they-attract', watched: true, now: NOW });
    expect(magnets.topics['magnets-what-they-attract']?.completedSteps).toEqual(['watch']);
    const replayed = playLesson(all, FRICTION_LESSON);
    expect(replayed.ledger.filter((e) => e.key === `lesson:${FRICTION_LESSON}:complete`)).toHaveLength(1);
  });
});

describe('coins and purchases', () => {
  it('does not allow a purchase that would make the balance negative', () => {
    const s = learnerState();
    expect(coinBalance(s)).toBe(0);
    expect(progressReducer(s, { type: 'purchase-avatar', avatarId: 'robot', now: NOW })).toBe(s);
  });

  it('spends coins once, equips the avatar and keeps the balance consistent', () => {
    const rich = playLesson(learnerState(), FRICTION_LESSON);
    const balance = coinBalance(rich);
    expect(balance).toBeGreaterThanOrEqual(30);
    const bought = progressReducer(rich, { type: 'purchase-avatar', avatarId: 'cat', now: NOW });
    expect(coinBalance(bought)).toBe(balance - 30);
    expect(bought.ownedAvatars).toContain('cat');
    expect(bought.learner?.avatarId).toBe('cat');
    expect(progressReducer(bought, { type: 'purchase-avatar', avatarId: 'cat', now: NOW })).toBe(bought);
  });

  it('cannot equip an avatar that is not owned', () => {
    const s = learnerState();
    expect(progressReducer(s, { type: 'update-learner', changes: { avatarId: 'dino' }, now: NOW })).toBe(s);
  });

  it('switches between Rishi and Ayra without touching progress, and ignores unknown mentors', () => {
    const s = playLesson(learnerState({ mentor: 'rishi' }), FRICTION_LESSON);
    const switched = progressReducer(s, { type: 'update-learner', changes: { mentorId: 'ayra' }, now: NOW });
    expect(switched.learner?.mentorId).toBe('ayra');
    expect(switched.topics).toBe(s.topics);
    expect(switched.ledger).toBe(s.ledger);
    expect(totalXp(switched)).toBe(totalXp(s));
    expect(progressReducer(s, { type: 'update-learner', changes: { mentorId: 'lumi' as never }, now: NOW }).learner?.mentorId).toBe('rishi');
  });
});

describe('settings', () => {
  it('accepts supported mentor languages only', () => {
    const s = learnerState();
    expect(progressReducer(s, { type: 'update-settings', changes: { mentorLanguage: 'kn' } }).settings.mentorLanguage).toBe('kn');
    expect(progressReducer(s, { type: 'update-settings', changes: { mentorLanguage: 'fr' as never } }).settings.mentorLanguage).toBe('en');
  });
});

describe('mentor, missions and streaks', () => {
  it('awards the first-question bonus only once but counts every question', () => {
    const s = apply(learnerState(), { type: 'mentor-question', now: NOW }, { type: 'mentor-question', now: NOW });
    expect(s.stats.mentorQuestions).toBe(2);
    expect(s.ledger.filter((e) => e.key === 'mentor:first-question')).toHaveLength(1);
    expect(s.achievements['curious-mind']).toBeDefined();
  });

  it('only lets a daily mission be claimed when complete, and only once', () => {
    const s = learnerState();
    expect(progressReducer(s, { type: 'claim-mission', now: NOW })).toBe(s);
    const busy = apply(playLesson(s, FRICTION_LESSON), { type: 'mentor-question', now: NOW });
    const claimed = progressReducer(busy, { type: 'claim-mission', now: NOW });
    expect(claimed.ledger.filter((e) => e.key.startsWith('mission:'))).toHaveLength(1);
    expect(progressReducer(claimed, { type: 'claim-mission', now: NOW })).toBe(claimed);
  });

  it('tracks active days for streaks', () => {
    const day1 = playTopic(learnerState(), T1, { now: '2026-10-18T09:00:00' });
    const day2 = apply(day1, { type: 'mentor-question', now: '2026-10-19T09:00:00' });
    const day3 = apply(day2, { type: 'mentor-question', now: '2026-10-20T09:00:00' });
    expect(day3.activeDays).toEqual(['2026-10-18', '2026-10-19', '2026-10-20']);
    expect(day3.achievements['on-a-roll']).toBeDefined();
  });
});
