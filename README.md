# Roadmap Tracker

A personal tracker for learning roadmaps. I kept my roadmaps (backend, system design, DSA, core CS, aptitude, GATE) in Notion, but tracking progress across 30 pages of checkboxes and databases there got hard. This app puts them all in one place, with each roadmap page laid out the way it was in Notion.

**30 roadmaps · 1,600+ topics**, each linked to its video, article or practice set.

**Live:** https://roadmaps-tracker.vercel.app

## Features

- **Home page**: your name, overall progress, learning and routine streaks, the last two weeks of your practice routine, and a card for every section.
- **Tasks** (private): a daily practice routine and a to-do list.
  - The routine starts with LeetCode POTD and GFG POTD (daily), CodeChef Starters (Wednesdays) and LeetCode Weekly Contest (Sundays). Add, remove or reschedule items.
  - Tick today's items, or click any square in the 4-week grid to fill in a day you missed logging. Each item shows its streak and its hit rate over the last 30 days.
  - To-dos with a due date, grouped into Overdue, Today, Upcoming and Someday.
- **Resources**: practice and contest sites, your own links (with categories and notes), and the 📚 Resources of every roadmap, all searchable on one page.
- **Roadmaps dashboard**: overall progress, topics finished today and this week, a day streak, and an activity heatmap.
- **Pick up where you left off**: the next unfinished topic of your most recently active roadmaps, which you can tick right from the dashboard.
- **Notion-style roadmap pages**: 📚 Resources, the intro, notes sections (what the playlist doesn't cover, mini project, how it lines up with other roadmaps), then the **Course Index** table with Name, Level, Topic, Status and Link.
- **Group by level or by topic**, filter by status (To do / In progress / Done), search topics and notes.
- **Three-step status** (Not started → In progress → Done), a level per topic (Beginner / Intermediate / Advanced), and a private note on each topic.
- **One owner account**: create it once at `/#/signup` (name, username, password). After that sign-up closes; visitors can view everything except Tasks, and only you can edit.
- **Cheat sheets**: quick-reference pages written in Markdown, with tables, code blocks and links. Filter by tag and search.
- **Projects**: things to build, each with an Idea / Building / Done status, a feature checklist and its tech stack.
- **Mindmaps**: write an indented outline and it becomes an interactive mind map. Click a branch to fold or unfold it, drag to pan, pinch or Ctrl + scroll to zoom, search to find nodes, and open links straight from the map. Folded branches are remembered.
- **Import**: paste a Notion page or any Markdown checklist (`- [ ] topic`) to add a new roadmap.
- Light and dark mode, a menu on phones, and a custom 404 page.

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | Plain HTML, CSS and JavaScript (no build step), in `public/` |
| Backend | Node.js + Express 5 (`src/app.js`) |
| Database | MongoDB Atlas: `roadmaps` (sections and topics embedded), `pages` (cheat sheets, projects, mindmaps), `habits` + `checkins` (routine), `tasks`, `links`, `accounts` |
| Auth | One owner account (scrypt-hashed password), HMAC-signed HttpOnly session cookie. `ADMIN_PASSWORD` is the one-time setup key for sign-up and signs the cookie |
| Hosting | Vercel: `public/` as static files, `api/index.js` as a serverless function |

## Project structure

```
api/index.js           Vercel serverless entry (wraps the Express app)
src/app.js             REST API routes and validation
src/store.js           MongoDB data access
src/auth.js            Owner login, signed session cookie
src/parse.js           Markdown / Notion checklist parser
public/                The web app (index.html, app.js, styles.css)
public/render.js       Markdown renderer and mind map layout
public/mindmap.js      Interactive mind map (fold, pan, zoom, search)
seed/roadmaps.json     All roadmaps, ready to load into MongoDB
seed/pages.json        Starter cheat sheets, projects and mindmaps
scripts/seed.mjs       Loads both seed files into MongoDB
scripts/check-links.mjs Checks every stored link and reports broken ones
server.js              Local development server
vercel.json            Vercel config (static output + /api rewrite)
```

## Run it locally

Requires Node.js 20 or newer and a MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) M0 cluster works).

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI and ADMIN_PASSWORD
npm run seed              # loads the 30 roadmaps and starter pages into MongoDB
npm run dev               # http://localhost:4321
```

Open **Create account** (`/#/signup`), pick a name, username and password, and enter your `ADMIN_PASSWORD` as the setup key. That key stops anyone else from claiming the site before you do. After that, log in with your username and password.

