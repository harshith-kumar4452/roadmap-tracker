import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Checkbox, Chip, Collapse, FormControl, Grid, IconButton, InputLabel, Link, List, ListItem,
  ListItemText, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import { PageHeader, Loading, ErrorState, LoginRequired, EmptyState } from '../components/common.jsx';
import TaskRow, { toggleTask } from '../components/TaskRow.jsx';
import TaskDialog from '../components/TaskDialog.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, isoDay, addDays } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { byUrgency, occursOn, effectiveDate, routineState, scheduleLabel, DAY_NAMES, PRIORITIES, PRIORITY_LABEL, CATEGORY_LABEL } from '../lib/tasks.js';

export default function Tasks() {
  const { ready, admin, authenticated } = useAuth();
  if (!ready) return <Loading />;
  if (!admin) {
    return authenticated
      ? <EmptyState icon={ChecklistOutlined} title="Tasks are private" text="Only the site owner's tasks and routine live here." />
      : <LoginRequired what="your tasks" />;
  }
  return <TasksInner />;
}

function TasksInner() {
  const notify = useNotify();
  const today = isoDay();
  const tasks = useApi('/tasks', { topics: ['tasks'] });
  const routine = useApi(`/habits?since=${addDays(today, -120)}`, { topics: ['habits'] });
  const [dialog, setDialog] = useState(null);
  const [filter, setFilter] = useState({ priority: '', category: '' });
  const [quick, setQuick] = useState('');

  const groups = useMemo(() => {
    const list = (tasks.data || []).filter((t) => (!filter.priority || t.priority === filter.priority) && (!filter.category || t.category === filter.category));
    const open = list.filter((t) => !t.done).sort(byUrgency(today));
    return {
      overdue: open.filter((t) => t.date && t.date < today && !t.recurrence),
      today: open.filter((t) => (t.recurrence ? occursOn(t, today) : t.date === today)),
      upcoming: open.filter((t) => (t.recurrence ? !occursOn(t, today) && effectiveDate(t, today) : t.date && t.date > today)),
      someday: open.filter((t) => !t.date),
      done: list.filter((t) => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')),
    };
  }, [tasks.data, filter, today]);

  const setTasks = (fn) => tasks.setData((d) => (d ? fn(d) : d));
  const toggle = (t) => toggleTask(t, { api, changed, notify, setTasks });
  const addQuick = async (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    try {
      await api('/tasks', { method: 'POST', body: { title: quick.trim(), date: today, priority: 'medium', category: 'study' } });
      setQuick(''); changed('tasks');
    } catch (x) { notify(x.message, 'error'); }
  };

  const st = routine.data ? routineState(routine.data, today) : null;
  const due = st ? routine.data.habits.filter((h) => st.isDue(h, today)) : [];
  const doneToday = st ? due.filter((h) => st.isDone(h, today)).length : 0;
  const left = groups.overdue.length + groups.today.length;

  return (
    <>
      <PageHeader
        title="Tasks & routine"
        icon={ChecklistOutlined}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={<>
          <Button component={RouterLink} to="/calendar" startIcon={<CalendarMonthOutlined />}>Calendar</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ task: null })}>New task</Button>
        </>}
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Kpi label="Routine today" value={st ? `${doneToday}/${due.length}` : '–'} />
        <Kpi label="Tasks left today" value={tasks.data ? left : '–'} tone={groups.overdue.length ? 'error.main' : undefined} sub={groups.overdue.length ? `${groups.overdue.length} overdue` : null} />
        <Kpi label="Best routine streak" value={st ? Math.max(0, ...routine.data.habits.map(st.streak)) : '–'} />
        <Kpi label="Done in 30 days" value={groups.done.length} />
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 0.5 }} spacing={1} useFlexGap flexWrap="wrap">
              <Typography variant="h3" component="h2">Tasks</Typography>
              <Stack direction="row" spacing={1}>
                <Mini label="Priority" value={filter.priority} onChange={(v) => setFilter({ ...filter, priority: v })} options={PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]])} />
                <Mini label="Category" value={filter.category} onChange={(v) => setFilter({ ...filter, category: v })} options={Object.entries(CATEGORY_LABEL)} />
              </Stack>
            </Stack>
            <Stack component="form" direction="row" spacing={1} onSubmit={addQuick} sx={{ mb: 2, px: 0.5 }}>
              <TextField fullWidth placeholder="Quick add for today, e.g. Revise Redis persistence" value={quick} onChange={(e) => setQuick(e.target.value)} inputProps={{ 'aria-label': 'New task for today', maxLength: 300 }} />
              <Button type="submit" variant="outlined" disabled={!quick.trim()}>Add</Button>
            </Stack>
            {tasks.error ? <ErrorState error={tasks.error} onRetry={tasks.reload} /> : !tasks.data ? <Loading rows={3} /> : (
              <>
                <Group title="Overdue" items={groups.overdue} tone="error.main" onToggle={toggle} onOpen={(t) => setDialog({ task: t })} />
                <Group title="Today" items={groups.today} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} showDate={false} />
                <Group title="Upcoming" items={groups.upcoming} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} />
                <Group title="Someday" items={groups.someday} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} />
                {!groups.overdue.length && !groups.today.length && !groups.upcoming.length && !groups.someday.length && (
                  <Typography color="text.secondary" sx={{ px: 1, py: 2 }}>No open tasks{filter.priority || filter.category ? ' match these filters' : ''}.</Typography>
                )}
                <DoneGroup items={groups.done} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} />
              </>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          {routine.error ? <ErrorState error={routine.error} onRetry={routine.reload} /> : !routine.data ? <Loading rows={2} /> : <Routine data={routine.data} st={st} today={today} />}
        </Grid>
      </Grid>
      {routine.data?.habits.length > 0 && <RoutineGrid data={routine.data} st={st} today={today} />}
      <TaskDialog open={Boolean(dialog)} task={dialog?.task || null} defaults={{ date: today }} onClose={() => setDialog(null)} />
    </>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <Grid item xs={6} md={3}>
      <Card><CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h2" component="p" sx={{ color: tone }}>{value}</Typography>
        {sub && <Typography variant="caption" color="error">{sub}</Typography>}
      </CardContent></Card>
    </Grid>
  );
}

