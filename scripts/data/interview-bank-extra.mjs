// Interview questions with full answers, written for this project, for the categories the roadmaps
// don't cover (AI, HR / Behavioral) and extra DSA coding questions. Answers are Markdown.
// Used by scripts/build-interview-bank.mjs. d: Easy | Medium | Hard.

export default [
  // ---------------- Artificial Intelligence ----------------
  { category: 'Artificial Intelligence', topic: 'LLM basics', d: 'Easy', type: 'conceptual',
    q: 'What is a large language model and how does it generate text?',
    a: `A large language model (LLM) is a neural network, almost always a **Transformer**, trained on a huge amount of text to predict the next token.

**Generation loop**
1. The prompt is split into tokens (sub-word pieces) and turned into vectors.
2. The model computes a probability for every token in its vocabulary as the next one.
3. One token is picked (greedy, or sampled using temperature / top-p).
4. It is appended to the input and the loop repeats until a stop token or length limit.

Because it only predicts likely continuations, an LLM can produce fluent but wrong statements ("hallucinations"); grounding (RAG, tools) and evaluation reduce that.` },
  { category: 'Artificial Intelligence', topic: 'Transformers', d: 'Medium', type: 'conceptual',
    q: 'Explain self-attention in a Transformer. Why did it replace RNNs?',
    a: `Each token is projected into a **query (Q)**, **key (K)** and **value (V)** vector. Attention scores are \`softmax(Q·Kᵀ / √d)\`; each token's output is the weighted sum of all values, so every token can look at every other token in one step.

\`\`\`python
import numpy as np
def attention(Q, K, V):
    scores = Q @ K.T / np.sqrt(K.shape[-1])
    w = np.exp(scores - scores.max(-1, keepdims=True))
    w /= w.sum(-1, keepdims=True)
    return w @ V
\`\`\`

**Why it beat RNNs**
- Whole sequences are processed in parallel (RNNs are step-by-step), so training on GPUs is far faster.
- Long-range dependencies are one hop away instead of passing through many steps (no vanishing gradient across time).
- Multi-head attention lets different heads learn different relations.

Cost: attention is O(n²) in sequence length, which is why long-context models use tricks like sparse or flash attention.` },
  { category: 'Artificial Intelligence', topic: 'Tokens and context', d: 'Easy', type: 'conceptual',
    q: 'What are tokens and a context window, and why do they matter when building with LLMs?',
    a: `**Tokens** are the units a model reads and writes: whole words, word pieces or punctuation (roughly 3–4 English characters per token). The **context window** is the maximum number of tokens the model can see at once (prompt + output).

They matter because:
- **Cost and latency** are billed / scale per token.
- Anything outside the window is invisible to the model, so long documents must be chunked, summarised or retrieved selectively.
- Output length limits mean long answers can be cut off (check the finish reason).` },
  { category: 'Artificial Intelligence', topic: 'RAG', d: 'Medium', type: 'system-design',
    q: 'What is Retrieval-Augmented Generation (RAG)? Walk through a basic pipeline.',
    a: `RAG grounds an LLM's answer in your own documents by retrieving relevant passages at question time and putting them in the prompt.

**Indexing (offline)**
1. Split documents into chunks (e.g. 300–800 tokens with overlap).
2. Turn each chunk into an embedding vector.
3. Store vectors + text in a vector database (pgvector, Pinecone, Atlas Vector Search…).

**Query time**
1. Embed the user question.
2. Retrieve the top-k most similar chunks (often hybrid: vector + keyword/BM25), optionally re-rank.
3. Prompt: "Answer using only these sources…" + chunks + question.
4. Return the answer with citations.

**Why**: fresher and private knowledge without retraining, fewer hallucinations, sources the user can check. **Pitfalls**: bad chunking, retrieving irrelevant text, and not evaluating retrieval quality separately from answer quality.` },
  { category: 'Artificial Intelligence', topic: 'Embeddings', d: 'Medium', type: 'conceptual',
    q: 'What are embeddings and how is similarity search done on them?',
    a: `An **embedding** is a fixed-length vector that represents the meaning of a piece of text (or an image); similar meanings land close together.

Similarity is usually **cosine similarity**: \`cos(a, b) = a·b / (|a||b|)\`. Exact search compares the query with every vector (O(n)); at scale you use **approximate nearest neighbour** indexes such as HNSW or IVF, trading a little recall for big speedups.

Uses: semantic search, RAG retrieval, clustering, deduplication and recommendations.` },
  { category: 'Artificial Intelligence', topic: 'Prompting', d: 'Easy', type: 'conceptual',
    q: 'What prompt-engineering techniques improve LLM output quality?',
    a: `- **Clear role and task**: say exactly what to produce, for whom, and in what format.
- **Context**: give the facts the model needs instead of hoping it knows them.
- **Examples (few-shot)**: show 1–3 input → output pairs.
- **Structured output**: ask for JSON matching a schema and validate it.
- **Step-by-step reasoning** for multi-step problems, or let the model think before answering.
- **Constraints**: length, tone, what to do when unsure ("say you don't know").
- **Iterate with an eval set**: measure changes on fixed test cases rather than eyeballing one example.` },
  { category: 'Artificial Intelligence', topic: 'Hallucination', d: 'Medium', type: 'conceptual',
    q: 'Why do LLMs hallucinate and how do you reduce it in a product?',
    a: `LLMs are trained to produce *plausible* continuations, not verified facts; when the answer isn't well represented in training data or the prompt, the most plausible text can be wrong.

**Mitigations**
- Ground answers with retrieval (RAG) and require citations.
- Give the model permission to say "I don't know".
- Use tools for facts and maths (search, calculators, databases).
- Lower temperature for factual tasks.
- Validate outputs (schemas, rule checks, a second model as a judge).
- Keep a human in the loop for high-stakes actions, and evaluate on a labelled test set.` },
  { category: 'Artificial Intelligence', topic: 'Fine-tuning', d: 'Medium', type: 'conceptual',
    q: 'When would you fine-tune a model instead of using prompting or RAG?',
    a: `| Need | Best tool |
|---|---|
| New / changing facts, private documents | **RAG** |
| A task the base model already does, with a format | **Prompting** (+ few-shot) |
| Consistent style, tone or narrow output format at scale; a smaller, cheaper model matching a big one on one task | **Fine-tuning** |

Fine-tuning teaches *behaviour*, not reliable facts. It needs a few hundred to thousands of good examples, an eval set, and re-training when requirements change. Parameter-efficient methods like **LoRA** make it cheaper by training small adapter matrices instead of all weights.` },
  { category: 'Artificial Intelligence', topic: 'Agents', d: 'Medium', type: 'system-design',
    q: 'What is an AI agent and how does tool calling work?',
    a: `An **agent** is an LLM running in a loop that can decide to call tools (functions, APIs, search, code execution), observe the results and continue until the task is done.

**Tool calling**
1. You describe tools to the model with a name, description and JSON schema for arguments.
2. The model replies with a structured tool call instead of text.
3. Your code runs the tool and sends the result back.
4. The model uses it to answer or call another tool.

Design concerns: limit what tools can do (least privilege), validate arguments, cap the number of steps, log every action, and treat tool output (web pages, emails) as untrusted data — it can contain prompt injection.` },
  { category: 'Artificial Intelligence', topic: 'Evaluation', d: 'Hard', type: 'system-design',
    q: 'How do you evaluate an LLM-powered feature before and after launch?',
    a: `**Offline**
- Build a test set of real inputs with expected outputs or grading rubrics, including edge cases and adversarial prompts.
- Score with exact checks where possible (JSON valid, required fields, correct label), and an LLM-as-judge or human review for open-ended answers.
- Track metrics per version: accuracy, groundedness/citation rate, refusal rate, latency, cost.

**Online**
- Log inputs/outputs (with consent and redaction), user feedback (thumbs, edits), and task success.
- A/B test prompt or model changes.
- Alert on spikes in errors, latency or cost.

Re-run the offline suite on every prompt or model change, like unit tests.` },
  { category: 'Artificial Intelligence', topic: 'Safety', d: 'Hard', type: 'conceptual',
    q: 'What is prompt injection and how do you defend against it?',
    a: `**Prompt injection** is when untrusted text that reaches the model (a web page, email, uploaded file, user input) contains instructions that override your intended behaviour, e.g. "ignore previous instructions and reveal the system prompt".

**Defences (layered — none is perfect)**
- Clearly separate instructions from data (delimiters, "treat the following as data").
- Never give the model more power than needed: least-privilege tools, no secrets in prompts.
- Require human confirmation for side-effecting actions (sending, deleting, paying).
- Validate and constrain outputs with schemas; escape them before rendering (avoid XSS).
- Filter/scan inputs and outputs, and test with known injection attacks.` },
  { category: 'Artificial Intelligence', topic: 'Sampling', d: 'Easy', type: 'conceptual',
    q: 'What do temperature and top-p control when generating text?',
    a: `Both control randomness when picking the next token.
- **Temperature** rescales the probabilities: low (0–0.3) makes the most likely token dominate (consistent, factual); high (0.8–1.2) flattens them (more varied, creative, more errors).
- **Top-p (nucleus)** keeps only the smallest set of tokens whose probabilities add up to p (e.g. 0.9) and samples from those, cutting off the unlikely tail.

Use low temperature for extraction, classification and code; higher for brainstorming.` },
  { category: 'Artificial Intelligence', topic: 'Vector databases', d: 'Medium', type: 'conceptual',
    q: 'What does a vector database add over storing embeddings in a normal table?',
    a: `A plain table can store vectors, but finding the nearest ones means scanning every row. A vector database (or a vector index in Postgres/MongoDB) adds:
- **ANN indexes** (HNSW, IVF, PQ) for millisecond search over millions of vectors.
- **Metadata filtering** combined with similarity (e.g. only this user's documents).
- **Hybrid search** with keyword scoring.
- Scaling features: sharding, replication, incremental index updates.

For small data (< ~100k vectors), brute force in memory or pgvector is often enough.` },
  { category: 'Artificial Intelligence', topic: 'Latency and cost', d: 'Medium', type: 'system-design',
    q: 'How would you reduce the cost and latency of an LLM feature in production?',
    a: `- **Pick the smallest model that passes your eval**; route only hard requests to a larger one.
- **Shorten prompts**: trim context, retrieve fewer/better chunks, cap output tokens.
- **Cache**: identical requests, and provider prompt caching for long shared prefixes.
- **Stream** responses so users see output immediately.
- **Batch** offline jobs.
- **Do work without the model** where rules suffice (regex, lookups).
- Monitor cost per request and set budgets / rate limits per user.` },
  { category: 'Artificial Intelligence', topic: 'ML vs DL vs AI', d: 'Easy', type: 'conceptual',
    q: 'What is the difference between AI, machine learning, deep learning and generative AI?',
    a: `- **AI**: the broad goal of making machines do tasks that need intelligence (includes rule-based systems and search).
- **Machine learning**: a subset where systems learn patterns from data instead of hand-written rules.
- **Deep learning**: ML using multi-layer neural networks, which learn features automatically from raw data (images, audio, text).
- **Generative AI**: models (usually deep learning — Transformers, diffusion models) that produce new content such as text, images or code.` },

  // ---------------- HR and Behavioral ----------------
  { category: 'HR and Behavioral', topic: 'Introduction', d: 'Easy', type: 'behavioral',
    q: 'Tell me about yourself.',
    a: `Aim for 60–90 seconds, structured **present → past → future**:
1. **Present**: who you are now (e.g. final-year CS student focusing on backend development).
2. **Past**: 2–3 highlights that prove it — a project with a measurable result, an internship, a competition.
3. **Future**: why this role and company is the logical next step.

Keep it relevant to the job; skip your full life story and anything already obvious from the CV. Practise it out loud until it sounds natural, not memorised.` },
  { category: 'HR and Behavioral', topic: 'STAR method', d: 'Easy', type: 'behavioral',
    q: 'What is the STAR method and how should you use it for behavioral questions?',
    a: `STAR structures a story so the interviewer can follow it and judge your contribution:
- **Situation** — brief context (1–2 sentences).
- **Task** — what you were responsible for.
- **Action** — what *you* did, step by step (the longest part; say "I", not "we").
- **Result** — the outcome, ideally with a number, and what you learned.

Prepare 6–8 stories (a conflict, a failure, leadership, a tight deadline, a hard technical problem) that you can adapt to many questions.` },
  { category: 'HR and Behavioral', topic: 'Strengths and weaknesses', d: 'Easy', type: 'behavioral',
    q: 'What is your greatest weakness?',
    a: `Pick a **real but non-critical** weakness, show self-awareness, and show what you're doing about it.

Example: *"I used to take on too much myself instead of asking for help early. On my last project that delayed a feature by two days, so now I flag blockers in stand-up within a few hours and break tasks into smaller pieces. It's improved how quickly the team unblocks me."*

Avoid clichés ("I'm a perfectionist") and anything that's a core requirement of the job.` },
  { category: 'HR and Behavioral', topic: 'Conflict', d: 'Medium', type: 'behavioral',
    q: 'Tell me about a time you disagreed with a teammate. How did you handle it?',
    a: `Use STAR and show you can disagree respectfully and focus on the outcome:
- **S/T**: the disagreement (e.g. choice of database for a project) and why it mattered.
- **A**: you listened to their reasoning, compared options with data (a quick benchmark, pros/cons), proposed a decision rule, and escalated or compromised if needed.
- **R**: the decision, the outcome, and that the working relationship stayed good.

Don't make the other person the villain, and don't pick a story where you were simply right and they gave in.` },
  { category: 'HR and Behavioral', topic: 'Failure', d: 'Medium', type: 'behavioral',
    q: 'Describe a time you failed. What did you learn?',
    a: `Choose a genuine failure with real consequences that you owned.
- Describe what happened briefly and **your** part in it.
- Explain what you did to recover or limit the damage.
- Most important: the specific lesson and **how you've applied it since** (with evidence).

Interviewers look for ownership, honesty and growth — not perfection.` },
  { category: 'HR and Behavioral', topic: 'Motivation', d: 'Easy', type: 'behavioral',
    q: 'Why do you want to work at this company?',
    a: `Show you've researched them and connect it to your goals:
1. Something specific about the company — product, engineering blog post, tech stack, mission or recent launch.
2. How the role matches your skills and what you want to learn.
3. What you'd contribute.

Avoid generic answers ("it's a big company", "good salary") that could apply anywhere.` },
  { category: 'HR and Behavioral', topic: 'Leadership', d: 'Medium', type: 'behavioral',
    q: 'Tell me about a time you took the lead without being asked.',
    a: `Pick a story where you noticed a problem and acted: e.g. the team kept breaking the build, so you set up CI checks and a short guide.
- **Action**: how you got buy-in, organised the work and helped others.
- **Result**: measurable impact (fewer broken builds, faster releases).

Leadership here means initiative and influence, not a title.` },
  { category: 'HR and Behavioral', topic: 'Pressure', d: 'Medium', type: 'behavioral',
    q: 'How do you handle tight deadlines and pressure?',
    a: `Give a short method and a real example:
- Clarify what "done" means and what's truly required.
- Break the work down and prioritise the highest-impact pieces first.
- Communicate early if scope or timing is at risk, with options.
- Protect focus time; avoid heroics that create bugs.

Then tell one STAR story where this worked, with the result.` },
  { category: 'HR and Behavioral', topic: 'Learning', d: 'Easy', type: 'behavioral',
    q: 'How do you learn a new technology quickly?',
    a: `Describe a repeatable process and a recent example:
1. Read the official getting-started guide and understand core concepts.
2. Build something small and real immediately.
3. Read others' code and the docs for the parts you use.
4. Ask experienced people targeted questions.
5. Write notes or teach it back.

Example: "I learned Redis in a week for a project by building a cache layer for my API, which cut response time from 300 ms to 40 ms."` },
  { category: 'HR and Behavioral', topic: 'Goals', d: 'Easy', type: 'behavioral',
    q: 'Where do you see yourself in five years?',
    a: `Show ambition aligned with the role, not a plan to leave: *"I want to become a strong backend engineer who owns systems end to end, mentors newer engineers, and has led the design of a significant service. This role's focus on distributed systems is a big step towards that."*

Be honest but keep it about growth and impact.` },
  { category: 'HR and Behavioral', topic: 'Feedback', d: 'Medium', type: 'behavioral',
    q: 'Tell me about a time you received critical feedback.',
    a: `- **Situation**: who gave it and what it was (e.g. code reviews pointed out your PRs were too large to review).
- **Action**: you didn't get defensive; you asked for specifics and changed your process (smaller PRs, clearer descriptions).
- **Result**: faster reviews, fewer bugs, and you now seek feedback proactively.` },
  { category: 'HR and Behavioral', topic: 'Teamwork', d: 'Easy', type: 'behavioral',
    q: 'Describe your role in a successful team project.',
    a: `Be specific about **your** contribution while crediting the team:
- The project goal and team size.
- Your responsibilities and the hardest problem you solved.
- How you collaborated (reviews, pairing, splitting work).
- The measurable result.

Avoid "we did everything" with no clear personal contribution.` },
  { category: 'HR and Behavioral', topic: 'Salary', d: 'Medium', type: 'behavioral',
    q: 'What are your salary expectations?',
    a: `Research the market range for the role, level and location first (Glassdoor, Levels.fyi, peers).
- If possible, ask about the budgeted range first.
- If you must give a number, give a **researched range** whose bottom you'd be happy with.
- Mention you're flexible depending on the whole package (learning, role, benefits).

For campus roles the package is often fixed; it's fine to say you're comfortable with the standard offer.` },
  { category: 'HR and Behavioral', topic: 'Questions for interviewer', d: 'Easy', type: 'behavioral',
    q: 'What questions should you ask the interviewer at the end?',
    a: `Always ask 2–3 genuine questions, for example:
- "What does a typical week look like for someone in this role?"
- "How do you measure success in the first six months?"
- "What's the biggest technical challenge the team is facing?"
- "How do code reviews and mentoring work here?"

Avoid questions answered on the website, and don't lead with salary or leave in a technical round.` },
  { category: 'HR and Behavioral', topic: 'Ambiguity', d: 'Hard', type: 'behavioral',
    q: 'Tell me about a time you worked on a problem with unclear requirements.',
    a: `Show how you reduce ambiguity rather than freeze or guess:
- Identify the stakeholders and the real goal behind the request.
- Ask clarifying questions and write down assumptions.
- Build a small prototype or proposal to get early feedback.
- Iterate, and confirm the definition of done.

Finish with the outcome and what you'd do the same way again.` },

  // ---------------- Data Structures & Algorithms (coding) ----------------
  { category: 'Data Structures & Algorithms', topic: 'Complexity', d: 'Easy', type: 'conceptual',
    q: 'What is Big-O notation? Give the time complexity of common operations on arrays, hash maps and balanced BSTs.',
    a: `Big-O describes how running time (or memory) grows with input size *n*, ignoring constants — an upper bound on growth.

| Operation | Array | Hash map | Balanced BST |
|---|---|---|---|
| Access by index | O(1) | — | — |
| Search by value/key | O(n) | O(1) avg, O(n) worst | O(log n) |
| Insert / delete | O(n) (shifting) | O(1) avg | O(log n) |
| Ordered iteration | sort O(n log n) | not ordered | O(n) |` },
  { category: 'Data Structures & Algorithms', topic: 'Hashing', d: 'Easy', type: 'coding',
    q: 'Solve Two Sum: return indices of the two numbers that add up to a target. What is the optimal approach?',
    a: `Brute force checks every pair: O(n²). Optimal: one pass with a hash map from value → index; for each number, check if \`target - num\` was already seen.

\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
\`\`\`
**Time** O(n), **space** O(n).` },
  { category: 'Data Structures & Algorithms', topic: 'Two pointers', d: 'Medium', type: 'coding',
    q: 'How do you find the container with the most water (max area between two lines)?',
    a: `Use two pointers at both ends. The area is limited by the shorter line, so move the pointer at the shorter line inward — moving the taller one can never increase the area.

\`\`\`python
def max_area(h):
    i, j, best = 0, len(h) - 1, 0
    while i < j:
        best = max(best, (j - i) * min(h[i], h[j]))
        if h[i] < h[j]: i += 1
        else: j -= 1
    return best
\`\`\`
**Time** O(n), **space** O(1).` },
  { category: 'Data Structures & Algorithms', topic: 'Sliding window', d: 'Medium', type: 'coding',
    q: 'Find the length of the longest substring without repeating characters.',
    a: `Sliding window with the last index of each character: when a repeat appears inside the window, move the left edge past its previous position.

\`\`\`python
def longest_unique(s):
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
\`\`\`
**Time** O(n), **space** O(min(n, alphabet)).` },
  { category: 'Data Structures & Algorithms', topic: 'Linked lists', d: 'Easy', type: 'coding',
    q: 'Reverse a singly linked list iteratively and explain the pointer changes.',
    a: `Walk the list keeping \`prev\`; for each node, save \`next\`, point the node back to \`prev\`, then advance.

\`\`\`python
def reverse(head):
    prev = None
    while head:
        nxt = head.next
        head.next = prev
        prev, head = head, nxt
    return prev
\`\`\`
**Time** O(n), **space** O(1). The recursive version is also O(n) time but uses O(n) stack.` },
  { category: 'Data Structures & Algorithms', topic: 'Linked lists', d: 'Medium', type: 'coding',
    q: 'How do you detect a cycle in a linked list and find where it starts?',
    a: `**Floyd's tortoise and hare**: slow moves 1 step, fast moves 2. If they meet, there is a cycle. Then reset one pointer to the head and move both 1 step at a time; they meet at the cycle start (the distances from head and from the meeting point to the start are equal modulo the cycle length).

\`\`\`python
def cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            slow = head
            while slow is not fast:
                slow, fast = slow.next, fast.next
            return slow
    return None
\`\`\`
**Time** O(n), **space** O(1).` },
  { category: 'Data Structures & Algorithms', topic: 'Binary search', d: 'Medium', type: 'coding',
    q: 'Search for a target in a rotated sorted array in O(log n).',
    a: `At every step one half of the range is sorted. Check whether the target lies in the sorted half; if so search there, otherwise search the other half.

\`\`\`python
def search(nums, t):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == t: return mid
        if nums[lo] <= nums[mid]:            # left half sorted
            if nums[lo] <= t < nums[mid]: hi = mid - 1
            else: lo = mid + 1
        else:                                 # right half sorted
            if nums[mid] < t <= nums[hi]: lo = mid + 1
            else: hi = mid - 1
    return -1
\`\`\`` },
  { category: 'Data Structures & Algorithms', topic: 'Stacks', d: 'Easy', type: 'coding',
    q: 'Check whether a string of brackets is valid.',
    a: `Push opening brackets on a stack; on a closing bracket the top must be its matching opener.

\`\`\`python
def is_valid(s):
    pairs, stack = {')': '(', ']': '[', '}': '{'}, []
    for c in s:
        if c in pairs:
            if not stack or stack.pop() != pairs[c]:
                return False
        else:
            stack.append(c)
    return not stack
\`\`\`
**Time** O(n), **space** O(n).` },
  { category: 'Data Structures & Algorithms', topic: 'Trees', d: 'Medium', type: 'coding',
    q: 'Return the level-order traversal of a binary tree.',
    a: `BFS with a queue, processing one level at a time (the queue length at the start of each loop is the level size).

\`\`\`python
from collections import deque
def level_order(root):
    if not root: return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out
\`\`\`
**Time** O(n), **space** O(width).` },
  { category: 'Data Structures & Algorithms', topic: 'Trees', d: 'Medium', type: 'coding',
    q: 'How do you check whether a binary tree is a valid binary search tree?',
    a: `Every node must lie within bounds inherited from its ancestors (checking only parent vs child is a common bug).

\`\`\`python
def is_bst(node, lo=float('-inf'), hi=float('inf')):
    if not node: return True
    if not (lo < node.val < hi): return False
    return is_bst(node.left, lo, node.val) and is_bst(node.right, node.val, hi)
\`\`\`
Alternative: an in-order traversal must be strictly increasing. **Time** O(n), **space** O(h).` },
  { category: 'Data Structures & Algorithms', topic: 'Graphs', d: 'Medium', type: 'coding',
    q: 'Count the number of islands in a grid of 1s and 0s.',
    a: `Scan the grid; each time you find unvisited land, increment the count and flood-fill (DFS/BFS) all connected land so it isn't counted again.

\`\`\`python
def num_islands(g):
    R, C, count = len(g), len(g[0]), 0
    def sink(r, c):
        if 0 <= r < R and 0 <= c < C and g[r][c] == '1':
            g[r][c] = '0'
            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)): sink(r+dr, c+dc)
    for r in range(R):
        for c in range(C):
            if g[r][c] == '1':
                count += 1; sink(r, c)
    return count
\`\`\`
**Time** O(R·C). Use iterative BFS for very large grids to avoid recursion limits.` },
  { category: 'Data Structures & Algorithms', topic: 'Graphs', d: 'Hard', type: 'conceptual',
    q: 'Compare BFS, Dijkstra and Bellman-Ford for shortest paths. When do you use each?',
    a: `| Algorithm | Graph | Time | Notes |
|---|---|---|---|
| **BFS** | unweighted (or all equal weights) | O(V + E) | first visit = shortest |
| **Dijkstra** | non-negative weights | O((V + E) log V) with a heap | greedy; breaks with negative edges |
| **Bellman-Ford** | negative weights allowed | O(V·E) | detects negative cycles (an extra relaxation still improves) |

0-1 BFS (deque) handles weights of only 0 and 1 in O(V + E); Floyd-Warshall gives all-pairs in O(V³).` },
  { category: 'Data Structures & Algorithms', topic: 'Dynamic programming', d: 'Medium', type: 'conceptual',
    q: 'What is dynamic programming? Explain memoization vs tabulation with an example.',
    a: `DP solves problems with **overlapping subproblems** and **optimal substructure** by storing sub-results instead of recomputing them.

- **Memoization (top-down)**: write the recursion, cache results.
- **Tabulation (bottom-up)**: fill a table from the smallest subproblems.

\`\`\`python
# Climbing stairs (1 or 2 steps): ways(n) = ways(n-1) + ways(n-2)
from functools import cache
@cache
def ways(n): return 1 if n <= 1 else ways(n-1) + ways(n-2)

def ways_tab(n):
    a, b = 1, 1
    for _ in range(n - 1): a, b = b, a + b
    return b
\`\`\`
Both are O(n) time; the tabulated version uses O(1) space.` },
  { category: 'Data Structures & Algorithms', topic: 'Dynamic programming', d: 'Hard', type: 'coding',
    q: 'Find the length of the longest increasing subsequence in O(n log n).',
    a: `Keep \`tails[k]\` = the smallest possible tail of an increasing subsequence of length k+1. For each number, binary-search the first tail ≥ it and replace it (or append if larger than all).

\`\`\`python
from bisect import bisect_left
def lis(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails): tails.append(x)
        else: tails[i] = x
    return len(tails)
\`\`\`
\`tails\` isn't the subsequence itself, but its length is the answer. The simple DP is O(n²).` },
  { category: 'Data Structures & Algorithms', topic: 'Heaps', d: 'Medium', type: 'coding',
    q: 'Find the k most frequent elements in an array.',
    a: `Count with a hash map, then keep a min-heap of size k (or bucket sort by frequency for O(n)).

\`\`\`python
from collections import Counter
import heapq
def top_k(nums, k):
    return [x for x, _ in heapq.nlargest(k, Counter(nums).items(), key=lambda p: p[1])]
\`\`\`
**Time** O(n log k), **space** O(n).` },
  { category: 'Data Structures & Algorithms', topic: 'Sorting', d: 'Medium', type: 'conceptual',
    q: 'Compare merge sort, quicksort and heap sort.',
    a: `| | Merge sort | Quicksort | Heap sort |
|---|---|---|---|
| Average time | O(n log n) | O(n log n) | O(n log n) |
| Worst time | O(n log n) | O(n²) (bad pivots) | O(n log n) |
| Extra space | O(n) | O(log n) stack | O(1) |
| Stable | yes | no | no |

Quicksort is usually fastest in practice (cache-friendly); randomised pivots make the worst case unlikely. Merge sort suits linked lists and external sorting and is stable. Heap sort guarantees O(n log n) with O(1) space.` },
  { category: 'Data Structures & Algorithms', topic: 'Backtracking', d: 'Medium', type: 'coding',
    q: 'Generate all subsets of a set of distinct integers.',
    a: `Backtracking: at each index choose to include or skip the element.

\`\`\`python
def subsets(nums):
    out, cur = [], []
    def go(i):
        if i == len(nums):
            out.append(cur[:]); return
        cur.append(nums[i]); go(i + 1)
        cur.pop();           go(i + 1)
    go(0)
    return out
\`\`\`
There are 2ⁿ subsets, so **time** O(n·2ⁿ). A bitmask loop from 0 to 2ⁿ−1 is an iterative alternative.` },
  { category: 'Data Structures & Algorithms', topic: 'Union-Find', d: 'Hard', type: 'conceptual',
    q: 'What is a disjoint set union (union-find) and where is it used?',
    a: `DSU tracks which elements belong to the same group with two operations: **find** (the group's representative) and **union** (merge two groups).

\`\`\`python
parent = list(range(n)); rank = [0] * n
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path compression
        x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb: return False
    if rank[ra] < rank[rb]: ra, rb = rb, ra
    parent[rb] = ra
    rank[ra] += rank[ra] == rank[rb]
    return True
\`\`\`
With both optimisations operations are nearly O(1) (inverse Ackermann). Used in Kruskal's MST, connected components, cycle detection in undirected graphs and account merging.` },
];
