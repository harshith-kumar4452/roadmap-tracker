# Database design (MongoDB)

Database name from `MONGODB_DB` (default `roadmap_tracker`). No migrations are needed: new collections are created on
first write, and new task fields have defaults when missing (`publicTask()`), so old documents keep working.

## Existing collections

| Collection | Shape (short) |
|---|---|
| `roadmaps` | `{ _id, title, intro, notionUrl, position, resources[], notes[], sections[{ id, title, items[{ id, title, url, level, status, doneAt, note, links? }] }] }` |
| `pages` | Cheat sheets, projects, mind maps: `{ _id, kind, title, summary, tags, status, body, updatedAt }` |
| `habits`, `checkins` | Daily routine and its ticks |
| `links` | The owner's own resource links |
| `accounts` | Owner (`_id: "owner"`) and members (`user:<username>`), scrypt hashes |
| `profile` | The owner's profile |

## New collections

### `tasks` (extended)
```
{ _id, title, notes, date: "YYYY-MM-DD"|null, time: "HH:MM"|null, endTime,
  priority: critical|high|medium|low, category: study|personal|work, kind: task|event,
  recurrence: null | { freq: daily|weekly, days: [0-6], until },
  done, doneAt, source: app|plan|google|planner|import, planId?,
  createdAt, updatedAt,
  google?: { eventId, calendarId, eventUpdated, syncedAt, error, errorAt, optOut } }
```
`google.eventId` is the mapping to the Google event; `eventUpdated` is Google's own `updated` stamp of the last version
we saw (prevents sync ping-pong); `optOut` is set when the event was deleted in Google.

### `integrations`
`{ _id: "google", status: connected|expired, email, refreshTokenEnc, calendarId, syncToken, channel: { id, resourceId, expiration }, connectedAt, lastSyncAt, lastPullAt, lastError, watchError }`

### `interview_questions`
`{ _id (sha1 of the question text, 12 chars), q, a (Markdown or ""), answerSource: author|ai|"", category, topic, difficulty: Easy|Medium|Hard, type, source, createdAt, updatedAt }`
Indexes: `{ category, difficulty }`, text index on `q, topic`.

### `interview_progress`
`{ _id: "<user>:<qid>", user, qid, status: not_started|learning|completed, bookmarked, reviews, lastReviewedAt, updatedAt }` — index `{ user, updatedAt }`.

### `interview_sessions`
`{ _id, user, category, difficulty, count, status: active|completed, items[{ qid, q, topic, difficulty, type, answer, answeredAt, evaluation{ scores{6 criteria 0-10}, feedback, expectedAnswer, missingConcepts, strengths, improvements, method: ai|fallback|empty, model } }], report{ overall, byCriterion, summary, strengths, weaknesses, missingConcepts, recommendedTopics, method, skipped }, createdAt, completedAt }` — index `{ user, createdAt }`.

### `coding_problems`
`{ _id, date, title, url, key (normalised link, prevents repeats), platform, difficulty, topic, tags, source: auto:practice|auto:codeforces|manual, auto: true?, roadmapId?, itemId?, done, doneAt, submissionUrl, notes, createdAt, updatedAt }`
Unique partial index `{ date }` where `auto: true` (one automatic pick per day, even if two requests race).

### `coding_cache`
`{ _id: "codeforces", at, problems[] }` — the Codeforces problem list, refreshed weekly.

### `plans`
`{ _id, filename, kind, size, file (Binary, original upload), status: draft|confirming|confirmed, method: ai|table, model, summary, assumptions, items[], createdTaskIds, createdAt, confirmedAt }`

## Data in the browser only

Kept per browser on purpose (preferences, not records): theme, filters and view choices, collapsed sections, role
interview notes, DSA-pattern ticks, the tour flag. The old planner's calendar data, which lived only in the browser,
can be imported into `tasks` from the Calendar page.
