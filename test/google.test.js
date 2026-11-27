import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, skip } from './helpers.js';
import { fakeGoogle } from './fake-google.js';
import * as gclient from '../src/google/client.js';

let app;
let owner;
const google = fakeGoogle();

before(async () => {
  if (skip) return;
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.APP_TIMEZONE = 'Asia/Kolkata';
  app = await startApp();
  gclient._setFetch(google.fetchImpl);
  owner = client(app.base);
  await owner.signupOwner();
});
after(async () => { gclient._setFetch(null); await app?.close(); });

async function connect() {
  const start = await owner.get('/api/google/connect');
  assert.equal(start.status, 302);
  const loc = new URL(start.headers.get('location'));
  assert.equal(loc.host, 'accounts.google.com');
  assert.match(loc.searchParams.get('scope'), /calendar\.app\.created/);
  assert.equal(loc.searchParams.get('access_type'), 'offline');
  const cb = await owner.get(`/api/google/callback?code=abc&state=${encodeURIComponent(loc.searchParams.get('state'))}`);
  assert.equal(cb.status, 302);
  return cb.headers.get('location');
}

test('tasks: validation and owner-only access', { skip }, async () => {
  const anon = client(app.base);
  assert.equal((await anon.get('/api/tasks')).status, 401);
  assert.equal((await owner.post('/api/tasks', { title: 'x', priority: 'urgent' })).status, 400);
  assert.equal((await owner.post('/api/tasks', { title: 'x', date: '2026-12-01', time: '10:00', endTime: '09:00' })).status, 400);
  const t = await owner.post('/api/tasks', { title: 'Revise DP', date: '2026-12-01', priority: 'critical', category: 'study' });
  assert.equal(t.status, 201);
  assert.equal(t.body.sync, null, 'not synced while Google is not connected');
});

test('OAuth state is checked', { skip }, async () => {
  const bad = await owner.get('/api/google/callback?code=abc&state=forged.sig');
  assert.match(bad.headers.get('location'), /google=error/);
  const status = await owner.get('/api/google/status');
  assert.equal(status.body.connected, false);
});

