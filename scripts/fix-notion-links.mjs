// One-off: replaces topic links that pointed at Notion pages with the real resource,
// and adds "System Design Roadmap 3" (Mayank Joshi's System Design Full Course playlist).
// Usage: node --env-file=.env scripts/fix-notion-links.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
const search = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q.replace(/\s+/g, ' ').trim())}`;
const isNotion = (u) => /notion\.(so|site|com)/i.test(u || '');

// Backend from first principles: exact videos, from the row titles in the Notion "Backend Index".
const BACKEND = {
  '1': '0Rwb4Xmlcwc', '2': '3qFjZbFRSAU', '3': '6Ss4dJD9Kzg', '4': '6fqZs5Z3k9A', '5': 'a3C1DMswClQ', '6': 'SubuU1iOC2s',
  '7': 'vzg90tY3uM0', '8': 'A95rliroC8Q', '9': 'qedj_JjjL-U', '10': 'hyc-7w3pee8', '11': 'RG6q57DwV8Y', '12': 'F7Vwp2Xo5Do',
  '13': 'estH64OkwxU', '14': 'r-nQsyguU1Y', '15': '7_sovzAhRSM', '16': '8NaM_9aKS24', '17': 'GR9NtirPXyc', '18': '5PEuwgLOQQM',
  '19': '6rfBgphiCWM', '20': 'xB1C1xZZW4k', '21.1': 'z7kt_p44rjs', '21.2': 'sOhAopEwjH4', '22': 'bs9MEYRTA30', '23': 'Ie0TjKI9cDI',
  '24': 'iWrVCxexUWY', '25': 'wUQryt697cs', '26': 'HgVrfHX92y4', '27': '2_fcv3-XfN4', '28': 'CwKsU84jIWs', '29': 'eWM0CVReP04',
  '30': '_E8X5RIJfQ4',
};

// HLD & LLD: the first video on each of your Notion topic pages; LLD pages without a video
// point at the takeUforward LLD sheet those pages refer to.
const LLD_SHEET = 'https://takeuforward.org/prep-hub/low-level-design';
const HLD_LLD = {
  'Scalability & System Design Basics': yt('EWS_CIxttVw'),
  'Networking Fundamentals': yt('sMHzfigUxz4'),
  'Load Balancing & Proxies': yt('LQuuoHTyYz8'),
  'Caching (Redis & Cache Strategies)': yt('dGAgxozNWFE'),
  'Databases: SQL, NoSQL & ACID': yt('GAe5oB742dw'),
  'API Design': yt('-mN3VyJuCjM'),
  'LLD Intro & How to Approach an Interview': yt('VdwkFAhLEHo'),
  'SOLID Principles & UML': LLD_SHEET,
  'Consistent Hashing': yt('zaRkONvyGr8'),
  'Sharding & Replication': yt('_1IKwnbscQU'),
  'CAP Theorem & Consistency': yt('BHqjEjzAicA'),
  'Availability & Fault Tolerance': yt('3Lis4w4_bBc'),
  'Creational Design Patterns': LLD_SHEET,
  'Structural Design Patterns': LLD_SHEET,
  'Behavioural Design Patterns': LLD_SHEET,
  'Dependency Injection': LLD_SHEET,
  'Exceptions and Error Handling': LLD_SHEET,
  'Microservices': yt('lTAcCNbJ7KE'),
  'Authentication & Security': yt('P2CPd9ynFLg'),
  'Capacity Estimation & Location Services': yt('0myM0k1mjZw'),
  'HLD Case Studies': yt('QmX2NPkJTKg'),
  'System Design Interview Strategy': yt('CtmBGH8MkX4'),
  'Multithreading and Concurrency': LLD_SHEET,
  'Best Practices in LLD': LLD_SHEET,
  'LLD Interview Problems': LLD_SHEET,
};

// Roadmaps whose Notion rows have no link at all: a YouTube search for the topic.
const SEARCH = {
  'System Design Roadmap (October version)': (t) => `${t.replace(/^Case Study - /, '')} system design`,
  'Aptitude Roadmap (October version)': (t) => `${t} aptitude tricks for placements`,
  'GATE CS 2027 Roadmap': (t) => `GATE CS ${t.replace(/\s*\(.*\)\s*/, '')}`,
  'Power BI Roadmap': (t) => `Power BI ${t.replace(/<[^>]+>/g, '')} tutorial`,
};

function fixedUrl(roadmapTitle, item) {
  if (!isNotion(item.url)) return null;
  if (roadmapTitle === 'Backend Roadmap – From First Principles') {
    const n = item.title.match(/^(\d+(?:\.\d+)?)[.\s]/)?.[1]; // "12. Title" and "21.1 Title"
    return BACKEND[n] ? yt(BACKEND[n]) : search(`Sriniously ${item.title}`);
  }
  if (roadmapTitle === 'System Design Roadmap – HLD & LLD') return HLD_LLD[item.title] || search(`${item.title} system design`);
  if (SEARCH[roadmapTitle]) return search(SEARCH[roadmapTitle](item.title));
  return search(item.title);
}

// ---------- System Design Roadmap 3 ----------
const PLAYLIST = 'https://www.youtube.com/playlist?list=PLtUBJBQF5VJgSzegWtlFiNTWehra8eSHU';
const v = (id, title, level, note = '') => ({ id: randomBytes(6).toString('base64url'), title, url: yt(id), level, status: 'not_started', doneAt: null, note });
const SD3 = {
  title: 'System Design Roadmap 3 (Microsoft SDE course)',
  intro: "Based on Mayank Joshi's \"System Design Full Course by Microsoft SDE\" playlist (15 videos). Start with the foundations and crash courses, then the core distributed-systems concepts, then the end-to-end case studies.",
  notionUrl: null,
  resources: [
    { title: 'System Design Full Course by Microsoft SDE (YouTube playlist)', url: PLAYLIST },
    { title: 'Mayank Joshi (@9to5dude) on YouTube', url: 'https://www.youtube.com/@9to5dude' },
  ],
  notes: [
    {
      heading: 'How this lines up with your other roadmaps',
      lines: [
        'Redis case study pairs with the Redis Internals Roadmap (RESP, event loop, encodings, RDB vs AOF).',
        'Replication, consistent hashing, leader election and rate limiting deepen the System Design Roadmap – HLD & LLD topics.',
        'Event-driven architecture pairs with the Kafka Roadmap.',
      ],
    },
  ],
  sections: [
    {
      title: 'Foundations & crash courses',
      items: [
        v('DqJORL6X3qk', '1. System Design was HARD until I Learned these 10 Concepts', 'Beginner'),
        v('yCzyTijM97Q', '2. Complete System Design Roadmap to crack FAANG interviews in 60 days', 'Beginner'),
        v('iG5MiPFdk-o', '3. 1000+ hours on System Design explained (crash course)', 'Beginner'),
        v('3O2k54JqkLY', '4. Complete System Design crash course: must-know concepts for interviews', 'Beginner'),
      ],
    },
    {
      title: 'Core concepts',
      items: [
        v('ub7Sp6vC_j8', '5. Event-driven architecture explained end-to-end', 'Intermediate'),
        v('fsZA4K0E3kQ', '6. Database replication (replication lag, sync vs async)', 'Intermediate'),
        v('COQNpbNGFJU', '7. Rate limiting: token bucket vs sliding window', 'Intermediate'),
        v('IIhXKoomoNY', '8. Polling vs Server-Sent Events vs WebSockets', 'Intermediate'),
        v('OV6-u5Jyog0', '9. Leader election from scratch (Bully vs Ring)', 'Intermediate'),
        v('glShRZhRszA', '10. Consistent hashing explained', 'Intermediate'),
      ],
    },
    {
      title: 'Case studies',
      items: [
        v('XJVl6BsV0_0', '11. Design Redis: RESP, event loop and data storage', 'Advanced', 'Chapters: 0:00 Intro · 0:19 What is Redis · 4:45 RESP protocol · 9:28 Event loop (epoll) · 15:05 In-memory storage engine · 26:10 RDB vs AOF · 32:26 Full E2E architecture'),
        v('nePAYwfniOY', '12. Design Google Docs', 'Advanced'),
        v('Tq72Pq0entg', '13. Uber system design: ride sharing at scale', 'Advanced'),
        v('l_ame7Nmm1U', '14. Design Instagram Reels', 'Advanced'),
        v('PO0Jf5R4MK4', '15. Design distributed locks', 'Advanced'),
      ],
    },
  ],
};

// ---------- apply ----------
const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
let changed = 0;
const report = {};
for (const r of await col.find({}).toArray()) {
  let n = 0;
  for (const s of r.sections) for (const i of s.items) {
    const u = fixedUrl(r.title, i);
    if (u) { i.url = u; n++; }
  }
  if (n) {
    report[r.title] = n;
    changed += n;
    if (!DRY) await col.updateOne({ _id: r._id }, { $set: { sections: r.sections } });
  }
}
console.log(DRY ? 'Would fix' : 'Fixed', changed, 'links:', report);

if (!(await col.findOne({ title: SD3.title }))) {
  const position = (await col.findOne({ title: 'System Design Roadmap 2 (video list)' }))?.position ?? (await col.countDocuments());
  const doc = { _id: randomBytes(6).toString('base64url'), ...SD3, position: position + 0.5, createdAt: new Date().toISOString() };
  if (!DRY) await col.insertOne(doc);
  console.log(DRY ? 'Would add' : 'Added', SD3.title, `(${SD3.sections.reduce((a, s) => a + s.items.length, 0)} videos)`);
} else console.log(SD3.title, 'already exists');
await client.close();

// Keep the seed file in step, so a fresh database gets the same links and roadmap.
const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
let seedFixed = 0;
for (const r of seed) for (const s of r.sections) for (const i of s.items) {
  const u = fixedUrl(r.title, i);
  if (u) { i.url = u; seedFixed++; }
}
if (!seed.some((r) => r.title === SD3.title)) {
  const at = seed.findIndex((r) => r.title === 'System Design Roadmap 2 (video list)');
  seed.splice(at + 1, 0, { id: randomBytes(6).toString('base64url'), ...SD3 });
}
if (!DRY) fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
console.log(DRY ? 'Seed: would fix' : 'Seed: fixed', seedFixed, 'links');
