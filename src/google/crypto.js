// Encrypts OAuth refresh tokens at rest (AES-256-GCM). The key comes from TOKEN_ENCRYPTION_KEY,
// or is derived (HKDF) from SESSION_SECRET / ADMIN_PASSWORD, so a database leak alone does not
// expose a usable Google token.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

function key() {
  const base = process.env.TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!base) throw Object.assign(new Error('Set TOKEN_ENCRYPTION_KEY (or ADMIN_PASSWORD) to store Google tokens.'), { status: 500, expose: true });
  return Buffer.from(hkdfSync('sha256', base, 'roadmap-tracker', 'google-token-v1', 32));
}

export function encrypt(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decrypt(box) {
  const [v, iv, tag, data] = String(box).split('.');
  if (v !== 'v1') throw new Error('Unknown token format');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
}

// Signed, short-lived values (OAuth state, webhook channel tokens).
export function sign(value) {
  return createHmac('sha256', key()).update(value).digest('base64url');
}
export function verify(value, sig) {
  const a = Buffer.from(sign(value));
  const b = Buffer.from(String(sig || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
