// Runs every practice / interview importer in dependency order (later ones copy questions that
// earlier ones add). Each importer only adds what is missing, so this is safe to re-run at any
// time; it never resets progress. Stops at the first failure.
// Usage: npm run import:all            (writes to the database and seed/roadmaps.json)
//        npm run import:all -- --dry   (shows what each importer would add)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dry = process.argv.includes('--dry');

// [script, extra args]
const STEPS = [
  ['build-practice.mjs', dry ? [] : ['--import']], // DSA, Python, OOPS, aptitude, JS, React, AI practice lists
  ['import-sql-questions.mjs', []], //                SQL Practice – 310 Questions (from Notion)
  ['import-js-roadmap.mjs', []], //                   JavaScript roadmap + its practice
  ['import-python-practice.mjs', []],
  ['import-sql-roadmap-practice.mjs', []], //         needs the SQL practice list
  ['import-dbms-practice.mjs', []], //                needs the SQL practice list
  ['import-os-practice.mjs', []],
  ['import-cn-practice.mjs', []],
  ['import-oops-practice.mjs', []],
  ['import-git-practice.mjs', []],
  ['import-redis-practice.mjs', []],
  ['import-system-design-practice.mjs', []],
  ['import-more-practice.mjs', []], //                copies from the DSA practice and aptitude lists
  ['import-interview-questions.mjs', []],
];

for (const [script, args] of STEPS) {
  // build-practice has no dry mode (it always rewrites seed/practice-roadmaps.json), so a dry
  // run skips it.
  if (dry && script === 'build-practice.mjs') { console.log(`\n▶ ${script} (skipped in a dry run)`); continue; }
  const extra = dry ? ['--dry'] : [];
  console.log(`\n▶ ${script}`);
  const r = spawnSync(process.execPath, [...process.execArgv, path.join(here, script), ...args, ...extra], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✖ ${script} failed (exit ${r.status}). Fix it and run again: finished steps are not repeated in effect.`);
    process.exit(r.status ?? 1);
  }
}
console.log('\n✔ All importers finished.');
