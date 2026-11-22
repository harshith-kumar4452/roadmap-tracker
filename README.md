# Roadmap Tracker

A personal tracker for learning roadmaps. I kept my roadmaps (backend, system design, DSA, core CS, aptitude, GATE) in Notion, but tracking progress across 30 pages of checkboxes and databases there got hard. This app puts them all in one place, with each roadmap page laid out the way it was in Notion.

**30 roadmaps · 1,600+ topics**, each linked to its video, article or practice set.

**Live:** https://roadmap-tracker-beta.vercel.app

## Features

- **Dashboard**: overall progress, topics finished today and this week, a day streak, and an activity heatmap.
- **Pick up where you left off**: the next unfinished topic of your most recently active roadmaps, which you can tick right from the dashboard.
- **Notion-style roadmap pages**: 📚 Resources, the intro, notes sections (what the playlist doesn't cover, mini project, how it lines up with other roadmaps), then the **Course Index** table with Name, Level, Topic, Status and Link.
- **Group by level or by topic**, filter by status (To do / In progress / Done), search topics and notes.
- **Three-step status** (Not started → In progress → Done), a level per topic (Beginner / Intermediate / Advanced), and a private note on each topic.
- **Public to view, password to edit**: visitors see your progress; only you can change it.
- **Import**: paste a Notion page or any Markdown checklist (`- [ ] topic`) to add a new roadmap.
- Light and dark mode, works on phones.

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | Plain HTML, CSS and JavaScript (no build step), in `public/` |
| Backend | Node.js + Express 5 (`src/app.js`) |
| Database | MongoDB Atlas, one document per roadmap with its sections and topics embedded |
| Auth | One owner password (`ADMIN_PASSWORD`), HMAC-signed HttpOnly cookie |
| Hosting | Vercel: `public/` as static files, `api/index.js` as a serverless function |

## Project structure

```
api/index.js           Vercel serverless entry (wraps the Express app)
src/app.js             REST API routes and validation
src/store.js           MongoDB data access
src/auth.js            Owner login, signed session cookie
src/parse.js           Markdown / Notion checklist parser
public/                The web app (index.html, app.js, styles.css)
seed/roadmaps.json     All roadmaps, ready to load into MongoDB
scripts/seed.mjs       Loads seed/roadmaps.json into MongoDB
server.js              Local development server
vercel.json            Vercel config (static output + /api rewrite)
```

## Run it locally

Requires Node.js 20 or newer and a MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) M0 cluster works).

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI and ADMIN_PASSWORD
npm run seed              # loads the 30 roadmaps into MongoDB
npm run dev               # http://localhost:4321
```

Click **Log in to edit** and enter your `ADMIN_PASSWORD` to tick topics and edit pages.

`npm run seed` only adds roadmaps that aren't in the database yet. `npm run seed -- --reset` deletes everything first, which also wipes your progress.

## Deploy to Vercel

1. Create a free MongoDB Atlas cluster. Under **Network Access**, allow `0.0.0.0/0`, because Vercel functions don't have fixed IP addresses. Copy the connection string from **Connect → Drivers**.
2. Import this repository at [vercel.com/new](https://vercel.com/new). Keep the framework preset at **Other** and leave the build settings empty.
3. Under **Environment Variables**, add `MONGODB_URI` and `ADMIN_PASSWORD`.
4. Deploy. Run `npm run seed` once from your machine (with the same `MONGODB_URI` in `.env`) to load the roadmaps.

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
| GET | `/api/me` | Whether you're logged in |
| POST | `/api/login` / `/api/logout` | Start / end the owner session |

## Credits

The roadmaps are built from free courses and playlists by Chai aur Code, Concept && Coding, Sriniously, Arpit Bhayani, Harkirat Singh, ByteByteGo and takeUforward. Links point to their original sources.
