import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { MemoryProgressRepository } from '../../state/persistence';
import { FRICTION_TOPICS, learnerState } from '../../test/fixtures';
import manifest from '../../../public/media/manifest.json?raw';

/**
 * The Watch step with a registered official video: the real manifest from
 * public/media is served to the app, and the player is driven through its
 * media events (jsdom cannot decode video, so playback time is simulated).
 */

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/media/manifest.json')) return new Response(manifest, { status: 200, headers: { 'content-type': 'application/json' } });
      throw new TypeError('offline');
    }),
  );
});

function renderWatch() {
  render(
    <MemoryRouter initialEntries={[`/subjects/science/friction/${FRICTION_TOPICS[0]}?step=watch`]}>
      <App repository={new MemoryProgressRepository(learnerState())} />
    </MemoryRouter>,
  );
}

async function findVideo() {
  await screen.findByText(/laarish lesson video/i);
  const video = document.querySelector('video');
  if (!video) throw new Error('no video element');
  return video;
}

function playTo(video: HTMLVideoElement, seconds: number) {
  Object.defineProperty(video, 'duration', { configurable: true, value: 62 });
  Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: seconds });
  fireEvent.loadedMetadata(video);
  fireEvent.timeUpdate(video);
}

describe('Watch step with the official Friction video', () => {
  it('plays the registered MP4 with its poster instead of the temporary explainer', async () => {
    renderWatch();
    const video = await findVideo();
    expect(video.getAttribute('src')).toBe('/media/videos/friction-what-is.mp4');
    expect(video.getAttribute('poster')).toBe('/media/posters/friction-what-is.jpg');
    expect(video.querySelector('track')?.getAttribute('src')).toBe('/media/captions/friction-what-is.en.vtt');
    expect(screen.getByText(/captions and read-aloud narration/i)).toBeInTheDocument();
    expect(screen.queryByText(/temporary animated explainer/i)).not.toBeInTheDocument();
  });

  it('shows the narration for the current moment in the caption bar', async () => {
    renderWatch();
    const video = await findVideo();
    playTo(video, 9);
    expect(await screen.findByText('Give a box a push, then let go.')).toBeInTheDocument();
    playTo(video, 36);
    expect(await screen.findByText('Friction always pushes against the way things move.')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /hide captions/i }));
    expect(screen.queryByText('Friction always pushes against the way things move.')).not.toBeInTheDocument();
  });

  it('offers the full transcript from the video script', async () => {
    const user = userEvent.setup();
    renderWatch();
    await findVideo();
    await user.click(screen.getByRole('button', { name: /key ideas and transcript/i }));
    expect(screen.getByText('Have you ever pushed a box and watched it stop all by itself?')).toBeInTheDocument();
    expect(screen.getByText('Your turn! Where would a box slide farther: on ice or on carpet?')).toBeInTheDocument();
  });

  it('falls back to the labelled explainer when the video cannot be played', async () => {
    const user = userEvent.setup();
    renderWatch();
    const video = await findVideo();
    fireEvent.error(video);
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't be played/i);
    await user.click(screen.getByRole('button', { name: /watch the animated explainer/i }));
    expect(await screen.findByText(/the video could not be played, so you are watching the temporary animated explainer/i)).toBeInTheDocument();
  });
});
