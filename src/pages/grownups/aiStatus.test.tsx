import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryProgressRepository } from '../../state/persistence';
import { ProgressProvider } from '../../state/ProgressProvider';
import { learnerState } from '../../test/fixtures';
import { AiStatus } from './AiStatus';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function renderPanel() {
  render(
    <ProgressProvider repository={new MemoryProgressRepository(learnerState({ mentor: 'ayra' }))}>
      <AiStatus />
    </ProgressProvider>,
  );
  return userEvent.setup();
}

afterEach(() => vi.unstubAllGlobals());

describe('AI status for grown-ups', () => {
  it('explains an empty credit balance in plain words, from the full check', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ provider: 'claude', model: 'claude-opus-5-5', check: { keyConfigured: true, environment: 'production', result: 'credit', depth: 'message', checkedAt: '2026-11-16T12:00:00.000Z' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = renderPanel();
    expect(await screen.findByRole('heading', { name: /Ayra’s AI status/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Full check/ }));
    expect(fetchMock).toHaveBeenCalledWith('/api/mentor?check=message', expect.anything());
    expect(await screen.findByText('The Anthropic account has no credit left')).toBeInTheDocument();
    expect(screen.getByText(/Environment: production · Key set: yes · Model: claude-opus-5-5/)).toBeInTheDocument();
  });

  it("shows what Anthropic answered (status, type, stage, request id) when the key is rejected", async () => {
    const detail = { stage: 'model_check', httpStatus: 401, errorType: 'authentication_error', message: 'invalid x-api-key', requestId: 'req_011ABC' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ provider: 'claude', model: 'claude-opus-5-5', check: { keyConfigured: true, environment: 'preview', result: 'auth', depth: 'model', checkedAt: '2026-11-16T12:00:00.000Z', detail } })));
    const user = renderPanel();
    await user.click(await screen.findByRole('button', { name: 'Check the AI' }));
    expect(await screen.findByText(/Anthropic said: HTTP 401 · authentication_error · failed at the model check, before any message/)).toBeInTheDocument();
    expect(screen.getByText(/request req_011ABC/)).toBeInTheDocument();
  });

  it('says demo mode when the server has no key, and never offers a place to type one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ provider: 'demo', check: { keyConfigured: false, environment: 'preview', result: 'missing_key', depth: 'model', checkedAt: '2026-11-16T12:00:00.000Z' } })));
    const user = renderPanel();
    await user.click(await screen.findByRole('button', { name: 'Check the AI' }));
    expect(await screen.findByText('Demo mode: no AI key on this server')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('handles a deployment without a mentor server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })));
    const user = renderPanel();
    await user.click(await screen.findByRole('button', { name: 'Check the AI' }));
    expect(await screen.findByText(/has no mentor server/)).toBeInTheDocument();
  });
});
