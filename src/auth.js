import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// One owner account (name, username, scrypt-hashed password) stored in MongoDB.
// Anyone can read the public pages; editing needs a signed session cookie.
//
// ADMIN_PASSWORD (env) has two jobs:
//  - the one-time setup key that /signup asks for, so a stranger can't claim the site first;
//  - the secret that signs session cookies (unless SESSION_SECRET is set).

const scryptAsync = promisify(scrypt);
const COOKIE = 'rt_session';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

const setupKey = () => process.env.ADMIN_PASSWORD || '';
const secret = () => process.env.SESSION_SECRET || setupKey();

const sha = (s) => createHash('sha256').update(String(s)).digest();
const sign = (value) => createHmac('sha256', secret()).update(value).digest('base64url');

export const editingEnabled = () => Boolean(secret());

export function checkSetupKey(candidate) {
  if (!setupKey() || typeof candidate !== 'string') return false;
  return timingSafeEqual(sha(candidate), sha(setupKey()));
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = (await scryptAsync(password, salt, 64)).toString('base64url');
  return { salt, hash };
}

export async function verifyPassword(password, account) {
  if (typeof password !== 'string' || !account) return false;
  const given = await scryptAsync(password, account.salt, 64);
  const expected = Buffer.from(account.hash, 'base64url');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function readCookie(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

export function isAdmin(req) {
  if (!editingEnabled()) return false;
  const raw = readCookie(req);
  if (!raw) return false;
  const [payload, exp, sig] = raw.split('.');
  if (payload !== 'admin' || !exp || !sig || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(`${payload}.${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const secureFlag = (req) =>
  req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';

export function setSession(req, res) {
  const exp = Date.now() + MAX_AGE_S * 1000;
  const value = `admin.${exp}.${sign(`admin.${exp}`)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; HttpOnly; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax${secureFlag(req)}`);
}

export function clearSession(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag(req)}`);
}

// Slows down password guessing. Serverless instances don't share memory, so this
// is a speed bump rather than a hard limit; pick a long password.
const attempts = new Map();
export function tooManyAttempts(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(ip, recent);
  return recent.length >= 10;
}
export function recordFailure(ip) {
  attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);
}
