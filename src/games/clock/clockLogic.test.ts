import { describe, expect, it } from 'vitest';
import type { ClockConfig } from '../../domain/types';
import {
  angleToMinute,
  clockNudge,
  clockResult,
  clockTime,
  createClockReducer,
  followFinger,
  formatTime,
  handTurns,
  hourHandAngle,
  initialClockState,
  minuteHandAngle,
  minuteToAngle,
  pointAngle,
  roundHint,
  roundOutcomes,
  snapTime,
  startTime,
  timeWords,
  toTime,
  wrapTime,
  type ClockAction,
  type ClockRound,
  type ClockState,
  type MinuteStep,
} from './clockLogic';

const config: ClockConfig = {
  type: 'clock',
  minuteStep: 15,
  rounds: [
    { id: 'three', hour: 3, minute: 0, prompt: "Show 3 o'clock.", hint: "At 3 o'clock the long hand points at 12.", explanation: "The long hand is on 12 and the short hand is on 3: 3 o'clock." },
    { id: 'half-three', hour: 3, minute: 30, prompt: 'Show half past 3.', hint: 'Half past means the long hand has gone halfway round, to 6.', explanation: 'Half past 3: the long hand is on 6, the short hand halfway between 3 and 4.' },
    { id: 'quarter-to-nine', hour: 8, minute: 45, prompt: 'Show quarter to 9.', hint: 'Quarter to 9 is 15 minutes before 9 o’clock.', explanation: 'Quarter to 9: the long hand is on 9, the short hand nearly at 9.' },
  ],
};
const [three, halfThree, quarterToNine] = config.rounds;
const reduce = createClockReducer(config);
const run = (state: ClockState, ...actions: ClockAction[]) => actions.reduce(reduce, state);
const show = (hour: number, minute: number): ClockAction => ({ type: 'set', time: toTime(hour, minute) });
const solve = (state: ClockState, r: ClockRound) => run(state, show(r.hour, r.minute), { type: 'check' }, { type: 'next' });

describe('angles and minutes', () => {
  it('measures angles clockwise from 12 o’clock', () => {
    expect(pointAngle(0, -10)).toBe(0);
    expect(pointAngle(10, 0)).toBe(90);
    expect(pointAngle(0, 10)).toBe(180);
    expect(pointAngle(-10, 0)).toBe(270);
    expect(pointAngle(10, -10)).toBeCloseTo(45);
  });

  it('snaps an angle to the nearest minute step', () => {
    // 5-minute steps: every number on the face.
    expect(angleToMinute(90, 5)).toBe(15);
    expect(angleToMinute(104, 5)).toBe(15);
    expect(angleToMinute(105, 5)).toBe(20);
    expect(angleToMinute(357, 5)).toBe(0);
    // Quarter hours.
    expect(angleToMinute(100, 15)).toBe(15);
    expect(angleToMinute(140, 15)).toBe(30);
    expect(angleToMinute(350, 15)).toBe(0);
    // Half hours.
    expect(angleToMinute(80, 30)).toBe(0);
    expect(angleToMinute(100, 30)).toBe(30);
    expect(angleToMinute(260, 30)).toBe(30);
    // O'clock only: the minute hand always points at 12.
    for (const angle of [0, 90, 200, 359]) expect(angleToMinute(angle, 60)).toBe(0);
  });

  it('turns minutes into minute-hand angles and back for every step', () => {
    expect([0, 15, 30, 45, 60].map(minuteToAngle)).toEqual([0, 90, 180, 270, 0]);
    for (const step of [5, 15, 30, 60] as MinuteStep[]) {
      for (let m = 0; m < 60; m += step) expect(angleToMinute(minuteToAngle(m), step)).toBe(m);
    }
  });

  it('moves the hour hand with the minutes', () => {
    expect(hourHandAngle(toTime(3, 0))).toBe(90);
    expect(hourHandAngle(toTime(3, 30))).toBe(105);
    expect(hourHandAngle(toTime(12, 0))).toBe(0);
    expect(hourHandAngle(toTime(12, 30))).toBe(15);
    expect(hourHandAngle(toTime(9, 45))).toBe(292.5);
    expect(minuteHandAngle(toTime(3, 30))).toBe(180);
    expect(minuteHandAngle(toTime(8, 45))).toBe(270);
    // Drawing angles keep turning past 12, so the hands never spin backwards.
    expect(handTurns(720 + 30)).toEqual({ minute: 4500, hour: 375 });
  });
});

