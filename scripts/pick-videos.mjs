// Picks one specific YouTube video for every topic that currently links to a YouTube search.
// Reads the top search results for each topic and scores them: trusted channels for the
// subject first, then a sensible length (no Shorts, no 10-hour streams), then views.
// Usage:
//   node --env-file=.env scripts/pick-videos.mjs picks.json        # writes a review file, changes nothing
//   node --env-file=.env scripts/pick-videos.mjs picks.json --apply # applies the picks in that file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Pass a picks file path.'); process.exit(1); }

const PROFILES = {
  'System Design Roadmap (October version)': {
    query: (t) => `${t.replace(/^Case Study - /, 'design ')} system design`,
    channels: ['ByteByteGo', 'Gaurav Sen', 'Hello Interview', 'Arpit Bhayani', 'Concept && Coding', 'Exponent', 'Hussein Nasser', 'Jordan has no life', 'sudoCODE', 'Tech Dummies Narendra L', 'Interview Pen'],
    min: 4, max: 70,
  },
  'Aptitude Roadmap (October version)': {
    query: (t) => `${t} aptitude tricks placement`,
    channels: ['CareerRide', 'Feel Free to Learn', 'Placement Preparation', 'Aptitude Guru Gopal', 'Career Definer', 'TalentSprint', 'PrepInsta', 'Unacademy', 'Guidely', 'Aptitude Wallah', 'Rahul Chaudhary', 'Aditya Ranjan'],
    min: 5, max: 90,
  },
  'GATE CS 2027 Roadmap': {
    query: (t) => `${t.replace(/\s*\(.*\)\s*/, '')} one shot GATE CS`,
    channels: ['Gate Smashers', 'KnowledgeGATE by Sanchit Sir', 'GO Classes for GATE CS', 'Unacademy Computer Science', 'GATE Wallah', 'Ravindrababu Ravula', 'Neso Academy', 'PW GATE Wallah'],
    min: 30, max: 720, // whole-subject one-shots rather than a single lecture
  },
  'Power BI Roadmap': {
    query: (t) => `Power BI ${t.replace(/<[^>]+>/g, '')}`,
    channels: ['Data with Baraa', 'Guy in a Cube', 'Pragmatic Works', 'Microsoft Power BI', 'Chandoo', 'Goodly', 'Learn 2 Excel', 'Leila Gharani', 'Avi Singh - PowerBIPro', 'Curbal', 'SQLBI'],
    min: 3, max: 90,
    titleMust: /power ?bi|dax|power query/i,
    titleMustNot: /tableau|excel (?!power)|looker/i,
  },
};

// Keep to English (or Hindi, which several of your roadmaps already use).
const OTHER_LANGUAGE = /telugu|tamil|kannada|malayalam|marathi|bengali|gujarati|odia|punjabi|తెలుగు|தமிழ்/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const minutes = (s) => (s || '').split(':').map(Number).reduce((a, n) => a * 60 + n, 0) / 60;
const views = (s) => Number(String(s || '').replace(/[^\d]/g, '')) || 0;

async function search(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await searchOnce(q);
      if (r.length) return r;
    } catch (e) { if (attempt === 3) throw e; }
    await sleep(4000 * (attempt + 1)); // back off if YouTube is throttling
  }
  return [];
}

