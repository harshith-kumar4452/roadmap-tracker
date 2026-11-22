// One-off: converts the old local SQLite database (data/tracker.db) into seed/roadmaps.json,
// adding the Notion page details from notion-pages.mjs.
// Usage: node --disable-warning=ExperimentalWarning scripts/export-sqlite.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import pages from './notion-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'data', 'tracker.db'), { readOnly: true });
const id = () => randomBytes(6).toString('base64url');

const LEVEL = /\b(Beginner|Intermediate|Advanced)\b/i;
const levelFrom = (s) => {
  const m = s.match(LEVEL);
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : '';
};
const toIso = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toISOString() : null);

const roadmaps = db.prepare('SELECT * FROM roadmaps ORDER BY title COLLATE NOCASE').all();
const out = roadmaps.map((r, position) => {
  const page = pages[r.title] ?? {};
  const notes = [];
  const resources = [...(page.resources ?? [])];
  const sections = [];

  for (const s of db.prepare('SELECT * FROM sections WHERE roadmap_id = ? ORDER BY position, id').all(r.id)) {
    const items = db.prepare('SELECT * FROM items WHERE section_id = ? ORDER BY position, id').all(s.id);
    if ((page.toNotes ?? []).some((p) => s.title.startsWith(p))) {
      notes.push({ heading: s.title, lines: items.map((i) => i.title) });
      continue;
    }
    if ((page.toResources ?? []).some((p) => s.title.startsWith(p))) {
      resources.push(...items.map((i) => ({ title: i.title, url: i.url })));
      continue;
    }
    const firstNum = (t) => Number(t.match(/\d+/)?.[0]);
    const byRule = (rules, t) => rules?.find(([max]) => firstNum(t) <= max)?.[1] ?? '';
    const sectionLevel = byRule(page.levelBySection, s.title) || levelFrom(s.title);
    const itemLevel = (t) => (page.levelByItem && /^\d/.test(t) ? byRule(page.levelByItem, t) : '');
    sections.push({
      id: id(),
      title: s.title,
      items: items.map((i) => ({
        id: id(),
        title: i.title,
        url: i.url,
        level: itemLevel(i.title) || levelFrom(i.title) || sectionLevel,
        status: i.done ? 'done' : 'not_started',
        doneAt: i.done ? toIso(i.done_at) : null,
        note: i.note,
      })),
    });
  }

  return {
    id: id(),
    title: r.title,
    intro: page.intro ?? r.description ?? '',
    notionUrl: page.notionUrl ?? r.notion_url ?? null,
    resources,
    notes: [...notes, ...(page.notes ?? [])],
    position,
    sections,
  };
});

const missing = Object.keys(pages).filter((t) => !roadmaps.some((r) => r.title === t));
if (missing.length) console.warn('No roadmap matched these notion-pages entries:', missing);

fs.mkdirSync(path.join(root, 'seed'), { recursive: true });
fs.writeFileSync(path.join(root, 'seed', 'roadmaps.json'), JSON.stringify(out, null, 1) + '\n');
const topics = out.reduce((n, r) => n + r.sections.reduce((m, s) => m + s.items.length, 0), 0);
console.log(`Wrote seed/roadmaps.json: ${out.length} roadmaps, ${topics} topics`);
