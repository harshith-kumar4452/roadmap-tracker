// The interview question bank and per-user learning progress.
//
// interview_questions: { _id, q, a (Markdown, '' when not written yet), category, topic,
//                        difficulty: Easy|Medium|Hard, type, source, answerSource: author|ai|'',
//                        roadmapId?, createdAt, updatedAt }
// interview_progress:  { _id: "<user>:<qid>", user, qid, status: not_started|learning|completed,
//                        bookmarked, reviews, updatedAt, lastReviewedAt }
import { createHash } from 'node:crypto';
import { collection } from '../store.js';

export const CATEGORIES = [
  'Data Structures & Algorithms', 'Operating Systems', 'DBMS', 'Computer Networks', 'OOP',
  'Programming Languages', 'System Design', 'Machine Learning', 'Artificial Intelligence',
  'Full-Stack Development', 'Cloud & DevOps', 'Data Analytics', 'Aptitude', 'Core CS (GATE)', 'HR and Behavioral',
];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const TYPES = ['conceptual', 'coding', 'system-design', 'behavioral', 'aptitude'];
export const STATUSES = ['not_started', 'learning', 'completed'];

// Which category each roadmap's interview questions belong to.
export const ROADMAP_CATEGORY = {
  'DBMS Roadmap (takeUforward)': 'DBMS',
  'SQL Roadmap': 'DBMS',
  'Operating Systems Roadmap (takeUforward)': 'Operating Systems',
  'Computer Networks Roadmap (takeUforward)': 'Computer Networks',
  'OOPS Roadmap (takeUforward)': 'OOP',
  'JavaScript Roadmap (Chai aur Code)': 'Programming Languages',
  'Python Roadmap': 'Programming Languages',
  'DSA Roadmap (Striver A2Z)': 'Data Structures & Algorithms',
  'System Design Roadmap – HLD & LLD': 'System Design',
  'Arpit System Design Map': 'System Design',
  'System Design Roadmap (October version)': 'System Design',
  'System Design Roadmap 2 (video list)': 'System Design',
  'System Design Roadmap 3 (Microsoft SDE course)': 'System Design',
  'System Design: Missing Topics and Video Map': 'System Design',
  'HLD Build Projects Roadmap': 'System Design',
  'Microservices Roadmap': 'System Design',
  'Kafka Roadmap': 'System Design',
  'Redis Roadmap': 'System Design',
  'Redis Internals Roadmap': 'System Design',
  'Backend Roadmap – From First Principles': 'Full-Stack Development',
  'Backend Projects (5-project roadmap)': 'Full-Stack Development',
  'Node.js Backend Roadmap (Chai aur Code)': 'Full-Stack Development',
  'React Frontend Roadmap': 'Full-Stack Development',
  'Git Roadmap': 'Cloud & DevOps',
  'Cloud (AWS) Roadmap': 'Cloud & DevOps',
  'ML Roadmap': 'Machine Learning',
  'Power BI Roadmap': 'Data Analytics',
  'Quantitative Aptitude Roadmap': 'Aptitude',
  'Logical Aptitude Roadmap': 'Aptitude',
  'Verbal Aptitude Roadmap': 'Aptitude',
  'Aptitude Roadmap (October version)': 'Aptitude',
  'GATE CS 2027 Roadmap': 'Core CS (GATE)',
};

const LEVEL = { B: 'Easy', I: 'Medium', A: 'Hard' };

// A readable topic: the section name, or the roadmap's subject when sections are only levels.
function topicOf(roadmap, section) {
  const clean = section.replace(/^(\d+\.|Module \d+:|Phase \d+:|Project \d+:)\s*/, '').replace(/ \(.*?\)$/, '').trim();
  if (/^(beginner|intermediate|advanced)( level)?$/i.test(clean)) {
    return roadmap.replace(/ Roadmap.*$| \(.*\)$|–.*$/g, '').trim() || clean;
  }
  return clean;
}

// Stable id from the question text, so rebuilding the bank never duplicates or loses progress.
export const questionId = (q) => createHash('sha1').update(q.trim().toLowerCase().replace(/\s+/g, ' ')).digest('base64url').slice(0, 12);

function guessType(category, q, hasShortAnswer) {
  if (category === 'HR and Behavioral') return 'behavioral';
  if (category === 'Aptitude' || (category === 'Core CS (GATE)' && hasShortAnswer)) return 'aptitude';
  if (/\b(design|architect|scale|build a|how would you build)\b/i.test(q) && category !== 'OOP') return 'system-design';
  if (/\b(write|implement|code|query|function that|return the|find the)\b/i.test(q)) return 'coding';
  return 'conceptual';
}

