// Two-way sync between tasks and the app's own Google calendar ("Learning hub").
//
// Push: every task with a date becomes one event, tagged with extendedProperties.private.rtTaskId,
//   so a lost event id never creates a duplicate (we look the tag up before inserting).
// Pull: incremental events.list with a sync token on the app's calendar only. Edits made in Google
//   update the task; events created there become tasks; events deleted there unlink the task (it is
//   kept in the app and not pushed again).
// Triggers: each task change (push), the webhook from events.watch, opening the calendar page, and
//   the daily cron (pull + retry failed pushes + renew the webhook).
import { randomUUID } from 'node:crypto';
import { gcal, getIntegration, saveIntegration, GoogleError } from './client.js';
import { sign } from './crypto.js';
import * as taskStore from '../tasks/store.js';

export const TZ = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';
const CAL_NAME = 'Learning hub';
const FOOTER = '\n\n— Synced from Learning hub';

// Google event colour ids (Calendar "event" palette) matched to the app's colour coding.
const COLOR_ID = { critical: '11', high: '6', medium: '9', low: '10', study: '3', personal: '7', done: '8' };

export async function connected() {
  const integ = await getIntegration();
  return integ && integ.status === 'connected' ? integ : null;
}

async function ensureCalendar(integ) {
  if (integ.calendarId) {
    try {
      await gcal(`/calendars/${encodeURIComponent(integ.calendarId)}`);
      return integ.calendarId;
    } catch (err) {
      if (err.code !== 404 && err.code !== 410) throw err;
    }
  }
  const cal = await gcal('/calendars', { method: 'POST', body: { summary: CAL_NAME, description: 'Tasks and study plan from Learning hub. Events here sync both ways.', timeZone: TZ() } });
  await saveIntegration({ calendarId: cal.id, syncToken: null });
  integ.calendarId = cal.id;
  return cal.id;
}

const addMinutes = (date, time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const dayShift = Math.floor(total / 1440);
  const t = ((total % 1440) + 1440) % 1440;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayShift);
  return { date: d.toISOString().slice(0, 10), time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` };
};
const nextDay = (date) => addMinutes(date, '00:00', 1440).date;

export function eventBody(t) {
  const body = {
    summary: t.done ? `Done: ${t.title}` : t.title,
    description: `${t.notes || ''}${FOOTER}`.trim(),
    colorId: t.done ? COLOR_ID.done : (t.priority === 'critical' || t.priority === 'high' ? COLOR_ID[t.priority] : (COLOR_ID[t.category] || COLOR_ID[t.priority] || COLOR_ID.medium)),
    extendedProperties: { private: { rtTaskId: t._id, rtPriority: t.priority || 'medium', rtCategory: t.category || 'personal' } },
    reminders: { useDefault: t.priority !== 'critical', ...(t.priority === 'critical' ? { overrides: [{ method: 'popup', minutes: 60 * 24 * 2 }, { method: 'popup', minutes: 60 }] } : {}) },
  };
  if (t.time) {
    const end = t.endTime && t.endTime > t.time ? { date: t.date, time: t.endTime } : addMinutes(t.date, t.time, 60);
    body.start = { dateTime: `${t.date}T${t.time}:00`, timeZone: TZ() };
    body.end = { dateTime: `${end.date}T${end.time}:00`, timeZone: TZ() };
  } else {
    body.start = { date: t.date };
    body.end = { date: nextDay(t.date) };
  }
  if (t.recurrence?.freq) {
    const parts = [`FREQ=${t.recurrence.freq.toUpperCase()}`];
    if (t.recurrence.freq === 'weekly' && t.recurrence.days?.length) parts.push(`BYDAY=${t.recurrence.days.map((d) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]).join(',')}`);
    if (t.recurrence.until) parts.push(`UNTIL=${t.recurrence.until.replace(/-/g, '')}`);
    body.recurrence = [`RRULE:${parts.join(';')}`];
  } else {
    body.recurrence = [];
  }
  return body;
}

async function findTagged(calendarId, taskId) {
  const r = await gcal(`/calendars/${encodeURIComponent(calendarId)}/events`, { query: { privateExtendedProperty: `rtTaskId=${taskId}`, maxResults: '5', showDeleted: 'false' } });
  return r.items?.[0] || null;
}

// Push one task (a DB document). Never throws: errors are stored on the task and returned.
export async function pushTask(doc) {
  const integ = await connected();
  if (!integ || !doc || doc.google?.optOut) return { skipped: true };
  try {
    const calendarId = await ensureCalendar(integ);
    const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
    let eventId = doc.google?.calendarId === calendarId ? doc.google?.eventId : null;
    if (!doc.date) {
      if (eventId) await gcal(`${base}/${encodeURIComponent(eventId)}`, { method: 'DELETE', okStatuses: [404, 410] });
      await taskStore.setGoogle(doc._id, { eventId: null, calendarId, syncedAt: new Date().toISOString(), error: null });
      return { removed: Boolean(eventId) };
    }
    if (!eventId) eventId = (await findTagged(calendarId, doc._id))?.id || null; // no duplicates
    const body = eventBody(doc);
    let ev;
    if (eventId) {
      try {
        ev = await gcal(`${base}/${encodeURIComponent(eventId)}`, { method: 'PUT', body });
      } catch (err) {
        if (err.code !== 404 && err.code !== 410) throw err;
        ev = await gcal(base, { method: 'POST', body });
      }
    } else {
      ev = await gcal(base, { method: 'POST', body });
    }
    await taskStore.setGoogle(doc._id, { eventId: ev.id, calendarId, eventUpdated: ev.updated || null, syncedAt: new Date().toISOString(), error: null });
    return { eventId: ev.id };
  } catch (err) {
    await taskStore.setGoogle(doc._id, { error: err.message, errorAt: new Date().toISOString() });
    return { error: err.message };
  }
}

export async function deleteTaskEvent(doc) {
  const integ = await connected();
  const eventId = doc?.google?.eventId;
  if (!integ || !eventId || doc.google.calendarId !== integ.calendarId) return;
  try {
    await gcal(`/calendars/${encodeURIComponent(integ.calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', okStatuses: [404, 410] });
  } catch (err) {
    await saveIntegration({ lastError: `Could not delete an event: ${err.message}`, lastErrorAt: new Date().toISOString() });
  }
}

