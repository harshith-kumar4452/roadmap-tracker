import express from 'express';
import * as store from './store.js';
import { parseMarkdown, countItems } from './parse.js';
import * as auth from './auth.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
const text = (v, name, { required = true, max = 500 } = {}) => {
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string' || (required && !v.trim())) throw httpError(400, `${name} is required`);
  return v.trim().slice(0, max);
};
const optionalUrl = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !/^https?:\/\//i.test(v.trim())) throw httpError(400, 'Links must start with http:// or https://');
  return v.trim();
};
const found = (v, what) => {
  if (!v) throw httpError(404, `${what} not found`);
  return v;
};
const id = (req) => text(req.params.id, 'id', { max: 64 });

const links = (list) => {
  if (!Array.isArray(list)) throw httpError(400, 'resources must be a list');
  return list.slice(0, 50).map((r) => ({ title: text(r.title, 'Resource title', { max: 300 }), url: optionalUrl(r.url) }));
};
const notes = (list) => {
  if (!Array.isArray(list)) throw httpError(400, 'notes must be a list');
  return list.slice(0, 30).map((n) => ({
    heading: text(n.heading, 'Note heading', { max: 200 }),
    lines: (Array.isArray(n.lines) ? n.lines : []).slice(0, 100).map((l) => text(l, 'Note line', { max: 1000 })),
  }));
};

// ---------- auth ----------

app.get('/api/me', (req, res) => res.json({ admin: auth.isAdmin(req), editingEnabled: auth.editingEnabled() }));

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!auth.editingEnabled()) throw httpError(400, 'Editing is turned off: ADMIN_PASSWORD is not set on the server.');
  if (auth.tooManyAttempts(ip)) throw httpError(429, 'Too many attempts. Try again in 15 minutes.');
  if (!auth.checkPassword(req.body?.password)) {
    auth.recordFailure(ip);
    throw httpError(401, 'Wrong password');
  }
  auth.setSession(req, res);
  res.json({ admin: true });
});

app.post('/api/logout', (req, res) => {
  auth.clearSession(req, res);
  res.json({ admin: false });
});

// Everything that changes data needs the owner session.
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (!auth.isAdmin(req)) throw httpError(401, 'Log in to make changes');
  next();
});

// ---------- roadmaps ----------

app.get('/api/roadmaps', async (req, res) => res.json(await store.listRoadmaps()));

app.post('/api/roadmaps', async (req, res) => {
  res.status(201).json(await store.createRoadmap({ title: text(req.body.title, 'Title', { max: 200 }) }));
});

app.get('/api/roadmaps/:id', async (req, res) => res.json(found(await store.getRoadmap(id(req)), 'Roadmap')));

app.patch('/api/roadmaps/:id', async (req, res) => {
  const b = req.body;
  const patch = {
    title: text(b.title, 'Title', { required: false, max: 200 }),
    intro: b.intro === undefined ? undefined : text(b.intro, 'Intro', { required: false, max: 5000 }) ?? '',
    resources: b.resources === undefined ? undefined : links(b.resources),
    notes: b.notes === undefined ? undefined : notes(b.notes),
  };
  res.json(found(await store.updateRoadmap(id(req), patch), 'Roadmap'));
});

app.delete('/api/roadmaps/:id', async (req, res) => {
  found(await store.deleteRoadmap(id(req)), 'Roadmap');
  res.status(204).end();
});

// ---------- sections ----------

app.post('/api/roadmaps/:id/sections', async (req, res) => {
  res.status(201).json(found(await store.createSection(id(req), text(req.body.title, 'Section name', { max: 200 })), 'Roadmap'));
});
app.patch('/api/sections/:id', async (req, res) => {
  found(await store.renameSection(id(req), text(req.body.title, 'Section name', { max: 200 })), 'Section');
  res.status(204).end();
});
app.delete('/api/sections/:id', async (req, res) => {
  found(await store.deleteSection(id(req)), 'Section');
  res.status(204).end();
});

// ---------- items ----------

app.post('/api/sections/:id/items', async (req, res) => {
  const item = await store.createItem(id(req), {
    title: text(req.body.title, 'Topic'),
    url: optionalUrl(req.body.url),
    level: req.body.level,
  });
  res.status(201).json(found(item, 'Section'));
});

app.patch('/api/items/:id', async (req, res) => {
  const b = req.body;
  let status = b.status;
  if (b.done !== undefined) status = b.done ? 'done' : 'not_started';
  if (status !== undefined && !store.STATUSES.includes(status)) throw httpError(400, 'Unknown status');
  if (b.level !== undefined && !store.LEVELS.includes(b.level)) throw httpError(400, 'Unknown level');
  const item = await store.updateItem(id(req), {
    status,
    level: b.level,
    title: text(b.title, 'Topic', { required: false }),
    url: optionalUrl(b.url),
    note: b.note === undefined ? undefined : text(b.note, 'Note', { required: false, max: 5000 }) ?? '',
  });
  res.json(found(item, 'Topic'));
});

app.delete('/api/items/:id', async (req, res) => {
  found(await store.deleteItem(id(req)), 'Topic');
  res.status(204).end();
});

// ---------- stats & import ----------

app.get('/api/stats', async (req, res) => res.json(await store.stats()));

app.post('/api/import/markdown', async (req, res) => {
  const parsed = parseMarkdown(text(req.body.markdown, 'Markdown', { max: 2_000_000 }));
  if (!countItems(parsed.sections)) {
    throw httpError(400, 'No checklist items found. Topics need to look like "- [ ] Topic".');
  }
  const title = text(req.body.title, 'Title', { required: false, max: 200 }) || parsed.title || 'Imported roadmap';
  const sections = parsed.sections.map((s) => ({
    title: s.title,
    items: s.items.map((i) => ({ title: i.text, url: i.url, status: i.checked ? 'done' : 'not_started' })),
  }));
  res.status(201).json(await store.createRoadmap({ title, sections }));
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.expose ? 'Something went wrong' : err.message });
});

export default app;
