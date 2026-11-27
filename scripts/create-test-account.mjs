// Creates a read-only test login (a member account) for checking pages that need sign-in.
// Members can open every roadmap and page but can't change anything.
//
// Usage: npm run test-account
//
// The username comes from TEST_USERNAME in .env (default "tester"). The password comes from
// TEST_PASSWORD; if that is empty, a random one is generated and written to .env, which git
// ignores. The password is never printed. Running it again when the account exists does nothing.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { hashPassword } from '../src/auth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Put it in .env first.');
  process.exit(1);
}

const username = (process.env.TEST_USERNAME || 'tester').trim().toLowerCase();
if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
  console.error('TEST_USERNAME: 3–40 letters, numbers, dots, dashes or underscores.');
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
try {
  const accounts = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('accounts');
  const existing = await accounts.findOne({ username });
  if (existing) {
    console.log(`Account "${username}" already exists (${existing.role}). Nothing to do.`);
    if (existing.role !== 'member') console.log('It is not a member account, so pick another TEST_USERNAME for testing.');
    process.exit(0);
  }

  let password = process.env.TEST_PASSWORD || '';
  if (!password) {
    password = randomBytes(18).toString('base64url');
    let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    const set = (key, value) => {
      const line = `${key}=${value}`;
      const re = new RegExp(`^${key}=.*$`, 'm');
      env = re.test(env) ? env.replace(re, line) : `${env.replace(/\s*$/, '\n')}${line}\n`;
    };
    set('TEST_USERNAME', username);
    set('TEST_PASSWORD', password);
    fs.writeFileSync(envFile, env);
    console.log('Generated a password and saved TEST_USERNAME / TEST_PASSWORD in .env');
  } else if (password.length < 8) {
    console.error('TEST_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await accounts.insertOne({
    _id: `user:${username}`,
    role: 'member',
    name: 'Test user',
    username,
    ...(await hashPassword(password)),
    createdAt: new Date().toISOString(),
  });
  console.log(`Created read-only test account "${username}". The password is TEST_PASSWORD in .env.`);
} finally {
  await client.close();
}
