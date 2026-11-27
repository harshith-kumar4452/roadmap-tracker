// /api/google: connect / disconnect Google Calendar (owner), sync status, manual sync, webhook.
import express from 'express';
import { randomBytes } from 'node:crypto';
import { httpError, ownerOnly } from '../http.js';
import * as g from './client.js';
import * as sync from './sync.js';
import { sign, verify } from './crypto.js';
import * as taskStore from '../tasks/store.js';

const router = express.Router();
const STATE_COOKIE = 'rt_gstate';

export const originOf = (req) => {
  if (process.env.GOOGLE_REDIRECT_URI) return new URL(process.env.GOOGLE_REDIRECT_URI).origin;
  const proto = req.headers['x-forwarded-proto']?.split(',')[0] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};
const redirectUri = (req) => process.env.GOOGLE_REDIRECT_URI || `${originOf(req)}/api/google/callback`;
const readCookie = (req, name) => (req.headers.cookie || '').split(';').map((p) => p.trim().split('=')).find(([k]) => k === name)?.slice(1).join('=');

router.get('/status', async (req, res) => {
  ownerOnly(req, 'Log in as owner to manage calendar sync');
  const integ = await g.getIntegration();
  const counts = integ ? await taskStore.syncCounts() : { errors: 0, synced: 0 };
  res.json({
    configured: g.googleConfigured(),
    connected: integ?.status === 'connected',
    status: integ?.status || 'disconnected',
    email: integ?.email || null,
    calendarId: integ?.calendarId || null,
    connectedAt: integ?.connectedAt || null,
    lastSyncAt: integ?.lastSyncAt || null,
    lastPullAt: integ?.lastPullAt || null,
    lastError: integ?.lastError || null,
    webhook: integ?.channel?.id ? { active: true, expiresAt: integ.channel.expiration } : { active: false, error: integ?.watchError || null },
    ...counts,
  });
});

router.get('/connect', (req, res) => {
  ownerOnly(req, 'Log in as owner to connect Google Calendar');
  if (!g.googleConfigured()) throw httpError(503, 'Google Calendar is not set up on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
  const nonce = randomBytes(16).toString('base64url');
  const secure = originOf(req).startsWith('https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=${nonce}; HttpOnly; Path=/api/google; Max-Age=600; SameSite=Lax${secure}`);
  res.redirect(g.authUrl({ redirectUri: redirectUri(req), state: `${nonce}.${sign(nonce)}` }));
});

router.get('/callback', async (req, res) => {
  const back = (q) => res.redirect(`/#/calendar?${new URLSearchParams(q)}`);
  const clear = `${STATE_COOKIE}=; HttpOnly; Path=/api/google; Max-Age=0; SameSite=Lax`;
  res.setHeader('Set-Cookie', clear);
  if (!req.session || req.session.role !== 'admin') return back({ google: 'error', reason: 'Log in as owner first.' });
  if (req.query.error) return back({ google: 'error', reason: req.query.error === 'access_denied' ? 'Access was not granted.' : String(req.query.error).slice(0, 100) });
  const [nonce, sig] = String(req.query.state || '').split('.');
  if (!nonce || !verify(nonce, sig) || readCookie(req, STATE_COOKIE) !== nonce) return back({ google: 'error', reason: 'The sign-in link expired. Try connecting again.' });
  try {
    const t = await g.exchangeCode({ code: String(req.query.code || ''), redirectUri: redirectUri(req) });
    const old = await g.getIntegration();
    if (old?.channel) await sync.stopWatch(old.channel).catch(() => {});
    g.primeAccess(t.access);
    await g.saveIntegration({
      status: 'connected', email: t.email, refreshTokenEnc: t.refreshTokenEnc, connectedAt: new Date().toISOString(),
      // Keep the calendar if the same account reconnects; ensureCalendar re-creates it if it's gone.
      calendarId: old?.email && old.email === t.email ? old.calendarId || null : null,
      syncToken: null, lastError: null, channel: null,
    });
    await sync.syncAll();
    await sync.watch(originOf(req));
    back({ google: 'connected' });
  } catch (err) {
    back({ google: 'error', reason: err.message.slice(0, 200) });
  }
});

router.post('/sync', async (req, res) => {
  ownerOnly(req);
  if (!(await sync.connected())) throw httpError(400, 'Google Calendar is not connected.');
  res.json(await sync.syncAll());
});

router.post('/disconnect', async (req, res) => {
  ownerOnly(req);
  const integ = await g.getIntegration();
  if (integ) {
    if (integ.channel) await sync.stopWatch(integ.channel).catch(() => {});
    await g.revoke();
    await g.removeIntegration();
    await taskStore.clearGoogleLinks();
    g._resetAccess();
  }
  res.json({ connected: false });
});

// Google push notification: verify the channel token, then pull changes. Google only needs a 2xx.
router.post('/webhook', async (req, res) => {
  const id = req.headers['x-goog-channel-id'];
  const token = req.headers['x-goog-channel-token'];
  const integ = await g.getIntegration();
  if (!id || !verify(String(id), token) || integ?.channel?.id !== id) return res.status(204).end();
  if (req.headers['x-goog-resource-state'] === 'sync') return res.status(204).end(); // the initial handshake
  try { await sync.pull(); } catch { /* recorded on the integration; the cron retries */ }
  res.status(204).end();
});

export default router;
