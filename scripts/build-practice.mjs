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
  const query = `query q($f:QuestionListFilterInput){problemsetQuestionList:questionList(categorySlug:"",limit:300,skip:0,filters:$f){questions:data{questionFrontendId title titleSlug difficulty likes isPaidOnly topicTags{slug}}}}`;
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
// Most-liked questions for the given tags, `take` per difficulty, easiest first. A LeetCode
// question has several tags, so `exclude` drops ones that belong to another topic (a tree
// question tagged "depth-first-search" should not show up under Graphs).
async function lcPicks(tags, take, taken, exclude = []) {
  const all = new Map();
  for (const t of tags) for (const q of await leetcode(t)) all.set(q.titleSlug, q);
  const offTopic = (q) => (q.topicTags ?? []).some((t) => exclude.includes(t.slug));
  const items = [];
  for (const diff of ['Easy', 'Medium', 'Hard']) {
    const n = take[diff] ?? 0;
    [...all.values()]
      .filter((q) => q.difficulty === diff && !taken.has(q.titleSlug) && !offTopic(q))
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


async function getText(url, tries = 4) {
  if (disk[url]) return disk[url];
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
      if (res.ok) {
        const text = await res.text();
        disk[url] = text;
        fs.writeFileSync(CACHE_FILE, JSON.stringify(disk));
        return text;
      }
      console.warn(`  HTTP ${res.status} from ${new URL(url).host}, retrying`);
    } catch (e) { console.warn(`  ${e.message}, retrying`); }
    await sleep(2000 * 2 ** i);
  }
  return '';
}

// Every public LeetCode question's difficulty, by slug (used to level the takeUforward sheet).
let lcDiffs;
async function leetcodeDifficulties() {
  if (lcDiffs) return lcDiffs;
  lcDiffs = new Map();
  const query = `query q($skip:Int){problemsetQuestionList:questionList(categorySlug:"",limit:300,skip:$skip,filters:{}){total:totalNum questions:data{titleSlug difficulty}}}`;
  for (let skip = 0; skip < 6000; skip += 300) {
    const json = await getJson('https://leetcode.com/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query, variables: { skip } }),
    });
    await sleep(1200);
    const page = json?.data?.problemsetQuestionList;
    if (!page?.questions?.length) break;
    for (const q of page.questions) lcDiffs.set(q.titleSlug, q.difficulty);
    if (skip + 300 >= page.total) break;
  }
  return lcDiffs;
}

// All questions of a LeetCode category (e.g. "javascript").
async function leetcodeCategory(category) {
  const query = `query q($c:String){problemsetQuestionList:questionList(categorySlug:$c,limit:300,skip:0,filters:{}){questions:data{questionFrontendId title titleSlug difficulty likes isPaidOnly}}}`;
  const json = await getJson('https://leetcode.com/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { c: category } }),
  });
  await sleep(1200);
  return (json?.data?.problemsetQuestionList?.questions ?? []).filter((q) => !q.isPaidOnly);
}

// ---------- takeUforward A2Z sheet ----------
// The sheet page embeds its rows as data. Rows come in sheet order; a step starts at the first
// question listed in STEP_STARTS.
const STEP_STARTS = [
  ['Pattern 1', 'Learn the Basics'], ['Selection Sort', 'Sorting'], ['Linear Search', 'Arrays'],
  ['Search X in sorted array', 'Binary Search'], ['Remove Outermost Parentheses', 'Strings'],
  ['Pow(x,n)', 'Recursion & Backtracking'], ['Traversal in Linked List', 'Linked List'],
  ['Check if the i-th Bit is Set or Not', 'Bit Manipulation'], ['Assign Cookies', 'Greedy'],
  ['Maximum Points You Can Obtain from Cards', 'Sliding Window & Two Pointers'],
  ['Implement Stack using Arrays', 'Stack & Queue'], ['Inorder Traversal', 'Binary Trees'],
  ['Search in BST', 'Binary Search Trees'], ['Heapify Algorithm', 'Heaps'], ['Traversal Techniques', 'Graphs'],
  ['Climbing Stairs', 'Dynamic Programming'], ['Trie Implementation and Operations', 'Tries'],
  ['Reverse every word in a string', 'Advanced Strings'], ['Print all primes till N', 'Sieve & Number Theory'],
];
const clean = (t) => t.replace(/\\u0026/g, '&').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\'/g, "'").trim();
const humanize = (c) => c.replace(/--+/g, '-').replace(/\((.*?)\)/g, '$1').split('-').join(' ').replace(/^./, (m) => m.toUpperCase());

