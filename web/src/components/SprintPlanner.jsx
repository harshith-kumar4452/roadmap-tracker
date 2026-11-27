// Sprint planner (ported from the old planner): builds a 3-sprint study plan for a job role and
// adds it to the calendar as tasks. Also offers to import calendar data the old planner kept only
// in this browser's storage, so nothing is lost in the move.
import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Slider, Stack,
  TextField, ToggleButton, ToggleButtonGroup, Typography, List, ListItem, ListItemText, Chip,
} from '@mui/material';
import { api, changed } from '../lib/api.js';
import { isoDay, addDays } from '../lib/hooks.js';
import { useNotify } from '../lib/notify.jsx';

export const ROLE_MODULES = {
  sde: ['DSA Basics & Arrays', 'Recursion, Trees & Graphs', 'Dynamic Programming', 'OS & Computer Networks', 'DBMS & SQL', 'OOPS & LLD', 'HLD & Mock Interviews'],
  backend: ['Node.js & REST APIs', 'DBMS & SQL Indexing', 'Authentication & Security', 'Redis Caching & Internals', 'Kafka & Async Queues', 'Microservices & HLD', 'Backend Build Projects'],
  data_engineer: ['SQL Window Functions & CTEs', 'Python for Data Pipelines', 'Data Modeling & DBMS', 'Kafka Event Streaming', 'AWS Data Lakes (S3/Glue)', 'ETL Backfills & Quality', 'Pipeline Case Studies'],
  data_analyst: ['SQL Aggregations & Joins', 'Power BI & DAX Modeling', 'Python (Pandas & EDA)', 'Product Metrics & Funnels', 'A/B Testing & Stats', 'Quantitative & Logical Prep', 'Dashboard Case Studies'],
  ai_engineer: ['Python & Linear Algebra', 'Supervised & Unsupervised ML', 'Neural Networks & PyTorch', 'Transformers & Embeddings', 'RAG & Vector Databases', 'LLM Evals & Guardrails', 'AWS Deployment & Serving'],
  frontend: ['Modern JS & Async Patterns', 'React Hooks & State', 'TypeScript & Component Design', 'Performance & Accessibility', 'Backend APIs & Auth', 'SQL & Data Fetching', 'Full Stack Capstone'],
  aptitude: ['Number System & Percentages', 'Ratio, Profit & Averages', 'Time, Work & Probability', 'Logical Reasoning & Puzzles', 'Verbal & Reading Comp', 'DSA Interview Patterns', 'Timed Mock Tests'],
};
const ROLE_LABEL = { sde: 'SDE', backend: 'Backend engineer', data_engineer: 'Data engineer', data_analyst: 'Data analyst', ai_engineer: 'AI engineer', frontend: 'Frontend / full-stack', aptitude: 'Placement / aptitude' };
const SPRINT_NAMES = ['Foundations', 'Core depth', 'Mastery & mocks'];

export function buildSprints({ role, level, hoursPerDay, sprintDays, startDate, startTime }) {
  const modules = ROLE_MODULES[role];
  const offset = level === 'Advanced' ? 2 : level === 'Intermediate' ? 1 : 0;
  const ordered = modules.slice(offset).concat(modules.slice(0, offset));
  const pace = hoursPerDay >= 3 ? 2 : 1;
  const mins = Math.round(hoursPerDay * 60);
  const endTime = (() => { const [h, m] = startTime.split(':').map(Number); const t = Math.min(23 * 60 + 59, h * 60 + m + mins); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })();
  const out = [];
  let mod = 0;
  for (let s = 0; s < 3; s++) {
    for (let d = 0; d < sprintDays; d++) {
      const review = d === sprintDays - 1;
      const focus = review ? `Sprint ${s + 1} review and mock practice` : ordered[mod % ordered.length];
      if (!review) mod += pace;
      out.push({
        title: `${focus}`, date: addDays(startDate, s * sprintDays + d), time: startTime, endTime,
        priority: review ? 'high' : 'medium', category: 'study',
        notes: `Sprint ${s + 1}: ${SPRINT_NAMES[s]} (${ROLE_LABEL[role]}, ${level}) · day ${d + 1} of ${sprintDays} · ${mins} min`,
      });
    }
  }
  return out;
}