describe('time on a 12-hour clock', () => {
  it('reads minutes since 12:00 as an hour and minute, wrapping past 12', () => {
    expect(clockTime(0)).toEqual({ hour: 12, minute: 0 });
    expect(clockTime(toTime(3, 30))).toEqual({ hour: 3, minute: 30 });
    expect(clockTime(720)).toEqual({ hour: 12, minute: 0 });
    expect(clockTime(-15)).toEqual({ hour: 11, minute: 45 });
    expect(clockTime(780 + 5)).toEqual({ hour: 1, minute: 5 });
    expect(wrapTime(-15)).toBe(705);
    expect(toTime(12, 15)).toBe(15);
    expect(snapTime(-0.2, 5)).toBe(0);
    expect(snapTime(37, 15)).toBe(30);
  });

  it('writes the time as digits and, for quarter hours, in words', () => {
    expect(formatTime(toTime(3, 30))).toBe('3:30');
    expect(formatTime(toTime(12, 5))).toBe('12:05');
    expect(formatTime(60)).toBe('1:00');
    expect(timeWords(toTime(3, 0))).toBe("3 o'clock");
    expect(timeWords(toTime(3, 15))).toBe('quarter past 3');
    expect(timeWords(toTime(3, 30))).toBe('half past 3');
    expect(timeWords(toTime(3, 45))).toBe('quarter to 4');
    expect(timeWords(toTime(12, 45))).toBe('quarter to 1');
    expect(timeWords(toTime(3, 5))).toBeNull();
  });

  it('follows a finger round the face, moving the hour on or back when the minute hand passes 12', () => {
    expect(followFinger(0, 90)).toBe(15);
    expect(followFinger(0, 180)).toBe(30); // straight opposite: forwards
    expect(followFinger(0, 270)).toBe(-15); // the short way back: 11:45
    expect(formatTime(followFinger(0, 270))).toBe('11:45');
    expect(formatTime(followFinger(toTime(3, 55), 30))).toBe('4:05');
    expect(formatTime(followFinger(toTime(4, 5), 330))).toBe('3:55');
    // A whole turn clockwise is one hour.
    const turn = [90, 180, 270, 0].reduce(followFinger, 0);
    expect(turn).toBe(60);
  });

  it('never starts a round on its answer', () => {
    expect(startTime(three)).toBe(0);
    expect(startTime({ ...three, hour: 12, minute: 0 })).toBe(360);
  });
});

describe('hints', () => {
  it('nudges from the numbers: the long hand first, then the short hand', () => {
    expect(clockNudge(three, toTime(5, 0))).toBe('The long hand is right, but the short hand should point at 3.');
    expect(clockNudge(halfThree, toTime(3, 0))).toBe('Look at the long hand: it should point at 6 for half past.');
    expect(clockNudge(halfThree, toTime(5, 30))).toBe('The long hand is right, but the short hand should be halfway between 3 and 4.');
    expect(clockNudge(quarterToNine, toTime(8, 15))).toBe('Look at the long hand: it should point at 9 for quarter to.');
    expect(clockNudge(quarterToNine, toTime(9, 45))).toBe('The long hand is right, but the short hand should be between 8 and 9.');
    expect(clockNudge({ ...three, hour: 4, minute: 20 }, toTime(4, 25))).toBe('Look at the long hand: it should point at 4 for 20 minutes past.');
    expect(clockNudge({ ...three, hour: 12, minute: 15 }, toTime(1, 15))).toBe('The long hand is right, but the short hand should be between 12 and 1.');
    expect(clockNudge(three, toTime(3, 0))).toBeNull();
  });

  it('gives the nudge after the first wrong check and the round hint after that', () => {
    expect(roundHint(three, toTime(5, 0), 0)).toBeNull();
    expect(roundHint(three, null, 1)).toBeNull();
    expect(roundHint(three, toTime(3, 0), 1)).toBeNull();
    expect(roundHint(three, toTime(5, 0), 1)).toEqual({ level: 1, text: 'The long hand is right, but the short hand should point at 3.' });
    expect(roundHint(three, toTime(5, 0), 2)).toEqual({ level: 2, text: three.hint });
    expect(roundHint(three, toTime(5, 0), 3)).toEqual({ level: 2, text: three.hint });
  });
});

