import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import Sync from '@mui/icons-material/Sync';
import CloudOffOutlined from '@mui/icons-material/CloudOffOutlined';
import CloudDoneOutlined from '@mui/icons-material/CloudDoneOutlined';
import CloudSyncOutlined from '@mui/icons-material/CloudSyncOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import LinkOff from '@mui/icons-material/LinkOff';
import { useApi } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';

const ago = (iso) => {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
};

export default function GoogleSyncPanel() {
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const st = useApi('/google/status', { topics: ['tasks', 'google'] });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // Coming back from Google's consent screen.
  useEffect(() => {
    const g = params.get('google');
    if (!g) return;
    if (g === 'connected') { notify('Google Calendar connected. Your tasks are syncing.'); changed('tasks'); }
    else notify(`Google Calendar: ${params.get('reason') || 'could not connect'}`, 'error');
    const next = new URLSearchParams(params); next.delete('google'); next.delete('reason');
    setParams(next, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull changes made in Google whenever the calendar is opened (cheap: incremental sync token).
  useEffect(() => {
    if (!st.data?.connected) return;
    api('/google/sync', { method: 'POST', body: {} }).then((r) => { if (r?.pulled?.updated || r?.pulled?.created) changed('tasks'); st.reload(true); }).catch(() => {});
  }, [st.data?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncNow = async () => {
    setBusy(true);
    try {
      const r = await api('/google/sync', { method: 'POST', body: {} });
      changed('tasks');
      notify(r.error ? `Sync problem: ${r.error}` : `Synced: ${r.pushed} sent, ${(r.pulled?.updated || 0) + (r.pulled?.created || 0)} received${r.failed ? `, ${r.failed} failed` : ''}`, r.error || r.failed ? 'warning' : 'success');
    } catch (e) { notify(e.message, 'error'); st.reload(true); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    setConfirm(false); setBusy(true);
    try { await api('/google/disconnect', { method: 'POST', body: {} }); changed('google'); changed('tasks'); notify('Google Calendar disconnected'); } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  const s = st.data;
  if (!s) return null;
  const state = !s.configured ? 'unconfigured' : s.connected ? (s.errors || s.lastError ? 'warning' : 'ok') : s.status === 'expired' ? 'expired' : 'off';
  const chip = {
    unconfigured: { label: 'Not set up', icon: <CloudOffOutlined />, color: 'default' },
    off: { label: 'Not connected', icon: <CloudOffOutlined />, color: 'default' },
    expired: { label: 'Reconnect needed', icon: <ErrorOutline />, color: 'error' },
    ok: { label: 'Synced', icon: <CloudDoneOutlined />, color: 'success' },
    warning: { label: 'Sync issues', icon: <ErrorOutline />, color: 'warning' },
  }[state];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <CloudSyncOutlined color="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" component="h2">Google Calendar</Typography>
              <Chip size="small" icon={chip.icon} label={chip.label} color={chip.color} variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {state === 'unconfigured' && 'The server has no Google OAuth client yet (GOOGLE_CLIENT_ID / SECRET). See docs/implementation/calendar-integration.md.'}
              {state === 'off' && 'Connect to copy your dated tasks into a separate "Learning hub" calendar. Your other calendars are never read or changed.'}
              {state === 'expired' && 'Google access expired or was revoked. Connect again to resume syncing.'}
              {(state === 'ok' || state === 'warning') && <>{s.email} · {s.synced} synced · last sync {ago(s.lastSyncAt)}{s.webhook.active ? ' · live updates on' : ''}</>}
            </Typography>
            {state === 'warning' && <Typography variant="body2" color="warning.main">{s.errors ? `${s.errors} task(s) failed to sync. ` : ''}{s.lastError}</Typography>}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {(state === 'off' || state === 'expired') && <Button variant="contained" href="/api/google/connect">{state === 'expired' ? 'Reconnect' : 'Connect'}</Button>}
          {(state === 'ok' || state === 'warning') && (
            <>
              <Tooltip title="Send pending changes and fetch edits made in Google"><span><Button startIcon={busy ? <CircularProgress size={16} /> : <Sync />} onClick={syncNow} disabled={busy}>Sync now</Button></span></Tooltip>
              <Button color="inherit" startIcon={<LinkOff />} onClick={() => setConfirm(true)} disabled={busy}>Disconnect</Button>
            </>
          )}
        </Stack>
      </Stack>
      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>Disconnect Google Calendar?</DialogTitle>
        <DialogContent>
          <DialogContentText>Syncing stops and the app's access to Google is revoked. Your tasks stay here, and the "Learning hub" calendar stays in Google (delete it there if you no longer want it).</DialogContentText>
        </DialogContent>
        <DialogActions><Button onClick={() => setConfirm(false)}>Cancel</Button><Button color="error" onClick={disconnect}>Disconnect</Button></DialogActions>
      </Dialog>
      {st.error && <Alert severity="error" sx={{ mt: 1 }}>{st.error.message}</Alert>}
    </Paper>
  );
}
