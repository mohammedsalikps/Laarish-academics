# AI mentors (Rishi and Ayra): status and configuration

Last updated 16 Nov 2026 (17:20 UTC), branch `feature/tech-summit-redesign`.

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

## Investigation of "Ayra says Live AI but fails, Rishi is in demo mode" (16 Nov, 16:45–17:20 UTC)

**Request path (both mentors):** chat (`src/mentor/MentorProvider.tsx`) → `askMentor` (`src/mentor/mentorClient.ts`)
→ `POST /api/mentor` → `api/mentor.ts` → `createMentorService().reply` (`server/mentor/handler.ts`) →
`ClaudeMentorProvider.reply` (`server/mentor/providers.ts`): `models.retrieve(model)` once, then
`beta.messages.create` → Anthropic → JSON reply → chat. Rishi and Ayra are the same call; the mentor id in
the context picks the persona in the system prompt. The key is read at run time from `process.env.ANTHROPIC_API_KEY`
(no other name, no `VITE_` copy, nothing read at build time).

**What the logs and Vercel settings showed:**

| Evidence | Finding |
|---|---|
| `ANTHROPIC_API_KEY` (created 16:46) | Scoped to **Production only**, so every Preview deployment had no key → demo mode. That is the "Rishi in demo mode" |
| Newest deployment `kd7i8e8dr` (16:47) | A **Production** redeploy of the older production code (no status check), not a preview |
| Old Production `fzpqu6297`, 16:48:39–16:48:45 | 3 × `POST /api/mentor` → **502**; log `error=ModelUnavailableError` in 30–72 ms. It failed at the model check, **before any message reached Anthropic**. That deployment still had the **previous** key (Vercel applies variable changes only to new deployments). This build did not log Anthropic's HTTP status, so the exact status cannot be recovered. That is the "Ayra fails" |
| New Production `kd7i8e8dr`, 16:51:52 and 16:52:26 | 2 × `POST` → **200**, `[mentor] ok … model=claude-opus-5-5 stop=end_turn`: the new key works |

**Root cause:** configuration, not the mentor code. (1) The key was not available to Preview (scoped
to Production). (2) The failing requests ran on a deployment still holding the previous key, which
Anthropic rejected at the model check. The live request code on this branch is the same as the
production code that answered successfully.

**Model access:** `claude-opus-5-5` was verified with the new key: model check `ok`, the full check
(one tiny message) `ok`, and 10 real answers. No model change was needed.

**Changes (commits 8b3b69f, f69883b):**
- "Live AI" now appears only after the server confirms that the key and model work (`?check=model`,
  no tokens spent) or a live answer arrives. A key that is set but failing shows "AI not working".
- Failures record their stage (model check or message), Anthropic's HTTP status, error type, request id
  and a redacted message. These appear in the log, the 502 body (stage) and Grown-ups → AI status.
- One automatic retry for passing failures (busy, rate limited, dropped connection). Configuration
  problems and timeouts are not retried.
- Vercel (at the owner's request, 17:12): `ANTHROPIC_API_KEY` now targets Production **and Preview**.
  Only the environments were changed, not the value.

**Real tests, Preview `8tkglznc5` (Magnets → What do magnets attract?, Class 6, step Watch):**

| # | Question | Rishi | Ayra |
|---|---|---|---|
| 1 | "Hi!" | 200 · claude · 4.1 s | 200 · claude · 4.6 s |
| 2 | How does a magnet work? | 200 · 5.4 s | 200 · 7.0 s |
| 3 | Explain more simply (`simpler`) | 200 · 4.8 s, "magnet's friends" analogy | 200 · 5.2 s, "school gate" story |
| 4 | Hint without the answer (`hint`) | 200 · 4.8 s, asks which material is on the list; no answer given | 200 · 5.1 s, "Let's look closely!"; no answer given |
| 5 | "Is it the nail? And the spoon?" (needs the earlier turns) | 200 · 5.7 s, confirms the nail and compares wooden, plastic and steel spoons | 200 · 4.1 s, confirms the nail and refers back to the earlier story |

All 10 are logged as `[mentor] ok … model=claude-opus-5-5 stop=end_turn` with token counts. 9 of 10 read the
cached prompt (`cache_read=1397`). In the app's chat each mentor showed the **Live AI** badge and a live
answer, labelled Live AI, to "Why does a fridge magnet stick to the fridge door?".

## Still to do

- [ ] Production still runs the older build, which shows Live AI whenever a key is set. It works now
      with the new key, but the honest badge and diagnostics reach Production only when this branch is
      merged and deployed, which needs the owner's approval.
- [ ] A real question on each step (Home, Watch, Play, Practice, Ask) in Preview. Watch and Ask are
      done; Home, Play and Practice use the same request and are not yet clicked through.
