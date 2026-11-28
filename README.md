# Roadmap Tracker

A personal tracker for learning roadmaps. I kept my roadmaps (backend, system design, DSA, core CS, aptitude, GATE) in Notion, but tracking progress across dozens of pages of checkboxes there got hard. This app puts them all in one place, with practice questions and interview questions next to every topic, an AI mock interviewer, a daily coding pick, tasks and a calendar that syncs with Google Calendar.

**40 roadmaps · 4,600+ topics**: lessons linked to their video or article, practice questions linked to the site you solve them on, and interview questions to answer out loud.

**Live:** https://roadmaps-tracker.vercel.app

## Features

New in v3 (details in [docs/](docs/README.md)):

- **Interview prep**: 718 questions in 15 categories with answers, filters, bookmarks and Not started / Learning / Completed progress, plus an **AI mock interview** (Gemini) that scores every answer on six skills and writes a report, with your score history.
- **Google Calendar sync**: tasks sync both ways with a separate "Learning hub" calendar; your other calendars are never touched.
- **Daily coding**: one recommended problem a day (from your practice lists, then Codeforces), a manual checklist, streaks and stats.
- **Today widget** on the home page with critical-deadline alerts from 2 days before the due date.
- **Upload your plan**: PDF, Word, Excel, CSV, images or text are read into calendar entries you review before adding.
- A colour-coded calendar (month / week / agenda) and the whole interface rebuilt in **React + Material UI**.

Existing features:

- **Home page**: a hero with floating icons for every topic you study (they drift and lean towards the pointer), your progress and streaks, the last two weeks of your practice routine, and a card for every section.
- **Quick tour**: a 7-step guided tour that spotlights each part of the home page. It runs on your first visit, and the **?** button in the header replays it any time.
- **Roadmap pages, laid out like the takeUforward A2Z sheet**:
  - An overall progress card (done / total, with Easy / Medium / Hard or Beginner / Intermediate / Advanced tiles).
  - Numbered steps, each split into **Lessons**, **Practice** and **Interview questions**, with a count and progress bar for each. A2Z steps also split into TUF's sub-topics (Fundamentals, FAQs (Medium)…).
  - One line per question: tick, title, difficulty tag, and link buttons in fixed slots: a badge for every site that has the question (TUF, LeetCode, HackerRank, CodeChef, Exercism, CodeCrafters, roadmap.sh, Kaggle, Microsoft Learn…) plus article and video icons.
  - Practice problems (aptitude, GATE) have a **Show answer** toggle.
  - Group by topic or by difficulty, filter by status, search, and a private note on each topic.
- **Practice for every roadmap**: TUF first (A2Z sheet, DBMS / OS / OOPS quizzes and practice sets, LLD problems, aptitude practice sets), then other sites where TUF has nothing. Every question is checked on its site before it is added. There are also dedicated practice lists: DSA (LeetCode, HackerRank, CodeChef + all 453 A2Z questions), SQL (310 questions), Python, JavaScript, OOPS / LLD, aptitude, React and AI / distributed systems.
- **Progress syncs across roadmaps**: the same question can appear in several places (a TUF question and its LeetCode twin, a LeetCode question in both the JavaScript roadmap and the JavaScript practice list). Ticking it in one place ticks it everywhere. Links that many topics share (a playlist, a list page) are not treated as the same question.
- **Interview questions** for every learning roadmap, written for this project, each with a difficulty.
- **Job roles**: roadmaps grouped by role (SDE, Backend, Data, AI, Frontend, Placement / GATE) with resources, interview patterns, a JavaScript playground and that role's practice lists.
- **Study planner and calendar**, **Tasks** (a daily practice routine with streaks and a to-do list), **Profile** (with live LeetCode, GitHub and Codeforces stats), **Resources**, **Cheat sheets**, **Projects** and interactive **Mindmaps**.
- **Import**: paste a Notion page or any Markdown checklist (`- [ ] topic`) to add a new roadmap.
- **Accounts**: one owner account, created once with the setup key, can edit everything. Anyone can browse the roadmap list; opening a roadmap, a page or the resources needs an account, and visitors can sign up as members to read them.
- Light and dark mode, a phone layout, and a custom 404 page.

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | React 18 + Material UI 6, built with Vite, in `web/` (output `dist/`) |
| AI | Google Gemini API (`GEMINI_MODEL`, default `gemini-2.5-flash`) |
| Calendar | Google Calendar API v3 + OAuth 2.0 |
| Backend | Node.js + Express 5 (`src/app.js`) |
| Database | MongoDB Atlas: `roadmaps` (sections and topics embedded), `pages` (cheat sheets, projects, mindmaps), `habits` + `checkins` (routine), `tasks`, `links`, `accounts` |
| Auth | Owner and member accounts (scrypt-hashed passwords), HMAC-signed HttpOnly session cookie. `ADMIN_PASSWORD` is the one-time setup key for the owner account and signs the cookie |
| Hosting | Vercel: `dist/` as static files, `api/index.js` as a serverless function, one daily cron |
| Speed | The roadmap list and stats are cached in memory for 30 s (cleared on every write) and shared by Vercel's CDN for 15 s, served stale while they refresh, so visitors don't wait on cold starts. Signed-in users always get a fresh copy |

