import express from 'express';
import * as store from './store.js';
import { parseMarkdown, countItems } from './parse.js';
import * as auth from './auth.js';
import { codingStats } from './profile.js';
import { httpError, text, optionalUrl, found, id, date, ownerOnly } from './http.js';
import interviewRoutes from './interview/routes.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));
// The signed-in user (or null) for every request.
app.use((req, res, next) => { req.session = auth.getSession(req); next(); });



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

app.get('/api/me', async (req, res) => {
  const session = auth.getSession(req);
  const [account, owner] = await Promise.all([
    session ? store.findAccountByUsername(session.username) : null,
    store.getAccount(),
  ]);
  res.json({
    authenticated: Boolean(session),
    admin: session?.role === 'admin',
    editingEnabled: auth.editingEnabled(),
    hasAccount: Boolean(owner),
    name: session ? (account?.name ?? owner?.name ?? session.username) : null,
  });
});

const guardAttempts = (req) => {
  if (!auth.editingEnabled()) throw httpError(400, 'Accounts are turned off: ADMIN_PASSWORD is not set on the server.');
  if (auth.tooManyAttempts(req.ip || 'unknown')) throw httpError(429, 'Too many attempts. Try again in 15 minutes.');
};

app.post('/api/signup', async (req, res) => {
  guardAttempts(req);
  const b = req.body || {};
  const ownerExists = Boolean(await store.getAccount());
  let role = 'member';
  if (!ownerExists && b.setupKey) {
    if (!auth.checkSetupKey(b.setupKey)) {
      auth.recordFailure(req.ip || 'unknown');
      throw httpError(401, 'Wrong setup key');
    }
    role = 'admin';
  }
  const name = text(b.name, 'Name', { max: 80 });
  const username = text(b.username, 'Username', { max: 40 }).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw httpError(400, 'Username: 3–40 letters, numbers, dots, dashes or underscores');
  if (typeof b.password !== 'string' || b.password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (b.password.length > 200) throw httpError(400, 'Password is too long');
  const account = await store.createAccount({ name, username, role, ...(await auth.hashPassword(b.password)) });
  if (!account) throw httpError(409, 'That username is already taken. Try another or log in.');
  store.bustCache();
  if (role === 'admin') await store.seedHabits();
  auth.setSession(req, res, { role, username });
  res.status(201).json({ authenticated: true, admin: role === 'admin', name });
});

app.post('/api/login', async (req, res) => {
  guardAttempts(req);
  const b = req.body || {};
  const username = typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
  const account = username ? await store.findAccountByUsername(username) : null;
  const ok = await auth.verifyPassword(b.password, account || { salt: 'dummy', hash: 'dummy' });
  if (!account || !ok) {
    auth.recordFailure(req.ip || 'unknown');
    throw httpError(401, 'Wrong username or password');
  }
  const role = account._id === 'owner' || account.role === 'admin' ? 'admin' : 'member';
  auth.setSession(req, res, { role, username: account.username });
  res.json({ authenticated: true, admin: role === 'admin', name: account.name });
});

app.post('/api/logout', (req, res) => {
  auth.clearSession(req, res);
  res.json({ authenticated: false, admin: false });
});

// Feature routers check their own access (some writes are allowed for members), so they are
// mounted before the owner-only write guard below.
app.use('/api/interview', interviewRoutes);

// Overview lists are public; opening a specific roadmap, page, or links requires login.
// Editing requires the owner session.
const AUTH_GET_ROUTES = [/^\/roadmaps\/[^/]+$/, /^\/pages\/[^/]+$/, /^\/resources$/];
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET') res.on('finish', store.bustCache);
  if (req.method === 'GET') {
    if (AUTH_GET_ROUTES.some((re) => re.test(req.path)) && !auth.isAuthenticated(req)) {
      throw httpError(401, 'Log in to open this roadmap or view its links');
    }
    return next();
  }
  if (!auth.isAdmin(req)) throw httpError(401, 'Log in as owner to make changes');
  next();
});

// ---------- roadmaps ----------

