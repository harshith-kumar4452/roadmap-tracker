// /api/interview: question bank (read by any signed-in user), learning progress (per user),
// model answers and AI mock interviews (owner only, because they cost money per call).
//
// interview_sessions: { _id, user, category, difficulty, count, status: active|completed,
//   items: [{ qid, q, topic, difficulty, type, answer, answeredAt, evaluation }],
//   report, createdAt, completedAt }
import express from 'express';
import { collection, newId } from '../store.js';
import { httpError, text, oneOf, int, ownerOnly, signedIn, found } from '../http.js';
import { aiConfigured, aiModel } from '../ai/gemini.js';
import * as bank from './bank.js';
import { evaluateAnswer, writeModelAnswer, buildReport, scoreOf, CRITERIA, CRITERIA_LABELS } from './ai.js';

const router = express.Router();
const sessions = () => collection('interview_sessions');
const qid = (req) => text(req.params.id, 'id', { max: 32 });

router.get('/meta', (req, res) => {
  res.json({
    categories: bank.CATEGORIES, difficulties: bank.DIFFICULTIES, types: bank.TYPES, statuses: bank.STATUSES,
    criteria: CRITERIA.map((key) => ({ key, label: CRITERIA_LABELS[key] })),
    ai: { configured: aiConfigured(), model: aiConfigured() ? aiModel() : null },
  });
});

router.get('/summary', async (req, res) => {
  const s = signedIn(req, 'Log in to open interview prep');
  res.json(await bank.summary(s.username));
});

router.get('/questions', async (req, res) => {
  const s = signedIn(req, 'Log in to open interview prep');
  const q = req.query;
  res.json(await bank.listQuestions({
    user: s.username,
    category: q.category ? oneOf(q.category, bank.CATEGORIES, 'category') : undefined,
    difficulty: q.difficulty ? oneOf(q.difficulty, bank.DIFFICULTIES, 'difficulty') : undefined,
    type: q.type ? oneOf(q.type, bank.TYPES, 'type') : undefined,
    status: q.status ? oneOf(q.status, bank.STATUSES, 'status') : undefined,
    bookmarked: q.bookmarked === '1' || q.bookmarked === 'true',
    search: q.search ? text(q.search, 'search', { max: 100 }) : undefined,
    page: int(q.page, 'page', { min: 1, max: 1000, fallback: 1 }),
    pageSize: int(q.pageSize, 'pageSize', { min: 5, max: 100, fallback: 30 }),
  }));
});

router.get('/questions/:id', async (req, res) => {
  const s = signedIn(req, 'Log in to open interview prep');
  res.json(found(await bank.getQuestion(qid(req), s.username), 'Question'));
});

// Status, bookmark and "reviewed" are per user, so members can track their own learning too.
router.put('/progress/:id', async (req, res) => {
  const s = signedIn(req, 'Log in to track your progress');
  const id = qid(req);
  found(await bank.getQuestion(id), 'Question');
  const b = req.body || {};
  res.json(await bank.setProgress(s.username, id, {
    status: b.status === undefined ? undefined : oneOf(b.status, bank.STATUSES, 'status'),
    bookmarked: b.bookmarked === undefined ? undefined : Boolean(b.bookmarked),
    reviewed: Boolean(b.reviewed),
  }));
});

// Writes (and stores) a model answer for a question that has none yet. Owner only.
router.post('/questions/:id/answer', async (req, res) => {
  ownerOnly(req, 'Only the owner can generate answers');
  const q = found(await bank.getQuestion(qid(req)), 'Question');
  if (q.hasAnswer && !req.body?.regenerate) return res.json(q);
  const a = await writeModelAnswer({ question: q.q, category: q.category, difficulty: q.difficulty, type: q.type });
  await bank.setAnswer(q.id, a, 'ai');
  res.json(await bank.getQuestion(q.id, req.session?.username));
});

// ---------- AI mock interviews (owner) ----------

const publicItem = (it, i, current) => ({
  index: i, qid: it.qid, q: it.q, topic: it.topic, difficulty: it.difficulty, type: it.type,
  answered: Boolean(it.answeredAt), answer: it.answer ?? null,
  evaluation: it.evaluation ? { ...it.evaluation, score: scoreOf(it.evaluation.scores) } : null,
  current: i === current,
});

const publicSession = (s) => {
  const current = s.items.findIndex((it) => !it.answeredAt);
  return {
    id: s._id, category: s.category, difficulty: s.difficulty, count: s.items.length, status: s.status,
    createdAt: s.createdAt, completedAt: s.completedAt || null, current: current === -1 ? null : current,
    // Unanswered questions after the current one stay hidden, like a real interview.
    items: s.items.map((it, i) => publicItem(it, i, current)).filter((it) => it.answered || it.current),
    report: s.report || null,
  };
};

