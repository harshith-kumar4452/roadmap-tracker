// /api/plans: upload a study plan, review the extracted entries, confirm them into the calendar.
// Nothing is added to the calendar until the owner confirms; entries without a date can't be added.
//
// plans: { _id, filename, kind, size, file (Binary), status: draft|confirmed|discarded, method: ai|table,
//   model, summary, assumptions, items: [...], createdTaskIds, createdAt, confirmedAt }
import express from 'express';
import { Binary } from 'mongodb';
import { collection, newId } from '../store.js';
import { httpError, text, ownerOnly, found, todayIso, date as isDate, time as isTime, oneOf } from '../http.js';
import { aiConfigured } from '../ai/gemini.js';
import * as ex from './extract.js';
import * as taskStore from '../tasks/store.js';
import * as gsync from '../google/sync.js';

const router = express.Router();
const plans = () => collection('plans');

router.use((req, res, next) => { ownerOnly(req, 'Only the owner can upload plans'); next(); });

const pub = (p, { withItems = true } = {}) => ({
  id: p._id, filename: p.filename, kind: p.kind, kindLabel: ex.KINDS[p.kind]?.label, size: p.size, status: p.status, method: p.method,
  model: p.model || null, summary: p.summary || '', assumptions: p.assumptions || [], createdAt: p.createdAt, confirmedAt: p.confirmedAt || null,
  counts: { total: p.items.length, included: p.items.filter((i) => i.include).length, blocking: p.items.filter(ex.blocking).length, created: (p.createdTaskIds || []).length },
  ...(withItems ? { items: p.items } : {}),
});

router.get('/', async (req, res) => {
  const list = await (await plans()).find({}, { projection: { file: 0 } }).sort({ createdAt: -1 }).limit(30).toArray();
  res.json({ ai: aiConfigured(), plans: list.map((p) => pub(p, { withItems: false })) });
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const filename = text(b.filename, 'filename', { max: 200 }).replace(/[^\w.\- ()]/g, '_');
  if (typeof b.data !== 'string' || !b.data) throw httpError(400, 'File data is missing');
  const buf = Buffer.from(b.data, 'base64');
  if (!buf.length) throw httpError(400, 'The file is empty');
  if (buf.length > ex.MAX_BYTES) throw httpError(413, 'The file is larger than 3 MB. Split it or export just the schedule pages.');
  const kind = ex.detectKind(filename, buf);
  if (!kind) throw httpError(415, 'Unsupported file. Upload a PDF, Word (.docx), Excel (.xlsx), CSV, PNG/JPG image or text file.');
  const today = b.today ? isDate(b.today, 'today') : todayIso();

  let content;
  try { content = await ex.readContent(kind, buf); } catch { throw httpError(422, `Could not read this ${ex.KINDS[kind].label}. Is the file damaged or password-protected?`); }
  if (content.text !== undefined && !content.text.trim() && !content.inline) throw httpError(422, 'No text found in the file.');

  let result = null;
  let method = 'ai';
  if (aiConfigured()) {
    try { result = await ex.aiExtract({ content, filename, today, tz: gsync.TZ() }); } catch (err) {
      result = content.table ? ex.tableExtract(content.table) : null;
      if (!result) throw err;
      method = 'table';
      result.assumptions.unshift(`The AI was unavailable (${err.message}), so only the table columns were read.`);
    }
  } else {
    result = content.table ? ex.tableExtract(content.table) : null;
    method = 'table';
    if (!result) throw httpError(503, 'Reading this kind of file needs the AI (GEMINI_API_KEY is not set). A CSV or Excel file with "Task" and "Date" columns can be read without it.');
  }
  const existing = await taskStore.listTasks({ from: today });
  const items = ex.cleanItems(result.items, { today, existing });
  const doc = {
    _id: newId(), filename, kind, size: buf.length, file: new Binary(buf), status: 'draft', method, model: result.model,
    summary: result.summary, assumptions: result.assumptions, items, createdTaskIds: [], createdAt: new Date().toISOString(),
  };
  await (await plans()).insertOne(doc);
  res.status(201).json(pub(doc));
});

const getPlan = async (req) => found(await (await plans()).findOne({ _id: text(req.params.id, 'id', { max: 32 }) }, { projection: { file: 0 } }), 'Plan');

router.get('/:id', async (req, res) => { res.json(pub(await getPlan(req))); });

