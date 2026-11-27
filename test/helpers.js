// Test helpers: runs the Express app on a random port against a throwaway MongoDB database.
// Needs TEST_MONGODB_URI (e.g. mongodb://127.0.0.1:27099); tests are skipped without it.
// The database named here is dropped at the start of every run, so never point it at real data.
import { randomBytes } from 'node:crypto';

export const TEST_URI = process.env.TEST_MONGODB_URI || '';
export const skip = !TEST_URI && 'set TEST_MONGODB_URI to run database tests';

export async function startApp() {
  process.env.MONGODB_URI = TEST_URI;
  process.env.MONGODB_DB = `rt_test_${process.pid}`;
  process.env.ADMIN_PASSWORD = randomBytes(12).toString('base64url');
  delete process.env.GEMINI_API_KEY;
  const { MongoClient } = await import('mongodb');
  const client = await new MongoClient(TEST_URI).connect();
  await client.db(process.env.MONGODB_DB).dropDatabase();
  const { default: app } = await import('../src/app.js');
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    db: client.db(process.env.MONGODB_DB),
    async close() {
      await client.db(process.env.MONGODB_DB).dropDatabase();
      await client.close();
      server.close();
      const store = await import('../src/store.js');
      await store.closeDb?.();
    },
  };
}

// A tiny cookie-keeping client.
export function client(base) {
  const jar = new Map();
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jar.size ? { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const [k, ...v] = pair.trim().split('=');
      if (attrs.some((a) => /max-age=0/i.test(a.trim())) || !v.join('=')) jar.delete(k); else jar.set(k, v.join('='));
    }
    const type = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : await res.text() };
  };
  return {
    get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), put: (p, b = {}) => call('PUT', p, b),
    patch: (p, b = {}) => call('PATCH', p, b), del: (p) => call('DELETE', p),
    // Owner account created with the setup key (test-only values).
    async signupOwner() { return call('POST', '/api/signup', { name: 'Owner', username: 'owner1', password: 'test-pass-123', setupKey: process.env.ADMIN_PASSWORD }); },
    async signupMember(username = 'member1') { return call('POST', '/api/signup', { name: 'Member', username, password: 'test-pass-123' }); },
  };
}
