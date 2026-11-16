import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../shared/curriculum';
import type { GameConfig } from '../domain/types';
import type { HintContext } from './framework';
import {
  areaHints,
  balanceHints,
  barChartHints,
  circuitHints,
  clockHints,
  fractionHints,
  frictionHints,
  gridHints,
  magnetHints,
  matchHints,
  numberLineHints,
  pushBoxHints,
  sortHints,
  wordOrderHints,
} from './hints';

/** Every question a game can show, with the text that would give its answer away. */
function questionsOf(game: GameConfig): { context: HintContext | null; answers: string[] }[] {
  switch (game.type) {
    case 'area-grid':
      return game.rounds.map((r) => ({ context: areaHints(r), answers: [r.explanation] }));
    case 'balance':
      return game.rounds.map((r) => ({ context: balanceHints(r), answers: [r.explanation] }));
    case 'bar-chart':
      return game.rounds.map((r) => ({ context: barChartHints(r), answers: [r.explanation] }));
    case 'circuit':
      return game.rounds.map((r) => ({ context: circuitHints(r), answers: [r.explanation] }));
    case 'clock':
      return game.rounds.map((r) => ({ context: clockHints(r), answers: [r.explanation] }));
    case 'fraction-builder':
      return game.rounds.map((r) => ({ context: fractionHints(r), answers: [r.explanation] }));
    case 'grid-explorer':
      return game.tasks.map((t) => ({ context: gridHints(t), answers: [] }));
    case 'magnet-lab':
      return game.rounds.map((r) => ({ context: magnetHints(r), answers: [r.explanation] }));
    case 'number-line':
      return game.rounds.map((r) => ({ context: numberLineHints(r), answers: [r.explanation] }));
    case 'word-order':
      return game.rounds.map((r) => ({ context: wordOrderHints(r), answers: [r.explanation, r.words.join(' ')] }));
    case 'friction-experiment':
      return [
        { context: frictionHints(game, { check: false }), answers: [] },
        ...(game.challenges ?? []).map((c) => ({ context: frictionHints(game, { challenge: c, check: false }), answers: [c.explanation] })),
        ...(game.check ? [{ context: frictionHints(game, { check: true }), answers: [game.check.explanation] }] : []),
      ];
    case 'concept-match':
      return [null, ...game.pairs.map((p) => p.id)].map((id) => ({ context: matchHints(game, id, []), answers: [] }));
    case 'sort':
      return game.items.map((i) => ({ context: sortHints(game, i.id), answers: [i.explanation] }));
    case 'push-box':
      return [null, ...game.floors.map((f) => f.id)].map((id) => ({ context: pushBoxHints(game, id), answers: game.floors.map((f) => f.explanation) }));
  }
}

const games = TOPICS.map((t) => [t.id, t.play.game] as const);

describe('"Need a hint?" in Play, for every game in the curriculum', () => {
  it('covers all 14 game types', () => {
    expect(new Set(games.map(([, g]) => g.type)).size).toBe(14);
  });

  it.each(games)('%s: every question has at least two hints, from a nudge to the round hint, and none gives the answer', (_, game) => {
    for (const { context, answers } of questionsOf(game)) {
      expect(context).not.toBeNull();
      const { key, question, steps } = context!;
      expect(key).toBeTruthy();
      expect(question.trim()).not.toBe('');
      expect(steps.length).toBeGreaterThanOrEqual(2);
      expect(new Set(steps).size).toBe(steps.length);
      for (const step of steps) {
        expect(step.trim().length).toBeGreaterThan(3);
        for (const answer of answers) expect(step).not.toBe(answer);
      }
    }
  });

  it('never totals a side when "?" stands alone on the other side (that total is the answer)', () => {
    for (const [, game] of games) {
      if (game.type !== 'balance') continue;
      for (const round of game.rounds) {
        const alone = [round.left, round.right].some((terms) => terms.length === 1 && terms[0] === 'unknown');
        if (!alone) continue;
        expect(balanceHints(round).steps[0]).not.toMatch(new RegExp(`\\b${round.answer}\\b`));
      }
    }
  });

  it('starts again from the first hint when the question changes', () => {
    const match = games.find(([, g]) => g.type === 'concept-match')![1];
    if (match.type !== 'concept-match') throw new Error('expected a matching game');
    const [a, b] = match.pairs;
    expect(matchHints(match, a.id, [])!.key).not.toBe(matchHints(match, b.id, [])!.key);
    expect(matchHints(match, null, match.pairs.map((p) => p.id))).toBeNull(); // all matched: nothing to help with
  });
});
