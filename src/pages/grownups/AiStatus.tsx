import { Bot, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { MentorCheck, MentorStatus } from '../../../shared/mentor/types';
import { MENTOR_ENDPOINT } from '../../mentor/mentorClient';
import { useMentorPersona } from '../../mentor/useMentorPersona';

/** Plain words for each check result. Never shows or asks for a key. */
const RESULT_TEXT: Record<MentorCheck['result'], { title: string; detail: string; good: boolean }> = {
  ok: { title: 'Live AI is working', detail: 'The server has a key, the key is accepted and the model is available.', good: true },
  missing_key: { title: 'Demo mode: no AI key on this server', detail: 'Answers come from prepared lesson content and are labelled as demo answers. Add ANTHROPIC_API_KEY for this environment in Vercel to switch on live AI.', good: false },
  demo_forced: { title: 'Demo mode is switched on', detail: 'A key is set, but MENTOR_PROVIDER is set to demo, so live AI is off on purpose.', good: false },
  auth: { title: 'The AI key was not accepted', detail: 'The key may be wrong, revoked or expired. Create a new key in the Anthropic Console and replace ANTHROPIC_API_KEY in Vercel, then redeploy.', good: false },
  permission: { title: 'The key may not use this model', detail: 'Check the key’s workspace permissions in the Anthropic Console, or set MENTOR_MODEL to a model the key can use.', good: false },
  credit: { title: 'The Anthropic account has no credit left', detail: 'Add credit in the Anthropic Console (Billing). No code change is needed.', good: false },
  model: { title: 'The configured model was not found', detail: 'Check MENTOR_MODEL in Vercel (leave it empty to use the default model).', good: false },
  rate_limited: { title: 'Anthropic asked us to slow down', detail: 'Too many requests for this key right now. Try the check again in a minute.', good: false },
  overloaded: { title: 'The AI service is busy', detail: 'Anthropic is overloaded or had an error. Try again in a minute.', good: false },
  timeout: { title: 'The AI service did not answer in time', detail: 'Try again. If it keeps happening, check the server’s network.', good: false },
  unreachable: { title: 'The server could not reach the AI service', detail: 'Check the server’s internet connection and try again.', good: false },
  unknown: { title: 'Live AI failed for an unknown reason', detail: 'Try again. The server log line starting “[mentor]” shows the error class.', good: false },
};

/**
 * Grown-ups only (behind the parental gate): is Rishi/Ayra's live AI working on this deployment?
 * Calls the server's safe check, which reports only categories, never the key.
 */
export function AiStatus() {
  const { name } = useMentorPersona();
  const [state, setState] = useState<{ status?: MentorStatus; error?: string; loading: boolean }>({ loading: false });

  const run = async (depth: 'model' | 'message') => {
    setState({ loading: true });
    try {
      const res = await fetch(`${MENTOR_ENDPOINT}?check=${depth}`, { headers: { accept: 'application/json' } });
      const json = (res.headers.get('content-type') ?? '').includes('application/json') ? ((await res.json()) as MentorStatus) : null;
      if (!res.ok || !json) setState({ loading: false, error: 'This version of the app has no mentor server (for example, a static preview). The mentor uses prepared lesson answers.' });
      else setState({ loading: false, status: json });
    } catch {
      setState({ loading: false, error: 'The mentor server could not be reached. Check the internet connection and try again.' });
    }
  };

  const check = state.status?.check;
  const text = check ? RESULT_TEXT[check.result] : null;
  return (
    <section className="card mt-5 p-5 font-grown" aria-labelledby="ai-status">
      <span className="inline-block rounded-full bg-grownup-soft px-3 py-1 text-xs font-extrabold text-grownup">For grown-ups</span>
      <h2 id="ai-status" className="mt-2 flex items-center gap-2 text-lg font-extrabold text-ink">
        <Bot className="h-5 w-5 text-grownup" aria-hidden="true" /> {name}’s AI status
      </h2>
      <p className="text-sm text-ink-muted">Checks the server’s AI configuration. The key is never shown, sent to this page or stored in the app.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-sm min-h-[44px]" onClick={() => run('model')} disabled={state.loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Check the AI
        </button>
        <button type="button" className="btn btn-ghost btn-sm min-h-[44px]" onClick={() => run('message')} disabled={state.loading}>
          Full check (also checks credit)
        </button>
      </div>
      <div aria-live="polite" className="mt-3">
        {state.loading && <p className="text-sm font-bold text-ink-soft">Checking…</p>}
        {state.error && <p className="text-sm font-bold text-ink-soft">{state.error}</p>}
        {text && check && (
          <div className={text.good ? 'rounded-2xl bg-success-soft p-3' : 'rounded-2xl bg-notyet-soft p-3'}>
            <p className={text.good ? 'font-extrabold text-success-strong' : 'font-extrabold text-notyet-strong'}>{text.title}</p>
            <p className="mt-1 text-sm text-ink">{text.detail}</p>
            <p className="mt-2 text-xs text-ink-muted">
              Environment: {check.environment} · Key set: {check.keyConfigured ? 'yes' : 'no'}
              {state.status?.model ? ` · Model: ${state.status.model}` : ''} · {check.depth === 'message' ? 'Full check' : 'Key and model check'} at{' '}
              {new Date(check.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
