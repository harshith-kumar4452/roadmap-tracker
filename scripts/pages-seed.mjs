// Builds seed/pages.json: starter cheat sheets, projects and mindmaps.
// Run: node scripts/pages-seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pages = [
  {
    kind: 'project',
    title: 'AI Code Review & Repository Assistant',
    summary: 'An AI tool that understands a codebase: summarises repos, reviews pull requests and suggests tests, with a developer in control.',
    tags: ['AI', 'RAG', 'Backend'],
    status: 'idea',
    body: `[Notion page](https://app.notion.com/p/41b1ffd205bf808baebfc87a2bc7d29b)

Build an AI tool that understands a codebase, not just a chatbot that answers prompts.

## The problem
Developers spend time understanding unfamiliar repositories, reviewing pull requests, finding risky changes, and writing tests. Build a repository assistant that helps with those workflows while keeping a human developer in control.

## Core features
- [ ] Connect a GitHub repository and index relevant source files
- [ ] Summarise a repository, explain selected modules, and answer questions grounded in the codebase
- [ ] Review pull requests and flag possible bugs, risky changes, missing tests, or security concerns
- [ ] Suggest test cases and code improvements; require developer approval before any write action
- [ ] Show evidence for findings (file paths and line references), and let users mark feedback as useful or incorrect

## Suggested tech stack
| Part | Choice |
| --- | --- |
| Backend & APIs | Java + Spring Boot or Python + FastAPI; REST APIs |
| Repository integration | GitHub App/API, webhooks, OAuth |
| AI layer | LLM API, embeddings, RAG, tool calling |
| Storage | PostgreSQL; a vector store such as pgvector or Chroma |
| Background work | Redis-backed queue or a message broker for indexing jobs |
| Delivery | Docker, CI/CD, cloud deployment, structured logs and metrics |

## What you will learn
- API design, OAuth, webhook validation, and secure integration with third-party platforms
- RAG, chunking, embeddings, retrieval quality, prompt/tool design, and AI evaluation
- Asynchronous jobs, rate limits, retries, access control, and handling large repositories
- Testing, observability, deployment, and human-in-the-loop safeguards

## Advanced extension
Add a CI check that posts a review summary on a pull request, a benchmark dataset for evaluating findings, and safeguards against prompt injection hidden in repository files.

> Demonstrates AI engineering grounded in real developer workflows, external integrations, and production-minded safeguards.`,
  },
  {
    kind: 'mindmap',
    title: 'My learning map',
    summary: 'All 30 roadmaps, grouped by area.',
    tags: ['Overview'],
    body: `- Backend
  - Node.js Backend (Chai aur Code)
  - Backend from First Principles
  - Backend Projects (5 projects)
  - Microservices
  - Kafka
  - Redis
  - Redis Internals
- System Design
  - HLD & LLD
  - October version
  - Video list (Roadmap 2)
  - Missing Topics & Video Map
  - Arpit System Design Map
  - HLD Build Projects
- Core CS
  - DBMS
  - Operating Systems
  - Computer Networks
  - OOPS
  - SQL
- DSA
  - Striver A2Z
- Cloud & Tools
  - AWS
  - Git
- Frontend
  - React
- Data & ML
  - Python
  - Machine Learning
  - Power BI
- Placement Prep
  - Aptitude (October version)
  - Quantitative Aptitude
  - Logical Aptitude
  - Verbal Aptitude
  - GATE CS 2027`,
  },
  {
    kind: 'cheatsheet',
    title: 'Redis commands',
    summary: 'The everyday commands for each data type, plus keys, expiry and transactions.',
    tags: ['Redis', 'Backend'],
    body: `## Strings
| Command | What it does |
| --- | --- |
| \`SET key value [EX s] [NX\\|XX]\` | Set a value; \`EX\` adds a TTL, \`NX\` only if missing, \`XX\` only if present |
| \`GET key\` | Read a value |
| \`INCR key\` / \`INCRBY key n\` | Atomic counter |
| \`MSET k1 v1 k2 v2\` / \`MGET k1 k2\` | Several keys in one round trip |
| \`APPEND key value\` | Append to a string |

## Keys and expiry
| Command | What it does |
| --- | --- |
| \`EXPIRE key s\` / \`TTL key\` | Set / read time to live (\`-1\` no TTL, \`-2\` missing) |
| \`PERSIST key\` | Remove the TTL |
| \`DEL key\` / \`UNLINK key\` | Delete (UNLINK frees memory in the background) |
| \`EXISTS key\` | 1 if the key exists |
| \`TYPE key\` | string, list, set, zset, hash, stream |
| \`SCAN 0 MATCH user:* COUNT 100\` | Iterate keys safely; never use \`KEYS *\` in production |

## Lists
| Command | What it does |
| --- | --- |
| \`LPUSH\` / \`RPUSH key v…\` | Push to head / tail |
| \`LPOP\` / \`RPOP key\` | Pop from head / tail |
| \`BLPOP key timeout\` | Blocking pop: a simple job queue |
| \`LRANGE key 0 -1\` | Read the whole list |
| \`LTRIM key 0 99\` | Keep only the first 100 (capped list) |

## Hashes
| Command | What it does |
| --- | --- |
| \`HSET key field value …\` | Set fields |
| \`HGET key field\` / \`HGETALL key\` | Read one / all fields |
| \`HINCRBY key field n\` | Counter inside a hash |
| \`HDEL key field\` | Remove a field |

## Sets
| Command | What it does |
| --- | --- |
| \`SADD key m…\` / \`SREM key m\` | Add / remove members |
| \`SISMEMBER key m\` | Membership test |
| \`SMEMBERS key\` / \`SCARD key\` | All members / count |
| \`SINTER\` / \`SUNION\` / \`SDIFF\` | Set algebra |

## Sorted sets
| Command | What it does |
| --- | --- |
| \`ZADD key score member\` | Add with a score |
| \`ZINCRBY key n member\` | Bump a score (leaderboards) |
| \`ZRANGE key 0 9 REV WITHSCORES\` | Top 10 |
| \`ZRANK\` / \`ZSCORE key member\` | Position / score |
| \`ZRANGEBYSCORE key min max\` | Range by score (sliding-window rate limits) |

## Streams and pub/sub
| Command | What it does |
| --- | --- |
| \`XADD stream * field value\` | Append an entry |
| \`XREAD COUNT 10 STREAMS stream 0\` | Read entries |
| \`XGROUP CREATE\` / \`XREADGROUP\` / \`XACK\` | Consumer groups |
| \`PUBLISH channel msg\` / \`SUBSCRIBE channel\` | Fire-and-forget messaging |

## Transactions and scripts
\`\`\`
MULTI
INCR page:views
EXPIRE page:views 3600
EXEC
\`\`\`
- \`WATCH key\` before \`MULTI\` for optimistic locking: \`EXEC\` returns nil if the key changed.
- \`EVAL "return redis.call('GET', KEYS[1])" 1 mykey\` runs Lua atomically.

## Inspecting the server
- \`INFO memory\`, \`INFO stats\`: memory use, hits and misses
- \`MEMORY USAGE key\`: bytes used by one key
- \`SLOWLOG GET 10\`: slowest recent commands
- \`OBJECT ENCODING key\`: internal encoding (listpack, hashtable, skiplist…)`,
  },
  {
    kind: 'cheatsheet',
    title: 'Git commands',
    summary: 'Branching, undoing mistakes, syncing with remotes and digging through history.',
    tags: ['Git', 'Tools'],
    body: `## Everyday
\`\`\`
git status
git add -p              # stage hunk by hunk
git commit -m "message"
git log --oneline --graph --all
git diff                # unstaged changes
git diff --staged       # what will be committed
\`\`\`

## Branches
| Command | What it does |
| --- | --- |
| \`git switch -c feature\` | Create and switch to a branch |
| \`git switch main\` | Switch branches |
| \`git branch -d feature\` | Delete a merged branch |
| \`git merge feature\` | Merge into the current branch |
| \`git rebase main\` | Replay your commits on top of main |

## Remotes
| Command | What it does |
| --- | --- |
| \`git fetch\` | Download without changing your branches |
| \`git pull --rebase\` | Fetch and rebase your local commits |
| \`git push -u origin feature\` | Push and set upstream |
| \`git push --force-with-lease\` | Safe force push after a rebase |

## Undoing things
| Situation | Command |
| --- | --- |
| Discard changes in a file | \`git restore file\` |
| Unstage a file | \`git restore --staged file\` |
| Fix the last commit message or add a file | \`git commit --amend\` |
| Undo the last commit, keep changes | \`git reset --soft HEAD~1\` |
| Undo a pushed commit safely | \`git revert <sha>\` |
| Find a "lost" commit | \`git reflog\` |

## Stash
\`\`\`
git stash push -m "wip"
git stash list
git stash pop
\`\`\`

## Digging through history
- \`git blame -L 10,20 file\`: who changed these lines
- \`git log -S "text"\`: commits that added or removed a string
- \`git bisect start\` → \`git bisect bad\` / \`git bisect good <sha>\`: binary-search for the commit that broke something
- \`git show <sha>\`: one commit's changes`,
  },
];

fs.writeFileSync(path.join(root, 'seed', 'pages.json'), JSON.stringify(pages, null, 2) + '\n');
console.log(`Wrote ${pages.length} pages to seed/pages.json`);
