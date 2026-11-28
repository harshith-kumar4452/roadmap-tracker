# Technology stack

Each entry: what it does, where it's used, why it was chosen and over what, trade-offs, cost.

## React 18 + Material UI 6 (frontend)
- **What / where**: UI library and component system for every page in `web/src`. Icons from `@mui/icons-material`.
- **Why**: requested by the owner (MUI everywhere, emojis replaced by Material icons). MUI gives accessible,
  consistent components (AppBar, Drawer, Dialog, Accordion, Tabs, Snackbar, Skeleton) and theming for light/dark.
- **Over**: keeping the 8,000-line plain-JS app (no consistent components, hard to extend); Tailwind/shadcn
  (would not satisfy the MUI requirement).
- **Limitations**: bigger bundle than plain JS (mitigated by per-page code splitting and Vite tree-shaking); MUI's
  per-component styling is costly for very long lists, so the roadmap rows use plain elements styled once.
- **Cost**: free (MIT).

## Vite 6 (build)
- Builds `web/` into `dist/` with hashed, code-split chunks; dev server with hot reload and an `/api` proxy.
- **Over** Create React App (unmaintained) and Next.js (server rendering isn't needed; the API is already Express).
- Free.

## React Router 6 (HashRouter)
- Client routes; hash URLs keep every old `#/...` link working with no server rewrites. Free.

## Express 5 + Node.js 20+ (backend)
- Existing API, kept and split into feature routers. Express 5 forwards async errors to the error handler. Free.

## MongoDB Atlas (database)
- Existing database. Documents fit the data (roadmaps with embedded sections; sessions with embedded answers).
- **Limitations**: the free M0 tier has storage and connection limits; uploaded plan files are stored in documents
  (≤3 MB each, well under the 16 MB document limit).

## Vercel (hosting, serverless API, cron)
- Static hosting of `dist/`, the API as one serverless function (60 s max for AI calls), and Vercel Cron for the
  daily job. **Limitation**: the Hobby plan allows one cron run a day, so near-real-time sync relies on the Google
  webhook and on-demand pulls.

## Google Gemini API (AI)
- See [ai-models-and-agents.md](ai-models-and-agents.md). Chosen by the owner.

## Google Calendar API v3 + OAuth 2.0
- See [../implementation/calendar-integration.md](../implementation/calendar-integration.md). Called over plain
  `fetch`; the `googleapis` SDK was not used because it is very large and only five endpoints are needed.

## Codeforces API
- Public, official, no key. Second source for the daily coding pick. See [api-integrations.md](api-integrations.md).

## mammoth (DOCX → text) and exceljs (XLSX → rows)
- Used only by plan upload, loaded lazily. **Over** SheetJS (`xlsx` on npm is an outdated build with known
  advisories). Free (BSD-2 / MIT).

## Node test runner
- `npm test`; no extra test framework needed. Google and Gemini are replaced by in-process fakes via fetch hooks.