// Turns the roadmap data files ("L|question" or "L|question||answer") into bank documents.
export function bankFromRoadmapData(dataFiles) {
  const out = [];
  for (const data of dataFiles) {
    for (const [roadmap, sections] of Object.entries(data)) {
      const category = ROADMAP_CATEGORY[roadmap];
      if (!category) continue;
      for (const [section, entries] of Object.entries(sections)) {
        for (const entry of entries) {
          const m = /^([BIA])\|(.+?)(?:\|\|(.+))?$/s.exec(entry);
          if (!m) continue;
          const [, lvl, q, short] = m;
          out.push({
            q: q.trim(),
            a: short ? short.trim() : '',
            answerSource: short ? 'author' : '',
            category,
            topic: topicOf(roadmap, section),
            difficulty: LEVEL[lvl],
            type: guessType(category, q, Boolean(short)),
            source: `roadmap:${roadmap}`,
          });
        }
      }
    }
  }
  return out;
}

export function bankFromExtra(list) {
  return list.map((e) => ({
    q: e.q.trim(), a: e.a.trim(), answerSource: 'author', category: e.category, topic: e.topic,
    difficulty: e.d, type: e.type, source: 'bank',
  }));
}

const questions = () => collection('interview_questions');
const progress = () => collection('interview_progress');

