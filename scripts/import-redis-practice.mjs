// Adds practice to the "Redis Roadmap" and "Redis Internals Roadmap". TUF has no Redis course, so:
//   CodeCrafters "Build your own Redis" - one item per extension (persistence, replication,
//     streams, transactions, pub/sub, lists, sorted sets...), linking its first stage. Stage codes
//     and names come from the course definition in CodeCrafters' public GitHub repo.
//   LeetCode - free design questions shaped like Redis data types and eviction (LRU / LFU).
// Each item sits under the section it practises. The same exercise in both roadmaps stays in sync.
// Added by URL: re-running adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-redis-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const COURSE = 'https://raw.githubusercontent.com/codecrafters-io/build-your-own-redis/main/course-definition.yml';

// CodeCrafters groups: [key, title, first stage, last stage] for the base course (split in two)
// and extension slugs for the rest. Stage lists are read from the course definition.
const CC = {
  'base-server': { title: 'Build Redis: a TCP server that answers PING', from: 'jm1', to: 'zu2' },
  'base-commands': { title: 'Build Redis: ECHO, SET / GET and key expiry', from: 'qq0', to: 'yz1' },
  'persistence-rdb': { title: 'Build Redis: RDB persistence' },
  'persistence-aof': { title: 'Build Redis: AOF persistence' },
  replication: { title: 'Build Redis: replication' },
  streams: { title: 'Build Redis: streams' },
  transactions: { title: 'Build Redis: transactions (MULTI / EXEC)' },
  'optimistic-locking': { title: 'Build Redis: optimistic locking (WATCH)' },
  lists: { title: 'Build Redis: lists' },
  'pub-sub': { title: 'Build Redis: pub/sub' },
  'sorted-sets': { title: 'Build Redis: sorted sets' },
  bitmaps: { title: 'Build Redis: bitmaps' },
  geospatial: { title: 'Build Redis: geospatial commands (geohash)' },
};

const LC = (slug, why) => ['lc', slug, why];
const ROADMAPS = {
  'Redis Roadmap': {
    'Phase 1: Why and how Redis works': [['cc', 'base-server']],
    'Phase 3: Data types': [
      ['cc', 'base-commands'], ['cc', 'lists'], ['cc', 'sorted-sets'], ['cc', 'bitmaps'],
      LC('time-based-key-value-store', 'a string / hash store with versions'), LC('design-authentication-manager', 'keys that expire (TTL)'),
      LC('design-circular-queue', 'a list used as a queue'), LC('insert-delete-getrandom-o1', 'a set with SADD / SREM / SRANDMEMBER'),
      LC('stock-price-fluctuation', 'values kept ordered by score, like a sorted set'),
    ],
    'Not covered in the playlist yet': [
      ['cc', 'persistence-rdb'], ['cc', 'persistence-aof'], ['cc', 'pub-sub'], ['cc', 'streams'],
      ['cc', 'transactions'], ['cc', 'optimistic-locking'], ['cc', 'replication'],
      LC('lru-cache', 'allkeys-lru eviction'), LC('lfu-cache', 'allkeys-lfu eviction'),
    ],
  },
  'Redis Internals Roadmap': {
    'Networking and Event Loop': [['cc', 'base-server']],
    Commands: [['cc', 'base-commands'], ['cc', 'persistence-aof']],
    'Internals and Memory': [LC('lru-cache', 'the LRU cache that approximated LRU imitates')],
    'Data Structures and Algorithms': [['cc', 'transactions'], ['cc', 'lists'], ['cc', 'geospatial'], LC('lfu-cache', 'LFU eviction')],
  },
};
const LEVEL = { very_easy: 'Beginner', easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced', Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced' };
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];

