import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';

// One document per roadmap. Sections and their items are embedded, which keeps
// every read a single query and is far below MongoDB's 16 MB document limit.
//
// {
//   _id, title, intro, notionUrl, position, createdAt,
//   resources: [{ title, url }],
//   notes:     [{ heading, lines: [string] }],
//   sections:  [{ id, title, items: [{ id, title, url, level, status, doneAt, note }] }]
// }

export const STATUSES = ['not_started', 'in_progress', 'done'];
export const LEVELS = ['', 'Beginner', 'Intermediate', 'Advanced'];

export const newId = () => randomBytes(6).toString('base64url');

let clientPromise;
async function collection(name) {
  if (!process.env.MONGODB_URI) {
    const err = new Error('MONGODB_URI is not set. Add it to .env (local) or the Vercel project settings.');
    err.status = 500;
    err.expose = true;
    throw err;
  }
  // Reused across invocations of the same serverless instance.
  clientPromise ??= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 }).connect();
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection(name);
}
const roadmaps = () => collection('roadmaps');
const pages = () => collection('pages');
const accounts = () => collection('accounts');
const habits = () => collection('habits');
const checkins = () => collection('checkins');
const tasks = () => collection('tasks');
const links = () => collection('links');

const allItems = (doc) => doc.sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title })));

function summary(doc) {
  const items = allItems(doc);
  const doneAts = items.map((i) => i.doneAt).filter(Boolean).sort();
  const next = items.find((i) => i.status !== 'done');
  return {
    id: doc._id,
    title: doc.title,
    total: items.length,
    done: items.filter((i) => i.status === 'done').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    lastDoneAt: doneAts.at(-1) ?? null,
    next: next ? { id: next.id, title: next.title, url: next.url, section: next.section } : null,
  };
}

const publicDoc = ({ _id, ...rest }) => ({ id: _id, ...rest });

// ---------- roadmaps ----------

export async function listRoadmaps() {
  const docs = await (await roadmaps()).find({}).sort({ position: 1, title: 1 }).toArray();
  return docs.map(summary);
}

export async function getRoadmap(id) {
  const doc = await (await roadmaps()).findOne({ _id: id });
  return doc ? publicDoc(doc) : null;
}

const cleanItem = (it) => ({
  id: it.id || newId(),
  title: it.title,
  url: it.url || null,
  level: LEVELS.includes(it.level) ? it.level : '',
  status: STATUSES.includes(it.status) ? it.status : 'not_started',
  doneAt: it.status === 'done' ? it.doneAt ?? null : null,
  note: it.note || '',
});

export async function createRoadmap({ id, title, intro = '', notionUrl = null, resources = [], notes = [], sections = [], position }) {
  const col = await roadmaps();
  const doc = {
    _id: id || newId(),
    title,
    intro,
    notionUrl,
    resources,
    notes,
    position: position ?? (await col.countDocuments()),
    createdAt: new Date().toISOString(),
    sections: sections.map((s) => ({ id: s.id || newId(), title: s.title, items: s.items.map(cleanItem) })),
  };
  await col.insertOne(doc);
  return publicDoc(doc);
}

export async function updateRoadmap(id, patch) {
  const $set = {};
  for (const key of ['title', 'intro', 'resources', 'notes']) if (patch[key] !== undefined) $set[key] = patch[key];
  const res = await (await roadmaps()).findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
  return res ? publicDoc(res) : null;
}

export async function deleteRoadmap(id) {
  return (await (await roadmaps()).deleteOne({ _id: id })).deletedCount > 0;
}

// ---------- sections ----------

export async function createSection(roadmapId, title) {
  const section = { id: newId(), title, items: [] };
  const res = await (await roadmaps()).updateOne({ _id: roadmapId }, { $push: { sections: section } });
  return res.matchedCount ? section : null;
}

export async function renameSection(id, title) {
  const res = await (await roadmaps()).updateOne({ 'sections.id': id }, { $set: { 'sections.$.title': title } });
  return res.matchedCount > 0;
}

export async function deleteSection(id) {
  const res = await (await roadmaps()).updateOne({ 'sections.id': id }, { $pull: { sections: { id } } });
  return res.matchedCount > 0;
}

// ---------- items ----------

export async function createItem(sectionId, data) {
  const item = cleanItem(data);
  const res = await (await roadmaps()).updateOne({ 'sections.id': sectionId }, { $push: { 'sections.$.items': item } });
  return res.matchedCount ? item : null;
}

