// /api/tasks: the owner's tasks and calendar entries. Every change is pushed to Google Calendar
// when it is connected (the response includes the sync result on the task).
import express from 'express';
import { httpError, text, date, time, oneOf, found, ownerOnly } from '../http.js';
import * as store from './store.js';
import * as sync from '../google/sync.js';

const router = express.Router();

const recurrence = (v) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'object') throw httpError(400, 'recurrence must be an object or null');
  const freq = oneOf(v.freq, ['daily', 'weekly'], 'recurrence.freq', { required: true });
  const days = v.days === undefined ? [] : v.days;
  if (!Array.isArray(days) || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw httpError(400, 'recurrence.days must be weekdays 0–6');
  return { freq, days: [...new Set(days)].sort(), until: v.until ? date(v.until, 'recurrence.until') : null };
};

export function taskFields(b, { partial = false } = {}) {
  const f = {
    title: text(b.title, 'Title', { required: !partial, max: 300 }),
    notes: b.notes === undefined ? undefined : text(String(b.notes ?? ''), 'Notes', { required: false, max: 5000 }) ?? '',
    date: b.date === undefined ? undefined : b.date ? date(b.date) : null,
    time: time(b.time),
    endTime: time(b.endTime, 'endTime'),
    priority: oneOf(b.priority, store.PRIORITIES, 'priority'),
    category: oneOf(b.category, store.CATEGORIES, 'category'),
    kind: oneOf(b.kind, store.KINDS, 'kind'),
    recurrence: recurrence(b.recurrence),
  };
  if (f.time && f.endTime && f.endTime <= f.time) throw httpError(400, 'The end time must be after the start time');
  if (f.date === null) { f.time = null; f.endTime = null; }
  return f;
}

router.use((req, res, next) => { ownerOnly(req, 'Log in to see your tasks'); next(); });

router.get('/', async (req, res) => {
  res.json(await store.listTasks({
    from: req.query.from ? date(req.query.from, 'from') : undefined,
    to: req.query.to ? date(req.query.to, 'to') : undefined,
  }));
});

router.post('/', async (req, res) => {
  const doc = await store.createTask(taskFields(req.body || {}));
  if (doc.date) await sync.pushTask(doc);
  res.status(201).json(store.publicTask(await store.getTaskDoc(doc._id)));
});

// Many tasks at once (sprint planner, importing calendar entries saved by the old planner).
router.post('/bulk', async (req, res) => {
  const list = req.body?.items;
  if (!Array.isArray(list) || !list.length || list.length > 200) throw httpError(400, 'items must be a list of 1–200 tasks');
  const source = oneOf(req.body.source ?? 'app', ['app', 'planner', 'import'], 'source');
  const docs = await store.createTasks(list.map((b) => ({ ...taskFields(b), source })));
  let pushed = 0;
  if (await sync.connected()) for (const d of docs.slice(0, 40)) if (d.date && (await sync.pushTask(d)).eventId) pushed++;
  res.status(201).json({ created: docs.length, pushedToGoogle: pushed });
});

router.patch('/:id', async (req, res) => {
  const b = req.body || {};
  const f = taskFields(b, { partial: true });
  if (b.done !== undefined) f.done = Boolean(b.done);
  const doc = found(await store.updateTask(text(req.params.id, 'id', { max: 64 }), f), 'Task');
  if (doc.date || doc.google?.eventId) await sync.pushTask(doc);
  res.json(store.publicTask(await store.getTaskDoc(doc._id)));
});

router.delete('/:id', async (req, res) => {
  const doc = found(await store.deleteTask(text(req.params.id, 'id', { max: 64 })), 'Task');
  await sync.deleteTaskEvent(doc);
  res.status(204).end();
});

export default router;
