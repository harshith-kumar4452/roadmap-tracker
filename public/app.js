import { markdown, outline, mindmapSvg } from './render.js';

const view = document.getElementById('view');
const $ = (sel, el = document) => el.querySelector(sel);

// ---------- helpers ----------

async function api(method, url, body) {
  const res = await fetch('/api' + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && method !== 'GET' && url !== '/login') {
    me.admin = false;
    renderAuth();
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);
const pct = (done, total) => (total ? Math.round((done * 100) / total) : 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const prefs = {
  get(k) { try { return localStorage.getItem('rt:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('rt:' + k, v); } catch { /* storage unavailable */ } },
};

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function ago(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Renders "[text](url)" links and bare URLs inside escaped text.
function linkify(s) {
  const out = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    out.push(esc(s.slice(last, m.index)));
    const url = m[2] || m[3];
    out.push(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(m[1] || m[3])}</a>`);
    last = re.lastIndex;
  }
  out.push(esc(s.slice(last)));
  return out.join('');
}

const STATUS = {
  not_started: { label: 'Not started', next: 'in_progress' },
  in_progress: { label: 'In progress', next: 'done' },
  done: { label: 'Done', next: 'not_started' },
};
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const nextLevel = (l) => (l === '' ? 'Beginner' : l === 'Beginner' ? 'Intermediate' : l === 'Intermediate' ? 'Advanced' : '');

const icons = {
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ext: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3H13v3.5M13 3L7.5 8.5M11 9.5V13H3V5h3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  note: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13h2.5L13 5.5 10.5 3 3 10.5V13z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

function bar(done, total, size = '') {
  const p = pct(done, total);
  return `<div class="bar ${size} ${p === 100 ? 'full' : ''}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="${p}% complete"><span style="width:${p}%"></span></div>`;
}

function itemTitle(it) {
  const url = safeUrl(it.url);
  return url
    ? `<a class="item-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(it.title)}</a>`
    : `<span class="item-title">${esc(it.title)}</span>`;
}

const tick = (done, title) => me.admin
  ? `<button class="tick" type="button" role="checkbox" aria-checked="${done}" data-act="toggle" aria-label="${done ? 'Mark not done' : 'Mark done'}: ${esc(title)}">${icons.check}</button>`
  : `<span class="tick readonly" role="img" aria-label="${done ? 'Done' : 'Not done'}" data-checked="${done}">${icons.check}</span>`;

let toastTimer;
function toast(message, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  el.hidden = false;
  if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : 3500);
}

// ---------- auth ----------

const me = { admin: false, editingEnabled: false, hasAccount: false, name: null };

function renderAuth() {
  document.body.classList.toggle('is-admin', me.admin);
  $('#auth').innerHTML = me.admin
    ? '<button type="button" class="btn ghost small" data-act="logout">Log out</button>'
    : me.hasAccount
      ? '<a class="btn ghost small" href="#/login">Log in</a>'
      : '<a class="btn primary small" href="#/signup">Create account</a>';
}

async function loadMe() {
  try { Object.assign(me, await api('GET', '/me')); } catch { /* treat as visitor */ }
  renderAuth();
}

function renderLogin() {
  if (!me.hasAccount) { location.hash = '#/signup'; return; }
  if (me.admin) { location.hash = '#/tasks'; return; }
  document.title = 'Log in';
  view.innerHTML = `
    <section class="auth-card panel">
      <span class="brand-mark big" aria-hidden="true"></span>
      <div>
        <h1>Welcome back${me.name ? `, ${esc(me.name.split(' ')[0])}` : ''}</h1>
        <p class="muted">Log in to tick off today's tasks and edit your pages.</p>
      </div>
      <form data-form="login" class="stack">
        <label>Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn primary">Log in</button>
      </form>
    </section>`;
}

function renderSignup() {
  if (me.hasAccount) { location.hash = me.admin ? '#/tasks' : '#/login'; return; }
  document.title = 'Create your account';
  view.innerHTML = `
    <section class="auth-card panel">
      <span class="brand-mark big" aria-hidden="true"></span>
      <div>
        <h1>Create your account</h1>
        <p class="muted">This site has one owner: you. Once your account exists, sign-up closes and everyone else can only view.</p>
      </div>
      ${me.editingEnabled ? '' : '<p class="warn">Sign-up is turned off: <code>ADMIN_PASSWORD</code> is not set on the server.</p>'}
      <form data-form="signup" class="stack">
        <label>Your name<input name="name" autocomplete="name" placeholder="Shown on your home page" required maxlength="80" autofocus></label>
        <label>Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required pattern="[A-Za-z0-9._\\-]{3,40}" title="3–40 letters, numbers, dots, dashes or underscores"></label>
        <label>Password<input type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        <label>Confirm password<input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>
        <label>Setup key <span class="muted small">the <code>ADMIN_PASSWORD</code> from your server settings, so nobody else can claim the site</span>
          <input type="password" name="setupKey" autocomplete="off" required></label>
        <button class="btn primary">Create account</button>
      </form>
    </section>`;
}

// ---------- routing ----------

function setNav(key) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.toggleAttribute('aria-current', a.dataset.nav === key);
    // On phones the tab row scrolls sideways; keep the current tab visible.
    if (a.dataset.nav === key) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

async function route() {
  const hash = location.hash.slice(1) || '/';
  setNav(hash === '/roadmaps' || hash.startsWith('/r/') ? 'roadmaps' : hash.slice(1));
  try {
    let m;
    if (hash === '/') await renderLanding();
    else if (hash === '/roadmaps') await renderDashboard();
    else if (hash === '/tasks') await renderTasks();
    else if (hash === '/resources') await renderResources();
    else if (hash === '/signup') renderSignup();
    else if ((m = hash.match(/^\/r\/([\w-]+)$/))) await renderRoadmap(m[1]);
    else if ((m = hash.match(/^\/(cheatsheets|projects|mindmaps)$/))) await renderPages(m[1]);
    else if ((m = hash.match(/^\/p\/([\w-]+)$/))) await renderPage(m[1]);
    else if (hash === '/import' && me.admin) renderImport();
    else if (hash === '/login') renderLogin();
    else location.hash = '#/';
  } catch (err) {
    view.innerHTML = `<div class="empty"><h2>Couldn't load this page</h2><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">Back to home</a></div>`;
  }
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

// ---------- dashboard ----------

const sorters = {
  recent: (a, b) => (b.lastDoneAt || '').localeCompare(a.lastDoneAt || '') || pct(b.done, b.total) - pct(a.done, a.total),
  progress: (a, b) => pct(b.done, b.total) - pct(a.done, a.total),
  least: (a, b) => pct(a.done, a.total) - pct(b.done, b.total),
  name: (a, b) => a.title.localeCompare(b.title),
};

function activity(doneAt) {
  const counts = new Map();
  for (const iso of doneAt) {
    const k = dayKey(new Date(iso));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const today = counts.get(dayKey(new Date())) ?? 0;
  let week = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    week += counts.get(dayKey(d)) ?? 0;
  }
  const cursor = new Date();
  if (!today) cursor.setDate(cursor.getDate() - 1); // a streak lasts until the end of today
  let streak = 0;
  while (counts.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return { counts, today, week, streak };
}

const heatWeeks = () => Math.max(10, Math.min(53, Math.floor((view.clientWidth - 32 - 42 + 3) / 16)));

function heatmap(counts, weeks) {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks - 1) * 7 - today.getDay());
  const max = Math.max(1, ...counts.values());
  const cells = [];
  let active = 0;
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const c = counts.get(dayKey(d)) ?? 0;
    if (c) active++;
    const level = c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4));
    const label = `${plural(c, 'topic')} on ${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
    cells.push(`<i class="l${level}" title="${label}"></i>`);
  }
  return `
    <div class="heat" role="img" aria-label="Activity over the last ${weeks} weeks: active on ${plural(active, 'day')}">${cells.join('')}</div>
    <div class="heat-legend" aria-hidden="true"><span>Less</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>More</span></div>`;
}

function continueCard(r) {
  return `
    <article class="cont-card" data-item="${esc(r.next.id)}" data-roadmap="${esc(r.id)}">
      <div class="cont-head">
        <a href="#/r/${esc(r.id)}" class="cont-title">${esc(r.title)}</a>
        <span class="muted small">${r.done}/${r.total}</span>
      </div>
      ${bar(r.done, r.total, 'sm')}
      <div class="next">
        ${tick(false, r.next.title)}
        <div class="next-body">
          <div class="eyebrow">Up next · ${esc(r.next.section)}</div>
          ${itemTitle(r.next)}
        </div>
      </div>
    </article>`;
}

function roadmapCard(r) {
  const p = pct(r.done, r.total);
  return `
    <a class="rm-card ${p === 100 ? 'complete' : ''}" href="#/r/${esc(r.id)}">
      <div class="rm-card-top">
        <h3>${esc(r.title)}</h3>
        <span class="pct">${p === 100 ? 'Done' : p + '%'}</span>
      </div>
      ${bar(r.done, r.total)}
      <div class="rm-card-meta">
        <span>${r.done} / ${plural(r.total, 'topic')}${r.inProgress ? ` · ${r.inProgress} in progress` : ''}</span>
        <span>${r.lastDoneAt ? 'Active ' + ago(r.lastDoneAt) : r.done ? 'Imported progress' : 'Not started'}</span>
      </div>
    </a>`;
}

async function renderDashboard() {
  document.title = 'Roadmaps';
  setNav('roadmaps');
  const [list, stats] = await Promise.all([api('GET', '/roadmaps'), api('GET', '/stats')]);
  if (!list.length) {
    view.innerHTML = `
      <div class="empty big">
        <h1>No roadmaps yet</h1>
        <p class="muted">${me.admin ? 'Paste one in or start a blank one.' : 'Log in to add roadmaps.'}</p>
        <a class="btn primary" href="${me.admin ? '#/import' : '#/login'}">${me.admin ? 'Add roadmaps' : 'Log in'}</a>
      </div>`;
    return;
  }
  const act = activity(stats.doneAt);
  const active = list.filter((r) => r.next && r.lastDoneAt).sort(sorters.recent).slice(0, 3);
  const cont = active.length ? active : list.filter((r) => r.next).sort(sorters.progress).slice(0, 3);
  const weeks = heatWeeks();
  const hour = new Date().getHours();

  view.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}</p>
        <h1>${stats.done} of ${plural(stats.total, 'topic')} done</h1>
        <p class="muted">${plural(list.length, 'roadmap')} · ${pct(stats.done, stats.total)}% overall</p>
      </div>
      <dl class="kpis">
        <div><dt>Today</dt><dd>${act.today}</dd></div>
        <div><dt>This week</dt><dd>${act.week}</dd></div>
        <div><dt>Day streak</dt><dd>${act.streak}</dd></div>
      </dl>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Activity</h2><span class="muted small">Topics finished, last ${weeks} weeks</span></div>
      ${heatmap(act.counts, weeks)}
    </section>

    ${cont.length ? `
    <section>
      <h2 class="h2">${active.length ? 'Pick up where you left off' : 'Start here'}</h2>
      <div class="continue">${cont.map(continueCard).join('')}</div>
    </section>` : ''}

    <section>
      <div class="toolbar">
        <h2 class="h2">All roadmaps</h2>
        <div class="toolbar-right">
          ${me.admin ? '<a class="btn small" href="#/import">Add roadmaps</a>' : ''}
          <input type="search" id="rm-search" placeholder="Filter roadmaps" aria-label="Filter roadmaps">
          <select id="rm-sort" aria-label="Sort roadmaps">
            <option value="recent">Recently active</option>
            <option value="progress">Most progress</option>
            <option value="least">Least progress</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      <div class="grid" id="rm-grid"></div>
    </section>`;

  const grid = $('#rm-grid');
  const search = $('#rm-search');
  const sort = $('#rm-sort');
  sort.value = sorters[prefs.get('sort')] ? prefs.get('sort') : 'recent';
  const draw = () => {
    prefs.set('sort', sort.value);
    const q = search.value.trim().toLowerCase();
    const rows = list.filter((r) => r.title.toLowerCase().includes(q)).sort(sorters[sort.value]);
    grid.innerHTML = rows.map(roadmapCard).join('') || '<p class="muted">No roadmaps match that filter.</p>';
  };
  search.addEventListener('input', draw);
  sort.addEventListener('change', draw);
  draw();
}

// ---------- roadmap page (laid out like the Notion roadmap pages) ----------

let rm = null;

const allItems = () => rm.sections.flatMap((s) => s.items.map((i) => Object.assign(i, { sectionId: s.id, sectionTitle: s.title })));
const findItem = (id) => allItems().find((i) => i.id === id);
const findSection = (id) => rm.sections.find((s) => s.id === id);

async function renderRoadmap(id) {
  const data = await api('GET', `/roadmaps/${id}`);
  const items = data.sections.flatMap((s) => s.items);
  const leveled = items.filter((i) => i.level).length;
  rm = {
    ...data,
    filter: prefs.get('filter') || 'all',
    q: '',
    group: prefs.get('group:' + id) || (leveled >= items.length / 2 && items.length ? 'level' : 'topic'),
    editing: false,
  };
  drawRoadmap();
}

function groups() {
  if (rm.group === 'topic') {
    return rm.sections.map((s) => ({ key: 's:' + s.id, title: s.title, sectionId: s.id, items: s.items.map((i) => findItem(i.id)) }));
  }
  const items = allItems();
  return [...LEVELS, ''].map((l) => ({ key: 'l:' + (l || 'none'), title: l || 'No level', level: l, items: items.filter((i) => (i.level || '') === l) }))
    .filter((g) => g.items.length);
}

function itemRow(i) {
  const status = STATUS[i.status] ?? STATUS.not_started;
  const url = safeUrl(i.url);
  return `
    <div class="row ${i.status === 'done' ? 'is-done' : ''}" role="row" data-item="${esc(i.id)}">
      <div class="c-name" role="cell">
        ${tick(i.status === 'done', i.title)}
        <div class="name-body">
          ${itemTitle(i)}
          ${i.note ? `<p class="note">${linkify(i.note)}</p>` : ''}
          ${i.status === 'done' && i.doneAt ? `<span class="done-at">Done ${ago(i.doneAt)}</span>` : ''}
        </div>
        ${me.admin ? `<div class="item-actions">
          <button type="button" class="icon-btn" data-act="note" title="${i.note ? 'Edit note' : 'Add note'}" aria-label="Note for ${esc(i.title)}">${icons.note}</button>
          <button type="button" class="icon-btn danger" data-act="delete-item" title="Delete topic" aria-label="Delete ${esc(i.title)}">${icons.trash}</button>
        </div>` : ''}
      </div>
      <div class="c-level" role="cell">${levelPill(i.level)}</div>
      <div class="c-topic" role="cell"><span class="topic">${esc(i.sectionTitle)}</span></div>
      <div class="c-status" role="cell">${me.admin
        ? `<button type="button" class="pill status-${i.status}" data-act="status" title="Change status">${status.label}</button>`
        : `<span class="pill status-${i.status}">${status.label}</span>`}</div>
      <div class="c-link" role="cell">${url ? `<a class="icon-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open link for ${esc(i.title)}">${icons.ext}</a>` : ''}</div>
    </div>`;
}

function levelPill(level) {
  const cls = `pill level-${(level || 'none').toLowerCase()}`;
  const label = level || (me.admin ? 'Set level' : '');
  if (me.admin) return `<button type="button" class="${cls}" data-act="level" title="Change level">${esc(label)}</button>`;
  return level ? `<span class="${cls}">${esc(level)}</span>` : '';
}

function groupsHtml() {
  const q = rm.q.trim().toLowerCase();
  const filtering = rm.filter !== 'all' || Boolean(q);
  const match = (i) =>
    (rm.filter === 'all' || (rm.filter === 'todo' ? i.status !== 'done' : i.status === rm.filter)) &&
    (!q || i.title.toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q) || i.sectionTitle.toLowerCase().includes(q));

  const html = groups().map((g) => {
    const total = g.items.length;
    const done = g.items.filter((i) => i.status === 'done').length;
    const rows = g.items.filter(match);
    if (filtering && !rows.length) return '';
    const saved = prefs.get(`grp:${rm.id}:${g.key}`);
    const open = filtering || (saved ? saved === 'open' : done < total || total === 0);
    const head = g.level !== undefined ? `<span class="pill level-${(g.level || 'none').toLowerCase()}">${esc(g.title)}</span>` : `<span class="sec-title">${esc(g.title)}</span>`;
    return `
      <details class="sec ${total && done === total ? 'complete' : ''}" data-group="${esc(g.key)}" ${g.sectionId ? `data-sec="${esc(g.sectionId)}"` : ''} ${open ? 'open' : ''}>
        <summary>
          <span class="chev">${icons.chev}</span>
          ${head}
          <span class="sec-count">${done}/${total}</span>
          ${bar(done, total, 'sm')}
        </summary>
        <div class="table" role="table">
          <div class="row head" role="row">
            <div role="columnheader">Name</div><div role="columnheader">Level</div><div role="columnheader">Topic</div><div role="columnheader">Status</div><div role="columnheader"><span class="sr-only">Link</span></div>
          </div>
          ${rows.map(itemRow).join('')}
        </div>
        ${me.admin && g.sectionId ? `
        <div class="sec-foot">
          <form class="add-item" data-form="add-item" data-sec="${esc(g.sectionId)}">
            <input name="title" placeholder="Add a topic" aria-label="New topic in ${esc(g.title)}" required>
            <input name="url" type="url" placeholder="Link (optional)" aria-label="Link">
            <button class="btn small">Add</button>
          </form>
          <div class="sec-menu">
            <button type="button" class="link" data-act="rename-sec">Rename</button>
            <button type="button" class="link danger" data-act="delete-sec">Delete section</button>
          </div>
        </div>` : ''}
      </details>`;
  }).join('');
  if (html) return html;
  return rm.sections.length ? '<p class="empty">Nothing matches.</p>' : '<p class="empty">No topics yet.</p>';
}

function pageDetailsHtml() {
  const resources = (rm.resources ?? []).filter((r) => r.title);
  const notes = (rm.notes ?? []).filter((n) => n.lines?.length || n.heading);
  return `
    ${resources.length ? `
      <section class="doc">
        <h2>📚 Resources</h2>
        <ul>${resources.map((r) => `<li>${safeUrl(r.url) ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>` : esc(r.title)}</li>`).join('')}</ul>
      </section>` : ''}
    ${rm.intro ? `<p class="intro">${linkify(rm.intro)}</p>` : ''}
    ${notes.map((n) => `
      <section class="doc">
        <h2>${esc(n.heading)}</h2>
        <ul>${n.lines.map((l) => `<li>${linkify(l)}</li>`).join('')}</ul>
      </section>`).join('')}`;
}

function editorHtml() {
  const resources = (rm.resources ?? []).map((r) => (r.url ? `${r.title} | ${r.url}` : r.title)).join('\n');
  const notes = (rm.notes ?? []).map((n) => `## ${n.heading}\n${n.lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n');
  return `
    <form class="panel stack editor" data-form="edit-page">
      <h2>Edit page</h2>
      <label>Title<input name="title" value="${esc(rm.title)}" required></label>
      <label>Intro<textarea name="intro" rows="3">${esc(rm.intro)}</textarea></label>
      <label>Resources <span class="muted small">one per line: <code>Title | https://link</code></span>
        <textarea name="resources" rows="4">${esc(resources)}</textarea></label>
      <label>Notes <span class="muted small"><code>## Heading</code> then <code>- line</code>; <code>[text](url)</code> for links</span>
        <textarea name="notes" rows="10">${esc(notes)}</textarea></label>
      <div class="row-actions">
        <button class="btn primary">Save</button>
        <button type="button" class="btn ghost" data-act="cancel-edit">Cancel</button>
      </div>
    </form>`;
}

function parseResources(textValue) {
  return textValue.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [title, url] = l.split(/\s+\|\s+/);
    return { title: title.trim(), url: url?.trim() || null };
  });
}

