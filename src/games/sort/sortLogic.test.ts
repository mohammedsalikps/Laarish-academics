import { describe, expect, it } from 'vitest';
import type { SortGameConfig } from '../../domain/types';
import { createSortReducer, createSortState, currentItem, sortResult } from './sortLogic';

const config: SortGameConfig = {
  type: 'sort',
  prompt: 'Sort',
  bins: [
    { id: 'magnetic', label: 'Magnetic', description: '', icon: 'magnet' },
    { id: 'not', label: 'Not magnetic', description: '', icon: 'hand' },
  ],
  items: [
    { id: 'nail', label: 'Nail', binId: 'magnetic', explanation: '' },
    { id: 'ruler', label: 'Ruler', binId: 'not', explanation: '' },
  ],
};
const reduce = createSortReducer(config);

describe('sort logic', () => {
  it('requires an item to be selected before placing', () => {
    const s = createSortState(config, 1);
    expect(reduce(s, { type: 'place', binId: 'magnetic' })).toBe(s);
  });

  it('places correct items and rejects wrong bins', () => {
    let s = createSortState(config, 1);
    s = reduce(s, { type: 'select-item', id: 'ruler' });
    s = reduce(s, { type: 'place', binId: 'magnetic' });
    expect(s.placed).toEqual({});
    expect(s.mistakesByItem).toEqual({ ruler: 1 });
    expect(s.feedback).toEqual({ kind: 'incorrect', itemId: 'ruler', binId: 'magnetic' });
    s = reduce(s, { type: 'select-item', id: 'ruler' });
    s = reduce(s, { type: 'place', binId: 'not' });
    expect(s.placed).toEqual({ ruler: 'not' });
    // Placed items cannot be selected again.
    expect(reduce(s, { type: 'select-item', id: 'ruler' })).toBe(s);
  });

  it('toggles the picked item off when it is tapped again', () => {
    let s = reduce(createSortState(config, 1), { type: 'select-item', id: 'nail' });
    expect(s.selectedItem).toBe('nail');
    s = reduce(s, { type: 'select-item', id: 'nail' });
    expect(s.selectedItem).toBeNull();
  });

  it('checks a dropped item directly (drag, or a tap on a box) and clears any pick', () => {
    let s = reduce(createSortState(config, 1), { type: 'select-item', id: 'ruler' });
    s = reduce(s, { type: 'drop', itemId: 'nail', binId: 'not' });
    expect(s).toMatchObject({ mistakes: 1, mistakesByItem: { nail: 1 }, selectedItem: null, placed: {} });
    expect(s.feedback).toEqual({ kind: 'incorrect', itemId: 'nail', binId: 'not' });
    s = reduce(s, { type: 'drop', itemId: 'nail', binId: 'magnetic' });
    expect(s.placed).toEqual({ nail: 'magnetic' });
    expect(s.feedback?.kind).toBe('correct');
  });

  it('ignores drops of placed or unknown items, and on unknown bins', () => {
    const s = reduce(createSortState(config, 1), { type: 'drop', itemId: 'nail', binId: 'magnetic' });
    expect(reduce(s, { type: 'drop', itemId: 'nail', binId: 'not' })).toBe(s);
    expect(reduce(s, { type: 'drop', itemId: 'nope', binId: 'not' })).toBe(s);
    expect(reduce(s, { type: 'drop', itemId: 'ruler', binId: 'nope' })).toBe(s);
  });

  it('serves one item at a time, in play order, and keeps it after a wrong try', () => {
    let s = createSortState(config, 1);
    const [first, second] = s.order;
    expect(currentItem(s)).toBe(first);
    const wrongBin = config.items.find((i) => i.id === first)!.binId === 'magnetic' ? 'not' : 'magnetic';
    s = reduce(s, { type: 'drop', itemId: first, binId: wrongBin });
    expect(currentItem(s)).toBe(first);
    s = reduce(s, { type: 'drop', itemId: first, binId: config.items.find((i) => i.id === first)!.binId });
    expect(currentItem(s)).toBe(second);
    s = reduce(s, { type: 'drop', itemId: second, binId: config.items.find((i) => i.id === second)!.binId });
    expect(currentItem(s)).toBeNull();
    expect(s.phase).toBe('complete');
  });

  it('completes and scores', () => {
    let s = createSortState(config, 1);
    for (const [id, bin] of [
      ['nail', 'not'],
      ['nail', 'magnetic'],
      ['ruler', 'not'],
    ]) {
      s = reduce(s, { type: 'select-item', id });
      s = reduce(s, { type: 'place', binId: bin });
    }
    expect(s.phase).toBe('complete');
    expect(sortResult(config, s)).toMatchObject({ completed: true, perfect: false, correct: 1, total: 2, score: 0.5 });
    // Nothing changes once everything is sorted.
    expect(reduce(s, { type: 'drop', itemId: 'nail', binId: 'not' })).toBe(s);
  });

  it('reports a perfect game, and is not complete part way through', () => {
    let s = reduce(createSortState(config, 2), { type: 'drop', itemId: 'nail', binId: 'magnetic' });
    expect(sortResult(config, s)).toMatchObject({ completed: false, perfect: false });
    s = reduce(s, { type: 'drop', itemId: 'ruler', binId: 'not' });
    expect(sortResult(config, s)).toMatchObject({ completed: true, perfect: true, score: 1, mistakes: 0 });
  });
});
