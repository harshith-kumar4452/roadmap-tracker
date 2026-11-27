// Google OAuth 2.0 and Calendar API v3 over plain fetch (no googleapis SDK: it is ~100 MB and we
// need five endpoints). Docs: https://developers.google.com/identity/protocols/oauth2/web-server
// and https://developers.google.com/calendar/api/v3/reference
//
// Scope: calendar.app.created lets the app create its own secondary calendar and manage events
// only in calendars it created. It cannot read or change any of the user's other calendars, so
// unrelated personal events can never be overwritten.
import { collection } from '../store.js';
import { encrypt, decrypt } from './crypto.js';

export const SCOPES = ['https://www.googleapis.com/auth/calendar.app.created', 'openid', 'email'];
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const API = 'https://www.googleapis.com/calendar/v3';

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

let fetchImpl = (...a) => fetch(...a);
export const _setFetch = (f) => { fetchImpl = f || ((...a) => fetch(...a)); };

export class GoogleError extends Error {
  constructor(message, { status = 502, code, reconnect = false } = {}) {
    super(message);
    this.status = status;
    this.expose = true;
    this.code = code;
    this.reconnect = reconnect;
  }
}

const integrations = () => collection('integrations');
export const getIntegration = async () => (await integrations()).findOne({ _id: 'google' });
export async function saveIntegration(patch) {
  await (await integrations()).updateOne({ _id: 'google' }, { $set: patch }, { upsert: true });
}
export async function removeIntegration() {
  await (await integrations()).deleteOne({ _id: 'google' });
}

export function authUrl({ redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // we need a refresh token for background sync
    prompt: 'consent', // always return a refresh token, even on re-connect
    include_granted_scopes: 'false',
    state,
  });
  return `${AUTH_URL}?${p}`;
}

async function tokenRequest(params) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reconnect = json.error === 'invalid_grant';
    throw new GoogleError(reconnect ? 'Google access expired or was revoked. Connect Google Calendar again.' : `Google sign-in failed: ${json.error_description || json.error || res.status}`, { status: reconnect ? 401 : 502, code: json.error, reconnect });
  }
  return json;
}

const emailFromIdToken = (idToken) => {
  try { return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()).email || null; } catch { return null; }
};

export async function exchangeCode({ code, redirectUri }) {
  const t = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new GoogleError('Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.');
  const granted = String(t.scope || '').split(' ');
  if (!granted.includes(SCOPES[0])) throw new GoogleError('Calendar access was not granted. Connect again and allow calendar access.', { status: 400 });
  return {
    refreshTokenEnc: encrypt(t.refresh_token),
    email: t.id_token ? emailFromIdToken(t.id_token) : null,
    access: { token: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 },
  };
}

// Access tokens live ~1 hour; cache per serverless instance and refresh on demand.
let access = null;
export const _resetAccess = () => { access = null; };
export const primeAccess = (a) => { access = a; };

async function accessToken() {
  if (access && access.exp > Date.now()) return access.token;
  const integ = await getIntegration();
  if (!integ?.refreshTokenEnc) throw new GoogleError('Google Calendar is not connected.', { status: 400, reconnect: true });
  try {
    const t = await tokenRequest({ refresh_token: decrypt(integ.refreshTokenEnc), grant_type: 'refresh_token' });
    access = { token: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
    return access.token;
  } catch (err) {
    if (err.reconnect) await saveIntegration({ status: 'expired', lastError: err.message, lastErrorAt: new Date().toISOString() });
    throw err;
  }
}

// Calendar API call with retry on 429 / 5xx and one token refresh on 401.
export async function gcal(path, { method = 'GET', query, body, okStatuses = [] } = {}) {
  let refreshed = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    const token = await accessToken();
    const url = `${API}${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
    let res;
    try {
      res = await fetchImpl(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 400 * 2 ** attempt)); continue; }
      throw new GoogleError('Could not reach Google Calendar.');
    }
    if (okStatuses.includes(res.status)) return { status: res.status };
    if (res.status === 401 && !refreshed) { access = null; refreshed = true; continue; }
    if ((res.status === 429 || res.status >= 500 || (res.status === 403 && attempt < 2)) && attempt < 3) {
      const json = res.status === 403 ? await res.clone().json().catch(() => ({})) : null;
      const rate = !json || /rate|quota/i.test(JSON.stringify(json));
      if (rate) { await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); continue; }
    }
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      throw new GoogleError(`Google Calendar: ${msg}`, { status: res.status === 404 || res.status === 410 ? res.status : 502, code: res.status });
    }
    return json;
  }
  throw new GoogleError('Google Calendar is busy. Try again in a minute.', { status: 503 });
}

export async function revoke() {
  const integ = await getIntegration();
  if (!integ?.refreshTokenEnc) return;
  try {
    await fetchImpl(`${REVOKE_URL}?token=${encodeURIComponent(decrypt(integ.refreshTokenEnc))}`, { method: 'POST', signal: AbortSignal.timeout(10_000) });
  } catch { /* best effort: the local token is deleted either way */ }
}
