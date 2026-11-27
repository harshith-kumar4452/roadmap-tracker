// The Today widget's deadline rule (web/src/lib/tasks.js), with a deadline on Friday 4 Dec 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urgency, effectiveDate, occursOn } from '../web/src/lib/tasks.js';

const friday = '2026-12-04';
const crit = { title: 'Submit project', date: friday, priority: 'critical', done: false };

test('critical deadline: Wednesday notice, Thursday urgent, Friday due, then overdue until done', () => {
  assert.deepEqual([urgency(crit, '2026-12-01').state, urgency(crit, '2026-12-01').alert], ['upcoming', false], 'Tuesday: not yet');
  assert.deepEqual([urgency(crit, '2026-12-02').state, urgency(crit, '2026-12-02').alert], ['soon', true], 'Wednesday: shown');
  const thu = urgency(crit, '2026-12-03');
  assert.deepEqual([thu.state, thu.alert], ['tomorrow', true]);
  assert.ok(thu.level > urgency(crit, '2026-12-02').level, 'Thursday is more urgent');
  assert.deepEqual([urgency(crit, friday).state, urgency(crit, friday).severity], ['today', 'error']);
  assert.equal(urgency(crit, '2026-12-07').state, 'overdue');
  assert.equal(urgency({ ...crit, done: true }, '2026-12-07').state, 'done');
});

test('normal priority tasks do not raise early alerts', () => {
  const t = { ...crit, priority: 'medium' };
  assert.equal(urgency(t, '2026-12-02').alert, false);
  assert.equal(urgency(t, '2026-12-03').alert, false);
  assert.equal(urgency(t, '2026-12-05').alert, true, 'but overdue is always an alert');
});

test('repeating tasks use their next occurrence, never "overdue"', () => {
  const weekly = { title: 'Contest', date: '2026-11-03', priority: 'high', done: false, recurrence: { freq: 'weekly', days: [2], until: null } }; // Tuesdays
  assert.equal(effectiveDate(weekly, '2026-11-27'), '2026-12-01');
  assert.equal(urgency(weekly, '2026-11-27').state, 'upcoming');
  assert.ok(occursOn(weekly, '2026-12-01'));
  assert.ok(!occursOn(weekly, '2026-12-02'));
  const ended = { ...weekly, recurrence: { ...weekly.recurrence, until: '2026-11-20' } };
  assert.equal(effectiveDate(ended, '2026-11-27'), null);
  assert.equal(urgency(ended, '2026-11-27').alert, false);
});
