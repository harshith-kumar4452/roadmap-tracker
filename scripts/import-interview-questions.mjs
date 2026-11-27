// Adds the interview questions in scripts/data/interview-questions*.mjs (written for this project)
// to the matching roadmap sections. They show as an "Interview questions" group in each section,
// and can be ticked and noted like any topic. Matched by question text: re-running adds only what
// is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-interview-questions.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';
import FIRST from './data/interview-questions.mjs';
import SECOND from './data/interview-questions-2.mjs';

const QUESTIONS = { ...FIRST, ...SECOND };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const LEVEL = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };

function apply(title, sections) {
  let added = 0;
  for (const [sectionTitle, list] of Object.entries(QUESTIONS[title])) {
    const s = sections.find((x) => x.title === sectionTitle);
    if (!s) { console.warn(`  ${title}: section "${sectionTitle}" not found, skipped`); continue; }
    const have = new Set(s.items.map((i) => i.title));
    for (const entry of list) {
      // "L|question" or "L|question||answer" (answers are shown behind a toggle on the page).
      const [lvl, rest] = [entry.slice(0, 1), entry.slice(2)];
      const [question, answer] = rest.split('||');
      if (have.has(question)) continue;
      const note = answer ? `Interview · Answer: ${answer}` : 'Interview · question to answer out loud, then check yourself';
      s.items.push({ id: id(), title: question, url: null, level: LEVEL[lvl], status: 'not_started', doneAt: null, note });
      added++;
    }
  }
  return added;
}

const total = Object.values(QUESTIONS).reduce((n, r) => n + Object.values(r).reduce((m, l) => m + l.length, 0), 0);
console.log(`Interview questions: ${total} across ${Object.keys(QUESTIONS).length} roadmaps`);

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
if (DRY) {
  for (const title of Object.keys(QUESTIONS)) {
    const entry = seed.find((r) => r.title === title);
    if (!entry) { console.warn(`${title} not found in seed`); continue; }
    console.log(`${title}: would add ${apply(title, structuredClone(entry.sections))}`);
  }
  process.exit(0);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
for (const title of Object.keys(QUESTIONS)) {
  const doc = await col.findOne({ title });
  if (!doc) { console.warn(`${title} not found in the database, skipped`); continue; }
  const addedDb = apply(title, doc.sections);
  if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
  const entry = seed.find((r) => r.title === title);
  console.log(`${title}: database +${addedDb}, seed +${entry ? apply(title, entry.sections) : 0}`);
}
await client.close();
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
