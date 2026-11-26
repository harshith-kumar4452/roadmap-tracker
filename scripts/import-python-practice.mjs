// Adds practice questions to each topic of the "Python Roadmap", after its lessons: HackerRank's
// Python track, Exercism's Python exercises and LeetCode's pandas questions. Every question is
// checked against the site's own data first (HackerRank's track listing, Exercism's track config
// on GitHub, LeetCode's question list), so a renamed or removed one is skipped, not linked.
// Questions are added by URL: running it again adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-python-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'Python Roadmap';

// Section title (as in the roadmap) -> slugs per site.
//   hr: HackerRank Python track challenge slugs
//   ex: Exercism Python exercise slugs (concept and practice exercises)
//   lc: LeetCode pandas question slugs (free ones only)
const PRACTICE = {
  'Basics › Introduction': {
    hr: ['py-hello-world', 'python-print', 'python-arithmetic-operators', 'python-division'],
    ex: ['guidos-gorgeous-lasagna', 'hello-world', 'two-fer'],
  },
  'Basics › Data Types': {
    hr: ['swap-case', 'python-string-split-and-join', 'whats-your-name', 'python-mutations', 'find-a-string', 'string-validators', 'python-string-formatting', 'capitalize', 'python-integers-come-in-all-sizes', 'python-mod-divmod', 'python-power-mod-power'],
    ex: ['ghost-gobble-arcade-game', 'currency-exchange', 'little-sisters-vocab', 'little-sisters-essay', 'pretty-leaflet', 'reverse-string', 'pangram'],
  },
  'Basics › Control Flow': {
    hr: ['py-if-else', 'python-loops'],
    ex: ['meltdown-mitigation', 'black-jack', 'making-the-grade', 'leap', 'raindrops', 'collatz-conjecture'],
  },
  'Basics › Data Structures': {
    hr: ['python-lists', 'python-tuples', 'list-comprehensions', 'find-second-maximum-number-in-a-list', 'nested-list', 'finding-the-percentage', 'py-introduction-to-sets', 'py-set-add', 'symmetric-difference', 'py-check-subset'],
    ex: ['card-games', 'chaitanas-colossal-coaster', 'tisbury-treasure-hunt', 'inventory-management', 'mecha-munch-management', 'cater-waiter', 'locomotive-engineer'],
  },
  'Basics › Functions': {
    hr: ['write-a-function', 'map-and-lambda-expression', 'zipped', 'any-or-all', 'reduce-function', 'validate-list-of-email-address-with-filter', 'default-arguments'],
    ex: ['flatten-array', 'plane-tickets'],
  },
  Intermediate: {
    hr: [
      'class-2-find-the-torsional-angle', 'class-1-dealing-with-complex-numbers', // OOP / classes
      'collections-counter', 'defaultdict-tutorial', 'py-collections-namedtuple', 'py-collections-deque', 'itertools-product', 'itertools-permutations', 'calendar-module', 'python-time-delta', // standard library
      'exceptions', 'incorrect-regex', // error handling
      'xml-1-find-the-score', 'np-arrays', 'np-shape-reshape', // data handling
    ],
    ex: ['ellens-alien-game', 'log-levels', 'robot-name', 'clock', 'bank-account'],
    lc: ['big-countries', 'combine-two-tables', 'duplicate-emails', 'customers-who-never-order', 'rising-temperature', 'department-highest-salary'],
  },
  Advanced: {
    hr: [
      'introduction-to-regex', 're-split', 're-findall-re-finditer', 're-sub-regex-substitution', 'validating-the-phone-number', 'validating-named-email-addresses', // regex
      'html-parser-part-1', 'detect-html-tags-attributes-and-attribute-values', // parsing pages
      'standardize-mobile-number-using-decorators', 'decorators-2-name-directory', // decorators
    ],
    ex: ['wordy', 'markdown', 'rest-api'],
  },
};

const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];

