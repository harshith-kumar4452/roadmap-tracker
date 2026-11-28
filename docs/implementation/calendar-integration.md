# Google Calendar integration

## What it does

- **Connect / disconnect** from the Calendar page (owner only). Disconnecting revokes the app's Google access and
  unlinks every task; the "Learning hub" calendar stays in Google for you to keep or delete.
- **App → Google**: every task with a date becomes one event in a separate "Learning hub" calendar. Adding, editing,
  rescheduling, completing ("Done: …", grey) and deleting a task updates that event at once. Timed tasks become timed
  events in `APP_TIMEZONE`; tasks without a time become all-day events; repeating tasks become recurring events.
  Critical tasks get pop-up reminders 2 days and 1 hour before.
- **Google → app**: edits to those events (title, time, date, notes, "Done: " prefix) update the task; new events
  you create in the "Learning hub" calendar become tasks; deleting an event there keeps the task in the app and stops
  syncing it.
- **Status**: the sync panel shows connected account, number synced, last sync, failed tasks, live-updates state, and
  "Reconnect needed" when access expired. Each task shows its own sync error, if any.

Your other calendars are never read or changed: the app asks only for the `calendar.app.created` scope, which
covers calendars the app itself created.

## How sync works

| Trigger | Action |
|---|---|
| Task created / edited / deleted | Push that task (errors saved on the task, never block the save) |
| Calendar page opened | Incremental pull (sync token) + push anything pending |
| "Sync now" | Same as above |
| Google webhook (`events.watch`) | Incremental pull |
| Daily cron | Pull + retry failed pushes + renew the webhook if it expires within 2 days |

No duplicates: each event carries `extendedProperties.private.rtTaskId`; before inserting, the app looks that tag up,
so a lost event id never creates a second event. No ping-pong: the app remembers Google's `updated` stamp of the last
version it saw and ignores echoes of its own writes. Expired sync token (HTTP 410) → full resync of the last 90 days.

## Set it up (one time)

1. Go to https://console.cloud.google.com/ → create a project (free).
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External, app name "Learning hub", your email as support and developer
   contact. Add the scopes `.../auth/calendar.app.created`, `openid`, `email`. Add your Google account as a **test
   user** (while the app is in "Testing", only test users can connect; refresh tokens of apps in Testing expire after
   7 days, so publish the app to "In production" for long-term use).
4. **Credentials → Create credentials → OAuth client ID** → Web application. Authorized redirect URIs:
   - `https://roadmaps-tracker.vercel.app/api/google/callback`
   - `http://localhost:4321/api/google/callback` (for local testing)
5. Put the client ID and secret in Vercel (**Settings → Environment Variables**) and in `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   # Optional: fix the redirect URI (needed for Vercel preview URLs, which have other hostnames)
   GOOGLE_REDIRECT_URI=https://roadmaps-tracker.vercel.app/api/google/callback
   # Optional: dedicated key for encrypting the stored Google token (else derived from SESSION_SECRET / ADMIN_PASSWORD)
   TOKEN_ENCRYPTION_KEY=<long random string>
   APP_TIMEZONE=Asia/Kolkata
   ```
   Changing `TOKEN_ENCRYPTION_KEY` (or `ADMIN_PASSWORD` when it is the key source) makes the stored token unreadable;
   just connect again.
6. Redeploy, open **Calendar → Connect**, approve, and the app creates the "Learning hub" calendar and syncs.

## Limitations

- Webhooks need the public HTTPS site; on localhost, sync runs on page open and "Sync now".
- Only events in the "Learning hub" calendar sync. Events in your main calendar are not imported (by design).
- Ticking a repeating task completes the whole series.
- Tested against an in-process fake of Google's endpoints (see `test/google.test.js`); not yet against the real API in
  this project, because OAuth credentials are needed first.
