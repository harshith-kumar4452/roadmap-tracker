// Points the DBMS, OS and Computer Networks roadmaps at takeUforward's Plus video courses.
//
// The topic links came from Notion as bare lesson URLs (/learning/core-subject/<slug>). TUF answers
// 200 for any such URL, but a lesson only loads inside its course, which is chosen by the
// ?category=<section>&source=<course> query. This script adds that query (and the new slug where
// TUF renamed a lesson), using each course's syllabus as read from its page on 2026-11-28:
//   https://takeuforward.org/prep-hub/computer-networks-by-striver   (144 lessons)
//   https://takeuforward.org/prep-hub/operating-system-by-striver     (156 lessons)
//   https://takeuforward.org/prep-hub/dbms-databases-and-sql-explained-deeply (lessons + SQL problems)
// DBMS theory topics that TUF dropped from the course point to the matching TUF blog article.
//
// Topics are matched by id, so progress and notes are untouched. Safe to re-run.
// Usage: node --env-file=.env scripts/fix-tuf-links.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TUF = 'https://takeuforward.org';

// For each roadmap: the course key, its sections (category slugs), and one section index per
// TUF topic in roadmap order (CN/OS: one base-36 digit each; DBMS: two decimal digits each, -- = none).
const COURSES = {
  'Computer Networks Roadmap (takeUforward)': {
    source: 'computer-networks-by-striver',
    cats: ['module-14-network-performance', 'module-13-wireless-networking', 'module-12-cryptography-and-secure-protocols', 'module-11-network-security', 'module-10-switching-techniques', 'module-9-nat-and-internet-edge-networking', 'module-8-application-layer', 'module-7-transport-layer', 'module-6-network-layer-routing', 'module-5-network-layer-ip-addressing', 'module-4-network-topologies-and-vlans', 'module-3-physical-and-data-link-layer', 'module-2-network-models', 'module-1-cn-foundations'],
    code: 'dddddccccccbbbbbbbbbbbbbbaaaaaaa999999999999888888888777777766666666666' + '5' + '555555555444444444444333333333222222222222222111111111100000000000000000',
    width: 1,
    renames: { 'nat-and-why-do-we-need-it': 'nat-and-why-we-need-it' },
  },
  'Operating Systems Roadmap (takeUforward)': {
    source: 'operating-system-by-striver',
    cats: ['module-14-os-security-virtualization-containers-and-interview-revision', 'module-13-storage-management-disk-scheduling-and-io-systems', 'module-12-file-system-in-operating-system', 'module-11-page-replacement-algorithms-and-thrashing', 'module-10-paging-and-virtual-memory-in-operating-system', 'module-9-memory-management-in-operating-system', 'module-8-system-calls-and-inter-process-communication', 'module-7-deadlock-starvation-and-concurrency-bugs', 'module-6-process-synchronization-and-concurrency-control', 'module-5-threads-and-multithreading-in-operating-system', 'module-4-kernel-os-structures-and-advanced-scheduling', 'module-3-cpu-scheduling-algorithms-in-operating-system', 'module-2-process-management-in-operating-system', 'module-1-operating-system-basics-and-os-introduction'],
    code: 'dddddccccbbbbbbbbbbbaaaaaaa999999999988888888888888888777777777777666666666666666555555555544444444444433333333322222222222222111111111111111110000000000000',
    width: 1,
    renames: {},
  },
  'DBMS Roadmap (takeUforward)': {
    source: 'dbms-databases-and-sql-explained-deeply',
    cats: ['crash-recovery-and-durability', 'transaction-correctness-and-concurrency', 'transactions-and-access-control', 'views-database-side-logic-and-safe-sql', 'query-performance', 'storage-and-query-execution-missing-foundations', 'data-storage-keys-and-query-optimization', 'data-modification-and-schema-evolution', 'relational-algebra', 'problem-level-1-window-functions', 'breakdown-of-sql-window-functions', 'mastering-window-functions', 'problem-level-1-dates-functions-and-filtering', 'conceptual-breakdown-of-date-and-time', 'working-with-dates', 'problems-level-1-ctes-and-temporary-tables', 'conceptual-breakdown-of-ctes', 'working-with-ctes', 'problems-level-1-string-functions', 'string--pattern-mechanics', 'text--strings', 'problems-level-1-case-conditional-logic', 'boolean-and-branching-logic', 'logic--conditions', 'problems-level-1-numeric-and-null-functions', 'numeric-and-null-logic', 'scalar--conditional-functions', 'subqueries', 'sql-joins', 'set-operations', 'aggregation-and-analysis', 'querying-essentials', 'er-modeling-and-formal-database-design', 'database-design', 'dbms-abstraction-and-relational-foundations', 'core-foundations', 'getting-started'],
    code: '3636363636--3434----353535353535353535353535--------333333333333333333--0808--0303------------31313131313131313131313131313131313131303030303030303030303030303029292929292929292928282828282828282828282828282828282828282828282828282828282828282828282727272727272727272727272727272727272727272727272707070707070707070707--0505----060606060605050505040404040402020202020202020202020101010101010101--0000----------------------32------32--',
    width: 2,
    // Lessons TUF merged or renamed in the current course.
    renames: {
      'data-abstraction-schemas-instances-and-data-independence': 'abstraction-schemas-and-data-independence',
      'dbms-components-and-end-to-end-query-flow': 'dbms-components-and-formal-relational-vocabulary',
      'fundamental-relational-algebra': 'core-relational-operations',
      'joins-and-extended-relational-algebra': 'joins-division-and-equivalent-expressions',
      'triggers-stored-routines-and-database-side-logic': 'triggers-functions-and-procedures',
      'file-organization': 'file-organization-and-index-comparisons',
      'index-classification-and-design': 'file-organization-and-index-comparisons',
      'from-sql-to-an-executable-plan': 'how-the-optimizer-chooses-a-plan',
      'cost-based-query-optimization': 'how-the-optimizer-chooses-a-plan',
      'algorithms-for-selection-projection-sorting-and-aggregation': 'how-joins-and-aggregates-execute',
      'join-processing-algorithms': 'how-joins-and-aggregates-execute',
      'schedules-and-concurrency-anomalies': 'transaction-states-boundaries-schedules-and-anomalies',
      'transaction-concepts-acid-and-states': 'transaction-states-boundaries-schedules-and-anomalies',
      'conflict-and-view-serializability': 'serializability',
      'lock-based-protocols-and-two-phase-locking': 'locks-two-phase-locking-and-deadlock-reasoning',
      'deadlock-handling': 'locks-two-phase-locking-and-deadlock-reasoning',
      'timestamp-ordering-optimistic-control-and-mvcc': 'optimistic-versus-pessimistic-concurrency',
      'sql-isolation-levels': 'isolation-levels-and-mvcc',
      'log-based-recovery-and-write-ahead-logging': 'wal-undo-and-redo-through-a-crash',
      'checkpoints-and-aries-intuition': 'checkpoints-and-recovery-boundaries',
      'schema-design-capstone': 'design-based-on-requirements',
      'interview-depth-by-candidate-level': 'interview-exercise',
    },
    // Not in the current course: the TUF blog article on the same topic.
    fallback: {
      'file-systems-vs-database-management-systems': '/blogs/database-management-system/file-system-vs-dbms-key-differences-and-examples',
      'database-users-roles-and-deployment-architectures': '/blogs/database-management-system/database-users-roles-deployment-architectures',
      'data-models-and-database-families': '/blogs/database-management-system/data-models-and-database-families-in-dbms',
      'entities-entity-sets-and-attributes': '/blogs/database-management-system/entities-entity-sets-and-attributes',
      'relationships-and-structural-constraints': '/blogs/database-management-system/relationships-and-structural-constraints',
      'weak-entities-and-enhanced-er-modeling': '/blogs/database-management-system/weak-entities-and-enhanced-er-modeling',
      'er-eer-to-relational-mapping': '/blogs/database-management-system/er-eer-to-relational-mapping',
      'formal-relational-model-and-integrity-constraints': '/blogs/database-management-system/formal-relational-model-and-integrity-constraints',
      'tuple-and-domain-relational-calculus': '/blogs/database-management-system/tuple-and-domain-relational-calculus',
      'redundancy-and-update-anomalies': '/blogs/database-management-system/redundancy-and-update-anomalies',
      'functional-dependencies-and-keys': '/blogs/database-management-system/functional-dependencies-and-keys',
      'armstrong-s-axioms-attribute-closure-and-minimal-cover': '/blogs/database-management-system/armstrongs-axioms-attribute-closure-and-minimal-cover-in-dbms',
      'first-second-third-and-boyce-codd-normal-forms': '/blogs/database-management-system/first-second-third-and-boycecodd-normal-forms-in-dbms',
      'decomposition-quality-and-normalization-algorithms': '/blogs/database-management-system/decomposition-quality-and-normalization-algorithms-in-dbms',
      'multivalued-dependencies-4nf-join-dependencies-and-5nf': '/blogs/database-management-system/multivalued-dependencies-4nf-join-dependencies-and-5nf-in-dbms',
      'storage-hierarchy-pages-records-and-buffers': '/blogs/database-management-system/storage-hierarchy-pages-records-and-buffers-in-dbms',
      'b-trees-and-b-plus-trees': '/blogs/database-management-system/b-trees-and-b-plus-trees',
      'static-and-dynamic-hashing': '/blogs/database-management-system/static-and-dynamic-hashing',
      'failures-storage-and-recovery-goals': '/blogs/database-management-system/database-recovery-in-dbms-failures-storage-and-goals',
      'shadow-paging-backup-and-point-in-time-recovery': '/blogs/database-management-system/shadow-paging-backup-and-point-in-time-recovery-in-dbms',
      'declarative-integrity-beyond-keys': '/blogs/database-management-system/declarative-integrity-beyond-keys-in-sql',
      'authorization-views-and-auditing': '/blogs/database-management-system/database-security-authorization-views-and-auditing-in-dbms',
      'database-security-threats-and-protection': '/blogs/database-management-system/database-security-common-threats-and-protection-in-dbms',
      'metadata-statistics-maintenance-and-observability': '/blogs/database-management-system/database-metadata-statistics-maintenance-and-observability',
      'distributed-database-foundations': '/blogs/database-management-system/distributed-database-foundations',
      'partitioning-sharding-and-distributed-ids': '/blogs/database-management-system/partitioning-sharding-and-distributed-ids',
      'replication-consistency-and-cap-pacelc': '/blogs/database-management-system/replication-consistency-and-cappacelc',
      'distributed-transactions-and-coordination': '/blogs/database-management-system/distributed-transactions-and-coordination',
      'nosql-data-models-and-sql-vs-nosql-decisions': '/blogs/database-management-system/nosql-data-models-and-sql-vs-nosql-decisions',
      'oltp-olap-warehousing-and-columnar-storage': '/blogs/database-management-system/oltp-olap-warehousing-and-columnar-storage',
      'storage-and-query-plan-lab': '/blogs/database-management-system/storage-and-query-plan-lab',
      'concurrency-and-recovery-lab': '/blogs/database-management-system/concurrency-and-recovery-lab',
      'gate-and-semester-problem-track': '/prep-hub/dbms-databases-and-sql-explained-deeply',
      'final-coverage-and-source-alignment': '/prep-hub/dbms-databases-and-sql-explained-deeply',
    },
  },
};

