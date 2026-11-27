// Adds practice to the roadmaps that still had none. TUF first, other sites where TUF has nothing:
//   copy / a2z / tufset - questions already in your roadmaps (TUF A2Z questions, TUF aptitude
//            practice sets, TUF quizzes, LeetCode picks...), copied with their links so they sync
//   rs     - roadmap.sh project briefs (page title checked; unknown projects return 404)
//   kg     - Kaggle Learn courses and competitions (unknown pages return 404)
//   ms     - Microsoft Learn learning paths (checked against Microsoft Learn's public catalog)
//   kafka  - CodeCrafters "Build your own Kafka" parts, read from its public course definition
// Roadmaps grouped by lesson (DSA, Aptitude, GATE) note the lesson: "Practice › Arrays · ...".
// Added by URL: re-running adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-more-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'Beginner', I = 'Intermediate', A = 'Advanced';
const Q = 'Quantitative Aptitude Roadmap', L = 'Logical Aptitude Roadmap', V = 'Verbal Aptitude Roadmap';
const LC = (slug) => ['copy', `https://leetcode.com/problems/${slug}/`];
const PRIMER = (slug) => ['copy', `https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/${slug}/README.md`];
const DBMS_QUIZ = (n) => ['copy', `https://takeuforward.org/quiz/core-subject/${n}`];
const set1 = (rm, chapter) => ['tufset', rm, chapter, rm === V ? 'Practice Set 1' : 'Practice Set 1 (Basic)'];
const set2 = (rm, chapter) => ['tufset', rm, chapter, rm === V ? 'Practice Set 2' : 'Practice Set 2 (Amateur)'];

