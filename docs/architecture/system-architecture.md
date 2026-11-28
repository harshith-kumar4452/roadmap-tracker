# System architecture

Learning hub is one Node.js application with a React single-page frontend, a MongoDB database and
three external services (Google Gemini, Google Calendar, Codeforces). It runs on Vercel.

```
Browser (React + MUI, hash routes)
   │  fetch /api/*  (session cookie)
   ▼
Vercel ── static files: dist/ (built by Vite from web/)
   │
   └─ /api/* ──► api/index.js (serverless function) ──► src/app.js (Express 5)
                                                          ├─ src/store.js        roadmaps, pages, routine, links, profile
                                                          ├─ src/interview/*     question bank, progress, AI interviews
                                                          ├─ src/tasks/*         tasks and calendar entries
                                                          ├─ src/google/*        Google OAuth + Calendar sync
                                                          ├─ src/coding/*        daily coding problems
                                                          ├─ src/plans/*         study-plan upload and extraction
                                                          ├─ src/ai/gemini.js    Gemini REST client
                                                          └─ src/cron.js         daily job
                                                               │
            MongoDB Atlas ◄────────────────────────────────────┤
            Gemini API (generativelanguage.googleapis.com) ◄───┤
            Google OAuth + Calendar API v3 ◄────────────────────┤
            Codeforces API (codeforces.com/api) ◄───────────────┘

Vercel Cron ── daily 00:30 UTC ──► GET /api/cron/daily (Bearer CRON_SECRET)
Google Calendar push ──► POST /api/google/webhook (channel token checked)
```

## Request flow

1. The browser loads `dist/index.html` and the shell bundle; each page is a separate chunk loaded on demand.
2. Pages call `/api/*` with the HttpOnly session cookie. `src/app.js` sets `req.session` from the signed cookie.
3. Feature routers (`/api/interview`, `/api/tasks`, `/api/google`, `/api/coding`, `/api/plans`, `/api/cron`) check their own access. The older routes sit behind a guard that allows reads by anyone or by signed-in users and writes only by the owner.
4. Data is read from and written to MongoDB. AI and Google calls are made from the server only; no key or token ever reaches the browser.

## Roles

| Role | Can do |
|---|---|
| Visitor | Roadmap list, stats, page lists |
| Member (signed in) | Open roadmaps, pages, resources; interview question bank with their own progress and bookmarks; view daily coding |
| Owner | Everything: edit content, tasks and calendar, Google sync, AI interviews, AI answers, plan upload, coding tracking |

## Background work

Vercel's Hobby plan allows one cron run a day, so the daily job does everything that must happen without a user:
create today's coding pick, reconcile Google Calendar, renew the Google webhook. Work that a user can trigger is also
done on demand (opening the calendar pulls Google changes; opening Daily coding creates the pick if the cron hasn't).

## Deployment

`vercel.json`: install `npm ci`, build `npm run build` (Vite → `dist/`), serve `dist/`, rewrite `/api/*` to the function
(60 s max duration for AI calls), one daily cron, long-lived caching for hashed `/assets/*`.
