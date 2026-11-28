// Floating "Today" panel on the home page: today's tasks, overdue items, upcoming deadlines and
// critical-deadline alerts. Collapses to a small button (with a count badge) so it never covers
// the page; remembers its state; refreshes when tasks change anywhere, every minute and on focus.
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Badge, Box, Button, Fab, IconButton, LinearProgress, List, Paper, Stack, Tooltip, Typography, Divider, useMediaQuery, Slide,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChecklistRtl from '@mui/icons-material/ChecklistRtl';
import CloseFullscreen from '@mui/icons-material/CloseFullscreen';
import Add from '@mui/icons-material/Add';
import ArrowForward from '@mui/icons-material/ArrowForward';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import { useApi, useLocalStorage, isoDay, addDays } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { urgency, alertText, byUrgency, occursOn } from '../lib/tasks.js';
import TaskRow, { toggleTask } from './TaskRow.jsx';
import TaskDialog from './TaskDialog.jsx';

export default function TodayWidget() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const notify = useNotify();
  // Remembered separately for phones (starts collapsed there) and larger screens.
  // Starts open only on wide screens, where it fits beside the page; the choice is remembered
  // separately for phones and larger screens.
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = useLocalStorage(mobile ? 'rt:today-open-m' : 'rt:today-open-d', wide);
  const [dialog, setDialog] = useState(null);
  const [today, setToday] = useState(isoDay());
  const { data, setData, reload } = useApi('/tasks', { topics: ['tasks'] });

  useEffect(() => {
    const tick = () => { setToday(isoDay()); reload(true); };
    const id = setInterval(tick, 60_000);
    const vis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [reload]);

  const v = useMemo(() => {
    const list = data || [];
    const open_ = list.filter((t) => !t.done);
    const todays = list.filter((t) => occursOn(t, today) || (t.done && t.doneAt && isoDay(new Date(t.doneAt)) === today && t.date === today));
    const overdue = open_.filter((t) => urgency(t, today).state === 'overdue' && !t.recurrence);
    const alerts = open_.filter((t) => urgency(t, today).alert && !t.recurrence).sort(byUrgency(today));
    const upcoming = open_.filter((t) => t.date > today && t.date <= addDays(today, 7) && !t.recurrence).sort(byUrgency(today));
    const doneToday = todays.filter((t) => t.done).length;
    return { todays: todays.sort(byUrgency(today)), overdue, alerts, upcoming, doneToday };
  }, [data, today]);

  const setTasks = (fn) => setData((d) => (d ? fn(d) : d));
  const toggle = (t) => toggleTask(t, { api, changed, notify, setTasks });
  const badge = v.overdue.length + v.alerts.filter((t) => urgency(t, today).state !== 'overdue').length;
  const pending = v.todays.length - v.doneToday;

  if (!data) return null;
  return (
    <>
      <Slide direction="up" in={!open} mountOnEnter unmountOnExit>
        <Tooltip title="Today's tasks" placement="left">
          <Fab color="primary" onClick={() => setOpen(true)} aria-label={`Open today's tasks${badge ? `, ${badge} need attention` : ''}`}
            sx={{ position: 'fixed', right: { xs: 16, sm: 24 }, bottom: { xs: 16, sm: 24 }, zIndex: (t) => t.zIndex.speedDial }}>
            <Badge color="error" badgeContent={badge} overlap="circular"><ChecklistRtl /></Badge>
          </Fab>
        </Tooltip>
      </Slide>
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          role="region"
          aria-label="Today's tasks"
          sx={{
            position: 'fixed', zIndex: (t) => t.zIndex.speedDial, right: { xs: 0, sm: 24 }, bottom: { xs: 0, sm: 24 }, left: { xs: 0, sm: 'auto' },
            width: { xs: '100%', sm: 380 }, maxHeight: { xs: '62vh', sm: 'min(620px, calc(100vh - 110px))' }, display: 'flex', flexDirection: 'column',
            borderRadius: { xs: '16px 16px 0 0', sm: 3 }, border: 1, borderColor: 'divider', overflow: 'hidden',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <ChecklistRtl color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" component="h2">Today</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(`${today}T12:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} · {pending ? `${pending} pending` : v.todays.length ? 'All done' : 'Nothing scheduled'}
              </Typography>
            </Box>
            <Tooltip title="Add task"><IconButton onClick={() => setDialog({ task: null })} aria-label="Add task"><Add /></IconButton></Tooltip>
            <Tooltip title="Collapse"><IconButton onClick={() => setOpen(false)} aria-label="Collapse today's tasks"><CloseFullscreen fontSize="small" /></IconButton></Tooltip>
          </Stack>
          {v.todays.length > 0 && <LinearProgress variant="determinate" value={(v.doneToday / v.todays.length) * 100} sx={{ mx: 2, mb: 1 }} aria-label={`${v.doneToday} of ${v.todays.length} done today`} />}
          <Box sx={{ overflowY: 'auto', px: 1, pb: 1 }}>
            {v.alerts.length > 0 && (
              <Stack spacing={0.75} sx={{ px: 1, mb: 1 }}>
                {v.alerts.slice(0, 4).map((t) => {
                  const u = urgency(t, today);
                  return (
                    <Alert key={t.id} severity={u.severity} icon={<NotificationsActiveOutlined fontSize="inherit" />} variant={u.level >= 3 ? 'filled' : 'standard'}
                      sx={{ py: 0, cursor: 'pointer', '& .MuiAlert-message': { py: 0.75 } }} onClick={() => setDialog({ task: t })}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.title}</Typography>
                      <Typography variant="caption">{alertText(t, u)}</Typography>
                    </Alert>
                  );
                })}
              </Stack>
            )}
            <Section title="Today" items={v.todays} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} empty="No tasks today." showDate={false} />
            {v.overdue.length > 0 && <Section title={`Overdue · ${v.overdue.length}`} items={v.overdue} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} />}
            {v.upcoming.length > 0 && <Section title="Next 7 days" items={v.upcoming.slice(0, 6)} onToggle={toggle} onOpen={(t) => setDialog({ task: t })} />}
          </Box>
          <Divider />
          <Button component={RouterLink} to="/tasks" endIcon={<ArrowForward />} sx={{ borderRadius: 0, py: 1.25 }}>All tasks</Button>
        </Paper>
      </Slide>
      <TaskDialog open={Boolean(dialog)} task={dialog?.task || null} defaults={{ date: today }} onClose={() => setDialog(null)} />
    </>
  );
}

function Section({ title, items, empty, ...rest }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>{title}</Typography>
      {items.length ? <List dense disablePadding>{items.map((t) => <TaskRow key={`${t.id}`} task={t} dense {...rest} />)}</List>
        : <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 1 }}>{empty}</Typography>}
    </Box>
  );
}
