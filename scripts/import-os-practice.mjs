// Adds practice to the "Operating Systems Roadmap (takeUforward)", after each section's lessons:
//  1. TUF's own OS topic quizzes (takeuforward.org/prep-hub/operating-system), first.
//  2. LeetCode questions that exercise an OS idea: thread synchronisation, the dining
//     philosophers, CPU scheduling, a memory allocator, LRU/LFU page replacement, file paths.
// Every quiz page and LeetCode question is checked on its site before it is added (free LeetCode
// questions only). Questions also in other roadmaps (LRU Cache, the concurrency set) stay in sync.
// Added by URL: running it again adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-os-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'Operating Systems Roadmap (takeUforward)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Section -> TUF quiz slugs (first) and LeetCode question slugs (with what they practise).
const PRACTICE = {
  '01. Operating System Basics and OS Introduction': { tuf: ['quiz-1-basics-of-operating-systems'] },
  '02. Process Management': { tuf: ['quiz-2-process-management'] },
  '03. CPU Scheduling Algorithms': {
    lc: [['single-threaded-cpu', 'shortest-job-first scheduling with a priority queue'], ['task-scheduler', 'scheduling with cooldowns'], ['process-tasks-using-servers', 'assigning tasks to servers as they free up']],
  },
  '06. Process Synchronization and Concurrency Control': {
    tuf: ['quiz-3-synchronization-and-concurrency'],
    lc: [['print-in-order', 'ordering threads'], ['print-foobar-alternately', 'two threads taking turns'], ['print-zero-even-odd', 'three threads coordinating'], ['fizz-buzz-multithreaded', 'four threads sharing a counter'], ['building-h2o', 'barrier / semaphore pattern']],
  },
  '07. Deadlock, Starvation & Concurrency Bugs': {
    lc: [['the-dining-philosophers', 'avoiding deadlock and starvation']],
  },
  '08. System Calls and Inter-Process Communication': { tuf: ['quiz-7-inter-process-communication'] },
  '09. Memory Management': {
    tuf: ['quiz-4-memory-management'],
    lc: [['design-memory-allocator', 'first-fit contiguous allocation and freeing']],
  },
  '11. Page Replacement Algorithms and Thrashing': {
    lc: [['lru-cache', 'LRU page replacement'], ['lfu-cache', 'LFU page replacement']],
  },
  '12. File System': {
    tuf: ['quiz-5-file-systems'],
    lc: [['simplify-path', 'resolving . and .. in paths'], ['find-duplicate-file-in-system', 'walking directories and file contents']],
  },
  '13. Storage Management, Disk Scheduling & I/O Systems': { tuf: ['quiz-6-disk-management-and-scheduling'] },
  '14. OS Security, Virtualization, Containers & Interview Revision': { tuf: ['quiz-8-system-and-performance', 'quiz-9-advanced-topics'] },
};
const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];

async function tufQuiz(slug) {
  const url = `https://takeuforward.org/quiz/core-subject/${slug}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  const title = r.ok ? /<title>([^<]*)/.exec(await r.text())?.[1] ?? '' : '';
  const name = /^\s*(Quiz [^·|]+?)\s*·\s*Mock Test/.exec(title)?.[1];
  await sleep(400);
  return name ? { url, name: name.replace(/^Quiz /, 'Quiz: ').replace(/&amp;/g, '&').trim() } : null;
}

async function leetcode(slug) {
  const query = 'query q($s:String!){question(titleSlug:$s){questionFrontendId title titleSlug difficulty isPaidOnly}}';
  const r = await fetch('https://leetcode.com/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { s: slug } }),
  }).then((x) => x.json()).catch(() => null);
  await sleep(600);
  const q = r?.data?.question;
  return q && !q.isPaidOnly ? q : null;
}

const plan = {};
let total = 0;
for (const [section, p] of Object.entries(PRACTICE)) {
  const quizzes = [];
  for (const slug of p.tuf ?? []) {
    const q = await tufQuiz(slug);
    if (!q) { console.warn(`  TUF quiz "${slug}" not found, skipped`); continue; }
    quizzes.push({ title: q.name, url: q.url, level: 'Intermediate', note: 'Practice · TUF · topic quiz from the takeUforward OS course, 30 mins' });
  }
  const lc = [];
  for (const [slug, why] of p.lc ?? []) {
    const q = await leetcode(slug);
    if (!q) { console.warn(`  LeetCode "${slug}" not found or premium, skipped`); continue; }
    lc.push({ title: q.title, url: `https://leetcode.com/problems/${slug}/`, level: LEVEL[q.difficulty], note: `Practice · LeetCode #${q.questionFrontendId} · ${why}` });
  }
  lc.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
  plan[section] = [...quizzes, ...lc];
  total += plan[section].length;
}
console.log(`Practice: ${total} (${Object.entries(plan).map(([s, l]) => `${s.slice(0, 2)}:${l.length}`).join(' ')})`);
if (DRY) process.exit(0);

function addPractice(sections) {
  let added = 0;
  for (const [title, items] of Object.entries(plan)) {
    const s = sections.find((x) => x.title === title);
    if (!s) { console.warn(`  section "${title}" not found, skipped`); continue; }
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
const addedDb = addPractice(doc.sections);
if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
console.log(`Database: added ${addedDb} practice questions`);
await client.close();

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const entry = seed.find((r) => r.title === TITLE);
if (entry) {
  const addedSeed = addPractice(entry.sections);
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  console.log(`seed/roadmaps.json: added ${addedSeed} practice questions`);
}
