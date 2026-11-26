// Imports the 310-question SQL practice list (seed/sql-questions.md, copied from Notion)
// as its own roadmap: one section per topic, Easy/Medium/Hard as the topic level, and each
// question's sources, hint and premium flag kept as a note. Adds it only if it isn't there yet.
// Usage: node --env-file=.env scripts/import-sql-questions.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');

const TITLE = 'SQL Practice – 310 Questions';
const DATALEMUR = 'https://datalemur.com/sql-interview-questions';
const SOURCES = { LC: 'LeetCode', TUF: 'takeUforward', DL: 'DataLemur', HR: 'HackerRank', CC: 'CodeChef' };
const LEVEL = { easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' };

const md = fs.readFileSync(path.join(root, 'seed', 'sql-questions.md'), 'utf8');
const sections = [];
let level = '';
for (const raw of md.split(/\r?\n/)) {
  const line = raw.trim();
  let m;
  if ((m = line.match(/^## (.+?)(?:\s*\(\d+\))?$/))) { sections.push({ id: id(), title: m[1], items: [] }); level = ''; continue; }
  if ((m = line.match(/^### (Easy|Medium|Hard)$/i))) { level = LEVEL[m[1].toLowerCase()]; continue; }
  if (!(m = line.match(/^- \[( |x)\] (.+)$/i))) continue;
  const body = m[2];
  // "[Title](url) – TAGS (hint)" or "Title (Company) – DL 🔒"
  const link = body.match(/^\[(.+?)\]\((https?:\/\/[^)\s]+)\)\s*[–-]\s*(.+)$/);
  const plain = body.match(/^(.+?)\s+[–-]\s+(.+)$/);
  const title = link ? link[1] : plain[1];
  const tail = link ? link[3] : plain[2];
  const premium = tail.includes('🔒');
  const hint = tail.match(/\(([^)]+)\)/)?.[1];
  const tags = tail.replace(/\(.*?\)/g, '').replace('🔒', '').split('+').map((t) => t.trim()).filter(Boolean);
  const names = tags.map((t) => SOURCES[t] || t);
  const note = [
    `Source: ${names.join(' + ')}`,
    hint && `Hint: ${hint}`,
    premium && '🔒 DataLemur premium',
    !link && tags.includes('DL') && 'Find it in the DataLemur question list',
  ].filter(Boolean).join(' · ');
  sections.at(-1).items.push({
    id: id(),
    title,
    url: link ? link[2] : DATALEMUR,
    level,
    status: m[1].toLowerCase() === 'x' ? 'done' : 'not_started',
    doneAt: null,
    note,
  });
}

const total = sections.reduce((n, s) => n + s.items.length, 0);
const roadmap = {
  title: TITLE,
  intro: '310 SQL questions from LeetCode SQL 50, takeUforward, DataLemur, HackerRank and CodeChef, grouped into 13 topics. Inside each topic they run Easy, then Medium, then Hard. A question that appears on two sites is listed once, with both sources in its note.',
  notionUrl: 'https://app.notion.com/p/41f1ffd205bf800f8257e92bde6a0c70',
  resources: [
    { title: 'LeetCode SQL 50', url: 'https://leetcode.com/studyplan/top-sql-50/' },
    { title: 'takeUforward SQL practice', url: 'https://takeuforward.org/practice/sql' },
    { title: 'DataLemur SQL interview questions', url: DATALEMUR },
    { title: 'HackerRank SQL', url: 'https://www.hackerrank.com/domains/sql' },
    { title: 'CodeChef SQL case studies', url: 'https://www.codechef.com/practice/course/sql-case-studies-topic-wise/SQLBP01' },
  ],
  notes: [
    {
      heading: 'How to use this list',
      lines: [
        'Pair it with the SQL Roadmap: learn a concept there, then solve that topic here.',
        'DataLemur questions have no direct link: open the DataLemur list and search by the name; the company that asked it is in brackets.',
        '🔒 marks DataLemur premium questions. The note on each question shows which sites have it.',
      ],
    },
  ],
  sections,
};

const counts = sections.map((s) => `${s.title} ${s.items.length}`).join(', ');
console.log(`Parsed ${total} questions in ${sections.length} topics: ${counts}`);
if (total !== 310) console.warn(`Warning: expected 310 questions, parsed ${total}`);
if (DRY) process.exit(0);

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
if (await col.findOne({ title: TITLE })) {
  console.log(`${TITLE} already exists, nothing added`);
} else {
  const after = await col.findOne({ title: 'SQL Roadmap' });
  const position = after ? after.position + 0.5 : await col.countDocuments();
  const _id = id();
  await col.insertOne({ _id, ...roadmap, position, createdAt: new Date().toISOString() });
  console.log(`Added ${TITLE} (${total} questions) with id ${_id}`);
}
await client.close();

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
if (!seed.some((r) => r.title === TITLE)) {
  const at = seed.findIndex((r) => r.title === 'SQL Roadmap');
  seed.splice(at >= 0 ? at + 1 : seed.length, 0, { id: id(), ...roadmap });
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  console.log('Added it to seed/roadmaps.json');
}
