// Adds practice to the "DBMS Roadmap (takeUforward)":
//  1. Connects its 68 TUF SQL questions to the same questions in "SQL Practice – 310 Questions"
//     (matched by title) by adding that list's link to each one, so ticking either ticks both.
//  2. SQL sections get LeetCode / HackerRank / CodeChef questions from the SQL practice list
//     (ones the roadmap doesn't already have), easiest first, up to 12 per section.
//  3. Theory sections get HackerRank "Databases" challenges (relational algebra, normalization,
//     indexes, OLAP, MapReduce), each checked against HackerRank before it is added.
//  4. TUF's own DBMS topic quizzes go first in the practice of the sections they cover.
// Added by URL / title: running it again adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-dbms-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'DBMS Roadmap (takeUforward)';
const SQL_LIST = 'SQL Practice – 310 Questions';
const PER_SECTION = 12;

// DBMS section -> topics of the SQL practice list whose LeetCode / HackerRank / CodeChef
// questions practise it.
const SQL_SECTIONS = {
  '08. Querying Essentials': ['Select & Filtering', 'Conditional Logic & NULL Handling', 'String Functions & Pattern Matching'],
  '09. Aggregation and Analysis': ['Aggregation & Grouping'],
  '10. Set Operations': ['Set Operations & Combined Results'],
  '11. SQL Joins': ['Joins', 'Self Joins & Relationship Queries'],
  '12. Subqueries': ['Subqueries & Missing Records'],
  '13. Data Modification and Schema Evolution': ['Data Reshaping & Modification'],
};

// DBMS theory section -> HackerRank "Databases" challenge slugs.
const THEORY = {
  '05. Database Design': ['database-normalization-1-1nf', 'database-normalization-4'],
  '06. Relational Model and Formal Query Languages': ['database-query-languages', 'relational-algebra-3', 'relational-algebra-4'],
  '07. Functional Dependencies and Database Design': ['database-normalization-5', 'database-normalization-6', 'database-normalization-7', 'database-normalization-8', 'database-normalization-10', 'database-normalization-3', 'database-normalization-9'],
  '14. Physical Storage, Indexing & Hashing': ['indexes-1', 'indexes-2', 'indexes-3', 'indexes-4'],
  '22. Distributed Databases, NoSQL & Analytical Systems': ['olap-operations-1', 'olap-operations-2', 'olap-performance', 'olap-cube-metadata', 'map-reduce-advanced-count-number-of-friends', 'map-reduce-advanced-relational-join', 'map-reduce-advanced-matrix-multiplication'],
};
// TUF's own DBMS course (takeuforward.org/prep-hub/dbms) ends each topic with a quiz. Each
// goes first in the practice of the roadmap section that covers that topic.
const TUF_QUIZZES = {
  '02. DBMS Foundations and Architecture': ['quiz-1-introduction-to-dbms'],
  '04. Conceptual Data Modeling': ['quiz-2-data-models-and-er-models'],
  '06. Relational Model and Formal Query Languages': ['quiz-8-triggers-and-procedural-features'],
  '07. Functional Dependencies and Database Design': ['quiz-3-relational-model-and-normalization'],
  '14. Physical Storage, Indexing & Hashing': ['quiz-10-indexing-and-performance-tuning'],
  '16. Query Processing and Optimization': ['quiz-4-sql-and-query-optimization'],
  '19. Transactions and Concurrency Control': ['quiz-7-transactions-and-concurrency'],
  '20. Database Recovery and Durability': ['quiz-9-recovery-and-backup'],
  '21. Integrity, Security & Database Operations': ['quiz-12-security-and-access-control', 'quiz-11-database-monitoring-and-caching'],
  '22. Distributed Databases, NoSQL & Analytical Systems': ['quiz-6-distributed-database-systems', 'quiz-5-nosql-databases', 'quiz-13-scalability-and-big-data', 'quiz-14-data-warehousing-and-migration'],
};

// Opens each quiz page and keeps the ones TUF serves as a quiz (its title reads "Quiz ... · Mock Test").
async function tufQuizzes() {
  const out = new Map();
  for (const slug of Object.values(TUF_QUIZZES).flat()) {
    const url = `https://takeuforward.org/quiz/core-subject/${slug}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
    const title = r.ok ? /<title>([^<]*)/.exec(await r.text())?.[1] ?? '' : '';
    const name = /^(Quiz [^·|]+?)\s*·\s*Mock Test/.exec(title)?.[1];
    if (name) out.set(slug, { url, name: name.replace(/^Quiz /, 'Quiz: ').replace(/&amp;/g, '&') });
    else console.warn(`  TUF quiz "${slug}" not found (HTTP ${r.status}), skipped`);
    await sleep(400);
  }
  return out;
}

const THEORY_TOPIC = (slug) => (/normalization/.test(slug) ? 'Normalization' : /relational-algebra|query-languages/.test(slug) ? 'Relational algebra' : /indexes/.test(slug) ? 'Indexes' : /olap/.test(slug) ? 'OLAP' : 'MapReduce');

const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced', Advanced: 'Advanced', Expert: 'Advanced' };
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];
const SITE = [[/leetcode\.com/, 'LeetCode'], [/takeuforward\.org/, 'TUF'], [/hackerrank\.com/, 'HackerRank'], [/codechef\.com/, 'CodeChef']];
const siteOf = (url) => SITE.find(([re]) => re.test(url ?? ''))?.[1];
const norm = (t) => t.replace(/^\d+\.\d+\s+/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hackerrank() {
  const out = new Map();
  for (const slug of Object.values(THEORY).flat()) {
    const r = await fetch(`https://www.hackerrank.com/rest/contests/master/challenges/${slug}`);
    const m = r.ok ? (await r.json()).model : null;
    if (m?.name) out.set(slug, m);
    else console.warn(`  HackerRank "${slug}" not found, skipped`);
    await sleep(300);
  }
  return out;
}

