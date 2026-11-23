// Checks every link stored in the database and reports the broken ones.
// Usage: node --env-file=.env scripts/check-links.mjs [report.json]
//
// - YouTube videos and playlists are checked through YouTube's oEmbed endpoint, because a
//   removed video's watch page still answers 200.
// - 404/410 and DNS failures count as broken. 401/403/429 and timeouts mean the site blocks
//   automated checks, so those are listed separately as "couldn't verify".
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

const out = process.argv[2] || 'link-report.json';
const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB || 'roadmap_tracker');

const found = new Map(); // url -> [where]
const add = (url, where) => {
  if (!/^https?:\/\//i.test(url || '')) return;
  url = url.trim().replace(/[.,;:]+$/, '');
  if (!found.has(url)) found.set(url, []);
  found.get(url).push(where);
};
const urlsIn = (text) => String(text || '').match(/https?:\/\/[^\s)\]<>"']+/g) || [];

for (const r of await db.collection('roadmaps').find({}).toArray()) {
  for (const x of r.resources || []) add(x.url, { roadmap: r.title, where: 'Resources', title: x.title });
  for (const n of r.notes || []) for (const l of n.lines || []) for (const u of urlsIn(l)) add(u, { roadmap: r.title, where: n.heading });
  for (const u of urlsIn(r.intro)) add(u, { roadmap: r.title, where: 'Intro' });
  for (const s of r.sections || []) for (const i of s.items || []) {
    add(i.url, { roadmap: r.title, where: s.title, title: i.title, itemId: i.id });
    for (const u of urlsIn(i.note)) add(u, { roadmap: r.title, where: 'Note', title: i.title });
  }
}
for (const p of await db.collection('pages').find({}).toArray()) for (const u of urlsIn(p.body)) add(u, { page: p.title, kind: p.kind });
for (const h of await db.collection('habits').find({}).toArray()) add(h.url, { routine: h.title });
for (const l of await db.collection('links').find({}).toArray()) add(l.url, { link: l.title });
await client.close();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

async function check(url) {
  let target = url;
  const host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtube.com' || host === 'youtu.be') {
    target = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(target, {
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
        signal: AbortSignal.timeout(20000),
      });
      res.body?.cancel().catch(() => {});
      if (target !== url && (res.status === 401 || res.status === 403)) return { status: res.status, verdict: 'broken', reason: 'YouTube: private or unavailable' };
      if (res.status === 404 || res.status === 410) return { status: res.status, verdict: 'broken' };
      if ([401, 403, 429, 999].includes(res.status) || res.status >= 500) return { status: res.status, verdict: 'unverified' };
      return { status: res.status, verdict: 'ok' };
    } catch (err) {
      const code = err.cause?.code || err.name;
      if (code === 'ENOTFOUND') return { status: 0, verdict: 'broken', reason: 'Domain not found' };
      if (attempt) return { status: 0, verdict: 'unverified', reason: code };
    }
  }
}

const urls = [...found.keys()];
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 16 }, async () => {
  while (next < urls.length) {
    const url = urls[next++];
    results.push({ url, ...(await check(url)), usedIn: found.get(url) });
  }
}));

const broken = results.filter((r) => r.verdict === 'broken');
const unverified = results.filter((r) => r.verdict === 'unverified');
fs.writeFileSync(out, JSON.stringify({ checked: results.length, broken, unverified }, null, 2));
console.log(`Checked ${results.length} unique links: ${broken.length} broken, ${unverified.length} couldn't verify. Report: ${out}`);