async function sources() {
  const hr = new Map();
  for (let offset = 0; offset < 1000;) {
    const json = await fetch(`https://www.hackerrank.com/rest/contests/master/tracks/python/challenges?offset=${offset}&limit=100`).then((r) => r.json());
    if (!json.models?.length) break;
    for (const c of json.models) hr.set(c.slug, c);
    offset += json.models.length;
    if (hr.size >= json.total) break;
  }
  const config = await fetch('https://raw.githubusercontent.com/exercism/python/main/config.json').then((r) => r.json());
  const ex = new Map();
  for (const e of config.exercises.concept) if (e.status !== 'deprecated') ex.set(e.slug, { ...e, kind: 'concept' });
  for (const e of config.exercises.practice) if (e.status !== 'deprecated') ex.set(e.slug, { ...e, kind: 'practice' });
  const query = `query q($c:String){problemsetQuestionList:questionList(categorySlug:$c,limit:300,skip:0,filters:{}){questions:data{questionFrontendId title titleSlug difficulty isPaidOnly}}}`;
  const lcRes = await fetch('https://leetcode.com/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { c: 'pandas' } }),
  }).then((r) => r.json());
  const lc = new Map(lcRes.data.problemsetQuestionList.questions.filter((q) => !q.isPaidOnly).map((q) => [q.titleSlug, q]));
  return { hr, ex, lc };
}

function practiceItems(topic, src) {
  const p = PRACTICE[topic] ?? {};
  const items = [];
  const skip = (site, slug) => console.warn(`  ${topic}: ${site} "${slug}" not found, skipped`);
  for (const slug of p.hr ?? []) {
    const c = src.hr.get(slug);
    if (!c) { skip('HackerRank', slug); continue; }
    items.push({ title: c.name.trim(), url: `https://www.hackerrank.com/challenges/${slug}/problem`, level: LEVEL[c.difficulty_name] ?? 'Beginner', note: `Practice · HackerRank · Python: ${c.track?.name ?? ''}` });
  }
  for (const slug of p.ex ?? []) {
    const e = src.ex.get(slug);
    if (!e) { skip('Exercism', slug); continue; }
    // Exercism's Python track rates practice exercises 1-10 (most are 1-5).
    const level = e.kind === 'concept' || e.difficulty <= 2 ? 'Beginner' : e.difficulty <= 5 ? 'Intermediate' : 'Advanced';
    const about = e.kind === 'concept' ? `learning exercise: ${(e.concepts ?? []).join(', ').replace(/-/g, ' ')}` : `practice exercise, difficulty ${e.difficulty}/10`;
    items.push({ title: e.name, url: `https://exercism.org/tracks/python/exercises/${slug}`, level, note: `Practice · Exercism · ${about}` });
  }
  for (const slug of p.lc ?? []) {
    const q = src.lc.get(slug);
    if (!q) { skip('LeetCode', slug); continue; }
    items.push({ title: q.title, url: `https://leetcode.com/problems/${slug}/`, level: LEVEL[q.difficulty], note: `Practice · LeetCode #${q.questionFrontendId} · solve it with pandas` });
  }
  return items
    .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level))
    .map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
}

const src = await sources();
const practice = Object.fromEntries(Object.keys(PRACTICE).map((t) => [t, practiceItems(t, src)]));
const total = Object.values(practice).reduce((s, l) => s + l.length, 0);
console.log(`Practice: ${total} questions (${Object.entries(practice).map(([t, l]) => `${t} ${l.length}`).join(', ')})`);
if (DRY) process.exit(0);

function addPractice(sections) {
  const missing = Object.keys(PRACTICE).filter((t) => !sections.some((s) => s.title === t));
  if (missing.length) throw new Error(`${TITLE} has no topic called: ${missing.join(', ')}`);
  let added = 0;
  for (const s of sections) {
    const have = new Set(s.items.map((i) => i.url));
    const fresh = (practice[s.title] ?? []).filter((i) => !have.has(i.url));
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