router.get('/sessions', async (req, res) => {
  const s = signedIn(req);
  const list = await (await sessions()).find({ user: s.username }, { projection: { 'items.answer': 0, 'items.evaluation.expectedAnswer': 0 } })
    .sort({ createdAt: -1 }).limit(50).toArray();
  res.json(list.map((d) => ({
    id: d._id, category: d.category, difficulty: d.difficulty, count: d.items.length, status: d.status,
    answered: d.items.filter((i) => i.answeredAt).length, overall: d.report?.overall ?? null,
    byCriterion: d.report?.byCriterion ?? null, createdAt: d.createdAt, completedAt: d.completedAt || null,
  })));
});

router.post('/sessions', async (req, res) => {
  ownerOnly(req, 'Only the owner can run AI interviews');
  const b = req.body || {};
  const category = oneOf(b.category, bank.CATEGORIES, 'category', { required: true });
  const difficulty = oneOf(b.difficulty ?? 'Mixed', [...bank.DIFFICULTIES, 'Mixed'], 'difficulty');
  const count = int(b.count, 'count', { min: 1, max: 15, fallback: 5 });
  const col = await sessions();
  // Prefer questions this user hasn't been asked in recent interviews.
  const recent = await col.find({ user: req.session.username, category }, { projection: { 'items.qid': 1 } }).sort({ createdAt: -1 }).limit(10).toArray();
  const asked = [...new Set(recent.flatMap((r) => r.items.map((i) => i.qid)))];
  let picked = await bank.sampleQuestions({ category, difficulty, count, excludeIds: asked });
  if (picked.length < count) {
    const more = await bank.sampleQuestions({ category, difficulty, count: count - picked.length, excludeIds: picked.map((p) => p._id) });
    picked = picked.concat(more);
  }
  if (!picked.length) throw httpError(400, `No ${difficulty === 'Mixed' ? '' : `${difficulty} `}questions in ${category} yet.`);
  const doc = {
    _id: newId(), user: req.session.username, category, difficulty, count: picked.length, status: 'active',
    items: picked.map((p) => ({ qid: p._id, q: p.q, topic: p.topic, difficulty: p.difficulty, type: p.type, answer: null, answeredAt: null, evaluation: null })),
    report: null, createdAt: new Date().toISOString(),
  };
  await col.insertOne(doc);
  await col.createIndex({ user: 1, createdAt: -1 });
  res.status(201).json(publicSession(doc));
});

const ownSession = async (req) => {
  const s = signedIn(req);
  const doc = await (await sessions()).findOne({ _id: text(req.params.id, 'id', { max: 32 }), user: s.username });
  return found(doc, 'Interview');
};

router.get('/sessions/:id', async (req, res) => {
  res.json(publicSession(await ownSession(req)));
});

router.post('/sessions/:id/answer', async (req, res) => {
  ownerOnly(req, 'Only the owner can run AI interviews');
  const doc = await ownSession(req);
  if (doc.status !== 'active') throw httpError(409, 'This interview is already finished.');
  const index = doc.items.findIndex((it) => !it.answeredAt);
  if (index === -1) throw httpError(409, 'Every question is answered. Finish the interview to get your report.');
  if (req.body?.index !== undefined && Number(req.body.index) !== index) throw httpError(409, 'That question was already answered. Reload the interview.');
  const answer = typeof req.body?.answer === 'string' ? req.body.answer.slice(0, 8000) : '';
  const item = doc.items[index];
  const ref = (await bank.getQuestionsByIds([item.qid]))[0];
  const evaluation = await evaluateAnswer({ question: item.q, reference: ref?.a || '', difficulty: item.difficulty, category: doc.category, answer });
  const now = new Date().toISOString();
  // Guard against a double submit: only write if the slot is still unanswered.
  const upd = await (await sessions()).findOneAndUpdate(
    { _id: doc._id, [`items.${index}.answeredAt`]: null },
    { $set: { [`items.${index}.answer`]: answer, [`items.${index}.answeredAt`]: now, [`items.${index}.evaluation`]: evaluation } },
    { returnDocument: 'after' },
  );
  if (!upd) throw httpError(409, 'That question was already answered. Reload the interview.');
  res.json(publicSession(upd));
});

router.post('/sessions/:id/finish', async (req, res) => {
  ownerOnly(req, 'Only the owner can run AI interviews');
  const doc = await ownSession(req);
  if (doc.status === 'completed') return res.json(publicSession(doc));
  const answered = doc.items.filter((it) => it.answeredAt);
  if (!answered.length) throw httpError(400, 'Answer at least one question first.');
  const report = await buildReport({ category: doc.category, difficulty: doc.difficulty, items: answered });
  report.skipped = doc.items.length - answered.length;
  const upd = await (await sessions()).findOneAndUpdate(
    { _id: doc._id },
    { $set: { status: 'completed', completedAt: new Date().toISOString(), report } },
    { returnDocument: 'after' },
  );
  res.json(publicSession(upd));
});

router.delete('/sessions/:id', async (req, res) => {
  ownerOnly(req);
  const doc = await ownSession(req);
  await (await sessions()).deleteOne({ _id: doc._id });
  res.status(204).end();
});

export default router;