// Uses curl: Node's fetch kept getting its connection reset by YouTube after a few dozen searches.
async function searchOnce(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=IN`;
  const { stdout: html } = await execFileP('curl', ['-s', '--max-time', '25', '-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9', url], { maxBuffer: 20 * 1024 * 1024 });
  const m = html.match(/ytInitialData\s*=\s*(\{.+?\});<\/script>/s);
  if (!m) return [];
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.videoRenderer) {
      const v = o.videoRenderer;
      out.push({
        id: v.videoId,
        title: v.title?.runs?.map((r) => r.text).join('') || '',
        channel: v.ownerText?.runs?.[0]?.text || '',
        length: v.lengthText?.simpleText || '',
        views: views(v.viewCountText?.simpleText),
      });
      return;
    }
    for (const k in o) walk(o[k]);
  };
  walk(JSON.parse(m[1]));
  return out.slice(0, 15);
}

function pick(results, profile, used, topic) {
  const words = topic.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['case', 'study', 'with'].includes(w));
  let best = null;
  results.forEach((r, rank) => {
    const len = minutes(r.length);
    if (!r.length || len < profile.min || len > profile.max) return; // Shorts, live streams, marathons
    if (OTHER_LANGUAGE.test(r.title) || OTHER_LANGUAGE.test(r.channel)) return;
    if (profile.titleMust && !profile.titleMust.test(r.title)) return;
    if (profile.titleMustNot && profile.titleMustNot.test(r.title)) return;
    const ch = profile.channels.findIndex((c) => r.channel.toLowerCase().includes(c.toLowerCase()));
    const title = r.title.toLowerCase();
    const overlap = words.length ? words.filter((w) => title.includes(w.replace(/s$/, ''))).length / words.length : 0;
    if (words.length && overlap === 0) return; // not about this topic
    let score = 0;
    score += ch >= 0 ? 40 - ch * 2 : 0; // trusted channel for this subject
    score += overlap * 30;               // title actually about the topic
    score += Math.log10(r.views + 10) * 3; // popular
    score += (15 - rank) * 0.8;          // YouTube's own relevance order
    if (used.has(r.id)) score -= 25;     // prefer a different video per topic
    if (!best || score > best.score) best = { ...r, score: Math.round(score), channelTrusted: ch >= 0, overlap: Math.round(overlap * 100) };
  });
  return best;
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');

if (flag === '--refine') {
  // Re-search chosen entries with a better query: --refine "22=query" "33=query" ...
  const picks = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const arg of process.argv.slice(4)) {
    const at = arg.indexOf('=');
    const idx = Number(arg.slice(0, at));
    const q = arg.slice(at + 1);
    const p = picks[idx];
    const profile = PROFILES[p.roadmap];
    const used = new Set(picks.filter((x, i) => i !== idx && x.roadmap === p.roadmap && x.pick).map((x) => x.pick.id));
    const words = q.replace(/power bi|gate cs|one shot|tutorial/gi, ' '); // judge relevance on the topic words only
    const best = pick(await search(q), profile, used, words);
    if (best) { p.pick = best; p.query = q; }
    console.log(idx, p.topic, '->', best ? `${best.channel} | ${best.length} | ${best.title}` : 'no result');
    await sleep(600);
  }
  fs.writeFileSync(file, JSON.stringify(picks, null, 2));
} else if (flag !== '--apply') {
  const picks = [];
  for (const r of await col.find({ title: { $in: Object.keys(PROFILES) } }).toArray()) {
    const profile = PROFILES[r.title];
    const used = new Set();
    for (const s of r.sections) for (const i of s.items) {
      if (!/youtube\.com\/results\?search_query/.test(i.url || '')) continue;
      const q = profile.query(i.title);
      let best = null;
      try { best = pick(await search(q), profile, used, i.title); } catch (e) { console.error('search failed', q, e.message); }
      if (best) used.add(best.id);
      picks.push({ roadmap: r.title, itemId: i.id, topic: i.title, query: q, pick: best });
      process.stdout.write(best ? '.' : 'x');
      await sleep(1500);
    }
  }
  fs.writeFileSync(file, JSON.stringify(picks, null, 2));
  console.log(`\nWrote ${picks.length} picks (${picks.filter((p) => !p.pick).length} without a result) to ${file}`);
} else {
  const picks = JSON.parse(fs.readFileSync(file, 'utf8')).filter((p) => p.pick);
  const byItem = new Map(picks.map((p) => [p.itemId, `https://www.youtube.com/watch?v=${p.pick.id}`]));
  const byTitle = new Map(picks.map((p) => [`${p.roadmap}::${p.topic}`, `https://www.youtube.com/watch?v=${p.pick.id}`]));
  let n = 0;
  for (const r of await col.find({ title: { $in: Object.keys(PROFILES) } }).toArray()) {
    for (const s of r.sections) for (const i of s.items) if (byItem.has(i.id)) { i.url = byItem.get(i.id); n++; }
    await col.updateOne({ _id: r._id }, { $set: { sections: r.sections } });
  }
  // Same picks in the seed file (matched by roadmap + topic title, since ids differ there).
  const seedFile = path.join(root, 'seed', 'roadmaps.json');
  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  let m = 0;
  for (const r of seed) for (const s of r.sections) for (const i of s.items) {
    const u = byTitle.get(`${r.title}::${i.title}`);
    if (u && /results\?search_query/.test(i.url || '')) { i.url = u; m++; }
  }
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  console.log(`Applied ${n} picks to the database and ${m} to the seed file`);
}
await client.close();
