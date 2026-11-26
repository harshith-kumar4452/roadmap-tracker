// Adds the "JavaScript Roadmap (Chai aur Code)" built from the 51 videos of the Chai aur
// Javascript playlist (Hindi), laid out like the Node.js Chai aur Code roadmap: numbered video
// titles grouped into topics, a level per topic, and notes on what the series leaves out. Each
// topic then gets practice questions from HackerRank, Exercism and LeetCode after its videos.
// Creates the roadmap only if it isn't there yet; practice questions are added by URL, so
// running it again adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-js-roadmap.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');

const TITLE = 'JavaScript Roadmap (Chai aur Code)';
const LIST = 'PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37';
const B = 'Beginner', I = 'Intermediate', A = 'Advanced';

// [videoId, title, level] in playlist order, grouped into topics. Titles are cleaned up from
// the video names (the "| chai aur #javascript" suffix dropped); the number is the playlist index.
const TOPICS = [
  ['Getting Started', [
    ['Hr5iLG7sUa0', 'JavaScript for beginners', B],
    ['cvoLc3deAdQ', 'Setting up the environment on your machine', B],
    ['-GoKoR6aLcY', 'Save and work on GitHub', B],
  ]],
  ['Variables and Data Types', [
    ['yY0bKZNYmJs', 'let, const and var', B],
    ['-9knnv97wSc', 'Data types and ECMA standards', B],
    ['X7hDBhd_L5U', 'Data type conversion', B],
    ['N9el4APFtAo', 'Why string to number conversion is confusing', B],
    ['giP2uXMlv4c', 'Comparing data types', B],
    ['suMvZWjjKbo', 'Data types summary', B],
    ['7gwc-1czolw', 'Stack and heap memory', B],
  ]],
  ['Strings, Numbers and Dates', [
    ['fozwNnFunlo', 'Strings', B],
    ['_KqpeDc47Ro', 'Numbers and Math', B],
    ['tGLCuoumaGY', 'Date and time in depth', B],
  ]],
  ['Arrays and Objects', [
    ['cejBux2gtEE', 'Arrays', B],
    ['m6azhgyCi-k', 'Arrays part 2', B],
    ['vVYOHmqQDCU', 'Objects in depth', B],
    ['4lb2pXWWXJI', 'Objects part 2', B],
    ['AViTh83k-IE', 'Object destructuring and intro to JSON APIs', B],
  ]],
  ['Functions and Scope', [
    ['Bn56WahG_t0', 'Functions and parameters', I],
    ['t7ZHPhgdA4U', 'Functions with objects and arrays', I],
    ['cHHU0jXfjKY', 'Global and local scope', I],
    ['eWwge2YpHhc', 'Scope levels and hoisting', I],
    ['9ksqBa8_txM', 'this and arrow functions', I],
    ['GAIbn16Iytc', 'Immediately invoked function expressions (IIFE)', I],
    ['ByhtOgF6uYM', 'How JavaScript executes code, and the call stack', I],
  ]],
  ['Control Flow and Loops', [
    ['0P_YvC6Gg0c', 'Control flow in one shot', B],
    ['Y1cpFsXrEgY', 'for loops with break and continue', B],
    ['w3Q55-l47P0', 'while and do-while loops', B],
    ['M0YImBHQsWU', 'Higher-order array loops', I],
    ['9MfwYoWKKVE', 'filter, map and reduce', I],
  ]],
  ['DOM and Events', [
    ['DcjNkHtDj8A', 'Introduction to the DOM', I],
    ['Ab6K57WjWTE', 'DOM selectors, NodeList and HTMLCollection', I],
    ['xAvTgCsCHLs', 'Creating new elements in the DOM', I],
    ['VQlY-X_eeTE', 'Editing and removing elements', I],
    ['EGqHVjU-fas', 'Build 4 JavaScript projects for beginners', I],
    ['_ALUMTa8BAE', 'Events', I],
  ]],
  ['Async JavaScript', [
    ['zgt5oTD3rRc', 'Async JavaScript fundamentals', I],
    ['efrW5-IYoCU', '2 projects with async JavaScript', I],
    ['pDPAcYdSse8', 'API requests and the V8 engine', A],
    ['NJwRQgsu1Q8', 'Promises', A],
    ['Rive84an6Lc', 'fetch', A],
  ]],
  ['OOP and Prototypes', [
    ['pN-Qmv4zBcI', 'Object-oriented JavaScript', A],
    ['uMI5cNeHTOc', 'Prototypes', A],
    ['-owpuf4lbyU', 'call and this', A],
    ['u6mVHkMpoMk', 'Class, constructor and static', A],
    ['75dMiOY_4ac', 'bind', A],
    ['jss2rL9kv6s', 'Objects, revisited', A],
    ['t6vLhF-iSxQ', 'Getters, setters and stack overflow', A],
  ]],
  ['Closures and Engine Internals', [
    ['VaH09NXQZ58', 'Lexical scoping and closures', A],
    ['z9PINyinqwo', 'JavaScript ends with a story', A],
    ['ZRS485LxX0s', 'Arrays inside V8: packed vs holey, JSVU and V8 debug', A],
  ]],
];

