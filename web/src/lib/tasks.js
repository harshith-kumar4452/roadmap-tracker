// Task helpers shared by the Tasks page, the calendar and the Today widget.
import { isoDay, addDays, daysBetween } from './hooks.js';

export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const PRIORITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const CATEGORY_LABEL = { study: 'Academic / Study', personal: 'Personal', work: 'Work' };
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Deadline state of a task on `today`:
 *  done | someday | overdue | today | tomorrow | soon (2 days) | upcoming (3-7 days) | later
 * and whether it is an alert: critical / high tasks become alerts 2 days before the deadline
 * ("soon"), more urgent the day before ("tomorrow"), "today" on the day, and "overdue" after it
 * until they are completed.
 */
export function urgency(t, today = isoDay()) {
  if (t.done) return { state: 'done', alert: false, level: 0 };
  if (!t.date) return { state: 'someday', alert: false, level: 0 };
  const date = effectiveDate(t, today);
  if (!date) return { state: 'later', alert: false, level: 0 }; // a series that has ended
  const left = daysBetween(today, date);
  const important = t.priority === 'critical' || t.priority === 'high';
  if (left < 0) return { state: 'overdue', daysLeft: left, alert: true, level: 4, severity: 'error' };
  if (left === 0) return { state: 'today', daysLeft: 0, alert: important, level: important ? 3 : 1, severity: important ? 'error' : 'info' };
  if (left === 1) return { state: 'tomorrow', daysLeft: 1, alert: important, level: important ? 2 : 0, severity: 'warning' };
  if (left === 2) return { state: 'soon', daysLeft: 2, alert: important, level: important ? 1 : 0, severity: 'info' };
  if (left <= 7) return { state: 'upcoming', daysLeft: left, alert: false, level: 0 };
  return { state: 'later', daysLeft: left, alert: false, level: 0 };
}

export function alertText(t, u) {
  const what = t.priority === 'critical' ? 'Critical deadline' : 'Deadline';
  if (u.state === 'overdue') return `Overdue by ${-u.daysLeft} day${u.daysLeft === -1 ? '' : 's'}`;
  if (u.state === 'today') return `${what} today${t.time ? ` at ${t.time}` : ''}`;
  if (u.state === 'tomorrow') return `${what} tomorrow${t.time ? ` at ${t.time}` : ''}`;
  if (u.state === 'soon') return `${what} in 2 days (${new Date(`${t.date}T12:00`).toLocaleDateString(undefined, { weekday: 'long' })})`;
  return '';
}

export function dateLabel(date, today = isoDay()) {
  if (!date) return 'Someday';
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  const d = new Date(`${date}T12:00`);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export const timeLabel = (t) => (t.time ? `${t.time}${t.endTime ? `–${t.endTime}` : ''}` : '');

// Sort: most urgent first, then date, time, priority.
const PRI = { critical: 0, high: 1, medium: 2, low: 3 };
export function byUrgency(today) {
  return (a, b) => urgency(b, today).level - urgency(a, today).level
    || (a.date || '9999').localeCompare(b.date || '9999')
    || (a.time || '99').localeCompare(b.time || '99')
    || PRI[a.priority] - PRI[b.priority];
}

// The date that matters today: the task's own date, or for a repeating task its next occurrence
// (today included). null when a repeating series has ended.
export function effectiveDate(t, today = isoDay()) {
  if (!t.recurrence) return t.date;
  const from = t.date > today ? t.date : today;
  for (let i = 0; i < 400; i++) {
    const d = addDays(from, i);
    if (t.recurrence.until && d > t.recurrence.until) return null;
    if (occursOn(t, d)) return d;
  }
  return null;
}

// Does a (possibly recurring) task occur on `day`?
export function occursOn(t, day) {
  if (!t.date) return false;
  if (!t.recurrence) return t.date === day;
  if (day < t.date || (t.recurrence.until && day > t.recurrence.until)) return false;
  if (t.recurrence.freq === 'daily') return true;
  const dow = new Date(`${day}T12:00`).getDay();
  const days = t.recurrence.days?.length ? t.recurrence.days : [new Date(`${t.date}T12:00`).getDay()];
  return days.includes(dow);
}

// ---- routine (habits) -------------------------------------------------------------------------
export const scheduleLabel = (days) => {
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 1) return `Every ${DAY_NAMES[days[0]]}`;
  return days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
};

export function routineState({ habits, checkins }, todayIso = isoDay()) {
  const done = new Set(checkins.map((c) => `${c.habitId}:${c.date}`));
  const isDone = (h, key) => done.has(`${h.id}:${key}`);
  const dow = (key) => new Date(`${key}T12:00`).getDay();
  const isDue = (h, key) => h.days.includes(dow(key));
  const started = (h, key) => !h.createdAt || key >= isoDay(new Date(h.createdAt));
  const streak = (h) => {
    let n = 0;
    let d = todayIso;
    if (isDue(h, d) && !isDone(h, d)) d = addDays(d, -1);
    for (let i = 0; i < 120; i++, d = addDays(d, -1)) {
      if (!isDue(h, d)) continue;
      if (!isDone(h, d)) break;
      n++;
    }
    return n;
  };
  const rate = (h, days = 30) => {
    let due = 0;
    let hit = 0;
    for (let i = 0; i < days; i++) {
      const d = addDays(todayIso, -i);
      if (!isDue(h, d)) continue;
      if (i === 0 && !isDone(h, d)) continue;
      if (!started(h, d) && !isDone(h, d)) continue;
      due++;
      if (isDone(h, d)) hit++;
    }
    return due ? Math.round((hit * 100) / due) : null;
  };
  const nextDue = (h) => {
    for (let i = 1; i <= 7; i++) if (isDue(h, addDays(todayIso, i))) return addDays(todayIso, i);
    return null;
  };
  return { isDone, isDue, started, streak, rate, nextDue, today: todayIso };
}
