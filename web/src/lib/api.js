// fetch wrapper for the Express API. Throws ApiError with the server's message.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let authenticated = false;
export const setAuthenticated = (v) => { authenticated = v; };

// Publicly cached lists: signed-in users bypass the shared CDN copy so their edits show at once.
const SHARED = /^\/(roadmaps|stats)$/;

export async function api(path, { method = 'GET', body, signal, form } = {}) {
  let url = `/api${path}`;
  if (method === 'GET' && authenticated && SHARED.test(path)) url += `?fresh=${Date.now()}`;
  const res = await fetch(url, {
    method,
    signal,
    headers: body !== undefined && !form ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'same-origin',
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  return data;
}

// Tiny pub/sub so widgets refresh when another part of the app changes the same data.
const listeners = new Map();
export function onChange(topic, fn) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic).add(fn);
  return () => listeners.get(topic).delete(fn);
}
export function changed(topic) {
  listeners.get(topic)?.forEach((fn) => fn());
}
