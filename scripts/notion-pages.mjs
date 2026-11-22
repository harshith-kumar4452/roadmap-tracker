// Page details copied from the Notion roadmap pages: the parts that are not
// checklist topics (resources, intro text and notes). Used once by export-sqlite.mjs.
// "toNotes" lists checklist sections that are plain bullet lists in Notion, so they
// are shown as notes instead of tickable topics.

const yt = (list) => `https://www.youtube.com/playlist?list=${list}`;
const n = (id) => `https://app.notion.com/p/${id}`;

export default {
  'Redis Internals Roadmap': {
    notionUrl: n('4201ffd205bf809d967ae14ee27ba8b5'),
    resources: [
      { title: 'Redis Internals – Build Redis from Scratch, Arpit Bhayani (YouTube playlist)', url: yt('PLsdq-3Z1EPT0eElcdOON9fdaeaQjlyXDt') },
      { title: 'Redis documentation', url: 'https://redis.io/docs/' },
    ],
    intro: 'This complements your Redis Roadmap (Concept && Coding), which covers using Redis. This roadmap covers how Redis works inside and rebuilding it, across all 26 videos of the series. All videos are free. Level labels are my own.',
    toNotes: ['Not covered', 'Mini project'],
    levelByItem: [[12, 'Intermediate'], [99, 'Advanced']],
    notes: [
      { heading: 'How this lines up with your Redis Roadmap', lines: [
        'Do your Redis Roadmap (Concept && Coding, 11 videos) first. It covers installing and using Redis, the data types and RedisTemplate in Spring Boot. This roadmap then explains how the same features work inside.',
        'Redis Roadmap "What is Redis and why does it exist?" and the architecture parts (event loop, I/O multiplexing, RESP): videos 1, 3, 4, 6 and 7 here.',
        'Redis Roadmap "Redis Strings": video 24 here (how Redis implements strings).',
        'Redis Roadmap "Redis Lists": video 21 here (Ziplist and Quicklist).',
        'Redis Roadmap "Redis Sets": video 22 here (Intset).',
        'Redis Roadmap "Redis Sorted Sets" and "Hashes": no matching video in this playlist.',
        'Eviction and caching topics on your System Design Roadmap (Caching, Redis & Cache Strategies): videos 10, 14, 15, 16 and 26 here.',
        'Missing Topics page, "Distributed Transactions": video 20 here (Redis transactions).',
      ] },
      { heading: 'Related roadmaps', lines: ['Redis Roadmap, System Design Roadmap – HLD & LLD, Arpit System Design Map.'] },
    ],
  },

  'Node.js Backend Roadmap (Chai aur Code)': {
    notionUrl: n('4201ffd205bf8075ab0cf13e326d9b0f'),
    resources: [
      { title: 'Chai aur Javascript Backend playlist (25 videos, Hindi)', url: yt('PLu71SKxNbfoBGh_8p_NS-ZAh6v7HhYqHW') },
      { title: 'roadmap.sh: Node.js Roadmap', url: 'https://roadmap.sh/nodejs' },
      { title: 'Node.js official docs', url: 'https://nodejs.org/en/docs' },
    ],
    intro: 'From project setup, MongoDB modelling and JWT auth through file uploads, aggregation pipelines and deployment, this roadmap covers all 25 videos of the Chai aur Javascript Backend series, from Beginner to Advanced. All videos are free. Level labels are my own.',
    toNotes: ['Not covered', 'Mini project'],
    levelByItem: [[8, 'Beginner'], [18, 'Intermediate'], [99, 'Advanced']],
    notes: [
      { heading: 'Fill the gaps with your other roadmaps', lines: [
        'Validation, error handling, config, logging, security, testing, Twelve-Factor, webhooks: Backend Roadmap – From First Principles (videos 9, 16, 17, 18, 20, 26, 27, 29).',
        'Caching and rate limiting with Redis: Redis Roadmap, then Redis Internals Roadmap.',
        'Task queues and background jobs: Backend Roadmap – From First Principles (video 14), then Kafka Roadmap.',
        'Docker, CI/CD and deployment: Cloud (AWS) Roadmap and Git Roadmap.',
        'Splitting this project into services: Microservices Roadmap.',
        'Designing it for scale: System Design Roadmap – HLD & LLD.',
      ] },
    ],
  },

  'React Frontend Roadmap': {
    notionUrl: n('4201ffd205bf804e8948d2c908e6e002'),
    resources: [{ title: 'Chai aur react with projects, Chai aur Code (35 videos)', url: yt('PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige') }],
    intro: 'Source: Chai aur react with projects by Chai aur Code, 35 videos, all free. Every link opens that video inside the playlist. Level labels are my own.',
    notes: [{ heading: 'Related roadmaps', lines: ['See Node.js Backend Roadmap (Chai aur Code) for the matching backend.'] }],
  },

  'Backend Roadmap – From First Principles': {
    notionUrl: n('4191ffd205bf80aa9b13e77b95983407'),
    intro: 'Based on the "Backend from first principles" playlist by Sriniously (31 videos). Work through Beginner, Intermediate and Advanced in order and tick Done as you finish each video.',
    levelByItem: [[7, 'Beginner'], [19, 'Intermediate'], [99, 'Advanced']],
    notes: [{ heading: 'Related roadmaps', lines: ['Redis Roadmap and Cloud (AWS) Roadmap.'] }],
  },

  'HLD Build Projects Roadmap': {
    notionUrl: n('4201ffd205bf80ea855feb2786a6f210'),
    resources: [{ title: 'Build Your Own XYZ, Harkirat Singh (YouTube playlist)', url: yt('PLVKLWop9wWA8rdaNPIsG6r4a6QZClCH-M') }],
    intro: 'This roadmap collects 21 of the 34 videos in Build Your Own XYZ as practice for the Arpit System Design Map and System Design Roadmap: after each video, redraw the architecture and list its bottlenecks. The web3, React Native and vibe-coding videos are skipped to keep this focused on HLD-style backend projects. All free. Links open the playlist, so search the title inside it.',
    toNotes: ['Mini project'],
    notes: [
      { heading: 'For each project, write down', lines: [
        'Components and data flow diagram',
        'Where it breaks at 100x traffic and how you would fix it',
        'Which database, cache and queue you chose and why',
      ] },
      { heading: 'Which roadmap to study before each project', lines: [
        'Vercel clone and Repl.it clone: Cloud (AWS) Roadmap, Redis Roadmap, then the Docker and Kubernetes parts of your Microservices Roadmap.',
        'Zerodha, WazirX and trading bots: Redis Roadmap (Sorted Sets for order books), Kafka Roadmap for event streams, Redis Internals Roadmap for how the cache works.',
        'Chess, Dream11, Metaverse and Google Meet clones: Backend Roadmap – From First Principles (video 25, Real-Time Backends).',
        'Leetcode and Codeforces clones: Backend Roadmap – From First Principles (video 14, Task queues and background jobs).',
        'Every project: System Design Roadmap – HLD & LLD (HLD Case Studies) and the Arpit System Design Map for rate limiter, leaderboard and scaling case studies.',
      ] },
      { heading: 'Related roadmaps', lines: ['Arpit System Design Map, System Design Roadmap (HLD and LLD), Redis Roadmap, Kafka Roadmap, Cloud (AWS) Roadmap.'] },
    ],
  },

  'Arpit System Design Map': {
    notionUrl: n('4201ffd205bf80a2bcf8c277bfb94377'),
    resources: [{ title: 'System Design by Arpit Bhayani (YouTube playlist)', url: yt('PLsdq-3Z1EPT27BuTnJ_trF7BsaTpYLqst') }],
    intro: 'This sits next to your System Design Roadmap (HLD and LLD) and its Missing Topics page. It adds database internals, papers and real company case studies, in 53 videos picked by title from the 122-video playlist. All free. Links open the playlist, so search the title inside it.',
    toNotes: ['Not covered', 'Mini project'],
    notes: [
      { heading: 'How this maps to your System Design Roadmap', lines: [
        'Networking Fundamentals and Load Balancing & Proxies (Beginner): the URL, DNS, proxy and L4 load balancer videos.',
        'Caching (Beginner): cache invalidation with SNS + SQS, the thundering herd videos, and the full Redis Internals Roadmap.',
        'Databases: SQL, NoSQL & ACID (Beginner): Postgres, joins and isolation levels.',
        'Consistent Hashing and Sharding & Replication (Intermediate): the consistent hashing video, GitHub sharding, Shopify hot shards.',
        'CAP Theorem & Consistency (Intermediate): BitBucket read-your-write, DynamoDB paper, RUM conjecture.',
        'Availability & Fault Tolerance (Intermediate): Atlassian outage, Aurora quorum writes, JunoDB availability.',
        'HLD Case Studies (Advanced): the scaling case studies here, then practise with the HLD Build Projects Roadmap.',
      ] },
      { heading: 'Related roadmaps', lines: ['System Design Roadmap (HLD and LLD), System Design: Missing Topics and Video Map, Redis Internals Roadmap, Redis Roadmap.'] },
    ],
  },

  'Kafka Roadmap': {
    notionUrl: n('41f1ffd205bf809c8259c8e0d9b925b7'),
    resources: [{ title: 'Kafka (EDA) from Basics to Advanced', url: yt('PL6W8uoQQ2c62YCR2kkE-0tg3-y1QwaIWk') }],
    intro: 'Playlist: 27 videos, about 15 hours. 8 are free; videos marked (members) are members-only on the Concept && Coding channel. Tick a box when you finish the video and its exercise.',
  },
  'Git Roadmap': {
    notionUrl: n('41f1ffd205bf809c8259c8e0d9b925b7'),
    resources: [
      { title: 'Git from Basics to Advanced', url: yt('PL6W8uoQQ2c60dI3V0WrM2XzlTPsvsZCSa') },
      { title: 'Learn Git Branching', url: 'https://learngitbranching.js.org/' },
    ],
    intro: 'Playlist: 12 videos, about 6 hours. 6 are free, the rest members-only. Learn Git Branching has levels for the reset, revert and rebase items that the playlist skips.',
  },
  'Cloud (AWS) Roadmap': {
    notionUrl: n('41f1ffd205bf809c8259c8e0d9b925b7'),
    resources: [{ title: 'AWS from Basics to Advanced', url: yt('PL6W8uoQQ2c60g3PAgzVPpi0YWwxITD43p') }],
    intro: 'Playlist: 28 videos, about 18 hours, still growing. 11 are free. Set a billing alarm and tear down resources after each lab to stay in the free tier.',
  },
  'Microservices Roadmap': {
    notionUrl: n('41f1ffd205bf809c8259c8e0d9b925b7'),
    resources: [{ title: 'Distributed Microservices - Ultimate Practical', url: yt('PL6W8uoQQ2c60yO3LbjYkpKikwgAZHAT5o') }],
    intro: 'Playlist: 23 videos, about 17 hours, Spring Boot and Spring Cloud based. 7 are free.',
    notes: [{ heading: 'Not covered in the playlist', lines: ['Saga and outbox in Spring (the Kafka outbox videos fill this), contract testing, Kubernetes deployment.'] }],
  },
  'Redis Roadmap': {
    notionUrl: n('41f1ffd205bf8074be7ffa24b963f145'),
    resources: [
      { title: 'Redis from Basics to Advanced', url: yt('PLJa1lLaD_CrI') },
      { title: 'Redis University: Get Started with Redis', url: 'https://redis.io/tutorials/university/' },
    ],
    intro: 'Playlist: 11 videos, about 4 hours. 5 are free; videos marked (members) are members-only on the Concept && Coding channel.',
  },
  'Backend Projects (5-project roadmap)': {
    notionUrl: n('41f1ffd205bf809c8259c8e0d9b925b7'),
    resources: [
      { title: 'Prasoon Soni, Backend 5 projects roadmap', url: 'https://www.prasoonsoni.in/blog/backend-5-projects-roadmap' },
      { title: 'roadmap.sh backend projects', url: 'https://roadmap.sh/backend/projects' },
    ],
    intro: 'The projects use Node.js and PostgreSQL. Each project lists the matching videos from your playlists, so you learn the theory right before you build. Finish each one with a README and a live link so it is ready for your resume.',
  },

  'System Design Roadmap – HLD & LLD': {
    notionUrl: n('bbe1ffd205bf8276b21d811d253be34c'),
    resources: [
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' },
      { title: 'roadmap.sh - System Design Roadmap', url: 'https://roadmap.sh/system-design' },
    ],
    intro: 'From scalability, networking, caching and databases through sharding, replication, microservices and full HLD case studies, plus SOLID, design patterns, concurrency and LLD interview problems, this roadmap covers every HLD and LLD topic page, from Beginner to Advanced.',
  },
  'System Design: Missing Topics and Video Map': {
    notionUrl: n('41f1ffd205bf808d9fb6f79c1ddc65f6'),
    resources: [
      { title: 'Low Level Design playlist (48 videos)', url: yt('PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW') },
      { title: 'High Level Design playlist (39 videos)', url: yt('PL6W8uoQQ2c63W58rpNFDwdrBnq5G3EfT7') },
    ],
    intro: 'Topics missing from the System Design Roadmap, plus every LLD and HLD video mapped to its topic page. Compared page titles only, so a topic may already sit inside a bigger page. Dependency Injection and Exceptions pages have no matching video.',
  },
  'System Design Roadmap (October version)': {
    notionUrl: n('4041ffd205bf808ca698ffc40a7646d6'),
    resources: [
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' },
      { title: 'roadmap.sh - System Design Roadmap', url: 'https://roadmap.sh/system-design' },
    ],
    intro: 'From the client-server model and HTTP through caching, sharding, replication and message queues to full case studies like URL shorteners and chat systems.',
  },

  'DSA Roadmap (Striver A2Z)': {
    notionUrl: n('4031ffd205bf8079a58ceadecb88f78d'),
    resources: [
      { title: "Striver's A2Z DSA Course Sheet - takeuforward.org", url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/' },
      { title: 'NeetCode Roadmap', url: 'https://neetcode.io/roadmap' },
    ],
    intro: 'From arrays to graphs and dynamic programming, this roadmap takes you step by step through the data structures and algorithms that matter most for interviews and problem solving.',
  },
  'SQL Roadmap': {
    notionUrl: n('4031ffd205bf800fb418f88cbc2a65c1'),
    resources: [
      { title: 'StrataScratch', url: 'https://www.stratascratch.com/' },
      { title: 'SQL Roadmap - roadmap.sh/sql', url: 'https://roadmap.sh/sql' },
    ],
    intro: 'From SELECT statements to window functions and query optimization, this roadmap takes you step by step through the SQL skills that matter most for data roles and technical interviews.',
  },
  'ML Roadmap': {
    notionUrl: n('4041ffd205bf80deabb4c02b0fc58121'),
    toResources: ['Resources'],
    intro: 'From core math and Python foundations to supervised learning, unsupervised learning and deployment basics, this roadmap builds the machine learning skills you need for projects, interviews and real-world ML systems.',
  },
  'Python Roadmap': {
    notionUrl: n('2d21ffd205bf80f39977f82a3970326c'),
    resources: [{ title: 'Python Bootcamp Playlist (2025) - Zero to Hero', url: yt('PLNcg_FV9n7qZGfFl2ANI_zISzNp257Lwn') }],
    intro: "Whether you're starting from scratch or want to specialize in Python for Data, Web, or AI, this roadmap guides you step by step through the skills that matter.",
  },
  'Aptitude Roadmap (October version)': {
    notionUrl: n('4041ffd205bf806a9b24d16de019f83f'),
    toResources: ['Resources'],
    intro: 'From percentages and ratios through probability and data interpretation to logical reasoning and verbal ability, this roadmap covers the quantitative, reasoning and verbal skills tested in placement aptitude rounds.',
  },
  'GATE CS 2027 Roadmap': {
    notionUrl: n('e071ffd205bf8356b1d28157fc9c69e8'),
    intro: 'GATE 2027 (CS): Feb 6, 7, 13, 14, 20 & 21, 2027, conducted by IIT Madras. Marks weightage per subject is shown in brackets.',
  },
  'DBMS Roadmap (takeUforward)': {
    notionUrl: n('4191ffd205bf8021b4a0d2058da32f25'),
    levelBySection: [[7, 'Beginner'], [16, 'Intermediate'], [99, 'Advanced']],
  },
  'Operating Systems Roadmap (takeUforward)': {
    notionUrl: n('4191ffd205bf8097a5aadc52f9a8e12d'),
    levelBySection: [[4, 'Beginner'], [9, 'Intermediate'], [99, 'Advanced']],
  },
  'Computer Networks Roadmap (takeUforward)': {
    notionUrl: n('4191ffd205bf80ce8c72c4d91225f444'),
    levelBySection: [[4, 'Beginner'], [9, 'Intermediate'], [99, 'Advanced']],
  },
  'OOPS Roadmap (takeUforward)': {
    notionUrl: n('4191ffd205bf80789685e95257ecb7c6'),
    levelBySection: [[2, 'Beginner'], [4, 'Intermediate'], [99, 'Advanced']],
  },
  'Verbal Aptitude Roadmap': { notionUrl: n('41a1ffd205bf8069a5e8de3132f18768') },
  'Logical Aptitude Roadmap': { notionUrl: n('41a1ffd205bf80f6a086cd7845c2eed3') },
  'Quantitative Aptitude Roadmap': { notionUrl: n('41a1ffd205bf805bb8d6c1b6f0d8ebbd') },
  'Power BI Roadmap': { notionUrl: n('21c1ffd205bf82b484fc813b2a41354c') },
  'System Design Roadmap 2 (video list)': { notionUrl: n('7131ffd205bf82edbc030172096ce664') },
};
