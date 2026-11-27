// Adds practice to two system design roadmaps:
//   "System Design Roadmap – HLD & LLD"  (grouped under the lesson it practises)
//   "System Design: Missing Topics and Video Map"  (grouped per section)
// TUF first: the 12 interview problems of TUF's LLD course (each a Design page, with its Code page
// as a second link). Where TUF has nothing, other sites: LeetCode design questions (free only) and
// the System Design Primer's worked HLD solutions on GitHub. Every page and question is checked on
// its site before it is added. Questions shared with other roadmaps (LRU Cache, the concurrency
// set...) stay in sync. Added by URL: re-running adds only what is missing, never resets progress.
// Usage: node --env-file=.env scripts/import-system-design-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// TUF LLD interview problems: [title, design page slug, code page slug]
const TUF = [
  ['Parking Lot', 'parking-lot-lld-part-1', 'parking-lot-lld-part-2'],
  ['Logging Framework', 'designing-logging-framework-part-1', 'designing-logging-framework-part-2'],
  ['Traffic Signal System', 'traffic-signal-system-design', 'traffic-signal-system-code'],
  ['Vending Machine', 'vending-machine-design', 'vending-machine-code'],
  ['Task Management System', 'task-management-system-design', 'task-management-system-code'],
  ['Pub-Sub System', 'pubsub-system-design', 'pubsub-system-code'],
  ['ATM Machine', 'atm-machine-design', 'atm-machine-code'],
  ['Hotel Management System', 'hotel-management-system-design', 'hotel-management-system-code'],
  ['Elevator System', 'elevator-system-design', 'elevator-system-code'],
  ['Digital Wallet', 'digital-wallet-design', 'digital-wallet-code'],
  ['Ride Booking App', 'ride-booking-app-design', 'ride-booking-app-code'],
  ['Music Streaming Platform', 'music-streaming-platform-design', 'music-streaming-platform-code'],
];
const PRIMER = { pastebin: 'Pastebin / Bit.ly', twitter: 'Twitter timeline and search', web_crawler: 'Web crawler', mint: 'Mint.com', social_graph: 'Social network graph', query_cache: 'Key-value cache for search queries', sales_rank: "Amazon's sales rank by category", scaling_aws: 'Scale to millions of users on AWS' };

// Reusable groups of [site, slug, what it practises]
const LC = (slug, why) => ['lc', slug, why];
const CONCURRENCY = [
  LC('print-in-order', 'ordering threads'), LC('print-foobar-alternately', 'two threads taking turns'), LC('print-zero-even-odd', 'three threads coordinating'),
  LC('fizz-buzz-multithreaded', 'four threads sharing a counter'), LC('building-h2o', 'barrier / semaphore pattern'), LC('the-dining-philosophers', 'avoiding deadlock and starvation'),
];
const BEHAVIOURAL = [
  LC('peeking-iterator', 'Iterator pattern'), LC('flatten-nested-list-iterator', 'Iterator pattern over a composite'), LC('binary-search-tree-iterator', 'Iterator pattern'),
  LC('event-emitter', 'Observer pattern'), LC('design-browser-history', 'back / forward history, as in Command / Memento'),
];
const CACHING = [LC('lru-cache', 'LRU eviction'), LC('lfu-cache', 'LFU eviction')];
const LOAD_BALANCING = [LC('find-servers-that-handled-most-number-of-requests', 'round-robin style request assignment'), LC('process-tasks-using-servers', 'assigning work to free servers')];
const API = [LC('encode-and-decode-tinyurl', 'a URL shortener API'), ['ex', 'rest-api', 'designing a small REST API']];
const AUTH = [LC('design-authentication-manager', 'expiring and renewing tokens')];
const LLD_PROBLEMS = [...TUF.map(([, d]) => ['tuf', d]), LC('design-parking-system', 'a parking lot, warm-up'), LC('snakes-and-ladders', 'Snake and Ladder board logic'), LC('design-hashmap', 'HashMap internals'), LC('design-underground-system', 'a check-in / check-out system')];
const KV = [LC('time-based-key-value-store', 'a versioned key-value store')];
const CASE_STUDIES = [...['pastebin', 'twitter', 'web_crawler', 'social_graph', 'query_cache', 'sales_rank', 'mint'].map((p) => ['primer', p]), LC('design-twitter', 'a small Twitter: follow and news feed')];