export async function updateItem(id, patch) {
  const col = await roadmaps();
  const $set = {};
  const at = (field) => `sections.$[].items.$[i].${field}`;
  if (patch.status !== undefined) {
    $set[at('status')] = patch.status;
    $set[at('doneAt')] = patch.status === 'done' ? new Date().toISOString() : null;
  }
  for (const key of ['title', 'url', 'note', 'level']) if (patch[key] !== undefined) $set[at(key)] = patch[key];
  const doc = await col.findOneAndUpdate(
    { 'sections.items.id': id },
    { $set },
    { arrayFilters: [{ 'i.id': id }], returnDocument: 'after' },
  );
  if (!doc) return null;
  for (const s of doc.sections) {
    const item = s.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

export async function deleteItem(id) {
  const res = await (await roadmaps()).updateOne(
    { 'sections.items.id': id },
    { $pull: { 'sections.$[].items': { id } } },
  );
  return res.modifiedCount > 0;
}

// ---------- pages: cheat sheets, projects, mindmaps ----------
//
// { _id, kind, title, summary, tags: [string], status, body, createdAt, updatedAt }
// `body` is Markdown. For a mindmap it is an indented outline; status is only used by projects.

export const PAGE_KINDS = ['cheatsheet', 'project', 'mindmap'];
export const PROJECT_STATUSES = ['idea', 'building', 'done'];

export async function listPages(kind) {
  const docs = await (await pages())
    .find({ kind }, { projection: { body: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(publicDoc);
}

export async function getPage(id) {
  const doc = await (await pages()).findOne({ _id: id });
  return doc ? publicDoc(doc) : null;
}

export async function createPage({ kind, title, summary = '', tags = [], status = kind === 'project' ? 'idea' : '', body = '' }) {
  const now = new Date().toISOString();
  const doc = { _id: newId(), kind, title, summary, tags, status, body, createdAt: now, updatedAt: now };
  await (await pages()).insertOne(doc);
  return publicDoc(doc);
}

export async function updatePage(id, patch) {
  const $set = { updatedAt: new Date().toISOString() };
  for (const key of ['title', 'summary', 'tags', 'status', 'body']) if (patch[key] !== undefined) $set[key] = patch[key];
  const res = await (await pages()).findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
  return res ? publicDoc(res) : null;
}

export async function deletePage(id) {
  return (await (await pages()).deleteOne({ _id: id })).deletedCount > 0;
}

// ---------- owner account ----------
// There is exactly one account (_id "owner"). The unique _id also stops two signups racing.

export async function getAccount() {
  return (await accounts()).findOne({ _id: 'owner' });
}

export async function createAccount({ name, username, salt, hash }) {
  const doc = { _id: 'owner', name, username, salt, hash, createdAt: new Date().toISOString() };
  try {
    await (await accounts()).insertOne(doc);
  } catch (err) {
    if (err.code === 11000) return null; // already exists
    throw err;
  }
  return doc;
}

// ---------- routine (habits) and daily check-ins ----------
//
// habits:   { _id, title, url, days: [0-6] (0 = Sunday), position, createdAt }
// checkins: { _id: "<habitId>:<YYYY-MM-DD>", habitId, date, at }
// Dates are the browser's local calendar day, so "today" follows the viewer's time zone.

export const DEFAULT_HABITS = [
  { title: 'LeetCode POTD', url: 'https://leetcode.com/problemset/', days: [0, 1, 2, 3, 4, 5, 6] },
  { title: 'GFG POTD', url: 'https://www.geeksforgeeks.org/problem-of-the-day', days: [0, 1, 2, 3, 4, 5, 6] },
  { title: 'CodeChef Starters', url: 'https://www.codechef.com/contests', days: [3] },
  { title: 'LeetCode Weekly Contest', url: 'https://leetcode.com/contest/', days: [0] },
];

export async function listHabits() {
  return (await (await habits()).find({}).sort({ position: 1, createdAt: 1 }).toArray()).map(publicDoc);
}

export async function seedHabits() {
  const col = await habits();
  if (await col.countDocuments()) return false;
  const now = new Date().toISOString();
  await col.insertMany(DEFAULT_HABITS.map((h, position) => ({ _id: newId(), ...h, position, createdAt: now })));
  return true;
}

export async function createHabit({ title, url = null, days }) {
  const col = await habits();
  const doc = { _id: newId(), title, url, days, position: await col.countDocuments(), createdAt: new Date().toISOString() };
  await col.insertOne(doc);
  return publicDoc(doc);
}

export async function updateHabit(id, patch) {
  const $set = {};
  for (const key of ['title', 'url', 'days']) if (patch[key] !== undefined) $set[key] = patch[key];
  const res = await (await habits()).findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
  return res ? publicDoc(res) : null;
}

export async function deleteHabit(id) {
  const ok = (await (await habits()).deleteOne({ _id: id })).deletedCount > 0;
  if (ok) await (await checkins()).deleteMany({ habitId: id });
  return ok;
}

export async function listCheckins(since) {
  const docs = await (await checkins()).find({ date: { $gte: since } }, { projection: { _id: 0, habitId: 1, date: 1 } }).toArray();
  return docs;
}

export async function setCheckin(habitId, date, done) {
  if (!(await (await habits()).countDocuments({ _id: habitId }))) return null;
  const col = await checkins();
  const _id = `${habitId}:${date}`;
  if (done) await col.updateOne({ _id }, { $setOnInsert: { habitId, date, at: new Date().toISOString() } }, { upsert: true });
  else await col.deleteOne({ _id });
  return { habitId, date, done };
}

// ---------- tasks ----------
// { _id, title, date: "YYYY-MM-DD" | null (someday), done, doneAt, createdAt }

export async function listTasks() {
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const docs = await (await tasks())
    .find({ $or: [{ done: false }, { doneAt: { $gte: monthAgo } }] })
    .sort({ date: 1, createdAt: 1 })
    .toArray();
  return docs.map(publicDoc);
}

export async function createTask({ title, date = null }) {
  const doc = { _id: newId(), title, date, done: false, doneAt: null, createdAt: new Date().toISOString() };
  await (await tasks()).insertOne(doc);
  return publicDoc(doc);
}

export async function updateTask(id, patch) {
  const $set = {};
  for (const key of ['title', 'date']) if (patch[key] !== undefined) $set[key] = patch[key];
  if (patch.done !== undefined) {
    $set.done = patch.done;
    $set.doneAt = patch.done ? new Date().toISOString() : null;
  }
  const res = await (await tasks()).findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
  return res ? publicDoc(res) : null;
}

export async function deleteTask(id) {
  return (await (await tasks()).deleteOne({ _id: id })).deletedCount > 0;
}

// ---------- resources ----------
// Your own links ({ _id, title, url, category, note }) plus the 📚 Resources of every roadmap.

export async function listResources() {
  const [mine, fromRoadmaps] = await Promise.all([
    (await links()).find({}).sort({ category: 1, title: 1 }).toArray(),
    (await roadmaps()).find({ 'resources.0': { $exists: true } }, { projection: { title: 1, resources: 1, position: 1 } }).sort({ position: 1, title: 1 }).toArray(),
  ]);
  return {
    links: mine.map(publicDoc),
    roadmaps: fromRoadmaps.map((r) => ({ id: r._id, title: r.title, resources: r.resources })),
  };
}

export async function createLink({ title, url, category = '', note = '' }) {
  const doc = { _id: newId(), title, url, category, note, createdAt: new Date().toISOString() };
  await (await links()).insertOne(doc);
  return publicDoc(doc);
}

export async function updateLink(id, patch) {
  const $set = {};
  for (const key of ['title', 'url', 'category', 'note']) if (patch[key] !== undefined) $set[key] = patch[key];
  const res = await (await links()).findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
  return res ? publicDoc(res) : null;
}

export async function deleteLink(id) {
  return (await (await links()).deleteOne({ _id: id })).deletedCount > 0;
}

// ---------- student profile ----------
// One document (_id "owner"): basic details, education, skills, links and coding profiles.

const profiles = () => collection('profile');

export async function getProfile() {
  const doc = await (await profiles()).findOne({ _id: 'owner' });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function saveProfile(profile) {
  const doc = { ...profile, updatedAt: new Date().toISOString() };
  await (await profiles()).replaceOne({ _id: 'owner' }, doc, { upsert: true });
  return doc;
}

export async function seedProfile(profile) {
  const res = await (await profiles()).updateOne({ _id: 'owner' }, { $setOnInsert: { ...profile, updatedAt: new Date().toISOString() } }, { upsert: true });
  return res.upsertedCount > 0;
}

// ---------- stats ----------

// Day buckets, streaks and "today" are computed in the browser so they follow the
// viewer's time zone rather than the server's (Vercel runs in UTC).
export async function stats() {
  const docs = await (await roadmaps())
    .find({}, { projection: { 'sections.items.status': 1, 'sections.items.doneAt': 1 } })
    .toArray();
  let total = 0;
  let done = 0;
  const doneAt = [];
  for (const d of docs) {
    for (const s of d.sections) {
      for (const i of s.items) {
        total++;
        if (i.status === 'done') done++;
        if (i.doneAt) doneAt.push(i.doneAt);
      }
    }
  }
  return { total, done, doneAt };
}
