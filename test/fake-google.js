// An in-memory stand-in for Google's OAuth and Calendar endpoints, used through the client's
// fetch hook. It implements only what the app calls, with Google's response shapes.
export function fakeGoogle() {
  const state = { calendars: new Map(), events: new Map(), seq: 0, tokenCalls: 0, failNext: null, revoked: false, channels: [], invalidGrant: false };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const now = () => new Date(Date.now() + state.seq++).toISOString();

  async function fetchImpl(url, init = {}) {
    const u = new URL(url);
    const method = init.method || 'GET';
    if (state.failNext && state.failNext.match(u, method)) { const f = state.failNext; if (--f.times <= 0) state.failNext = null; return json({ error: { message: f.message } }, f.status); }
    if (u.href.startsWith('https://oauth2.googleapis.com/token')) {
      state.tokenCalls++;
      const p = new URLSearchParams(init.body);
      if (state.invalidGrant) return json({ error: 'invalid_grant' }, 400);
      if (p.get('grant_type') === 'authorization_code') {
        const idToken = `x.${Buffer.from(JSON.stringify({ email: 'owner@example.com' })).toString('base64url')}.y`;
        return json({ access_token: 'at-1', refresh_token: 'rt-secret', expires_in: 3600, scope: 'https://www.googleapis.com/auth/calendar.app.created openid email', id_token: idToken });
      }
      return json({ access_token: `at-${state.tokenCalls}`, expires_in: 3600 });
    }
    if (u.href.startsWith('https://oauth2.googleapis.com/revoke')) { state.revoked = true; return json({}); }
    const path = u.pathname.replace('/calendar/v3', '');
    const body = init.body ? JSON.parse(init.body) : null;
    let m;
    if (path === '/calendars' && method === 'POST') {
      const id = `cal${state.calendars.size + 1}@group.calendar.google.com`;
      state.calendars.set(id, { id, ...body });
      return json({ id, ...body });
    }
    if ((m = path.match(/^\/calendars\/([^/]+)$/))) {
      const cal = state.calendars.get(decodeURIComponent(m[1]));
      return cal ? json(cal) : json({ error: { message: 'Not Found' } }, 404);
    }
    if (path === '/channels/stop') return new Response(null, { status: 204 });
    if ((m = path.match(/^\/calendars\/([^/]+)\/events\/watch$/))) {
      state.channels.push(body);
      return json({ kind: 'api#channel', id: body.id, resourceId: 'res-1', expiration: String(Date.now() + 86400000) });
    }
    if ((m = path.match(/^\/calendars\/([^/]+)\/events$/))) {
      const cal = decodeURIComponent(m[1]);
      if (method === 'POST') {
        const id = `ev${state.events.size + 1}`;
        const ev = { id, calendar: cal, status: 'confirmed', updated: now(), ...body };
        state.events.set(id, ev);
        return json(ev);
      }
      let items = [...state.events.values()].filter((e) => e.calendar === cal);
      const prop = u.searchParams.get('privateExtendedProperty');
      if (prop) {
        const [k, v] = prop.split('=');
        items = items.filter((e) => e.extendedProperties?.private?.[k] === v && e.status !== 'cancelled');
      }
      const since = u.searchParams.get('syncToken');
      if (since) items = items.filter((e) => e.updated > since);
      return json({ items, nextSyncToken: now() });
    }
    if ((m = path.match(/^\/calendars\/([^/]+)\/events\/([^/]+)$/))) {
      const ev = state.events.get(decodeURIComponent(m[2]));
      if (!ev || ev.status === 'cancelled') return json({ error: { message: 'Not Found' } }, method === 'DELETE' && ev ? 410 : 404);
      if (method === 'DELETE') { ev.status = 'cancelled'; ev.updated = now(); return new Response(null, { status: 204 }); }
      if (method === 'PUT') Object.assign(ev, { ...body, id: ev.id, calendar: ev.calendar, status: 'confirmed', updated: now() });
      if (method === 'PATCH') {
        if (body.extendedProperties) ev.extendedProperties = { private: { ...ev.extendedProperties?.private, ...body.extendedProperties.private } };
        Object.assign(ev, { ...body, extendedProperties: ev.extendedProperties, updated: now() });
      }
      return json(ev);
    }
    return json({ error: { message: `fake-google: unhandled ${method} ${path}` } }, 500);
  }

  // Helpers to act "as the user in Google Calendar".
  state.userEdit = (id, patch) => { const ev = state.events.get(id); Object.assign(ev, patch, { updated: new Date(Date.now() + 60_000 + state.seq++).toISOString() }); };
  state.userCreate = (calendar, ev) => { const id = `user${state.events.size + 1}`; state.events.set(id, { id, calendar, status: 'confirmed', updated: new Date(Date.now() + 60_000 + state.seq++).toISOString(), ...ev }); return id; };
  state.userDelete = (id) => { const ev = state.events.get(id); ev.status = 'cancelled'; ev.updated = new Date(Date.now() + 60_000 + state.seq++).toISOString(); };
  return { fetchImpl, state };
}
