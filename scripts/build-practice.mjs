// Builds practice-question roadmaps from LeetCode, HackerRank and CodeChef public data, mapped to
// the topics of the existing roadmaps. Every link comes straight from the site's own listing, so
// nothing is guessed. Output: seed/practice-roadmaps.json (+ with --import, adds them to MongoDB
// and seed/roadmaps.json; roadmaps that already exist by title are skipped).
// Usage: node --env-file=.env scripts/build-practice.mjs [--import]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = () => randomBytes(6).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };

// Responses are cached on disk so a re-run after a rate limit resumes instead of starting over.
const CACHE_FILE = path.join(os.tmpdir(), 'roadmap-practice-cache.json');
const disk = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

async function getJson(url, init, tries = 6) {
  const key = url + (init?.body ?? '');
  if (disk[key]) return disk[key];
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        const json = await res.json();
        disk[key] = json;
        fs.writeFileSync(CACHE_FILE, JSON.stringify(disk));
        return json;
      }
      console.warn(`  HTTP ${res.status} from ${new URL(url).host}, retrying`);
    } catch (e) {
      console.warn(`  ${e.message}, retrying`);
    }
    await sleep(2000 * 2 ** i);
  }
  return null;
}

// ---------- LeetCode ----------
const lcCache = new Map();
async function leetcode(tag) {
  if (lcCache.has(tag)) return lcCache.get(tag);
  const query = `query q($f:QuestionListFilterInput){problemsetQuestionList:questionList(categorySlug:"",limit:300,skip:0,filters:$f){questions:data{questionFrontendId title titleSlug difficulty likes isPaidOnly}}}`;
  const json = await getJson('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { f: { tags: [tag] } } }),
  });
  await sleep(1200);
  const list = (json?.data?.problemsetQuestionList?.questions ?? []).filter((q) => !q.isPaidOnly);
  if (!list.length) console.warn(`  LeetCode tag "${tag}" returned nothing`);
  lcCache.set(tag, list);
  return list;
}
// Most-liked questions for the given tags, `take` per difficulty, easiest first.
async function lcPicks(tags, take, taken) {
  const all = new Map();
  for (const t of tags) for (const q of await leetcode(t)) all.set(q.titleSlug, q);
  const items = [];
  for (const diff of ['Easy', 'Medium', 'Hard']) {
    const n = take[diff] ?? 0;
    [...all.values()]
      .filter((q) => q.difficulty === diff && !taken.has(q.titleSlug))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, n)
      .forEach((q) => {
        taken.add(q.titleSlug);
        items.push({
          title: q.title,
          url: `https://leetcode.com/problems/${q.titleSlug}/`,
          level: LEVEL[diff],
          note: `LeetCode #${q.questionFrontendId} · ${q.likes.toLocaleString('en-US')} likes`,
        });
      });
  }
  return items;
}

// ---------- HackerRank ----------
const hrCache = new Map();
async function hackerrank(track) {
  if (hrCache.has(track)) return hrCache.get(track);
  const out = [];
  for (let offset = 0; offset < 2000;) {
    const json = await getJson(`https://www.hackerrank.com/rest/contests/master/tracks/${track}/challenges?offset=${offset}&limit=100`);
    await sleep(1200);
    if (!json?.models?.length) break;
    out.push(...json.models);
    offset += json.models.length; // pages can be shorter than the limit asked for
    if (out.length >= json.total) break;
  }
  if (!out.length) console.warn(`  HackerRank track "${track}" returned nothing`);
  hrCache.set(track, out);
  return out;
}
const hrItem = (c) => ({
  title: c.name,
  url: `https://www.hackerrank.com/challenges/${c.slug}/problem`,
  level: LEVEL[c.difficulty_name] ?? 'Beginner',
  note: `HackerRank · ${c.track?.name ?? ''}`.replace(/ · $/, ''),
});
const byLevel = (a, b) => ['Beginner', 'Intermediate', 'Advanced'].indexOf(a.level) - ['Beginner', 'Intermediate', 'Advanced'].indexOf(b.level);
// HackerRank challenges of a track whose subdomain name matches `re`, most-solved first.
async function hrPicks(track, re, limit = 8) {
  const list = (await hackerrank(track)).filter((c) => re.test(c.track?.name ?? ''));
  return list.sort((a, b) => b.solved_count - a.solved_count).slice(0, limit).map(hrItem).sort(byLevel);
}

// ---------- CodeChef ----------
async function codechefPicks(tag, limit = 4) {
  const json = await getJson(`https://www.codechef.com/api/list/problems?limit=40&sort_by=successful_submissions&sort_order=desc&search=&tags=${tag}`);
  await sleep(1500);
  const rows = (json?.data ?? []).filter((p) => Number(p.difficulty_rating) > 0);
  if (!rows.length) console.warn(`  CodeChef tag "${tag}" returned nothing`);
  return rows.slice(0, limit).map((p) => {
    const r = Number(p.difficulty_rating);
    return {
      title: p.name,
      url: `https://www.codechef.com/problems/${p.code}`,
      level: r < 1300 ? 'Beginner' : r < 1700 ? 'Intermediate' : 'Advanced',
      note: `CodeChef · rated ${r}`,
    };
  }).sort(byLevel);
}

