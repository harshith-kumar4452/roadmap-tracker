// Roadmap helpers (ported from the old public/app.js): question links laid out like the TUF sheet,
// sub-topic grouping, job roles, subject bundles and activity streaks.
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import DnsOutlined from '@mui/icons-material/DnsOutlined';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import WebOutlined from '@mui/icons-material/WebOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import MemoryOutlined from '@mui/icons-material/MemoryOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import { isoDay, addDays } from './hooks.js';

export const STATUS = {
  not_started: { label: 'Not started', next: 'in_progress' },
  in_progress: { label: 'In progress', next: 'done' },
  done: { label: 'Done', next: 'not_started' },
};
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
export const nextLevel = (l) => (l === '' || !l ? 'Beginner' : l === 'Beginner' ? 'Intermediate' : l === 'Intermediate' ? 'Advanced' : '');
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);

export const JOB_ROLES = [
  { id: 'sde', label: 'SDE', icon: CodeOutlined, desc: 'DSA, Core Subjects (OS & CN), Databases (DBMS & SQL), System Design (OOPS, LLD, HLD), and Git.', match: /dsa|operating systems|computer networks|dbms|\bsql\b|system design|hld|lld|arpit|oops|git/i },
  { id: 'backend', label: 'Backend Engineer', icon: DnsOutlined, desc: 'Backend engineering, Databases (DBMS & SQL), Redis, Kafka, Microservices, System Design, and Python.', match: /backend|node\.js|javascript|microservices|kafka|redis|dbms|\bsql\b|system design|hld|arpit|python|git/i },
  { id: 'data_engineer', label: 'Data Engineer', icon: StorageOutlined, desc: 'Python, Databases (DBMS & SQL), Kafka streaming, Cloud (AWS), and Backend pipelines.', match: /python|dbms|\bsql\b|kafka|cloud|aws|backend/i },
  { id: 'data_analyst', label: 'Data Analyst', icon: AnalyticsOutlined, desc: 'Power BI, SQL & Databases, Python, and Aptitude for analytics.', match: /power bi|\bsql\b|dbms|python|aptitude/i },
  { id: 'ai_engineer', label: 'AI Engineer', icon: PsychologyOutlined, desc: 'Machine Learning, Python, Databases (DBMS & SQL), and Cloud (AWS).', match: /\bml\b|\bai\b|python|dbms|\bsql\b|cloud|aws/i },
  { id: 'frontend', label: 'Frontend / Full Stack', icon: WebOutlined, desc: 'Web Development (JavaScript, React & Backend), Databases, and Git.', match: /react|javascript|backend|node\.js|\bsql\b|git/i },
  { id: 'aptitude', label: 'Placement / GATE', icon: SchoolOutlined, desc: 'Aptitude Roadmaps, DSA, GATE CS 2027, and Core Subjects.', match: /aptitude|gate|dsa|operating systems|computer networks/i },
];

export const ROADMAP_GROUPS = [
  { slug: 'core-subjects', title: 'Core Subjects', desc: 'Operating Systems and Computer Networks fundamentals.', icon: MemoryOutlined, match: /operating systems|computer networks/i },
  { slug: 'databases', title: 'Databases (DBMS & SQL)', desc: 'Database management systems, normalization, indexing, and SQL.', icon: StorageOutlined, match: /dbms|\bsql\b/i },
  { slug: 'web-development', title: 'Web Development', desc: 'Frontend (React) and Backend engineering (Node.js, APIs, projects).', icon: WebOutlined, match: /backend|react|javascript/i },
  { slug: 'system-design', title: 'System Design', desc: 'OOPS, Low-Level Design (LLD), High-Level Design (HLD), and architecture projects.', icon: HubOutlined, match: /system design|hld|lld|arpit|oops/i },
  { slug: 'aptitude', title: 'Aptitude Roadmaps', desc: 'Quantitative, logical, verbal, and full aptitude preparation.', icon: SchoolOutlined, match: /aptitude/i },
  { slug: 'redis', title: 'Redis Roadmaps', desc: 'Redis fundamentals and Redis internals.', icon: BoltOutlined, match: /^redis\b/i },
];