// Converts a Google event time to the app's date / time in APP_TIMEZONE.
function local(dt) {
  if (dt.date) return { date: dt.date, time: null };
  const d = new Date(dt.dateTime);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const PRIORITY_FROM_COLOR = { 11: 'critical', 6: 'high', 9: 'medium', 10: 'low' };

function fieldsFromEvent(ev) {
  const start = local(ev.start || {});
  const end = ev.end ? local(ev.end) : { time: null };
  const priv = ev.extendedProperties?.private || {};
  return {
    title: String(ev.summary || '(no title)').replace(/^Done: /, '').slice(0, 300),
    notes: String(ev.description || '').replace(FOOTER, '').replace(/— Synced from Learning hub\s*$/, '').trim().slice(0, 5000),
    date: start.date,
    time: start.time,
    endTime: start.time && end.date === start.date ? end.time : null,
    priority: priv.rtPriority || PRIORITY_FROM_COLOR[ev.colorId] || 'medium',
    category: priv.rtCategory || 'personal',
  };
}

// Pull changes from Google. Returns counts.
export async function pull() {
  const integ = await connected();
  if (!integ) return { skipped: true };
  const calendarId = await ensureCalendar(integ);
  const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
  const counts = { updated: 0, created: 0, unlinked: 0 };
  let syncToken = integ.syncToken;
  let pageToken;
  let nextSyncToken;
  for (let guard = 0; guard < 50; guard++) {
    const query = { showDeleted: 'true', maxResults: '250', ...(pageToken ? { pageToken } : {}) };
    if (syncToken) query.syncToken = syncToken;
    else query.timeMin = new Date(Date.now() - 90 * 86400000).toISOString();
    let page;
    try {
      page = await gcal(base, { query });
    } catch (err) {
      if (err.code === 410 && syncToken) { syncToken = null; pageToken = undefined; continue; } // token expired: full resync
      throw err;
    }
    for (const ev of page.items || []) await applyEvent(ev, calendarId, counts);
    pageToken = page.nextPageToken;
    if (!pageToken) { nextSyncToken = page.nextSyncToken; break; }
  }
  await saveIntegration({ syncToken: nextSyncToken || syncToken || null, lastPullAt: new Date().toISOString() });
  return counts;
}

async function applyEvent(ev, calendarId, counts) {
  const tagged = ev.extendedProperties?.private?.rtTaskId;
  const doc = (tagged && await taskStore.getTaskDoc(tagged)) || await taskStore.findByEventId(ev.id);
  if (ev.status === 'cancelled') {
    if (doc && doc.google?.eventId === ev.id) {
      await taskStore.setGoogle(doc._id, { eventId: null, optOut: true, error: null, syncedAt: new Date().toISOString() });
      counts.unlinked++;
    }
    return;
  }
  if (!ev.start) return;
  if (doc) {
    if (doc.google?.optOut) return;
    // Skip versions we have already seen (our own push echoes back). Compare Google's own
    // `updated` stamps, not our clock, so clock skew can't cause a ping-pong.
    if (doc.google?.eventUpdated ? ev.updated <= doc.google.eventUpdated : Date.parse(ev.updated) <= Date.parse(doc.google?.syncedAt || 0) + 3000) return;
    const f = fieldsFromEvent(ev);
    const done = /^Done: /.test(ev.summary || '');
    await taskStore.updateTask(doc._id, { ...f, ...(done !== doc.done ? { done } : {}) });
    await taskStore.setGoogle(doc._id, { eventId: ev.id, calendarId, eventUpdated: ev.updated, syncedAt: new Date().toISOString(), error: null });
    counts.updated++;
    return;
  }
  // A new event created directly in the Learning hub calendar: import it as a task and tag it.
  const created = await taskStore.createTask({ ...fieldsFromEvent(ev), source: 'google' });
  let eventUpdated = ev.updated;
  try {
    const patched = await gcal(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.id)}`, {
      method: 'PATCH', body: { extendedProperties: { private: { rtTaskId: created._id } } },
    });
    eventUpdated = patched?.updated || eventUpdated;
  } catch { /* the event id link below is enough to avoid duplicates */ }
  await taskStore.setGoogle(created._id, { eventId: ev.id, calendarId, eventUpdated, syncedAt: new Date().toISOString(), error: null });
  counts.created++;
}

// Full reconciliation: pull, then push anything new, changed or previously failed.
export async function syncAll() {
  const integ = await connected();
  if (!integ) return { skipped: true };
  const result = { pulled: null, pushed: 0, failed: 0 };
  try {
    result.pulled = await pull();
    for (const doc of await taskStore.tasksNeedingSync(150)) {
      const r = await pushTask(doc);
      if (r.error) result.failed++; else if (!r.skipped) result.pushed++;
    }
    await saveIntegration({ lastSyncAt: new Date().toISOString(), lastError: result.failed ? `${result.failed} task(s) failed to sync` : null });
  } catch (err) {
    await saveIntegration({ lastError: err.message, lastErrorAt: new Date().toISOString() });
    if (err instanceof GoogleError && err.reconnect) throw err;
    result.error = err.message;
  }
  return result;
}

// Webhook channel (push notifications). Google calls /api/google/webhook when the calendar
// changes; channels expire, so the daily cron renews them.
export async function watch(origin) {
  const integ = await connected();
  if (!integ || !origin.startsWith('https://')) return { skipped: true, reason: 'Webhooks need an https URL (they work on the deployed site, not on localhost).' };
  const calendarId = await ensureCalendar(integ);
  if (integ.channel?.id) await stopWatch(integ.channel);
  const id = randomUUID();
  try {
    const ch = await gcal(`/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      method: 'POST',
      body: { id, type: 'web_hook', address: `${origin}/api/google/webhook`, token: sign(id), params: { ttl: String(7 * 86400) } },
    });
    await saveIntegration({ channel: { id, resourceId: ch.resourceId, expiration: Number(ch.expiration) || null }, watchError: null });
    return { ok: true };
  } catch (err) {
    await saveIntegration({ channel: null, watchError: err.message });
    return { error: err.message };
  }
}

export async function stopWatch(channel) {
  if (!channel?.id) return;
  try { await gcal('/channels/stop', { method: 'POST', body: { id: channel.id, resourceId: channel.resourceId }, okStatuses: [404] }); } catch { /* expired already */ }
}