// ---------- roadmap definitions ----------
const E = (n) => ({ Easy: n });
const take = (e, m, h) => ({ Easy: e, Medium: m, Hard: h });

const DEFS = [
  {
    title: 'DSA Practice: LeetCode, HackerRank & CodeChef',
    pairWith: 'DSA Roadmap (Striver A2Z)',
    intro: 'Practice questions for every DSA pattern. LeetCode picks are the most-liked questions for each topic, HackerRank and CodeChef add more reps. Inside each topic: Easy, then Medium, then Hard.',
    resources: [
      { title: 'LeetCode problem list', url: 'https://leetcode.com/problemset/' },
      { title: 'HackerRank Data Structures', url: 'https://www.hackerrank.com/domains/data-structures' },
      { title: 'HackerRank Algorithms', url: 'https://www.hackerrank.com/domains/algorithms' },
      { title: 'CodeChef practice', url: 'https://www.codechef.com/practice' },
    ],
    sections: [
      { title: 'Arrays & Hashing', lc: [['array', 'hash-table'], take(5, 7, 1)], hr: ['data-structures', /^arrays$/i, 3] },
      { title: 'Two Pointers & Sliding Window', lc: [['two-pointers', 'sliding-window'], take(3, 6, 2)] },
      { title: 'Strings', lc: [['string'], take(4, 6, 2)], hr: ['algorithms', /strings/i, 4] },
      { title: 'Binary Search', lc: [['binary-search'], take(4, 6, 2)], cc: 'binary-search' },
      { title: 'Stack & Queue', lc: [['stack', 'monotonic-stack', 'queue'], take(3, 6, 2)], hr: ['data-structures', /stacks|queues/i, 3] },
      { title: 'Linked List', lc: [['linked-list'], take(4, 6, 2)], hr: ['data-structures', /linked lists/i, 4] },
      { title: 'Trees & BST', lc: [['tree', 'binary-search-tree'], take(4, 7, 2)], hr: ['data-structures', /^trees$/i, 4] },
      { title: 'Heap / Priority Queue', lc: [['heap-priority-queue'], take(2, 6, 2)], hr: ['data-structures', /heap/i, 3] },
      { title: 'Graphs', lc: [['graph', 'breadth-first-search', 'depth-first-search', 'union-find', 'topological-sort'], take(3, 8, 3)], cc: 'graphs', hr: ['algorithms', /graph theory/i, 4] },
      { title: 'Backtracking & Recursion', lc: [['backtracking', 'recursion'], take(2, 6, 2)], hr: ['algorithms', /recursion|backtracking/i, 3] },
      { title: 'Dynamic Programming', lc: [['dynamic-programming'], take(4, 9, 3)], cc: 'dynamic-programming', hr: ['algorithms', /dynamic programming/i, 4] },
      { title: 'Greedy & Intervals', lc: [['greedy'], take(3, 7, 2)], hr: ['algorithms', /greedy/i, 4] },
      { title: 'Tries', lc: [['trie'], take(1, 4, 2)] },
      { title: 'Bit Manipulation', lc: [['bit-manipulation'], take(4, 4, 1)], hr: ['algorithms', /bit manipulation/i, 3] },
      { title: 'Math & Number Theory', lc: [['math', 'number-theory'], take(4, 5, 1)], hr: ['algorithms', /number theory|implementation/i, 3] },
    ],
  },
  {
    title: 'Python Practice: HackerRank & LeetCode',
    pairWith: 'Python Roadmap',
    intro: 'The full HackerRank Python track, topic by topic, plus the most-liked beginner LeetCode questions to apply it.',
    resources: [{ title: 'HackerRank Python', url: 'https://www.hackerrank.com/domains/python' }, { title: 'LeetCode Python study', url: 'https://leetcode.com/problemset/' }],
    sections: 'hr-track:python',
    extra: [{ title: 'Apply it on LeetCode', lc: [['array', 'string', 'hash-table'], take(8, 4, 0)] }],
  },
  {
    title: 'OOPS, LLD & Concurrency Practice: HackerRank & LeetCode',
    pairWith: 'OOPS Roadmap (takeUforward)',
    intro: 'Object-oriented practice in Java (classes, inheritance, interfaces, exceptions) from HackerRank, the LeetCode design questions that are the classic low-level-design exercises, and threads and locks practice for the Operating Systems roadmap.',
    resources: [{ title: 'HackerRank Java', url: 'https://www.hackerrank.com/domains/java' }, { title: 'LeetCode design questions', url: 'https://leetcode.com/tag/design/' }],
    sections: [
      { title: 'Classes, Inheritance & Interfaces (Java)', hr: ['java', /introduction|strings|oop|inherit|abstract|interface|exception|generics|advanced/i, 14] },
      { title: 'Design a data structure or system (LeetCode design)', lc: [['design'], take(5, 12, 3)] },
      { title: 'Threads, locks & synchronisation (OS)', lc: [['concurrency'], take(4, 8, 3)] },
    ],
  },
  {
    title: 'Aptitude & Math Practice: HackerRank & LeetCode',
    pairWith: 'Quantitative Aptitude Roadmap',
    intro: 'Number theory, combinatorics, probability and logic puzzles for quantitative and logical aptitude. HackerRank Mathematics plus LeetCode math and brain-teaser questions.',
    resources: [{ title: 'HackerRank Mathematics', url: 'https://www.hackerrank.com/domains/mathematics' }, { title: 'LeetCode brain teaser', url: 'https://leetcode.com/tag/brainteaser/' }],
    sections: [
      { title: 'Fundamentals', hr: ['mathematics', /fundamentals/i, 12] },
      { title: 'Number theory', hr: ['mathematics', /number theory/i, 10], lc: [['number-theory'], take(2, 3, 0)] },
      { title: 'Combinatorics & probability', hr: ['mathematics', /combinatorics|probability/i, 10] },
      { title: 'Logic puzzles', lc: [['brainteaser', 'math'], take(6, 6, 1)] },
    ],
  },
  {
    title: 'Frontend & React Practice: HackerRank',
    pairWith: 'React Frontend Roadmap',
    intro: 'HackerRank React challenges, grouped by topic, to practise what the React roadmap teaches.',
    resources: [{ title: 'HackerRank React', url: 'https://www.hackerrank.com/domains/react' }],
    sections: 'hr-track:react',
  },
  {
    title: 'AI, ML & Distributed Systems Practice: HackerRank',
    pairWith: 'ML Roadmap',
    intro: 'HackerRank Artificial Intelligence and Distributed Systems challenges, for the ML roadmap and the system design, Kafka and microservices roadmaps.',
    resources: [{ title: 'HackerRank AI', url: 'https://www.hackerrank.com/domains/ai' }, { title: 'HackerRank Distributed Systems', url: 'https://www.hackerrank.com/domains/distributed-systems' }],
    sections: 'hr-track:ai,distributed-systems',
  },
];

