import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid,
  IconButton, InputLabel, Link, LinearProgress, List, ListItem, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography, Collapse,
} from '@mui/material';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import Add from '@mui/icons-material/Add';
import OpenInNew from '@mui/icons-material/OpenInNew';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { PageHeader, Loading, ErrorState, LoginRequired, pct } from '../components/common.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, isoDay, addDays } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { dateLabel } from '../lib/tasks.js';

const DIFF_COLOR = { Easy: 'success', Medium: 'warning', Hard: 'error' };

export default function Coding() {
  const { ready, authenticated } = useAuth();
  if (!ready) return <Loading />;
  if (!authenticated) return <LoginRequired what="daily coding practice" />;
  return <CodingInner />;
}

function CodingInner() {
  const { admin } = useAuth();
  const today = isoDay();
  const day = useApi(`/coding/today?date=${today}`, { topics: ['coding'] });
  const stats = useApi(`/coding/stats?date=${today}`, { topics: ['coding'] });
  const history = useApi(`/coding/history?from=${addDays(today, -60)}&to=${addDays(today, -1)}`, { topics: ['coding'] });
  const [adding, setAdding] = useState(false);
  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Daily coding"
        icon={CodeOutlined}
        subtitle="One recommended problem every day, plus anything else you solve. Keep the streak going."
        actions={admin && <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Add problem</Button>}
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Kpi label="Current streak" value={s ? `${s.currentStreak} day${s.currentStreak === 1 ? '' : 's'}` : '–'} icon={<LocalFireDepartmentOutlined color={s?.currentStreak ? 'warning' : 'disabled'} />} />
        <Kpi label="Longest streak" value={s ? `${s.longestStreak}` : '–'} />
        <Kpi label="Solved in total" value={s ? s.totalSolved : '–'} />
        <Kpi label="This week" value={s ? `${s.week.done}/${s.week.total}` : '–'} sub={s ? `${s.week.activeDays} of 7 days active` : ''} />
        <Kpi label="This month" value={s ? `${s.month.done}/${s.month.total}` : '–'} sub={s ? `${s.month.activeDays} days active` : ''} />
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>Today · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Typography>
            {day.error ? <ErrorState error={day.error} onRetry={day.reload} /> : !day.data ? <Loading rows={2} /> : (
              <Stack spacing={1.5}>
                {day.data.autoError && !day.data.problems.some((p) => p.source.startsWith('auto')) && (
                  <Alert severity="warning">Couldn't pick today's problem automatically ({day.data.autoError}). Add one yourself, and the streak still counts.</Alert>
                )}
                {day.data.problems.map((p) => <ProblemCard key={p.id} p={p} editable={admin} />)}
                {!day.data.problems.length && <Typography color="text.secondary">No problems for today yet.</Typography>}
                {admin && <Button startIcon={<Add />} onClick={() => setAdding(true)} sx={{ alignSelf: 'flex-start' }}>Add another problem for today</Button>}
              </Stack>
            )}
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mt: 3 }}>
            <Typography variant="h3" component="h2" sx={{ mb: 1 }}>Last 60 days</Typography>
            {history.error ? <ErrorState error={history.error} /> : !history.data ? <Loading rows={2} /> : !history.data.length ? <Typography color="text.secondary">Your past problems will show here.</Typography> : (
              <List disablePadding>
                {history.data.map((p) => (
                  <ListItem key={p.id} disableGutters divider sx={{ gap: 1 }}>
                    <Checkbox checked={p.done} disabled={!admin} onChange={() => toggle(p)} inputProps={{ 'aria-label': `${p.done ? 'Mark not solved' : 'Mark solved'}: ${p.title}` }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Link href={p.url || undefined} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit" sx={{ fontWeight: 500 }}>{p.title}</Link>
                      <Typography variant="caption" color="text.secondary" component="div">{dateLabel(p.date)} · {p.platform}{p.topic ? ` · ${p.topic}` : ''}</Typography>
                    </Box>
                    <Chip size="small" label={p.difficulty} color={DIFF_COLOR[p.difficulty]} variant="outlined" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {s && <Heatmap byDay={s.byDay} today={today} />}
            {s && (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h4" component="h2" sx={{ mb: 1.5 }}>By difficulty</Typography>
                <Stack spacing={1.25}>
                  {Object.entries(s.byDifficulty).map(([d, v]) => (
                    <Box key={d}>
                      <Stack direction="row" justifyContent="space-between"><Typography variant="body2">{d}</Typography><Typography variant="body2" color="text.secondary">{v.done}/{v.total}</Typography></Stack>
                      <LinearProgress variant="determinate" value={pct(v.done, v.total)} color={DIFF_COLOR[d]} aria-label={`${d}: ${v.done} of ${v.total}`} />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
            {s?.topics.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h4" component="h2" sx={{ mb: 1.5 }}>By topic</Typography>
                <Stack spacing={1.25}>
                  {s.topics.map((t) => (
                    <Box key={t.topic}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}><Typography variant="body2" noWrap>{t.topic}</Typography><Typography variant="body2" color="text.secondary">{t.done}/{t.total} · {pct(t.done, t.total)}%</Typography></Stack>
                      <LinearProgress variant="determinate" value={pct(t.done, t.total)} aria-label={`${t.topic}: ${t.done} of ${t.total} solved`} />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>
      <AddProblem open={adding} onClose={() => setAdding(false)} />
    </>
  );

  async function toggle(p) {
    try { await api(`/coding/problems/${p.id}`, { method: 'PATCH', body: { done: !p.done } }); changed('coding'); } catch { /* reload shows the truth */ day.reload(); }
  }
}

function Kpi({ label, value, sub, icon }) {
  return (
    <Grid item xs={6} sm={4} md>
      <Card sx={{ height: '100%' }}><CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" spacing={0.75} alignItems="center"><Typography variant="body2" color="text.secondary">{label}</Typography>{icon}</Stack>
        <Typography variant="h2" component="p">{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent></Card>
    </Grid>
  );
}

function ProblemCard({ p, editable }) {
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ submissionUrl: p.submissionUrl, notes: p.notes });
  const auto = p.source.startsWith('auto');
  const patch = async (body, msg) => {
    try { await api(`/coding/problems/${p.id}`, { method: 'PATCH', body }); changed('coding'); if (msg) notify(msg); } catch (e) { notify(e.message, 'error'); }
  };
  const remove = async () => { try { await api(`/coding/problems/${p.id}`, { method: 'DELETE' }); changed('coding'); } catch (e) { notify(e.message, 'error'); } };
  return (
    <Card sx={{ borderColor: p.done ? 'success.main' : auto ? 'primary.main' : undefined }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Checkbox checked={p.done} disabled={!editable} onChange={() => patch({ done: !p.done }, p.done ? null : 'Nice! Marked as solved.')} sx={{ mt: -0.5 }} inputProps={{ 'aria-label': `${p.done ? 'Mark not solved' : 'Mark solved'}: ${p.title}` }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {auto && <Tooltip title={p.source === 'auto:codeforces' ? 'Picked from Codeforces (official API)' : 'Your next unsolved problem from your practice lists'}><Chip size="small" icon={<AutoAwesomeOutlined />} label="Today's pick" color="primary" variant="outlined" sx={{ mb: 0.75 }} /></Tooltip>}
            <Typography variant="h4" component="p" sx={{ textDecoration: p.done ? 'line-through' : 'none' }}>{p.title}</Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
              <Chip size="small" label={p.difficulty} color={DIFF_COLOR[p.difficulty]} variant="outlined" />
              <Chip size="small" label={p.platform} variant="outlined" />
              {p.topic && <Chip size="small" label={p.topic} variant="outlined" />}
            </Stack>
          </Box>
          <Stack direction="row">
            {p.url && <Tooltip title="Open problem"><IconButton component="a" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.title}`}><OpenInNew /></IconButton></Tooltip>}
            {editable && <Tooltip title="Notes and submission"><IconButton onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Notes and submission link"><EditNoteOutlined /></IconButton></Tooltip>}
            {editable && p.source === 'manual' && <Tooltip title="Delete"><IconButton onClick={remove} aria-label={`Delete ${p.title}`}><DeleteOutline /></IconButton></Tooltip>}
          </Stack>
        </Stack>
        {p.submissionUrl && !open && <Link href={p.submissionUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ ml: 6.5 }}>Your submission</Link>}
        <Collapse in={open} unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 1.5, ml: { sm: 6.5 } }}>
            <TextField label="Submission link" type="url" value={f.submissionUrl} onChange={(e) => setF({ ...f, submissionUrl: e.target.value })} />
            <TextField label="Notes / solution idea" multiline minRows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} inputProps={{ maxLength: 5000 }} />
            <Button variant="outlined" onClick={() => patch({ submissionUrl: f.submissionUrl || '', notes: f.notes }, 'Saved').then(() => setOpen(false))} sx={{ alignSelf: 'flex-start' }}>Save</Button>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

function AddProblem({ open, onClose }) {
  const notify = useNotify();
  const blank = { title: '', url: '', difficulty: 'Medium', topic: '', notes: '', date: isoDay(), done: false };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(null);
  const save = async (e) => {
    e.preventDefault(); setErr(null);
    try { await api('/coding/problems', { method: 'POST', body: { ...f, url: f.url || null } }); changed('coding'); notify('Problem added'); setF(blank); onClose(); } catch (x) { setErr(x.message); }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={save}>
      <DialogTitle>Add a problem</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Problem name" required autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <TextField label="Problem link" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://leetcode.com/problems/…" />
          <Stack direction="row" spacing={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="d">Difficulty</InputLabel>
              <Select labelId="d" label="Difficulty" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>{['Easy', 'Medium', 'Hard'].map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</Select>
            </FormControl>
            <TextField label="Topic" fullWidth value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder="e.g. Binary Search" />
          </Stack>
          <TextField label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Notes" multiline minRows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <Stack direction="row" alignItems="center"><Checkbox checked={f.done} onChange={(e) => setF({ ...f, done: e.target.checked })} id="solved" /><label htmlFor="solved">Already solved</label></Stack>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={!f.title.trim()}>Add</Button></DialogActions>
    </Dialog>
  );
}

function Heatmap({ byDay, today }) {
  const weeks = 26;
  const start = addDays(today, -(weeks * 7 - 1) - new Date(`${today}T12:00`).getDay() + 6);
  const cells = useMemo(() => Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i)), [start]);
  const scroller = useRef();
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, []);
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 1.5 }}>Last 6 months</Typography>
      <Box sx={{ overflowX: 'auto' }} ref={scroller}>
        <Box role="img" aria-label="Solved problems per day for the last 6 months" sx={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gridAutoFlow: 'column', gridAutoColumns: '12px', gap: '3px' }}>
          {cells.map((d) => {
            const v = byDay[d];
            const level = !v || !v.done ? 0 : v.done >= 3 ? 3 : v.done;
            return (
              <Tooltip key={d} title={`${d}: ${v ? `${v.done}/${v.total} solved` : 'nothing'}`}>
                <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: level ? 'primary.main' : 'action.hover', opacity: d > today ? 0 : level ? 0.35 + level * 0.22 : 1, outline: d === today ? '1px solid' : 'none', outlineColor: 'text.secondary' }} />
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}
