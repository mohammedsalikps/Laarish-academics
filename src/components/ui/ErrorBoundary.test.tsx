import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError } from '../../lib/errors';
import { ErrorBoundary } from './ErrorBoundary';
import { AppCrashScreen } from './ErrorFallbacks';

const reload = vi.hoisted(() => vi.fn());
vi.mock('../../lib/errors', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/errors')>()), reloadPage: reload }));

const boom = { on: true };
function Fragile({ label }: { label: string }) {
  if (boom.on) throw new Error('boom');
  return <p>{label}</p>;
}

beforeEach(() => {
  boom.on = true;
  reload.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('isChunkLoadError', () => {
  it('recognises failed downloads of the app code in the main browsers', () => {
    for (const message of [
      'Failed to fetch dynamically imported module: https://laarish.example/assets/PushBox-abc.js', // Chrome, Edge
      'error loading dynamically imported module: https://laarish.example/assets/PushBox-abc.js', // Firefox
      'Importing a module script failed.', // Safari
      'Unable to preload CSS for /assets/index.css', // Vite
    ]) {
      expect(isChunkLoadError(new TypeError(message)), message).toBe(true);
    }
    const named = new Error('Loading chunk 7 failed.');
    named.name = 'ChunkLoadError';
    expect(isChunkLoadError(named)).toBe(true);
  });

  it('does not treat ordinary bugs as download problems', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isChunkLoadError('something odd')).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('ErrorBoundary', () => {
  it('shows the fallback, tells it whether the code failed to download, and can try again', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary fallback={({ reset, chunkError }) => <button onClick={reset}>{chunkError ? 'reload' : 'retry'}</button>}>
        <Fragile label="working" />
      </ErrorBoundary>,
    );
    boom.on = false;
    await user.click(screen.getByRole('button', { name: 'retry' }));
    expect(screen.getByText('working')).toBeInTheDocument();
  });

  it('clears the error by itself when a reset key changes', () => {
    const view = render(
      <ErrorBoundary resetKeys={['/a']} fallback={() => <p>fallback</p>}>
        <Fragile label="page b" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
    boom.on = false;
    view.rerender(
      <ErrorBoundary resetKeys={['/a']} fallback={() => <p>fallback</p>}>
        <Fragile label="page b" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
    view.rerender(
      <ErrorBoundary resetKeys={['/b']} fallback={() => <p>fallback</p>}>
        <Fragile label="page b" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('page b')).toBeInTheDocument();
  });
});

describe('AppCrashScreen', () => {
  it('works without the router or saved-progress providers and offers a reload and a way home', async () => {
    render(<AppCrashScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Laarish Academics needs a restart' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Progress saved on this device is kept.');
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/home');
    await userEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