export default function SprintPlanner({ open, onClose }) {
  const notify = useNotify();
  const [f, setF] = useState({ role: 'sde', level: 'Beginner', hoursPerDay: 2, sprintDays: 7, startDate: isoDay(), startTime: '19:00' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const plan = useMemo(() => buildSprints(f), [f]);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const add = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api('/tasks/bulk', { method: 'POST', body: { items: plan, source: 'planner' } });
      changed('tasks');
      notify(`Added ${r.created} study sessions to your calendar`);
      onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="sp-title">
      <DialogTitle id="sp-title">Sprint planner</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Stack spacing={2.25} sx={{ flex: 1, minWidth: 260 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <FormControl size="small">
              <InputLabel id="role">Target role</InputLabel>
              <Select labelId="role" label="Target role" value={f.role} onChange={(e) => set({ role: e.target.value })}>
                {Object.entries(ROLE_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.75 }} id="lvl">Your level</Typography>
              <ToggleButtonGroup size="small" exclusive fullWidth value={f.level} onChange={(_, v) => v && set({ level: v })} aria-labelledby="lvl">
                {['Beginner', 'Intermediate', 'Advanced'].map((l) => <ToggleButton key={l} value={l}>{l}</ToggleButton>)}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="body2" id="hrs">Hours per day: <strong>{f.hoursPerDay}</strong></Typography>
              <Slider min={0.5} max={6} step={0.5} value={f.hoursPerDay} onChange={(_, v) => set({ hoursPerDay: v })} aria-labelledby="hrs" />
            </Box>
            <Box>
              <Typography variant="body2" id="sd">Sprint length: <strong>{f.sprintDays} days</strong> (3 sprints)</Typography>
              <Slider min={3} max={14} step={1} value={f.sprintDays} onChange={(_, v) => set({ sprintDays: v })} aria-labelledby="sd" />
            </Box>
            <Stack direction="row" spacing={1.5}>
              <TextField label="Start date" type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value || isoDay() })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Daily start" type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value || '19:00' })} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
          </Stack>
          <Box sx={{ flex: 1.2, minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">Preview · {plan.length} sessions · {plan[0].date} to {plan.at(-1).date}</Typography>
            <List dense sx={{ maxHeight: 360, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
              {plan.map((p) => (
                <ListItem key={p.date} divider>
                  <ListItemText primary={p.title} secondary={`${new Date(`${p.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${p.time}–${p.endTime}`} />
                  {p.priority === 'high' && <Chip size="small" label="Review" color="warning" variant="outlined" />}
                </ListItem>
              ))}
            </List>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={add} disabled={busy}>{busy ? 'Adding…' : `Add ${plan.length} sessions`}</Button></DialogActions>
    </Dialog>
  );
}

// Data the old planner stored only in this browser (localStorage).
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
export function LegacyImport() {
  const notify = useNotify();
  const [gone, setGone] = useState(false);
  const events = (read('rt:cal-events') || []).filter((e) => e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''));
  const plan = read('rt:study-plan');
  const planDays = plan?.schedule ? Object.values(plan.schedule).filter((d) => d.date >= isoDay()) : [];
  if (gone || (!events.length && !planDays.length) || read('rt:legacy-imported')) return null;
  const items = [
    ...events.map((e) => ({
      title: String(e.title).slice(0, 300), date: e.date, time: /^\d{2}:\d{2}$/.test(e.time || '') ? e.time : null,
      priority: /exam|deadline|interview|test/i.test(e.type || '') ? 'high' : 'medium',
      category: /exam|study|test|interview/i.test(e.type || '') ? 'study' : 'personal',
      notes: e.type ? `${e.type} (from the old planner)` : '',
    })),
    ...planDays.slice(0, 120).map((d) => ({ title: d.focus, date: d.date, priority: d.isReview ? 'high' : 'medium', category: 'study', notes: `Sprint ${d.sprint}, day ${d.dayInSprint} · ${d.mins} min` })),
  ];
  const run = async () => {
    try {
      for (let i = 0; i < items.length; i += 200) await api('/tasks/bulk', { method: 'POST', body: { items: items.slice(i, i + 200), source: 'import' } });
      localStorage.setItem('rt:legacy-imported', '1');
      changed('tasks'); setGone(true);
      notify(`Imported ${items.length} entries from this browser`);
    } catch (e) { notify(e.message, 'error'); }
  };
  const dismiss = () => { try { localStorage.setItem('rt:legacy-imported', 'dismissed'); } catch { /* ignore */ } setGone(true); };
  return (
    <Alert severity="info" action={<Stack direction="row"><Button color="inherit" size="small" onClick={dismiss}>Not now</Button><Button color="inherit" size="small" onClick={run}>Import</Button></Stack>}>
      This browser has {items.length} calendar entr{items.length === 1 ? 'y' : 'ies'} from the old planner{planDays.length ? ' (including your sprint plan)' : ''}. Import them so they're saved to your account and can sync.
    </Alert>
  );
}
