import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import PlaylistAddOutlined from '@mui/icons-material/PlaylistAddOutlined';
import { PageHeader, EmptyState, Loading } from '../components/common.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';

export default function Import() {
  const { ready, admin } = useAuth();
  const notify = useNotify();
  const navigate = useNavigate();
  const [md, setMd] = useState({ title: '', markdown: '' });
  const [blank, setBlank] = useState('');
  const [busy, setBusy] = useState(false);
  if (!ready) return <Loading />;
  if (!admin) return <EmptyState icon={PlaylistAddOutlined} title="Only the owner can add roadmaps" />;

  const run = async (fn) => { setBusy(true); try { const r = await fn(); changed('roadmaps'); notify('Roadmap added'); navigate(`/r/${r.id}`); } catch (x) { notify(x.message, 'error'); setBusy(false); } };
  return (
    <>
      <Button component={RouterLink} to="/roadmaps" startIcon={<ArrowBack />} sx={{ mb: 2 }}>All roadmaps</Button>
      <PageHeader title="Add roadmaps" icon={PlaylistAddOutlined} subtitle="Import a roadmap from Notion or any Markdown checklist, or start a blank one." />
      <Stack spacing={3}>
        <Paper variant="outlined" component="form" sx={{ p: { xs: 2, sm: 3 } }} onSubmit={(e) => { e.preventDefault(); run(() => api('/import/markdown', { method: 'POST', body: md })); }}>
          <Typography variant="h3" component="h2">Paste a roadmap</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>In Notion, click into the page, press Ctrl+A twice, copy, and paste here. Any Markdown works: "- [ ] Topic" lines become topics, headings become sections.</Typography>
          <Stack spacing={2}>
            <TextField label="Roadmap name" helperText="Optional if the paste starts with a # heading" value={md.title} onChange={(e) => setMd({ ...md, title: e.target.value })} />
            <TextField label="Markdown" required multiline minRows={12} value={md.markdown} onChange={(e) => setMd({ ...md, markdown: e.target.value })}
              placeholder={'## Phase 1: Basics\n- [ ] First topic\n- [x] Something already done'} sx={{ '& textarea': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13 } }} />
            <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>Import</Button>
          </Stack>
        </Paper>
        <Paper variant="outlined" component="form" sx={{ p: { xs: 2, sm: 3 } }} onSubmit={(e) => { e.preventDefault(); run(() => api('/roadmaps', { method: 'POST', body: { title: blank } })); }}>
          <Typography variant="h3" component="h2" sx={{ mb: 2 }}>Start a blank roadmap</Typography>
          <Stack direction="row" spacing={1}>
            <TextField placeholder="e.g. Docker" required value={blank} onChange={(e) => setBlank(e.target.value)} inputProps={{ 'aria-label': 'Roadmap name' }} sx={{ flex: 1, maxWidth: 420 }} />
            <Button type="submit" variant="outlined" disabled={busy}>Create</Button>
          </Stack>
        </Paper>
      </Stack>
    </>
  );
}
