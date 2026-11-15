import { describe, expect, it } from 'vitest';
import { getLesson } from '../../content';
import { DEFAULT_PREFS } from '../../state/academicsPrefs';
import { learnerState, playTopic } from '../../test/fixtures';
import { WORLDS } from '../../world3d/worlds';
import { allClassWorlds, chapterLabel, chapterPath, classWorld, textbookOrder } from './worldData';

const prefs = (over = {}) => ({ ...DEFAULT_PREFS, ...over });

describe('worlds from real data', () => {
  it('has the six worlds in syllabus order, each with its tint', () => {
    const worlds = allClassWorlds(learnerState({ grade: 6 }), prefs());
    expect(worlds.map((w) => w.theme.name)).toEqual(['Discovery Valley', 'Number Kingdom', 'Story Forest', 'Akshar Garden', 'Akshara Hills', "Explorer's Atlas"]);
    expect(WORLDS.map((w) => w.tint)).toEqual(['#35BFC7', '#18325A', '#6DBE72', '#FDF0C8', '#F28A3D', '#C9641B']);
    for (const w of worlds) expect(w.mastery).toBe(0);
  });

  it("lists a class's chapters in textbook order, with honest coming-soon states", () => {
    const science = classWorld(learnerState({ grade: 6 }), 'science', prefs())!;
    const titles = science.chapters.map((c) => c.lesson.title);
    expect(titles).toContain('Magnets');
    const orders = science.chapters.map((c) => textbookOrder(c.lesson));
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    // Magnets is Curiosity chapter 4.
    expect(textbookOrder(getLesson('magnets')!)).toBe(4);
    for (const c of science.chapters) expect(c.state === 'coming-soon').toBe(c.lesson.status !== 'ready' || c.view.topicsTotal === 0);
  });

  it("marks this week's chapter and works out mastery from the best scores", () => {
    const state = playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract', {});
    const science = classWorld(state, 'science', prefs({ schoolChapters: { science: 'magnets' } }))!;
    const magnets = science.chapters.find((c) => c.lesson.id === 'magnets')!;
    expect(magnets.thisWeek).toBe(true);
    expect(science.thisWeek?.lesson.id).toBe('magnets');
    expect(magnets.state).toBe('in-progress');
    expect(magnets.mastery).toBeGreaterThan(0.4);
    expect(chapterLabel(magnets)).toMatch(/^Magnets, in progress, \d+ percent, this week$/);
    expect(science.mastery).toBeGreaterThan(0);
  });

  it('puts the chapter path at the first unfinished topic, with the next one locked until 60%', () => {
    const fresh = chapterPath(learnerState({ grade: 6 }), getLesson('magnets')!, prefs())!;
    expect(fresh.topics.map((t) => t.topic.id)).toEqual(['magnets-what-they-attract', 'magnets-poles']);
    expect(fresh.current?.topic.id).toBe('magnets-what-they-attract');
    expect(fresh.topics[1].state).toBe('locked');

    const below = chapterPath(playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract', { credits: 0, playScore: 0.3 }), getLesson('magnets')!, prefs())!;
    expect(below.topics[0].needsPractice).toBe(true);
    expect(below.topics[1].state).toBe('locked');

    const passed = chapterPath(playTopic(learnerState({ grade: 6 }), 'magnets-what-they-attract'), getLesson('magnets')!, prefs())!;
    expect(passed.topics[1].state).toBe('available');
    expect(passed.current?.topic.id).toBe('magnets-poles');
    expect(passed.mastered).toBe(1);
  });
});
