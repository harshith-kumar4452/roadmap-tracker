import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, skip } from './helpers.js';
import * as coding from '../src/coding/service.js';

let app;
let owner;
before(async () => {
  if (skip) return;
  process.env.CRON_SECRET = 'cron-test-secret';
  app = await startApp();
  owner = client(app.base);
  await owner.signupOwner();
  // A small practice roadmap, like the ones in seed/roadmaps.json.
  await app.db.collection('roadmaps').insertOne({
    _id: 'pr1', title: 'DSA Practice: LeetCode', position: 0, createdAt: new Date().toISOString(), resources: [], notes: [],
    sections: [{ id: 's1', title: 'Arrays & Hashing', items: [
      { id: 'i1', title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', level: 'Beginner', status: 'not_started', doneAt: null, note: '' },
      { id: 'i2', title: 'Group Anagrams', url: 'https://leetcode.com/problems/group-anagrams/', level: 'Intermediate', status: 'not_started', doneAt: null, note: '' },
    ] }],
  });
});
after(async () => { coding._setFetch(null); await app?.close(); });

test('streaks: today not done yet keeps the streak; gaps reset it', () => {
  assert.deepEqual(coding.streaks(['2026-11-25', '2026-11-26'], '2026-11-27'), { current: 2, longest: 2 });
  assert.deepEqual(coding.streaks(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-26', '2026-11-27'], '2026-11-27'), { current: 2, longest: 3 });
  assert.deepEqual(coding.streaks(['2026-11-24'], '2026-11-27'), { current: 0, longest: 1 });
});

test('daily pick: from practice lists, once per day, never repeats, syncs the roadmap', { skip }, async () => {
  const d1 = await owner.get('/api/coding/today?date=2026-11-30');
  assert.equal(d1.status, 200);
  const p1 = d1.body.problems.find((p) => p.source === 'auto:practice');
  assert.ok(p1);
  // Same day again: same pick.
  const again = await owner.get('/api/coding/today?date=2026-11-30');
  assert.equal(again.body.problems.filter((p) => p.source.startsWith('auto')).length, 1);
  const d2 = await owner.get('/api/coding/today?date=2026-12-01');
  const p2 = d2.body.problems.find((p) => p.source.startsWith('auto'));
  assert.notEqual(p2.url, p1.url, 'no repeats');

  // Solving it ticks the roadmap item too.
  await owner.patch(`/api/coding/problems/${p1.id}`, { done: true, submissionUrl: 'https://leetcode.com/submissions/detail/1/' });
  const rm = await app.db.collection('roadmaps').findOne({ _id: 'pr1' });
  const item = rm.sections[0].items.find((i) => i.url === p1.url);
  assert.equal(item.status, 'done');
});

test('falls back to Codeforces when the practice lists are used up, and reports errors', { skip }, async () => {
  coding._setFetch(async () => new Response(JSON.stringify({ status: 'OK', result: { problems: [
    { contestId: 4, index: 'A', name: 'Watermelon', rating: 800, tags: ['math'] },
    { contestId: 71, index: 'A', name: 'Way Too Long Words', rating: 800, tags: ['strings'] },
    { contestId: 1352, index: 'C', name: 'K-th Not Divisible by n', rating: 1200, tags: ['math', 'binary search'] },
    { contestId: 1360, index: 'D', name: 'Buying Shovels', rating: 1300, tags: ['math'] },
    { contestId: 1520, index: 'E', name: 'Arranging The Sheep', rating: 1400, tags: ['greedy'] },
    { contestId: 1475, index: 'D', name: 'Cleaning the Phone', rating: 1800, tags: ['binary search'] },
  ] } }), { status: 200 }));
  const d = await owner.get('/api/coding/today?date=2026-12-02'); // a Wednesday -> Medium (1200-1500)
  const p = d.body.problems.find((x) => x.source.startsWith('auto'));
  assert.equal(p.source, 'auto:codeforces');
  assert.match(p.url, /^https:\/\/codeforces\.com\/problemset\/problem\/\d+\/[A-Z]$/);
  assert.equal(p.difficulty, 'Medium');

  coding._setFetch(async () => new Response('{}', { status: 503 }));
  await app.db.collection('coding_cache').deleteMany({});
  const none = await owner.get('/api/coding/today?date=2026-12-03');
  assert.equal(none.status, 200, 'the page still works');
  assert.ok(none.body.autoError);
});

test('manual checklist, stats and access', { skip }, async () => {
  const member = client(app.base);
  await member.signupMember();
  assert.equal((await member.post('/api/coding/problems', { title: 'x' })).status, 401);
  assert.equal((await owner.post('/api/coding/problems', { title: 'Bad', url: 'javascript:alert(1)' })).status, 400);
  const m = await owner.post('/api/coding/problems', { title: 'Koko Eating Bananas', url: 'https://leetcode.com/problems/koko-eating-bananas/', difficulty: 'Medium', topic: 'Binary Search', date: '2026-12-01', done: true });
  assert.equal(m.status, 201);
  assert.equal(m.body.platform, 'LeetCode');

  const s = await owner.get('/api/coding/stats?date=2026-12-01');
  assert.equal(s.body.totalSolved, 2);
  assert.equal(s.body.currentStreak, 2, '30 Nov and 1 Dec');
  assert.equal(s.body.longestStreak, 2);
  assert.ok(s.body.topics.find((t) => t.topic === 'Binary Search').done === 1);
  assert.equal((await member.get('/api/coding/stats')).status, 200, 'members can view');

  assert.equal((await owner.del(`/api/coding/problems/${m.body.id}`)).status, 204);
});

test('cron needs the secret', { skip }, async () => {
  const anon = client(app.base);
  assert.equal((await anon.get('/api/cron/daily')).status, 401);
  const res = await fetch(`${app.base}/api/cron/daily`, { headers: { Authorization: 'Bearer cron-test-secret' } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.coding);
  assert.deepEqual(body.google, { skipped: true });
});
