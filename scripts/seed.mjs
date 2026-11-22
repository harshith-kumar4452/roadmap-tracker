// Loads seed/roadmaps.json into MongoDB.
// Usage: npm run seed            (only inserts roadmaps that are not there yet)
//        npm run seed -- --reset (deletes every roadmap first, then inserts)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

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
} finally {
  await client.close();
}