function parseNotes(textValue) {
  const notes = [];
  for (const raw of textValue.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) notes.push({ heading: line.slice(3).trim(), lines: [] });
    else {
      if (!notes.length) notes.push({ heading: 'Notes', lines: [] });
      notes.at(-1).lines.push(line.replace(/^[-*]\s+/, ''));
    }
  }
  return notes;
}

function drawRoadmap() {
  const items = allItems();
  const done = items.filter((i) => i.status === 'done').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const next = items.find((i) => i.status !== 'done');
  document.title = rm.title;
  const filterLabels = { all: 'All', todo: 'To do', in_progress: 'In progress', done: 'Done' };
  const notion = safeUrl(rm.notionUrl);

  view.innerHTML = `
    <a class="back" href="#/roadmaps">← All roadmaps</a>
    <header class="rm-head">
      <h1>${esc(rm.title)}</h1>
      <div class="rm-head-actions">
        ${notion ? `<a class="btn ghost small" href="${esc(notion)}" target="_blank" rel="noopener noreferrer">Notion ${icons.ext}</a>` : ''}
        ${me.admin ? `<button type="button" class="btn ghost small" data-act="edit-page">Edit page</button>
        <button type="button" class="btn ghost small danger" data-act="delete-rm">Delete</button>` : ''}
      </div>
    </header>

    <div class="rm-progress">
      ${bar(done, items.length, 'lg')}
      <div class="rm-progress-meta"><strong>${pct(done, items.length)}%</strong><span class="muted">${done} of ${plural(items.length, 'topic')} done${inProgress ? ` · ${inProgress} in progress` : ''}</span></div>
    </div>

    ${rm.editing ? editorHtml() : pageDetailsHtml()}

    ${next ? `
      <div class="upnext" data-item="${esc(next.id)}">
        ${tick(false, next.title)}
        <div><div class="eyebrow">Up next · ${esc(next.sectionTitle)}${next.level ? ` · ${esc(next.level)}` : ''}</div>${itemTitle(next)}</div>
      </div>` : items.length ? '<div class="upnext all-done">Every topic in this roadmap is done.</div>' : ''}

    <h2 class="index-title">Course Index</h2>
    <div class="toolbar sticky">
      <div class="seg" role="group" aria-label="Group by">
        <button type="button" data-act="group" data-g="level" aria-pressed="${rm.group === 'level'}">By level</button>
        <button type="button" data-act="group" data-g="topic" aria-pressed="${rm.group === 'topic'}">By topic</button>
      </div>
      <div class="seg" role="group" aria-label="Show">
        ${Object.entries(filterLabels).map(([f, label]) => `<button type="button" data-act="filter" data-f="${f}" aria-pressed="${rm.filter === f}">${label}</button>`).join('')}
      </div>
      <input type="search" id="item-search" placeholder="Search topics" aria-label="Search topics" value="${esc(rm.q)}">
      <div class="toolbar-right">
        <button type="button" class="btn ghost small" data-act="expand">Expand all</button>
        <button type="button" class="btn ghost small" data-act="collapse">Collapse all</button>
      </div>
    </div>

    <div id="groups">${groupsHtml()}</div>

    ${me.admin ? `
    <form class="add-section" data-form="add-section">
      <input name="title" placeholder="New topic group (section) name" aria-label="New section name" required>
      <button class="btn">Add section</button>
    </form>` : ''}`;

  $('#item-search').addEventListener('input', (e) => {
    rm.q = e.target.value;
    $('#groups').innerHTML = groupsHtml();
  });
}