router.get('/:id/file', async (req, res) => {
  const p = found(await (await plans()).findOne({ _id: text(req.params.id, 'id', { max: 32 }) }), 'Plan');
  res.setHeader('Content-Type', ex.KINDS[p.kind].mime);
  res.setHeader('Content-Disposition', `attachment; filename="${p.filename.replace(/"/g, '')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(Buffer.from(p.file.buffer));
});

// Edited preview from the client: validated item by item, issues recomputed.
function cleanEdited(list) {
  if (!Array.isArray(list) || list.length > 300) throw httpError(400, 'items must be a list (max 300)');
  return list.map((it, i) => ({
    id: text(String(it.id || `i${i + 1}`), 'id', { max: 20 }),
    include: Boolean(it.include),
    touched: true,
    title: text(it.title, `Entry ${i + 1} title`, { max: 200 }),
    date: it.date ? isDate(it.date, `Entry ${i + 1} date`) : null,
    time: isTime(it.time ?? null, `Entry ${i + 1} start time`) ?? null,
    endTime: isTime(it.endTime ?? null, `Entry ${i + 1} end time`) ?? null,
    priority: oneOf(it.priority, taskStore.PRIORITIES, 'priority', { required: true }),
    category: oneOf(it.category, taskStore.CATEGORIES, 'category', { required: true }),
    recurrence: it.recurrence && ['daily', 'weekly'].includes(it.recurrence.freq)
      ? { freq: it.recurrence.freq, days: (it.recurrence.days || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6), until: it.recurrence.until ? isDate(it.recurrence.until, 'until') : null }
      : null,
    notes: typeof it.notes === 'string' ? it.notes.slice(0, 1000) : '',
    isDeadline: Boolean(it.isDeadline),
    sourceText: typeof it.sourceText === 'string' ? it.sourceText.slice(0, 200) : '',
    ambiguity: null, // resolved by the user's edit
    issues: [],
  }));
}

router.put('/:id/items', async (req, res) => {
  const p = await getPlan(req);
  if (p.status !== 'draft') throw httpError(409, 'This plan was already confirmed.');
  const existing = await taskStore.listTasks({ from: todayIso() });
  const items = ex.flagIssues(cleanEdited(req.body?.items), { today: req.body?.today ? isDate(req.body.today) : todayIso(), existing });
  await (await plans()).updateOne({ _id: p._id }, { $set: { items } });
  res.json(pub({ ...p, items }));
});

router.post('/:id/confirm', async (req, res) => {
  const p = await getPlan(req);
  if (p.status !== 'draft') throw httpError(409, 'This plan was already confirmed.');
  const items = req.body?.items ? ex.flagIssues(cleanEdited(req.body.items), { today: todayIso(), existing: await taskStore.listTasks({ from: todayIso() }) }) : p.items;
  const chosen = items.filter((i) => i.include);
  if (!chosen.length) throw httpError(400, 'Tick at least one entry to add.');
  const missing = chosen.filter(ex.blocking);
  if (missing.length) throw httpError(400, `${missing.length} ticked entr${missing.length === 1 ? 'y has' : 'ies have'} no date. Add a date or untick ${missing.length === 1 ? 'it' : 'them'}.`);
  // Claim the plan first so a double click can't add everything twice.
  const claim = await (await plans()).findOneAndUpdate({ _id: p._id, status: 'draft' }, { $set: { status: 'confirming', items } });
  if (!claim) throw httpError(409, 'This plan is already being added.');
  let docs;
  try {
    docs = await taskStore.createTasks(chosen.map((i) => ({
      title: i.title, notes: [i.notes, i.sourceText && `From "${p.filename}": ${i.sourceText}`].filter(Boolean).join('\n'),
      date: i.date, time: i.time, endTime: i.time ? i.endTime : null, priority: i.priority, category: i.category,
      kind: i.time ? 'event' : 'task', recurrence: i.recurrence, source: 'plan', planId: p._id,
    })));
  } catch (err) {
    await (await plans()).updateOne({ _id: p._id }, { $set: { status: 'draft' } }); // let the user retry
    throw err;
  }
  // Push to Google now for small plans; larger ones are finished by the next sync.
  let pushed = 0;
  if (await gsync.connected()) {
    for (const d of docs.slice(0, 40)) { const r = await gsync.pushTask(d); if (r.eventId) pushed++; }
  }
  await (await plans()).updateOne({ _id: p._id }, { $set: { status: 'confirmed', confirmedAt: new Date().toISOString(), createdTaskIds: docs.map((d) => d._id) } });
  res.json({ ...pub({ ...p, items, status: 'confirmed', createdTaskIds: docs.map((d) => d._id) }), pushedToGoogle: pushed, pendingGoogle: Math.max(0, docs.length - 40) });
});

router.delete('/:id', async (req, res) => {
  const p = await getPlan(req);
  await (await plans()).deleteOne({ _id: p._id });
  res.status(204).end();
});

export default router;