export function bundleRoadmaps(list) {
  const buckets = new Map();
  const out = [];
  for (const r of list) {
    const grp = ROADMAP_GROUPS.find((g) => g.match.test(r.title));
    if (!grp) { out.push(r); continue; }
    let b = buckets.get(grp.slug);
    if (!b) {
      b = { isGroup: true, slug: grp.slug, title: grp.title, desc: grp.desc, icon: grp.icon, items: [], done: 0, total: 0, inProgress: 0, lastDoneAt: null, searchText: grp.title.toLowerCase() };
      buckets.set(grp.slug, b);
      out.push(b);
    }
    b.items.push(r);
    b.done += r.done;
    b.total += r.total;
    b.inProgress += r.inProgress || 0;
    b.searchText += ` ${r.title.toLowerCase()}`;
    if (r.lastDoneAt && (!b.lastDoneAt || r.lastDoneAt > b.lastDoneAt)) b.lastDoneAt = r.lastDoneAt;
  }
  return out.map((e) => (e.isGroup && e.items.length === 1 ? e.items[0] : e));
}

export const rolesFor = (r) => {
  const text = r.isGroup ? r.items.map((i) => i.title).join(' ') : r.title;
  return JOB_ROLES.filter((role) => role.match.test(text));
};

export const rmStatus = (r) => (r.total > 0 && r.done === r.total ? 'done' : r.done > 0 || r.inProgress > 0 ? 'in_progress' : 'not_started');

export const SORTERS = {
  recent: (a, b) => (b.lastDoneAt || '').localeCompare(a.lastDoneAt || '') || b.done / (b.total || 1) - a.done / (a.total || 1),
  progress: (a, b) => b.done / (b.total || 1) - a.done / (a.total || 1),
  least: (a, b) => a.done / (a.total || 1) - b.done / (b.total || 1),
  name: (a, b) => a.title.localeCompare(b.title),
};

