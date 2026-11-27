// Adds practice to the "Computer Networks Roadmap (takeUforward)", after each section's lessons.
// TUF's CN course has no quizzes, so practice comes from other sites, each matched to a lesson:
//   LeetCode - IP addresses, routing as shortest paths (link state / distance vector / all-pairs),
//              critical links, URL shortening, request windows for rate limiting, Hamming distance
//   HackerRank - its Security track (functions, terminology, ciphers) and IP address validation
//   Exercism - Diffie-Hellman, classic ciphers and a REST API exercise
// Every question is checked on its site first (LeetCode free questions only; HackerRank challenge
// lookup; Exercism's JavaScript track config on GitHub). Added by URL: re-running adds only what
// is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-cn-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'Computer Networks Roadmap (takeUforward)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Section -> [site, slug, what it practises]
const PRACTICE = {
  '03. Physical and Data Link Layer': [
    ['lc', 'hamming-distance', 'Hamming distance, the idea behind error-detecting codes'],
  ],
  '04. Network Topologies and VLANs': [
    ['lc', 'min-cost-to-connect-all-points', 'a minimum spanning tree, the idea behind loop-free switched networks'],
  ],
  '05. Network Layer: IP Addressing': [
    ['lc', 'validate-ip-address', 'IPv4 and IPv6 address formats'],
    ['hr', 'ip-address-validation', 'telling IPv4 from IPv6 with regex'],
    ['lc', 'restore-ip-addresses', 'valid IPv4 octets'],
  ],
  '06. Network Layer: Routing': [
    ['lc', 'network-delay-time', 'link-state routing: shortest paths with Dijkstra (OSPF)'],
    ['lc', 'cheapest-flights-within-k-stops', 'distance-vector routing with a hop limit (Bellman-Ford, RIP)'],
    ['lc', 'find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance', 'all-pairs routing tables (Floyd-Warshall)'],
    ['lc', 'critical-connections-in-a-network', 'links whose failure splits the network'],
  ],
  '08. Application Layer': [
    ['lc', 'encode-and-decode-tinyurl', 'a URL shortener behind HTTP'],
    ['ex', 'rest-api', 'designing a small REST API'],
  ],
  '12. Cryptography and Secure Protocols': [
    ['hr', 'security-tutorial-functions', 'functions as used in ciphers'],
    ['hr', 'security-function-ii', 'functions as used in ciphers'],
    ['hr', 'security-bijective-functions', 'why an encryption function must be reversible'],
    ['hr', 'security-inverse-of-a-function', 'decryption as the inverse function'],
    ['hr', 'security-tutorial-permutations', 'permutations behind transposition ciphers'],
    ['hr', 'security-involution', 'involutions: ciphers that undo themselves'],
    ['hr', 'security-message-space-and-ciphertext-space', 'message and ciphertext spaces'],
    ['hr', 'security-key-spaces', 'key spaces'],
    ['hr', 'security-encryption-scheme', 'counting encryption schemes'],
    ['lc', 'decode-the-message', 'a substitution cipher'],
    ['ex', 'rotational-cipher', 'the Caesar cipher'],
    ['ex', 'diffie-hellman', 'Diffie-Hellman key exchange'],
    ['ex', 'affine-cipher', 'the affine cipher'],
    ['hr', 'keyword-transposition-cipher', 'a keyword transposition cipher'],
    ['ex', 'simple-cipher', 'the Vigenère cipher'],
    ['hr', 'prng-sequence-guessing', 'why predictable random numbers break security'],
    ['hr', 'basic-cryptanalysis', 'breaking a substitution cipher'],
  ],
  '14. Network Performance': [
    ['lc', 'number-of-recent-calls', 'counting requests in a time window, the core of rate limiting'],
  ],
};
const LEVEL = { Easy: 'Beginner', Medium: 'Intermediate', Hard: 'Advanced', Advanced: 'Advanced', Expert: 'Advanced' };
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];

async function lookup() {
  const ex = await fetch('https://raw.githubusercontent.com/exercism/javascript/main/config.json').then((r) => r.json());
  const exAll = new Map([...ex.exercises.concept, ...ex.exercises.practice].filter((e) => e.status !== 'deprecated').map((e) => [e.slug, e]));
  const found = new Map();
  for (const [site, slug] of Object.values(PRACTICE).flat()) {
    const key = `${site}:${slug}`;
    if (found.has(key)) continue;
    if (site === 'lc') {
      const query = 'query q($s:String!){question(titleSlug:$s){questionFrontendId title difficulty isPaidOnly}}';
      const r = await fetch('https://leetcode.com/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' }, body: JSON.stringify({ query, variables: { s: slug } }) }).then((x) => x.json()).catch(() => null);
      const q = r?.data?.question;
      if (q && !q.isPaidOnly) found.set(key, { title: q.title, url: `https://leetcode.com/problems/${slug}/`, level: LEVEL[q.difficulty], src: `LeetCode #${q.questionFrontendId}` });
      await sleep(500);
    } else if (site === 'hr') {
      const r = await fetch(`https://www.hackerrank.com/rest/contests/master/challenges/${slug}`);
      const m = r.ok ? (await r.json()).model : null;
      if (m?.name) found.set(key, { title: m.name.trim(), url: `https://www.hackerrank.com/challenges/${slug}/problem`, level: LEVEL[m.difficulty_name] ?? 'Beginner', src: 'HackerRank' });
      await sleep(300);
    } else {
      const e = exAll.get(slug);
      if (e) found.set(key, { title: e.name, url: `https://exercism.org/tracks/javascript/exercises/${slug}`, level: e.difficulty <= 3 ? 'Beginner' : e.difficulty <= 6 ? 'Intermediate' : 'Advanced', src: 'Exercism (JavaScript)' });
    }
    if (!found.has(key)) console.warn(`  ${site} "${slug}" not found or premium, skipped`);
  }
  return found;
}

const found = await lookup();
const plan = Object.fromEntries(Object.entries(PRACTICE).map(([section, list]) => [section, list
  .filter(([site, slug]) => found.has(`${site}:${slug}`))
  .map(([site, slug, why]) => { const q = found.get(`${site}:${slug}`); return { title: q.title, url: q.url, level: q.level, note: `Practice · ${q.src} · ${why}` }; })
  .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level))]));
const total = Object.values(plan).reduce((n, l) => n + l.length, 0);
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