const ROADMAPS = {
  'System Design Roadmap – HLD & LLD': {
    byLesson: true, // keys are lesson titles; practice is grouped under each lesson
    practice: {
      'Scalability & System Design Basics': [['primer', 'scaling_aws']],
      'Load Balancing & Proxies': LOAD_BALANCING,
      'Caching (Redis & Cache Strategies)': [...CACHING, ...KV],
      'API Design': API,
      'LLD Intro & How to Approach an Interview': [LC('design-parking-system', 'a parking lot, warm-up')],
      'Creational Design Patterns': [LC('calculator-with-method-chaining', 'a fluent, builder-style API')],
      'Behavioural Design Patterns': BEHAVIOURAL,
      'Authentication & Security': AUTH,
      'HLD Case Studies': CASE_STUDIES,
      'Multithreading and Concurrency': CONCURRENCY,
      'LLD Interview Problems': LLD_PROBLEMS.filter(([s, slug]) => s === 'tuf' || slug !== 'design-parking-system'),
    },
  },
  'System Design: Missing Topics and Video Map': {
    byLesson: false, // keys are section titles
    practice: {
      'LLD › Creational Design Patterns': [LC('calculator-with-method-chaining', 'a fluent, builder-style API')],
      'LLD › Behavioural Design Patterns': BEHAVIOURAL,
      'LLD › Multithreading and Concurrency': CONCURRENCY,
      'LLD › LLD Interview Problems': LLD_PROBLEMS,
      'HLD › Interview Strategy, Scalability and Capacity': [['primer', 'scaling_aws']],
      'HLD › Networking, Load Balancing and Proxies': LOAD_BALANCING,
      'HLD › Caching and Databases': CACHING,
      'HLD › CAP, Consistency, Hashing and Replication': KV,
      'HLD › API Design and Security': [...API, ...AUTH],
      'HLD › Case Studies': CASE_STUDIES,
    },
  },
};
const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];

async function lookup() {
  const refs = new Map();
  for (const r of Object.values(ROADMAPS)) for (const list of Object.values(r.practice)) for (const [site, slug, why] of list) refs.set(`${site}:${slug}`, { site, slug, why });
  const ex = await fetch('https://raw.githubusercontent.com/exercism/javascript/main/config.json').then((r) => r.json());
  const exAll = new Map([...ex.exercises.concept, ...ex.exercises.practice].map((e) => [e.slug, e]));
  const found = new Map();
  for (const [key, { site, slug, why }] of refs) {
    let item = null;
    if (site === 'tuf') {
      const [name, , code] = TUF.find(([, d]) => d === slug);
      const ok = async (s) => { const r = await fetch(`https://takeuforward.org/learning/design/${s}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return r.ok && /DESIGN Learning/.test(await r.text()); };
      if (await ok(slug)) {
        const url = `https://takeuforward.org/learning/design/${slug}`;
        const codeUrl = `https://takeuforward.org/learning/design/${code}`;
        const links = [{ kind: 'practice', site: 'TUF', url }];
        if (await ok(code)) links.push({ kind: 'article', site: 'TUF', url: codeUrl });
        item = { title: `Design ${name}`, url, level: 'Advanced', links, note: 'Practice · TUF · LLD interview problem: design first, then the code walkthrough' };
      }
      await sleep(300);
    } else if (site === 'primer') {
      const r = await fetch(`https://raw.githubusercontent.com/donnemartin/system-design-primer/master/solutions/system_design/${slug}/README.md`);
      if (r.ok) item = { title: `Design ${PRIMER[slug]}`, url: `https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/${slug}/README.md`, level: 'Advanced', note: 'Practice · System Design Primer · try the design yourself, then compare with the worked solution' };
    } else if (site === 'ex') {
      const e = exAll.get(slug);
      if (e && e.status !== 'deprecated') item = { title: e.name, url: `https://exercism.org/tracks/javascript/exercises/${slug}`, level: e.difficulty <= 3 ? 'Beginner' : e.difficulty <= 6 ? 'Intermediate' : 'Advanced', note: `Practice · Exercism (JavaScript) · ${why}` };
    } else {
      const query = 'query q($s:String!){question(titleSlug:$s){questionFrontendId title difficulty isPaidOnly}}';
      const r = await fetch('https://leetcode.com/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' }, body: JSON.stringify({ query, variables: { s: slug } }) }).then((x) => x.json()).catch(() => null);
      const q = r?.data?.question;
      if (q && !q.isPaidOnly) item = { title: q.title, url: `https://leetcode.com/problems/${slug}/`, level: LEVEL[q.difficulty], note: `Practice · LeetCode #${q.questionFrontendId} · ${why}` };
      await sleep(500);
    }
    if (item) found.set(key, item);
    else console.warn(`  ${site} "${slug}" not found or premium, skipped`);
  }
  return found;
}