// Practice for each topic, from three sites. Every question is checked against the site's own
// data before it is added (LeetCode's question list, HackerRank's challenge lookup, Exercism's
// track config on GitHub), so a renamed or removed question is skipped, not linked.
//   hr: HackerRank "10 Days of JavaScript" challenge slugs
//   ex: Exercism JavaScript exercise slugs (concept and practice exercises)
//   lc: LeetCode JavaScript question slugs (free ones only)
const PRACTICE = {
  'Getting Started': { hr: ['js10-hello-world'], ex: ['hello-world', 'lasagna'] },
  'Variables and Data Types': {
    hr: ['js10-data-types', 'js10-let-and-const', 'js10-arithmetic-operators'],
    ex: ['freelancer-rates', 'lucky-numbers', 'amusement-park', 'recycling-robot'],
  },
  'Strings, Numbers and Dates': {
    hr: ['js10-template-literals', 'js10-bitwise', 'js10-date', 'js10-regexp-2', 'js10-regexp-3'],
    ex: ['poetry-club-door-policy', 'custom-signs', 'appointment-time', 'regular-chatbot', 'two-fer', 'reverse-string', 'pangram', 'gigasecond'],
  },
  'Arrays and Objects': {
    hr: ['js10-arrays', 'js10-objects', 'js10-count-objects'],
    ex: ['elyses-enchantments', 'high-score-board', 'elyses-destructured-enchantments', 'train-driver', 'ozans-playlist'],
    lc: ['chunk-array', 'is-object-empty', 'compact-object', 'group-by', 'join-two-arrays-by-id', 'flatten-deeply-nested-array', 'snail-traversal'],
  },
  'Functions and Scope': {
    hr: ['js10-function', 'js10-arrows'],
    ex: ['lasagna-master', 'fruit-picker', 'pizza-order'],
    lc: ['create-hello-world-function', 'return-length-of-arguments-passed', 'function-composition', 'allow-one-function-call'],
  },
  'Control Flow and Loops': {
    hr: ['js10-if-else', 'js10-switch', 'js10-loops', 'js10-try-catch-and-finally', 'js10-throw'],
    ex: ['annalyns-infiltration', 'vehicle-purchase', 'bird-watcher', 'mixed-juices', 'elyses-looping-enchantments', 'elyses-analytic-enchantments', 'elyses-transformative-enchantments'],
    lc: ['apply-transform-over-each-element-in-array', 'filter-elements-from-array', 'array-reduce-transformation', 'sort-by'],
  },
  'DOM and Events': { hr: ['js10-create-a-button', 'js10-buttons-container', 'js10-binary-calculator'] },
  'Async JavaScript': {
    ex: ['translation-service', 'promises'],
    lc: ['sleep', 'add-two-promises', 'timeout-cancellation', 'interval-cancellation', 'promise-time-limit', 'cache-with-time-limit', 'debounce', 'execute-asynchronous-functions-in-parallel'],
  },
  'OOP and Prototypes': {
    hr: ['js10-class', 'js10-inheritance'],
    ex: ['windowing-system', 'factory-sensors'],
    lc: ['array-prototype-last', 'calculator-with-method-chaining', 'array-wrapper', 'event-emitter', 'call-function-with-custom-context', 'check-if-object-instance-of-class'],
  },
  'Closures and Engine Internals': {
    ex: ['coordinate-transformation'],
    lc: ['counter', 'counter-ii', 'to-be-or-not-to-be', 'memoize', 'memoize-ii', 'generate-fibonacci-sequence', 'nested-array-generator', 'design-cancellable-function'],
  },
};
const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function practiceSources() {
  const query = `query q($c:String){problemsetQuestionList:questionList(categorySlug:$c,limit:300,skip:0,filters:{}){questions:data{questionFrontendId title titleSlug difficulty isPaidOnly}}}`;
  const lcRes = await fetch('https://leetcode.com/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { c: 'javascript' } }),
  }).then((r) => r.json());
  const lc = new Map(lcRes.data.problemsetQuestionList.questions.filter((q) => !q.isPaidOnly).map((q) => [q.titleSlug, q]));
  const config = await fetch('https://raw.githubusercontent.com/exercism/javascript/main/config.json').then((r) => r.json());
  const ex = new Map();
  for (const e of config.exercises.concept) if (e.status !== 'deprecated') ex.set(e.slug, { ...e, kind: 'concept' });
  for (const e of config.exercises.practice) if (e.status !== 'deprecated') ex.set(e.slug, { ...e, kind: 'practice' });
  const hr = new Map();
  for (const slug of new Set(Object.values(PRACTICE).flatMap((p) => p.hr ?? []))) {
    const res = await fetch(`https://www.hackerrank.com/rest/contests/master/challenges/${slug}`);
    const m = res.ok ? (await res.json()).model : null;
    if (m?.name) hr.set(slug, m);
    await sleep(400);
  }
  return { lc, ex, hr };
}