// { roadmap: { byLesson, practice: { section-or-lesson: [ref, ...] } } }
const PLAN = {
  'DSA Roadmap (Striver A2Z)': { byLesson: true, practice: {
    'Learn the Basics (83 problems)': [['a2z', 'Learn the Basics', /^(?!.*hashing)/i]],
    'Sorting Techniques (7 problems)': [['a2z', 'Sorting']],
    'Arrays (32 problems)': [['a2z', 'Arrays']],
    'Hashing (6 problems)': [['a2z', 'Learn the Basics', /hashing/i]],
    'Binary Search (32 problems)': [['a2z', 'Binary Search']],
    'Strings - Basic & Medium (7 problems)': [['a2z', 'Strings']],
    'Recursion (22 problems)': [['a2z', 'Recursion & Backtracking']],
    'Linked List - Singly, Doubly & Basics (25 problems)': [['a2z', 'Linked List', /fundamentals/i]],
    'Linked List - Medium & Hard (24 problems)': [['a2z', 'Linked List', /^(?!.*fundamentals)/i]],
    'Bit Manipulation (14 problems)': [['a2z', 'Bit Manipulation']],
    'Greedy Algorithms (14 problems)': [['a2z', 'Greedy']],
    'Sliding Window & Two Pointer (13 problems)': [['a2z', 'Sliding Window & Two Pointers']],
    'Stack & Queues (31 problems)': [['a2z', 'Stack & Queue']],
    'Binary Trees (32 problems)': [['a2z', 'Binary Trees']],
    'Binary Search Trees (15 problems)': [['a2z', 'Binary Search Trees']],
    'Heaps (20 problems)': [['a2z', 'Heaps']],
    'Graphs - Traversals & Topological Sort (23 problems)': [['a2z', 'Graphs', /theory|traversal|cycles/i]],
    'Graphs - Shortest Path & MST (23 problems)': [['a2z', 'Graphs', /shortest|spanning|hard problems ii|additional/i]],
    'Dynamic Programming - 1D & 2D (27 problems)': [['a2z', 'Dynamic Programming', /1d|2d|grids/i]],
    'Dynamic Programming - Subsequences, Strings & Stocks (26 problems)': [['a2z', 'Dynamic Programming', /subsequences|strings|stocks|lis|mcm/i]],
    'Tries (7 problems)': [['a2z', 'Tries']],
    'Strings - Advanced Algorithms (9 problems)': [['a2z', 'Advanced Strings']],
    'Maths & Number Theory (3 problems)': [['a2z', 'Sieve & Number Theory']],
  } },
  'Aptitude Roadmap (October version)': { byLesson: true, practice: {
    'Number System & Divisibility': [set1(Q, '02. Number System'), set2(Q, '02. Number System')],
    Percentages: [set1(Q, '24. Percentage'), set2(Q, '24. Percentage')],
    'Ratio & Proportion': [set1(Q, '20. Ratio and Proportion'), set2(Q, '20. Ratio and Proportion')],
    Averages: [set1(Q, '19. Averages'), set2(Q, '19. Averages')],
    'Profit, Loss & Discount': [set1(Q, '15. Profit and Loss'), set2(Q, '15. Profit and Loss')],
    'Simple & Compound Interest': [set1(Q, '17. Simple Interest'), set1(Q, '18. Compound Interest')],
    'Time, Speed & Distance': [set1(Q, '01. Speed, Time and Distance'), set1(Q, '06. Trains, Boats and Streams')],
    'Time & Work': [set1(Q, '04. Time and Work'), set2(Q, '04. Time and Work')],
    'Pipes & Cisterns': [set1(Q, '05. Pipes and Cisterns'), set2(Q, '05. Pipes and Cisterns')],
    'Mixtures & Alligations': [set1(Q, '10. Mixtures and Alligations'), set2(Q, '10. Mixtures and Alligations')],
    'Permutations & Combinations': [set1(Q, '07. Permutation and Combinations'), set2(Q, '07. Permutation and Combinations')],
    Probability: [set1(Q, '08. Probability'), set2(Q, '08. Probability')],
    Mensuration: [set1(Q, '21. Mensuration'), set2(Q, '21. Mensuration')],
    'Algebra & Equations': [set1(Q, '11. Algebra'), set2(Q, '11. Algebra')],
    'Logical Reasoning - Arrangements': [set1(L, '14. Seating Arrangement'), set2(L, '14. Seating Arrangement')],
    'Blood Relations & Directions': [set1(L, '03. Blood Relation'), set1(L, '13. Direction Sense')],
    'Syllogisms & Statements': [set1(L, '09. Syllogism'), set1(L, '11. Assumptions and Conclusions, Courses of Action')],
    'Series & Pattern Recognition': [set1(L, '08. Series Completion (Mix with Alphanumeric)'), set2(L, '08. Series Completion (Mix with Alphanumeric)')],
    'Puzzles & Seating Arrangement': [set1(L, '06. Puzzles'), set2(L, '06. Puzzles')],
    'Verbal Ability - Reading Comprehension': [set1(V, '02. Ordering of Sentences'), set2(V, '02. Ordering of Sentences')],
    'Verbal Ability - Grammar & Vocabulary': [set1(V, '03. Spotting Errors'), set1(V, '06. Synonyms and Antonyms')],
    'Timed Mock Tests & Speed Strategies': [['tufset', Q, '24. Percentage', 'Mock Test 1'], ['tufset', L, '06. Puzzles', 'Mock Test 1'], ['tufset', V, '03. Spotting Errors', 'Mock Test 1']],
  } },
  'GATE CS 2027 Roadmap': { byLesson: true, practice: {
    'Verbal Aptitude': [set1(V, '03. Spotting Errors'), set1(V, '07. Fill in the Blanks')],
    'Quantitative Aptitude': [set1(Q, '24. Percentage'), set1(Q, '08. Probability')],
    'Analytical Aptitude': [set1(L, '10. Data Sufficiency'), set1(L, '09. Syllogism')],
    'Spatial Aptitude': [set1(L, '12. Cube and Cuboid'), set1(L, '07. Dices')],
    'Programming & Data Structures (15): C, Recursion, Arrays/Stacks/Queues/Linked Lists/Trees/BST/Heaps/Graphs': [LC('two-sum'), LC('reverse-linked-list'), LC('valid-parentheses'), LC('binary-tree-level-order-traversal')],
    'Computer Networks (10): Layering, Switching, Data Link Layer, Routing': [LC('validate-ip-address'), LC('network-delay-time')],
    'Operating Systems (9): Processes/Threads, Concurrency, Deadlocks, Scheduling, Memory Mgmt, File Systems': [DBMS_QUIZ('quiz-2-process-management'), DBMS_QUIZ('quiz-3-synchronization-and-concurrency'), DBMS_QUIZ('quiz-4-memory-management')],
    'Algorithms (7): Searching/Sorting/Hashing, Greedy/DP/Divide & Conquer, Graph Algorithms': [LC('binary-search'), LC('climbing-stairs'), LC('course-schedule'), LC('coin-change')],
    'Databases (7): ER Model, Relational Algebra/SQL, Normalization, Indexing, Transactions': [DBMS_QUIZ('quiz-2-data-models-and-er-models'), DBMS_QUIZ('quiz-3-relational-model-and-normalization'), DBMS_QUIZ('quiz-10-indexing-and-performance-tuning'), DBMS_QUIZ('quiz-7-transactions-and-concurrency')],
  } },
  'Backend Roadmap – From First Principles': { practice: {
    Foundations: [['rs', 'task-tracker', B], ['rs', 'github-user-activity', B]],
    'HTTP & APIs': [['rs', 'weather-api-wrapper-service', B], ['rs', 'blogging-platform-api', B], ['rs', 'todo-list-api', I], ['copy', 'https://exercism.org/tracks/javascript/exercises/rest-api']],
    'Auth & Security': [['rs', 'expense-tracker-api', I], LC('design-authentication-manager')],
    'Architecture & Code': [['rs', 'markdown-note-taking-app', I]],
    'Databases & Storage': [['rs', 'url-shortening-service', I], ['rs', 'image-processing-service', A]],
    'Performance & Scaling': [['rs', 'caching-server', I], LC('lru-cache'), ['rs', 'realtime-leaderboard-system', A]],
    'Reliability & Ops': [['rs', 'server-stats', B], ['rs', 'database-backup-utility', I]],
  } },
  'Backend Projects (5-project roadmap)': { practice: {
    'Project 1: URL shortener': [['rs', 'url-shortening-service', I]],
    'Project 2: Notes app with login': [['rs', 'markdown-note-taking-app', I], ['rs', 'expense-tracker-api', I]],
    'Project 3: Video processing service': [['rs', 'image-processing-service', A]],
    'Project 4: Same app with Redis caching': [['rs', 'caching-server', I]],
    'Project 5: Real-time chat app': [['rs', 'broadcast-server', I]],
  } },
  'Node.js Backend Roadmap (Chai aur Code)': { practice: {
    Orientation: [['rs', 'personal-blog', B]],
    'Project and Database': [['rs', 'blogging-platform-api', B], ['rs', 'ecommerce-api', A]],
    'APIs and Auth': [['rs', 'todo-list-api', I], ['rs', 'expense-tracker-api', I], ['rs', 'image-processing-service', A]],
    'MongoDB Advanced': [['rs', 'movie-reservation-system', A]],
  } },
  'React Frontend Roadmap': { practice: {
    'Phase 1: React foundations (Beginner)': [['rs', 'temperature-converter', B], ['rs', 'age-calculator', B], ['rs', 'accordion', B], ['rs', 'flash-cards', B]],
    'Phase 2: Hooks, routing and state (Intermediate)': [['rs', 'restricted-textarea', B], ['rs', 'weather-app', I], ['rs', 'github-random-repo', I], ['rs', 'quiz-app', I]],
    'Phase 4: Interview and production extras (Advanced)': [['copyall', 'Frontend & React Practice: HackerRank']],
  } },
  'Kafka Roadmap': { practice: {
    'Phase 1: Foundations': [['kafka', 'base'], ['kafka', 'concurrent-clients']],
    'Phase 2: Producers': [['kafka', 'producing-messages']],
    'Phase 3: Consumers': [['kafka', 'listing-partitions'], ['kafka', 'consuming-messages']],
  } },
  'Microservices Roadmap': { practice: {
    'Phase 1: Service-to-service calls': [['rs', 'scalable-ecommerce-platform', A]],
    'Phase 2: Discovery and load balancing': [['rs', 'basic-dns', B], LC('find-servers-that-handled-most-number-of-requests')],
    'Phase 4: Gateway and configuration': [['rs', 'multi-container-service', I]],
    'Phase 5: Observability': [['rs', 'nginx-log-analyser', B], ['rs', 'simple-monitoring-dashboard', I]],
    'Phase 6: Distributed scheduling': [['rs', 'automated-backups', I]],
  } },
  'Cloud (AWS) Roadmap': { practice: {
    'Phase 1: Cloud basics and account': [['rs', 'ec2-instance', B]],
    'Phase 2: Identity and networking': [['rs', 'ssh-remote-server-setup', B], ['rs', 'basic-dns', B]],
    'Phase 3: Infrastructure as code': [['rs', 'iac-digitalocean', I]],
    'Phase 4: Compute and scaling': [['rs', 'static-site-server', B], ['rs', 'nodejs-service-deployment', I], ['rs', 'blue-green-deployment', A]],
    'Phase 5: Storage and delivery': [['rs', 'automated-backups', I]],
    'Not covered in the playlist yet': [['rs', 'dockerized-service-deployment', I], ['rs', 'github-actions-deployment-workflow', I], ['rs', 'simple-monitoring-dashboard', I]],
  } },
  'ML Roadmap': { practice: {
    Beginner: [['kg', 'learn/python', 'Python (Kaggle Learn)', B], ['kg', 'learn/pandas', 'Pandas (Kaggle Learn)', B], ['kg', 'learn/data-visualization', 'Data Visualization (Kaggle Learn)', B], ['kg', 'learn/data-cleaning', 'Data Cleaning (Kaggle Learn)', B]],
    Intermediate: [['kg', 'learn/intro-to-machine-learning', 'Intro to Machine Learning (Kaggle Learn)', I], ['kg', 'learn/feature-engineering', 'Feature Engineering (Kaggle Learn)', I], ['kg', 'competitions/titanic', 'Titanic: predict survival (Kaggle competition)', I]],
    Advanced: [['kg', 'learn/intermediate-machine-learning', 'Intermediate Machine Learning (Kaggle Learn)', A], ['kg', 'competitions/house-prices-advanced-regression-techniques', 'House Prices: advanced regression (Kaggle competition)', A], ['kg', 'learn/machine-learning-explainability', 'Machine Learning Explainability (Kaggle Learn)', A], ['kg', 'learn/intro-to-deep-learning', 'Intro to Deep Learning (Kaggle Learn)', A]],
  } },
  'Power BI Roadmap': { practice: {
    '1. Getting Started': [['ms', 'dashboard-in-a-day', B], ['ms', 'prepare-visualize-data-power-bi', B]],
    '2. Data Modeling': [['ms', 'model-data-power-bi', I]],
    '3. Transforming Data › Power Query': [['ms', 'prepare-data-power-bi', I]],
    '3. Transforming Data › DAX': [['ms', 'dax-power-bi', I]],
    '4. Visualization': [['ms', 'power-bi-effective', I]],
    '5. Deployment › Security & Governance': [['ms', 'manage-secure-power-bi', I]],
  } },
  'System Design Roadmap (October version)': { practice: {
    Beginner: [PRIMER('scaling_aws'), LC('lru-cache')],
    Intermediate: [LC('time-based-key-value-store'), LC('find-servers-that-handled-most-number-of-requests'), ['rs', 'caching-server', I], ['rs', 'url-shortening-service', I]],
    Advanced: [PRIMER('twitter'), PRIMER('web_crawler'), LC('design-twitter'), ['rs', 'realtime-leaderboard-system', A]],
  } },
  'System Design Roadmap 2 (video list)': { practice: {
    'System Design Fundamentals': [PRIMER('scaling_aws')],
    'Networking & Protocols': [['rs', 'basic-dns', B]],
    'APIs & Communication': [['copy', 'https://exercism.org/tracks/javascript/exercises/rest-api'], LC('encode-and-decode-tinyurl')],
    'Caching & CDNs': [LC('lru-cache'), ['rs', 'caching-server', I]],
    'Load Balancing & Proxies': [LC('find-servers-that-handled-most-number-of-requests')],
    'Databases & Storage': [PRIMER('query_cache'), LC('time-based-key-value-store')],
    'Messaging & Streaming': [['kafka', 'producing-messages'], ['kafka', 'consuming-messages']],
    'Containers & Cloud': [['rs', 'multi-container-service', I], ['rs', 'dockerized-service-deployment', I]],
    'DevOps & Deployment': [['rs', 'github-actions-deployment-workflow', I], ['rs', 'blue-green-deployment', A]],
    'Security & Auth': [LC('design-authentication-manager')],
    'Real-World Architecture Case Studies': [PRIMER('pastebin'), PRIMER('twitter'), PRIMER('mint')],
  } },
  'System Design Roadmap 3 (Microsoft SDE course)': { practice: {
    'Foundations & crash courses': [PRIMER('scaling_aws')],
    'Core concepts': [LC('number-of-recent-calls'), LC('time-based-key-value-store')],
    'Case studies': [['copy', 'https://app.codecrafters.io/courses/redis/stages/jm1'], PRIMER('twitter'), PRIMER('social_graph'), LC('design-twitter')],
  } },
  'Arpit System Design Map': { practice: {
    'Networking and Web Fundamentals': [['rs', 'basic-dns', B], ['rs', 'static-site-server', B]],
    Caching: [LC('lru-cache'), ['rs', 'caching-server', I]],
    'Distributed Systems Papers and Databases': [PRIMER('query_cache')],
    'Scaling Case Studies': [PRIMER('sales_rank'), PRIMER('scaling_aws')],
    'Search and Design Exercises': [['rs', 'realtime-leaderboard-system', A], PRIMER('web_crawler')],
  } },
  'HLD Build Projects Roadmap': { practice: {
    'Full-stack Warm-ups (Beginner)': [['rs', 'quiz-app', I], ['rs', 'personal-blog', B]],
    'Real-time and WebSocket Systems (Intermediate)': [['rs', 'broadcast-server', I], ['rs', 'realtime-leaderboard-system', A]],
    'SaaS and AI Products (Intermediate)': [['rs', 'image-processing-service', A], ['rs', 'ecommerce-api', A]],
    'Backend-heavy and Infrastructure Systems (Advanced)': [['rs', 'static-site-server', B], ['rs', 'dockerized-service-deployment', I], ['rs', 'github-actions-deployment-workflow', I]],
  } },
};

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const allItems = seed.flatMap((r) => r.sections.flatMap((s) => s.items.map((i) => ({ ...i, rm: r.title, section: s.title }))));
const ORDER = [B, I, A];
const strip = ({ id: _i, status: _s, doneAt: _d, rm: _r, section: _x, ...rest }) => rest;
const chapterName = (c) => c.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)$/, '');
const evenlySpread = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, k) => list[Math.round((k * (list.length - 1)) / (n - 1))]));

