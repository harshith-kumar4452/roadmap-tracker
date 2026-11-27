// /api/coding: daily recommended problem, manual checklist, streaks and stats.
// Reading needs a login; tracking (ticking, adding problems) is the owner's.
import express from 'express';
import { httpError, text, date, oneOf, found, ownerOnly, signedIn, optionalUrl, todayIso } from '../http.js';
import * as svc from './service.js';

const router = express.Router();
let indexed = false;
const ready = async () => { if (!indexed) { await svc.ensureIndexes(); indexed = true; } };

// The browser sends its local date so "today" matches the user's day; the server's time zone is
// the fallback.
const dayOf = (req) => (req.query.date ? date(req.query.date) : todayIso());

router.get('/today', async (req, res) => {
  signedIn(req, 'Log in to see daily coding practice');
  await ready();
  const day = dayOf(req);
  const auto = await svc.ensureDaily(day);
  res.json({ date: day, problems: await svc.listDay(day), autoError: auto.problem ? null : (auto.errors || []).join('; ') || null });
});

router.get('/history', async (req, res) => {
  signedIn(req);
  const to = req.query.to ? date(req.query.to, 'to') : todayIso();
  const from = req.query.from ? date(req.query.from, 'from') : new Date(Date.parse(`${to}T12:00:00Z`) - 60 * 86400000).toISOString().slice(0, 10);
  if (from > to) throw httpError(400, 'from must be before to');
  res.json(await svc.listRange(from, to));
});

router.get('/stats', async (req, res) => {
  signedIn(req);
  res.json(await svc.stats(dayOf(req)));
});

const fields = (b, partial) => ({
  title: text(b.title, 'Problem name', { required: !partial, max: 200 }),
  url: b.url === undefined ? undefined : optionalUrl(b.url) || '',
  date: b.date === undefined ? (partial ? undefined : todayIso()) : date(b.date),
  difficulty: oneOf(b.difficulty, svc.DIFFICULTIES, 'difficulty'),
  topic: b.topic === undefined ? undefined : text(String(b.topic), 'Topic', { required: false, max: 80 }) ?? '',
  notes: b.notes === undefined ? undefined : text(String(b.notes), 'Notes', { required: false, max: 5000 }) ?? '',
  submissionUrl: b.submissionUrl === undefined ? undefined : optionalUrl(b.submissionUrl) || '',
});

router.post('/problems', async (req, res) => {
  ownerOnly(req, 'Only the owner can add problems');
  const b = req.body || {};
  res.status(201).json(await svc.addProblem({ ...fields(b, false), done: Boolean(b.done) }));
});

router.patch('/problems/:id', async (req, res) => {
  ownerOnly(req, 'Only the owner can track problems');
  const b = req.body || {};
  const f = fields(b, true);
  if (b.done !== undefined) f.done = Boolean(b.done);
  res.json(found(await svc.updateProblem(text(req.params.id, 'id', { max: 32 }), f), 'Problem'));
});

router.delete('/problems/:id', async (req, res) => {
  ownerOnly(req);
  if (!(await svc.deleteProblem(text(req.params.id, 'id', { max: 32 })))) throw httpError(404, 'Only problems you added can be deleted');
  res.status(204).end();
});

export default router;
