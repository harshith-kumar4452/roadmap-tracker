// Builds the interview question bank (the interview_questions collection) from:
//   - scripts/data/interview-questions.mjs and interview-questions-2.mjs (the roadmap questions)
//   - scripts/data/interview-bank-extra.mjs (AI, HR / Behavioral and DSA questions with answers)
// Safe to re-run: questions are keyed by their text, progress is never touched, and answers the
// AI wrote are kept unless an author-written answer is added.
// Usage: npm run interview:bank [-- --dry]
import roadmapQs from './data/interview-questions.mjs';
import roadmapQs2 from './data/interview-questions-2.mjs';
import extra from './data/interview-bank-extra.mjs';
import { bankFromRoadmapData, bankFromExtra, upsertQuestions, CATEGORIES } from '../src/interview/bank.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Put it in .env first.');
  process.exit(1);
}
const dry = process.argv.includes('--dry');
const docs = [...bankFromRoadmapData([roadmapQs, roadmapQs2]), ...bankFromExtra(extra)];
const unknown = docs.filter((d) => !CATEGORIES.includes(d.category));
if (unknown.length) {
  console.error('Unknown categories:', [...new Set(unknown.map((d) => d.category))]);
  process.exit(1);
}
const byCat = {};
for (const d of docs) byCat[d.category] = (byCat[d.category] || 0) + 1;
console.table(byCat);
const r = await upsertQuestions(docs, { dry });
console.log(`${dry ? '[dry] ' : ''}${r.total} questions: ${r.added} new, ${r.updated} updated.`);
process.exit(0);