// The roadmap list and stats are the same for every visitor, so Vercel's CDN may share them:
// fresh for 15 s, then served stale while one request refreshes them in the background. Visitors
// never wait on a cold function or the database for these; browsers still revalidate each time.
const SHARED = 'public, max-age=0, s-maxage=15, stale-while-revalidate=600';
app.get('/api/roadmaps', async (req, res) => res.set('Cache-Control', SHARED).json(await store.listRoadmaps()));

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

// ---------- pages: cheat sheets, projects, mindmaps ----------

const kind = (v) => {
  if (!store.PAGE_KINDS.includes(v)) throw httpError(400, `kind must be one of: ${store.PAGE_KINDS.join(', ')}`);
  return v;
};
const tags = (v) => {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw httpError(400, 'tags must be a list');
  return [...new Set(v.map((t) => text(t, 'Tag', { max: 40 })))].slice(0, 12);
};

app.get('/api/pages', async (req, res) => res.json(await store.listPages(kind(req.query.kind))));

app.get('/api/pages/:id', async (req, res) => res.json(found(await store.getPage(id(req)), 'Page')));

app.post('/api/pages', async (req, res) => {
  res.status(201).json(await store.createPage({ kind: kind(req.body.kind), title: text(req.body.title, 'Title', { max: 200 }) }));
});

app.patch('/api/pages/:id', async (req, res) => {
  const b = req.body;
  if (b.status !== undefined && b.status !== '' && !store.PROJECT_STATUSES.includes(b.status)) throw httpError(400, 'Unknown status');
  const patch = {
    title: text(b.title, 'Title', { required: false, max: 200 }),
    summary: b.summary === undefined ? undefined : text(b.summary, 'Summary', { required: false, max: 500 }) ?? '',
    tags: tags(b.tags),
    status: b.status,
    body: b.body === undefined ? undefined : text(b.body, 'Body', { required: false, max: 200_000 }) ?? '',
  };
  res.json(found(await store.updatePage(id(req), patch), 'Page'));
});

app.delete('/api/pages/:id', async (req, res) => {
  found(await store.deletePage(id(req)), 'Page');
  res.status(204).end();
});

// ---------- routine (habits), check-ins and tasks ----------

const days = (v) => {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || !v.length || v.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw httpError(400, 'days must be a non-empty list of weekdays 0–6 (0 = Sunday)');
  }
  return [...new Set(v)].sort();
};


// The routine and its check-ins are public, like roadmap progress.
app.get('/api/habits', async (req, res) => {
  const since = req.query.since ? date(req.query.since, 'since') : new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
  const [habits, checkins] = await Promise.all([store.listHabits(), store.listCheckins(since)]);
  res.json({ habits, checkins });
});

app.post('/api/habits', async (req, res) => {
  res.status(201).json(await store.createHabit({
    title: text(req.body.title, 'Name', { max: 120 }),
    url: optionalUrl(req.body.url) ?? null,
    days: days(req.body.days) ?? [0, 1, 2, 3, 4, 5, 6],
  }));
});

app.patch('/api/habits/:id', async (req, res) => {
  res.json(found(await store.updateHabit(id(req), {
    title: text(req.body.title, 'Name', { required: false, max: 120 }),
    url: optionalUrl(req.body.url),
    days: days(req.body.days),
  }), 'Routine item'));
});

app.delete('/api/habits/:id', async (req, res) => {
  found(await store.deleteHabit(id(req)), 'Routine item');
  res.status(204).end();
});

app.put('/api/habits/:id/checkins/:date', async (req, res) => {
  res.json(found(await store.setCheckin(id(req), date(req.params.date), req.body?.done !== false), 'Routine item'));
});

// Tasks are private: only the owner can see them.
app.get('/api/tasks', async (req, res) => {
  ownerOnly(req, 'Log in to see your tasks');
  res.json(await store.listTasks());
});

app.post('/api/tasks', async (req, res) => {
  res.status(201).json(await store.createTask({
    title: text(req.body.title, 'Task', { max: 300 }),
    date: req.body.date ? date(req.body.date) : null,
  }));
});

