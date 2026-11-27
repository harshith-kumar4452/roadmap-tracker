import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, MenuItem, Paper, Select, Stack,
  TextField, Typography, Accordion, AccordionSummary, AccordionDetails, FormControl, InputLabel,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Loading, ErrorState, LoginRequired, Markdown, EmptyState } from '../components/common.jsx';
import NotFound from './NotFound.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useDebounced } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { ago } from '../lib/roadmaps.js';
import { outline, mindmapSvg } from '../lib/render.js';
import { interactiveMindmap } from '../lib/mindmap.js';
import { KINDS, PROJECT_STATUS } from './Library.jsx';

const HINT = {
  cheatsheet: 'Markdown: ## Heading, - list, | table |, ```code```, `inline`, **bold**, [text](url)',
  project: 'Markdown: ## Heading, - list, - [ ] task, [text](url), ```code```',
  mindmap: 'One idea per line. Indent with two spaces to branch ("- Caching", then "  - Write-through"). The title is the centre of the map.',
};

export default function PageView() {
  const { id } = useParams();
  const { ready, authenticated } = useAuth();
  const page = useApi(`/pages/${id}`, { skip: !authenticated });
  if (!ready) return <Loading />;
  if (!authenticated) return <LoginRequired what="this page" />;
  if (page.error?.status === 404) return <NotFound />;
  if (page.error) return <ErrorState error={page.error} onRetry={page.reload} />;
  if (!page.data || page.data.id !== id) return <Loading />;
  return <View key={id} initial={page.data} />;
}

function View({ initial }) {
  const { admin } = useAuth();
  const notify = useNotify();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [p, setP] = useState(initial);
  const [editing, setEditing] = useState(admin && params.get('edit') === '1');
  const [confirm, setConfirm] = useState(false);
  const k = KINDS[p.kind] || KINDS.cheatsheet;
  useEffect(() => { document.title = `${p.title} · Learning hub`; return () => { document.title = 'Learning hub'; }; }, [p.title]);

  const cycleStatus = async () => {
    const next = PROJECT_STATUS[p.status]?.next || 'idea';
    try { const d = await api(`/pages/${p.id}`, { method: 'PATCH', body: { status: next } }); setP((x) => ({ ...x, ...d })); changed('pages'); } catch (e) { notify(e.message, 'error'); }
  };
  const remove = async () => {
    try { await api(`/pages/${p.id}`, { method: 'DELETE' }); changed('pages'); notify('Deleted'); navigate(k.path); } catch (e) { notify(e.message, 'error'); }
  };

  return (
    <>
      <Button component={RouterLink} to={k.path} startIcon={<ArrowBack />} sx={{ mb: 2 }}>{k.label}</Button>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="h1">{p.title}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {PROJECT_STATUS[p.status] && (admin
            ? <Chip label={PROJECT_STATUS[p.status].label} color={PROJECT_STATUS[p.status].color} onClick={cycleStatus} title="Change status" />
            : <Chip label={PROJECT_STATUS[p.status].label} color={PROJECT_STATUS[p.status].color} variant="outlined" />)}
          {admin && !editing && <Button size="small" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>Edit</Button>}
          {admin && !editing && <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={() => setConfirm(true)}>Delete</Button>}
        </Stack>
      </Stack>
      {editing ? (
        <Editor p={p} onCancel={() => { setEditing(false); setParams({}, { replace: true }); }} onSaved={(d) => { setP((x) => ({ ...x, ...d })); setEditing(false); setParams({}, { replace: true }); }} />
      ) : (
        <>
          {(p.summary || p.tags?.length > 0) && (
            <Box sx={{ mb: 2.5 }}>
              {p.summary && <Typography color="text.secondary" sx={{ mb: 1 }}>{p.summary}</Typography>}
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{(p.tags || []).map((t) => <Chip key={t} size="small" label={t} />)}</Stack>
            </Box>
          )}
          {!p.body.trim() ? (
            <EmptyState icon={k.icon} title={`This ${k.one} is empty`} action={admin && <Button variant="contained" onClick={() => setEditing(true)}>Start writing</Button>} />
          ) : p.kind === 'mindmap' ? (
            <>
              <MindmapHost body={p.body} title={p.title} id={p.id} />
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>Outline</AccordionSummary>
                <AccordionDetails><Markdown source={p.body} /></AccordionDetails>
              </Accordion>
            </>
          ) : (
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3.5 } }}><Markdown source={p.body} /></Paper>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Updated {ago(p.updatedAt)}</Typography>
        </>
      )}
      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>Delete "{p.title}"?</DialogTitle>
        <DialogContent><DialogContentText>This {k.one} is removed for good. This can't be undone.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirm(false)}>Cancel</Button><Button color="error" onClick={remove}>Delete</Button></DialogActions>
      </Dialog>
    </>
  );
}

// The interactive mind map (fold, pan, zoom, search) from the old app, mounted into a div.
function MindmapHost({ body, title, id }) {
  const ref = useRef();
  useEffect(() => {
    const host = ref.current;
    if (!host) return undefined;
    host.innerHTML = '';
    const cleanup = interactiveMindmap(host, outline(body, title), { storageKey: `rt:mm:${id}` });
    return () => { if (typeof cleanup === 'function') cleanup(); host.innerHTML = ''; document.documentElement.classList.remove('mmi-locked'); };
  }, [body, title, id]);
  return <Box ref={ref} />;
}

function Editor({ p, onCancel, onSaved }) {
  const notify = useNotify();
  const [f, setF] = useState({ title: p.title, summary: p.summary || '', tags: (p.tags || []).join(', '), status: p.status || 'idea', body: p.body });
  const [busy, setBusy] = useState(false);
  const preview = useDebounced(f, 200);
  const previewHtml = useMemo(() => (p.kind === 'mindmap' && preview.body.trim() ? mindmapSvg(outline(preview.body, preview.title || 'Untitled')) : null), [p.kind, preview]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { title: f.title, summary: f.summary, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), body: f.body, ...(p.kind === 'project' ? { status: f.status } : {}) };
      const d = await api(`/pages/${p.id}`, { method: 'PATCH', body });
      changed('pages'); notify('Saved'); onSaved(d);
    } catch (x) { notify(x.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Paper variant="outlined" component="form" onSubmit={save} sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        <TextField label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} inputProps={{ maxLength: 200 }} />
        <TextField label="Summary" helperText="One line, shown on the card" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} inputProps={{ maxLength: 500 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Tags" helperText="Comma separated" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} sx={{ flex: 1 }} />
          {p.kind === 'project' && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="pst">Status</InputLabel>
              <Select labelId="pst" label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {Object.entries(PROJECT_STATUS).map(([s, v]) => <MenuItem key={s} value={s}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label={p.kind === 'mindmap' ? 'Outline' : 'Content'} helperText={HINT[p.kind]} multiline minRows={20} fullWidth value={f.body}
              onChange={(e) => setF({ ...f, body: e.target.value })} inputProps={{ spellCheck: false }} sx={{ '& textarea': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13.5 } }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="overline" color="text.secondary">Preview</Typography>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 200, overflow: 'auto', maxHeight: 640, '& svg': { maxWidth: '100%', height: 'auto' } }}>
              {!preview.body.trim() ? <Typography variant="body2" color="text.secondary">Preview shows here as you type.</Typography>
                : previewHtml ? <Box dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <Markdown source={preview.body} />}
            </Paper>
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button><Button onClick={onCancel}>Cancel</Button></Stack>
      </Stack>
    </Paper>
  );
}
