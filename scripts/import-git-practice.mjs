// Adds practice to each phase of the "Git Roadmap". TUF has no Git course, so practice comes from:
//   Learn Git Branching - single levels (learngitbranching.js.org/?level=intro1 ...), names read
//                         from the level files in its GitHub repo
//   Git Exercises       - exercises at gitexercises.fracz.com, checked against the exercise
//                         branches of its GitHub repo (the site answers 200 for any path)
//   GitHub Skills       - hands-on courses (github.com/skills/...), checked with the GitHub API
// Added by URL: re-running adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-git-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'Git Roadmap';
const LGB_RAW = 'https://raw.githubusercontent.com/pcottle/learnGitBranching/main/src/levels';

// Section -> [site, id, level, what it practises]
const B = 'Beginner', I = 'Intermediate', A = 'Advanced';
const PRACTICE = {
  'Phase 1: Fundamentals': [
    ['lgb', 'intro1', B, 'making commits'], ['lgb', 'move3', B, 'the staging area'],
    ['gx', 'master', B, 'getting started'], ['gx', 'commit-one-file', B, 'committing part of your changes'],
    ['gx', 'commit-one-file-staged', B, 'unstaging a file'], ['gx', 'ignore-them', B, '.gitignore'], ['gx', 'remove-ignored', I, 'untracking an ignored file'],
    ['skills', 'introduction-to-github', B, 'branches, commits and a first pull request on GitHub'],
  ],
  'Phase 2: Branching and merging': [
    ['lgb', 'intro2', B, 'branches'], ['lgb', 'intro3', B, 'merging'], ['lgb', 'intro4', I, 'rebasing'],
    ['lgb', 'rampup1', I, 'detaching HEAD'], ['lgb', 'rampup2', I, 'relative refs (^)'], ['lgb', 'rampup3', I, 'relative refs (~)'],
    ['lgb', 'move1', I, 'cherry-pick'], ['lgb', 'move2', A, 'interactive rebase'],
    ['gx', 'chase-branch', I, 'fast-forwarding a branch'], ['gx', 'merge-conflict', I, 'resolving a merge conflict'],
    ['gx', 'change-branch-history', I, 'rebasing a branch'], ['gx', 'pick-your-features', I, 'cherry-picking commits'], ['gx', 'rebase-complex', A, 'rebase --onto'],
    ['skills', 'resolve-merge-conflicts', I, 'resolving a merge conflict on GitHub'],
  ],
  'Phase 3: Remote repositories and collaboration': [
    ['lgb', 'remote1', I, 'git clone'], ['lgb', 'remote2', I, 'remote branches'], ['lgb', 'remote3', I, 'git fetch'], ['lgb', 'remote4', I, 'git pull'],
    ['lgb', 'remote5', I, 'simulating teammates'], ['lgb', 'remote6', I, 'git push'], ['lgb', 'remote7', A, 'diverged history'], ['lgb', 'remote8', A, 'a locked main branch'],
    ['skills', 'review-pull-requests', I, 'reviewing a pull request'], ['skills', 'release-based-workflow', A, 'release branches and tags'],
  ],
  'Not covered in the playlist': [
    ['gx', 'save-your-work', I, 'git stash'], ['gx', 'fix-typo', I, 'amending the last commit'], ['lgb', 'rampup4', I, 'reset vs revert'],
    ['gx', 'commit-lost', I, 'recovering a commit with the reflog'], ['lgb', 'mixed4', I, 'tags'],
    ['gx', 'too-many-commits', I, 'squashing commits'], ['gx', 'fix-old-typo', A, 'editing an old commit with interactive rebase'],
    ['gx', 'split-commit', A, 'splitting a commit'], ['gx', 'find-bug', A, 'git bisect'],
  ],
};
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];
const humanize = (s) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

async function lookup() {
  // Learn Git Branching: level id = sequence name + 1-based position, as the site uses it.
  const index = await fetch(`${LGB_RAW}/index.js`).then((r) => r.text());
  const block = /levelFiles = exports\.levelFiles = \{([\s\S]*?)\n\};/.exec(index)?.[1] ?? '';
  const lgb = new Map();
  for (const [, seq, list] of block.matchAll(/(\w+): \[([^\]]*)\]/g)) {
    [...list.matchAll(/'\.\/([^']+)'/g)].forEach((m, k) => lgb.set(`${seq}${k + 1}`, m[1]));
  }
  // Git Exercises: one branch per exercise in its repo.
  const gx = new Set((await fetch('https://api.github.com/repos/fracz/git-exercises/branches?per_page=100').then((r) => r.json())).map((b) => b.name));
  const found = new Map();
  for (const [site, key] of Object.values(PRACTICE).flat()) {
    const k = `${site}:${key}`;
    if (found.has(k)) continue;
    if (site === 'lgb' && lgb.has(key)) {
      const src = await fetch(`${LGB_RAW}/${lgb.get(key)}.js`).then((r) => (r.ok ? r.text() : ''));
      // Level files write the keys with or without quotes ("name": / name:).
      const name = /"?name"?:\s*\{[^}]*?"?en_US"?:\s*"([^"]+)"/.exec(src)?.[1];
      if (name) found.set(k, { title: name, url: `https://learngitbranching.js.org/?locale=en_US&level=${key}`, src: 'Learn Git Branching' });
    } else if (site === 'gx' && gx.has(key)) {
      found.set(k, { title: key === 'master' ? 'Getting started (master)' : humanize(key), url: `https://gitexercises.fracz.com/exercise/${key}`, src: 'Git Exercises' });
    } else if (site === 'skills') {
      const r = await fetch(`https://api.github.com/repos/skills/${key}`);
      if (r.ok) found.set(k, { title: humanize(key).replace(/github/i, 'GitHub'), url: `https://github.com/skills/${key}`, src: 'GitHub Skills' });
    }
    if (!found.has(k)) console.warn(`  ${site} "${key}" not found, skipped`);
  }
  return found;
}

const found = await lookup();
const plan = Object.fromEntries(Object.entries(PRACTICE).map(([section, list]) => [section, list
  .filter(([s, k]) => found.has(`${s}:${k}`))
  .map(([s, k, level, why]) => { const f = found.get(`${s}:${k}`); return { title: f.title, url: f.url, level, note: `Practice · ${f.src} · ${why}` }; })
  .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level))]));
const total = Object.values(plan).reduce((n, l) => n + l.length, 0);
console.log(`Practice: ${total} (${Object.entries(plan).map(([s, l]) => `${s.split(':')[0]} ${l.length}`).join(', ')})`);
if (DRY) process.exit(0);

function apply(sections) {
  let added = 0;
  for (const [title, items] of Object.entries(plan)) {
    const s = sections.find((x) => x.title === title);
    if (!s) { console.warn(`  section "${title}" not found, skipped`); continue; }
    const have = new Set(s.items.map((i) => i.url));
    const fresh = items.filter((i) => !have.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
    s.items.push(...fresh);
    added += fresh.length;
  }
  return added;
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const doc = await col.findOne({ title: TITLE });
if (!doc) throw new Error(`${TITLE} not found in the database`);
const addedDb = apply(doc.sections);
if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
console.log(`Database: added ${addedDb} practice questions`);
await client.close();

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const entry = seed.find((r) => r.title === TITLE);
if (entry) {
  const addedSeed = apply(entry.sections);
  fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
  console.log(`seed/roadmaps.json: added ${addedSeed} practice questions`);
}