function practiceItems(topic, src) {
  const p = PRACTICE[topic] ?? {};
  const items = [];
  const skip = (site, slug) => console.warn(`  ${topic}: ${site} "${slug}" not found, skipped`);
  for (const slug of p.hr ?? []) {
    const m = src.hr.get(slug);
    if (!m) { skip('HackerRank', slug); continue; }
    items.push({ title: m.name.replace(/^Day \d+: /, ''), url: `https://www.hackerrank.com/challenges/${slug}/problem`, level: LEVEL[m.difficulty_name] ?? 'Beginner', note: `Practice · HackerRank · 10 Days of JavaScript, ${m.name.match(/^Day \d+/)?.[0] ?? ''}`.replace(/, $/, '') });
  }
  for (const slug of p.ex ?? []) {
    const e = src.ex.get(slug);
    if (!e) { skip('Exercism', slug); continue; }
    const level = e.kind === 'concept' ? 'Beginner' : e.difficulty <= 3 ? 'Beginner' : e.difficulty <= 6 ? 'Intermediate' : 'Advanced';
    const about = e.kind === 'concept' ? `learning exercise: ${(e.concepts ?? []).join(', ').replace(/-/g, ' ')}` : `practice exercise, difficulty ${e.difficulty}/10`;
    items.push({ title: e.name, url: `https://exercism.org/tracks/javascript/exercises/${slug}`, level, note: `Practice · Exercism · ${about}` });
  }
  for (const slug of p.lc ?? []) {
    const q = src.lc.get(slug);
    if (!q) { skip('LeetCode', slug); continue; }
    items.push({ title: q.title, url: `https://leetcode.com/problems/${slug}/`, level: LEVEL[q.difficulty], note: `Practice · LeetCode #${q.questionFrontendId}` });
  }
  const order = ['Beginner', 'Intermediate', 'Advanced'];
  return items
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
    .map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
}

let n = 0;
const sections = TOPICS.map(([title, videos]) => ({
  id: id(),
  title,
  items: videos.map(([vid, name, level]) => {
    n += 1;
    return {
      id: id(),
      title: `${n}. ${name}`,
      url: `https://www.youtube.com/watch?v=${vid}&list=${LIST}&index=${n}`,
      level,
      status: 'not_started',
      doneAt: null,
      note: '',
    };
  }),
}));

