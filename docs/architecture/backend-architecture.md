# Backend architecture

Express 5 on Node 20+, one app (`src/app.js`) used both by the local server (`server.js`) and by Vercel
(`api/index.js`).

## Modules

| Module | Responsibility |
|---|---|
| `src/app.js` | Core routes (roadmaps, items, sections, pages, habits, links, profile, stats, import), the owner-only write guard, error handler; mounts the feature routers |
| `src/http.js` | Validation helpers (`text`, `date`, `time`, `oneOf`, `int`), `ownerOnly`, `signedIn`, `todayIso` |
| `src/auth.js` | scrypt password hashing, HMAC-signed session cookie |
| `src/store.js` | MongoDB access and 30 s in-memory cache for the core data; `collection()` shared by all modules |
| `src/ai/gemini.js` | Gemini REST client: JSON schema output, retries, timeouts, output cleaning helpers |
| `src/interview/` | `bank.js` (questions, progress), `ai.js` (scoring, model answers, reports, fallback), `routes.js` |
| `src/tasks/` | Task model and `/api/tasks` (pushes every change to Google) |
| `src/google/` | `crypto.js` (token encryption, signing), `client.js` (OAuth + Calendar API), `sync.js` (two-way sync), `routes.js` |
| `src/coding/` | Daily pick (practice lists, Codeforces), checklist, streaks/stats |
| `src/plans/` | `extract.js` (file checks, text extraction, Gemini extraction, validation, issue flags), `routes.js` |
| `src/cron.js` | `/api/cron/daily` |

## Error handling

Errors created with `httpError()` are written for the user and shown as-is (even 5xx such as "AI is not set up").
Unexpected errors are logged and returned as "Something went wrong". External failures degrade instead of failing
the request:

- Gemini down → interview scoring falls back to a labelled basic score; plan upload falls back to table parsing for CSV/XLSX.
- Google error on a task change → the task is saved, the error is stored on the task and shown, the next sync retries.
- Codeforces down → the cached problem list is used; if there is none, the page still works and says so.

## Security

- Secrets only in environment variables; none are sent to the browser.
- Google refresh tokens encrypted at rest (AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY` or derived with HKDF).
- OAuth `state` is a signed nonce matched against a short-lived HttpOnly cookie (CSRF protection).
- Webhook requests are accepted only with the channel token we signed.
- Cron endpoint requires `Authorization: Bearer CRON_SECRET` (constant-time compare).
- Uploads: 3 MB limit, type detected from the file's bytes (a renamed `.exe` is refused), original stored as binary
  and downloaded with `Content-Disposition: attachment` and `nosniff`.
- AI input/output: user answers and documents are sent as delimited untrusted data with an instruction to ignore
  instructions inside them; every AI result is validated and clamped (scores 0–10, enums, dates) before storage,
  and rendered through the escaping Markdown renderer.
- Login attempts are rate-limited per instance.

## Tests

`npm test` (Node's test runner) with `TEST_MONGODB_URI` pointing at a throwaway MongoDB. 20 tests cover the interview
bank and AI interview (with a fake Gemini, including a prompt-injection answer), Google OAuth and two-way sync (with a
fake Google), daily coding sources and streaks, plan upload (CSV, fake-Gemini PDF, bad files), and the deadline rules.