async function tufSteps() {
  const html = (await getText('https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/')).replace(/\\"/g, '"');
  const starts = [...html.matchAll(/\[\d+,\d+,"[^"]*","item","practice","/g)].map((m) => m.index);
  if (!starts.length) { console.warn('  takeUforward sheet returned no questions'); return []; }
  const diffs = await leetcodeDifficulties();
  const first = new Map(STEP_STARTS.map(([t, step]) => [t.toLowerCase(), step]));
  const steps = new Map();
  let step = 'Learn the Basics';
  starts.forEach((a, i) => {
    const seg = html.slice(a, starts[i + 1] ?? html.length);
    const m = seg.match(/^\[\d+,\d+,"([^"]*)","item","practice","([^"]*)"/);
    const slug = m[1];
    const title = clean(m[2]);
    step = first.get(title.toLowerCase()) ?? step;
    const cat = seg.match(/"category":"([^"]*)"/)?.[1] ?? '';
    const lc = seg.match(/"(https:\/\/leetcode\.com\/problems\/[^"]*)"/)?.[1];
    const diff = lc ? diffs.get(lc.split('/problems/')[1].replace(/\/.*$/, '')) : undefined;
    const level = diff ? LEVEL[diff]
      : /hard/.test(cat) ? 'Advanced'
      : /medium/.test(cat) ? 'Intermediate'
      : /easy|basic|fundamental|pattern|logic|theory|sieve|implementation$|^algorithms$/.test(cat) ? 'Beginner' : 'Intermediate';
    const url = `https://takeuforward.org/practice/dsa/${encodeURIComponent(slug).replace(/'/g, '%27')}`;
    const video = seg.match(/"(https:\/\/(?:youtu\.be|www\.youtube\.com)[^"]*)"/)?.[1];
    const blog = seg.match(/"(\/blogs\/[^"]*)"/)?.[1];
    const item = {
      title,
      url,
      level,
      note: `takeUforward A2Z · ${humanize(cat)}`,
      // Every place to work on the question, shown as buttons on the row.
      links: [
        { kind: 'practice', site: 'TUF', url },
        lc && { kind: 'practice', site: 'LeetCode', url: lc },
        blog && { kind: 'article', site: 'TUF', url: `https://takeuforward.org${clean(blog)}` },
        video && { kind: 'video', site: 'YouTube', url: clean(video) },
      ].filter(Boolean),
    };
    if (!steps.has(step)) steps.set(step, []);
    steps.get(step).push(item);
  });
  return [...steps].map(([name, items]) => ({ title: `Striver A2Z: ${name}`, items }));
}

// ---------- roadmap definitions ----------
const E = (n) => ({ Easy: n });
const take = (e, m, h) => ({ Easy: e, Medium: m, Hard: h });