function Mini({ label, value, onChange, options }) {
  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel id={`m-${label}`}>{label}</InputLabel>
      <Select labelId={`m-${label}`} label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">All</MenuItem>
        {options.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function Group({ title, items, tone, ...rest }) {
  if (!items.length) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="overline" sx={{ px: 1, color: tone || 'text.secondary' }}>{title} · {items.length}</Typography>
      <List disablePadding>{items.map((t) => <TaskRow key={t.id} task={t} {...rest} />)}</List>
    </Box>
  );
}

function DoneGroup({ items, ...rest }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <Box>
      <Button size="small" onClick={() => setOpen(!open)} sx={{ color: 'text.secondary' }} aria-expanded={open}>{open ? 'Hide' : 'Show'} done · {items.length} in the last 30 days</Button>
      <Collapse in={open} unmountOnExit><List disablePadding>{items.map((t) => <TaskRow key={t.id} task={t} {...rest} />)}</List></Collapse>
    </Box>
  );
}

// ---------------------------------------------------------------- routine

function Routine({ data, st, today }) {
  const notify = useNotify();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', days: 'daily' });
  const due = data.habits.filter((h) => st.isDue(h, today));
  const notToday = data.habits.filter((h) => !st.isDue(h, today));

  const tick = async (h, day = today) => {
    const done = !st.isDone(h, day);
    try { await api(`/habits/${h.id}/checkins/${day}`, { method: 'PUT', body: { done } }); changed('habits'); } catch (e) { notify(e.message, 'error'); }
  };
  const add = async (e) => {
    e.preventDefault();
    const days = form.days === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : form.days === 'weekdays' ? [1, 2, 3, 4, 5] : [Number(form.days)];
    try { await api('/habits', { method: 'POST', body: { title: form.title, url: form.url || null, days } }); setForm({ title: '', url: '', days: 'daily' }); changed('habits'); } catch (x) { notify(x.message, 'error'); }
  };
  const remove = async (h) => {
    try { await api(`/habits/${h.id}`, { method: 'DELETE' }); changed('habits'); notify(`Removed "${h.title}"`); } catch (x) { notify(x.message, 'error'); }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 0.5 }}>
        <Typography variant="h3" component="h2">Today's routine</Typography>
        <Button size="small" startIcon={<EditOutlined />} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</Button>
      </Stack>
      {due.length ? (
        <List disablePadding>
          {due.map((h) => {
            const s = st.streak(h);
            const r = st.rate(h);
            const done = st.isDone(h, today);
            return (
              <ListItem key={h.id} disablePadding secondaryAction={(
                <Tooltip title="Current streak"><Chip size="small" icon={<LocalFireDepartmentOutlined />} label={s} color={s ? 'warning' : 'default'} variant={s ? 'filled' : 'outlined'} /></Tooltip>
              )}>
                <Checkbox edge="start" checked={done} onChange={() => tick(h)} inputProps={{ 'aria-label': `${done ? 'Mark not done' : 'Mark done'}: ${h.title}` }} sx={{ ml: 0.5 }} />
                <ListItemText
                  primary={h.url ? <Link href={h.url} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">{h.title} <OpenInNew sx={{ fontSize: 13, verticalAlign: 'middle' }} /></Link> : h.title}
                  secondary={`${scheduleLabel(h.days)}${r !== null ? ` · ${r}% last 30 days` : ''}`}
                  sx={{ textDecoration: done ? 'line-through' : 'none', pr: 6 }}
                />
              </ListItem>
            );
          })}
        </List>
      ) : <Typography color="text.secondary" sx={{ px: 1 }}>Nothing scheduled today.</Typography>}
      {notToday.length > 0 && (
        <Box sx={{ mt: 1.5, px: 1 }}>
          <Typography variant="overline" color="text.secondary">Not today</Typography>
          {notToday.map((h) => { const n = st.nextDue(h); return <Stack key={h.id} direction="row" justifyContent="space-between"><Typography variant="body2">{h.title}</Typography><Typography variant="caption" color="text.secondary">{n ? `Next: ${DAY_NAMES[new Date(`${n}T12:00`).getDay()]}` : ''}</Typography></Stack>; })}
        </Box>
      )}
      <Collapse in={editing} unmountOnExit>
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <List dense disablePadding>
            {data.habits.map((h) => (
              <ListItem key={h.id} disableGutters secondaryAction={<IconButton edge="end" onClick={() => remove(h)} aria-label={`Remove ${h.title} from routine`}><DeleteOutline /></IconButton>}>
                <ListItemText primary={h.title} secondary={scheduleLabel(h.days)} />
              </ListItem>
            ))}
          </List>
          <Stack component="form" spacing={1.25} onSubmit={add} sx={{ mt: 1 }}>
            <TextField label="Routine item" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Codeforces Div 2" inputProps={{ maxLength: 120 }} />
            <TextField label="Link (optional)" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <FormControl size="small">
              <InputLabel id="sched">Schedule</InputLabel>
              <Select labelId="sched" label="Schedule" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })}>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekdays">Weekdays (Mon–Fri)</MenuItem>
                {DAY_NAMES.map((d, i) => <MenuItem key={d} value={String(i)}>Every {d}</MenuItem>)}
              </Select>
            </FormControl>
            <Button type="submit" variant="outlined" startIcon={<Add />} disabled={!form.title.trim()}>Add to routine</Button>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}

