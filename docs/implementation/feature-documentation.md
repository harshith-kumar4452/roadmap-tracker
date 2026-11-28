# Features

| Feature | Where | Doc |
|---|---|---|
| Interview prep: question bank + AI mock interview | `#/interview` | [interview-system.md](interview-system.md) |
| Google Calendar sync | `#/calendar` | [calendar-integration.md](calendar-integration.md) |
| Daily coding practice | `#/coding` | [daily-coding-system.md](daily-coding-system.md) |
| Today widget and deadline alerts | Home | below |
| Upload your plan | `#/calendar` → Upload your plan | below |
| Calendar, colour coding, sprint planner | `#/calendar` | below |
| Roadmaps, roles, library, resources, profile, tasks | various | ported from the previous app, same behaviour |

## Today widget (home page, owner)

A floating panel in the bottom-right corner (a bottom sheet on phones). Collapses to a button with a badge counting
overdue tasks and active deadline alerts. Starts open on wide screens and collapsed on phones; remembers your choice.

Shows deadline alerts, today's tasks with a progress bar, overdue tasks and the next 7 days. Tick a task to complete it,
click it to edit, "+" to add, "All tasks" to open the Tasks page. Refreshes when tasks change anywhere in the app, every
minute, and when the tab regains focus.

**Deadline rule** (`web/src/lib/tasks.js`, tested in `test/deadline.test.js`), for a critical or high task due Friday:

| Day | State | Shown as |
|---|---|---|
| Wednesday | due in 2 days | blue alert "Critical deadline in 2 days (Friday)" |
| Thursday | due tomorrow | orange alert, higher in the list |
| Friday | due today | red filled alert |
| After Friday, until done | overdue | red filled alert "Overdue by N days" |

Medium and low tasks only alert once overdue. Repeating tasks use their next occurrence and are never "overdue".

## Calendar

Month, week and agenda views; colour coding (critical red, high orange, medium blue, low green, study purple, personal
teal, completed grey) with a legend; filters by priority, category and status; click a day to add, click an entry to
edit. Tasks can have a time range, notes, priority, category and a daily/weekly repeat.

**Sprint planner** (ported from the old planner): a 3-sprint study plan by role, level, hours per day and sprint
length, previewed and added as study sessions. Calendar entries the old planner kept only in the browser can be
imported once from a banner.

## Upload your plan

1. Drop or choose a file: PDF, DOCX, XLSX, CSV, PNG/JPG, TXT, up to 3 MB.
2. The server checks the real file type, extracts content, and asks Gemini for entries (or reads CSV/XLSX columns
   "Task"/"Date"/"Start"/"End"/"Priority" without AI).
3. Review table: tick/untick, edit title, date, start, end, priority, category; each row shows the original text and
   any issues — missing date (blocks adding), past date, ambiguous date/time, no end time, already in your calendar
   (unticked by default), duplicate within the plan, overlapping times. "Check again" re-runs the checks after edits.
4. **Add N to calendar** creates the ticked entries and pushes them to Google if connected.
5. Previous uploads are listed with the original file to download; drafts can be reopened.