async function buildSections(def) {
  const taken = new Set();
  const sections = [];
  const push = (title, all) => { const items = all.filter((i) => !seenUrls.has(i.url) && seenUrls.add(i.url)); if (items.length) sections.push({ id: id(), title, items: items.map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i })) }); };
  if (typeof def.sections === 'string') {
    for (const track of def.sections.split(':')[1].split(',')) {
      const bySub = new Map();
      for (const c of await hackerrank(track)) {
        const key = c.track?.name ?? track;
        if (!bySub.has(key)) bySub.set(key, []);
        bySub.get(key).push(c);
      }
      for (const [name, list] of bySub) push(`${name} (${track})`, list.sort((a, b) => b.solved_count - a.solved_count).map(hrItem).sort(byLevel));
    }
  } else {
    for (const s of def.sections) {
      const items = [];
      if (s.lc) items.push(...(await lcPicks(s.lc[0], s.lc[1], taken)));
      if (s.cc) items.push(...(await codechefPicks(s.cc)));
      if (s.hr) items.push(...(await hrPicks(...s.hr)));
      push(s.title, items.sort(byLevel));
    }
  }
  for (const s of def.extra ?? []) push(s.title, await lcPicks(s.lc[0], s.lc[1], taken));
  return sections;
}

const seenUrls = new Set();
const built = [];
for (const def of DEFS) {
  console.log(`Building ${def.title}`);
  const sections = await buildSections(def);
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  console.log(`  ${total} questions in ${sections.length} topics`);
  built.push({
    id: id(),
    title: def.title,
    intro: def.intro,
    notionUrl: null,
    resources: def.resources,
    notes: [{ heading: 'How to use this list', lines: [`Pair it with the "${def.pairWith}" roadmap: learn a concept there, then solve that topic here.`, 'Every link opens the question on its own site; the note on each topic shows where it comes from.'] }],
    sections,
    pairWith: def.pairWith,
  });
}
fs.writeFileSync(path.join(root, 'seed', 'practice-roadmaps.json'), JSON.stringify(built, null, 2) + '\n');
console.log(`Wrote seed/practice-roadmaps.json (${built.reduce((n, r) => n + r.sections.reduce((m, s) => m + s.items.length, 0), 0)} questions)`);

if (process.argv.includes('--import')) {
  const { MongoClient } = await import('mongodb');
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
  const seedFile = path.join(root, 'seed', 'roadmaps.json');
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  for (const { pairWith, ...rm } of built) {
    if (await col.findOne({ title: rm.title })) { console.log(`${rm.title} already exists, skipped`); continue; }
    const after = await col.findOne({ title: pairWith });
    const position = after ? after.position + 0.5 : await col.countDocuments();
    const { id: _id, ...rest } = rm;
    await col.insertOne({ _id, ...rest, position, createdAt: new Date().toISOString() });
    console.log(`Added ${rm.title}`);
    if (!seed.some((r) => r.title === rm.title)) {
      const at = seed.findIndex((r) => r.title === pairWith);
      seed.splice(at >= 0 ? at + 1 : seed.length, 0, rm);
    }
  }
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  await client.close();
}
