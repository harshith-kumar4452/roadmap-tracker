import { markdown, outline, mindmapSvg } from './render.js';
import { interactiveMindmap } from './mindmap.js';
import { floatField, bindParallax } from './floaters.js';
import { storyHtml, initStory, playIntro } from './story.js';
import { buddySvg, initBuddy, buddyReact } from './buddy.js';
import { renderRoleHubView } from './role-hub.js';
import { renderPlannerView, checkTodayNotifications } from './planner.js';
import { dsaPatternsHtml, bindDsaPatterns } from './dsa-patterns.js';
import { startTour, tourSeen } from './tour.js';

const view = document.getElementById('view');
const $ = (sel, el = document) => el.querySelector(sel);

// ---------- helpers ----------

async function api(method, url, body) {
  let res;
  try {
    res = await fetch('/api' + url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && method !== 'GET' && url !== '/login') {
    me.admin = false;
    renderAuth();
  }
  if (!res.ok) throw new Error(data?.error || (res.status >= 500 ? 'Something went wrong on the server. Try again in a moment.' : `Request failed (${res.status})`));
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
  : `<button class="tick readonly" type="button" data-act="readonly-tick" aria-label="${done ? 'Done' : 'Not done'}: ${esc(title)}" data-checked="${done}">${icons.check}</button>`;

let toastTimer;
function toast(message, action, kind = 'info') {
  const el = $('#toast');
  el.dataset.kind = kind;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  el.hidden = false;
  if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : kind === 'error' ? 6000 : 3500);
}

// ---------- page title & description ----------

const SITE = 'Learning hub';
function setPage(title, description) {
  document.title = title ? `${title} · ${SITE}` : me.name ? `${me.name} · ${SITE}` : SITE;
  const desc = String(description || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) $(sel)?.setAttribute('content', desc);
  $('meta[property="og:title"]')?.setAttribute('content', document.title);
}

// ---------- theme ----------

const currentTheme = () => {
  const saved = prefs.get('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
function syncThemeBtn() {
  const dark = currentTheme() === 'dark';
  const icon = document.querySelector('.theme-btn .material-icons-round');
  const btn = document.querySelector('.theme-btn');
  if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
  if (btn) btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
}
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  prefs.set('theme', next);
  syncThemeBtn();
}
syncThemeBtn();

// ---------- auth ----------

const me = { authenticated: false, admin: false, editingEnabled: false, hasAccount: false, name: null };

function renderAuth() {
  document.body.classList.toggle('is-admin', me.admin);
  document.body.classList.toggle('is-auth', me.authenticated);
  $('#year').textContent = new Date().getFullYear();
  $('#owner').textContent = me.name || 'Learning hub';
  $('#auth').innerHTML = me.authenticated
    ? '<button type="button" class="btn ghost small" data-act="logout">Log out</button>'
    : '<a class="btn ghost small" href="#/login">Log in</a><a class="btn primary small" href="#/signup">Sign up</a>';
}

async function loadMe() {
  try { Object.assign(me, await api('GET', '/me')); } catch { /* treat as visitor */ }
  renderAuth();
}

function renderLogin() {
  if (me.authenticated) { location.hash = '#/roadmaps'; return; }
  setPage('Log in', 'Log in to access roadmaps, links, and your learning hub.');
  view.innerHTML = `
    <section class="auth-card panel">
      <span class="brand-mark big" aria-hidden="true"></span>
      <div>
        <h1>Welcome back</h1>
        <p class="muted">Log in to access all roadmaps, resource links, cheat sheets, and mindmaps.</p>
      </div>
      <form data-form="login" class="stack">
        <label>Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn primary">Log in</button>
      </form>
      <p class="muted small">New here? <a href="#/signup">Create an account</a></p>
    </section>`;
}

function renderSignup() {
  if (me.authenticated) { location.hash = '#/roadmaps'; return; }
  setPage('Sign up', 'Create an account to access roadmaps and resource links.');
  view.innerHTML = `
    <section class="auth-card panel">
      <span class="brand-mark big" aria-hidden="true"></span>
      <div>
        <h1>Create your account</h1>
        <p class="muted">Sign up to unlock all roadmaps, resource links, cheat sheets, and mindmaps.</p>
      </div>
      ${me.editingEnabled ? '' : '<p class="warn">Accounts are turned off: <code>ADMIN_PASSWORD</code> is not set on the server.</p>'}
      <form data-form="signup" class="stack">
        <label>Your name<input name="name" autocomplete="name" placeholder="Your name" required maxlength="80" autofocus></label>
        <label>Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required pattern="[A-Za-z0-9._\\-]{3,40}" title="3–40 letters, numbers, dots, dashes or underscores"></label>
        <label>Password<input type="password" name="password" autocomplete="new-password" minlength="8" required></label>
        <label>Confirm password<input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>
        ${!me.hasAccount ? `<label>Owner setup key <span class="muted small">(optional, leave blank for a standard account)</span>
          <input type="password" name="setupKey" autocomplete="off"></label>` : ''}
        <button class="btn primary">Create account</button>
      </form>
      <p class="muted small">Already have an account? <a href="#/login">Log in</a></p>
    </section>`;
}

function renderNotFound() {
  setPage('Page not found', "This page doesn't exist.");
  view.innerHTML = `
    <section class="notfound">
      <div class="notfound-box" title="Click Pip to peek!">${buddySvg('box')}</div>
      <p class="eyebrow">Error 404</p>
      <h1>Pip couldn't find that page</h1>
      <p class="muted">The link may be old, or the address has a typo. Pip is hiding in this box until you head back.</p>
      <div class="row-actions">
        <a class="btn primary" href="#/">Go to the home page</a>
        <a class="btn" href="#/roadmaps">Browse roadmaps</a>
      </div>
    </section>`;
  view.querySelector('.notfound-box')?.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('peek');
  });
}

// ---------- mobile menu ----------

const menuBtn = $('.menu-btn');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
document.addEventListener('click', (e) => {
  if (document.body.classList.contains('menu-open') && !e.target.closest('.topbar')) setMenu(false);
});

// ---------- routing ----------

function setNav(key) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.toggleAttribute('aria-current', a.dataset.nav === key);
    // On phones the tab row scrolls sideways; keep the current tab visible.
    if (a.dataset.nav === key) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function renderAuthGate(kind = 'roadmap') {
  const copy = {
    roadmap: {
      title: 'Log in to open this roadmap',
      text: 'You can browse the roadmap overview freely, but opening a specific roadmap and its topic links requires an account.',
      back: { label: 'Back to roadmaps', href: '#/roadmaps' },
    },
    resources: {
      title: 'Log in to view resource links',
      text: 'All curated course links, playlists, and practice sites are unlocked once you sign in.',
      back: { label: 'Back to home', href: '#/' },
    },
    page: {
      title: 'Log in to open this page',
      text: 'Sign in or create a free account to read full cheat sheets, project specs, and interactive mindmaps.',
      back: { label: 'Back to home', href: '#/' },
    },
  }[kind] || {
    title: 'Log in to continue',
    text: 'Sign in or create an account to open this content.',
    back: { label: 'Back to home', href: '#/' },
  };
  setPage('Log in required', copy.text);
  view.innerHTML = `
    ${kind === 'resources' ? libraryTabsHtml('resources') : ''}
    <section class="auth-gate panel">
      <div class="auth-gate-buddy">${buddySvg('gate')}</div>
      <p class="eyebrow">Members only</p>
      <h1>${copy.title}</h1>
      <p class="muted">${copy.text}</p>
      <div class="row-actions">
        <a class="btn primary" href="#/login">Log in</a>
        <a class="btn" href="#/signup">Create account</a>
        <a class="btn ghost" href="${copy.back.href}">${copy.back.label}</a>
      </div>
    </section>`;
}