function RoutineGrid({ data, st, today }) {
  const notify = useNotify();
  const [days, setDays] = useState(28);
  const cols = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  const tick = async (h, day) => {
    try { await api(`/habits/${h.id}/checkins/${day}`, { method: 'PUT', body: { done: !st.isDone(h, day) } }); changed('habits'); } catch (e) { notify(e.message, 'error'); }
  };
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, mt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap" spacing={1}>
        <Box>
          <Typography variant="h3" component="h2">Routine history</Typography>
          <Typography variant="caption" color="text.secondary">Click a square to tick or untick that day. Streaks skip days that aren't scheduled.</Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, v) => v && setDays(v)}>
          <ToggleButton value={14}>2 weeks</ToggleButton><ToggleButton value={28}>4 weeks</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 3, '& th': { fontWeight: 500, fontSize: 11, color: 'text.secondary' } }}>
          <thead>
            <tr>
              <th />
              {cols.map((d) => <th key={d} style={{ minWidth: 22 }}>{DAY_NAMES[new Date(`${d}T12:00`).getDay()][0]}<br />{Number(d.slice(8))}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.habits.map((h) => (
              <tr key={h.id}>
                <Box component="th" sx={{ textAlign: 'left', pr: 1.5, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px !important', color: 'text.primary !important' }}>{h.title}</Box>
                {cols.map((d) => {
                  const due = st.isDue(h, d);
                  const done = st.isDone(h, d);
                  return (
                    <td key={d}>
                      {due ? (
                        <Tooltip title={`${h.title} · ${d}${done ? ' · done' : ''}`}>
                          <Box component="button" type="button" onClick={() => tick(h, d)} aria-label={`${h.title} on ${d}: ${done ? 'done' : 'not done'}`} aria-pressed={done}
                            sx={{ width: 20, height: 20, borderRadius: 0.75, border: 1, cursor: 'pointer', p: 0, borderColor: done ? 'primary.main' : 'divider', bgcolor: done ? 'primary.main' : d === today ? 'action.hover' : 'transparent' }} />
                        </Tooltip>
                      ) : <Box sx={{ width: 20, height: 20, borderRadius: 0.75, bgcolor: 'action.disabledBackground', opacity: 0.35 }} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Paper>
  );
}
