// Adds the "JavaScript Roadmap (Chai aur Code)" built from the 51 videos of the Chai aur
// Javascript playlist (Hindi), laid out like the Node.js Chai aur Code roadmap: numbered video
// titles grouped into topics, a level per topic, and notes on what the series leaves out.
// Adds it to MongoDB and seed/roadmaps.json only if a roadmap with this title isn't there yet.
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
if (DRY) process.exit(0);

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const _id = id();
if (await col.findOne({ title: TITLE })) {
  console.log(`${TITLE} already exists, nothing added`);
} else {
  // Learn the language, then React: sit just before the React roadmap.
  const react = await col.findOne({ title: 'React Frontend Roadmap' });
  const position = react ? react.position - 0.5 : await col.countDocuments();
  await col.insertOne({ _id, ...roadmap, position, createdAt: new Date().toISOString() });
  console.log(`Added ${TITLE} with id ${_id}`);
}
await client.close();

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
if (!seed.some((r) => r.title === TITLE)) {
  const at = seed.findIndex((r) => r.title === 'React Frontend Roadmap');
  seed.splice(at >= 0 ? at : seed.length, 0, { id: _id, ...roadmap });
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  console.log('Added it to seed/roadmaps.json');
}