// Applies all four changes to one copy of the roadmap (database or seed). Returns counts.
function apply(dbms, sqlList, hr, quizzes) {
  const sqlByTitle = new Map(sqlList.sections.flatMap((s) => s.items).map((i) => [norm(i.title), i]));
  let linked = 0, added = 0;

  // 1. Connect the TUF SQL questions already in the roadmap to the SQL list's copies.
  const have = new Set();
  for (const s of dbms.sections) for (const it of s.items) {
    if (!/\/practice\//.test(it.url ?? '')) continue;
    const twin = sqlByTitle.get(norm(it.title));
    if (!twin) continue;
    have.add(norm(it.title));
    const site = siteOf(twin.url);
    if (!site || twin.url === it.url || (it.links ?? []).some((l) => l.url === twin.url)) continue;
    // The roadmap's own TUF link goes last so it stays the one shown in the TUF slot.
    it.links = [{ kind: 'practice', site, url: twin.url }, { kind: 'practice', site: 'TUF', url: it.url }];
    linked++;
  }

  const push = (sectionTitle, items) => {
    const s = dbms.sections.find((x) => x.title === sectionTitle);
    if (!s) { console.warn(`  section "${sectionTitle}" not found, skipped`); return; }
    const urls = new Set(s.items.map((i) => i.url));
    const fresh = items.filter((i) => !urls.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
    s.items.push(...fresh);
    added += fresh.length;
  };

  // 2. SQL sections: questions from the SQL list the roadmap doesn't have yet.
  for (const [section, topics] of Object.entries(SQL_SECTIONS)) {
    const picks = sqlList.sections
      .filter((s) => topics.includes(s.title))
      .flatMap((s) => s.items)
      .filter((i) => ['LeetCode', 'HackerRank', 'CodeChef'].includes(siteOf(i.url)) && !have.has(norm(i.title)))
      .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level))
      .slice(0, PER_SECTION)
      .map((i) => {
        const hint = /Hint: ([^·]+)/.exec(i.note ?? '')?.[1]?.trim();
        return { title: i.title, url: i.url, level: i.level || 'Beginner', note: [`Practice · ${siteOf(i.url)}`, hint && `Hint: ${hint}`].filter(Boolean).join(' · ') };
      });
    push(section, picks);
  }

  // 3. Theory sections: HackerRank Databases challenges.
  for (const [section, slugs] of Object.entries(THEORY)) {
    const picks = slugs.filter((s) => hr.has(s)).map((slug) => {
      const m = hr.get(slug);
      return { title: m.name.trim(), url: `https://www.hackerrank.com/challenges/${slug}/problem`, level: LEVEL[m.difficulty_name] ?? 'Intermediate', note: `Practice · HackerRank · Databases: ${THEORY_TOPIC(slug)}` };
    }).sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
    push(section, picks);
  }

  // 4. TUF quizzes, placed first in each section's practice (right after its lessons).
  for (const [section, slugs] of Object.entries(TUF_QUIZZES)) {
    const s = dbms.sections.find((x) => x.title === section);
    if (!s) { console.warn(`  section "${section}" not found, skipped`); continue; }
    const urls = new Set(s.items.map((i) => i.url));
    const fresh = slugs.filter((q) => quizzes.has(q) && !urls.has(quizzes.get(q).url)).map((q) => ({
      id: id(), status: 'not_started', doneAt: null,
      title: quizzes.get(q).name, url: quizzes.get(q).url, level: 'Intermediate',
      note: 'Practice · TUF · topic quiz from the takeUforward DBMS course, 30 mins',
    }));
    if (!fresh.length) continue;
    const at = s.items.findIndex((i) => (i.note ?? '').startsWith('Practice'));
    s.items.splice(at === -1 ? s.items.length : at, 0, ...fresh);
    added += fresh.length;
  }
  return { linked, added };
}

const hr = await hackerrank();
const quizzes = await tufQuizzes();
const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const seedDbms = seed.find((r) => r.title === TITLE);
const seedSql = seed.find((r) => r.title === SQL_LIST);
if (DRY) {
  const copy = structuredClone(seedDbms);
  const r = apply(copy, seedSql, hr, quizzes);
  console.log(`Dry run: would connect ${r.linked} questions to the SQL list and add ${r.added} practice questions`);
  process.exit(0);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const doc = await col.findOne({ title: TITLE });
const sqlDoc = await col.findOne({ title: SQL_LIST });
if (!doc || !sqlDoc) throw new Error(`${!doc ? TITLE : SQL_LIST} not found in the database`);
const inDb = apply(doc, sqlDoc, hr, quizzes);
if (inDb.linked || inDb.added) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
console.log(`Database: connected ${inDb.linked} questions to the SQL list, added ${inDb.added} practice questions`);
await client.close();

const inSeed = apply(seedDbms, seedSql, hr, quizzes);
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
console.log(`seed/roadmaps.json: connected ${inSeed.linked}, added ${inSeed.added}`);