## Project structure

```
api/index.js           Vercel serverless entry (wraps the Express app)
src/app.js             Core REST routes; mounts the feature routers
src/http.js            Validation helpers
src/store.js           MongoDB access, caching, progress sync across roadmaps
src/auth.js            Accounts, signed session cookie
src/ai/gemini.js       Gemini client (JSON output, retries)
src/interview/         Question bank, progress, AI interviews
src/tasks/             Tasks and calendar entries
src/google/            Google OAuth, Calendar sync, webhook
src/coding/            Daily coding pick, checklist, stats
src/plans/             Study-plan upload and extraction
src/cron.js            Daily job
web/                   React + MUI app (pages, components, theme)
docs/                  Architecture, technology decisions, feature docs
test/                  `npm test`
seed/                  Roadmaps and starter pages
scripts/               Seed, importers, interview bank builder, test account
server.js              Local server (API + dist/)
vercel.json            Build, function, cron and header config
```

## Run it locally

Requires Node.js 20 or newer and a MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) M0 cluster works).

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI and ADMIN_PASSWORD
npm run seed              # loads the roadmaps (with practice and interview questions) and starter pages
npm run interview:bank    # builds the interview question bank
npm run build             # builds the web app into dist/
npm run dev               # http://localhost:4321 (API + built app)
npm run dev:web           # optional: http://localhost:5173 with hot reload (proxies /api to :4321)
npm test                  # needs TEST_MONGODB_URI pointing at a throwaway MongoDB
```

Open **Create account** (`/#/signup`), pick a name, username and password, and enter your `ADMIN_PASSWORD` as the setup key. That key stops anyone else from claiming the owner account. After that, log in with your username and password.

For testing pages that need sign-in, `npm run test-account` creates a read-only member login (`tester` by default). It generates a password and saves it as `TEST_PASSWORD` in `.env`, never printing it.

`npm run seed` only adds roadmaps and pages that aren't in the database yet, so it never overwrites your edits. `npm run seed -- --reset` deletes every roadmap first, which also wipes your progress (pages are kept).

## Practice and interview questions

