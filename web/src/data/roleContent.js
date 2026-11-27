// Role hub content (moved from public/role-hub.js): resources, interview patterns, starter code and projects per role.
const ROLE_CONTENT = {
  sde: {
    resources: [
      { title: 'Striver A2Z DSA Sheet', note: 'Complete DSA problem list from basics to DP & Graphs', url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/' },
      { title: 'NeetCode 150', note: 'Curated interview patterns with video explanations', url: 'https://neetcode.io/practice' },
      { title: 'CS50 / Core CS Notes', note: 'OS, DBMS, and Computer Networks fundamentals', url: '#/g/core-subjects' },
      { title: 'System Design Primer', note: 'HLD & LLD concepts for SDE-1 / SDE-2 interviews', url: '#/g/system-design' },
    ],
    interviews: [
      { company: 'Product SDE-1 Pattern', rounds: 'OA (2 DSA) -> Tech 1 (DSA + Core CS) -> Tech 2 (LLD + Projects) -> HM', tips: 'Focus on arrays, trees, graphs, sliding window, and explain time/space complexity before coding.' },
      { company: 'Core CS Deep Dive', rounds: 'OS (processes, threads, deadlocks) + DBMS (ACID, indexing, normalization) + CN (TCP/UDP, HTTP, DNS)', tips: 'Relate textbook concepts to real projects you built (e.g. why you indexed a column or used connection pooling).' },
      { company: 'LLD / Machine Coding', rounds: 'Design Parking Lot, Splitwise, or Rate Limiter in 60 mins', tips: 'Start with clarifying requirements, define clean classes/interfaces, and apply Strategy or Observer patterns.' },
    ],
    starterCode: `// SDE DSA Playground: Two Sum (O(n) HashMap)
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}

console.log('Two Sum:', twoSum([2, 7, 11, 15], 9));`,
  },
  backend: {
    resources: [
      { title: 'Node.js & Express Docs', note: 'Official guides on routing, middleware, and streams', url: 'https://expressjs.com/' },
      { title: 'Redis University', note: 'Caching patterns, data structures, and pub/sub', url: 'https://redis.io/learn/' },
      { title: 'PostgreSQL / SQL Indexing Guide', note: 'B-Tree indexes, query plans (EXPLAIN ANALYZE)', url: 'https://use-the-index-luke.com/' },
      { title: 'Kafka Documentation', note: 'Partitions, consumer groups, and event-driven architecture', url: 'https://kafka.apache.org/documentation/' },
    ],
    interviews: [
      { company: 'Backend Engineering Round', rounds: 'DSA -> API & DB Design -> System Design (Caching/Queues) -> Debugging', tips: 'Be ready to discuss idempotency, rate limiting, connection pooling, N+1 queries, and JWT vs session cookies.' },
      { company: 'Database & Caching Round', rounds: 'Schema design + Indexing + Redis cache invalidation strategies', tips: 'Know write-through vs cache-aside, TTLs, and how to prevent cache stampedes.' },
      { company: 'Distributed Systems Round', rounds: 'Design a URL Shortener, Notification Service, or Webhook Delivery', tips: 'Cover load balancers, message queues (Kafka/SQS), retries with exponential backoff, and dead-letter queues.' },
    ],
    starterCode: `// Backend Playground: Simple Token Bucket Rate Limiter
function createLimiter(capacity, refillPerSec) {
  let tokens = capacity;
  return function allow() {
    if (tokens >= 1) {
      tokens -= 1;
      return { allowed: true, remaining: tokens };
    }
    return { allowed: false, remaining: 0 };
  };
}

const limit = createLimiter(3, 1);
console.log(limit(), limit(), limit(), limit());`,
  },
  data_engineer: {
    resources: [
      { title: 'SQLBolt Interactive SQL', note: 'Practice JOINs, aggregations, and window functions', url: 'https://sqlbolt.com/' },
      { title: 'Apache Kafka Quickstart', note: 'Streaming pipelines, topics, and offsets', url: 'https://kafka.apache.org/quickstart' },
      { title: 'AWS Data Analytics', note: 'S3 data lakes, Glue, Athena, and Redshift basics', url: 'https://aws.amazon.com/big-data/datalakes-and-analytics/' },
      { title: 'Databases (DBMS & SQL)', note: 'All DBMS & SQL roadmaps in one bundle', url: '#/g/databases' },
    ],
    interviews: [
      { company: 'Data Engineering SQL & Python', rounds: 'Advanced SQL (Window Functions, CTEs) -> Python ETL -> Pipeline Design', tips: 'Master ROW_NUMBER, RANK, DENSE_RANK, LAG/LEAD, and handling skewed joins or incremental loads.' },
      { company: 'Batch & Streaming Architecture', rounds: 'Design an end-to-end clickstream or e-commerce ETL pipeline', tips: 'Discuss partitioning, Parquet/Iceberg storage, schema evolution, idempotent backfills, and data quality checks.' },
    ],
    starterCode: `// Data Engineer Playground: Deduplicate & Aggregate Events
const events = [
  { id: 'e1', user: 'u1', amount: 120 },
  { id: 'e1', user: 'u1', amount: 120 }, // duplicate
  { id: 'e2', user: 'u2', amount: 80 },
  { id: 'e3', user: 'u1', amount: 50 },
];

const deduped = [...new Map(events.map((e) => [e.id, e])).values()];
const byUser = deduped.reduce((acc, e) => {
  acc[e.user] = (acc[e.user] || 0) + e.amount;
  return acc;
}, {});

console.log('Total spend per user:', byUser);`,
  },
  data_analyst: {
    resources: [
      { title: 'Mode SQL Tutorial', note: 'Real-world analytics queries, cohorts, and funnels', url: 'https://mode.com/sql-tutorial/' },
      { title: 'Microsoft Power BI Docs', note: 'DAX formulas, data modeling, and dashboard design', url: 'https://learn.microsoft.com/en-us/power-bi/' },
      { title: 'Databases (DBMS & SQL)', note: 'SQL & DBMS roadmaps bundle', url: '#/g/databases' },
      { title: 'Aptitude Roadmaps', note: 'Quantitative & logical reasoning for analytics tests', url: '#/g/aptitude' },
    ],
    interviews: [
      { company: 'Analytics & SQL Round', rounds: 'SQL Case Queries -> Excel / Power BI Modeling -> Product Metrics', tips: 'Practice calculating retention, conversion funnels, YoY growth, and choosing the right chart for stakeholders.' },
      { company: 'Business Case Study', rounds: 'Root-cause analysis (e.g. "DAU dropped 15% yesterday")', tips: 'Segment by platform, geography, new vs returning users, and check logging/pipeline issues first.' },
    ],
    starterCode: `// Data Analyst Playground: Conversion Funnel & Retention Math
const funnel = [
  { step: 'Visited', users: 10000 },
  { step: 'Signed Up', users: 2400 },
  { step: 'Activated', users: 1200 },
  { step: 'Retained D7', users: 540 },
];

funnel.forEach((row, i) => {
  const prev = i === 0 ? row.users : funnel[i - 1].users;
  console.log(row.step, '->', ((row.users / prev) * 100).toFixed(1) + '% step conv');
});`,
  },
  ai_engineer: {
    resources: [
      { title: 'Fast.ai Practical Deep Learning', note: 'Hands-on ML and neural network fundamentals', url: 'https://course.fast.ai/' },
      { title: 'Hugging Face Learn', note: 'Transformers, embeddings, and LLM fine-tuning', url: 'https://huggingface.co/learn' },
      { title: 'Andrej Karpathy: Neural Networks', note: 'Zero to Hero deep learning intuition', url: 'https://karpathy.ai/zero-to-hero.html' },
      { title: 'ML Roadmap', note: 'Open the structured ML roadmap', url: '#/r/LL4yMJQY' },
    ],
    interviews: [
      { company: 'ML / AI Engineer Round', rounds: 'Python & DSA -> ML Theory (Bias-Variance, Loss, Regularization) -> RAG / LLM System Design', tips: 'Know evaluation metrics (Precision/Recall/F1, ROC-AUC), chunking & vector search for RAG, and latency/cost trade-offs.' },
      { company: 'Applied AI System Design', rounds: 'Design a Semantic Search or Support Chatbot with guardrails', tips: 'Cover embeddings, hybrid search (BM25 + dense), reranking, prompt evals, and hallucination checks.' },
    ],
    starterCode: `// AI Engineer Playground: Cosine Similarity for Embeddings
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

console.log('Similarity:', cosineSimilarity([0.8, 0.2, 0.1], [0.75, 0.25, 0.15]).toFixed(4));`,
  },
  frontend: {
    resources: [
      { title: 'React Official Docs', note: 'Hooks, state management, effects, and rendering model', url: 'https://react.dev/learn' },
      { title: 'Web.dev Learn CSS & Performance', note: 'Core Web Vitals, accessibility, and responsive layouts', url: 'https://web.dev/learn/' },
      { title: 'Web Development Bundle', note: 'React Frontend + Backend roadmaps', url: '#/g/web-development' },
    ],
    interviews: [
      { company: 'Frontend Machine Coding', rounds: 'JS Fundamentals (Closures, Event Loop, Promises) -> Build a React UI -> Performance', tips: 'Practice building debounce/throttle, autocomplete, infinite scroll, and accessible modals without external libraries.' },
      { company: 'Full Stack Round', rounds: 'React UI + REST API integration + Auth + SQL schema', tips: 'Explain optimistic UI updates, CORS, CSRF, and caching strategies cleanly.' },
    ],
    starterCode: `// Frontend Playground: Debounce Utility
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const search = debounce((q) => console.log('Searching for:', q), 50);
search('re');
search('rea');
search('react');`,
  },
  aptitude: {
    resources: [
      { title: 'Aptitude Roadmaps Bundle', note: 'Quantitative, Logical, Verbal, and October version', url: '#/g/aptitude' },
      { title: 'IndiaBIX Practice', note: 'Topic-wise aptitude and reasoning practice sets', url: 'https://www.indiabix.com/' },
      { title: 'GATE Overflow', note: 'Previous year GATE CS questions and discussions', url: 'https://gateoverflow.in/' },
    ],
    interviews: [
      { company: 'Campus Placement Online Test', rounds: 'Quant + Logical + Verbal (45 mins) -> 2 Coding Questions -> Technical + HR', tips: 'Aim for accuracy and speed on Percentages, Ratio, Time & Work, Permutations, and Syllogisms.' },
      { company: 'GATE CS Strategy', rounds: 'Engineering Math + Aptitude (28 marks) + Core CS (72 marks)', tips: 'Master Discrete Math, OS, DBMS, CN, TOC, and Algorithms with timed mock tests.' },
    ],
    starterCode: `// Aptitude Playground: Permutations & Combinations
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const nCr = (n, r) => fact(n) / (fact(r) * fact(n - r));
const nPr = (n, r) => fact(n) / fact(n - r);

console.log('10C3 =', nCr(10, 3));
console.log('10P3 =', nPr(10, 3));`,
  },
};

const ROLE_PROJECTS = {
  sde: [
    { title: 'Distributed URL Shortener', level: 'Intermediate', stack: ['Node.js', 'PostgreSQL', 'Redis'], summary: 'Base62 short codes, custom aliases, click analytics, and Redis rate limiting.' },
    { title: 'In-Memory Key-Value Store (Mini Redis)', level: 'Advanced', stack: ['Go / Node.js', 'TCP', 'TTL'], summary: 'RESP-like parser, GET/SET/DEL commands, and active + lazy key expiration.' },
    { title: 'LLD Machine Coding Suite', level: 'Beginner', stack: ['TypeScript / Java', 'OOPS'], summary: 'Clean extensible implementations of Parking Lot, Splitwise, and Elevator Scheduler.' },
  ],
  backend: [
    { title: 'Event-Driven Notification Service', level: 'Advanced', stack: ['Node.js', 'Kafka', 'Redis', 'Postgres'], summary: 'Idempotent webhook & email worker with retries, dead-letter queue, and rate limits.' },
    { title: 'Multi-Tenant Auth & RBAC Gateway', level: 'Intermediate', stack: ['Express', 'scrypt', 'HttpOnly Cookies'], summary: 'Session management, role permissions, audit logs, and brute-force protection.' },
    { title: 'Real-Time Leaderboard API', level: 'Beginner', stack: ['Node.js', 'Redis Sorted Sets'], summary: 'Fast top-K rankings, user rank lookup, and paginated scoreboards.' },
  ],
  data_engineer: [
    { title: 'Streaming Clickstream ETL Pipeline', level: 'Advanced', stack: ['Kafka', 'Python', 'Parquet', 'S3'], summary: 'Ingest, deduplicate, and partition raw click events into hourly analytical tables.' },
    { title: 'Automated Data Quality Monitor', level: 'Intermediate', stack: ['Python', 'SQL', 'DuckDB / Postgres'], summary: 'Schema drift, null-rate, and freshness checks with Slack/email alerts.' },
    { title: 'Incremental Warehouse Sync', level: 'Beginner', stack: ['Python', 'SQL', 'Cron'], summary: 'Watermarked CDC loader handling late-arriving records cleanly.' },
  ],
  data_analyst: [
    { title: 'E-Commerce Funnel & Cohort Dashboard', level: 'Intermediate', stack: ['SQL', 'Power BI', 'DAX'], summary: 'Track visitor-to-purchase conversion, D7/D30 retention cohorts, and revenue drivers.' },
    { title: 'SaaS Churn & Revenue Explorer', level: 'Beginner', stack: ['SQL', 'Python (Pandas)', 'Power BI'], summary: 'Identify churn risk segments, MRR expansion, and regional KPIs.' },
    { title: 'A/B Test Significance Calculator', level: 'Intermediate', stack: ['Python', 'Statistics'], summary: 'Compute p-values, confidence intervals, and sample size power for product experiments.' },
  ],
  ai_engineer: [
    { title: 'Hybrid RAG Document Assistant', level: 'Advanced', stack: ['Python', 'Embeddings', 'Vector DB', 'BM25'], summary: 'Chunking, hybrid retrieval, reranking, and citation-backed answers with evals.' },
    { title: 'Semantic Code & Roadmap Search', level: 'Intermediate', stack: ['Python', 'FastAPI', 'Cosine Sim'], summary: 'Embed syllabus topics and return instant conceptual matches.' },
    { title: 'Customer Support Triage Classifier', level: 'Beginner', stack: ['Python', 'Scikit-learn'], summary: 'Multi-class ticket routing with precision/recall evaluation dashboard.' },
  ],
  frontend: [
    { title: 'Accessible Component & Design System', level: 'Intermediate', stack: ['React', 'CSS Tokens', 'ARIA'], summary: 'Reusable modals, tabs, comboboxes, and light/dark theming with keyboard navigation.' },
    { title: 'Interactive Mindmap & KanBan Board', level: 'Advanced', stack: ['React / Vanilla JS', 'SVG', 'Drag & Drop'], summary: 'Zoomable SVG graph + offline-first task board with optimistic updates.' },
    { title: 'Developer Portfolio & Live Stats', level: 'Beginner', stack: ['HTML', 'CSS', 'REST APIs'], summary: 'Responsive portfolio fetching live GitHub and LeetCode stats.' },
  ],
  aptitude: [
    { title: 'Timed Mock Test Simulator', level: 'Beginner', stack: ['JavaScript', 'Timer', 'Analytics'], summary: 'Section-wise timer for Quant, Logical, and Verbal with accuracy breakdown.' },
    { title: 'GATE CS Formula & PYQ Flashcards', level: 'Intermediate', stack: ['Spaced Repetition', 'Markdown'], summary: 'Active-recall deck covering OS, DBMS, CN, and Discrete Math.' },
  ],
};

export { ROLE_CONTENT, ROLE_PROJECTS };