`npm run seed` only adds roadmaps and pages that aren't in the database yet, so it never overwrites your edits. `npm run seed -- --reset` deletes every roadmap first, which also wipes your progress (pages are kept).

## Deploy to Vercel

1. Create a free MongoDB Atlas cluster. Under **Network Access**, allow `0.0.0.0/0`, because Vercel functions don't have fixed IP addresses. Copy the connection string from **Connect → Drivers**.
2. Import this repository at [vercel.com/new](https://vercel.com/new). Keep the framework preset at **Other** and leave the build settings empty.
3. Under **Environment Variables**, add `MONGODB_URI` and `ADMIN_PASSWORD`.
4. Deploy. Run `npm run seed` once from your machine (with the same `MONGODB_URI` in `.env`) to load the roadmaps.
5. Open `/#/signup` on the live site and create your account, using `ADMIN_PASSWORD` as the setup key.

## API

All responses are JSON. `GET` routes are public; everything else needs the owner session cookie from `POST /api/login`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/roadmaps` | List roadmaps with progress and the next topic |
| GET | `/api/roadmaps/:id` | One roadmap with resources, notes, sections and topics |
| POST | `/api/roadmaps` | Create a blank roadmap |
| PATCH | `/api/roadmaps/:id` | Edit title, intro, resources, notes |
| DELETE | `/api/roadmaps/:id` | Delete a roadmap |
| POST | `/api/roadmaps/:id/sections` | Add a section |
| PATCH / DELETE | `/api/sections/:id` | Rename / delete a section |
| POST | `/api/sections/:id/items` | Add a topic |
| PATCH | `/api/items/:id` | Change status, level, note, title or link |
| DELETE | `/api/items/:id` | Delete a topic |
| GET | `/api/stats` | Totals and completion timestamps (for streaks and the heatmap) |
| POST | `/api/import/markdown` | Create a roadmap from pasted Markdown |
| GET | `/api/pages?kind=cheatsheet|project|mindmap` | List pages of one kind |
| GET | `/api/pages/:id` | One page with its Markdown body |
| POST | `/api/pages` | Create a page (`kind`, `title`) |
| PATCH / DELETE | `/api/pages/:id` | Edit title, summary, tags, status, body / delete |
| GET | `/api/me` | Whether you're logged in, whether an account exists, your name |
| POST | `/api/signup` | Create the owner account (needs the setup key; closed once it exists) |
| POST | `/api/login` / `/api/logout` | Start / end the owner session |
| GET | `/api/habits?since=YYYY-MM-DD` | Routine items and check-ins |
| POST / PATCH / DELETE | `/api/habits`, `/api/habits/:id` | Add, edit, remove a routine item (`days`: 0 = Sunday … 6) |
| PUT | `/api/habits/:id/checkins/:date` | Tick (`{ "done": true }`) or untick a day |
| GET / POST | `/api/tasks` | List (owner only) / add tasks |
| PATCH / DELETE | `/api/tasks/:id` | Edit, complete or delete a task |
| GET | `/api/resources` | Your links plus every roadmap's resources |
| POST / PATCH / DELETE | `/api/links`, `/api/links/:id` | Manage your links |

## Credits

The roadmaps are built from free courses and playlists by Chai aur Code, Concept && Coding, Sriniously, Arpit Bhayani, Harkirat Singh, ByteByteGo and takeUforward. Links point to their original sources.
