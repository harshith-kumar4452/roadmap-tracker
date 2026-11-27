// "Upload your plan": pick a file, let the server read it (Gemini or table columns), review and fix
// every extracted entry, then add only the ticked ones to the calendar.
import { useRef, useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  LinearProgress, List, ListItem, ListItemText, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import EventRepeatOutlined from '@mui/icons-material/EventRepeatOutlined';
import { api, changed } from '../lib/api.js';
import { useApi, isoDay } from '../lib/hooks.js';
import { useNotify } from '../lib/notify.jsx';
import { PRIORITIES, PRIORITY_LABEL, CATEGORY_LABEL } from '../lib/tasks.js';
import { PriorityDot } from './TaskDialog.jsx';

const ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,text/csv,text/plain';
const MAX = 3 * 1024 * 1024;

const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('Could not read the file'));
  r.readAsDataURL(file);
});

export default function PlanUpload({ open, onClose }) {
  const notify = useNotify();
  const full = useMediaQuery(useTheme().breakpoints.down('md'));
  const fileRef = useRef();
  const history = useApi('/plans', { skip: !open, topics: ['plans'] });
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState('pick'); // pick | reading | review | saving
  const [err, setErr] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => { setPlan(null); setItems([]); setPhase('pick'); setErr(null); };
  const close = () => { reset(); onClose(); };

  const upload = async (file) => {
    setErr(null);
    if (!file) return;
    if (file.size > MAX) { setErr('The file is larger than 3 MB. Split it or export just the schedule pages.'); return; }
    setPhase('reading');
    try {
      const data = await toBase64(file);
      const p = await api('/plans', { method: 'POST', body: { filename: file.name, data, today: isoDay() } });
      setPlan(p); setItems(p.items); setPhase('review'); changed('plans');
    } catch (e) { setErr(e.message); setPhase('pick'); }
  };

  const edit = (id, patch) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch, touched: true } : it)));
  const recheck = async () => {
    try { const p = await api(`/plans/${plan.id}/items`, { method: 'PUT', body: { items, today: isoDay() } }); setPlan(p); setItems(p.items); } catch (e) { setErr(e.message); }
  };
  const confirm = async () => {
    setPhase('saving'); setErr(null);
    try {
      const r = await api(`/plans/${plan.id}/confirm`, { method: 'POST', body: { items } });
      changed('tasks'); changed('plans');
      notify(`Added ${r.counts.created} entr${r.counts.created === 1 ? 'y' : 'ies'} to your calendar${r.pushedToGoogle ? ` (${r.pushedToGoogle} sent to Google)` : ''}.`);
      close();
    } catch (e) { setErr(e.message); setPhase('review'); }
  };
  const removePlan = async (id) => {
    try { await api(`/plans/${id}`, { method: 'DELETE' }); changed('plans'); } catch (e) { notify(e.message, 'error'); }
  };

  const chosen = items.filter((i) => i.include);
  const missing = chosen.filter((i) => !i.date);

  return (
    <Dialog open={open} onClose={phase === 'reading' || phase === 'saving' ? undefined : close} fullWidth maxWidth="lg" fullScreen={full} aria-labelledby="plan-title">
      <DialogTitle id="plan-title">Upload your plan</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert>}
        {(phase === 'pick' || phase === 'reading') && (
          <Stack spacing={3}>
            {history.data && !history.data.ai && (
              <Alert severity="info">AI reading isn't set up (GEMINI_API_KEY), so only CSV and Excel files with "Task" and "Date" columns can be read right now.</Alert>
            )}
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}
              sx={{ border: 2, borderStyle: 'dashed', borderColor: dragOver ? 'primary.main' : 'divider', borderRadius: 3, p: { xs: 3, sm: 6 }, textAlign: 'center', bgcolor: dragOver ? 'action.hover' : 'transparent' }}
            >
              {phase === 'reading' ? (
                <Stack alignItems="center" spacing={1.5}>
                  <CircularProgress />
                  <Typography>Reading your plan…</Typography>
                  <Typography variant="body2" color="text.secondary">Finding tasks, dates, times and deadlines. Nothing is added until you confirm.</Typography>
                </Stack>
              ) : (
                <>
                  <UploadFileOutlined color="primary" sx={{ fontSize: 44 }} />
                  <Typography variant="h4" component="p" sx={{ mt: 1 }}>Drop a study plan here</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>PDF, Word, Excel, CSV, a photo of a timetable (PNG/JPG) or text · up to 3 MB</Typography>
                  <Button variant="contained" onClick={() => fileRef.current?.click()}>Choose file</Button>
                  <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
                </>
              )}
            </Box>
            {history.data?.plans?.length > 0 && (
              <Box>
                <Typography variant="overline" color="text.secondary">Previous uploads</Typography>
                <List dense>
                  {history.data.plans.map((p) => (
                    <ListItem key={p.id} disableGutters secondaryAction={(
                      <Stack direction="row">
                        <Tooltip title="Download original"><IconButton component="a" href={`/api/plans/${p.id}/file`} aria-label={`Download ${p.filename}`}><DownloadOutlined /></IconButton></Tooltip>
                        <Tooltip title="Delete upload (calendar entries stay)"><IconButton onClick={() => removePlan(p.id)} aria-label={`Delete upload ${p.filename}`}><DeleteOutline /></IconButton></Tooltip>
                      </Stack>
                    )}>
                      <ListItemText
                        primary={p.filename}
                        secondary={`${new Date(p.createdAt).toLocaleDateString()} · ${p.kindLabel} · ${p.status === 'confirmed' ? `${p.counts.created} added` : `${p.counts.total} found, not added`}`}
                      />
                      {p.status === 'draft' && <Button size="small" sx={{ mr: 12 }} onClick={async () => { const d = await api(`/plans/${p.id}`); setPlan(d); setItems(d.items); setPhase('review'); }}>Review</Button>}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Stack>
        )}

        {(phase === 'review' || phase === 'saving') && plan && (
          <Stack spacing={2}>
            <Alert severity={plan.method === 'ai' ? 'info' : 'warning'} icon={plan.method === 'ai' ? <AutoAwesomeOutlined /> : <InfoOutlined />}>
              <AlertTitle>{plan.filename}: {plan.counts.total} entr{plan.counts.total === 1 ? 'y' : 'ies'} found</AlertTitle>
              {plan.summary}
              {plan.method === 'ai' && ' Extracted by AI: check each row before adding.'}
              {plan.assumptions?.length > 0 && <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>{plan.assumptions.map((a) => <li key={a}><Typography variant="body2">{a}</Typography></li>)}</Box>}
            </Alert>
            {missing.length > 0 && <Alert severity="warning">{missing.length} ticked entr{missing.length === 1 ? 'y has' : 'ies have'} no date. Add a date or untick {missing.length === 1 ? 'it' : 'them'} before adding.</Alert>}
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: full ? 'none' : '55vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"><Checkbox checked={chosen.length === items.length} indeterminate={chosen.length > 0 && chosen.length < items.length} onChange={(e) => setItems((l) => l.map((i) => ({ ...i, include: e.target.checked, touched: true })))} inputProps={{ 'aria-label': 'Tick all' }} /></TableCell>
                    <TableCell sx={{ minWidth: 220 }}>Entry</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Check</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => {
                    const block = it.include && !it.date;
                    return (
                      <TableRow key={it.id} hover selected={block} sx={{ opacity: it.include ? 1 : 0.55, verticalAlign: 'top' }}>
                        <TableCell padding="checkbox"><Checkbox checked={it.include} onChange={(e) => edit(it.id, { include: e.target.checked })} inputProps={{ 'aria-label': `Include ${it.title}` }} /></TableCell>
                        <TableCell>
                          <TextField variant="standard" fullWidth value={it.title} onChange={(e) => edit(it.id, { title: e.target.value })} inputProps={{ 'aria-label': 'Title', maxLength: 200 }} />
                          {it.sourceText && <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>"{it.sourceText}"</Typography>}
                          {it.recurrence && <Chip size="small" icon={<EventRepeatOutlined />} label={`Repeats ${it.recurrence.freq}${it.recurrence.until ? ` until ${it.recurrence.until}` : ''}`} sx={{ mt: 0.5 }} />}
                        </TableCell>
                        <TableCell><TextField variant="standard" type="date" value={it.date || ''} error={block} onChange={(e) => edit(it.id, { date: e.target.value || null })} inputProps={{ 'aria-label': 'Date' }} /></TableCell>
                        <TableCell><TextField variant="standard" type="time" value={it.time || ''} onChange={(e) => edit(it.id, { time: e.target.value || null })} inputProps={{ 'aria-label': 'Start time' }} sx={{ width: 96 }} /></TableCell>
                        <TableCell><TextField variant="standard" type="time" value={it.endTime || ''} disabled={!it.time} onChange={(e) => edit(it.id, { endTime: e.target.value || null })} inputProps={{ 'aria-label': 'End time' }} sx={{ width: 96 }} /></TableCell>
                        <TableCell>
                          <Select variant="standard" value={it.priority} onChange={(e) => edit(it.id, { priority: e.target.value })} inputProps={{ 'aria-label': 'Priority' }} renderValue={(v) => <Stack direction="row" spacing={0.75} alignItems="center"><PriorityDot priority={v} /><span>{PRIORITY_LABEL[v]}</span></Stack>}>
                            {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{PRIORITY_LABEL[p]}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select variant="standard" value={it.category} onChange={(e) => edit(it.id, { category: e.target.value })} inputProps={{ 'aria-label': 'Category' }}>
                            {Object.entries(CATEGORY_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            {it.issues.length === 0 && <Typography variant="caption" color="success.main">Looks good</Typography>}
                            {it.issues.map((x) => (
                              <Stack key={x.code + x.message} direction="row" spacing={0.5} alignItems="flex-start">
                                {x.minor ? <InfoOutlined sx={{ fontSize: 15, mt: '2px' }} color="action" /> : <ErrorOutline sx={{ fontSize: 15, mt: '2px' }} color={x.code === 'missing_date' ? 'error' : 'warning'} />}
                                <Typography variant="caption">{x.message}</Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
        {phase === 'saving' && <LinearProgress sx={{ mt: 2 }} />}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {phase === 'review' || phase === 'saving' ? (
          <>
            <Button onClick={reset} disabled={phase === 'saving'} sx={{ mr: 'auto' }}>Upload another file</Button>
            <Button onClick={recheck} disabled={phase === 'saving'}>Check again</Button>
            <Button variant="contained" onClick={confirm} disabled={phase === 'saving' || !chosen.length || missing.length > 0}>
              {phase === 'saving' ? 'Adding…' : `Add ${chosen.length} to calendar`}
            </Button>
          </>
        ) : <Button onClick={close} disabled={phase === 'reading'}>Close</Button>}
      </DialogActions>
    </Dialog>
  );
}
