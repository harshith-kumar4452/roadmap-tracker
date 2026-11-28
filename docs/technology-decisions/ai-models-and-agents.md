# AI models and agents

There is one AI provider (Google Gemini) and no autonomous agents: every AI call is a single request with a fixed
prompt and a JSON schema, made by the server. Nothing the AI returns is acted on without validation, and nothing it
extracts reaches the calendar without the owner confirming it.

## Provider and model

| | |
|---|---|
| Provider | Google Gemini API (`generativelanguage.googleapis.com/v1beta`, `generateContent`) |
| Model | `GEMINI_MODEL`, default `gemini-2.5-flash` (change the variable to use a newer model; no code change) |
| Auth | `GEMINI_API_KEY`, sent as the `x-goog-api-key` header from the server only |
| Client | `src/ai/gemini.js` (no SDK): JSON mode with `responseSchema`, 45–55 s timeout, 3 attempts with backoff on 429/5xx/network errors |
| Why Gemini | Chosen by the owner. It reads PDFs and images natively (needed for plan upload) and has a free tier with tight limits. |
| Why Flash | Answer scoring and extraction need speed and low cost more than the deepest reasoning; Flash is the fast, cheap tier. |
| Cost / limits | Pay per token, or a free tier with per-minute and per-day request limits. Check current numbers at https://ai.google.dev/pricing — they change. AI calls are owner-only, so usage is bounded by one person. |

## Uses

### 1. Interview answer evaluator (`src/interview/ai.js` → `evaluateAnswer`)
- **Input**: category, difficulty, question, the stored reference answer (if any), the candidate's answer inside
  `<<<ANSWER … ANSWER>>>` markers.
- **Output (schema)**: six integer scores 0–10 (accuracy, understanding, completeness, communication, problemSolving,
  relevance), feedback, expected answer (Markdown), missing concepts, strengths, improvements.
- **Prompt design**: score substance, not keywords ("different words but correct = full marks"); per-criterion rubric;
  empty/off-topic answers 0–2; behavioral answers judged on situation/action/result; the answer is untrusted data and
  instructions inside it are ignored.
- **Validation**: scores clamped to 0–10, strings trimmed and length-limited, lists capped.
- **Fallback**: if no key or the call fails, a word-overlap score against the reference answer is used and clearly
  labelled "Basic scoring" with the reason, so an interview never breaks.

### 2. Final report writer (`buildReport`)
- **Input**: per-question results (score, feedback, missing concepts, an excerpt of each answer), criterion averages.
- **Output**: summary, strengths, weaknesses, recommended topics. The overall and criterion scores are computed in code,
  never by the model. **Fallback**: a report assembled from the per-question notes.

### 3. Model-answer writer (`writeModelAnswer`)
- Writes a Markdown answer (direct answer, explanation, example, code when useful) for bank questions that have none.
  Owner clicks "Write with AI"; the answer is stored once and labelled "written by AI".

### 4. Study-plan extractor (`src/plans/extract.js` → `aiExtract`)
- **Input**: PDF or image as inline data, or text from DOCX/XLSX/CSV/TXT inside `<<<DOC … DOC>>>`; today's date and
  time zone.
- **Output**: entries (title, subject, date, start/end time, duration, deadline flag, priority, category, weekly/daily
  recurrence, notes, source text, ambiguity), assumptions, summary.
- **Prompt design**: never invent dates or times; null + "ambiguity" when unclear; one entry per session/deadline;
  weekly timetables as recurrence; the document is untrusted data.
- **Validation**: dates/times re-checked, durations turned into end times, invalid enums replaced, deadlines raised to
  at least high priority, then issue flags (missing date, past date, ambiguous, no end time, duplicate in the calendar or
  in the plan, overlaps). Entries without a date can't be added.
- **Fallback**: CSV/XLSX with "Task" and "Date" columns are parsed without AI.

## Interaction with other components

UI → Express route (owner check) → `gemini.js` → validated result → MongoDB → UI. Gemini never calls back into the
app and has no tools.

## Status

The Gemini request/response path is covered by tests with a fake Gemini (including a prompt-injection answer and
503 failures). It has **not** been run against the real API in this project yet, because no key was available
during development. Add `GEMINI_API_KEY` and try one interview and one PDF upload to confirm.
