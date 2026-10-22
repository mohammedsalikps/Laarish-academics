import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { MemoryProgressRepository } from '../state/persistence';
import type { ProgressState } from '../state/progressTypes';
import { learnerState } from '../test/fixtures';

/** The Voice section of Settings: which voices the device has, and the grown-up switch for voice answers. */

function renderSettings() {
  const repository = new MemoryProgressRepository(learnerState());
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <App repository={repository} />
    </MemoryRouter>,
  );
  return repository;
}
const voiceSwitch = () => screen.getByRole('switch', { name: /answer quiz questions by voice/i });

afterEach(() => {
  for (const key of ['speechSynthesis', 'SpeechSynthesisUtterance', 'webkitSpeechRecognition']) delete (window as unknown as Record<string, unknown>)[key];
  vi.unstubAllGlobals();
});

describe('Settings: voice', () => {
  it('lists the voices this device has for English, Hindi and Kannada', async () => {
    const voices = [
      { name: 'Test English (India)', lang: 'en-IN', voiceURI: 'en' },
      { name: 'Test Hindi', lang: 'hi-IN', voiceURI: 'hi' },
    ];
    Object.assign(window, { speechSynthesis: { getVoices: () => voices, addEventListener: vi.fn(), removeEventListener: vi.fn(), cancel: vi.fn(), speak: vi.fn() }, SpeechSynthesisUtterance: class {} });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    renderSettings();
    const list = await screen.findByRole('list', { name: 'Voices on this device' });
    expect(await within(list).findByText('English: Test English (India)')).toBeInTheDocument();
    expect(within(list).getByText('Hindi: Test Hindi')).toBeInTheDocument();
    expect(within(list).getByText('Kannada: no voice')).toBeInTheDocument();
  });

  it('keeps voice answers off by default and cannot turn them on where the browser cannot listen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    renderSettings();
    expect(await screen.findByText('This browser does not support voice answers.')).toBeInTheDocument();
    expect(voiceSwitch()).not.toBeChecked();
    expect(voiceSwitch()).toBeDisabled();
  });

  it('lets a grown-up turn voice answers on, explaining what happens to the audio, and saves it', async () => {
    Object.assign(window, { webkitSpeechRecognition: class {} });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const user = userEvent.setup();
    const repository = renderSettings();
    expect(await screen.findByText(/Laarish never records or keeps\s+audio/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome and Edge send the audio to their own speech service/)).toBeInTheDocument();
    expect(voiceSwitch()).toBeEnabled();
    await user.click(voiceSwitch());
    expect(voiceSwitch()).toBeChecked();
    await waitFor(async () => {
      const saved = (await repository.load()) as { state?: ProgressState };
      expect(saved.state?.settings.voiceAnswers).toBe(true);
    });
  });
});