test('connect, push without duplicates, edit, delete, pull both ways, disconnect', { skip }, async () => {
  const back = await connect();
  assert.match(back, /google=connected/);
  const integ = await app.db.collection('integrations').findOne({ _id: 'google' });
  assert.ok(integ.refreshTokenEnc && !integ.refreshTokenEnc.includes('rt-secret'), 'refresh token is encrypted at rest');
  assert.equal(integ.email, 'owner@example.com');
  assert.equal(google.state.calendars.size, 1, 'one dedicated calendar was created');
  const calId = integ.calendarId;

  // The task created before connecting was pushed by the initial sync.
  let events = [...google.state.events.values()];
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Revise DP');
  assert.equal(events[0].colorId, '11', 'critical is red');
  assert.deepEqual(events[0].start, { date: '2026-12-01' });

  // A timed task.
  const t = await owner.post('/api/tasks', { title: 'Mock interview', date: '2026-12-02', time: '18:30', priority: 'high' });
  assert.equal(t.body.sync.synced, true);
  const ev = [...google.state.events.values()].find((e) => e.summary === 'Mock interview');
  assert.deepEqual(ev.start, { dateTime: '2026-12-02T18:30:00', timeZone: 'Asia/Kolkata' });
  assert.deepEqual(ev.end, { dateTime: '2026-12-02T19:30:00', timeZone: 'Asia/Kolkata' });

  // Reschedule and complete: same event updated, no duplicate.
  await owner.patch(`/api/tasks/${t.body.id}`, { date: '2026-12-03', done: true });
  const after = [...google.state.events.values()].filter((e) => e.extendedProperties?.private?.rtTaskId === t.body.id);
  assert.equal(after.length, 1);
  assert.equal(after[0].summary, 'Done: Mock interview');
  assert.equal(after[0].start.dateTime, '2026-12-03T18:30:00');

  // Lost event id: the tag lookup finds the existing event instead of inserting a copy.
  await app.db.collection('tasks').updateOne({ _id: t.body.id }, { $set: { 'google.eventId': null } });
  await owner.patch(`/api/tasks/${t.body.id}`, { title: 'Mock interview 2' });
  assert.equal([...google.state.events.values()].filter((e) => e.extendedProperties?.private?.rtTaskId === t.body.id).length, 1);

  // Edits made in Google come back on sync; a new event there becomes a task; deletes unlink.
  google.state.userEdit(ev.id, { summary: 'Mock interview (moved)', start: { dateTime: '2026-12-05T10:00:00+05:30' }, end: { dateTime: '2026-12-05T11:00:00+05:30' } });
  const newId = google.state.userCreate(calId, { summary: 'Library visit', start: { date: '2026-12-06' }, end: { date: '2026-12-07' } });
  const s = await owner.post('/api/google/sync');
  assert.equal(s.status, 200);
  assert.equal(s.body.pulled.updated, 1);
  assert.equal(s.body.pulled.created, 1);
  const tasks = (await owner.get('/api/tasks')).body;
  const moved = tasks.find((x) => x.id === t.body.id);
  assert.deepEqual([moved.title, moved.date, moved.time, moved.endTime], ['Mock interview (moved)', '2026-12-05', '10:00', '11:00']);
  const imported = tasks.find((x) => x.title === 'Library visit');
  assert.equal(imported.source, 'google');
  assert.equal(google.state.events.get(newId).extendedProperties.private.rtTaskId, imported.id, 'imported event is tagged');
  // Syncing again changes nothing (no ping-pong).
  const again = await owner.post('/api/google/sync');
  assert.deepEqual(again.body.pulled, { updated: 0, created: 0, unlinked: 0 });
  assert.equal(again.body.pushed, 0);

  google.state.userDelete(newId);
  const s2 = await owner.post('/api/google/sync');
  assert.equal(s2.body.pulled.unlinked, 1);
  const stillThere = (await owner.get('/api/tasks')).body.find((x) => x.id === imported.id);
  assert.ok(stillThere, 'deleting in Google keeps the task in the app');
  assert.equal(stillThere.sync.optOut, true);

  // Deleting in the app deletes the event.
  const del = await owner.del(`/api/tasks/${t.body.id}`);
  assert.equal(del.status, 204);
  assert.equal(google.state.events.get(ev.id).status, 'cancelled');

  // A Google failure is recorded on the task and retried by the next sync.
  // 4 failures: more than the client's retries, so this push fails and is left for the next sync.
  google.state.failNext = { match: (u, m) => m === 'POST' && u.pathname.endsWith('/events'), status: 500, message: 'backend error', times: 4 };
  const f = await owner.post('/api/tasks', { title: 'Flaky', date: '2026-12-09' });
  assert.equal(f.status, 201, 'the task is saved even when Google fails');
  assert.ok(f.body.sync.error);
  const retry = await owner.post('/api/google/sync');
  assert.equal(retry.body.failed, 0);
  const fixed = (await owner.get('/api/tasks')).body.find((x) => x.id === f.body.id);
  assert.equal(fixed.sync.synced, true);

  const st = await owner.get('/api/google/status');
  assert.equal(st.body.connected, true);
  assert.equal(st.body.errors, 0);

  // Disconnect revokes the token and unlinks every task.
  await owner.post('/api/google/disconnect');
  assert.equal(google.state.revoked, true);
  assert.equal(await app.db.collection('integrations').countDocuments(), 0);
  assert.equal(await app.db.collection('tasks').countDocuments({ google: { $exists: true } }), 0);
});

test('expired Google access asks to reconnect', { skip }, async () => {
  await connect();
  gclient._resetAccess();
  google.state.invalidGrant = true;
  try {
    const r = await owner.post('/api/google/sync');
    assert.equal(r.status, 401);
    assert.match(r.body.error, /Connect Google Calendar again/);
    const st = await owner.get('/api/google/status');
    assert.equal(st.body.status, 'expired');
  } finally {
    google.state.invalidGrant = false;
  }
});