async function patchItem(id, body, optimistic) {
  const item = findItem(id);
  const prev = { ...item };
  Object.assign(item, optimistic);
  drawRoadmap();
  try {
    Object.assign(item, await api('PATCH', `/items/${id}`, body));
  } catch (err) {
    Object.assign(item, prev);
    toast(err.message);
  }
  drawRoadmap();
}

function openNoteEditor(row, item) {
  if (row.querySelector('form')) return;
  const form = document.createElement('form');
  form.className = 'note-form';
  form.dataset.form = 'note';
  form.innerHTML = `
    <textarea name="note" rows="3" placeholder="What did you learn? Anything to revisit?" aria-label="Note">${esc(item.note)}</textarea>
    <div class="row-actions">
      <button class="btn small primary">Save note</button>
      <button type="button" class="btn small ghost" data-act="cancel-note">Cancel</button>
    </div>`;
  row.querySelector('.name-body').append(form);
  form.querySelector('textarea').focus();
}

// ---------- add roadmaps (owner only) ----------

function renderImport() {
  document.title = 'Add roadmaps';
  view.innerHTML = `
    <a class="back" href="#/roadmaps">← All roadmaps</a>
    <h1 class="page-title">Add roadmaps</h1>

    <section class="panel">
      <h2>Paste a roadmap</h2>
      <p class="muted">In Notion, click into the page, press <kbd>Ctrl</kbd>+<kbd>A</kbd> twice, copy, and paste here. Any Markdown works: <code>- [ ] Topic</code> lines become topics, headings become sections.</p>
      <form data-form="import-md" class="stack">
        <input name="title" placeholder="Roadmap name (optional if the paste starts with a # heading)" aria-label="Roadmap name">
        <textarea name="markdown" rows="12" required aria-label="Markdown" placeholder="## Phase 1: Basics&#10;- [ ] First topic&#10;- [x] Something already done"></textarea>
        <div><button class="btn primary">Import</button></div>
      </form>
    </section>

    <section class="panel">
      <h2>Start a blank roadmap</h2>
      <form data-form="new-rm" class="row-actions">
        <input name="title" placeholder="e.g. Docker" aria-label="Roadmap name" required>
        <button class="btn">Create</button>
      </form>
    </section>`;
}

