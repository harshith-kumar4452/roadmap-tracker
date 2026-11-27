import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Autocomplete, Box, Button, Card, CardContent, Grid, IconButton, InputAdornment, Link, List, ListItem, ListItemText, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import Search from '@mui/icons-material/Search';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import { PageHeader, Loading, ErrorState, LoginRequired } from '../components/common.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, isoDay } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { safeUrl } from '../lib/roadmaps.js';
import { scheduleLabel } from '../lib/tasks.js';

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

function LinkItem({ title, url, extra, action }) {
  const u = safeUrl(url);
  return (
    <ListItem disableGutters secondaryAction={action} sx={{ py: 0.4, pr: action ? 5 : 0 }}>
      <ListItemText
        primary={<>{u ? <Link href={u} target="_blank" rel="noopener noreferrer" underline="hover">{title}</Link> : title}{u && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>{hostOf(u)}</Typography>}</>}
        secondary={extra}
      />
    </ListItem>
  );
}

export default function Resources() {
  const { ready, authenticated, admin } = useAuth();
  const notify = useNotify();
  const data = useApi('/resources', { skip: !authenticated, topics: ['links'] });
  const habits = useApi(`/habits?since=${isoDay()}`, { skip: !authenticated });
  const [q, setQ] = useState('');
  const [f, setF] = useState({ title: '', url: '', category: '', note: '' });
  if (!ready) return <Loading />;
  if (!authenticated) return <LoginRequired what="resources" />;
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  if (!data.data || !habits.data) return <Loading />;

  const needle = q.trim().toLowerCase();
  const match = (...parts) => !needle || parts.join(' ').toLowerCase().includes(needle);
  const practice = habits.data.habits.filter((h) => h.url && match(h.title, h.url));
  const mine = data.data.links.filter((l) => match(l.title, l.url, l.category, l.note));
  const cats = [...new Set(mine.map((l) => l.category || 'Other'))].sort();
  const allCats = [...new Set(data.data.links.map((l) => l.category).filter(Boolean))].sort();
  const fromRm = data.data.roadmaps.map((r) => ({ ...r, resources: r.resources.filter((x) => x.title && match(x.title, x.url, r.title)) })).filter((r) => r.resources.length);
  const total = practice.length + mine.length + fromRm.reduce((n, r) => n + r.resources.length, 0);

  const add = async (e) => {
    e.preventDefault();
    try { await api('/links', { method: 'POST', body: { ...f, note: f.note || null, category: f.category || null } }); setF({ title: '', url: '', category: '', note: '' }); changed('links'); notify('Link added'); } catch (x) { notify(x.message, 'error'); }
  };
  const remove = async (l) => { try { await api(`/links/${l.id}`, { method: 'DELETE' }); changed('links'); } catch (x) { notify(x.message, 'error'); } };

  return (
    <>
      <PageHeader title="Resources" icon={LinkOutlined} subtitle="Every course, playlist, practice site and link, in one place." />
      <Stack spacing={3}>
        {admin && (
          <Paper variant="outlined" component="form" onSubmit={add} sx={{ p: 2 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 1.5 }}>Add a link</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} inputProps={{ maxLength: 200 }} sx={{ flex: 1.2 }} />
              <TextField label="URL" type="url" required value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} sx={{ flex: 1.5 }} />
              <Autocomplete freeSolo options={allCats} inputValue={f.category} onInputChange={(_, v) => setF({ ...f, category: v })} sx={{ flex: 1 }} renderInput={(params) => <TextField {...params} label="Category" inputProps={{ ...params.inputProps, maxLength: 60 }} />} />
              <TextField label="Note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} inputProps={{ maxLength: 500 }} sx={{ flex: 1.2 }} />
              <Button type="submit" variant="contained">Add</Button>
            </Stack>
          </Paper>
        )}
        <TextField placeholder="Search resources" value={q} onChange={(e) => setQ(e.target.value)} inputProps={{ 'aria-label': 'Search resources' }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        {!total && <Typography color="text.secondary">Nothing matches.</Typography>}
        {practice.length > 0 && (
          <Section icon={EmojiEventsOutlined} title="Practice & contests">
            <Paper variant="outlined" sx={{ px: 2, py: 0.5 }}><List dense>{practice.map((h) => <LinkItem key={h.id} title={h.title} url={h.url} extra={scheduleLabel(h.days)} />)}</List></Paper>
          </Section>
        )}
        {mine.length > 0 && (
          <Section icon={StarBorderOutlined} title="My links">
            <Grid container spacing={2}>
              {cats.map((c) => (
                <Grid item xs={12} md={6} lg={4} key={c}>
                  <Card sx={{ height: '100%' }}><CardContent>
                    <Typography variant="h5" component="h3" sx={{ mb: 0.5 }}>{c}</Typography>
                    <List dense disablePadding>
                      {mine.filter((l) => (l.category || 'Other') === c).map((l) => (
                        <LinkItem key={l.id} title={l.title} url={l.url} extra={l.note}
                          action={admin && <Tooltip title="Remove"><IconButton edge="end" size="small" onClick={() => remove(l)} aria-label={`Remove ${l.title}`}><DeleteOutline fontSize="small" /></IconButton></Tooltip>} />
                      ))}
                    </List>
                  </CardContent></Card>
                </Grid>
              ))}
            </Grid>
          </Section>
        )}
        {fromRm.length > 0 && (
          <Section icon={MapOutlined} title="From your roadmaps">
            <Grid container spacing={2}>
              {fromRm.map((r) => (
                <Grid item xs={12} md={6} lg={4} key={r.id}>
                  <Card sx={{ height: '100%' }}><CardContent>
                    <Link component={RouterLink} to={`/r/${r.id}`} underline="hover" color="inherit"><Typography variant="h5" component="h3" sx={{ mb: 0.5 }}>{r.title}</Typography></Link>
                    <List dense disablePadding>{r.resources.map((x) => <LinkItem key={x.title + x.url} title={x.title} url={x.url} />)}</List>
                  </CardContent></Card>
                </Grid>
              ))}
            </Grid>
          </Section>
        )}
      </Stack>
    </>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}><Icon color="primary" /><Typography variant="h2">{title}</Typography></Stack>
      {children}
    </Box>
  );
}