const LINK = /^https:\/\/takeuforward\.org\/(learning|practice)\/core-subject\/([^/?#]+)/;

// The new URL for every TUF topic of a roadmap document, keyed by item id.
export function planFor(doc) {
  const c = COURSES[doc.title];
  if (!c) return new Map();
  // Topics already moved to a fallback page keep their place in the order, so re-runs line up.
  const fallbackUrls = new Set(Object.values(c.fallback || {}).map((p) => TUF + p));
  const items = doc.sections.flatMap((s) => s.items).filter((it) => LINK.test(it.url || '') || fallbackUrls.has(it.url));
  if (items.length * c.width !== c.code.length) throw new Error(`${doc.title}: ${items.length} TUF topics, expected ${c.code.length / c.width}. Re-read the course before running.`);
  const out = new Map();
  items.forEach((it, i) => {
    if (fallbackUrls.has(it.url)) return; // already done
    const [, kind, raw] = LINK.exec(it.url);
    const slug = c.renames[raw] || raw;
    const cell = c.code.slice(i * c.width, (i + 1) * c.width);
    if (/^-+$/.test(cell)) {
      const fb = c.fallback?.[raw];
      if (fb) out.set(it.id, TUF + fb);
      return; // practice problems with no section stay as they are (they already open)
    }
    const cat = c.cats[parseInt(cell, c.width === 1 ? 36 : 10)];
    if (!cat) throw new Error(`${doc.title}: bad section code "${cell}" at topic ${i + 1}`);
    out.set(it.id, `${TUF}/${kind}/core-subject/${slug}?category=${cat}&source=${c.source}`);
  });
  return out;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const seedPath = path.join(root, 'seed', 'roadmaps.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  let seedChanged = 0;
  for (const doc of seed) {
    for (const [id, url] of planFor(doc)) {
      for (const s of doc.sections) for (const it of s.items) if (it.id === id && it.url !== url) { it.url = url; seedChanged++; }
    }
  }
  console.log(`seed: ${seedChanged} links to update`);
  if (!dry && seedChanged) fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

  if (!process.env.MONGODB_URI) { console.log('MONGODB_URI not set: database skipped'); return; }
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  try {
    const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
    for (const title of Object.keys(COURSES)) {
      const doc = await col.findOne({ title });
      if (!doc) { console.log(`database: "${title}" not found`); continue; }
      const plan = planFor(doc);
      // One targeted update per topic (only its url), so a tick made meanwhile is never overwritten.
      const ops = [];
      for (const s of doc.sections) for (const it of s.items) {
        const url = plan.get(it.id);
        if (url && it.url !== url) ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { 'sections.$[].items.$[i].url': url } }, arrayFilters: [{ 'i.id': it.id }] } });
      }
      const n = ops.length;
      if (!dry && n) await col.bulkWrite(ops, { ordered: false });
      console.log(`database: ${title}: ${n} links ${dry ? 'would change' : 'updated'}`);
    }
  } finally {
    await client.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
