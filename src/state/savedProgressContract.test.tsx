import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import baselineJson from './__fixtures__/progress-v2-baseline.json?raw';
import { LocalProgressRepository, STORAGE_KEY } from './persistence';
import { PROGRESS_SCHEMA_VERSION, type ProgressState } from './progressTypes';

/**
 * Saved progress lives in each learner's browser, so the app must keep reading
 * what earlier versions wrote. The fixture is a save written by the 22 Oct 2026
 * baseline (commit 69dfba5): a finished lesson, a topic below the pass mark,
 * a topic just opened, quiz and game attempts, achievements and changed
 * settings. If one of these tests fails, the change needs a migration in
 * state/persistence.ts, not an edit to the fixture.
 */

// Read as text, so the type checker does not infer a type for every field of the save.
const saved = JSON.parse(baselineJson) as { schemaVersion: number; savedAt: string; state: ProgressState };

function storageWith(value: string): Storage {
  const data = new Map<string, string>([[STORAGE_KEY, value]]);
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

describe('saved progress from earlier versions', () => {
  it('keeps the storage key and schema version that existing saves use', () => {
    expect(STORAGE_KEY).toBe('laarish-academics:progress');
    expect(PROGRESS_SCHEMA_VERSION).toBe(saved.schemaVersion);
  });

  it('loads a baseline save exactly as it was written', async () => {
    const repository = new LocalProgressRepository(storageWith(JSON.stringify(saved)));
    const result = await repository.load();
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') expect(result.state).toEqual(saved.state);
  });

  it('saves it back without losing or changing anything', async () => {
    const storage = storageWith(JSON.stringify(saved));
    const repository = new LocalProgressRepository(storage);
    const result = await repository.load();
    if (result.status !== 'loaded') throw new Error('expected the baseline save to load');
    await repository.save(result.state);
    const written = JSON.parse(storage.getItem(STORAGE_KEY)!) as typeof saved;
    expect(written.schemaVersion).toBe(saved.schemaVersion);
    expect(written.state).toEqual(saved.state);
  });

  it('opens the app with that learner and their finished lesson', async () => {
    render(
      <MemoryRouter initialEntries={['/subjects/science/friction']}>
        <App repository={new LocalProgressRepository(storageWith(JSON.stringify(saved)))} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: /friction/i })).toBeInTheDocument();
    // Every friction topic was mastered in the save, so each offers a replay rather than a start.
    expect(screen.getAllByRole('link', { name: /^replay /i }).length).toBe(Object.keys(saved.state.topics).filter((id) => id.startsWith('friction')).length);
  });
});