let kafkaStages = null;
async function kafka(ext) {
  if (!kafkaStages) {
    const yml = await fetch('https://raw.githubusercontent.com/codecrafters-io/build-your-own-kafka/main/course-definition.yml').then((r) => r.text());
    kafkaStages = yml.slice(yml.indexOf('\nstages:')).split('\n  - slug: ').slice(1).map((b) => ({
      slug: b.split('\n')[0].trim().replace(/"/g, ''),
      name: /\n    name: "?([^"\n]+)"?/.exec(b)?.[1] ?? '',
      ext: /\n    primary_extension_slug: "?([^"\n]+)"?/.exec(b)?.[1] ?? 'base',
    }));
  }
  const g = kafkaStages.filter((s) => s.ext === ext);
  if (!g.length) return null;
  const titles = { base: 'a broker that answers ApiVersions', 'concurrent-clients': 'concurrent clients', 'listing-partitions': 'listing topic partitions', 'consuming-messages': 'consuming messages (Fetch)', 'producing-messages': 'producing messages (Produce)' };
  return [{ title: `Build Kafka: ${titles[ext] ?? ext}`, url: `https://app.codecrafters.io/courses/kafka/stages/${g[0].slug}`, level: ext === 'base' ? B : I, note: `Practice · CodeCrafters · ${g.length} stages: ${g[0].name} → ${g.at(-1).name}` }];
}

