# External API integrations

| API | Used for | Auth | Called from | Failure handling |
|---|---|---|---|---|
| Google Gemini `generateContent` | Interview scoring, reports, model answers, plan extraction | `GEMINI_API_KEY` | `src/ai/gemini.js` | 3 attempts; then labelled fallbacks (see ai-models-and-agents.md) |
| Google OAuth 2.0 (`accounts.google.com`, `oauth2.googleapis.com`) | Connect / refresh / revoke Google Calendar access | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `src/google/client.js` | `invalid_grant` marks the connection "expired" and asks to reconnect |
| Google Calendar API v3 | Create the app's calendar, push/pull events, webhook channels | OAuth access token | `src/google/client.js`, `sync.js` | Retries on 429/5xx/rate-limit 403; one token refresh on 401; errors stored on the task and retried by the next sync |
| Codeforces `problemset.problems` | Daily coding pick (second source) | none (public) | `src/coding/service.js` | Cached for a week; stale cache used if the API is down; page works without it |
| LeetCode GraphQL, GitHub REST, Codeforces `user.info` | Live numbers on the profile (existing feature) | none | `src/profile.js` | Cached an hour; profile works without them |

## Not used, on purpose

- **LeetCode's private GraphQL for the daily problem**: unofficial and liable to break or be blocked; the daily pick
  uses the app's own verified practice lists first and the official Codeforces API second.
- **`googleapis` SDK**: very large for five endpoints; plain `fetch` keeps the serverless function small.

## Webhooks

Google Calendar push notifications (`events.watch`) call `POST /api/google/webhook`. They need a public HTTPS URL, so
they work on the deployed site, not on localhost. Channels expire (we request 7 days); the daily cron renews a
channel that expires within two days. If a watch can't be created, the error is shown in the sync panel and sync
still happens on page open and daily.
