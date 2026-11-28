# Daily coding practice

Page: **Daily coding** (`#/coding`). Members can view; the owner tracks.

## The daily pick

Created by the daily cron (00:30 UTC) or the first time the page is opened that day, whichever comes first. One per day
(enforced by a unique index), never a problem that was recommended or added before.

Sources, in order (`CODING_SOURCES`, default `practice,codeforces`):
1. **practice** — the next unsolved problem from this app's practice roadmaps (DSA list first), on LeetCode,
   HackerRank, CodeChef, Codeforces or TUF. These links were verified on their sites when imported. Ticking the problem
   also ticks it in the roadmap (and everywhere the same question appears).
2. **codeforces** — the official API (`problemset.problems`), cached for a week, rating 800–1100 / 1200–1500 /
   1600–1900 for Easy / Medium / Hard.

Difficulty follows a weekly rhythm: Mon–Tue Easy, Wed–Thu Medium, Fri Hard, weekends Medium. If no source can give a
problem, the page says why and the manual checklist still works.

## Manual checklist

Add any problem (name, link, difficulty, topic, date, notes, already solved). Each problem can hold a submission link
and notes. Manual problems can be deleted; picks can't (so the "no repeats" history stays intact).

## Stats

Total solved, current streak (today not yet done doesn't break it), longest streak, this week and this month (solved
/ tracked, active days), by difficulty, by topic, a 6-month heatmap and the last 60 days. A problem counts on the day
it was assigned.

API: `GET /api/coding/today?date=`, `/history`, `/stats`, `POST /problems`, `PATCH /problems/:id`, `DELETE /problems/:id`.
