import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Button, Card, CardActionArea, CardContent, Chip, Grid, InputAdornment, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import { PageHeader, Loading, ErrorState, EmptyState } from '../components/common.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { ago } from '../lib/roadmaps.js';

export const KINDS = {
  cheatsheet: { path: '/cheatsheets', label: 'Cheat sheets', one: 'cheat sheet', icon: DescriptionOutlined, blurb: 'Quick-reference pages: commands, syntax, formulas, things you keep looking up.' },
  project: { path: '/projects', label: 'Projects', one: 'project', icon: BuildOutlined, blurb: 'Things to build: the idea, the features, the stack, and where each one stands.' },
  mindmap: { path: '/mindmaps', label: 'Mindmaps', one: 'mindmap', icon: AccountTreeOutlined, blurb: 'Topics laid out as a map, to see how the pieces connect.' },
};
export const PROJECT_STATUS = { idea: { label: 'Idea', color: 'default', next: 'building' }, building: { label: 'Building', color: 'info', next: 'done' }, done: { label: 'Done', color: 'success', next: 'idea' } };

export default function Library({ kind = 'cheatsheet' }) {
  const navigate = useNavigate();
  const k = KINDS[kind];
  return (
    <>
      <PageHeader title="Library" icon={MenuBookOutlined} subtitle="Cheat sheets, project ideas and mind maps." />
      <Tabs value={kind} onChange={(_, v) => navigate(KINDS[v].path)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {Object.entries(KINDS).map(([v, x]) => <Tab key={v} value={v} label={x.label} icon={<x.icon />} iconPosition="start" />)}
      </Tabs>
      <Pages key={kind} kind={kind} k={k} />
    </>
  );
}

function Pages({ kind, k }) {
  const { admin } = useAuth();
  const notify = useNotify();
  const navigate = useNavigate();
  const list = useApi(`/pages?kind=${kind}`, { topics: ['pages'] });
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState('');
  const [title, setTitle] = useState('');

  const create = async (e) => {
    e.preventDefault();
    try { const p = await api('/pages', { method: 'POST', body: { kind, title } }); changed('pages'); navigate(`/p/${p.id}?edit=1`); } catch (x) { notify(x.message, 'error'); }
  };
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  const items = list.data;
  const tags = [...new Set(items.flatMap((p) => p.tags || []))].sort();
  const needle = q.trim().toLowerCase();
  const shown = items.filter((p) => (!tag || p.tags?.includes(tag)) && (!status || p.status === status) && (!needle || `${p.title} ${p.summary} ${(p.tags || []).join(' ')}`.toLowerCase().includes(needle)));

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Typography color="text.secondary">{k.blurb}</Typography>
        {admin && (
          <Stack component="form" direction="row" spacing={1} onSubmit={create} sx={{ flexShrink: 0 }}>
            <TextField placeholder={`New ${k.one} title`} required value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ 'aria-label': `New ${k.one} title`, maxLength: 200 }} />
            <Button type="submit" variant="contained" startIcon={<Add />}>Create</Button>
          </Stack>
        )}
      </Stack>
      {items.length > 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" alignItems={{ md: 'center' }}>
          {kind === 'project' && (
            <ToggleButtonGroup size="small" exclusive value={status} onChange={(_, v) => setStatus(v ?? '')} aria-label="Status">
              <ToggleButton value="">All {items.length}</ToggleButton>
              {Object.entries(PROJECT_STATUS).map(([s, v]) => <ToggleButton key={s} value={s}>{v.label} {items.filter((p) => p.status === s).length}</ToggleButton>)}
            </ToggleButtonGroup>
          )}
          {tags.length > 0 && (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" role="group" aria-label="Filter by tag">
              {tags.map((t) => <Chip key={t} label={t} size="small" clickable color={tag === t ? 'primary' : 'default'} variant={tag === t ? 'filled' : 'outlined'} onClick={() => setTag(tag === t ? '' : t)} aria-pressed={tag === t} />)}
            </Stack>
          )}
          <TextField placeholder={`Search ${k.label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} sx={{ ml: { md: 'auto' }, minWidth: 220 }}
            inputProps={{ 'aria-label': 'Search' }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        </Stack>
      )}
      {!items.length ? <EmptyState icon={k.icon} title={`No ${k.one}s yet`} text={admin ? 'Create the first one above.' : 'Log in as the owner to add one.'} /> : !shown.length ? <Typography color="text.secondary">Nothing matches.</Typography> : (
        <Grid container spacing={2}>
          {shown.map((p) => (
            <Grid item xs={12} sm={6} lg={4} key={p.id}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea component={RouterLink} to={`/p/${p.id}`} sx={{ height: '100%', alignItems: 'stretch' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography variant="h4" component="h3">{p.title}</Typography>
                      {PROJECT_STATUS[p.status] && <Chip size="small" label={PROJECT_STATUS[p.status].label} color={PROJECT_STATUS[p.status].color} variant="outlined" />}
                    </Stack>
                    {p.summary && <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.summary}</Typography>}
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 'auto' }}>{(p.tags || []).map((t) => <Chip key={t} size="small" label={t} />)}</Stack>
                    <Typography variant="caption" color="text.secondary">Updated {ago(p.updatedAt)}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
