// Dedicated DSA Patterns practice block with embedded LeetCode checkboxes.

const STORAGE_KEY = 'rt:dsa-patterns';

const DSA_PATTERNS = [
  {
    title: '01. Sliding Window',
    questions: [
      { id: 'lc-3', title: 'Longest Substring Without Repeating Characters (LC 3)', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
      { id: 'lc-76', title: 'Minimum Window Substring (LC 76)', url: 'https://leetcode.com/problems/minimum-window-substring/' },
      { id: 'lc-424', title: 'Longest Repeating Character Replacement (LC 424)', url: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
      { id: 'lc-239', title: 'Sliding Window Maximum (LC 239)', url: 'https://leetcode.com/problems/sliding-window-maximum/' },
    ],
  },
  {
    title: '02. Two Pointers',
    questions: [
      { id: 'lc-15', title: '3Sum (LC 15)', url: 'https://leetcode.com/problems/3sum/' },
      { id: 'lc-11', title: 'Container With Most Water (LC 11)', url: 'https://leetcode.com/problems/container-with-most-water/' },
      { id: 'lc-42', title: 'Trapping Rain Water (LC 42)', url: 'https://leetcode.com/problems/trapping-rain-water/' },
      { id: 'lc-125', title: 'Valid Palindrome (LC 125)', url: 'https://leetcode.com/problems/valid-palindrome/' },
    ],
  },
  {
    title: '03. Hash Maps & Prefix Sum',
    questions: [
      { id: 'lc-1', title: 'Two Sum (LC 1)', url: 'https://leetcode.com/problems/two-sum/' },
      { id: 'lc-560', title: 'Subarray Sum Equals K (LC 560)', url: 'https://leetcode.com/problems/subarray-sum-equals-k/' },
      { id: 'lc-49', title: 'Group Anagrams (LC 49)', url: 'https://leetcode.com/problems/group-anagrams/' },
      { id: 'lc-128', title: 'Longest Consecutive Sequence (LC 128)', url: 'https://leetcode.com/problems/longest-consecutive-sequence/' },
    ],
  },
  {
    title: '04. Binary Search & Binary Search on Answer',
    questions: [
      { id: 'lc-33', title: 'Search in Rotated Sorted Array (LC 33)', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
      { id: 'lc-34', title: 'Find First and Last Position (LC 34)', url: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/' },
      { id: 'lc-875', title: 'Koko Eating Bananas (LC 875)', url: 'https://leetcode.com/problems/koko-eating-bananas/' },
      { id: 'lc-410', title: 'Split Array Largest Sum (LC 410)', url: 'https://leetcode.com/problems/split-array-largest-sum/' },
    ],
  },
  {
    title: '05. Monotonic Stack & Queue',
    questions: [
      { id: 'lc-739', title: 'Daily Temperatures (LC 739)', url: 'https://leetcode.com/problems/daily-temperatures/' },
      { id: 'lc-503', title: 'Next Greater Element II (LC 503)', url: 'https://leetcode.com/problems/next-greater-element-ii/' },
      { id: 'lc-84', title: 'Largest Rectangle in Histogram (LC 84)', url: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },
      { id: 'lc-402', title: 'Remove K Digits (LC 402)', url: 'https://leetcode.com/problems/remove-k-digits/' },
    ],
  },
  {
    title: '06. Heap & Top K Elements',
    questions: [
      { id: 'lc-215', title: 'Kth Largest Element in an Array (LC 215)', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
      { id: 'lc-347', title: 'Top K Frequent Elements (LC 347)', url: 'https://leetcode.com/problems/top-k-frequent-elements/' },
      { id: 'lc-295', title: 'Find Median from Data Stream (LC 295)', url: 'https://leetcode.com/problems/find-median-from-data-stream/' },
      { id: 'lc-23', title: 'Merge K Sorted Lists (LC 23)', url: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
    ],
  },
  {
    title: '07. Tree DFS & BFS',
    questions: [
      { id: 'lc-124', title: 'Binary Tree Maximum Path Sum (LC 124)', url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
      { id: 'lc-102', title: 'Binary Tree Level Order Traversal (LC 102)', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
      { id: 'lc-236', title: 'Lowest Common Ancestor (LC 236)', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/' },
      { id: 'lc-98', title: 'Validate Binary Search Tree (LC 98)', url: 'https://leetcode.com/problems/validate-binary-search-tree/' },
    ],
  },
  {
    title: '08. Merge Intervals & Greedy',
    questions: [
      { id: 'lc-56', title: 'Merge Intervals (LC 56)', url: 'https://leetcode.com/problems/merge-intervals/' },
      { id: 'lc-57', title: 'Insert Interval (LC 57)', url: 'https://leetcode.com/problems/insert-interval/' },
      { id: 'lc-435', title: 'Non-overlapping Intervals (LC 435)', url: 'https://leetcode.com/problems/non-overlapping-intervals/' },
      { id: 'lc-45', title: 'Jump Game II (LC 45)', url: 'https://leetcode.com/problems/jump-game-ii/' },
    ],
  },
  {
    title: '09. Linked List & Fast/Slow Pointers',
    questions: [
      { id: 'lc-206', title: 'Reverse Linked List (LC 206)', url: 'https://leetcode.com/problems/reverse-linked-list/' },
      { id: 'lc-141', title: 'Linked List Cycle (LC 141)', url: 'https://leetcode.com/problems/linked-list-cycle/' },
      { id: 'lc-143', title: 'Reorder List (LC 143)', url: 'https://leetcode.com/problems/reorder-list/' },
      { id: 'lc-287', title: 'Find the Duplicate Number (LC 287)', url: 'https://leetcode.com/problems/find-the-duplicate-number/' },
    ],
  },
  {
    title: '10. Graph BFS, DFS & Shortest Paths',
    questions: [
      { id: 'lc-200', title: 'Number of Islands (LC 200)', url: 'https://leetcode.com/problems/number-of-islands/' },
      { id: 'lc-133', title: 'Clone Graph (LC 133)', url: 'https://leetcode.com/problems/clone-graph/' },
      { id: 'lc-994', title: 'Rotting Oranges (LC 994)', url: 'https://leetcode.com/problems/rotting-oranges/' },
      { id: 'lc-743', title: 'Network Delay Time (LC 743)', url: 'https://leetcode.com/problems/network-delay-time/' },
      { id: 'lc-127', title: 'Word Ladder (LC 127)', url: 'https://leetcode.com/problems/word-ladder/' },
    ],
  },
  {
    title: '11. Union Find (Disjoint Set Union)',
    questions: [
      { id: 'lc-547', title: 'Number of Provinces (LC 547)', url: 'https://leetcode.com/problems/number-of-provinces/' },
      { id: 'lc-684', title: 'Redundant Connection (LC 684)', url: 'https://leetcode.com/problems/redundant-connection/' },
      { id: 'lc-721', title: 'Accounts Merge (LC 721)', url: 'https://leetcode.com/problems/accounts-merge/' },
      { id: 'lc-827', title: 'Making a Large Island (LC 827)', url: 'https://leetcode.com/problems/making-a-large-island/' },
    ],
  },
  {
    title: '12. Topological Sorting',
    questions: [
      { id: 'lc-207', title: 'Course Schedule (LC 207)', url: 'https://leetcode.com/problems/course-schedule/' },
      { id: 'lc-210', title: 'Course Schedule II (LC 210)', url: 'https://leetcode.com/problems/course-schedule-ii/' },
      { id: 'lc-802', title: 'Find Eventual Safe States (LC 802)', url: 'https://leetcode.com/problems/find-eventual-safe-states/' },
      { id: 'lc-1136', title: 'Parallel Courses (LC 1136)', url: 'https://leetcode.com/problems/parallel-courses/' },
    ],
  },
  {
    title: '13. Dynamic Programming',
    questions: [
      { id: 'lc-322', title: 'Coin Change (LC 322)', url: 'https://leetcode.com/problems/coin-change/' },
      { id: 'lc-300', title: 'Longest Increasing Subsequence (LC 300)', url: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
      { id: 'lc-416', title: 'Partition Equal Subset Sum (LC 416)', url: 'https://leetcode.com/problems/partition-equal-subset-sum/' },
      { id: 'lc-72', title: 'Edit Distance (LC 72)', url: 'https://leetcode.com/problems/edit-distance/' },
      { id: 'lc-139', title: 'Word Break (LC 139)', url: 'https://leetcode.com/problems/word-break/' },
    ],
  },
  {
    title: '14. Backtracking, Trie & Bit Manipulation',
    questions: [
      { id: 'lc-39', title: 'Combination Sum (LC 39)', url: 'https://leetcode.com/problems/combination-sum/' },
      { id: 'lc-79', title: 'Word Search (LC 79)', url: 'https://leetcode.com/problems/word-search/' },
      { id: 'lc-212', title: 'Word Search II (LC 212)', url: 'https://leetcode.com/problems/word-search-ii/' },
      { id: 'lc-208', title: 'Implement Trie (LC 208)', url: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
      { id: 'lc-136', title: 'Single Number (LC 136)', url: 'https://leetcode.com/problems/single-number/' },
      { id: 'lc-338', title: 'Counting Bits (LC 338)', url: 'https://leetcode.com/problems/counting-bits/' },
    ],
  },
];

function loadChecked() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveChecked(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function dsaPatternsHtml({ esc, bar, icons }) {
  const checked = loadChecked();
  const total = DSA_PATTERNS.reduce((n, p) => n + p.questions.length, 0);
  const done = DSA_PATTERNS.reduce((n, p) => n + p.questions.filter((q) => checked[q.id]).length, 0);

  return `
    <section class="dsa-patterns-block" aria-label="DSA Interview Patterns">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Pattern-wise Practice</p>
          <h2 class="h2">14 Core DSA Patterns (${done}/${total} solved)</h2>
        </div>
        <div class="dsa-pat-bar">${bar(done, total, 'sm')}</div>
      </div>
      <div class="dsa-pat-list">
        ${DSA_PATTERNS.map((pat, idx) => {
          const pDone = pat.questions.filter((q) => checked[q.id]).length;
          const pTotal = pat.questions.length;
          return `
            <details class="sec dsa-pat-sec ${pDone === pTotal ? 'complete' : ''}"${idx === 0 ? ' open' : ''}>
              <summary>
                <span class="chev">${icons.chev}</span>
                <span class="sec-title">${esc(pat.title)}</span>
                <span class="sec-count">${pDone}/${pTotal}</span>
                ${bar(pDone, pTotal, 'sm')}
              </summary>
              <div class="dsa-pat-questions">
                ${pat.questions.map((q) => {
                  const isDone = Boolean(checked[q.id]);
                  return `
                    <label class="dsa-q-row${isDone ? ' is-done' : ''}">
                      <input type="checkbox" class="dsa-q-check" data-dsa-q="${esc(q.id)}"${isDone ? ' checked' : ''}>
                      <span class="dsa-q-title">${esc(q.title)}</span>
                      <a class="icon-btn" href="${esc(q.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(q.title)} on LeetCode" title="Open on LeetCode">${icons.ext}</a>
                    </label>`;
                }).join('')}
              </div>
            </details>`;
        }).join('')}
      </div>
    </section>`;
}

export function bindDsaPatterns(container, { esc, bar, icons }) {
  const block = container.querySelector('.dsa-patterns-block');
  if (!block) return;

  block.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-dsa-q]');
    if (!cb) return;
    const id = cb.dataset.dsaQ;
    const checked = loadChecked();
    if (cb.checked) checked[id] = true;
    else delete checked[id];
    saveChecked(checked);

    // Update UI in place without collapsing open details
    const row = cb.closest('.dsa-q-row');
    row?.classList.toggle('is-done', cb.checked);

    const sec = cb.closest('.dsa-pat-sec');
    if (sec) {
      const cbs = [...sec.querySelectorAll('[data-dsa-q]')];
      const pDone = cbs.filter((c) => c.checked).length;
      sec.classList.toggle('complete', pDone === cbs.length);
      const countEl = sec.querySelector('.sec-count');
      if (countEl) countEl.textContent = `${pDone}/${cbs.length}`;
      const barEl = sec.querySelector('.bar');
      if (barEl) barEl.outerHTML = bar(pDone, cbs.length, 'sm');
    }

    const allCbs = [...block.querySelectorAll('[data-dsa-q]')];
    const totalDone = allCbs.filter((c) => c.checked).length;
    const heading = block.querySelector('.h2');
    if (heading) heading.textContent = `14 Core DSA Patterns (${totalDone}/${allCbs.length} solved)`;
    const topBar = block.querySelector('.dsa-pat-bar');
    if (topBar) topBar.innerHTML = bar(totalDone, allCbs.length, 'sm');
  });
}