async function route() {
  const hash = location.hash.slice(1) || '/';
  setNav(
    hash === '/' ? 'home'
      : (hash === '/roadmaps' || hash.startsWith('/r/') || hash.startsWith('/g/') || hash.startsWith('/role/')) ? 'roadmaps'
      : (hash === '/library' || hash === '/resources' || hash === '/cheatsheets' || hash === '/mindmaps' || hash.startsWith('/p/')) ? 'library'
      : hash.slice(1),
  );
  // The first request after the server has been idle can take a few seconds; show that something is happening.
  const loading = setTimeout(() => {
    view.innerHTML = '<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</div>';
  }, 250);
  try {
    let m;
    if (hash === '/') await renderLanding();
    else if (hash === '/signup') renderSignup();
    else if (hash === '/login') renderLogin();
    else if (hash === '/roadmaps') await renderDashboard();
    else if (hash === '/planner' || hash === '/calendar') {
      setPage(hash === '/calendar' ? 'Calendar' : 'Study Planner & Calendar', 'Multi-agent sprint study planner, calendar, and reminders.');
      await renderPlannerView({ view, api, esc, roles: JOB_ROLES, toast });
      if (hash === '/calendar') $('.cal-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    else if (hash === '/tasks') await renderTasks();
    else if (hash === '/profile') await renderProfile();
    else if (hash === '/library') {
      if (!me.authenticated) await renderPages('cheatsheets');
      else await renderResources();
    } else if (hash === '/resources') {
      if (!me.authenticated) renderAuthGate('resources');
      else await renderResources();
    } else if ((m = hash.match(/^\/role\/([\w-]+)$/))) {
      await renderRoleHub(m[1]);
    } else if ((m = hash.match(/^\/g\/([\w-]+)$/))) {
      await renderRoadmapGroup(m[1]);
    } else if ((m = hash.match(/^\/r\/([\w-]+)$/))) {
      if (!me.authenticated) renderAuthGate('roadmap');
      else await renderRoadmap(m[1]);
    } else if ((m = hash.match(/^\/(cheatsheets|projects|mindmaps)$/))) await renderPages(m[1]);
    else if ((m = hash.match(/^\/p\/([\w-]+)$/))) {
      if (!me.authenticated) renderAuthGate('page');
      else await renderPage(m[1]);
    } else if (hash === '/import' && me.admin) renderImport();
    else renderNotFound();
  } catch (err) {
    view.innerHTML = `<div class="empty"><h2>Couldn't load this page</h2><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">Back to home</a></div>`;
  } finally {
    clearTimeout(loading);
  }
}
window.addEventListener('hashchange', () => { setMenu(false); route(); window.scrollTo(0, 0); });

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

const JOB_ROLES = [
  { id: 'all', label: 'All roles', icon: 'apps', desc: 'Every learning roadmap arranged by target job role.' },
  { id: 'sde', label: 'SDE', icon: 'code', desc: 'DSA, Core Subjects (OS & CN), Databases (DBMS & SQL), System Design (OOPS, LLD, HLD), and Git.', match: /dsa|operating systems|computer networks|dbms|\bsql\b|system design|hld|lld|arpit|oops|git/i },
  { id: 'backend', label: 'Backend Engineer', icon: 'dns', desc: 'Backend engineering, Databases (DBMS & SQL), Redis, Kafka, Microservices, System Design, and Python.', match: /backend|node\.js|javascript|microservices|kafka|redis|dbms|\bsql\b|system design|hld|arpit|python|git/i },
  { id: 'data_engineer', label: 'Data Engineer', icon: 'storage', desc: 'Python, Databases (DBMS & SQL), Kafka streaming, Cloud (AWS), and Backend pipelines.', match: /python|dbms|\bsql\b|kafka|cloud|aws|backend/i },
  { id: 'data_analyst', label: 'Data Analyst', icon: 'analytics', desc: 'Power BI, SQL & Databases, Python, and Aptitude for analytics.', match: /power bi|\bsql\b|dbms|python|aptitude/i },
  { id: 'ai_engineer', label: 'AI Engineer', icon: 'psychology', desc: 'Machine Learning, Python, Databases (DBMS & SQL), and Cloud (AWS).', match: /\bml\b|python|dbms|\bsql\b|cloud|aws/i },
  { id: 'frontend', label: 'Frontend / Full Stack', icon: 'web', desc: 'Web Development (JavaScript, React & Backend), Databases, and Git.', match: /react|javascript|backend|node\.js|\bsql\b|git/i },
  { id: 'aptitude', label: 'Placement / GATE', icon: 'school', desc: 'Aptitude Roadmaps, DSA, GATE CS 2027, and Core Subjects.', match: /aptitude|gate|dsa|operating systems|computer networks/i },
];

const ROADMAP_GROUPS = [
  { slug: 'core-subjects', title: 'Core Subjects', desc: 'Operating Systems and Computer Networks fundamentals.', icon: 'memory', match: /operating systems|computer networks/i },
  { slug: 'databases', title: 'Databases (DBMS & SQL)', desc: 'Database management systems, normalization, indexing, and SQL.', icon: 'storage', match: /dbms|\bsql\b/i },
  { slug: 'web-development', title: 'Web Development', desc: 'Frontend (React) and Backend engineering (Node.js, APIs, projects).', icon: 'web', match: /backend|react|javascript/i },
  { slug: 'system-design', title: 'System Design', desc: 'OOPS, Low-Level Design (LLD), High-Level Design (HLD), and architecture projects.', icon: 'hub', match: /system design|hld|lld|arpit|oops/i },
  { slug: 'aptitude', title: 'Aptitude Roadmaps', desc: 'Quantitative, logical, verbal, and full aptitude preparation.', icon: 'school', match: /aptitude/i },
  { slug: 'redis', title: 'Redis Roadmaps', desc: 'Redis fundamentals and Redis internals.', icon: 'bolt', match: /^redis\b/i },
];

function bundleRoadmaps(list) {
  const buckets = new Map();
  const out = [];
  for (const r of list) {
    const grp = ROADMAP_GROUPS.find((g) => g.match.test(r.title));
    if (!grp) {
      out.push(r);
      continue;
    }
    let b = buckets.get(grp.slug);
    if (!b) {
      b = {
        isGroup: true,
        slug: grp.slug,
        title: grp.title,
        desc: grp.desc,
        icon: grp.icon,
        items: [],
        done: 0,
        total: 0,
        inProgress: 0,
        lastDoneAt: null,
        searchText: grp.title.toLowerCase(),
      };
      buckets.set(grp.slug, b);
      out.push(b);
    }
    b.items.push(r);
    b.done += r.done;
    b.total += r.total;
    b.inProgress += r.inProgress || 0;
    b.searchText += ' ' + r.title.toLowerCase();
    if (r.lastDoneAt && (!b.lastDoneAt || r.lastDoneAt > b.lastDoneAt)) b.lastDoneAt = r.lastDoneAt;
  }
  return out.map((entry) => (entry.isGroup && entry.items.length === 1 ? entry.items[0] : entry));
}

const rolesFor = (r) => {
  const text = r.isGroup ? r.items.map((i) => i.title).join(' ') : r.title;
  return JOB_ROLES.filter((role) => role.id !== 'all' && role.match.test(text));
};

function roadmapCard(r) {
  const p = pct(r.done, r.total);
  const roles = rolesFor(r).slice(0, 2);
  const href = r.isGroup ? `#/g/${esc(r.slug)}` : `#/r/${esc(r.id)}`;
  return `
    <a class="rm-card ${r.isGroup ? 'rm-bundle' : ''} ${p === 100 ? 'complete' : ''}" href="${href}">
      <div class="rm-card-top">
        <h3>${esc(r.title)}</h3>
        <span class="pct">${p === 100 ? 'Done' : p + '%'}</span>
      </div>
      ${bar(r.done, r.total)}
      <div class="rm-roles">
        ${r.isGroup ? `<span class="rm-bundle-badge"><span class="material-icons-round" aria-hidden="true">folder_copy</span>${r.items.length} roadmaps</span>` : ''}
        ${roles.map((ro) => `<span class="rm-role-tag">${esc(ro.label)}</span>`).join('')}
      </div>
      <div class="rm-card-meta">
        <span>${r.done} / ${plural(r.total, 'topic')}${r.inProgress ? ` · ${r.inProgress} in progress` : ''}</span>
        <span>${r.lastDoneAt ? 'Active ' + ago(r.lastDoneAt) : r.done ? 'Imported progress' : 'Not started'}</span>
      </div>
    </a>`;
}

async function renderRoleHub(roleId) {
  const role = JOB_ROLES.find((r) => r.id === roleId && r.id !== 'all');
  if (!role) { renderNotFound(); return; }
  const list = await api('GET', '/roadmaps');
  const bundled = bundleRoadmaps(list);
  const allItems = list.filter((r) => role.match.test(r.title));
  const cards = bundled.filter((r) => (r.isGroup ? r.items.some((i) => role.match.test(i.title)) : role.match.test(r.title)));
  setPage(`${role.label} Track`, role.desc);
  renderRoleHubView({ role, cards, allItems, view, esc, bar, pct, plural, roadmapCard });
}

async function renderRoadmapGroup(slug) {
  const grp = ROADMAP_GROUPS.find((g) => g.slug === slug);
  if (!grp) { renderNotFound(); return; }
  const list = await api('GET', '/roadmaps');
  const items = list.filter((r) => grp.match.test(r.title)).sort((a, b) => a.title.localeCompare(b.title));
  if (!items.length) { renderNotFound(); return; }
  const done = items.reduce((n, r) => n + r.done, 0);
  const total = items.reduce((n, r) => n + r.total, 0);
  setPage(grp.title, grp.desc);
  view.innerHTML = `
    <a class="back" href="#/roadmaps">← All roadmaps</a>
    <header class="page-head">
      <div>
        <h1><span class="material-icons-round">${grp.icon}</span> ${esc(grp.title)}</h1>
        <p class="muted">${esc(grp.desc)}</p>
      </div>
    </header>
    <div class="rm-progress">
      ${bar(done, total, 'lg')}
      <div class="rm-progress-meta"><strong>${pct(done, total)}%</strong><span class="muted">${done} of ${plural(total, 'topic')} done across ${plural(items.length, 'roadmap')}</span></div>
    </div>
    <div class="grid">${items.map(roadmapCard).join('')}</div>`;
}

async function renderDashboard() {
  setPage('Roadmaps', 'Progress across every learning roadmap: backend, system design, DSA, core CS and aptitude.');
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
        <div>
          <h2 class="h2">Explore roadmaps</h2>
          <p class="muted small" id="rm-role-desc"></p>
        </div>
        <div class="toolbar-right">
          <div class="seg" role="group" aria-label="Browse mode">
            <button type="button" data-rm-mode="subject" aria-pressed="true">Filter by Subject</button>
            <button type="button" data-rm-mode="role" aria-pressed="false">Filter by Role</button>
          </div>
          ${me.admin ? '<a class="btn small" href="#/import">Add roadmaps</a>' : ''}
        </div>
      </div>

      <div class="rm-filters" id="rm-subject-controls">
        <div class="seg" role="group" aria-label="Filter by status">
          <button type="button" data-rm-status="all" aria-pressed="true">All</button>
          <button type="button" data-rm-status="in_progress" aria-pressed="false">In progress</button>
          <button type="button" data-rm-status="not_started" aria-pressed="false">Not started</button>
          <button type="button" data-rm-status="done" aria-pressed="false">Done</button>
        </div>
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

      <div id="rm-grid"></div>
    </section>`;

  const grid = $('#rm-grid');
  const search = $('#rm-search');
  const sort = $('#rm-sort');
  const roleDesc = $('#rm-role-desc');
  const subjectControls = $('#rm-subject-controls');
  const modeBtns = [...document.querySelectorAll('[data-rm-mode]')];
  const statusBtns = [...document.querySelectorAll('[data-rm-status]')];

  let activeMode = ['subject', 'role'].includes(prefs.get('rm-mode')) ? prefs.get('rm-mode') : 'subject';
  let activeStatus = ['all', 'in_progress', 'not_started', 'done'].includes(prefs.get('rm-status')) ? prefs.get('rm-status') : 'all';
  sort.value = sorters[prefs.get('sort')] ? prefs.get('sort') : 'recent';

  const rmStatus = (r) => {
    if (r.total > 0 && r.done === r.total) return 'done';
    if (r.done > 0 || r.inProgress > 0) return 'in_progress';
    return 'not_started';
  };

  const bundled = bundleRoadmaps(list);

  const jobRoleCard = (role) => {
    const items = list.filter((r) => role.match.test(r.title));
    const done = items.reduce((n, r) => n + r.done, 0);
    const total = items.reduce((n, r) => n + r.total, 0);
    const p = pct(done, total);
    return `
      <a class="rm-card role-job-card" href="#/role/${esc(role.id)}">
        <div class="rm-card-top">
          <div class="role-card-title">
            <span class="material-icons-round role-card-icon" aria-hidden="true">${role.icon}</span>
            <h3>${esc(role.label)}</h3>
          </div>
          <span class="pct">${p}%</span>
        </div>
        <p class="muted small">${esc(role.desc)}</p>
        ${bar(done, total)}
        <div class="rm-roles">
          <span class="rm-bundle-badge">${plural(items.length, 'roadmap')}</span>
          <span class="rm-role-tag">Resources</span>
          <span class="rm-role-tag">Interviews</span>
          <span class="rm-role-tag">Playground</span>
        </div>
        <div class="rm-card-meta">
          <span>${done} / ${plural(total, 'topic')}</span>
          <span>Open track -></span>
        </div>
      </a>`;
  };

  const draw = () => {
    prefs.set('sort', sort.value);
    prefs.set('rm-mode', activeMode);
    prefs.set('rm-status', activeStatus);

    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rmMode === activeMode)));
    statusBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rmStatus === activeStatus)));
    subjectControls.hidden = activeMode === 'role';
    subjectControls.style.display = activeMode === 'role' ? 'none' : '';

    if (activeMode === 'role') {
      const roles = JOB_ROLES.filter((r) => r.id !== 'all');
      roleDesc.textContent = 'Pick a job role to access its roadmaps, curated resources, interview experiences, and playground.';
      grid.className = 'grid';
      grid.innerHTML = roles.map(jobRoleCard).join('');
      return;
    }

    const q = search.value.trim().toLowerCase();
    const rows = bundled
      .filter((r) => activeStatus === 'all' || rmStatus(r) === activeStatus)
      .filter((r) => !q || (r.searchText || r.title.toLowerCase()).includes(q))
      .sort(sorters[sort.value]);

    roleDesc.textContent = `Showing ${rows.length} of ${bundled.length} subject cards (${list.length} total roadmaps).`;
    grid.className = 'grid';
    grid.innerHTML = rows.map(roadmapCard).join('') || '<p class="empty">No roadmaps match those filters.</p>';
  };

  modeBtns.forEach((b) => b.addEventListener('click', () => { activeMode = b.dataset.rmMode; draw(); }));
  statusBtns.forEach((b) => b.addEventListener('click', () => { activeStatus = b.dataset.rmStatus; draw(); }));
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
    group: prefs.get('group:' + id) || 'topic',
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

// ---------- question links (practice sites, article, video), styled after the TUF sheet ----------

const SITES = [
  [/leetcode\.com/, 'LeetCode'], [/takeuforward\.org\/(practice|plus)/, 'TUF'], [/hackerrank\.com/, 'HackerRank'],
  [/codechef\.com/, 'CodeChef'], [/geeksforgeeks\.org/, 'GFG'], [/datalemur\.com/, 'DataLemur'], [/codingninjas|naukri\.com\/code360/, 'Code360'],
  [/exercism\.org/, 'Exercism'],
];
const siteOf = (url) => SITES.find(([re]) => re.test(url))?.[1];

// Every place a topic can be worked on. Uses the stored `links` when the import provided them;
// otherwise works them out from the topic's link and any "Also on LeetCode: <url>" note.
function itemLinks(i) {
  const out = [];
  const add = (l) => { if (safeUrl(l.url) && !out.some((o) => o.url === l.url)) out.push(l); };
  (i.links ?? []).forEach(add);
  if (i.url) {
    const site = siteOf(i.url);
    if (/youtu\.?be/.test(i.url)) add({ kind: 'video', site: 'YouTube', url: i.url });
    else add(site ? { kind: 'practice', site, url: i.url } : { kind: 'article', site: 'Link', url: i.url });
  }
  for (const m of (i.note || '').matchAll(/Also on (\w+): (https?:\/\/\S+)/g)) add({ kind: 'practice', site: m[1], url: m[2] });
  return out;
}

// Links sit in fixed slots, one per site/kind used anywhere in the group, so icons line up from
// row to row (as on the TUF sheet). A question without that link shows a faint placeholder.
const SITE_ORDER = ['TUF', 'LeetCode', 'GFG', 'HackerRank', 'CodeChef', 'Exercism', 'DataLemur', 'Code360'];
const SITE_SHORT = { TUF: 'TUF', LeetCode: 'LC', GFG: 'GFG', HackerRank: 'HR', CodeChef: 'CC', Exercism: 'EX', DataLemur: 'DL', Code360: 'C360' };
const KIND_ICON = { article: 'article', video: 'smart_display' };
const slotKey = (l) => (l.kind === 'practice' ? `p:${l.site}` : l.kind);
const slotRank = (k) => (k.startsWith('p:') ? (SITE_ORDER.indexOf(k.slice(2)) + 1 || 50) : k === 'article' ? 100 : 101);

function groupSlots(items) {
  const keys = new Set(items.flatMap((i) => itemLinks(i).map(slotKey)));
  return [...keys].sort((a, b) => slotRank(a) - slotRank(b));
}

function linkHtml(i, l) {
  const attrs = `href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"`;
  if (l.kind === 'practice') {
    const key = l.site.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `<a class="qbadge site-${key}" ${attrs} title="Solve on ${esc(l.site)}" aria-label="Solve ${esc(i.title)} on ${esc(l.site)}">${esc(SITE_SHORT[l.site] ?? l.site.slice(0, 3))}</a>`;
  }
  const label = l.kind === 'video' ? 'Watch the video' : l.site === 'Link' ? 'Open the link' : 'Read the article';
  return `<a class="qicon qicon-${l.kind}" ${attrs} title="${label}" aria-label="${label}: ${esc(i.title)}"><span class="material-icons-round" aria-hidden="true">${KIND_ICON[l.kind]}</span></a>`;
}

function linksHtml(i, slots = groupSlots([i])) {
  const byKey = new Map(itemLinks(i).map((l) => [slotKey(l), l]));
  return slots.map((k) => {
    const l = byKey.get(k);
    if (l) return linkHtml(i, l);
    const what = k.startsWith('p:') ? `Not on ${k.slice(2)}` : `No ${k}`;
    return `<span class="qslot-empty ${k.startsWith('p:') ? 'is-badge' : ''}" title="${esc(what)}" aria-hidden="true"></span>`;
  }).join('');
}

// Notes written by the importers ("LeetCode #1 · 71k likes", "takeUforward A2Z · Fundamentals")
// are shown as quiet metadata; anything else is the owner's own note.
const IMPORT_NOTE = /^(LeetCode #|HackerRank\b|CodeChef\b|takeUforward A2Z|Source:|Practice · )/;
// The sheet's sub-topic slugs read as "Faqs hard", "1d dp", "Triessubc"; show them as TUF does.
const prettySub = (s) => s
  .replace(/^faqs\s*(hard|medium|dll)?$/i, (_, k) => (k ? `FAQs (${k.toLowerCase() === 'dll' ? 'DLL' : k[0].toUpperCase() + k.slice(1).toLowerCase()})` : 'FAQs'))
  .replace(/^triessubc$/i, 'Tries')
  .replace(/\b(1d|2d|dp|lis|mcm|ll|dll|bst|bt|ii)\b/gi, (m) => m.toUpperCase())
  .replace(/\beratosthenes\b/i, 'Eratosthenes')
  .replace(/^On answers$/i, 'On answers (binary search)');
// A topic's sub-group: the TUF sheet's sub-topic, or "Practice" for questions added after a
// video course's lessons.
const subTopicOf = (i) => {
  const note = noteText(i.note);
  if (note.startsWith('Practice · ')) return 'Practice';
  return prettySub(/^takeUforward A2Z · (.+)$/.exec(note)?.[1] ?? '');
};

// Practice lists read better as Easy / Medium / Hard, the way the question sites label them.
const isPracticeList = () => /practice/i.test(rm?.title ?? '');
const DIFFICULTY = { Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' };
const levelLabel = (l) => (isPracticeList() ? DIFFICULTY[l] ?? l : l);
const noteText = (n) => (n || '').replace(/\s*·?\s*Also on \w+: https?:\/\/\S+/g, '').trim();

// One line per question, like the TUF sheet: tick, title with its difficulty tag, then the
// link slots on the right. Source details sit quietly under the title.
function itemRow(i, slots) {
  const note = noteText(i.note);
  const imported = IMPORT_NOTE.test(note);
  const meta = imported ? note.replace(/^takeUforward A2Z · .*$/, '').replace(/^Practice · /, '') : '';
  const next = STATUS[STATUS[i.status]?.next ?? 'in_progress'];
  return `
    <div class="row ${i.status === 'done' ? 'is-done' : ''} ${i.status === 'in_progress' ? 'is-doing' : ''}" role="row" data-item="${esc(i.id)}">
      <div class="c-name" role="cell">
        ${tick(i.status === 'done', i.title)}
        <div class="name-body">
          <div class="title-line">
            ${itemTitle(i)}
            ${levelPill(i.level)}
            ${i.status === 'in_progress' ? '<span class="pill status-in_progress">In progress</span>' : ''}
          </div>
          ${rm.group === 'level' ? `<span class="topic">${esc(i.sectionTitle)}</span>` : ''}
          ${meta ? `<span class="meta">${linkify(meta)}</span>` : ''}
          ${note && !imported ? `<p class="note">${linkify(note)}</p>` : ''}
          ${i.status === 'done' && i.doneAt ? `<span class="done-at">Done ${ago(i.doneAt)}</span>` : ''}
        </div>
        ${me.admin ? `<div class="item-actions">
          <button type="button" class="icon-btn" data-act="status" title="Mark ${next.label.toLowerCase()}" aria-label="Mark ${esc(i.title)} ${next.label.toLowerCase()}"><span class="material-icons-round" aria-hidden="true">timelapse</span></button>
          <button type="button" class="icon-btn" data-act="note" title="${note && !imported ? 'Edit note' : 'Add note'}" aria-label="Note for ${esc(i.title)}">${icons.note}</button>
          <button type="button" class="icon-btn danger" data-act="delete-item" title="Delete topic" aria-label="Delete ${esc(i.title)}">${icons.trash}</button>
        </div>` : ''}
      </div>
      <div class="c-links" role="cell">${linksHtml(i, slots)}</div>
    </div>`;
}

// Sub-topic headings inside a step (Fundamentals, FAQs (Medium)... or Videos / Practice), each
// with its own count. Link slots are worked out per sub-group, so a video lesson doesn't carry
// empty slots for the practice sites below it.
function rowsHtml(g, rows) {
  const grouped = rm.group === 'topic' && g.items.some((x) => subTopicOf(x));
  const label = (x) => {
    if (!grouped) return '';
    const sub = subTopicOf(x);
    if (sub) return sub;
    return /youtu\.?be/.test(x.url || '') ? 'Videos' : 'Topics';
  };
  const slotsFor = new Map();
  const slots = (sub) => {
    if (!slotsFor.has(sub)) slotsFor.set(sub, groupSlots(grouped ? g.items.filter((x) => label(x) === sub) : g.items));
    return slotsFor.get(sub);
  };
  let last = null;
  return rows.map((i) => {
    const sub = label(i);
    let head = '';
    if (sub && sub !== last) {
      const of = g.items.filter((x) => label(x) === sub);
      head = `<div class="subhead" role="row"><span role="cell">${esc(sub)}</span><span class="sec-count">${of.filter((x) => x.status === 'done').length} / ${of.length}</span></div>`;
    }
    last = sub;
    return head + itemRow(i, slots(sub));
  }).join('');
}

function levelPill(level) {
  const cls = `pill level-${(level || 'none').toLowerCase()}`;
  const label = levelLabel(level) || (me.admin ? (isPracticeList() ? 'Set difficulty' : 'Set level') : '');
  if (me.admin) return `<button type="button" class="${cls}" data-act="level" title="Change ${isPracticeList() ? 'difficulty' : 'level'}">${esc(label)}</button>`;
  return level ? `<span class="${cls}">${esc(label)}</span>` : '';
}

// Overall progress card, as on the TUF sheet: the big done / total figure with its bar, and
// done / total for each level beside it.
function progressCardHtml(items) {
  const done = items.filter((i) => i.status === 'done').length;
  const doing = items.filter((i) => i.status === 'in_progress').length;
  const tiles = LEVELS.map((l) => {
    const of = items.filter((i) => i.level === l);
    return of.length ? { l, total: of.length, done: of.filter((i) => i.status === 'done').length } : null;
  }).filter(Boolean);
  return `
    <section class="prog-card" aria-label="Progress">
      <div class="prog-main">
        <div class="eyebrow">Overall progress</div>
        <div class="prog-num"><strong>${done}</strong><span>/ ${items.length}</span><em>${pct(done, items.length)}%</em></div>
        ${bar(done, items.length, 'lg')}
        ${doing ? `<span class="muted small">${doing} in progress</span>` : ''}
      </div>
      ${tiles.length ? `<div class="lvl-stats">${tiles.map((t) => `
        <div class="lvl-tile lvl-${t.l.toLowerCase()}">
          <div class="lvl-tile-top"><span>${esc(levelLabel(t.l))}</span><strong>${t.done}<span class="muted"> / ${t.total}</span></strong></div>
          ${bar(t.done, t.total, 'sm')}
        </div>`).join('')}</div>` : ''}
    </section>`;
}

function groupsHtml() {
  const q = rm.q.trim().toLowerCase();
  const filtering = rm.filter !== 'all' || Boolean(q);
  const match = (i) =>
    (rm.filter === 'all' || (rm.filter === 'todo' ? i.status !== 'done' : i.status === rm.filter)) &&
    (!q || i.title.toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q) || i.sectionTitle.toLowerCase().includes(q));

  const practice = isPracticeList();
  const html = groups().map((g, gi) => {
    const total = g.items.length;
    const done = g.items.filter((i) => i.status === 'done').length;
    const rows = g.items.filter(match);
    if (filtering && !rows.length) return '';
    const saved = prefs.get(`grp:${rm.id}:${g.key}`);
    const open = filtering || (saved ? saved === 'open' : done < total || total === 0);
    const head = g.level !== undefined
      ? `<span class="pill level-${(g.level || 'none').toLowerCase()}">${esc(g.level ? levelLabel(g.level) : g.title)}</span>`
      : `<span class="sec-title"><span class="sec-step">Step ${gi + 1}</span>${esc(g.title.replace(/^Striver A2Z: /, 'A2Z · '))}</span>`;
    return `
      <details class="sec ${total && done === total ? 'complete' : ''}" data-group="${esc(g.key)}" ${g.sectionId ? `data-sec="${esc(g.sectionId)}"` : ''} ${open ? 'open' : ''}>
        <summary>
          <span class="chev">${icons.chev}</span>
          ${head}
          ${bar(done, total, 'sm')}
          <span class="sec-count">${done} / ${total}</span>
        </summary>
        <div class="table" role="table" aria-label="${esc(practice ? 'Questions' : 'Topics')} in ${esc(g.title)}">
          ${rowsHtml(g, rows)}
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
  const next = items.find((i) => i.status !== 'done');
  setPage(rm.title, rm.intro || `${rm.title}: ${plural(items.length, 'topic')}, ${pct(done, items.length)}% done.`);
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

    ${progressCardHtml(items)}

    ${rm.editing ? editorHtml() : pageDetailsHtml()}

    ${next ? `
      <div class="upnext" data-item="${esc(next.id)}">
        ${tick(false, next.title)}
        <div class="upnext-body"><div class="eyebrow">Up next · ${esc(next.sectionTitle)}${next.level ? ` · ${esc(levelLabel(next.level))}` : ''}</div>${itemTitle(next)}
          <div class="c-links">${linksHtml(next)}</div></div>
      </div>` : items.length ? '<div class="upnext all-done">Every topic in this roadmap is done.</div>' : ''}

    <h2 class="index-title">Course Index</h2>
    <div class="toolbar sticky">
      <div class="seg" role="group" aria-label="Group by">
        <button type="button" data-act="group" data-g="level" aria-pressed="${rm.group === 'level'}">${isPracticeList() ? 'By difficulty' : 'By level'}</button>
        <button type="button" data-act="group" data-g="topic" aria-pressed="${rm.group === 'topic'}">By topic</button>
      </div>
      <div class="seg" role="group" aria-label="Show">
        ${Object.entries(filterLabels).map(([f, label]) => `<button type="button" data-act="filter" data-f="${f}" aria-pressed="${rm.filter === f}">${label}</button>`).join('')}
      </div>
      <input type="search" id="item-search" placeholder="${isPracticeList() ? 'Search questions' : 'Search topics'}" aria-label="${isPracticeList() ? 'Search questions' : 'Search topics'}" value="${esc(rm.q)}">
      <div class="toolbar-right">
        <button type="button" class="btn ghost small" data-act="expand">Expand all</button>
        <button type="button" class="btn ghost small" data-act="collapse">Collapse all</button>
      </div>
    </div>

    <div id="groups">${groupsHtml()}</div>

    ${rm.id === 'u3NA5_Fv' || /\bdsa\b/i.test(rm.title) ? dsaPatternsHtml({ esc, bar, icons }) : ''}

    ${me.admin ? `
    <form class="add-section" data-form="add-section">
      <input name="title" placeholder="New topic group (section) name" aria-label="New section name" required>
      <button class="btn">Add section</button>
    </form>` : ''}`;

  bindDsaPatterns(view, { esc, bar, icons });
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
    toast(err.message, null, 'error');
    drawRoadmap();
    return;
  }
  drawRoadmap();
  if (body.status !== undefined) await refreshSyncedStatuses();
}

// A status change also updates the same question elsewhere, which can be in this roadmap too
// (a TUF question and its LeetCode twin). Pick those changes up without a reload.
async function refreshSyncedStatuses() {
  const shownId = rm?.id;
  let fresh;
  try { fresh = await api('GET', `/roadmaps/${shownId}`); } catch { return; }
  if (!rm || rm.id !== shownId) return;
  const byId = new Map(fresh.sections.flatMap((s) => s.items).map((i) => [i.id, i]));
  let changed = 0;
  for (const it of allItems()) {
    const f = byId.get(it.id);
    if (f && (f.status !== it.status || f.doneAt !== it.doneAt)) { it.status = f.status; it.doneAt = f.doneAt; changed++; }
  }
  if (changed) drawRoadmap();
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
  setPage('Add roadmaps', 'Import a roadmap from Notion or Markdown.');
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
    kind: 'cheatsheet', label: 'Cheat sheets', one: 'cheat sheet', icon: '<span class="material-icons-round">description</span>',
    blurb: 'Quick-reference pages: commands, syntax, formulas, things you keep looking up.',
    hint: 'Markdown: <code>## Heading</code>, <code>- list</code>, <code>| table |</code>, <code>```code```</code>, <code>`inline`</code>, <code>**bold**</code>, <code>[text](url)</code>',
  },
  projects: {
    kind: 'project', label: 'Projects', one: 'project', icon: '<span class="material-icons-round">build</span>',
    blurb: 'Things to build: the idea, the features, the stack, and where each one stands.',
    hint: 'Markdown: <code>## Heading</code>, <code>- list</code>, <code>- [ ] task</code>, <code>[text](url)</code>, <code>```code```</code>',
  },
  mindmaps: {
    kind: 'mindmap', label: 'Mindmaps', one: 'mindmap', icon: '<span class="material-icons-round">psychology</span>',
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
  setPage(k.label, k.blurb);
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

function libraryTabsHtml(active) {
  const tabs = [
    { key: 'resources', href: '#/resources', label: 'Resources', icon: 'link' },
    { key: 'cheatsheets', href: '#/cheatsheets', label: 'Cheat sheets', icon: 'description' },
    { key: 'mindmaps', href: '#/mindmaps', label: 'Mindmaps', icon: 'psychology' },
  ];
  return `
    <nav class="lib-tabs" aria-label="Library sections">
      ${tabs.map((t) => `<a href="${t.href}" class="lib-tab${active === t.key ? ' is-active' : ''}"${active === t.key ? ' aria-current="page"' : ''}>
        <span class="material-icons-round" aria-hidden="true">${t.icon}</span>
        <span>${t.label}</span>
      </a>`).join('')}
    </nav>`;
}

function drawPages() {
  const k = KINDS[pl.key];
  const tags = [...new Set(pl.items.flatMap((p) => p.tags || []))].sort();
  const counts = Object.fromEntries(Object.keys(PROJECT_STATUS).map((s) => [s, pl.items.filter((p) => p.status === s).length]));
  view.innerHTML = `
    ${pl.key === 'cheatsheets' || pl.key === 'mindmaps' ? libraryTabsHtml(pl.key) : ''}
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
      <div id="mm-host" class="mm-host"></div>
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
  setPage(pg.title, pg.summary || `${k.one[0].toUpperCase()}${k.one.slice(1)}: ${pg.title}`);
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

  const host = $('#mm-host');
  if (host) interactiveMindmap(host, outline(pg.body, pg.title), { storageKey: `rt:mm:${pg.id}` });

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

// ---------- guided tour ----------

const isPhone = () => matchMedia('(max-width: 760px)').matches;
function tourSteps() {
  return [
    {
      target: null,
      title: 'Welcome to your learning hub 👋',
      text: 'Roadmaps, a daily practice routine and your notes, all in one place. This takes about 30 seconds.',
    },
    {
      target: '.landing-stats',
      title: 'Progress at a glance',
      text: 'Topics finished across every roadmap, your learning streak, and how today\'s practice routine is going.',
    },
    {
      target: '.routine-panel',
      title: 'Daily practice routine',
      text: 'LeetCode and GFG POTDs every day, CodeChef Starters on Wednesdays and LeetCode Weekly on Sundays. Green squares are days done; streaks skip days that aren\'t scheduled.',
    },
    {
      target: '.section-grid',
      title: 'Everything in one place',
      text: 'Roadmaps with Notion-style pages, Resources with every course link, cheat sheets, project ideas, interactive mind maps, and a profile with your education, skills and live coding stats.',
    },
    {
      target: isPhone() ? '.menu-btn' : '#site-nav',
      title: 'Jump between sections',
      text: isPhone() ? 'Open this menu to move between Roadmaps, Resources, Cheat sheets, Projects and Mindmaps.' : `Move between sections from here.${me.admin ? ' Tasks holds your routine and to-do list.' : ''}`,
    },
    {
      target: '#auth',
      title: me.admin ? 'You\'re logged in' : me.hasAccount ? 'Log in to make changes' : 'Create your account',
      text: me.admin
        ? 'You can tick topics, log your routine and edit every page. Log out here when you\'re done.'
        : me.hasAccount
          ? 'Anyone can look around. Logging in lets you tick topics, log your routine and edit pages.'
          : 'Set up the owner account to start ticking topics and logging your routine.',
    },
    {
      target: '.help-btn',
      title: 'Replay this tour any time',
      text: 'Click the ? button whenever you want a refresher.',
    },
  ];
}

let pendingTour = false;
function maybeStartTour() {
  if (pendingTour) { pendingTour = false; setTimeout(() => startTour(tourSteps()), 250); return; }
  if (!tourSeen()) setTimeout(() => { if ((location.hash.slice(1) || '/') === '/' && !document.querySelector('.tour-layer')) startTour(tourSteps()); }, 900);
}

// ---------- landing ----------

async function renderLanding() {
  setPage('', `${me.name ? `${me.name}'s` : 'A'} learning hub: roadmaps, a daily practice routine, contests, cheat sheets, projects and mind maps.`);
  const introPromise = playIntro();
  const [list, stats, routine, ...pageLists] = await Promise.all([
    api('GET', '/roadmaps'),
    api('GET', '/stats'),
    api('GET', `/habits?since=${sinceKey(120)}`),
    ...['cheatsheet', 'project', 'mindmap'].map((k) => api('GET', `/pages?kind=${k}`)),
  ]);
  await introPromise;
  const [cheats, projects, maps] = pageLists;
  const act = activity(stats.doneAt);
  const state = routineState(routine);
  const dueToday = routine.habits.filter((h) => isDue(h, state.today));
  const doneToday = dueToday.filter((h) => state.isDone(h, todayKey())).length;
  const bestStreak = Math.max(0, ...routine.habits.map(state.streak));
  const first = me.name ? me.name.split(' ')[0] : null;
  const started = list.filter((r) => r.done > 0).length;

  const sections = [
    { href: '#/roadmaps', icon: '<span class="material-icons-round">map</span>', title: 'Roadmaps', text: `${plural(list.length, 'roadmap')}, ${started} under way`, meta: `${pct(stats.done, stats.total)}% done` },
    { href: '#/planner', icon: '<span class="material-icons-round">auto_awesome</span>', title: 'Study Planner', text: 'Multi-agent sprint schedule, goals and notifications', meta: '3-sprint plan' },
    { href: '#/calendar', icon: '<span class="material-icons-round">calendar_month</span>', title: 'Calendar', text: 'Track sprint days, upcoming exams and interviews', meta: 'Schedule & events' },
    ...(me.admin ? [{ href: '#/tasks', icon: '<span class="material-icons-round">check_circle</span>', title: 'Tasks', text: 'Daily POTDs, contests and your to-do list', meta: dueToday.length ? `${doneToday}/${dueToday.length} today` : 'Nothing due' }] : []),
    { href: '#/resources', icon: '<span class="material-icons-round">link</span>', title: 'Resources', text: 'Every course, playlist and practice site in one list', meta: 'All links' },
    { href: '#/cheatsheets', icon: '<span class="material-icons-round">description</span>', title: 'Cheat sheets', text: 'Quick-reference commands and syntax', meta: plural(cheats.length, 'sheet') },
    { href: '#/projects', icon: '<span class="material-icons-round">build</span>', title: 'Projects', text: 'Things to build and where each one stands', meta: plural(projects.length, 'project') },
    { href: '#/mindmaps', icon: '<span class="material-icons-round">psychology</span>', title: 'Mindmaps', text: 'How the topics connect', meta: plural(maps.length, 'map') },
    ...(me.admin ? [{ href: '#/profile', icon: '<span class="material-icons-round">person</span>', title: 'Profile', text: 'Education, skills, achievements and coding profiles', meta: 'Live LeetCode stats' }] : []),
  ];

  view.innerHTML = `
    <section class="landing-hero">
      <div class="hero-copy">
        <p class="eyebrow hero-eyebrow"><span class="pulse" aria-hidden="true"></span>${first ? `${esc(first)}'s learning hub` : 'Learning hub'}</p>
        <h1>Backend, system design, DSA and core CS, <span class="accent">one day at a time.</span></h1>
        <p class="lede">${plural(list.length, 'roadmap')} and ${stats.total.toLocaleString()} topics, a daily problem-solving routine, weekly contests, and the notes that go with them.</p>
        <div class="row-actions">
          <a class="btn primary" href="#/roadmaps">Open roadmaps</a>
          ${me.admin ? '<a class="btn" href="#/tasks">Today\'s tasks</a>' : me.authenticated ? '<a class="btn" href="#/planner">Study planner</a>' : '<a class="btn" href="#/login">Log in</a>'}
          <button type="button" class="btn ghost" data-act="tour">Take the tour</button>
        </div>
      </div>
      ${floatField()}
    </section>

    <dl class="landing-stats">
      <div><dt>Topics done</dt><dd>${stats.done}<small>/ ${stats.total.toLocaleString()}</small></dd></div>
      <div><dt>Learning streak</dt><dd>${act.streak}<small>${act.streak === 1 ? 'day' : 'days'}</small></dd></div>
      <div><dt>Routine today</dt><dd>${doneToday}<small>/ ${dueToday.length}</small></dd></div>
      <div><dt>Best routine streak</dt><dd>${bestStreak}</dd></div>
    </dl>

    ${storyHtml({ roadmapsCount: list.length, topicsCount: stats.total, doneCount: stats.done, streak: act.streak })}

    ${routine.habits.length ? `
    <section class="panel routine-panel">
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

  bindParallax($('.landing-hero'));
  initStory(view);
  maybeStartTour();
}

// ---------- tasks: routine + to-dos (owner only) ----------

let tk = null;

async function renderTasks() {
  setPage('Tasks', 'Daily practice routine and to-do list.');
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
  setPage('Resources', 'Every course, playlist, practice site and link in one place.');
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
    ${libraryTabsHtml('resources')}
    <header class="page-head">
      <div>
        <h1><span class="material-icons-round">link</span> Resources</h1>
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

// ---------- student profile ----------

// Coding platforms get a coloured initials badge rather than a copied logo.
const PLATFORMS = {
  leetcode: { short: 'LC', color: '#f59e0b' },
  github: { short: 'GH', color: '#6e7681' },
  codechef: { short: 'CC', color: '#7c5b3c' },
  codeforces: { short: 'CF', color: '#1f8acb' },
  geeksforgeeks: { short: 'GfG', color: '#2f8d46' },
  gfg: { short: 'GfG', color: '#2f8d46' },
  hackerrank: { short: 'HR', color: '#16a34a' },
  atcoder: { short: 'AC', color: '#475569' },
  kaggle: { short: 'K', color: '#20beff' },
};
const platformKey = (p) => String(p || '').toLowerCase().replace(/[^a-z]/g, '');
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();

let pf = null;

async function renderProfile() {
  setNav('profile');
  if (!me.admin) {
    setPage('Profile', 'Owner profile.');
    view.innerHTML = `
      <div class="empty big">
        <h1>Profile is private</h1>
        <p class="muted">${me.hasAccount ? 'Log in to view and edit your profile.' : 'Create your account to set up your profile.'}</p>
        <a class="btn primary" href="${me.hasAccount ? '#/login' : '#/signup'}">${me.hasAccount ? 'Log in' : 'Create account'}</a>
      </div>`;
    return;
  }
  const profile = await api('GET', '/profile');
  pf = { profile, editing: !profile && me.admin };
  drawProfile();
}

const contactIcon = {
  email: '<path d="M3 6.5h18v11H3z"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M21 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 4.2 2 2 0 0 1 5.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L9 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  portfolio: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 3.8 5.5 3.8 9s-1.2 6.5-3.8 9c-2.6-2.5-3.8-5.5-3.8-9S9.4 5.5 12 3z"/>',
  resume: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
};
function contactButtons(c = {}) {
  const items = [
    c.email && { k: 'email', href: `mailto:${c.email}`, label: c.email },
    c.phone && { k: 'phone', href: `tel:${c.phone.replace(/[^+\d]/g, '')}`, label: c.phone },
    safeUrl(c.linkedin) && { k: 'linkedin', href: c.linkedin, label: 'LinkedIn', ext: true },
    safeUrl(c.github) && { k: 'github', href: c.github, label: 'GitHub', ext: true },
    safeUrl(c.portfolio) && { k: 'portfolio', href: c.portfolio, label: 'Portfolio', ext: true },
    safeUrl(c.resume) && { k: 'resume', href: c.resume, label: 'Resume', ext: true },
  ].filter(Boolean);
  return items.map((i) => `<a class="contact-btn${i.k === 'resume' ? ' primary' : ''}" href="${esc(i.href)}"${i.ext ? ' target="_blank" rel="noopener noreferrer"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${contactIcon[i.k]}</svg><span>${esc(i.label)}</span></a>`).join('');
}

function codingCard(c) {
  const key = platformKey(c.platform);
  const p = PLATFORMS[key] || { short: initials(c.platform), color: 'var(--accent)' };
  const url = safeUrl(c.url);
  const tag = url ? 'a' : 'div';
  return `
    <${tag} class="code-card" ${url ? `href="${esc(url)}" target="_blank" rel="noopener noreferrer"` : ''} style="--pc:${p.color}" data-platform="${esc(key)}">
      <span class="code-badge" aria-hidden="true">${esc(p.short)}</span>
      <span class="code-body">
        <strong>${esc(c.platform)}</strong>
        <span class="muted small">${c.username ? '@' + esc(c.username) : 'Profile'}</span>
        <span class="code-stat small" data-stat="${esc(key)}"></span>
      </span>
      ${url ? `<span class="ext">${icons.ext}</span>` : ''}
    </${tag}>`;
}

function profileView(p) {
  const avatar = safeUrl(p.avatar);
  return `
    <section class="profile-hero">
      <div class="avatar">${avatar ? `<img src="${esc(avatar)}" alt="Photo of ${esc(p.name)}" width="120" height="120" loading="eager" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(initials(p.name))}'}))">` : `<span>${esc(initials(p.name))}</span>`}</div>
      <div class="profile-id">
        ${p.openTo ? `<p class="eyebrow hero-eyebrow"><span class="pulse" aria-hidden="true"></span>Open to ${esc(p.openTo)}</p>` : ''}
        <h1>${esc(p.name)}</h1>
        ${p.headline ? `<p class="lede">${esc(p.headline)}</p>` : ''}
        ${p.location ? `<p class="muted small profile-loc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>${esc(p.location)}</p>` : ''}
        <div class="contact-row">${contactButtons(p.contact)}</div>
      </div>
      ${me.admin ? '<button type="button" class="btn ghost small profile-edit" data-act="edit-profile">Edit profile</button>' : ''}
    </section>

    <dl class="landing-stats profile-kpis" id="profile-kpis">
      <div><dt>LeetCode solved</dt><dd data-kpi="lc">—</dd></div>
      <div><dt>Contest rating</dt><dd data-kpi="rating">—</dd></div>
      <div><dt>Hub topics done</dt><dd data-kpi="topics">—</dd></div>
      <div><dt>Best routine streak</dt><dd data-kpi="streak">—</dd></div>
    </dl>

    <div class="profile-grid">
      <div class="profile-col">
        ${p.bio ? `<section class="panel"><h2>About</h2><p class="profile-bio">${linkify(p.bio)}</p></section>` : ''}

        ${p.coding?.length ? `
        <section class="panel">
          <div class="panel-head"><h2>Coding profiles</h2><span class="muted small" id="stats-note"></span></div>
          <div class="code-grid">${p.coding.map(codingCard).join('')}</div>
          <div id="lc-breakdown"></div>
        </section>` : ''}

        ${p.skills?.length ? `
        <section class="panel">
          <h2>Skills</h2>
          ${p.skills.map((s) => `<div class="skill-group"><div class="eyebrow">${esc(s.group)}</div><div class="chips">${s.items.map((x) => `<span class="chip skill">${esc(x)}</span>`).join('')}</div></div>`).join('')}
        </section>` : ''}
      </div>

      <div class="profile-col">
        ${p.education?.length ? `
        <section class="panel">
          <h2>Education</h2>
          <ol class="timeline">${p.education.map((e) => `
            <li>
              <span class="tl-dot" aria-hidden="true"></span>
              <div class="tl-when muted small">${esc(e.when)}</div>
              <strong>${esc(e.school)}</strong>
              ${e.degree ? `<div class="muted small">${esc(e.degree)}</div>` : ''}
              ${e.score ? `<span class="pill status-done">${esc(e.score)}</span>` : ''}
            </li>`).join('')}
          </ol>
        </section>` : ''}

        ${p.achievements?.length ? `
        <section class="panel">
          <h2>Achievements</h2>
          <ul class="achievements">${p.achievements.map((a) => `
            <li><span class="trophy" aria-hidden="true">🏆</span><div><strong>${esc(a.title)}</strong>${a.detail ? `<div class="muted small">${esc(a.detail)}</div>` : ''}</div>${a.when ? `<span class="muted small nowrap">${esc(a.when)}</span>` : ''}</li>`).join('')}
          </ul>
        </section>` : ''}

        <section class="panel">
          <div class="panel-head"><h2>Learning now</h2><a class="btn ghost small" href="#/roadmaps">All roadmaps</a></div>
          <div id="learning-now" class="learning-now muted small">Loading…</div>
        </section>
      </div>
    </div>`;
}

// Text-area friendly formats for the lists: one item per line, fields split by " | ".
const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
const fields = (l) => l.split(/\s*\|\s*/);
function profileEditor(p = {}) {
  const c = p.contact || {};
  const edu = (p.education || []).map((e) => [e.school, e.degree, e.when, e.score].join(' | ')).join('\n');
  const skills = (p.skills || []).map((s) => `${s.group}: ${s.items.join(', ')}`).join('\n');
  const coding = (p.coding || []).map((x) => [x.platform, x.username, x.url].join(' | ')).join('\n');
  const ach = (p.achievements || []).map((a) => [a.title, a.detail, a.when].join(' | ')).join('\n');
  const input = (name, label, value, attrs = '') => `<label>${label}<input name="${name}" value="${esc(value || '')}" ${attrs}></label>`;
  return `
    <form class="panel stack editor profile-form" data-form="profile">
      <h2>${p.name ? 'Edit profile' : 'Set up your profile'}</h2>
      <div class="form-grid">
        ${input('name', 'Full name', p.name, 'required maxlength="100" autocomplete="name"')}
        ${input('headline', 'Headline', p.headline, 'maxlength="160" placeholder="e.g. Full-stack developer · B.Tech CSE"')}
        ${input('location', 'Location', p.location, 'maxlength="100"')}
        ${input('openTo', 'Open to', p.openTo, 'maxlength="120" placeholder="e.g. SWE internships & roles"')}
        ${input('avatar', 'Photo URL', p.avatar, 'type="url" placeholder="https://…"')}
      </div>
      <label>About<textarea name="bio" rows="4" maxlength="2000">${esc(p.bio || '')}</textarea></label>
      <h3>Contact</h3>
      <div class="form-grid">
        ${input('email', 'Email', c.email, 'type="email" autocomplete="email"')}
        ${input('phone', 'Phone', c.phone, 'type="tel" autocomplete="tel"')}
        ${input('linkedin', 'LinkedIn URL', c.linkedin, 'type="url"')}
        ${input('github', 'GitHub URL', c.github, 'type="url"')}
        ${input('portfolio', 'Portfolio URL', c.portfolio, 'type="url"')}
        ${input('resume', 'Resume URL', c.resume, 'type="url"')}
      </div>
      <label>Coding profiles <span class="muted small hint">one per line: <code>Platform | username | profile URL</code>. LeetCode, GitHub and Codeforces show live stats.</span>
        <textarea name="coding" rows="4" class="mono">${esc(coding)}</textarea></label>
      <label>Education <span class="muted small hint">one per line: <code>School | Degree | Dates | Score</code></span>
        <textarea name="education" rows="4" class="mono">${esc(edu)}</textarea></label>
      <label>Skills <span class="muted small hint">one group per line: <code>Group: skill, skill, skill</code></span>
        <textarea name="skills" rows="4" class="mono">${esc(skills)}</textarea></label>
      <label>Achievements <span class="muted small hint">one per line: <code>Title | Detail | Date</code></span>
        <textarea name="achievements" rows="3" class="mono">${esc(ach)}</textarea></label>
      <div class="row-actions">
        <button class="btn primary">Save profile</button>
        ${p.name ? '<button type="button" class="btn ghost" data-act="cancel-profile">Cancel</button>' : ''}
      </div>
    </form>`;
}

function readProfileForm(d) {
  return {
    name: d.name, headline: d.headline, location: d.location, openTo: d.openTo, avatar: d.avatar, bio: d.bio,
    contact: { email: d.email, phone: d.phone, linkedin: d.linkedin, github: d.github, portfolio: d.portfolio, resume: d.resume },
    coding: lines(d.coding).map(fields).map(([platform, username = '', url = '']) => ({ platform, username, url })),
    education: lines(d.education).map(fields).map(([school, degree = '', when = '', score = '']) => ({ school, degree, when, score })),
    skills: lines(d.skills).map((l) => {
      const i = l.indexOf(':');
      return i < 0 ? { group: 'Skills', items: l.split(',').map((x) => x.trim()).filter(Boolean) } : { group: l.slice(0, i).trim(), items: l.slice(i + 1).split(',').map((x) => x.trim()).filter(Boolean) };
    }).filter((s) => s.items.length),
    achievements: lines(d.achievements).map(fields).map(([title, detail = '', when = '']) => ({ title, detail, when })),
  };
}

function drawProfile() {
  const p = pf.profile;
  if (pf.editing) {
    setPage('Edit profile', 'Edit your profile.');
    view.innerHTML = `<a class="back" href="#/">← Home</a>${profileEditor(p || { name: me.name })}`;
    return;
  }
  if (!p) {
    setPage('Profile', 'Student profile.');
    view.innerHTML = '<div class="empty big"><h1>No profile yet</h1><p class="muted">The owner hasn\'t set up a profile.</p></div>';
    return;
  }
  setPage(p.name, p.headline || p.bio);
  view.innerHTML = profileView(p);
  fillProfileStats(p);
}

async function fillProfileStats(p) {
  const kpi = (k, html) => { const el = $(`[data-kpi="${k}"]`); if (el) el.innerHTML = html; };
  // Learning hub numbers (always available).
  Promise.all([api('GET', '/stats'), api('GET', `/habits?since=${sinceKey(120)}`), api('GET', '/roadmaps')]).then(([stats, routine, list]) => {
    if (pf?.profile !== p) return;
    const state = routineState(routine);
    kpi('topics', `${stats.done}<small>/ ${stats.total.toLocaleString()}</small>`);
    kpi('streak', `${Math.max(0, ...routine.habits.map(state.streak))}<small>days</small>`);
    const active = list.filter((r) => r.done > 0 && r.done < r.total).sort(sorters.recent).slice(0, 4);
    const box = $('#learning-now');
    if (box) {
      box.classList.remove('muted', 'small');
      box.innerHTML = active.length
        ? active.map((r) => `<a class="ln-row" href="#/r/${esc(r.id)}"><span>${esc(r.title)}</span><span class="muted small">${r.done}/${r.total}</span>${bar(r.done, r.total, 'sm')}</a>`).join('')
        : '<p class="muted small">No roadmap started yet.</p>';
    }
  }).catch(() => {});

  // Live platform numbers (may be slow or unavailable; the page works without them).
  try {
    const s = await api('GET', '/profile/stats');
    if (pf?.profile !== p) return;
    const lc = s.leetcode;
    if (lc) {
      kpi('lc', `${lc.solved.all ?? 0}<small>problems</small>`);
      kpi('rating', lc.contest ? `${lc.contest.rating}<small>top ${lc.contest.topPercent}%</small>` : '—');
      const stat = $('[data-stat="leetcode"]');
      if (stat) stat.textContent = `${lc.solved.all} solved${lc.contest ? ` · ${lc.contest.rating} rating · ${lc.contest.attended} contests` : ''}`;
      const bd = $('#lc-breakdown');
      if (bd) {
        const row = (k, label) => `
          <div class="lc-row lc-${k}">
            <span class="lc-label">${label}</span>
            <span class="lc-bar"><span style="width:${pct(lc.solved[k] || 0, lc.total[k] || 1)}%"></span></span>
            <span class="lc-num"><strong>${lc.solved[k] || 0}</strong><span class="muted">/${lc.total[k] || '?'}</span></span>
          </div>`;
        bd.innerHTML = `<div class="lc-breakdown"><div class="eyebrow">LeetCode by difficulty</div>${row('easy', 'Easy')}${row('medium', 'Medium')}${row('hard', 'Hard')}</div>`;
      }
    }
    if (s.github) {
      const stat = $('[data-stat="github"]');
      if (stat) stat.textContent = `${s.github.repos} public repos · ${s.github.followers} followers`;
    }
    if (s.codeforces) {
      const stat = $('[data-stat="codeforces"]');
      if (stat) stat.textContent = s.codeforces.rating ? `${s.codeforces.rating} rating · ${s.codeforces.rank}` : 'Unrated';
    }
    const note = $('#stats-note');
    if (note && s.fetchedAt) note.textContent = `Live stats · updated ${ago(s.fetchedAt)}`;
  } catch { /* stats are a bonus */ }
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
        me.authenticated = false;
        me.admin = false;
        me.name = null;
        renderAuth();
        location.hash = '#/';
        route();
        break;
      case 'readonly-tick':
        toast(
          me.hasAccount ? 'Log in to mark topics done.' : 'Create your owner account to mark topics done.',
          { label: me.hasAccount ? 'Log in' : 'Sign up', run: () => { location.hash = me.hasAccount ? '#/login' : '#/signup'; } },
        );
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
        toast(`Deleted ${rm.title}`, null, 'success');
        location.hash = '#/roadmaps';
        break;
      case 'edit-profile':
        pf.editing = true;
        drawProfile();
        window.scrollTo(0, 0);
        break;
      case 'cancel-profile':
        pf.editing = false;
        drawProfile();
        break;
      case 'theme':
        toggleTheme();
        break;
      case 'tour':
        setMenu(false);
        if ((location.hash.slice(1) || '/') === '/') startTour(tourSteps());
        else { pendingTour = true; location.hash = '#/'; }
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
        toast(`Removed ${h.title}`, null, 'success');
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
        toast('Task deleted', null, 'success');
        break;
      }
      case 'link-delete': {
        const l = rs.links.find((x) => x.id === btn.dataset.link);
        if (!confirm(`Remove "${l.title}"?`)) return;
        await api('DELETE', `/links/${l.id}`);
        rs.links = rs.links.filter((x) => x.id !== l.id);
        $('#res-body').innerHTML = resourcesHtml();
        toast('Link removed', null, 'success');
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
        toast(`Deleted ${pg.title}`, null, 'success');
        location.hash = `#/${key}`;
        break;
      }
    }
  } catch (err) {
    toast(err.message, null, 'error');
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
        Object.assign(me, { authenticated: true, admin: Boolean(r.admin), name: r.name });
        renderAuth();
        toast(`Welcome back, ${r.name.split(' ')[0]}`);
        location.hash = '#/roadmaps';
        return;
      }
      case 'signup': {
        if (data.password !== data.confirm) throw new Error("The two passwords don't match");
        const r = await api('POST', '/signup', { name: data.name, username: data.username, password: data.password, setupKey: data.setupKey || undefined });
        Object.assign(me, { authenticated: true, admin: Boolean(r.admin), hasAccount: me.hasAccount || Boolean(r.admin), name: r.name });
        renderAuth();
        toast('Account created. You are logged in.', null, 'success');
        location.hash = '#/roadmaps';
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
        toast('Section added', null, 'success');
        return;
      case 'note': {
        const id = form.closest('[data-item]').dataset.item;
        Object.assign(findItem(id), await api('PATCH', `/items/${id}`, { note: data.note }));
        drawRoadmap();
        toast('Note saved', null, 'success');
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
        toast('Page saved', null, 'success');
        return;
      }
      case 'import-md': {
        const r = await api('POST', '/import/markdown', { title: data.title, markdown: data.markdown });
        toast(`Imported ${plural(r.sections.reduce((n, s) => n + s.items.length, 0), 'topic')}`);
        location.hash = `#/r/${r.id}`;
        return;
      }
      case 'profile': {
        pf.profile = await api('PUT', '/profile', readProfileForm(data));
        pf.editing = false;
        drawProfile();
        window.scrollTo(0, 0);
        toast('Profile saved', null, 'success');
        return;
      }
      case 'add-task': {
        tk.tasks.push(await api('POST', '/tasks', { title: data.title, date: data.date || null }));
        drawTasks();
        toast('Task added', null, 'success');
        $('form[data-form="add-task"] input[name="title"]')?.focus();
        return;
      }
      case 'add-habit': {
        const daysValue = data.days === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : data.days === 'weekdays' ? [1, 2, 3, 4, 5] : [Number(data.days)];
        tk.routine.habits.push(await api('POST', '/habits', { title: data.title, url: data.url || undefined, days: daysValue }));
        drawTasks();
        toast(`Added ${data.title} to your routine`, null, 'success');
        return;
      }
      case 'add-link': {
        rs.links.push(await api('POST', '/links', { title: data.title, url: data.url, category: data.category, note: data.note }));
        drawResources();
        toast('Link added', null, 'success');
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
        toast('Saved', null, 'success');
        return;
      }
      case 'new-rm': {
        const r = await api('POST', '/roadmaps', { title: data.title });
        location.hash = `#/r/${r.id}`;
        return;
      }
    }
  } catch (err) {
    toast(err.message, null, 'error');
  } finally {
    if (submit.isConnected) submit.disabled = false;
  }
});

let cachedRoadmaps = null;
loadMe().then(async () => {
  initBuddy({
    getMe: () => me,
    getRoadmaps: async () => (cachedRoadmaps ??= await api('GET', '/roadmaps').catch(() => [])),
    replayIntro: () => playIntro(true),
    startTour: () => {
      if ((location.hash.slice(1) || '/') === '/') startTour(tourSteps());
      else { pendingTour = true; location.hash = '#/'; }
    },
  });
  await route();
  setTimeout(() => checkTodayNotifications(toast), 1800);
});
