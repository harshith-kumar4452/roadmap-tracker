# Architecture decision records

## ADR-1: Rewrite the frontend in React + MUI, keep the API
- **Context**: the owner asked for Material UI across the app. MUI is a React library; the old frontend was plain JS.
- **Decision**: rebuild the frontend in React + MUI with Vite; keep the Express API and data model, extend them.
- **Consequences**: a build step is added (`npm run build`); every page was ported and re-tested; old hash URLs keep working.

## ADR-2: Gemini as the only AI provider, behind a small REST client
- **Context**: owner's choice; plan upload needs native PDF/image reading.
- **Decision**: `src/ai/gemini.js` with JSON-schema output; model set by `GEMINI_MODEL`.
- **Consequences**: swapping providers means replacing one module. All callers validate output.

## ADR-3: AI features are owner-only
- **Context**: AI calls cost money per request.
- **Decision**: AI interviews, AI answers and plan upload require the owner session. Members can study the bank.

## ADR-4: AI never writes to the calendar directly
- **Decision**: extracted plans are stored as drafts; the owner reviews, edits and confirms; entries without a date
  are blocked; duplicates start unticked. Confirm is claimed atomically so a double click can't add everything twice.

## ADR-5: Google sync uses an app-owned calendar and the `calendar.app.created` scope
- **Context**: the app must never overwrite unrelated personal events.
- **Decision**: create a separate "Learning hub" calendar and request only access to calendars the app created.
- **Consequences**: the app cannot see the owner's other calendars (by design). Events are tagged with
  `extendedProperties.private.rtTaskId` so a lost mapping never creates a duplicate.

## ADR-6: Conflict rule for two-way sync
- **Decision**: last writer wins per side, using Google's `updated` stamp of the last version we saw (not our clock).
  Deleting an event in Google keeps the task in the app and stops syncing it; deleting a task in the app deletes the event.

## ADR-7: Daily coding sources
- **Decision**: the app's own practice lists first (verified at import, progress syncs back), Codeforces official API
  second, manual entries always available. No unofficial APIs.

## ADR-8: One collection for tasks and calendar entries
- **Decision**: an event is a task with a time range. One model feeds the tasks page, the calendar, the Today widget and
  Google sync, so they can't drift apart.

## ADR-9: Daily cron plus on-demand work
- **Context**: Vercel Hobby allows one cron run per day.
- **Decision**: the cron does the daily pick, Google reconciliation and webhook renewal; the same work also runs on
  demand when the relevant page opens.

## ADR-10: Keep the framework-free mind map and tour
- **Decision**: `mindmap.js` and `tour.js` are reused as-is (mounted from React) rather than rewritten; the GSAP intro
  overlay was dropped because it delayed first paint and was the only GSAP user.
