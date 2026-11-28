# Technical documentation

- **architecture/**
  - [system-architecture.md](architecture/system-architecture.md) — components, request flow, roles, background work, deployment
  - [frontend-architecture.md](architecture/frontend-architecture.md) — React + MUI app structure and decisions
  - [backend-architecture.md](architecture/backend-architecture.md) — modules, error handling, security, tests
  - [database-design.md](architecture/database-design.md) — every collection and index
- **technology-decisions/**
  - [technology-stack.md](technology-decisions/technology-stack.md)
  - [ai-models-and-agents.md](technology-decisions/ai-models-and-agents.md)
  - [api-integrations.md](technology-decisions/api-integrations.md)
  - [architecture-decision-records.md](technology-decisions/architecture-decision-records.md)
- **implementation/**
  - [feature-documentation.md](implementation/feature-documentation.md)
  - [calendar-integration.md](implementation/calendar-integration.md) — includes Google setup steps
  - [interview-system.md](implementation/interview-system.md)
  - [daily-coding-system.md](implementation/daily-coding-system.md)

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `MONGODB_DB` | no | Database name (default `roadmap_tracker`) |
| `ADMIN_PASSWORD` | yes | Setup key for the owner account; signs session cookies unless `SESSION_SECRET` is set |
| `SESSION_SECRET` | no | Separate cookie-signing secret |
| `GEMINI_API_KEY` | for AI | Interview scoring, AI answers, plan reading |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for calendar sync | Google OAuth client |
| `GOOGLE_REDIRECT_URI` | no | Fixed callback URL (needed on preview deployments) |
| `TOKEN_ENCRYPTION_KEY` | no | Key for the stored Google token (default: derived from `SESSION_SECRET`/`ADMIN_PASSWORD`) |
| `APP_TIMEZONE` | no | Default `Asia/Kolkata`; used for "today" and calendar times |
| `CRON_SECRET` | for the daily job | Vercel sends it to `/api/cron/daily` |
| `CODING_SOURCES` | no | Default `practice,codeforces` |
| `TEST_MONGODB_URI` | tests only | Throwaway MongoDB for `npm test` (its test database is dropped) |
