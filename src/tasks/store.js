// Tasks and calendar entries (one collection: a task with a time range is a calendar event).
//
// tasks: {
//   _id, title, notes, date: "YYYY-MM-DD" | null (someday), time: "HH:MM" | null, endTime: "HH:MM" | null,
//   priority: critical|high|medium|low, category: study|personal|work, kind: task|event,
//   recurrence: null | { freq: daily|weekly, until: "YYYY-MM-DD" | null, days: [0-6] },
//   done, doneAt, source: app|plan|google|coding, planId?, createdAt, updatedAt,
//   google: { eventId, calendarId, syncedAt, error, optOut } | undefined
// }
import { collection, newId } from '../store.js';

export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const CATEGORIES = ['study', 'personal', 'work'];
export const KINDS = ['task', 'event'];

const tasks = () => collection('tasks');

export const publicTask = (d) => d && ({
  id: d._id,
  title: d.title,
  notes: d.notes || '',
  date: d.date ?? null,
  time: d.time ?? null,
  endTime: d.endTime ?? null,
  priority: d.priority || 'medium',
  category: d.category || 'personal',
  kind: d.kind || 'task',
  recurrence: d.recurrence || null,
  done: Boolean(d.done),
  doneAt: d.doneAt || null,
  source: d.source || 'app',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt || d.createdAt,
  sync: d.google ? { synced: Boolean(d.google.eventId) && !d.google.error, error: d.google.error || null, syncedAt: d.google.syncedAt || null, optOut: Boolean(d.google.optOut) } : null,
});

// Open tasks, plus finished ones from the last `doneDays` days, plus anything in a date range.
export async function listTasks({ from, to, doneDays = 30 } = {}) {
  const since = new Date(Date.now() - doneDays * 86400000).toISOString();
  const or = [{ done: false }, { doneAt: { $gte: since } }];
  if (from || to) {
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    or.push({ date: range });
  }
  const docs = await (await tasks()).find({ $or: or }).sort({ date: 1, time: 1, createdAt: 1 }).limit(2000).toArray();
  return docs.map(publicTask);
}

export async function getTaskDoc(id) {
  return (await tasks()).findOne({ _id: id });
}

export async function createTask(fields) {
  const now = new Date().toISOString();
  const doc = {
    _id: newId(), title: fields.title, notes: fields.notes || '', date: fields.date ?? null, time: fields.time ?? null,
    endTime: fields.endTime ?? null, priority: fields.priority || 'medium', category: fields.category || 'personal',
    kind: fields.kind || (fields.time ? 'event' : 'task'), recurrence: fields.recurrence || null,
    done: false, doneAt: null, source: fields.source || 'app', ...(fields.planId ? { planId: fields.planId } : {}),
    createdAt: now, updatedAt: now,
  };
  await (await tasks()).insertOne(doc);
  return doc;
}

export async function createTasks(list) {
  const now = new Date().toISOString();
  const docs = list.map((f) => ({
    _id: newId(), title: f.title, notes: f.notes || '', date: f.date ?? null, time: f.time ?? null, endTime: f.endTime ?? null,
    priority: f.priority || 'medium', category: f.category || 'study', kind: f.kind || (f.time ? 'event' : 'task'),
    recurrence: f.recurrence || null, done: false, doneAt: null, source: f.source || 'app', ...(f.planId ? { planId: f.planId } : {}),
    createdAt: now, updatedAt: now,
  }));
  if (docs.length) await (await tasks()).insertMany(docs);
  return docs;
}

const EDITABLE = ['title', 'notes', 'date', 'time', 'endTime', 'priority', 'category', 'kind', 'recurrence'];

export async function updateTask(id, patch, { touch = true } = {}) {
  const $set = {};
  for (const key of EDITABLE) if (patch[key] !== undefined) $set[key] = patch[key];
  if (patch.done !== undefined) {
    $set.done = patch.done;
    $set.doneAt = patch.done ? new Date().toISOString() : null;
  }
  if (touch) $set.updatedAt = new Date().toISOString();
  if (!Object.keys($set).length) return getTaskDoc(id);
  return (await tasks()).findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
}

export async function setGoogle(id, google) {
  const $set = {};
  for (const [k, v] of Object.entries(google)) $set[`google.${k}`] = v;
  await (await tasks()).updateOne({ _id: id }, { $set });
}

export async function clearGoogleLinks() {
  await (await tasks()).updateMany({ google: { $exists: true } }, { $unset: { google: '' } });
}

export async function findByEventId(eventId) {
  return (await tasks()).findOne({ 'google.eventId': eventId });
}

export async function tasksNeedingSync(limit = 100) {
  return (await tasks()).find({
    date: { $ne: null },
    'google.optOut': { $ne: true },
    $or: [{ google: { $exists: false } }, { 'google.error': { $nin: [null, ''] } }, { $expr: { $gt: ['$updatedAt', { $ifNull: ['$google.syncedAt', ''] }] } }],
  }).limit(limit).toArray();
}

export async function deleteTask(id) {
  const res = await (await tasks()).findOneAndDelete({ _id: id });
  return res;
}

export async function syncCounts() {
  const col = await tasks();
  const [errors, synced] = await Promise.all([
    col.countDocuments({ 'google.error': { $nin: [null, ''] } }),
    col.countDocuments({ 'google.eventId': { $nin: [null, ''] } }),
  ]);
  return { errors, synced };
}
