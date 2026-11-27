// Small request-validation helpers shared by every router.
import * as auth from './auth.js';

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true; // written for the user, safe to show even for 5xx
  return err;
}

export const text = (v, name, { required = true, max = 500 } = {}) => {
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string' || (required && !v.trim())) throw httpError(400, `${name} is required`);
  return v.trim().slice(0, max);
};

export const optionalUrl = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !/^https?:\/\//i.test(v.trim())) throw httpError(400, 'Links must start with http:// or https://');
  return v.trim();
};

export const found = (v, what) => {
  if (!v) throw httpError(404, `${what} not found`);
  return v;
};

export const id = (req) => text(req.params.id, 'id', { max: 64 });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const date = (v, name = 'date') => {
  if (typeof v !== 'string' || !DATE.test(v) || Number.isNaN(Date.parse(v))) throw httpError(400, `${name} must be YYYY-MM-DD`);
  return v;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const time = (v, name = 'time') => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !TIME.test(v)) throw httpError(400, `${name} must be HH:MM (24-hour)`);
  return v;
};

export const oneOf = (v, list, name, { required = false } = {}) => {
  if (v === undefined && !required) return undefined;
  if (!list.includes(v)) throw httpError(400, `${name} must be one of: ${list.join(', ')}`);
  return v;
};

export const int = (v, name, { min = -Infinity, max = Infinity, fallback } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (fallback !== undefined) return fallback;
    throw httpError(400, `${name} is required`);
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw httpError(400, `${name} must be a whole number from ${min} to ${max}`);
  return n;
};

export const ownerOnly = (req, message = 'Log in as owner to use this') => {
  if (!auth.isAdmin(req)) throw httpError(401, message);
};

export const signedIn = (req, message = 'Log in to use this') => {
  const s = auth.getSession(req);
  if (!s) throw httpError(401, message);
  return s;
};

// Today's date in the owner's time zone (APP_TIMEZONE, default Asia/Kolkata), as YYYY-MM-DD.
export function todayIso(tz = process.env.APP_TIMEZONE || 'Asia/Kolkata', at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}