// Inserts new questions and refreshes the metadata of existing ones. An answer is only replaced
// when the new one is written by the author and the stored one is empty or also by the author
// (so AI-written answers are kept until the author supplies a real one).
export async function upsertQuestions(docs, { dry = false } = {}) {
  const col = await questions();
  const ids = docs.map((d) => questionId(d.q));
  const existing = new Map((await col.find({ _id: { $in: ids } }).toArray()).map((d) => [d._id, d]));
  const now = new Date().toISOString();
  let added = 0, updated = 0;
  const ops = [];
  const seen = new Set();
  for (const d of docs) {
    const _id = questionId(d.q);
    if (seen.has(_id)) continue;
    seen.add(_id);
    const old = existing.get(_id);
    if (!old) {
      added++;
      ops.push({ insertOne: { document: { _id, ...d, createdAt: now, updatedAt: now } } });
      continue;
    }
    const $set = {};
    for (const k of ['category', 'topic', 'difficulty', 'type', 'source']) if (old[k] !== d[k]) $set[k] = d[k];
    if (d.a && d.answerSource === 'author' && (!old.a || old.answerSource === 'author') && old.a !== d.a) {
      $set.a = d.a; $set.answerSource = 'author';
    }
    if (Object.keys($set).length) {
      updated++;
      $set.updatedAt = now;
      ops.push({ updateOne: { filter: { _id }, update: { $set } } });
    }
  }
  if (!dry && ops.length) await col.bulkWrite(ops, { ordered: false });
  if (!dry) {
    await col.createIndex({ category: 1, difficulty: 1 });
    await col.createIndex({ q: 'text', topic: 'text' });
    await (await progress()).createIndex({ user: 1, updatedAt: -1 });
  }
  return { added, updated, total: seen.size };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listQuestions({ user, category, difficulty, type, search, status, bookmarked, page = 1, pageSize = 30 }) {
  const filter = {};
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (search) {
    const re = new RegExp(escapeRe(search), 'i');
    filter.$or = [{ q: re }, { topic: re }];
  }
  // Progress filters need the user's progress ids first.
  let progressMap = new Map();
  if (user) {
    const mine = await (await progress()).find({ user }).toArray();
    progressMap = new Map(mine.map((p) => [p.qid, p]));
    let include = null;
    if (bookmarked) include = new Set(mine.filter((p) => p.bookmarked).map((p) => p.qid));
    if (status && status !== 'not_started') {
      const withStatus = mine.filter((p) => p.status === status).map((p) => p.qid);
      include = new Set(include ? withStatus.filter((q) => include.has(q)) : withStatus);
    }
    if (include) filter._id = { $in: [...include] };
    if (status === 'not_started') {
      filter._id = { ...(filter._id || {}), $nin: mine.filter((p) => p.status && p.status !== 'not_started').map((p) => p.qid) };
    }
  }
  const col = await questions();
  const [total, docs] = await Promise.all([
    col.countDocuments(filter),
    col.find(filter, { projection: { q: 1, category: 1, topic: 1, difficulty: 1, type: 1, answerSource: 1, hasA: { $gt: [{ $strLenCP: { $ifNull: ['$a', ''] } }, 0] } } })
      .sort({ category: 1, difficulty: 1, _id: 1 })
      .skip((page - 1) * pageSize).limit(pageSize).toArray(),
  ]);
  return {
    total, page, pageSize,
    items: docs.map((d) => ({ ...shape(d), ...progressOf(progressMap.get(d._id)) })),
  };
}

const shape = (d) => ({
  id: d._id, q: d.q, category: d.category, topic: d.topic, difficulty: d.difficulty, type: d.type,
  hasAnswer: d.hasA ?? Boolean(d.a), answerSource: d.answerSource || '',
});
const progressOf = (p) => ({
  status: p?.status || 'not_started', bookmarked: Boolean(p?.bookmarked), lastReviewedAt: p?.lastReviewedAt || null, reviews: p?.reviews || 0,
});

export async function getQuestion(id, user) {
  const [d, p] = await Promise.all([
    (await questions()).findOne({ _id: id }),
    user ? (await progress()).findOne({ _id: `${user}:${id}` }) : null,
  ]);
  return d ? { ...shape(d), a: d.a || '', ...progressOf(p) } : null;
}

export async function getQuestionsByIds(ids) {
  return (await questions()).find({ _id: { $in: ids } }).toArray();
}

export async function sampleQuestions({ category, difficulty, count, excludeIds = [] }) {
  const match = { category, _id: { $nin: excludeIds } };
  if (difficulty && difficulty !== 'Mixed') match.difficulty = difficulty;
  // HR answers are judged on structure, aptitude on the number: both fine for the AI to score.
  return (await questions()).aggregate([{ $match: match }, { $sample: { size: count } }]).toArray();
}

export async function setAnswer(id, a, answerSource) {
  const res = await (await questions()).findOneAndUpdate(
    { _id: id }, { $set: { a, answerSource, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' },
  );
  return res;
}

export async function setProgress(user, qid, { status, bookmarked, reviewed }) {
  const now = new Date().toISOString();
  const $set = { user, qid, updatedAt: now };
  if (status !== undefined) $set.status = status;
  if (bookmarked !== undefined) $set.bookmarked = bookmarked;
  const update = { $set, $setOnInsert: {} };
  if (reviewed) { $set.lastReviewedAt = now; update.$inc = { reviews: 1 }; }
  if (status === undefined) update.$setOnInsert.status = 'not_started';
  if (bookmarked === undefined) update.$setOnInsert.bookmarked = false;
  if (!Object.keys(update.$setOnInsert).length) delete update.$setOnInsert;
  const res = await (await progress()).findOneAndUpdate({ _id: `${user}:${qid}` }, update, { upsert: true, returnDocument: 'after' });
  return progressOf(res);
}

export async function summary(user) {
  const col = await questions();
  const [byCat, mine] = await Promise.all([
    col.aggregate([{ $group: { _id: { c: '$category', d: '$difficulty' }, n: { $sum: 1 }, answered: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$a', ''] } }, 0] }, 1, 0] } } } }]).toArray(),
    user ? (await progress()).find({ user }).toArray() : [],
  ]);
  const ids = new Set(mine.map((p) => p.qid));
  const qCats = ids.size ? new Map((await col.find({ _id: { $in: [...ids] } }, { projection: { category: 1 } }).toArray()).map((d) => [d._id, d.category])) : new Map();
  const cats = {};
  for (const c of CATEGORIES) cats[c] = { category: c, total: 0, answered: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, learning: 0, completed: 0, bookmarked: 0 };
  for (const r of byCat) {
    const c = cats[r._id.c] ||= { category: r._id.c, total: 0, answered: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, learning: 0, completed: 0, bookmarked: 0 };
    c.total += r.n; c.answered += r.answered; c.byDifficulty[r._id.d] = (c.byDifficulty[r._id.d] || 0) + r.n;
  }
  for (const p of mine) {
    const c = cats[qCats.get(p.qid)];
    if (!c) continue;
    if (p.status === 'learning') c.learning++;
    if (p.status === 'completed') c.completed++;
    if (p.bookmarked) c.bookmarked++;
  }
  return { categories: Object.values(cats).filter((c) => c.total), recent: mine.sort((a, b) => (b.lastReviewedAt || '').localeCompare(a.lastReviewedAt || '')).slice(0, 10).map((p) => p.qid) };
}
