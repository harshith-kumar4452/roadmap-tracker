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

const me = { admin: false, editingEnabled: false };

function renderAuth() {
  document.body.classList.toggle('is-admin', me.admin);
  $('#auth').innerHTML = me.admin
    ? '<button type="button" class="btn ghost small" data-act="logout">Log out</button>'
    : '<a class="btn ghost small" href="#/login">Log in to edit</a>';
}

async function loadMe() {
  try { Object.assign(me, await api('GET', '/me')); } catch { /* treat as visitor */ }
  renderAuth();
}

function renderLogin() {
  document.title = 'Log in';
  view.innerHTML = `
    <a class="back" href="#/">← All roadmaps</a>
    <section class="panel login">
      <h1>Log in to edit</h1>
      <p class="muted">Anyone can view these roadmaps. Ticking topics and editing pages needs the owner password.</p>
      ${me.editingEnabled ? '' : '<p class="warn">Editing is turned off on this server: <code>ADMIN_PASSWORD</code> is not set.</p>'}
      <form data-form="login" class="stack">
        <input type="password" name="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required autofocus>
        <div><button class="btn primary">Log in</button></div>
      </form>
    </section>`;
}

// ---------- routing ----------

function setNav(key) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === key));
}

async function route() {
  const hash = location.hash.slice(1) || '/';
  setNav(hash === '/' || hash.startsWith('/r/') ? 'home' : hash.slice(1));
  try {
    let m;
    if (hash === '/') await renderDashboard();
    else if ((m = hash.match(/^\/r\/([\w-]+)$/))) await renderRoadmap(m[1]);
    else if ((m = hash.match(/^\/(cheatsheets|projects|mindmaps)$/))) await renderPages(m[1]);
    else if ((m = hash.match(/^\/p\/([\w-]+)$/))) await renderPage(m[1]);
    else if (hash === '/import' && me.admin) renderImport();
    else if (hash === '/login') renderLogin();
    else location.hash = '#/';
  } catch (err) {
    view.innerHTML = `<div class="empty"><h2>Couldn't load this page</h2><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">Back to dashboard</a></div>`;
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
    <a class="back" href="#/">← All roadmaps</a>
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
    <a class="back" href="#/">← All roadmaps</a>
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
        location.hash = '#/';
        break;
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
      case 'login':
        await api('POST', '/login', { password: data.password });
        me.admin = true;
        renderAuth();
        toast('Logged in. You can edit now.');
        location.hash = '#/';
        return;
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
