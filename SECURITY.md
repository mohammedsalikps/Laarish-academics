# Security policy

Laarish Academics is used by children, so we treat security and privacy reports with priority.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately through GitHub:
**Security → Report a vulnerability** on this repository, or contact the maintainers privately.
Include what you found, how to reproduce it, and its possible impact. We will acknowledge the report and keep you
informed while we fix it.

## How the app handles secrets and data

- The AI mentor's API key (`ANTHROPIC_API_KEY`) is read only on the server (`server/`, `api/`). It is never part of the
  browser bundle and is never logged.
- Real keys belong in a local `.env` file (ignored by git) or the hosting provider's environment variables. Only
  `.env.example`, with empty values, is committed.
- The mentor receives curriculum ids, the step the learner is on and short app-computed facts. It does not receive the
  learner's name, profile or full chat history. The server screens the learner's message for personal details
  before anything is sent to the AI provider.
- Learner progress is stored in the learner's own browser (`localStorage`); this demo has no accounts or server-side
  database.
- Voice answers are off by default. When a grown-up turns them on, the browser's own speech recognition turns speech
  into text; the app never records or keeps audio.
- Production responses send a Content Security Policy, `X-Frame-Options: DENY`, `nosniff` and a Permissions-Policy
  that allows the microphone for this site only (see `vercel.json` and `server/node-server.ts`).

## Supported versions

Only the latest version on the `main` branch (deployed at https://laarish-academics.vercel.app) is supported.
