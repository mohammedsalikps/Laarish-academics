# AI mentors (Rishi and Ayra): status and configuration

Last updated 16 Nov 2026, branch `feature/tech-summit-redesign`.

## How it works

- The browser never talks to Anthropic. It calls `/api/mentor` on the same site; the serverless
  function (`api/mentor.ts` → `server/mentor/`) holds the key and calls the Claude Messages API
  with the official `@anthropic-ai/sdk`.
- Model `claude-opus-5-5` (override with `MENTOR_MODEL`), adaptive thinking (the default on this
  model), `output_config.effort` = `low` by default (`MENTOR_EFFORT`), streaming not needed for these
  short answers, one calculator tool, prompt caching on the fixed system prompt.
- Without a key the server answers with the prepared demo mentor. Every answer is labelled in the
  chat: **Live AI**, **Demo answer**, **Demo answer (offline)**, or **From the lesson, not AI**.

## Audit findings (16 Nov 2026)

| Check | Finding |
|---|---|
| Request shape for Claude Opus 5.5 | Correct: no disabled thinking or thinking budget, no `temperature`, no forced `tool_choice` (only `none` on the last round), effort in `output_config`, assistant turns passed back unchanged |
| Model id | `claude-opus-5-5` is a current model id |
| Vercel environment variables | Only `ANTHROPIC_API_KEY`, scoped to **Production**, type sensitive. **Preview has no key**, so every preview runs the demo mentor by design |
| Deployment Protection | On for every deployment except custom domains, so the production `*.vercel.app` URL also needs a Vercel sign-in. Anyone without access gets the Vercel login page, not the app |
| Runtime logs | Hobby keeps runtime logs for less than an hour, so earlier failures could not be read. The newest record is a status request to the preview at 13:36 UTC with no error |
| Live API test, Preview (`qzcu1fucd`, 16 Nov, signed in) | `GET /api/mentor` → `{"provider":"demo"}`: no key in Preview, as configured |
| Live API test, Production (`laarish-academics.vercel.app`, 16 Nov 14:04 UTC) | `GET /api/mentor` → `{"provider":"claude","model":"claude-opus-5-5"}` (a key is loaded). One real question (`POST`, magnets, step Watch) → **502 `mentor_unavailable` after 1.2 s** |
| Production log for that request | `[mentor] error provider=claude … ms=81 error=ModelUnavailableError` |
| Error handling (before this change) | Every Claude failure became the same 502 "couldn't answer" with no reason, so a wrong key, an empty credit balance and a busy service looked identical |

**Root cause (narrowed down):** production fails at the server's first step, the model check
`models.retrieve("claude-opus-5-5")`, 81 ms in, before any message is sent. So it is **not** the request
code, **not** credit (listing a model needs no credit) and **not** rate limiting. The production key is
either **not accepted** by Anthropic (HTTP 401: wrong, revoked or expired) or its workspace **may not use
this model** (403/404). The production deployment runs older code that does not log the HTTP status; the
code on this branch reports it as `auth`, `permission` or `model`.

**Fix (owner):** create a new key in the Anthropic Console (in a workspace that can use Claude Opus 5.5),
set it as `ANTHROPIC_API_KEY` for Production and Preview (steps below), then redeploy. To confirm before
touching Production: add the key to Preview, make a new preview of this branch, and open Grown-ups → AI
status (or `/api/mentor?check=model`). It should report "Live AI is working".

## What changed

- `server/mentor/diagnose.ts` classifies failures with the SDK's typed errors: `auth` (key not
  accepted), `permission`, `credit` (empty balance, reported by Anthropic as a 400 whose message
  mentions the credit balance), `model`, `rate_limited`, `overloaded`, `timeout`, `unreachable`,
  `unknown`.
- A failed answer now returns `{ error, message, reason }` (502/504). Server logs record
  `reason=…` with the error class and status only: never the conversation or the key.
- **Safe configuration check**: `GET /api/mentor?check=model` confirms that a key is set, that
  Anthropic accepts it and that the model exists (no tokens spent).
  `GET /api/mentor?check=message` also sends one tiny request (64 output tokens at low effort,
  well under a cent), which is the only way to see an empty credit balance. Results are cached
  (60 s and 5 min) so the endpoint cannot be used to flood Anthropic. The response reports
  `keyConfigured`, `environment` (production/preview/development), `result` and the model:
  **never the key**.
- Grown-ups → **AI status** (behind the parental gate) runs that check and explains the result
  in plain words, with the fix for each case. There is no place in the app to type a key.
- When the live AI is set up wrongly (`auth`, `credit`, `model`, `permission`), a child's question
  is answered from the lesson's prepared content with the notice "…this answer comes from the
  lesson. It is not from AI." Passing problems (busy, rate limited) keep the "Try again" button.

## Changing or rotating the key (no code change, no frontend rebuild)

The key lives only in Vercel's environment variables, read by the server at run time.

1. Create a key in the Anthropic Console (Settings → API keys). Use a separate key for Preview and
   for Production so either can be revoked alone.
2. Vercel → project **laarish-academics** → Settings → Environment Variables.
3. Add or edit `ANTHROPIC_API_KEY`:
   - **Production** value: the production key.
   - **Preview** value: the preview key (optionally limited to one Git branch).
   Mark it **Sensitive** so it cannot be read back.
4. Redeploy the environment you changed (Vercel applies environment variables to new
   deployments): for Preview, run a new preview deployment; for Production, redeploy the current
   production deployment from the Vercel dashboard (only with the owner's approval).
5. Open the app → Grown-ups → AI status → **Check the AI**. Expect "Live AI is working". Use
   **Full check** once to confirm credit.
6. Revoke the old key in the Anthropic Console.

Optional server variables: `MENTOR_MODEL`, `MENTOR_EFFORT` (low/medium/high), `MENTOR_TIMEOUT_MS`,
`MENTOR_MAX_TOKENS`, `MENTOR_RATE_LIMIT`, `MENTOR_PROVIDER` (`auto` or `demo` to force demo mode).
Never prefix any of these with `VITE_`: that would put them into the browser bundle.

## Still to verify (needs access)

- [ ] Preview key added in Vercel (owner) → new preview deployment → `?check=message` result.
- [ ] Production `?check=model` and `?check=message` results (read-only checks; no production
      deployment or setting changes).
- [ ] A real question on each step (Home, Watch, Play, Practice, Ask the mentor) answered with the
      **Live AI** label.
