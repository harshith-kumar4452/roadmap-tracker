# Interview preparation

Page: **Interview prep** (`#/interview`). Two tabs.

## Questions & answers

- 718 questions in 15 categories: Data Structures & Algorithms, Operating Systems, DBMS, Computer Networks, OOP,
  Programming Languages, System Design, Machine Learning, Artificial Intelligence, Full-Stack Development,
  Cloud & DevOps, Data Analytics, Aptitude, Core CS (GATE), HR and Behavioral.
- Category cards show progress; filters for category, difficulty (Easy / Medium / Hard), type (conceptual, coding,
  system design, behavioral, aptitude), status, bookmarked; search by text or topic; 20 per page.
- Each question is an accordion. Opening it loads the answer (Markdown with explanation, examples and code), counts a
  review, and shows "Reviewed N× · last <date>" so you can revisit. Status: Not started / Learning / Completed.
  Bookmark from the header. Progress is per user, so members track their own.
- **Answers**: AI, HR / Behavioral and the extra DSA questions, plus 118 aptitude/GATE problems, have author-written
  answers. The rest have none yet: the owner can click **Write with AI** (saved for everyone, labelled "written by AI").

### Where the questions come from
`npm run interview:bank` builds the bank from `scripts/data/interview-questions.mjs`, `interview-questions-2.mjs`
(the questions already attached to the roadmaps) and `interview-bank-extra.mjs` (new questions with answers). Each
question's id is a hash of its text, so re-running never duplicates questions or loses progress, and AI-written answers
are kept unless an author answer is added later.

## AI mock interview (owner)

1. Pick category, difficulty (or Mixed) and 1–15 questions. Questions you were asked in your last 10 interviews of that
   category are avoided when possible.
2. One question at a time; type the answer or use **Dictate** (browser speech recognition, Chrome/Edge; hidden where
   unsupported). Empty answers are allowed ("Skip").
3. Each answer is scored by Gemini on technical accuracy, conceptual understanding, completeness, communication,
   problem solving and relevance (0–10 each), with feedback, the expected answer and missing concepts, shown before the
   next question.
4. **End early** at any time or finish after the last question for the report: overall score /100, score per skill,
   summary, strengths, what to improve, concepts missed, topics to study next (linked to the bank), question-by-question
   review, and the change from your previous interview in that category.
5. History tab: every interview with score and a trend chart; reports stay stored. Interviews can be deleted.

Without `GEMINI_API_KEY`, interviews still run with a clearly labelled basic score (overlap with the reference answer).

API: `/api/interview/meta`, `/summary`, `/questions`, `/questions/:id`, `PUT /progress/:id`,
`POST /questions/:id/answer`, `/sessions` (list, create), `/sessions/:id` (get, delete), `/sessions/:id/answer`,
`/sessions/:id/finish`.
