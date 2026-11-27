// Adds practice under each lesson of the "OOPS Roadmap (takeUforward)", grouped by lesson
// ("Practice › 2.3 Inheritance"). TUF first: its OOPS course has a quiz and a coding practice set
// for most lessons (takeuforward.org/quiz/design/..., /practice/design/...). Where TUF has no
// practice set, HackerRank's Java track fills in (Java basics, exceptions, generics).
// Every page and challenge is checked on its site before it is added. HackerRank questions shared
// with the OOPS practice list stay in sync. Added by URL: re-running adds only what is missing.
// Usage: node --env-file=.env scripts/import-oops-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'OOPS Roadmap (takeUforward)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Lesson -> { quiz, practice } TUF slugs, and HackerRank Java slugs where TUF has no practice set.
const PRACTICE = {
  '1.1 Java Basics': { hr: ['welcome-to-java', 'java-stdin-and-stdout-1', 'java-loops-i'] },
  '1.3 Classes and Objects': { quiz: 'quiz-classes-and-objects', practice: 'practice-classes-and-objects' },
  '1.4 Attributes and Methods': { quiz: 'quiz-attributes-and-methods', practice: 'practice-attributes-and-methods' },
  '1.5 Constructors': { quiz: 'quiz-constructors', practice: 'practice-constructors' },
  '2.1 Encapsulation': { quiz: 'quiz-encapsulation', practice: 'practice-encapsulation' },
  '2.2 Access Modifiers': { quiz: 'quiz-access-modifiers', practice: 'practice-access-modifiers' },
  '2.3 Inheritance': { quiz: 'quiz-inheritance', practice: 'practice-inheritance' },
  '2.4 Polymorphism': { quiz: 'quiz-polymorphism', practice: 'practice-polymorphism' },
  '3.1 Abstraction': { quiz: 'quiz-abstraction', practice: 'practice-abstraction' },
  '3.2 Interfaces': { quiz: 'quiz-interfaces', practice: 'practice-interfaces' },
  '3.3 Static Keyword': { quiz: 'quiz-static-keyword', practice: 'practice-static-keyword' },
  '3.4 Inner Classes': { quiz: 'quiz-inner-classes', practice: 'practice-inner-classes' },
  '4.1 Association, Aggregation and Composition': { quiz: 'quiz-association-aggregation-and-composition', practice: 'practice-composition' },
  '4.2 Object Cloning': { quiz: 'quiz-object-cloning', practice: 'practice-object-cloning' },
  '5.1 Exception Handling': { quiz: 'quiz-exception-handling', hr: ['java-exception-handling-try-catch', 'java-exception-handling'] },
  '5.2 Generics': { quiz: 'quiz-generics', hr: ['java-generics'] },
  '5.3 File Handling': { quiz: 'quiz-file-handling' },
  '6.1 Design Principles': { quiz: 'quiz-design-principles' },
  '6.2 Object Lifecycle': { quiz: 'quiz-object-lifecycle' },
};
const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };

// Fetches a TUF page and returns its title only if it is the kind of page expected.
async function tufTitle(url, expect) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  const title = r.ok ? /<title>([^<]*)/.exec(await r.text())?.[1] ?? '' : '';
  await sleep(300);
  return expect.test(title) ? title : null;
}

async function itemsFor(lesson, level, p) {
  const items = [];
  if (p.quiz) {
    const url = `https://takeuforward.org/quiz/design/${p.quiz}`;
    const t = await tufTitle(url, /· Mock Test/);
    if (t) items.push({ title: t.replace(/\s*·\s*Mock Test.*$/, '').replace(/^Quiz /, 'Quiz: ').trim(), url, level, note: `Practice › ${lesson} · TUF · quiz` });
    else console.warn(`  ${lesson}: TUF quiz "${p.quiz}" not found, skipped`);
  }
  if (p.practice) {
    const url = `https://takeuforward.org/practice/design/${p.practice}`;
    const t = await tufTitle(url, /DESIGN Practice/);
    if (t) items.push({ title: t.replace(/\s*-\s*DESIGN Practice.*$/, '').trim(), url, level, note: `Practice › ${lesson} · TUF · coding practice` });
    else console.warn(`  ${lesson}: TUF practice "${p.practice}" not found, skipped`);
  }
  for (const slug of p.hr ?? []) {
    const r = await fetch(`https://www.hackerrank.com/rest/contests/master/challenges/${slug}`);
    const m = r.ok ? (await r.json()).model : null;
    await sleep(300);
    if (m?.name) items.push({ title: m.name.trim(), url: `https://www.hackerrank.com/challenges/${slug}/problem`, level: LEVEL[m.difficulty_name] ?? level, note: `Practice › ${lesson} · HackerRank · Java` });
    else console.warn(`  ${lesson}: HackerRank "${slug}" not found, skipped`);
  }
  return items;
}

// Plan from the seed copy (lesson titles and levels are the same in the database).
const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const seedRoadmap = seed.find((r) => r.title === TITLE);
const lessonLevel = new Map(seedRoadmap.sections.flatMap((s) => s.items).map((i) => [i.title, i.level || 'Beginner']));
const plan = {};
for (const [lesson, p] of Object.entries(PRACTICE)) {
  if (!lessonLevel.has(lesson)) { console.warn(`  lesson "${lesson}" not found, skipped`); continue; }
  plan[lesson] = await itemsFor(lesson, lessonLevel.get(lesson), p);
}
const total = Object.values(plan).reduce((n, l) => n + l.length, 0);
console.log(`Practice: ${total} across ${Object.keys(plan).length} lessons`);
if (DRY) process.exit(0);

function apply(sections) {
  let added = 0;
  for (const [lesson, items] of Object.entries(plan)) {
    const s = sections.find((x) => x.items.some((i) => i.title === lesson));
    if (!s) continue;
    const have = new Set(s.items.map((i) => i.url));
    const fresh = items.filter((i) => !have.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
    s.items.push(...fresh);
    added += fresh.length;
  }
  return added;
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const doc = await col.findOne({ title: TITLE });
if (!doc) throw new Error(`${TITLE} not found in the database`);
const addedDb = apply(doc.sections);
if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
console.log(`Database: added ${addedDb} practice questions`);
await client.close();
const addedSeed = apply(seedRoadmap.sections);
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
console.log(`seed/roadmaps.json: added ${addedSeed} practice questions`);