describe('clock game flow', () => {
  const start = initialClockState(config);

  it('starts at 12:00 and needs a move before checking', () => {
    expect(start).toMatchObject({ round: 0, time: 0, started: false, phase: 'playing' });
    expect(run(start, { type: 'check' })).toBe(start);
    // Setting the same time is not a move.
    expect(run(start, { type: 'set', time: 2 })).toBe(start);
  });

  it('snaps every move to the minute step and wraps past 12', () => {
    expect(run(start, { type: 'set', time: 37 }).time).toBe(30);
    const back = run(start, { type: 'shift', minutes: -15 });
    expect(formatTime(back.time)).toBe('11:45');
    expect(formatTime(run(back, { type: 'shift', minutes: 15 }).time)).toBe('12:00');
    expect(formatTime(run(back, { type: 'shift', minutes: 60 }).time)).toBe('12:45');
  });

  it('counts a wrong check, waits for a move, then accepts the right time', () => {
    const wrong = run(start, show(5, 0), { type: 'check' });
    expect(wrong).toMatchObject({ phase: 'incorrect', mistakes: 1, lastWrong: toTime(5, 0), mistakesByRound: { three: 1 } });
    expect(run(wrong, { type: 'check' })).toBe(wrong);
    const right = run(wrong, show(3, 0), { type: 'check' });
    expect(right.phase).toBe('correct');
    // Twelve hours later is the same time on the clock.
    expect(run(start, { type: 'set', time: toTime(3, 0) + 720 }, { type: 'check' }).phase).toBe('correct');
    // The hands are locked once the clock is right.
    expect(run(right, { type: 'shift', minutes: 15 })).toBe(right);
    const next = run(right, { type: 'next' });
    expect(next).toMatchObject({ round: 1, time: 0, started: false, phase: 'playing', lastWrong: null });
  });

  it('completes with a perfect result when every clock is right first time', () => {
    const done = config.rounds.reduce(solve, start);
    expect(done.phase).toBe('complete');
    expect(run(done, { type: 'next' })).toBe(done);
    expect(clockResult(config, done)).toEqual({
      gameType: 'clock',
      score: 1,
      correct: 3,
      total: 3,
      mistakes: 0,
      completed: true,
      perfect: true,
      summary: 'Set 3 of 3 clocks with 0 wrong tries',
    });
  });

  it('scores first-try rounds only, and lists each round', () => {
    let s = run(start, show(5, 0), { type: 'check' }, show(4, 0), { type: 'check' });
    s = solve(s, three);
    s = solve(s, halfThree);
    s = solve(s, quarterToNine);
    const result = clockResult(config, s);
    expect(result).toMatchObject({ completed: true, perfect: false, mistakes: 2, correct: 2, total: 3, summary: 'Set 3 of 3 clocks with 2 wrong tries' });
    expect(result.score).toBeCloseTo(2 / 3);
    expect(roundOutcomes(config, s)).toEqual([
      { id: 'three', time: '3:00', words: "3 o'clock", firstTry: false, wrong: 2 },
      { id: 'half-three', time: '3:30', words: 'half past 3', firstTry: true, wrong: 0 },
      { id: 'quarter-to-nine', time: '8:45', words: 'quarter to 9', firstTry: true, wrong: 0 },
    ]);
  });

  it('reports an unfinished game as not completed', () => {
    const halfway = solve(start, three);
    expect(clockResult(config, halfway)).toMatchObject({ completed: false, perfect: false, correct: 0, score: 0, summary: 'Set 1 of 3 clocks with 0 wrong tries' });
    expect(run(halfway, { type: 'reset' })).toEqual(start);
  });
});
