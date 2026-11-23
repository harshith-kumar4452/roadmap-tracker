// Loads seed/roadmaps.json into MongoDB.
// Usage: npm run seed            (only inserts roadmaps that are not there yet)
//        npm run seed -- --reset (deletes every roadmap first, then inserts)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Put it in .env first.');
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(path.join(root, 'seed', 'roadmaps.json'), 'utf8'));
const client = await new MongoClient(process.env.MONGODB_URI).connect();
try {
  const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
  if (process.argv.includes('--reset')) {
    const { deletedCount } = await col.deleteMany({});
    console.log(`Deleted ${deletedCount} roadmaps`);
  }
  let added = 0;
  for (const { id, ...doc } of seed) {
    const res = await col.updateOne({ title: doc.title }, { $setOnInsert: { _id: id, createdAt: new Date().toISOString(), ...doc } }, { upsert: true });
    if (res.upsertedCount) added++;
  }
  await col.createIndex({ 'sections.id': 1 });
  await col.createIndex({ 'sections.items.id': 1 });
  console.log(`Seeded ${added} new roadmaps (${seed.length - added} already existed)`);

  // Cheat sheets, projects and mindmaps. Matched on kind + title, so your edits are never overwritten.
  const pagesFile = path.join(root, 'seed', 'pages.json');
  if (fs.existsSync(pagesFile)) {
    const pageSeed = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));
    const pages = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('pages');
    let addedPages = 0;
    for (const p of pageSeed) {
      const now = new Date().toISOString();
      const res = await pages.updateOne(
        { kind: p.kind, title: p.title },
        { $setOnInsert: { _id: randomBytes(6).toString('base64url'), summary: '', tags: [], status: p.kind === 'project' ? 'idea' : '', ...p, createdAt: now, updatedAt: now } },
        { upsert: true },
      );
      if (res.upsertedCount) addedPages++;
    }
    await pages.createIndex({ kind: 1, updatedAt: -1 });
    console.log(`Seeded ${addedPages} new pages (${pageSeed.length - addedPages} already existed)`);
  }

  // Default practice routine (LeetCode/GFG POTD, CodeChef Starters, LeetCode Weekly), only if there is none yet.
  const store = await import('../src/store.js');
  console.log((await store.seedHabits()) ? 'Added the default practice routine' : 'Practice routine already set up');

  // Student profile, only if there isn't one yet (so your edits are kept).
  const profileFile = path.join(root, 'seed', 'profile.json');
  if (fs.existsSync(profileFile)) {
    const added = await store.seedProfile(JSON.parse(fs.readFileSync(profileFile, 'utf8')));
    console.log(added ? 'Added the profile' : 'Profile already set up');
  }
} finally {
  await client.close();
}
process.exit(0); // the store module keeps its own connection open
