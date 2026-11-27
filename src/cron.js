// /api/cron/daily: run once a day by Vercel Cron (vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>"; any other caller is refused.
//  1. creates today's recommended coding problem,
//  2. reconciles Google Calendar (pull changes, retry failed pushes),
//  3. renews the Google webhook channel before it expires.
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { httpError, todayIso } from './http.js';
import * as coding from './coding/service.js';
import * as gsync from './google/sync.js';
import { originOf } from './google/routes.js';

const router = express.Router();

const authorized = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(String(req.headers.authorization || ''));
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
};

router.get('/daily', async (req, res) => {
  if (!authorized(req)) throw httpError(401, 'Unauthorized');
  const out = { date: todayIso() };
  try {
    await coding.ensureIndexes();
    const r = await coding.ensureDaily(out.date);
    out.coding = r.problem ? { title: r.problem.title, created: r.created } : { error: r.errors };
  } catch (err) { out.coding = { error: err.message }; }
  try {
    const integ = await gsync.connected();
    if (integ) {
      out.google = await gsync.syncAll();
      const exp = integ.channel?.expiration;
      if (!exp || exp - Date.now() < 2 * 86400000) out.google.watch = await gsync.watch(originOf(req));
    } else out.google = { skipped: true };
  } catch (err) { out.google = { error: err.message }; }
  res.json(out);
});

export default router;