let msCatalog = null;
async function resolve(ref) {
  const [kind] = ref;
  if (kind === 'copy') {
    // Prefer a copy already marked as practice; otherwise any item with that link.
    const it = allItems.find((i) => i.url === ref[1] && (i.note ?? '').startsWith('Practice')) ?? allItems.find((i) => i.url === ref[1]);
    if (!it) return null;
    const copy = strip(it);
    if (!(copy.note ?? '').startsWith('Practice')) copy.note = (copy.note ?? '').replace(/^LeetCode /, '');
    return [copy];
  }
  if (kind === 'copyall') {
    const list = allItems.filter((i) => i.rm === ref[1]);
    return list.length ? list.map(strip) : null;
  }
  if (kind === 'a2z') {
    const [, step, sub] = ref;
    const list = allItems.filter((i) => i.rm.startsWith('DSA Practice') && i.section === `Striver A2Z: ${step}` && (!sub || sub.test(i.note ?? '')));
    return list.length ? evenlySpread(list, 6).map(strip) : null;
  }
  if (kind === 'tufset') {
    const [, rm, chapter, setTitle] = ref;
    const it = allItems.find((i) => i.rm === rm && i.section === chapter && i.title === setTitle);
    return it ? [{ title: `${chapterName(chapter)}: ${setTitle}`, url: it.url, level: /Basic|Set 1$/.test(setTitle) ? B : /Mock/.test(setTitle) ? A : I, note: 'Practice · TUF' }] : null;
  }
  if (kind === 'rs') {
    const [, slug, level] = ref;
    const r = await fetch(`https://roadmap.sh/projects/${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const t = r.ok ? /<title>([^<]*)/.exec(await r.text())?.[1] ?? '' : '';
    await sleep(300);
    if (!t) return null;
    const title = t.replace(/\s*Project Idea$|\s*Idea$/i, '').trim();
    return [{ title: `Build: ${title}`, url: `https://roadmap.sh/projects/${slug}`, level, note: 'Practice · roadmap.sh · project brief with requirements to build yourself' }];
  }
  if (kind === 'kg') {
    const [, p, title, level] = ref;
    const r = await fetch(`https://www.kaggle.com/${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    await sleep(300);
    return r.ok ? [{ title, url: `https://www.kaggle.com/${p}`, level, note: `Practice · Kaggle · ${p.startsWith('learn') ? 'hands-on course with exercises' : 'competition to submit predictions to'}` }] : null;
  }
  if (kind === 'ms') {
    const [, slug, level] = ref;
    msCatalog ??= (await fetch('https://learn.microsoft.com/api/catalog/?type=learningPaths&locale=en-us').then((r) => r.json())).learningPaths;
    const p = msCatalog.find((x) => new URL(x.url).pathname.replace(/\/$/, '').endsWith(`/paths/${slug}`));
    return p ? [{ title: `${p.title} (Microsoft Learn)`, url: `https://learn.microsoft.com/en-us/training/paths/${slug}/`, level, note: 'Practice · Microsoft Learn · learning path with hands-on exercises' }] : null;
  }
  if (kind === 'kafka') return kafka(ref[1]);
  return null;
}

// Resolve every reference once.
const plan = {};
for (const [title, { byLesson, practice }] of Object.entries(PLAN)) {
  plan[title] = { byLesson, groups: {} };
  for (const [group, refs] of Object.entries(practice)) {
    const items = [];
    for (const ref of refs) {
      const got = await resolve(ref);
      if (!got) { console.warn(`  ${title} › ${group}: ${ref.slice(0, 3).join(' ')} not found, skipped`); continue; }
      for (const it of got) {
        const site = /^Practice(?: › [^·]+)? · ([^·]+)/.exec(it.note ?? '')?.[1]?.trim() ?? (/leetcode/.test(it.url) ? 'LeetCode' : 'TUF');
        const why = (it.note ?? '').replace(/^Practice(?: › [^·]+)? · [^·]+?\s*(?:·\s*|$)/, '').replace(/^takeUforward A2Z · /, '');
        it.note = [byLesson ? `Practice › ${group} · ${site}` : `Practice · ${site}`, why].filter(Boolean).join(' · ');
        items.push(it);
      }
    }
    plan[title].groups[group] = items.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
  }
  console.log(`${title}: ${Object.values(plan[title].groups).reduce((n, l) => n + l.length, 0)} practice items`);
}
if (DRY) process.exit(0);

function apply(title, sections) {
  const { byLesson, groups } = plan[title];
  let added = 0;
  for (const [group, items] of Object.entries(groups)) {
    const s = byLesson ? sections.find((x) => x.items.some((i) => i.title === group)) : sections.find((x) => x.title === group);
    if (!s) { console.warn(`  ${title}: "${group}" not found, skipped`); continue; }
    const have = new Set(s.items.map((i) => i.url));
    const fresh = items.filter((i) => !have.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...structuredClone(i) }));
    s.items.push(...fresh);
    added += fresh.length;
  }
  return added;
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
for (const title of Object.keys(PLAN)) {
  const doc = await col.findOne({ title });
  if (!doc) { console.warn(`${title} not found in the database, skipped`); continue; }
  const addedDb = apply(title, doc.sections);
  if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
  const entry = seed.find((r) => r.title === title);
  console.log(`${title}: database +${addedDb}, seed +${entry ? apply(title, entry.sections) : 0}`);
}
await client.close();
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
