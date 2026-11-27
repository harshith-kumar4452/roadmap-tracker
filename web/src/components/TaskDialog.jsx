import { useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem,
  Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Alert, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { isoDay } from '../lib/hooks.js';
import { PRIORITIES, PRIORITY_LABEL, CATEGORY_LABEL, DAY_NAMES } from '../lib/tasks.js';
import { colorFor } from '../theme.js';

export function PriorityDot({ priority, category, done, size = 10 }) {
  const theme = useTheme();
  return <Box component="span" aria-hidden sx={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', flexShrink: 0, bgcolor: colorFor(theme.palette.mode, { priority, category, done }) }} />;
}

const blank = (date) => ({ title: '', notes: '', date: date ?? isoDay(), time: '', endTime: '', priority: 'medium', category: 'study', recurrence: null });

// Create or edit a task. `task` = existing task, or null for a new one (optionally with `defaults`).
export default function TaskDialog({ open, task, defaults, onClose, onSaved }) {
  const notify = useNotify();
  const full = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [f, setF] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF(task ? { ...task, time: task.time || '', endTime: task.endTime || '', date: task.date || '' } : { ...blank(defaults?.date), ...defaults });
  }, [open, task, defaults]);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr(null);
    const body = {
      title: f.title, notes: f.notes, date: f.date || null, time: f.date && f.time ? f.time : null,
      endTime: f.date && f.time && f.endTime ? f.endTime : null, priority: f.priority, category: f.category,
      recurrence: f.date && f.recurrence ? f.recurrence : null,
    };
    try {
      const saved = task ? await api(`/tasks/${task.id}`, { method: 'PATCH', body }) : await api('/tasks', { method: 'POST', body });
      changed('tasks');
      if (saved.sync?.error) notify(`Saved, but Google Calendar sync failed: ${saved.sync.error}`, 'warning');
      else notify(task ? 'Task updated' : 'Task added');
      onSaved?.(saved);
      onClose();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api(`/tasks/${task.id}`, { method: 'DELETE' }); changed('tasks'); notify('Task deleted'); onSaved?.(null); onClose(); } catch (x) { setErr(x.message); setBusy(false); }
  };

  const rec = f.recurrence?.freq || 'none';
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={full} component="form" onSubmit={save} aria-labelledby="task-dlg">
      <DialogTitle id="task-dlg">{task ? 'Edit task' : 'New task'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Title" required autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} inputProps={{ maxLength: 300 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Date" type="date" value={f.date || ''} onChange={(e) => set({ date: e.target.value })} InputLabelProps={{ shrink: true }} helperText={f.date ? ' ' : 'No date: someday'} sx={{ flex: 1.4 }} />
            <TextField label="Start" type="time" value={f.time || ''} disabled={!f.date} onChange={(e) => set({ time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
            <TextField label="End" type="time" value={f.endTime || ''} disabled={!f.date || !f.time} onChange={(e) => set({ endTime: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="pri">Priority</InputLabel>
              <Select labelId="pri" label="Priority" value={f.priority} onChange={(e) => set({ priority: e.target.value })}>
                {PRIORITIES.map((p) => <MenuItem key={p} value={p}><Stack direction="row" spacing={1} alignItems="center"><PriorityDot priority={p} /><span>{PRIORITY_LABEL[p]}</span></Stack></MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="cat">Category</InputLabel>
              <Select labelId="cat" label="Category" value={f.category} onChange={(e) => set({ category: e.target.value })}>
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => <MenuItem key={v} value={v}><Stack direction="row" spacing={1} alignItems="center"><PriorityDot category={v} priority="medium" /><span>{l}</span></Stack></MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          {(f.priority === 'critical' || f.priority === 'high') && f.date && (
            <Typography variant="caption" color="text.secondary">This deadline appears in your Today panel from 2 days before it is due.</Typography>
          )}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.75 }} id="rep">Repeat</Typography>
            <ToggleButtonGroup size="small" exclusive value={rec} disabled={!f.date} aria-labelledby="rep"
              onChange={(_, v) => v && set({ recurrence: v === 'none' ? null : { freq: v, days: v === 'weekly' ? [new Date(`${f.date}T12:00`).getDay()] : [], until: f.recurrence?.until || null } })}>
              <ToggleButton value="none">Never</ToggleButton>
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
            </ToggleButtonGroup>
            {rec === 'weekly' && (
              <Stack direction="row" flexWrap="wrap" sx={{ mt: 1 }}>
                {DAY_NAMES.map((d, i) => (
                  <FormControlLabel key={d} label={d.slice(0, 3)} control={<Checkbox size="small" checked={f.recurrence.days.includes(i)} onChange={(e) => set({ recurrence: { ...f.recurrence, days: e.target.checked ? [...f.recurrence.days, i].sort() : f.recurrence.days.filter((x) => x !== i) } })} />} />
                ))}
              </Stack>
            )}
            {rec !== 'none' && (
              <TextField label="Until (optional)" type="date" value={f.recurrence?.until || ''} onChange={(e) => set({ recurrence: { ...f.recurrence, until: e.target.value || null } })} InputLabelProps={{ shrink: true }} sx={{ mt: 1.5 }} />
            )}
          </Box>
          <TextField label="Notes" multiline minRows={3} value={f.notes} onChange={(e) => set({ notes: e.target.value })} inputProps={{ maxLength: 5000 }} />
          {task?.sync && (
            <Typography variant="caption" color={task.sync.error ? 'error' : 'text.secondary'}>
              {task.sync.optOut ? 'Removed from Google Calendar (deleted there), so it is no longer synced.' : task.sync.error ? `Google Calendar: ${task.sync.error}` : task.sync.synced ? 'Synced with Google Calendar.' : 'Waiting to sync with Google Calendar.'}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {task && <Button color="error" startIcon={<DeleteOutline />} onClick={remove} disabled={busy} sx={{ mr: 'auto' }}>Delete</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy || !f.title.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