const DEFS = [
  {
    title: 'DSA Practice: LeetCode, HackerRank & CodeChef',
    pairWith: 'DSA Roadmap (Striver A2Z)',
    tuf: true,
    intro: 'Practice questions for every DSA pattern. LeetCode picks are the most-liked questions for each topic, HackerRank and CodeChef add more reps. Inside each topic: Easy, then Medium, then Hard.',
    resources: [
      { title: 'LeetCode problem list', url: 'https://leetcode.com/problemset/' },
      { title: 'HackerRank Data Structures', url: 'https://www.hackerrank.com/domains/data-structures' },
      { title: 'HackerRank Algorithms', url: 'https://www.hackerrank.com/domains/algorithms' },
      { title: 'CodeChef practice', url: 'https://www.codechef.com/practice' },
    ],
    sections: [
      // lc: [tags, how many per difficulty, tags that mean the question belongs to another topic]
      { title: 'Arrays & Hashing', lc: [['array', 'hash-table'], take(5, 7, 1), ['string', 'linked-list', 'tree', 'binary-tree', 'graph', 'matrix', 'binary-search', 'two-pointers', 'sliding-window', 'depth-first-search', 'breadth-first-search', 'dynamic-programming', 'backtracking']], hr: ['data-structures', /^arrays$/i, 3] },
      { title: 'Two Pointers & Sliding Window', lc: [['two-pointers', 'sliding-window'], take(3, 6, 2), ['linked-list', 'tree', 'binary-tree']] },
      { title: 'Strings', lc: [['string'], take(4, 6, 2), ['backtracking', 'dynamic-programming', 'breadth-first-search', 'depth-first-search', 'trie']], hr: ['algorithms', /strings/i, 4] },
      { title: 'Binary Search', lc: [['binary-search'], take(4, 6, 2), ['dynamic-programming', 'sliding-window', 'tree', 'binary-tree']], cc: 'binary-search' },
      { title: 'Stack & Queue', lc: [['stack', 'monotonic-stack', 'queue'], take(3, 6, 2), ['tree', 'binary-tree', 'linked-list', 'counting', 'graph']], hr: ['data-structures', /stacks|queues/i, 3] },
      { title: 'Linked List', lc: [['linked-list'], take(4, 6, 2), ['tree', 'binary-tree']], hr: ['data-structures', /linked lists/i, 4] },
      { title: 'Trees & BST', lc: [['tree', 'binary-search-tree'], take(4, 7, 2), ['graph']], hr: ['data-structures', /^trees$/i, 4] },
      { title: 'Heap / Priority Queue', lc: [['heap-priority-queue'], take(2, 6, 2), ['graph', 'shortest-path']], hr: ['data-structures', /heap/i, 3] },
      // DFS / BFS tags also cover trees and grids; real graph questions carry these tags.
      { title: 'Graphs', lc: [['graph', 'topological-sort', 'union-find', 'shortest-path', 'minimum-spanning-tree'], take(3, 8, 3), ['tree', 'binary-tree', 'dynamic-programming']], cc: 'graphs', hr: ['algorithms', /graph theory/i, 4] },
      { title: 'Backtracking & Recursion', lc: [['backtracking', 'recursion'], take(2, 6, 2), ['linked-list', 'dynamic-programming', 'tree', 'binary-tree']], hr: ['algorithms', /recursion|backtracking/i, 3] },
      { title: 'Dynamic Programming', lc: [['dynamic-programming'], take(4, 9, 3), ['bit-manipulation', 'tree', 'binary-tree']], cc: 'dynamic-programming', hr: ['algorithms', /dynamic programming/i, 4] },
      { title: 'Greedy & Intervals', lc: [['greedy'], take(3, 7, 2), ['dynamic-programming', 'stack', 'tree']], hr: ['algorithms', /greedy/i, 4] },
      { title: 'Tries', lc: [['trie'], take(1, 4, 2)] },
      { title: 'Bit Manipulation', lc: [['bit-manipulation'], take(4, 4, 1), ['backtracking', 'tree', 'binary-tree', 'dynamic-programming', 'depth-first-search', 'breadth-first-search', 'graph']], hr: ['algorithms', /bit manipulation/i, 3] },
      { title: 'Math & Number Theory', lc: [['math', 'number-theory'], take(4, 5, 1), ['matrix', 'design', 'tree', 'binary-search-tree', 'dynamic-programming', 'linked-list', 'array']], hr: ['algorithms', /number theory|implementation/i, 3] },
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
    title: 'JavaScript Practice: LeetCode',
    pairWith: 'React Frontend Roadmap',
    intro: 'LeetCode JavaScript questions: closures, promises and async code, array and object utilities, classes and method chaining. These are the JavaScript-specific interview exercises, grouped by theme.',
    resources: [{ title: 'LeetCode 30 Days of JavaScript', url: 'https://leetcode.com/studyplan/30-days-of-javascript/' }, { title: 'LeetCode JavaScript questions', url: 'https://leetcode.com/problemset/javascript/' }],
    sections: 'lc-category:javascript',
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
  if (typeof def.sections === 'string' && def.sections.startsWith('lc-category:')) {
    const THEMES = [
      ['Closures & higher-order functions', /counter|once|call|memoize|compose|curry|debounce|throttle|function|bind|partial/i],
      ['Promises & async', /sleep|promise|timeout|interval|cancel|cache with time|async|delay|limit|pool/i],
      ['Arrays & objects', /array|chunk|flatten|group|compact|object|deep|json|join|sort|filter|map|reduce|inversion|difference|key|merge/i],
      ['Classes, events & chaining', /class|event|emitter|calculator|chain|wrapper|instance|prototype|temperature/i],
    ];
    const buckets = new Map([...THEMES.map(([t]) => [t, []]), ['More JavaScript', []]]);
    for (const q of await leetcodeCategory(def.sections.split(':')[1])) {
      const theme = THEMES.find(([, re]) => re.test(q.title))?.[0] ?? 'More JavaScript';
      buckets.get(theme).push({ title: q.title, url: `https://leetcode.com/problems/${q.titleSlug}/`, level: LEVEL[q.difficulty], note: `LeetCode #${q.questionFrontendId} · ${q.likes.toLocaleString('en-US')} likes` });
    }
    for (const [theme, items] of buckets) push(theme, items.sort(byLevel));
  } else if (typeof def.sections === 'string') {
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
      if (s.lc) items.push(...(await lcPicks(s.lc[0], s.lc[1], taken, s.lc[2])));
      if (s.cc) items.push(...(await codechefPicks(s.cc)));
      if (s.hr) items.push(...(await hrPicks(...s.hr)));
      push(s.title, items.sort(byLevel));
    }
  }
  if (def.tuf) for (const st of await tufSteps()) push(st.title, st.items);
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
    const existing = await col.findOne({ title: rm.title });
    if (existing) {
      // Add topics that are missing. A topic whose questions changed is replaced only when
      // nothing in it has been started, so ticked questions and their dates are never lost.
      const entry = seed.find((r) => r.title === rm.title);
      const urls = (s) => s.items.map((i) => i.url).join('\n');
      const untouched = (s) => s.items.every((i) => i.status === 'not_started' && !i.doneAt);
      let added = 0, replaced = 0, kept = 0;
      for (const s of rm.sections) {
        const cur = existing.sections.find((x) => x.title === s.title);
        if (!cur) { existing.sections.push(s); entry?.sections.push(s); added++; continue; }
        if (urls(cur) === urls(s)) continue;
        if (!untouched(cur)) { kept++; continue; }
        cur.items = s.items;
        const seedSec = entry?.sections.find((x) => x.title === s.title);
        if (seedSec) seedSec.items = s.items;
        replaced++;
      }
      if (added || replaced) await col.updateOne({ _id: existing._id }, { $set: { sections: existing.sections } });
      console.log(`${rm.title}: ${added} topics added, ${replaced} refreshed${kept ? `, ${kept} kept because they have progress` : ''}`);
      continue;
    }
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
  // Backfill `links` (and the tidied TUF note) onto questions that were imported before links
  // existed, matching by URL. Status, done dates and anything else on the question are kept.
  const fresh = new Map(built.flatMap((r) => r.sections.flatMap((s) => s.items)).filter((i) => i.links).map((i) => [i.url, i]));
  const patch = (it) => {
    const src = fresh.get(it.url);
    if (!src || JSON.stringify(it.links) === JSON.stringify(src.links)) return false;
    it.links = src.links;
    if (!it.note || it.note.startsWith('takeUforward A2Z')) it.note = src.note;
    return true;
  };
  for (const rm of built) {
    const doc = await col.findOne({ title: rm.title });
    if (!doc) continue;
    let n = 0;
    for (const s of doc.sections) for (const it of s.items) if (patch(it)) n++;
    if (n) {
      await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
      console.log(`${rm.title}: added links to ${n} questions`);
    }
    const entry = seed.find((r) => r.title === rm.title);
    if (entry) for (const s of entry.sections) for (const it of s.items) patch(it);
  }
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  await client.close();
}
