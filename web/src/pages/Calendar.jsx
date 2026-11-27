import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, FormControl, IconButton, InputLabel, MenuItem, OutlinedInput, Paper, Select, Stack, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography, useMediaQuery, Checkbox, ListItemText, List,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Add from '@mui/icons-material/Add';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';
import { PageHeader, Loading, ErrorState, LoginRequired, EmptyState } from '../components/common.jsx';
import TaskDialog from '../components/TaskDialog.jsx';
import TaskRow, { toggleTask } from '../components/TaskRow.jsx';
import GoogleSyncPanel from '../components/GoogleSyncPanel.jsx';
import PlanUpload from '../components/PlanUpload.jsx';
import SprintPlanner, { LegacyImport } from '../components/SprintPlanner.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useLocalStorage, isoDay, addDays } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { occursOn, PRIORITIES, PRIORITY_LABEL, CATEGORY_LABEL, timeLabel, byUrgency } from '../lib/tasks.js';
import { colorFor, PRIORITY_COLORS, CATEGORY_COLORS, COMPLETED_COLOR } from '../theme.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const { ready, admin, authenticated } = useAuth();
  if (!ready) return <Loading />;
  if (!admin) return authenticated ? <EmptyState icon={CalendarMonthOutlined} title="The calendar is private" text="Only the site owner's calendar lives here." /> : <LoginRequired what="your calendar" />;
  return <CalendarInner />;
}