export function activity(doneAt) {
  const counts = new Map();
  for (const iso of doneAt) {
    const k = isoDay(new Date(iso));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const today = isoDay();
  let week = 0;
  for (let i = 0; i < 7; i++) week += counts.get(addDays(today, -i)) ?? 0;
  let cursor = counts.get(today) ? today : addDays(today, -1);
  let streak = 0;
  while (counts.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
  return { counts, today: counts.get(today) ?? 0, week, streak };
}

export function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------- question links ----------
const SITES = [
  [/leetcode\.com/, 'LeetCode'], [/takeuforward\.org\/(practice|plus|quiz|mock-test)/, 'TUF'], [/hackerrank\.com/, 'HackerRank'],
  [/codechef\.com/, 'CodeChef'], [/geeksforgeeks\.org/, 'GFG'], [/datalemur\.com/, 'DataLemur'], [/codingninjas|naukri\.com\/code360/, 'Code360'],
  [/exercism\.org/, 'Exercism'], [/github\.com\/donnemartin\/system-design-primer/, 'SD Primer'],
  [/learngitbranching\.js\.org\/\?/, 'Learn Git Branching'], [/gitexercises\.fracz\.com\/exercise/, 'Git Exercises'], [/github\.com\/skills\//, 'GitHub Skills'],
  [/app\.codecrafters\.io\/courses\//, 'CodeCrafters'],
  [/roadmap\.sh\/projects\//, 'roadmap.sh'], [/kaggle\.com\/(learn|competitions)\//, 'Kaggle'], [/learn\.microsoft\.com\/[^/]+\/training\//, 'Microsoft Learn'],
];
const siteOf = (url) => SITES.find(([re]) => re.test(url))?.[1];

export const SITE_ORDER = ['TUF', 'LeetCode', 'GFG', 'HackerRank', 'CodeChef', 'Exercism', 'SD Primer', 'Learn Git Branching', 'Git Exercises', 'GitHub Skills', 'CodeCrafters', 'roadmap.sh', 'Kaggle', 'Microsoft Learn', 'DataLemur', 'Code360'];
export const SITE_SHORT = { TUF: 'TUF', LeetCode: 'LC', GFG: 'GFG', HackerRank: 'HR', CodeChef: 'CC', Exercism: 'EX', 'SD Primer': 'SDP', 'Learn Git Branching': 'LGB', 'Git Exercises': 'GX', 'GitHub Skills': 'GH', CodeCrafters: 'CCR', 'roadmap.sh': 'RS', Kaggle: 'KG', 'Microsoft Learn': 'MS', DataLemur: 'DL', Code360: 'C360' };
// Brand-ish badge colours (text, background) for each site, light / dark.
export const SITE_COLORS = {
  TUF: ['#c62828', '#fdecea'], LeetCode: ['#b26a00', '#fff4e0'], GFG: ['#2e7d32', '#e8f5e9'], HackerRank: ['#1b7a3c', '#e6f6ec'],
  CodeChef: ['#6d4c41', '#f3ece9'], Exercism: ['#5b3cc4', '#efeafd'], 'SD Primer': ['#37474f', '#eceff1'], 'Learn Git Branching': ['#d84315', '#fbe9e7'],
  'Git Exercises': ['#ad1457', '#fce4ec'], 'GitHub Skills': ['#24292f', '#eef0f2'], CodeCrafters: ['#0d47a1', '#e3f0fd'], 'roadmap.sh': ['#3c3c3c', '#f1f1f1'],
  Kaggle: ['#0277bd', '#e1f3fc'], 'Microsoft Learn': ['#0067b8', '#e5f1fb'], DataLemur: ['#283593', '#e8eaf6'], Code360: ['#e65100', '#fff3e0'],
};

export function itemLinks(i) {
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

export const slotKey = (l) => (l.kind === 'practice' ? `p:${l.site}` : l.kind);
const slotRank = (k) => (k.startsWith('p:') ? (SITE_ORDER.indexOf(k.slice(2)) + 1 || 50) : k === 'article' ? 100 : 101);
export function groupSlots(items) {
  const keys = new Set(items.flatMap((i) => itemLinks(i).map(slotKey)));
  return [...keys].sort((a, b) => slotRank(a) - slotRank(b));
}

// ---------- notes and sub-topics ----------
export const noteText = (n) => (n || '').replace(/\s*·?\s*Also on \w+: https?:\/\/\S+/g, '').trim();
export const answerOf = (note) => /^Interview · Answer: (.+)$/s.exec(note || '')?.[1] ?? '';
export const IMPORT_NOTE = /^(LeetCode #|HackerRank\b|CodeChef\b|takeUforward A2Z|Source:|Practice( › [^·]+)? · |Interview · )/;
const prettySub = (s) => s
  .replace(/^faqs\s*(hard|medium|dll)?$/i, (_, k) => (k ? `FAQs (${k.toLowerCase() === 'dll' ? 'DLL' : k[0].toUpperCase() + k.slice(1).toLowerCase()})` : 'FAQs'))
  .replace(/^triessubc$/i, 'Tries')
  .replace(/\b(1d|2d|dp|lis|mcm|ll|dll|bst|bt|ii)\b/gi, (m) => m.toUpperCase())
  .replace(/\beratosthenes\b/i, 'Eratosthenes')
  .replace(/^On answers$/i, 'On answers (binary search)');
export const subTopicOf = (i) => {
  const note = noteText(i.note);
  if (note.startsWith('Interview · ')) return 'Interview questions';
  const practice = /^Practice(?: › ([^·]+?))? · /.exec(note);
  if (practice) return practice[1] ? `Practice: ${practice[1]}` : 'Practice';
  return prettySub(/^takeUforward A2Z · (.+)$/.exec(note)?.[1] ?? '');
};
export const metaOf = (i) => {
  const note = noteText(i.note);
  if (!IMPORT_NOTE.test(note)) return { meta: '', own: note };
  return { meta: note.replace(/^takeUforward A2Z · .*$/, '').replace(/^Practice(?: › [^·]+)? · /, '').replace(/^Interview · .*$/, ''), own: '' };
};
export const isPracticeTitle = (t) => /practice/i.test(t || '');
const DIFFICULTY = { Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' };
export const levelLabel = (l, practice) => (practice ? DIFFICULTY[l] ?? l : l);
export const LEVEL_COLOR = { Beginner: 'success', Intermediate: 'warning', Advanced: 'error' };