// ---------- cheat sheets, projects, mindmaps ----------

const KINDS = {
  cheatsheets: {
    kind: 'cheatsheet', label: 'Cheat sheets', one: 'cheat sheet', icon: '📄',
    blurb: 'Quick-reference pages: commands, syntax, formulas, things you keep looking up.',
    hint: 'Markdown: <code>## Heading</code>, <code>- list</code>, <code>| table |</code>, <code>```code```</code>, <code>`inline`</code>, <code>**bold**</code>, <code>[text](url)</code>',
  },
  projects: {
    kind: 'project', label: 'Projects', one: 'project', icon: '🛠️',
    blurb: 'Things to build: the idea, the features, the stack, and where each one stands.',
    hint: 'Markdown: <code>## Heading</code>, <code>- list</code>, <code>- [ ] task</code>, <code>[text](url)</code>, <code>```code```</code>',
  },
  mindmaps: {
    kind: 'mindmap', label: 'Mindmaps', one: 'mindmap', icon: '🧠',
    blurb: 'Topics laid out as a map, to see how the pieces connect.',
    hint: 'One idea per line. Indent with two spaces to branch:<br><code>- Caching</code><br><code>&nbsp;&nbsp;- Write-through</code><br>The title is the centre of the map.',
  },
};
const keyOfKind = (kind) => Object.keys(KINDS).find((k) => KINDS[k].kind === kind);
const PROJECT_STATUS = {
  idea: { label: 'Idea', cls: 'status-not_started', next: 'building' },
  building: { label: 'Building', cls: 'status-in_progress', next: 'done' },
  done: { label: 'Done', cls: 'status-done', next: 'idea' },
};

let pl = null; // current list page
let pg = null; // current page
let editNext = null;

const tagChips = (tags) => (tags?.length ? `<div class="chips">${tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '');
const statusPill = (status, button) => {
  const s = PROJECT_STATUS[status];
  if (!s) return '';
  return button
    ? `<button type="button" class="pill ${s.cls}" data-act="doc-status" title="Change status">${s.label}</button>`
    : `<span class="pill ${s.cls}">${s.label}</span>`;
};

async function renderPages(key) {
  const k = KINDS[key];
  document.title = k.label;
  const items = await api('GET', `/pages?kind=${k.kind}`);
  pl = { key, items, q: '', tag: '', status: '' };
  drawPages();
}

function pageCard(p) {
  return `
    <a class="rm-card page-card" href="#/p/${esc(p.id)}">
      <div class="rm-card-top"><h3>${esc(p.title)}</h3>${statusPill(p.status)}</div>
      ${p.summary ? `<p class="muted small clamp">${esc(p.summary)}</p>` : ''}
      <div class="rm-card-meta">${tagChips(p.tags)}<span>Updated ${ago(p.updatedAt)}</span></div>
    </a>`;
}

function pageCardsHtml() {
  const q = pl.q.trim().toLowerCase();
  const list = pl.items.filter((p) =>
    (!pl.tag || p.tags?.includes(pl.tag)) &&
    (!pl.status || p.status === pl.status) &&
    (!q || `${p.title} ${p.summary} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q)));
  if (list.length) return list.map(pageCard).join('');
  const k = KINDS[pl.key];
  return pl.items.length
    ? '<p class="empty">Nothing matches.</p>'
    : `<div class="empty"><p>No ${k.one}s yet.</p>${me.admin ? '' : '<p class="small">Log in to add one.</p>'}</div>`;
}

function drawPages() {
  const k = KINDS[pl.key];
  const tags = [...new Set(pl.items.flatMap((p) => p.tags || []))].sort();
  const counts = Object.fromEntries(Object.keys(PROJECT_STATUS).map((s) => [s, pl.items.filter((p) => p.status === s).length]));
  view.innerHTML = `
    <header class="page-head">
      <div>
        <h1>${k.icon} ${esc(k.label)}</h1>
        <p class="muted">${esc(k.blurb)}</p>
      </div>
      ${me.admin ? `
      <form data-form="new-page" class="row-actions new-page">
        <input name="title" placeholder="New ${esc(k.one)} title" aria-label="New ${esc(k.one)} title" required>
        <button class="btn primary">Create</button>
      </form>` : ''}
    </header>

    ${pl.items.length ? `
    <div class="toolbar">
      ${k.kind === 'project' ? `
      <div class="seg" role="group" aria-label="Status">
        <button type="button" data-act="doc-filter" data-s="" aria-pressed="${!pl.status}">All ${pl.items.length}</button>
        ${Object.entries(PROJECT_STATUS).map(([s, v]) => `<button type="button" data-act="doc-filter" data-s="${s}" aria-pressed="${pl.status === s}">${v.label} ${counts[s]}</button>`).join('')}
      </div>` : ''}
      ${tags.length ? `
      <div class="chips" role="group" aria-label="Filter by tag">
        ${tags.map((t) => `<button type="button" class="chip" data-act="tag" data-tag="${esc(t)}" aria-pressed="${pl.tag === t}">${esc(t)}</button>`).join('')}
      </div>` : ''}
      <input type="search" id="page-search" placeholder="Search ${esc(k.label.toLowerCase())}" aria-label="Search" value="${esc(pl.q)}">
    </div>` : ''}

    <div id="page-grid" class="grid">${pageCardsHtml()}</div>`;

  $('#page-search')?.addEventListener('input', (e) => {
    pl.q = e.target.value;
    $('#page-grid').innerHTML = pageCardsHtml();
  });
}

async function renderPage(id) {
  pg = await api('GET', `/pages/${id}`);
  // Big maps shrink to unreadable on phones, so they open at actual size there unless you chose otherwise.
  const fitPref = prefs.get('mm-fit');
  pg.fit = fitPref ? fitPref === 'fit' : innerWidth > 760;
  pg.editing = editNext === id && me.admin; // a page you just created opens in the editor
  editNext = null;
  drawPage();
}

function pageBodyHtml(p) {
  if (!p.body.trim()) {
    return `<div class="empty panel"><p>This ${esc(KINDS[keyOfKind(p.kind)].one)} is empty.</p>${me.admin ? '<button type="button" class="btn primary" data-act="edit-doc">Start writing</button>' : ''}</div>`;
  }
  if (p.kind === 'mindmap') {
    return `
      <div class="mm-tools">
        <div class="seg" role="group" aria-label="Map size">
          <button type="button" data-act="mm-fit" data-fit="1" aria-pressed="${p.fit}">Fit to screen</button>
          <button type="button" data-act="mm-fit" data-fit="0" aria-pressed="${!p.fit}">Actual size</button>
        </div>
      </div>
      <div class="mm-wrap ${p.fit ? 'fit' : ''}">${mindmapSvg(outline(p.body, p.title))}</div>
      <details class="outline"><summary>Outline</summary><article class="md">${markdown(p.body)}</article></details>`;
  }
  return `<article class="md">${markdown(p.body)}</article>`;
}

function previewHtml(p) {
  if (!p.body.trim()) return '<p class="muted small">Preview shows here as you type.</p>';
  return p.kind === 'mindmap'
    ? `<div class="mm-wrap fit">${mindmapSvg(outline(p.body, p.title || 'Untitled'))}</div>`
    : `<article class="md">${markdown(p.body)}</article>`;
}

