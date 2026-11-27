// Daily coding practice: one recommended problem a day plus any problems you add yourself.
//
// coding_problems: { _id, date: "YYYY-MM-DD", title, url, key, platform, difficulty: Easy|Medium|Hard,
//   topic, tags, source: auto:practice|auto:codeforces|manual, roadmapId?, itemId?, done, doneAt,
//   submissionUrl, notes, createdAt, updatedAt }
//
// Sources for the automatic pick, tried in order (CODING_SOURCES, default "practice,codeforces"):
//   practice   - the next unsolved problem from this app's own practice roadmaps (every one was
//                verified on its site when it was imported). Reliable: it is our own database.
//   codeforces - the official Codeforces API (problemset.problems), rated 800-1700, cached a week.
// No unofficial APIs (e.g. LeetCode's private GraphQL) are used for the daily pick.
import { collection, newId, updateItem } from '../store.js';
import { todayIso } from '../http.js';

const problems = () => collection('coding_problems');
const cache = () => collection('coding_cache');

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const LEVEL_TO_DIFF = { Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' };
// A gentle weekly rhythm: easier at the start of the week, harder later. 0 = Sunday.
const DAY_TARGET = ['Medium', 'Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Medium'];

let fetchImpl = (...a) => fetch(...a);
export const _setFetch = (f) => { fetchImpl = f || ((...a) => fetch(...a)); };

export function urlKey(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let m;
    if (host === 'leetcode.com' && (m = u.pathname.match(/^\/problems\/([^/]+)/))) return `lc:${m[1]}`;
    if (host === 'codeforces.com' && (m = u.pathname.match(/\/(?:problemset\/problem|contest)\/(\d+)\/(?:problem\/)?([A-Z]\d?)/i))) return `cf:${m[1]}${m[2].toUpperCase()}`;
    if (host === 'hackerrank.com' && (m = u.pathname.match(/\/challenges\/([^/]+)/))) return `hr:${m[1]}`;
    return `${host}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch { return url; }
}

export const platformOf = (url) => {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  return ({ 'leetcode.com': 'LeetCode', 'codeforces.com': 'Codeforces', 'hackerrank.com': 'HackerRank', 'codechef.com': 'CodeChef', 'takeuforward.org': 'TUF', 'geeksforgeeks.org': 'GeeksforGeeks' })[host] || (host || 'Custom');
};

const pub = (d) => ({
  id: d._id, date: d.date, title: d.title, url: d.url, platform: d.platform, difficulty: d.difficulty, topic: d.topic || '',
  tags: d.tags || [], source: d.source, done: Boolean(d.done), doneAt: d.doneAt || null, submissionUrl: d.submissionUrl || '',
  notes: d.notes || '', roadmapId: d.roadmapId || null,
});

async function usedKeys() {
  return new Set((await (await problems()).find({}, { projection: { key: 1 } }).toArray()).map((d) => d.key));
}

// --- source: the app's own practice roadmaps ------------------------------------------------
async function pickFromPractice(target, used) {
  const rms = await (await collection('roadmaps')).find(
    { title: /Practice/i },
    { projection: { title: 1, 'sections.title': 1, 'sections.items': 1 } },
  ).toArray();
  const pool = [];
  for (const r of rms) {
    for (const s of r.sections) {
      for (const it of s.items) {
        if (!it.url || it.status === 'done') continue;
        const platform = platformOf(it.url);
        if (!['LeetCode', 'HackerRank', 'CodeChef', 'Codeforces', 'TUF'].includes(platform)) continue;
        const key = urlKey(it.url);
        if (used.has(key)) continue;
        pool.push({ it, r, s, key, platform, difficulty: LEVEL_TO_DIFF[it.level] || 'Medium' });
      }
    }
  }
  if (!pool.length) return null;
  // Prefer the DSA list, then the target difficulty, then roadmap order (topics build on each other).
  const score = (p) => (/DSA/i.test(p.r.title) ? 0 : 10) + (p.difficulty === target ? 0 : 3);
  pool.sort((a, b) => score(a) - score(b));
  const p = pool[0];
  return {
    title: p.it.title, url: p.it.url, key: p.key, platform: p.platform, difficulty: p.difficulty,
    topic: p.s.title, tags: [p.s.title], source: 'auto:practice', roadmapId: p.r._id, itemId: p.it.id,
  };
}

// --- source: Codeforces official API --------------------------------------------------------
const CF_RATING = { Easy: [800, 1100], Medium: [1200, 1500], Hard: [1600, 1900] };
async function codeforcesProblems() {
  const c = await cache();
  const hit = await c.findOne({ _id: 'codeforces' });
  if (hit && Date.now() - Date.parse(hit.at) < 7 * 86400000) return hit.problems;
  const res = await fetchImpl('https://codeforces.com/api/problemset.problems', { signal: AbortSignal.timeout(20_000) });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== 'OK') {
    if (hit) return hit.problems; // stale is better than nothing
    throw new Error(`Codeforces API: ${json?.comment || res.status}`);
  }
  const list = json.result.problems
    .filter((p) => p.rating && p.rating <= 1900 && p.contestId)
    .map((p) => ({ c: p.contestId, i: p.index, n: p.name, r: p.rating, t: p.tags.slice(0, 4) }));
  await c.updateOne({ _id: 'codeforces' }, { $set: { at: new Date().toISOString(), problems: list } }, { upsert: true });
  return list;
}

async function pickFromCodeforces(target, used, seed) {
  const [lo, hi] = CF_RATING[target];
  const pool = (await codeforcesProblems()).filter((p) => p.r >= lo && p.r <= hi && !used.has(`cf:${p.c}${p.i}`) && !p.t.includes('*special'));
  if (!pool.length) return null;
  const p = pool[seed % pool.length];
  const url = `https://codeforces.com/problemset/problem/${p.c}/${p.i}`;
  return {
    title: `${p.c}${p.i}. ${p.n}`, url, key: `cf:${p.c}${p.i}`, platform: 'Codeforces', difficulty: target,
    topic: p.t[0] || 'implementation', tags: p.t, source: 'auto:codeforces', rating: p.r,
  };
}

const SOURCES = { practice: pickFromPractice, codeforces: pickFromCodeforces };

// Makes sure today has its recommended problem. Safe to call often (cron, page load).
export async function ensureDaily(date = todayIso()) {
  const col = await problems();
  const existing = await col.findOne({ date, auto: true });
  if (existing) return { problem: pub(existing), created: false };
  const used = await usedKeys();
  const target = DAY_TARGET[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const seed = Number(date.replace(/-/g, '')) * 2654435761 >>> 0;
  const errors = [];
  const order = (process.env.CODING_SOURCES || 'practice,codeforces').split(',').map((s) => s.trim()).filter((s) => SOURCES[s]);
  for (const name of order) {
    try {
      const pick = await SOURCES[name](target, used, seed);
      if (!pick) { errors.push(`${name}: nothing left to recommend`); continue; }
      const now = new Date().toISOString();
      const doc = { _id: newId(), date, ...pick, auto: true, done: false, doneAt: null, submissionUrl: '', notes: '', createdAt: now, updatedAt: now };
      try {
        await col.insertOne(doc);
      } catch (err) {
        if (err.code === 11000) return { problem: pub(await col.findOne({ date, auto: true })), created: false };
        throw err;
      }
      return { problem: pub(doc), created: true };
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }
  return { problem: null, created: false, errors };
}

export async function ensureIndexes() {
  const col = await problems();
  // One automatic pick per day (also guards against two serverless instances racing).
  await col.createIndex({ date: 1 }, { unique: true, partialFilterExpression: { auto: true }, name: 'one_auto_per_day' });
  await col.createIndex({ date: -1 });
}

export async function listDay(date) {
  return (await (await problems()).find({ date }).sort({ source: 1, createdAt: 1 }).toArray()).map(pub);
}

export async function listRange(from, to) {
  return (await (await problems()).find({ date: { $gte: from, $lte: to } }).sort({ date: -1, createdAt: 1 }).toArray()).map(pub);
}

export async function addProblem(f) {
  const now = new Date().toISOString();
  const doc = {
    _id: newId(), date: f.date, title: f.title, url: f.url || '', key: urlKey(f.url) || `manual:${newId()}`,
    platform: f.url ? platformOf(f.url) : (f.platform || 'Custom'), difficulty: f.difficulty || 'Medium',
    topic: f.topic || '', tags: f.topic ? [f.topic] : [], source: 'manual', done: Boolean(f.done),
    doneAt: f.done ? now : null, submissionUrl: f.submissionUrl || '', notes: f.notes || '', createdAt: now, updatedAt: now,
  };
  await (await problems()).insertOne(doc);
  return pub(doc);
}

export async function updateProblem(id, patch) {
  const col = await problems();
  const before = await col.findOne({ _id: id });
  if (!before) return null;
  const $set = { updatedAt: new Date().toISOString() };
  for (const k of ['title', 'difficulty', 'topic', 'notes', 'submissionUrl', 'date']) if (patch[k] !== undefined) $set[k] = patch[k];
  if (patch.url !== undefined) { $set.url = patch.url; $set.key = urlKey(patch.url) || before.key; $set.platform = patch.url ? platformOf(patch.url) : before.platform; }
  if (patch.done !== undefined) { $set.done = patch.done; $set.doneAt = patch.done ? new Date().toISOString() : null; }
  const doc = await col.findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
  // Solving a problem from a practice roadmap ticks it there too (and everywhere it appears).
  if (patch.done !== undefined && doc.itemId) {
    await updateItem(doc.itemId, { status: patch.done ? 'done' : 'not_started' }).catch(() => {});
  }
  return pub(doc);
}

export async function deleteProblem(id) {
  return (await (await problems()).deleteOne({ _id: id, source: 'manual' })).deletedCount > 0;
}

// --- stats ------------------------------------------------------------------------------------
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export function streaks(doneDays, today) {
  const set = new Set(doneDays);
  let current = 0;
  let day = set.has(today) ? today : addDays(today, -1); // today not done yet doesn't break the streak
  while (set.has(day)) { current++; day = addDays(day, -1); }
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of [...set].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export async function stats(today = todayIso()) {
  const all = await (await problems()).find({}, { projection: { date: 1, done: 1, doneAt: 1, difficulty: 1, topic: 1, source: 1, platform: 1 } }).toArray();
  const done = all.filter((p) => p.done);
  // A problem counts on the day it was assigned (the checklist day).
  const doneDays = [...new Set(done.map((p) => p.date))];
  const { current, longest } = streaks(doneDays, today);
  const weekStart = addDays(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const inRange = (p, from) => p.date >= from && p.date <= today;
  const byDay = {};
  for (const p of all) {
    if (p.date < addDays(today, -179)) continue;
    byDay[p.date] ||= { total: 0, done: 0 };
    byDay[p.date].total++;
    if (p.done) byDay[p.date].done++;
  }
  const topics = {};
  for (const p of all) {
    const t = p.topic || 'Other';
    topics[t] ||= { topic: t, total: 0, done: 0 };
    topics[t].total++;
    if (p.done) topics[t].done++;
  }
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, { total: all.filter((p) => p.difficulty === d).length, done: done.filter((p) => p.difficulty === d).length }]));
  const week = all.filter((p) => inRange(p, weekStart));
  const month = all.filter((p) => inRange(p, monthStart));
  return {
    today,
    totalSolved: done.length,
    totalTracked: all.length,
    currentStreak: current,
    longestStreak: longest,
    week: { done: week.filter((p) => p.done).length, total: week.length, activeDays: new Set(week.filter((p) => p.done).map((p) => p.date)).size },
    month: { done: month.filter((p) => p.done).length, total: month.length, activeDays: new Set(month.filter((p) => p.done).map((p) => p.date)).size },
    byDifficulty,
    topics: Object.values(topics).sort((a, b) => b.total - a.total).slice(0, 20),
    byDay,
  };
}
