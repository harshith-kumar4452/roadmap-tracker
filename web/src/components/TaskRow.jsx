import { Box, Checkbox, Chip, IconButton, ListItem, ListItemButton, Stack, Tooltip, Typography } from '@mui/material';
import SyncProblemOutlined from '@mui/icons-material/SyncProblemOutlined';
import EventRepeatOutlined from '@mui/icons-material/EventRepeatOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import { PriorityDot } from './TaskDialog.jsx';
import { urgency, dateLabel, timeLabel, effectiveDate, PRIORITY_LABEL } from '../lib/tasks.js';
import { isoDay } from '../lib/hooks.js';

const STATE_CHIP = {
  overdue: { label: 'Overdue', color: 'error' },
  today: { label: 'Today', color: 'warning' },
  tomorrow: { label: 'Tomorrow', color: 'default' },
};

export default function TaskRow({ task: t, onToggle, onOpen, dense, showDate = true }) {
  const today = isoDay();
  const u = urgency(t, today);
  const chip = STATE_CHIP[u.state];
  return (
    <ListItem disablePadding secondaryAction={(
      t.sync?.error ? <Tooltip title={`Google Calendar: ${t.sync.error}`}><SyncProblemOutlined color="warning" fontSize="small" sx={{ mr: 1 }} /></Tooltip> : null
    )}>
      <Checkbox
        edge="start" checked={t.done} onChange={() => onToggle(t)} sx={{ ml: 0.5, p: 1.25 }}
        inputProps={{ 'aria-label': `${t.done ? 'Mark not done' : 'Mark done'}: ${t.title}` }}
      />
      <ListItemButton onClick={() => onOpen(t)} sx={{ py: dense ? 0.5 : 0.9, pl: 0.5, borderRadius: 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <PriorityDot priority={t.priority} category={t.category} done={t.done} />
            <Typography sx={{ fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'text.secondary' : 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis' }} noWrap={dense}>
              {t.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.4, pl: 2.25 }}>
            {showDate && t.date && <Typography variant="caption" color={u.state === 'overdue' ? 'error.main' : 'text.secondary'}>{t.recurrence ? `Next: ${dateLabel(effectiveDate(t, today), today)}` : dateLabel(t.date, today)}</Typography>}
            {t.time && <Stack direction="row" spacing={0.25} alignItems="center"><ScheduleOutlined sx={{ fontSize: 14 }} color="action" /><Typography variant="caption" color="text.secondary">{timeLabel(t)}</Typography></Stack>}
            {t.recurrence && <Tooltip title={`Repeats ${t.recurrence.freq}`}><EventRepeatOutlined sx={{ fontSize: 14 }} color="action" /></Tooltip>}
            {(t.priority === 'critical' || t.priority === 'high') && !t.done && <Chip size="small" label={PRIORITY_LABEL[t.priority]} color={t.priority === 'critical' ? 'error' : 'warning'} variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
            {chip && !t.done && <Chip size="small" label={chip.label} color={chip.color} sx={{ height: 20, fontSize: 11 }} />}
          </Stack>
        </Box>
      </ListItemButton>
    </ListItem>
  );
}

// Optimistic done-toggle shared by every task list.
export async function toggleTask(t, { api, changed, notify, setTasks }) {
  setTasks?.((list) => list.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)));
  try {
    const r = await api(`/tasks/${t.id}`, { method: 'PATCH', body: { done: !t.done } });
    setTasks?.((list) => list.map((x) => (x.id === t.id ? r : x)));
    changed('tasks');
    if (r.sync?.error) notify(`Saved, but Google Calendar sync failed: ${r.sync.error}`, 'warning');
  } catch (e) {
    setTasks?.((list) => list.map((x) => (x.id === t.id ? t : x)));
    notify(e.message, 'error');
  }
}

export const IconBtn = IconButton;
