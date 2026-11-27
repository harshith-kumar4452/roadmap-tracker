import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, skip } from './helpers.js';
import { _setFetch } from '../src/ai/gemini.js';
import { detectKind, parseCsv, tableExtract } from '../src/plans/extract.js';

let app;
let owner;
const today = '2026-12-01';
const b64 = (s) => Buffer.from(s).toString('base64');

before(async () => {
  if (skip) return;
  app = await startApp();
  owner = client(app.base);
  await owner.signupOwner();
});
after(async () => { _setFetch(null); delete process.env.GEMINI_API_KEY; await app?.close(); });

test('file type comes from the bytes, not the name', () => {
  assert.equal(detectKind('plan.pdf', Buffer.from('%PDF-1.7 ...')), 'pdf');
  assert.equal(detectKind('plan.pdf', Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03])), null, 'an .exe renamed to .pdf is rejected');
  assert.equal(detectKind('x.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'png');
  assert.equal(detectKind('notes.txt', Buffer.from('Day 1: arrays')), 'txt');
});

test('CSV parsing handles quotes and maps columns', () => {
  const rows = parseCsv('Task,Date,Start,End,Priority\n"Revise ""DP"", part 1",2026-12-03,9am,10:30,high\nExam: OS,05/12/2026,,,\n');
  assert.equal(rows[1][0], 'Revise "DP", part 1');
  const r = tableExtract(rows);
  assert.deepEqual([r.items[0].date, r.items[0].startTime, r.items[0].endTime, r.items[0].priority], ['2026-12-03', '09:00', '10:30', 'high']);
  assert.equal(r.items[1].date, '2026-12-05');
  assert.match(r.items[1].ambiguity, /day\/month\/year/, 'dd/mm dates are flagged for the user to check');
});

test('upload without AI: CSV works, PDF explains what is needed, bad files are refused', { skip }, async () => {
  const csv = 'Task,Date,Start,End\nArrays practice,2026-12-02,18:00,19:00\nMystery task,someday,,\nArrays practice,2026-12-02,18:00,19:00\n';
  const r = await owner.post('/api/plans', { filename: 'week.csv', data: b64(csv), today });
  assert.equal(r.status, 201);
  assert.equal(r.body.method, 'table');
  assert.equal(r.body.items.length, 3);
  assert.ok(r.body.items[1].issues.some((i) => i.code === 'missing_date'));
  assert.ok(r.body.items[2].issues.some((i) => i.code === 'duplicate_in_plan'));
  assert.equal(r.body.counts.blocking, 1);

  // Confirming with a dated-less entry ticked is refused; nothing is created.
  const c1 = await owner.post(`/api/plans/${r.body.id}/confirm`, {});
  assert.equal(c1.status, 400);
  assert.equal(await app.db.collection('tasks').countDocuments(), 0);

  // The user unticks the duplicate and fixes the date, then confirms.
  const items = r.body.items.map((it, i) => ({ ...it, include: i !== 2, date: i === 1 ? '2026-12-04' : it.date }));
  const c2 = await owner.post(`/api/plans/${r.body.id}/confirm`, { items });
  assert.equal(c2.status, 200);
  assert.equal(c2.body.counts.created, 2);
  const tasks = await app.db.collection('tasks').find({ planId: r.body.id }).toArray();
  assert.deepEqual(tasks.map((t) => [t.title, t.date, t.time]).sort(), [['Arrays practice', '2026-12-02', '18:00'], ['Mystery task', '2026-12-04', null]]);
  assert.equal((await owner.post(`/api/plans/${r.body.id}/confirm`, { items })).status, 409, 'no double add');

  // Uploading the same plan again flags the entries already in the calendar and unticks them.
  const again = await owner.post('/api/plans', { filename: 'week.csv', data: b64(csv), today });
  assert.ok(again.body.items[0].issues.some((i) => i.code === 'duplicate_existing'));
  assert.equal(again.body.items[0].include, false);

  const pdf = await owner.post('/api/plans', { filename: 'plan.pdf', data: b64('%PDF-1.4 fake'), today });
  assert.equal(pdf.status, 503);
  assert.match(pdf.body.error, /GEMINI_API_KEY/);
  assert.equal((await owner.post('/api/plans', { filename: 'evil.pdf', data: Buffer.from([0x4d, 0x5a, 0, 1, 2]).toString('base64') })).status, 415);
  assert.equal((await owner.post('/api/plans', { filename: 'big.txt', data: Buffer.alloc(3 * 1024 * 1024 + 1, 97).toString('base64') })).status, 413);

  const member = client(app.base);
  await member.signupMember();
  assert.equal((await member.post('/api/plans', { filename: 'a.csv', data: b64(csv) })).status, 401);

  // The original file can be downloaded again.
  const f = await fetch(`${app.base}/api/plans/${r.body.id}/file`, { headers: { Cookie: '' } });
  assert.equal(f.status, 401);
});

test('upload with AI: PDF is sent to Gemini inline, output is validated', { skip }, async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  let sent;
  _setFetch(async (url, init) => {
    sent = JSON.parse(init.body);
    const out = { summary: 'Two-week OS plan', assumptions: ['Week starts Monday'], items: [
      { title: 'Process scheduling', subject: 'OS', date: '2026-12-07', startTime: '07:00', durationMinutes: 90, isDeadline: false, priority: 'medium', category: 'study', notes: '', sourceText: 'Mon 7am OS (1.5h)' },
      { title: 'OS mid-term', date: '2026-12-15', startTime: null, isDeadline: true, priority: 'low', category: 'study', notes: '', sourceText: 'Midterm 15 Dec' },
      { title: 'Revise', date: 'next week', startTime: '25:00', isDeadline: false, priority: 'urgent', category: 'fun', notes: '', sourceText: 'revise next week', ambiguity: 'No exact day' },
      { title: 'Weekly DSA', date: '2026-12-02', startTime: '20:00', endTime: '21:00', isDeadline: false, priority: 'medium', category: 'study', recurrence: { freq: 'weekly', days: [3, 9], until: '2027-01-31' }, notes: '', sourceText: 'Every Wed 8pm' },
    ] };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] }, finishReason: 'STOP' }] }), { status: 200 });
  });
  const r = await owner.post('/api/plans', { filename: 'os-plan.pdf', data: b64('%PDF-1.4 schedule'), today });
  assert.equal(r.status, 201);
  assert.equal(r.body.method, 'ai');
  assert.equal(sent.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
  const [a, b, c, d] = r.body.items;
  assert.equal(a.title, 'OS: Process scheduling');
  assert.equal(a.endTime, '08:30', 'duration becomes an end time');
  assert.equal(b.priority, 'high', 'deadlines are at least high priority');
  assert.equal(c.date, null, 'invalid dates are not guessed');
  assert.equal(c.time, null);
  assert.equal(c.priority, 'medium');
  assert.equal(c.category, 'study');
  assert.ok(c.issues.some((i) => i.code === 'missing_date') && c.issues.some((i) => i.code === 'ambiguous'));
  assert.deepEqual(d.recurrence, { freq: 'weekly', days: [3], until: '2027-01-31' });
});