async function codecrafters() {
  const yml = await fetch(COURSE).then((r) => r.text());
  const stages = yml.slice(yml.indexOf('\nstages:')).split('\n  - slug: ').slice(1).map((b) => ({
    slug: b.split('\n')[0].trim().replace(/"/g, ''),
    name: /\n    name: "?([^"\n]+)"?/.exec(b)?.[1] ?? '',
    ext: /\n    primary_extension_slug: "?([^"\n]+)"?/.exec(b)?.[1] ?? 'base',
    difficulty: /\n    difficulty: (\w+)/.exec(b)?.[1] ?? 'medium',
  }));
  const out = new Map();
  for (const [key, def] of Object.entries(CC)) {
    let group;
    if (def.from) {
      const a = stages.findIndex((s) => s.slug === def.from), b = stages.findIndex((s) => s.slug === def.to);
      group = a >= 0 && b >= a ? stages.slice(a, b + 1) : [];
    } else group = stages.filter((s) => s.ext === key);
    if (!group.length) { console.warn(`  CodeCrafters "${key}" not found, skipped`); continue; }
    const hardest = group.reduce((m, s) => Math.max(m, ORDER.indexOf(LEVEL[s.difficulty] ?? 'Intermediate')), 0);
    out.set(key, {
      title: def.title,
      url: `https://app.codecrafters.io/courses/redis/stages/${group[0].slug}`,
      level: ORDER[hardest],
      note: `Practice · CodeCrafters · ${group.length} stages: ${group[0].name} → ${group.at(-1).name}`,
    });
  }
  return out;
}

async function leetcode(slugs) {
  const out = new Map();
  for (const slug of slugs) {
    const query = 'query q($s:String!){question(titleSlug:$s){questionFrontendId title difficulty isPaidOnly}}';
    let q = null;
    for (let attempt = 0; attempt < 3 && !q; attempt++) {
      const r = await fetch('https://leetcode.com/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' }, body: JSON.stringify({ query, variables: { s: slug } }) }).then((x) => x.json()).catch(() => null);
      q = r?.data?.question ?? null;
      if (!q) await sleep(1500 * (attempt + 1));
    }
    if (q && !q.isPaidOnly) out.set(slug, q);
    else console.warn(`  LeetCode "${slug}" not found or premium, skipped`);
    await sleep(500);
  }
  return out;
}

const cc = await codecrafters();
const lcSlugs = [...new Set(Object.values(ROADMAPS).flatMap((r) => Object.values(r).flat()).filter(([s]) => s === 'lc').map(([, slug]) => slug))];
const lc = await leetcode(lcSlugs);
const item = ([site, key, why]) => {
  if (site === 'cc') return cc.get(key);
  const q = lc.get(key);
  return q && { title: q.title, url: `https://leetcode.com/problems/${key}/`, level: LEVEL[q.difficulty], note: `Practice · LeetCode #${q.questionFrontendId} · ${why}` };
};
const plan = Object.fromEntries(Object.entries(ROADMAPS).map(([title, sections]) => [title, Object.fromEntries(Object.entries(sections).map(([section, refs]) => [
  section, refs.map(item).filter(Boolean).sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level)),
]))]));
for (const [title, sections] of Object.entries(plan)) console.log(`${title}: ${Object.values(sections).reduce((n, l) => n + l.length, 0)} practice items`);
if (DRY) process.exit(0);

function apply(title, secs) {
  let added = 0;
  for (const [section, items] of Object.entries(plan[title])) {
    const s = secs.find((x) => x.title === section);
    if (!s) { console.warn(`  ${title}: section "${section}" not found, skipped`); continue; }
    const have = new Set(s.items.map((i) => i.url));
    const fresh = items.filter((i) => !have.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
    s.items.push(...fresh);
    added += fresh.length;
  }
  return added;
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
for (const title of Object.keys(ROADMAPS)) {
  const doc = await col.findOne({ title });
  if (!doc) { console.warn(`${title} not found in the database, skipped`); continue; }
  const addedDb = apply(title, doc.sections);
  if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
  const entry = seed.find((r) => r.title === title);
  console.log(`${title}: database +${addedDb}, seed +${entry ? apply(title, entry.sections) : 0}`);
}
await client.close();
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