function docEditorHtml(p) {
  const k = KINDS[keyOfKind(p.kind)];
  return `
    <form class="panel stack editor" data-form="edit-doc">
      <label>Title<input name="title" value="${esc(p.title)}" required maxlength="200"></label>
      <label>Summary <span class="muted small">one line, shown on the card</span><input name="summary" value="${esc(p.summary)}" maxlength="500"></label>
      <div class="row-actions">
        <label class="grow">Tags <span class="muted small">comma separated</span><input name="tags" value="${esc((p.tags || []).join(', '))}"></label>
        ${p.kind === 'project' ? `<label>Status<select name="status">${Object.entries(PROJECT_STATUS).map(([s, v]) => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="split">
        <label>${p.kind === 'mindmap' ? 'Outline' : 'Content'} <span class="muted small hint">${k.hint}</span>
          <textarea name="body" rows="22" class="mono" spellcheck="false">${esc(p.body)}</textarea></label>
        <div class="preview"><div class="eyebrow">Preview</div><div id="preview">${previewHtml(p)}</div></div>
      </div>
      <div class="row-actions">
        <button class="btn primary">Save</button>
        <button type="button" class="btn ghost" data-act="cancel-doc">Cancel</button>
      </div>
    </form>`;
}

function drawPage() {
  const key = keyOfKind(pg.kind);
  const k = KINDS[key];
  setNav(key);
  document.title = pg.title;
  view.innerHTML = `
    <a class="back" href="#/${key}">← ${esc(k.label)}</a>
    <header class="rm-head">
      <h1>${esc(pg.title)}</h1>
      <div class="rm-head-actions">
        ${statusPill(pg.status, me.admin)}
        ${me.admin && !pg.editing ? `<button type="button" class="btn ghost small" data-act="edit-doc">Edit</button>
        <button type="button" class="btn ghost small danger" data-act="delete-doc">Delete</button>` : ''}
      </div>
    </header>
    ${pg.editing ? docEditorHtml(pg) : `
      ${pg.summary || pg.tags?.length ? `<div class="doc-meta">${pg.summary ? `<p class="intro">${esc(pg.summary)}</p>` : ''}${tagChips(pg.tags)}</div>` : ''}
      ${pageBodyHtml(pg)}
      <p class="muted small">Updated ${ago(pg.updatedAt)}</p>`}`;

  const form = $('form[data-form="edit-doc"]');
  if (form) {
    let timer;
    form.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        $('#preview').innerHTML = previewHtml({ ...pg, title: form.elements.title.value, body: form.elements.body.value });
      }, 150);
    });
  }
}

const parseTags = (s) => String(s || '').split(',').map((t) => t.trim()).filter(Boolean);

// ---------- routine helpers ----------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayKey = () => dayKey(new Date());

function scheduleLabel(days) {
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 1) return `Every ${DAY_NAMES[days[0]]}`;
  return days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
}

const isDue = (h, date) => h.days.includes(date.getDay());

function routineState({ habits, checkins }) {
  const done = new Set(checkins.map((c) => `${c.habitId}:${c.date}`));
  const isDone = (h, key) => done.has(`${h.id}:${key}`);
  const today = startOfDay(new Date());
  // Days before a routine item existed are neither done nor missed.
  const started = (h, key) => !h.createdAt || key >= dayKey(new Date(h.createdAt));
  const streak = (h) => {
    // Consecutive scheduled days completed. Today only breaks the streak once it's over.
    let n = 0;
    let d = new Date(today);
    if (isDue(h, d) && !isDone(h, dayKey(d))) d = addDays(d, -1);
    for (let i = 0; i < 120; i++, d = addDays(d, -1)) {
      if (!isDue(h, d)) continue;
      if (!isDone(h, dayKey(d))) break;
      n++;
    }
    return n;
  };
  const rate = (h, days = 30) => {
    let due = 0;
    let hit = 0;
    for (let i = 0; i < days; i++) {
      const d = addDays(today, -i);
      if (!isDue(h, d)) continue;
      if (i === 0 && !isDone(h, dayKey(d))) continue; // today isn't missed yet
      if (!started(h, dayKey(d)) && !isDone(h, dayKey(d))) continue;
      due++;
      if (isDone(h, dayKey(d))) hit++;
    }
    return due ? Math.round((hit * 100) / due) : null;
  };
  const nextDue = (h) => {
    for (let i = 1; i <= 7; i++) if (isDue(h, addDays(today, i))) return addDays(today, i);
    return null;
  };
  return { isDone, started, streak, rate, nextDue, today };
}

// editable: on the Tasks page every scheduled square is a button, so past days can be ticked too.
function routineGrid(data, state, days, editable = false) {
  const cols = Array.from({ length: days }, (_, i) => addDays(state.today, i - days + 1));
  return `
    <div class="rgrid-wrap">
      <table class="rgrid">
        <thead><tr><th></th>${cols.map((d) => `<th class="${dayKey(d) === todayKey() ? 'is-today' : ''}"><span>${DAY_NAMES[d.getDay()][0]}</span><small>${d.getDate()}</small></th>`).join('')}<th class="r">Streak</th></tr></thead>
        <tbody>${data.habits.map((h) => `
          <tr data-habit="${esc(h.id)}">
            <th scope="row">${esc(h.title)}</th>
            ${cols.map((d) => {
              const k = dayKey(d);
              const label = `${h.title}, ${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
              if (!isDue(h, d)) return `<td><i class="rc off" title="${esc(label)}: not scheduled"></i></td>`;
              const done = state.isDone(h, k);
              const [cls, status] = done ? ['done', 'done']
                : k === todayKey() ? ['due', 'due today']
                : state.started(h, k) ? ['miss', 'missed'] : ['pre', 'before you started'];
              return editable
                ? `<td><button type="button" class="rc ${cls}" data-act="habit" data-date="${k}" aria-pressed="${done}" title="${esc(label)}: ${status}. Click to ${done ? 'untick' : 'tick'}." aria-label="${esc(label)}: ${status}"></button></td>`
                : `<td><i class="rc ${cls}" title="${esc(label)}: ${status}"></i></td>`;
            }).join('')}
            <td class="r"><strong>${state.streak(h)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="rgrid-legend muted small"><span><i class="rc done"></i> Done</span><span><i class="rc miss"></i> Missed</span><span><i class="rc due"></i> Due today</span><span><i class="rc pre"></i> Before you started</span><span><i class="rc off"></i> Not scheduled</span></div>`;
}

const sinceKey = (days) => dayKey(addDays(new Date(), -days));

// ---------- landing ----------

async function renderLanding() {
  document.title = me.name ? `${me.name} · Learning hub` : 'Learning hub';
  const [list, stats, routine, ...pageLists] = await Promise.all([
    api('GET', '/roadmaps'),
    api('GET', '/stats'),
    api('GET', `/habits?since=${sinceKey(120)}`),
    ...['cheatsheet', 'project', 'mindmap'].map((k) => api('GET', `/pages?kind=${k}`)),
  ]);
  const [cheats, projects, maps] = pageLists;
  const act = activity(stats.doneAt);
  const state = routineState(routine);
  const dueToday = routine.habits.filter((h) => isDue(h, state.today));
  const doneToday = dueToday.filter((h) => state.isDone(h, todayKey())).length;
  const bestStreak = Math.max(0, ...routine.habits.map(state.streak));
  const first = me.name ? me.name.split(' ')[0] : null;
  const started = list.filter((r) => r.done > 0).length;

  const sections = [
    { href: '#/roadmaps', icon: '🗺️', title: 'Roadmaps', text: `${plural(list.length, 'roadmap')}, ${started} under way`, meta: `${pct(stats.done, stats.total)}% done` },
    ...(me.admin ? [{ href: '#/tasks', icon: '✅', title: 'Tasks', text: 'Daily POTDs, contests and your to-do list', meta: dueToday.length ? `${doneToday}/${dueToday.length} today` : 'Nothing due' }] : []),
    { href: '#/resources', icon: '🔗', title: 'Resources', text: 'Every course, playlist and practice site in one list', meta: 'All links' },
    { href: '#/cheatsheets', icon: '📄', title: 'Cheat sheets', text: 'Quick-reference commands and syntax', meta: plural(cheats.length, 'sheet') },
    { href: '#/projects', icon: '🛠️', title: 'Projects', text: 'Things to build and where each one stands', meta: plural(projects.length, 'project') },
    { href: '#/mindmaps', icon: '🧠', title: 'Mindmaps', text: 'How the topics connect', meta: plural(maps.length, 'map') },
  ];

  view.innerHTML = `
    <section class="landing-hero">
      <p class="eyebrow">${first ? `${esc(first)}'s learning hub` : 'Learning hub'}</p>
      <h1>Backend, system design, DSA and core CS, <span class="accent">one day at a time.</span></h1>
      <p class="lede">${plural(list.length, 'roadmap')} and ${stats.total.toLocaleString()} topics, a daily problem-solving routine, weekly contests, and the notes that go with them.</p>
      <div class="row-actions">
        <a class="btn primary" href="#/roadmaps">Open roadmaps</a>
        ${me.admin ? '<a class="btn" href="#/tasks">Today\'s tasks</a>' : me.hasAccount ? '<a class="btn" href="#/login">Log in</a>' : '<a class="btn" href="#/signup">Create your account</a>'}
      </div>
    </section>

    <dl class="landing-stats">
      <div><dt>Topics done</dt><dd>${stats.done}<small>/ ${stats.total.toLocaleString()}</small></dd></div>
      <div><dt>Learning streak</dt><dd>${act.streak}<small>${act.streak === 1 ? 'day' : 'days'}</small></dd></div>
      <div><dt>Routine today</dt><dd>${doneToday}<small>/ ${dueToday.length}</small></dd></div>
      <div><dt>Best routine streak</dt><dd>${bestStreak}</dd></div>
    </dl>

    ${routine.habits.length ? `
    <section class="panel">
      <div class="panel-head"><h2>Practice routine</h2>${me.admin ? '<a class="btn ghost small" href="#/tasks">Open tasks</a>' : '<span class="muted small">Last 14 days</span>'}</div>
      ${routineGrid(routine, state, 14)}
    </section>` : ''}

    <section>
      <h2 class="h2">Everything here</h2>
      <div class="section-grid">
        ${sections.map((s) => `
          <a class="section-card" href="${s.href}">
            <span class="section-icon" aria-hidden="true">${s.icon}</span>
            <h3>${esc(s.title)}</h3>
            <p class="muted small">${esc(s.text)}</p>
            <span class="section-meta">${esc(s.meta)}</span>
          </a>`).join('')}
      </div>
    </section>`;
}

// ---------- tasks: routine + to-dos (owner only) ----------

let tk = null;

async function renderTasks() {
  document.title = 'Tasks';
  if (!me.admin) {
    view.innerHTML = `
      <div class="empty big">
        <h1>Tasks are private</h1>
        <p class="muted">${me.hasAccount ? 'Log in to see your routine and to-do list.' : 'Create your account to start tracking your routine and tasks.'}</p>
        <a class="btn primary" href="${me.hasAccount ? '#/login' : '#/signup'}">${me.hasAccount ? 'Log in' : 'Create account'}</a>
      </div>`;
    return;
  }
  const [routine, tasks] = await Promise.all([api('GET', `/habits?since=${sinceKey(120)}`), api('GET', '/tasks')]);
  tk = { routine, tasks, showManage: tk?.showManage ?? false };
  drawTasks();
}

function habitRow(h, state, key) {
  const done = state.isDone(h, key);
  const url = safeUrl(h.url);
  const s = state.streak(h);
  const r = state.rate(h);
  return `
    <li class="habit ${done ? 'is-done' : ''}" data-habit="${esc(h.id)}">
      <button class="tick" type="button" role="checkbox" aria-checked="${done}" data-act="habit" data-date="${key}" aria-label="${done ? 'Mark not done' : 'Mark done'}: ${esc(h.title)}">${icons.check}</button>
      <div class="habit-body">
        ${url ? `<a class="item-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(h.title)}<span class="ext">${icons.ext}</span></a>` : `<span class="item-title">${esc(h.title)}</span>`}
        <span class="muted small">${esc(scheduleLabel(h.days))}${r !== null ? ` · ${r}% last 30 days` : ''}</span>
      </div>
      <span class="streak ${s ? 'on' : ''}" title="Current streak">${s ? '🔥' : ''} ${s}</span>
    </li>`;
}

function taskRow(t) {
  const today = todayKey();
  const due = t.date ? fromKey(t.date) : null;
  const dateLabel = !t.date ? '' : t.date === today ? 'Today'
    : t.date === dayKey(addDays(new Date(), 1)) ? 'Tomorrow'
    : t.date === dayKey(addDays(new Date(), -1)) ? 'Yesterday'
    : due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const overdue = !t.done && t.date && t.date < today;
  return `
    <li class="task-row ${t.done ? 'is-done' : ''}" data-task="${esc(t.id)}">
      <button class="tick" type="button" role="checkbox" aria-checked="${t.done}" data-act="task-toggle" aria-label="${t.done ? 'Mark not done' : 'Mark done'}: ${esc(t.title)}">${icons.check}</button>
      <span class="task-title">${linkify(t.title)}</span>
      ${dateLabel ? `<span class="pill ${overdue ? 'overdue' : ''}">${esc(dateLabel)}</span>` : ''}
      <button type="button" class="icon-btn" data-act="task-delete" title="Delete task" aria-label="Delete task: ${esc(t.title)}">${icons.trash}</button>
    </li>`;
}

function drawTasks() {
  const { routine, tasks } = tk;
  const state = routineState(routine);
  const key = todayKey();
  const due = routine.habits.filter((h) => isDue(h, state.today));
  const notToday = routine.habits.filter((h) => !isDue(h, state.today));
  const doneToday = due.filter((h) => state.isDone(h, key)).length;
  const open = tasks.filter((t) => !t.done);
  const groups = [
    ['Overdue', open.filter((t) => t.date && t.date < key)],
    ['Today', open.filter((t) => t.date === key)],
    ['Upcoming', open.filter((t) => t.date && t.date > key)],
    ['Someday', open.filter((t) => !t.date)],
  ];
  const doneRecent = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const tasksToday = groups[0][1].length + groups[1][1].length;
  const dateText = state.today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const dayOptions = `<option value="daily">Daily</option><option value="weekdays">Weekdays (Mon–Fri)</option>${DAY_NAMES.map((d, i) => `<option value="${i}">Every ${d}</option>`).join('')}`;

  view.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">${esc(dateText)}</p>
        <h1>${due.length && doneToday === due.length && !tasksToday ? 'All done for today 🎉' : 'Today'}</h1>
        <p class="muted">${due.length ? `${doneToday} of ${plural(due.length, 'routine item')} done` : 'Nothing in your routine today'} · ${plural(tasksToday, 'task')} left${groups[0][1].length ? ` (${groups[0][1].length} overdue)` : ''}</p>
      </div>
      <dl class="kpis">
        <div><dt>Routine</dt><dd>${doneToday}/${due.length}</dd></div>
        <div><dt>Tasks left</dt><dd>${tasksToday}</dd></div>
        <div><dt>Best streak</dt><dd>${Math.max(0, ...routine.habits.map(state.streak))}</dd></div>
      </dl>
    </section>

    <div class="tasks-layout">
      <section class="panel">
        <div class="panel-head"><h2>Today's routine</h2><button type="button" class="btn ghost small" data-act="toggle-manage">${tk.showManage ? 'Done editing' : 'Edit routine'}</button></div>
        ${due.length ? `<ul class="habits">${due.map((h) => habitRow(h, state, key)).join('')}</ul>` : '<p class="muted">Nothing scheduled today.</p>'}
        ${notToday.length ? `
          <div class="not-today">
            <div class="eyebrow">Not today</div>
            <ul>${notToday.map((h) => { const n = state.nextDue(h); return `<li><span>${esc(h.title)}</span><span class="muted small">${n ? `Next: ${n.toLocaleDateString(undefined, { weekday: 'long' })}` : ''}</span></li>`; }).join('')}</ul>
          </div>` : ''}
        ${tk.showManage ? `
          <div class="manage">
            <ul class="manage-list">${routine.habits.map((h) => `
              <li data-habit="${esc(h.id)}">
                <span>${esc(h.title)} <span class="muted small">· ${esc(scheduleLabel(h.days))}</span></span>
                <button type="button" class="icon-btn" data-act="habit-delete" title="Remove" aria-label="Remove ${esc(h.title)} from routine">${icons.trash}</button>
              </li>`).join('')}</ul>
            <form data-form="add-habit" class="add-habit">
              <input name="title" placeholder="e.g. Codeforces Div 2" aria-label="Routine item name" required maxlength="120">
              <input name="url" type="url" placeholder="Link (optional)" aria-label="Link">
              <select name="days" aria-label="Schedule">${dayOptions}</select>
              <button class="btn">Add</button>
            </form>
          </div>` : ''}
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Tasks</h2></div>
        <form data-form="add-task" class="add-task">
          <input name="title" placeholder="Add a task, e.g. Revise Redis persistence" aria-label="New task" required maxlength="300">
          <input name="date" type="date" value="${key}" aria-label="Due date">
          <button class="btn primary">Add</button>
        </form>
        ${groups.map(([label, list]) => list.length ? `
          <div class="task-group ${label === 'Overdue' ? 'overdue' : ''}">
            <div class="eyebrow">${label} · ${list.length}</div>
            <ul class="tasks">${list.map(taskRow).join('')}</ul>
          </div>` : '').join('')}
        ${!open.length ? '<p class="muted">No open tasks. Add one above.</p>' : ''}
        ${doneRecent.length ? `
          <details class="task-group">
            <summary class="eyebrow">Done · ${doneRecent.length} in the last 30 days</summary>
            <ul class="tasks">${doneRecent.map(taskRow).join('')}</ul>
          </details>` : ''}
      </section>
    </div>

    ${routine.habits.length ? `
    <section class="panel">
      <div class="panel-head"><h2>Last 4 weeks</h2><span class="muted small">Click a square to tick or untick that day. Streaks skip days that aren't scheduled.</span></div>
      ${routineGrid(routine, state, 28, true)}
    </section>` : ''}`;
}

// ---------- resources ----------

let rs = null;

async function renderResources() {
  document.title = 'Resources';
  const [data, routine] = await Promise.all([api('GET', '/resources'), api('GET', `/habits?since=${todayKey()}`)]);
  rs = { ...data, habits: routine.habits, q: '' };
  drawResources();
}

const linkLi = (title, url, extra = '') => {
  const u = safeUrl(url);
  let host = '';
  try { host = u ? new URL(u).hostname.replace(/^www\./, '') : ''; } catch { /* not a URL */ }
  return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>` : esc(title)}${host ? ` <span class="host">${esc(host)}</span>` : ''}${extra}</li>`;
};

function resourcesHtml() {
  const q = rs.q.trim().toLowerCase();
  const match = (...parts) => !q || parts.join(' ').toLowerCase().includes(q);
  const practice = rs.habits.filter((h) => h.url && match(h.title, h.url));
  const mine = rs.links.filter((l) => match(l.title, l.url, l.category, l.note));
  const cats = [...new Set(mine.map((l) => l.category || 'Other'))].sort();
  const fromRm = rs.roadmaps
    .map((r) => ({ ...r, resources: r.resources.filter((x) => x.title && match(x.title, x.url, r.title)) }))
    .filter((r) => r.resources.length);
  const total = practice.length + mine.length + fromRm.reduce((n, r) => n + r.resources.length, 0);
  if (!total) return '<p class="empty">Nothing matches.</p>';
  return `
    ${practice.length ? `
    <section class="res-section">
      <h2>🏁 Practice & contests</h2>
      <ul class="res-list">${practice.map((h) => linkLi(h.title, h.url, ` <span class="muted small">· ${esc(scheduleLabel(h.days))}</span>`)).join('')}</ul>
    </section>` : ''}
    ${mine.length ? `
    <section class="res-section">
      <h2>⭐ My links</h2>
      <div class="res-cols">${cats.map((c) => `
        <div class="res-card">
          <h3>${esc(c)}</h3>
          <ul class="res-list">${mine.filter((l) => (l.category || 'Other') === c).map((l) => linkLi(l.title, l.url,
            `${l.note ? `<div class="muted small">${esc(l.note)}</div>` : ''}${me.admin ? ` <button type="button" class="link danger" data-act="link-delete" data-link="${esc(l.id)}">Remove</button>` : ''}`)).join('')}</ul>
        </div>`).join('')}
      </div>
    </section>` : ''}
    ${fromRm.length ? `
    <section class="res-section">
      <h2>📚 From your roadmaps</h2>
      <div class="res-cols">${fromRm.map((r) => `
        <div class="res-card">
          <h3><a href="#/r/${esc(r.id)}">${esc(r.title)}</a></h3>
          <ul class="res-list">${r.resources.map((x) => linkLi(x.title, x.url)).join('')}</ul>
        </div>`).join('')}
      </div>
    </section>` : ''}`;
}

function drawResources() {
  const cats = [...new Set(rs.links.map((l) => l.category).filter(Boolean))].sort();
  view.innerHTML = `
    <header class="page-head">
      <div>
        <h1>🔗 Resources</h1>
        <p class="muted">Every course, playlist, practice site and link, in one place.</p>
      </div>
    </header>
    ${me.admin ? `
    <form data-form="add-link" class="panel add-link">
      <h2>Add a link</h2>
      <div class="add-link-fields">
        <input name="title" placeholder="Title" aria-label="Title" required maxlength="200">
        <input name="url" type="url" placeholder="https://…" aria-label="URL" required>
        <input name="category" placeholder="Category, e.g. YouTube" aria-label="Category" list="link-cats" maxlength="60">
        <datalist id="link-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <input name="note" placeholder="Note (optional)" aria-label="Note" maxlength="500">
        <button class="btn primary">Add</button>
      </div>
    </form>` : ''}
    <input type="search" id="res-search" placeholder="Search resources" aria-label="Search resources" value="${esc(rs.q)}">
    <div id="res-body" class="res-body">${resourcesHtml()}</div>`;
  $('#res-search').addEventListener('input', (e) => {
    rs.q = e.target.value;
    $('#res-body').innerHTML = resourcesHtml();
  });
}

// ---------- events ----------

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  const summary = e.target.closest('details.sec > summary');
  if (summary && !btn) {
    const details = summary.parentElement;
    setTimeout(() => prefs.set(`grp:${rm.id}:${details.dataset.group}`, details.open ? 'open' : 'closed'));
    return;
  }
  if (!btn) return;
  const act = btn.dataset.act;
  const itemId = btn.closest('[data-item]')?.dataset.item;
  const secId = btn.closest('[data-sec]')?.dataset.sec;

  try {
    switch (act) {
      case 'logout':
        await api('POST', '/logout');
        me.admin = false;
        renderAuth();
        route();
        break;
      case 'toggle': {
        if (location.hash.startsWith('#/r/') && rm) {
          const item = findItem(itemId);
          const status = item.status === 'done' ? 'not_started' : 'done';
          await patchItem(itemId, { status }, { status, doneAt: status === 'done' ? new Date().toISOString() : null });
        } else {
          await api('PATCH', `/items/${itemId}`, { status: 'done' });
          toast('Marked done', { label: 'Undo', run: async () => { await api('PATCH', `/items/${itemId}`, { status: 'not_started' }); renderDashboard(); } });
          renderDashboard();
        }
        break;
      }
      case 'status': {
        const item = findItem(itemId);
        const status = STATUS[item.status]?.next ?? 'in_progress';
        await patchItem(itemId, { status }, { status, doneAt: status === 'done' ? new Date().toISOString() : null });
        break;
      }
      case 'level': {
        const level = nextLevel(findItem(itemId).level || '');
        await patchItem(itemId, { level }, { level });
        break;
      }
      case 'group':
        rm.group = btn.dataset.g;
        prefs.set('group:' + rm.id, rm.group);
        drawRoadmap();
        break;
      case 'filter':
        rm.filter = btn.dataset.f;
        prefs.set('filter', rm.filter);
        drawRoadmap();
        break;
      case 'expand':
      case 'collapse':
        document.querySelectorAll('details.sec').forEach((d) => {
          d.open = act === 'expand';
          prefs.set(`grp:${rm.id}:${d.dataset.group}`, d.open ? 'open' : 'closed');
        });
        break;
      case 'note':
        openNoteEditor(btn.closest('[data-item]'), findItem(itemId));
        break;
      case 'cancel-note':
        btn.closest('form').remove();
        break;
      case 'edit-page':
        rm.editing = true;
        drawRoadmap();
        $('form[data-form="edit-page"] textarea')?.focus();
        break;
      case 'cancel-edit':
        rm.editing = false;
        drawRoadmap();
        break;
      case 'delete-item': {
        const item = findItem(itemId);
        if (!confirm(`Delete "${item.title}"?`)) return;
        await api('DELETE', `/items/${itemId}`);
        const s = findSection(item.sectionId);
        s.items = s.items.filter((i) => i.id !== itemId);
        drawRoadmap();
        break;
      }
      case 'rename-sec': {
        const s = findSection(secId);
        const title = prompt('Section name', s.title)?.trim();
        if (!title || title === s.title) return;
        await api('PATCH', `/sections/${secId}`, { title });
        s.title = title;
        drawRoadmap();
        break;
      }
      case 'delete-sec': {
        const s = findSection(secId);
        if (!confirm(`Delete the section "${s.title}" and its ${plural(s.items.length, 'topic')}?`)) return;
        await api('DELETE', `/sections/${secId}`);
        rm.sections = rm.sections.filter((x) => x.id !== secId);
        drawRoadmap();
        break;
      }
      case 'delete-rm':
        if (!confirm(`Delete "${rm.title}" and all its progress? This can't be undone.`)) return;
        await api('DELETE', `/roadmaps/${rm.id}`);
        location.hash = '#/roadmaps';
        break;
      case 'habit': {
        const habitId = btn.closest('[data-habit]').dataset.habit;
        const date = btn.dataset.date;
        const list = tk.routine.checkins;
        const was = list.some((c) => c.habitId === habitId && c.date === date);
        tk.routine.checkins = was ? list.filter((c) => !(c.habitId === habitId && c.date === date)) : [...list, { habitId, date }];
        drawTasks();
        try {
          await api('PUT', `/habits/${habitId}/checkins/${date}`, { done: !was });
        } catch (err) {
          tk.routine.checkins = list;
          drawTasks();
          throw err;
        }
        break;
      }
      case 'toggle-manage':
        tk.showManage = !tk.showManage;
        drawTasks();
        break;
      case 'habit-delete': {
        const habitId = btn.closest('[data-habit]').dataset.habit;
        const h = tk.routine.habits.find((x) => x.id === habitId);
        if (!confirm(`Remove "${h.title}" from your routine? Its history is deleted too.`)) return;
        await api('DELETE', `/habits/${habitId}`);
        tk.routine.habits = tk.routine.habits.filter((x) => x.id !== habitId);
        drawTasks();
        break;
      }
      case 'task-toggle': {
        const t = tk.tasks.find((x) => x.id === btn.closest('[data-task]').dataset.task);
        const prev = { ...t };
        Object.assign(t, { done: !t.done, doneAt: t.done ? null : new Date().toISOString() });
        drawTasks();
        try {
          Object.assign(t, await api('PATCH', `/tasks/${t.id}`, { done: t.done }));
        } catch (err) {
          Object.assign(t, prev);
          drawTasks();
          throw err;
        }
        break;
      }
      case 'task-delete': {
        const taskId = btn.closest('[data-task]').dataset.task;
        await api('DELETE', `/tasks/${taskId}`);
        tk.tasks = tk.tasks.filter((x) => x.id !== taskId);
        drawTasks();
        break;
      }
      case 'link-delete': {
        const l = rs.links.find((x) => x.id === btn.dataset.link);
        if (!confirm(`Remove "${l.title}"?`)) return;
        await api('DELETE', `/links/${l.id}`);
        rs.links = rs.links.filter((x) => x.id !== l.id);
        $('#res-body').innerHTML = resourcesHtml();
        break;
      }
      case 'tag':
        pl.tag = pl.tag === btn.dataset.tag ? '' : btn.dataset.tag;
        drawPages();
        break;
      case 'doc-filter':
        pl.status = btn.dataset.s;
        drawPages();
        break;
      case 'mm-fit':
        pg.fit = btn.dataset.fit === '1';
        prefs.set('mm-fit', pg.fit ? 'fit' : 'actual');
        drawPage();
        break;
      case 'edit-doc':
        pg.editing = true;
        drawPage();
        $('form[data-form="edit-doc"] textarea')?.focus();
        break;
      case 'cancel-doc':
        pg.editing = false;
        drawPage();
        break;
      case 'doc-status': {
        const prev = pg.status;
        pg.status = PROJECT_STATUS[pg.status]?.next ?? 'idea';
        drawPage();
        try {
          Object.assign(pg, await api('PATCH', `/pages/${pg.id}`, { status: pg.status }));
        } catch (err) {
          pg.status = prev;
          drawPage();
          throw err;
        }
        break;
      }
      case 'delete-doc': {
        const key = keyOfKind(pg.kind);
        if (!confirm(`Delete "${pg.title}"? This can't be undone.`)) return;
        await api('DELETE', `/pages/${pg.id}`);
        location.hash = `#/${key}`;
        break;
      }
    }
  } catch (err) {
    toast(err.message);
  }
});

view.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button:not([type="button"])');
  submit.disabled = true;
  try {
    switch (form.dataset.form) {
      case 'login': {
        const r = await api('POST', '/login', { username: data.username, password: data.password });
        Object.assign(me, { admin: true, name: r.name });
        renderAuth();
        toast(`Welcome back, ${r.name.split(' ')[0]}`);
        location.hash = '#/tasks';
        return;
      }
      case 'signup': {
        if (data.password !== data.confirm) throw new Error("The two passwords don't match");
        const r = await api('POST', '/signup', { name: data.name, username: data.username, password: data.password, setupKey: data.setupKey });
        Object.assign(me, { admin: true, hasAccount: true, name: r.name });
        renderAuth();
        toast('Account created. You are logged in.');
        location.hash = '#/tasks';
        return;
      }
      case 'add-item': {
        const secId = form.dataset.sec;
        const item = await api('POST', `/sections/${secId}/items`, { title: data.title, url: data.url || undefined });
        findSection(secId).items.push(item);
        drawRoadmap();
        $(`form[data-sec="${secId}"] input[name="title"]`)?.focus();
        return;
      }
      case 'add-section':
        rm.sections.push(await api('POST', `/roadmaps/${rm.id}/sections`, { title: data.title }));
        rm.group = 'topic';
        drawRoadmap();
        return;
      case 'note': {
        const id = form.closest('[data-item]').dataset.item;
        Object.assign(findItem(id), await api('PATCH', `/items/${id}`, { note: data.note }));
        drawRoadmap();
        return;
      }
      case 'edit-page': {
        const updated = await api('PATCH', `/roadmaps/${rm.id}`, {
          title: data.title,
          intro: data.intro,
          resources: parseResources(data.resources),
          notes: parseNotes(data.notes),
        });
        Object.assign(rm, { title: updated.title, intro: updated.intro, resources: updated.resources, notes: updated.notes, editing: false });
        drawRoadmap();
        toast('Page saved');
        return;
      }
      case 'import-md': {
        const r = await api('POST', '/import/markdown', { title: data.title, markdown: data.markdown });
        toast(`Imported ${plural(r.sections.reduce((n, s) => n + s.items.length, 0), 'topic')}`);
        location.hash = `#/r/${r.id}`;
        return;
      }
      case 'add-task': {
        tk.tasks.push(await api('POST', '/tasks', { title: data.title, date: data.date || null }));
        drawTasks();
        $('form[data-form="add-task"] input[name="title"]')?.focus();
        return;
      }
      case 'add-habit': {
        const daysValue = data.days === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : data.days === 'weekdays' ? [1, 2, 3, 4, 5] : [Number(data.days)];
        tk.routine.habits.push(await api('POST', '/habits', { title: data.title, url: data.url || undefined, days: daysValue }));
        drawTasks();
        return;
      }
      case 'add-link': {
        rs.links.push(await api('POST', '/links', { title: data.title, url: data.url, category: data.category, note: data.note }));
        drawResources();
        toast('Link added');
        return;
      }
      case 'new-page': {
        const p = await api('POST', '/pages', { kind: KINDS[pl.key].kind, title: data.title });
        editNext = p.id;
        location.hash = `#/p/${p.id}`;
        return;
      }
      case 'edit-doc': {
        const updated = await api('PATCH', `/pages/${pg.id}`, {
          title: data.title,
          summary: data.summary,
          tags: parseTags(data.tags),
          status: pg.kind === 'project' ? data.status : undefined,
          body: data.body,
        });
        Object.assign(pg, updated, { editing: false });
        drawPage();
        toast('Saved');
        return;
      }
      case 'new-rm': {
        const r = await api('POST', '/roadmaps', { title: data.title });
        location.hash = `#/r/${r.id}`;
        return;
      }
    }
  } catch (err) {
    toast(err.message);
  } finally {
    if (submit.isConnected) submit.disabled = false;
  }
});

loadMe().then(route);