The practice and interview questions are already in `seed/roadmaps.json`. The importers in `scripts/` rebuild or extend them, checking every question on its site (LeetCode's question list, HackerRank's challenge lookup, TUF's pages, Exercism's and CodeCrafters' public repos, roadmap.sh, Kaggle and Microsoft Learn) and adding only what is missing. They never reset progress.

```bash
npm run import:all -- --dry   # show what every importer would add
npm run import:all            # add anything missing to the database and seed/roadmaps.json
npm run import:interview      # just the interview questions, after editing scripts/data/
```

To add or change interview questions, edit `scripts/data/interview-questions.mjs` or `interview-questions-2.mjs` (`"B|question"` or `"I|question||answer"`) and run `npm run import:interview`.

## Deploy to Vercel

1. Create a free MongoDB Atlas cluster. Under **Network Access**, allow `0.0.0.0/0`, because Vercel functions don't have fixed IP addresses. Copy the connection string from **Connect → Drivers**.
2. Import this repository at [vercel.com/new](https://vercel.com/new). Keep the framework preset at **Other** and leave the build settings empty.
3. Under **Environment Variables**, add `MONGODB_URI` and `ADMIN_PASSWORD`, plus `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `CRON_SECRET` for the AI, calendar and daily-job features (all listed in [docs/README.md](docs/README.md); Google setup steps in [docs/implementation/calendar-integration.md](docs/implementation/calendar-integration.md)).
4. Deploy. Run `npm run seed` once from your machine (with the same `MONGODB_URI` in `.env`) to load the roadmaps.
5. Open `/#/signup` on the live site and create your account, using `ADMIN_PASSWORD` as the setup key.

## API

All responses are JSON. The roadmap list, stats, page lists and profile are public. Opening a roadmap, a page or the resources needs a logged-in account; every change needs the owner session.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/roadmaps` | List roadmaps with progress and the next topic (CDN-cached for visitors) |
| GET | `/api/roadmaps/:id` | One roadmap with resources, notes, sections and topics (login) |
| POST | `/api/roadmaps` | Create a blank roadmap |
| PATCH | `/api/roadmaps/:id` | Edit title, intro, resources, notes |
| DELETE | `/api/roadmaps/:id` | Delete a roadmap |
| POST | `/api/roadmaps/:id/sections` | Add a section |
| PATCH / DELETE | `/api/sections/:id` | Rename / delete a section |
| POST | `/api/sections/:id/items` | Add a topic |
| PATCH | `/api/items/:id` | Change status, level, note, title or link. A status change also updates the same question in other roadmaps |
| DELETE | `/api/items/:id` | Delete a topic |
| GET | `/api/stats` | Totals and completion timestamps (for streaks and the heatmap) |
| POST | `/api/import/markdown` | Create a roadmap from pasted Markdown |
| GET | `/api/pages?kind=cheatsheet|project|mindmap` | List pages of one kind |
| GET | `/api/pages/:id` | One page with its Markdown body (login) |
| POST | `/api/pages` | Create a page (`kind`, `title`) |
| PATCH / DELETE | `/api/pages/:id` | Edit title, summary, tags, status, body / delete |
| GET | `/api/me` | Whether you're logged in, whether an owner account exists, your name |
| POST | `/api/signup` | Create the owner account (with the setup key) or a member account |
| POST | `/api/login` / `/api/logout` | Start / end a session |
| GET | `/api/habits?since=YYYY-MM-DD` | Routine items and check-ins |
| POST / PATCH / DELETE | `/api/habits`, `/api/habits/:id` | Add, edit, remove a routine item (`days`: 0 = Sunday … 6) |
| PUT | `/api/habits/:id/checkins/:date` | Tick (`{ "done": true }`) or untick a day |
| GET / POST | `/api/tasks` | List (owner only) / add tasks |
| PATCH / DELETE | `/api/tasks/:id` | Edit, complete or delete a task |
| GET / PUT | `/api/profile` | Read (public) / save (owner) the student profile |
| GET | `/api/profile/stats` | Live LeetCode, GitHub and Codeforces numbers (cached an hour) |
| GET | `/api/resources` | Your links plus every roadmap's resources (login) |
| POST / PATCH / DELETE | `/api/links`, `/api/links/:id` | Manage your links |

## Credits

The roadmaps are built from free courses and playlists by Chai aur Code, Concept && Coding, Sriniously, Arpit Bhayani, Harkirat Singh, ByteByteGo and takeUforward. Practice links point to the original questions on takeUforward, LeetCode, HackerRank, CodeChef, Exercism, CodeCrafters, Learn Git Branching, Git Exercises, GitHub Skills, the System Design Primer, roadmap.sh, Kaggle and Microsoft Learn. The interview questions were written for this project.