app.patch('/api/tasks/:id', async (req, res) => {
  const b = req.body;
  res.json(found(await store.updateTask(id(req), {
    title: text(b.title, 'Task', { required: false, max: 300 }),
    date: b.date === undefined ? undefined : b.date ? date(b.date) : null,
    done: b.done === undefined ? undefined : Boolean(b.done),
  }), 'Task'));
});

app.delete('/api/tasks/:id', async (req, res) => {
  found(await store.deleteTask(id(req)), 'Task');
  res.status(204).end();
});

// ---------- student profile ----------

const str = (v, name, max) => (v === undefined || v === null ? '' : text(String(v), name, { required: false, max }) ?? '');
const list = (v, name, max = 40) => {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw httpError(400, `${name} must be a list`);
  return v.slice(0, max);
};
const urlOrEmpty = (v) => (v ? optionalUrl(v) : '');

function profileBody(b) {
  return {
    name: text(b.name, 'Name', { max: 100 }),
    headline: str(b.headline, 'Headline', 160),
    bio: str(b.bio, 'About', 2000),
    location: str(b.location, 'Location', 100),
    openTo: str(b.openTo, 'Open to', 120),
    avatar: urlOrEmpty(b.avatar),
    contact: {
      email: str(b.contact?.email, 'Email', 120),
      phone: str(b.contact?.phone, 'Phone', 30),
      linkedin: urlOrEmpty(b.contact?.linkedin),
      github: urlOrEmpty(b.contact?.github),
      portfolio: urlOrEmpty(b.contact?.portfolio),
      resume: urlOrEmpty(b.contact?.resume),
    },
    education: list(b.education, 'Education', 12).map((e) => ({
      school: text(e.school, 'School', { max: 160 }),
      degree: str(e.degree, 'Degree', 200),
      when: str(e.when, 'Dates', 60),
      score: str(e.score, 'Score', 40),
    })),
    skills: list(b.skills, 'Skills', 20).map((s) => ({
      group: text(s.group, 'Skill group', { max: 60 }),
      items: list(s.items, 'Skills', 40).map((x) => text(String(x), 'Skill', { max: 40 })),
    })),
    coding: list(b.coding, 'Coding profiles', 20).map((c) => ({
      platform: text(c.platform, 'Platform', { max: 40 }),
      username: str(c.username, 'Username', 60),
      url: urlOrEmpty(c.url),
    })),
    achievements: list(b.achievements, 'Achievements', 20).map((a) => ({
      title: text(a.title, 'Achievement', { max: 160 }),
      detail: str(a.detail, 'Detail', 300),
      when: str(a.when, 'Date', 40),
    })),
  };
}

app.get('/api/profile', async (req, res) => {
  if (!auth.isAdmin(req)) throw httpError(401, 'Log in to view profile');
  res.json(await store.getProfile());
});

app.put('/api/profile', async (req, res) => res.json(await store.saveProfile(profileBody(req.body || {}))));

// Live LeetCode / GitHub / Codeforces numbers. Cached privately for an hour.
app.get('/api/profile/stats', async (req, res) => {
  if (!auth.isAdmin(req)) throw httpError(401, 'Log in to view profile');
  res.set('Cache-Control', 'private, max-age=3600');
  res.json(await codingStats(await store.getProfile()));
});

// ---------- resources ----------

app.get('/api/resources', async (req, res) => res.json(await store.listResources()));

const linkBody = (b, required) => ({
  title: text(b.title, 'Title', { required, max: 200 }),
  url: (() => {
    const u = optionalUrl(b.url);
    if (required && !u) throw httpError(400, 'Link URL is required');
    return u ?? undefined;
  })(),
  category: text(b.category, 'Category', { required: false, max: 60 }),
  note: text(b.note, 'Note', { required: false, max: 500 }),
});

app.post('/api/links', async (req, res) => res.status(201).json(await store.createLink(linkBody(req.body, true))));

app.patch('/api/links/:id', async (req, res) => res.json(found(await store.updateLink(id(req), linkBody(req.body, false)), 'Link')));

app.delete('/api/links/:id', async (req, res) => {
  found(await store.deleteLink(id(req)), 'Link');
  res.status(204).end();
});

// ---------- stats & import ----------

app.get('/api/stats', async (req, res) => res.set('Cache-Control', SHARED).json(await store.stats()));

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