function CalendarInner() {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const notify = useNotify();
  const today = isoDay();
  const [view, setView] = useLocalStorage('rt:cal-view', mobile ? 'agenda' : 'month');
  const [cursor, setCursor] = useState(today);
  const [filter, setFilter] = useLocalStorage('rt:cal-filter', { priorities: [], categories: [], status: 'all' });
  const [dialog, setDialog] = useState(null);
  const [upload, setUpload] = useState(false);
  const [sprint, setSprint] = useState(false);

  const range = useMemo(() => {
    const [y, m] = cursor.split('-').map(Number);
    if (view === 'month') {
      const first = isoDay(new Date(y, m - 1, 1));
      const start = addDays(first, -new Date(y, m - 1, 1).getDay());
      return { start, days: 42, label: new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
    }
    if (view === 'week') {
      const start = addDays(cursor, -new Date(`${cursor}T12:00`).getDay());
      const end = addDays(start, 6);
      return { start, days: 7, label: `${new Date(`${start}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${end}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` };
    }
    return { start: cursor, days: 30, label: `Next 30 days from ${new Date(`${cursor}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
  }, [cursor, view]);
  const end = addDays(range.start, range.days - 1);
  const tasks = useApi(`/tasks?from=${range.start}&to=${end}`, { topics: ['tasks'] });

  const visible = useMemo(() => (tasks.data || []).filter((t) => t.date
    && (!filter.priorities.length || filter.priorities.includes(t.priority))
    && (!filter.categories.length || filter.categories.includes(t.category))
    && (filter.status === 'all' || (filter.status === 'done' ? t.done : !t.done))), [tasks.data, filter]);
  const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
  const onDay = (d) => visible.filter((t) => occursOn(t, d)).sort((a, b) => (a.time || '').localeCompare(b.time || '') || byUrgency(today)(a, b));

  const step = (dir) => {
    const [y, m] = cursor.split('-').map(Number);
    if (view === 'month') setCursor(isoDay(new Date(y, m - 1 + dir, 1)));
    else setCursor(addDays(cursor, dir * (view === 'week' ? 7 : 30)));
  };
  const setTasks = (fn) => tasks.setData((d) => (d ? fn(d) : d));
  const toggle = (t) => toggleTask(t, { api, changed, notify, setTasks });
  const open = (t) => setDialog({ task: t });
  const create = (date) => setDialog({ task: null, defaults: { date } });

  return (
    <>
      <PageHeader
        title="Calendar"
        icon={CalendarMonthOutlined}
        subtitle="Your tasks, study plan and deadlines, colour-coded by priority and category."
        actions={<>
          <Button startIcon={<RocketLaunchOutlined />} onClick={() => setSprint(true)}>Sprint planner</Button>
          <Button startIcon={<UploadFileOutlined />} onClick={() => setUpload(true)}>Upload your plan</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => create(today)}>New</Button>
        </>}
      />
      <Stack spacing={2}>
        <GoogleSyncPanel />
        <LegacyImport />
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton onClick={() => step(-1)} aria-label="Previous"><ChevronLeft /></IconButton>
              <IconButton onClick={() => step(1)} aria-label="Next"><ChevronRight /></IconButton>
              <Button size="small" variant="outlined" onClick={() => setCursor(today)} sx={{ mr: 1 }}>Today</Button>
              <Typography variant="h3" component="h2" aria-live="polite">{range.label}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Multi label="Priority" value={filter.priorities} options={PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]])} onChange={(v) => setFilter({ ...filter, priorities: v })} />
              <Multi label="Category" value={filter.categories} options={Object.entries(CATEGORY_LABEL)} onChange={(v) => setFilter({ ...filter, categories: v })} />
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel id="st">Status</InputLabel>
                <Select labelId="st" label="Status" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                  <MenuItem value="all">All</MenuItem><MenuItem value="open">Open</MenuItem><MenuItem value="done">Completed</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)} aria-label="Calendar view">
                <ToggleButton value="month">Month</ToggleButton><ToggleButton value="week">Week</ToggleButton><ToggleButton value="agenda">Agenda</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
          <Legend mode={mode} />
          {tasks.error ? <ErrorState error={tasks.error} onRetry={tasks.reload} /> : !tasks.data ? <Loading rows={4} /> : view === 'agenda' ? (
            <Agenda days={days} onDay={onDay} today={today} onToggle={toggle} onOpen={open} onCreate={create} />
          ) : (
            <Grid days={days} onDay={onDay} today={today} month={view === 'month' ? cursor.slice(0, 7) : null} tall={view === 'week'} mode={mode} onOpen={open} onCreate={create} />
          )}
        </Paper>
      </Stack>
      <TaskDialog open={Boolean(dialog)} task={dialog?.task || null} defaults={dialog?.defaults} onClose={() => setDialog(null)} />
      <PlanUpload open={upload} onClose={() => setUpload(false)} />
      <SprintPlanner open={sprint} onClose={() => setSprint(false)} />
    </>
  );
}

function Multi({ label, value, options, onChange }) {
  const map = Object.fromEntries(options);
  return (
    <FormControl size="small" sx={{ minWidth: 130, maxWidth: 220 }}>
      <InputLabel id={`ml-${label}`} shrink>{label}</InputLabel>
      <Select labelId={`ml-${label}`} multiple value={value} onChange={(e) => onChange(e.target.value)} input={<OutlinedInput label={label} notched />}
        renderValue={(v) => (v.length ? v.map((x) => map[x]).join(', ') : 'All')} displayEmpty>
        {options.map(([v, l]) => <MenuItem key={v} value={v}><Checkbox size="small" checked={value.includes(v)} /><ListItemText primary={l} /></MenuItem>)}
      </Select>
    </FormControl>
  );
}

function Legend({ mode }) {
  const items = [
    ...Object.values(PRIORITY_COLORS).map((c) => [c.label, c[mode]]),
    ...['study', 'personal'].map((k) => [CATEGORY_COLORS[k].label, CATEGORY_COLORS[k][mode]]),
    [COMPLETED_COLOR.label, COMPLETED_COLOR[mode]],
  ];
  return (
    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }} aria-label="Colour legend">
      {items.map(([l, c]) => (
        <Stack key={l} direction="row" spacing={0.6} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: c }} /><Typography variant="caption" color="text.secondary">{l}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function EventChip({ t, mode, onOpen, tall }) {
  const color = colorFor(mode, t);
  return (
    <Tooltip title={`${t.title}${t.time ? ` · ${timeLabel(t)}` : ''} · ${PRIORITY_LABEL[t.priority]}${t.done ? ' · done' : ''}`}>
      <Box
        component="button" type="button" onClick={(e) => { e.stopPropagation(); onOpen(t); }}
        sx={{
          display: 'block', width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 12, lineHeight: 1.35,
          px: 0.75, py: tall ? 0.5 : 0.25, mb: 0.4, borderRadius: 1, color: 'text.primary', bgcolor: `${color}22`, borderLeft: `3px solid ${color}`,
          whiteSpace: tall ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: t.done ? 'line-through' : 'none',
          '&:hover, &:focus-visible': { bgcolor: `${color}3a` },
        }}
      >
        {t.time && <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>{t.time}</Box>}{t.title}
      </Box>
    </Tooltip>
  );
}

function Grid({ days, onDay, today, month, tall, mode, onOpen, onCreate }) {
  const max = tall ? 50 : 3;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', minWidth: { xs: 640, md: 0 }, border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }} role="grid">
        {WEEKDAYS.map((d) => <Box key={d} role="columnheader" sx={{ px: 1, py: 0.75, fontSize: 12, fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>{d}</Box>)}
        {days.map((d, i) => {
          const items = onDay(d);
          const outside = month && d.slice(0, 7) !== month;
          return (
            <Box key={d} role="gridcell" onClick={() => onCreate(d)} aria-label={`${d}: ${items.length} item${items.length === 1 ? '' : 's'}`}
              sx={{ minHeight: tall ? 260 : 108, p: 0.75, cursor: 'pointer', borderRight: (i + 1) % 7 ? 1 : 0, borderBottom: i < days.length - 7 ? 1 : 0, borderColor: 'divider', bgcolor: outside ? 'action.hover' : 'transparent', opacity: outside ? 0.6 : 1, '&:hover': { bgcolor: 'action.selected' } }}>
              <Typography variant="caption" sx={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', mb: 0.5, fontWeight: d === today ? 700 : 500, bgcolor: d === today ? 'primary.main' : 'transparent', color: d === today ? 'primary.contrastText' : 'text.secondary' }}>
                {Number(d.slice(8))}
              </Typography>
              {items.slice(0, max).map((t) => <EventChip key={t.id} t={t} mode={mode} onOpen={onOpen} tall={tall} />)}
              {items.length > max && <Typography variant="caption" color="text.secondary">+{items.length - max} more</Typography>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function Agenda({ days, onDay, today, onToggle, onOpen, onCreate }) {
  const withItems = days.map((d) => [d, onDay(d)]).filter(([, l]) => l.length);
  if (!withItems.length) return <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => onCreate(today)}>Add</Button>}>Nothing scheduled in these 30 days.</Alert>;
  return (
    <Stack spacing={1.5}>
      {withItems.map(([d, items]) => (
        <Box key={d}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="overline" color={d === today ? 'primary' : 'text.secondary'}>{new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Typography>
            {d === today && <Chip size="small" label="Today" color="primary" sx={{ height: 18 }} />}
          </Stack>
          <List disablePadding>{items.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} showDate={false} />)}</List>
        </Box>
      ))}
    </Stack>
  );
}