const roadmap = {
  title: TITLE,
  intro: `JavaScript from first principles to engine internals: data types, functions and scope, the DOM, async code and promises, prototypes and classes, then closures. This roadmap covers all ${n} videos of the Chai aur Javascript series (Hindi), in playlist order. All videos are free. Level labels are my own.`,
  notionUrl: null,
  resources: [
    { title: `Chai aur Javascript playlist (${n} videos, Hindi)`, url: `https://www.youtube.com/playlist?list=${LIST}` },
    { title: 'MDN: JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
    { title: 'javascript.info', url: 'https://javascript.info/' },
    { title: 'roadmap.sh: JavaScript Roadmap', url: 'https://roadmap.sh/javascript' },
  ],
  notes: [
    {
      heading: 'Not covered by the playlist',
      lines: [
        'ES modules (import / export) and how bundlers use them',
        'Error handling in depth: try / catch / finally, custom errors, async errors',
        'Modern syntax: optional chaining, nullish coalescing, spread / rest in depth',
        'Map, Set, WeakMap, iterators and generators',
        'async / await patterns: running in parallel, timeouts, cancelling with AbortController',
        'Tooling: npm, linting, and testing JavaScript code',
      ],
    },
    {
      heading: 'Mini project',
      lines: [
        'Build a small app with no framework: a task board that renders from an array, edits the DOM on events, saves to localStorage, and loads data from a public API with fetch, showing loading and error states. Then refactor it into classes and ES modules.',
      ],
    },
    {
      heading: 'Fill the gaps with your other roadmaps',
      lines: [
        'Practise closures, promises and array utilities: JavaScript Practice: LeetCode (after the Functions and Async topics).',
        'Build UIs with components and state: React Frontend Roadmap, then Frontend & React Practice: HackerRank.',
        'Run JavaScript on the server: Node.js Backend Roadmap (Chai aur Code).',
        'Save and share your code: Git Roadmap.',
      ],
    },
  ],
  sections,
};

console.log(`${TITLE}: ${n} videos in ${sections.length} topics`);
if (n !== 51) console.warn(`Warning: expected 51 videos, have ${n}`);

const src = await practiceSources();
const practice = Object.fromEntries(TOPICS.map(([title]) => [title, practiceItems(title, src)]));
const total = Object.values(practice).reduce((s, list) => s + list.length, 0);
console.log(`Practice: ${total} questions (${Object.entries(practice).map(([t, l]) => `${t} ${l.length}`).join(', ')})`);
if (DRY) process.exit(0);

// Append each topic's practice after its videos, skipping any question already there (by URL),
// so re-running never duplicates and never touches progress.
function addPractice(secs) {
  let added = 0;
  for (const s of secs) {
    const have = new Set(s.items.map((i) => i.url));
    const fresh = (practice[s.title] ?? []).filter((i) => !have.has(i.url));
    s.items.push(...fresh);
    added += fresh.length;
  }
  return added;
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
let doc = await col.findOne({ title: TITLE });
if (!doc) {
  // Learn the language, then React: sit just before the React roadmap.
  const react = await col.findOne({ title: 'React Frontend Roadmap' });
  const position = react ? react.position - 0.5 : await col.countDocuments();
  doc = { _id: id(), ...roadmap, position, createdAt: new Date().toISOString() };
  await col.insertOne(doc);
  console.log(`Added ${TITLE} with id ${doc._id}`);
}
const addedDb = addPractice(doc.sections);
if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
console.log(`Database: added ${addedDb} practice questions`);
await client.close();

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
let entry = seed.find((r) => r.title === TITLE);
if (!entry) {
  entry = { id: doc._id, ...roadmap };
  const at = seed.findIndex((r) => r.title === 'React Frontend Roadmap');
  seed.splice(at >= 0 ? at : seed.length, 0, entry);
}
const addedSeed = addPractice(entry.sections);
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
console.log(`seed/roadmaps.json: added ${addedSeed} practice questions`);