const found = await lookup();
function planFor(title) {
  const { byLesson, practice } = ROADMAPS[title];
  return Object.entries(practice).map(([group, list]) => ({
    group,
    items: list.filter(([s, slug]) => found.has(`${s}:${slug}`)).map(([s, slug]) => {
      const it = structuredClone(found.get(`${s}:${slug}`));
      // Lesson-grouped roadmaps name the lesson in the note: "Practice › API Design · ...".
      if (byLesson) it.note = it.note.replace(/^Practice · /, `Practice › ${group} · `);
      return it;
    }).sort(practiceOrder),
  }));
}

// TUF first, then easiest first.
const isTuf = (i) => /takeuforward\.org/.test(i.url);
function practiceOrder(a, b) {
  return (isTuf(b) - isTuf(a)) || ORDER.indexOf(a.level) - ORDER.indexOf(b.level);
}

// Re-sorts a section's practice in place (questions keep their status), so a run also fixes the
// order of questions added by an earlier run. Lessons stay where they are.
function reorder(section, byLesson) {
  const isPractice = (i) => (i.note ?? '').startsWith('Practice');
  const groupOf = (i) => (byLesson ? /^Practice › ([^·]+?) · /.exec(i.note)?.[1] ?? '' : '');
  const slots = section.items.map((i, n) => (isPractice(i) ? n : -1)).filter((n) => n >= 0);
  const practice = slots.map((n) => section.items[n]);
  const groups = [...new Set(practice.map(groupOf))];
  const sorted = groups.flatMap((g) => practice.filter((i) => groupOf(i) === g).sort(practiceOrder));
  const moved = sorted.some((it, k) => it !== practice[k]);
  slots.forEach((n, k) => { section.items[n] = sorted[k]; });
  return moved;
}

function apply(title, sections) {
  const { byLesson } = ROADMAPS[title];
  let added = 0;
  for (const { group, items } of planFor(title)) {
    const s = byLesson ? sections.find((x) => x.items.some((i) => i.title === group)) : sections.find((x) => x.title === group);
    if (!s) { console.warn(`  ${title}: "${group}" not found, skipped`); continue; }
    const have = new Set(s.items.map((i) => i.url));
    const fresh = items.filter((i) => !have.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
    s.items.push(...fresh);
    added += fresh.length;
  }
  let reordered = 0;
  for (const s of sections) if (reorder(s, byLesson)) reordered++;
  return { added, reordered };
}

for (const title of Object.keys(ROADMAPS)) {
  const n = planFor(title).reduce((t, g) => t + g.items.length, 0);
  console.log(`${title}: ${n} practice questions planned`);
}
if (DRY) process.exit(0);

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
for (const title of Object.keys(ROADMAPS)) {
  const doc = await col.findOne({ title });
  if (!doc) { console.warn(`${title} not found in the database, skipped`); continue; }
  const inDb = apply(title, doc.sections);
  if (inDb.added || inDb.reordered) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
  const entry = seed.find((r) => r.title === title);
  const inSeed = entry ? apply(title, entry.sections) : { added: 0, reordered: 0 };
  console.log(`${title}: database +${inDb.added} (${inDb.reordered} sections reordered), seed +${inSeed.added} (${inSeed.reordered} reordered)`);
}
await client.close();
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
